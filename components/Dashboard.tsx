"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { SyncJob, SyncRun } from "@prisma/client";
import { signOut } from "next-auth/react";
import Modal from "./Modal";
import { toast } from "./Toast";

type JobWithRuns = SyncJob & {
  runs: SyncRun[];
};

type ProgressData = {
  status: string;
  progress: number;
  progressMessage: string | null;
};

export default function Dashboard() {
  const [jobs, setJobs] = useState<JobWithRuns[]>([]);
  const [loading, setLoading] = useState(true);

  // Live progress map: jobId → { status, progress, progressMessage }
  const [runProgress, setRunProgress] = useState<Map<string, ProgressData>>(new Map());

  // Store poller intervals per job so we can cancel them
  const pollersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const ITEMS_PER_PAGE = 10;

  // Modal States
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithRuns | null>(null);

  const getDisplayStatus = (job: JobWithRuns): SyncRun["status"] | undefined => {
    // Use live polled status first if available
    const live = runProgress.get(job.id);
    if (live) return live.status as SyncRun["status"];
    const latestStatus = job.runs?.[0]?.status;
    if (latestStatus === "running") return "running";
    if (!job.lastRunAt) return undefined;
    return latestStatus;
  };

  const formatTimeAgo = (date: string | Date | null) => {
    if (!date) return "Never";
    const now = new Date();
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "Never";
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  };

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs", { cache: "no-store" });
      if (res.status === 401) return;
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (error) {
      console.error("Failed to load jobs", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Start a 1.5s realtime poller for a specific job
  const startProgressPoller = useCallback((jobId: string) => {
    // Don't start a duplicate poller
    if (pollersRef.current.has(jobId)) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/progress`, { cache: "no-store" });
        if (!res.ok) return;
        const data: ProgressData = await res.json();

        setRunProgress(prev => {
          const next = new Map(prev);
          next.set(jobId, data);
          return next;
        });

        // Job finished — stop the poller and do a full refresh to update status badge
        if (data.status !== "running") {
          clearInterval(pollersRef.current.get(jobId));
          pollersRef.current.delete(jobId);
          // Keep progress visible briefly, then clear it
          setTimeout(() => {
            setRunProgress(prev => {
              const next = new Map(prev);
              next.delete(jobId);
              return next;
            });
          }, 2000);
          fetchJobs();
        }
      } catch {
        // Silently ignore network errors during polling
      }
    }, 1500);

    pollersRef.current.set(jobId, interval);
  }, [fetchJobs]);

  // Stop poller for a specific job  
  const stopProgressPoller = useCallback((jobId: string) => {
    const interval = pollersRef.current.get(jobId);
    if (interval) {
      clearInterval(interval);
      pollersRef.current.delete(jobId);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // When jobs update, start pollers for any running jobs
  useEffect(() => {
    jobs.forEach(job => {
      const isRunning = job.runs?.[0]?.status === "running";
      if (isRunning) {
        startProgressPoller(job.id);
      }
    });
  }, [jobs, startProgressPoller]);

  // Slow background poll for non-running state (job list refresh every 30s)
  useEffect(() => {
    const hasRunningJobs = jobs.some(j => j.runs?.[0]?.status === "running");
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && !hasRunningJobs) {
        fetchJobs();
      }
    }, 30000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchJobs();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchJobs, jobs]);

  // Cleanup all pollers on unmount
  useEffect(() => {
    return () => {
      pollersRef.current.forEach(interval => clearInterval(interval));
      pollersRef.current.clear();
    };
  }, []);

  const handleRunClick = (job: JobWithRuns) => {
    setSelectedJob(job);
    setRunModalOpen(true);
  };

  const handleDeleteClick = (job: JobWithRuns) => {
    setSelectedJob(job);
    setDeleteModalOpen(true);
  };

  const confirmRunJob = async () => {
    if (!selectedJob) return;
    const jobId = selectedJob.id;
    const jobName = selectedJob.name;
    setRunModalOpen(false);

    // Immediately seed the live progress state so UI shows "running" instantly
    setRunProgress(prev => {
      const next = new Map(prev);
      next.set(jobId, { status: "running", progress: 0, progressMessage: "Starting..." });
      return next;
    });

    // Start the realtime poller immediately. 
    // It will fetch /progress and update the UI every 1.5s
    startProgressPoller(jobId);

    // Refresh job list to reflect status badge change
    // Using a short delay to ensure the database record is created first
    setTimeout(() => {
      fetchJobs();
    }, 1000);

    try {
      // This fetch will take a while since the backend waits for the job to finish
      const res = await fetch(`/api/jobs/${jobId}/run`, { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to run job");
      }
      toast(`Sync job "${jobName}" completed.`, "success");
      
    } catch (error: any) {
      toast(error.message || "Error triggering job", "error");
      stopProgressPoller(jobId);
    }
    
    // Final UI refresh just in case
    fetchJobs();
  };

  const confirmDeleteJob = async () => {
    if (!selectedJob) return;
    setDeleteModalOpen(false);

    try {
      const res = await fetch(`/api/jobs/${selectedJob.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete job");
      stopProgressPoller(selectedJob.id);
      setJobs(jobs.filter((j) => j.id !== selectedJob.id));
      toast(`Job "${selectedJob.name}" deleted.`, "info");
    } catch (error) {
      toast("Could not delete the job.", "error");
    }
  };

  // Stats
  const activeJobs = jobs.filter(j => j.isEnabled).length;
  const runningJobs = jobs.filter(j => getDisplayStatus(j) === "running").length;
  const successfulJobs = jobs.filter(j => getDisplayStatus(j) === "success").length;
  const successRate = jobs.length > 0 ? Math.round((successfulJobs / jobs.length) * 100) : 0;

  // Filter & Pagination
  const filteredJobs = jobs.filter(job =>
    job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.type.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "running":
        return (
          <span className="badge-running">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Running
          </span>
        );
      case "success":
        return (
          <span className="badge-success">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Success
          </span>
        );
      case "failed":
        return (
          <span className="badge-failed">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Failed
          </span>
        );
      default:
        return (
          <span className="badge-pending">
            <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
            Pending
          </span>
        );
    }
  };

  // Helper: get progress bar data preferring live polled data
  const getProgressData = (job: JobWithRuns) => {
    const live = runProgress.get(job.id);
    if (live) return { progress: live.progress, progressMessage: live.progressMessage };
    const run = job.runs?.[0];
    return { progress: run?.progress ?? 0, progressMessage: run?.progressMessage ?? null };
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <div className="text-sm font-medium text-white/40 animate-pulse">Initializing System...</div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto px-2 md:px-6 py-6 md:py-10">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">PRL Automated</h1>
          <p className="text-white/40 mt-1 text-sm">Manage and monitor your sync operations.</p>
        </div>

        <div className="flex gap-3 items-center">
          <Link href="/jobs/new" className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Create Job
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="btn-ghost"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up">
        <div className="glass-panel rounded-2xl p-6 gradient-border">
          <div className="text-white/30 text-xs font-medium uppercase tracking-wider mb-3">Total Jobs</div>
          <div className="text-4xl font-bold text-white mb-2">{jobs.length}</div>
          <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {activeJobs} Active
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-6 gradient-border">
          <div className="text-white/30 text-xs font-medium uppercase tracking-wider mb-3">System Status</div>
          <div className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
            {runningJobs > 0 ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                </span>
                Processing
              </>
            ) : (
              <>
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                Idle
              </>
            )}
          </div>
          <div className="text-xs text-white/30">{runningJobs} jobs running</div>
        </div>
        <div className="glass-panel rounded-2xl p-6 gradient-border">
          <div className="text-white/30 text-xs font-medium uppercase tracking-wider mb-3">Success Rate</div>
          <div className="text-4xl font-bold text-white mb-2">{successRate}%</div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-1000"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content: Jobs Table */}
      <div className="glass-panel rounded-2xl overflow-hidden min-h-[400px] animate-slide-up stagger-2">
        <div className="p-6 border-b border-white/[0.06] flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Active Jobs</h2>
            <div className="text-xs text-white/30 mt-0.5 flex items-center gap-1.5">
              {runningJobs > 0 ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Live updates every 1.5s
                </>
              ) : (
                "Auto-refreshing every 30s"
              )}
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="input-field !pl-10"
            />
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>

        {/* Mobile View: Cards */}
        <div className="block sm:hidden p-4 space-y-3">
          {jobs.length === 0 ? (
            <div className="text-center text-white/30 py-16 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <svg className="w-8 h-8 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
              </div>
              <p>No jobs configured yet.</p>
              <Link href="/jobs/new" className="text-blue-400 hover:underline text-sm">Create your first job</Link>
            </div>
          ) : (
            paginatedJobs.map((job) => {
              const displayStatus = getDisplayStatus(job);
              const isRunning = displayStatus === "running";
              const { progress, progressMessage } = getProgressData(job);

              return (
              <div key={job.id} className="glass-card rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-white">{job.name}</div>
                    <div className="text-[10px] text-white/20 font-mono mt-0.5">ID: {job.id.slice(0, 8)}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleRunClick(job)} className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Run">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                    <Link href={`/jobs/${job.id}`} className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors" title="Edit">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </Link>
                    <button onClick={() => handleDeleteClick(job)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Delete">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-white/60 border border-white/[0.08] uppercase">{job.type}</span>
                  {job.runMode !== "manual" ? (
                    <span className="badge-auto text-[10px] !py-0.5">AUTO</span>
                  ) : (
                    <span className="badge-manual text-[10px] !py-0.5">MANUAL</span>
                  )}
                  {getStatusBadge(displayStatus)}
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/30">{formatTimeAgo(job.lastRunAt)}</span>
                  {job.targetSpreadsheetId && (
                    <a href={`https://docs.google.com/spreadsheets/d/${job.targetSpreadsheetId}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                      Open Sheet
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  )}
                </div>

                {isRunning && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-400">{progressMessage || "Processing..."}</span>
                      <span className="text-white font-mono text-[10px]">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )})
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-6 py-4 text-xs font-medium text-white/30 uppercase tracking-wider">Job Name</th>
                <th className="px-6 py-4 text-xs font-medium text-white/30 uppercase tracking-wider">Config</th>
                <th className="px-6 py-4 text-xs font-medium text-white/30 uppercase tracking-wider">Target</th>
                <th className="px-6 py-4 text-xs font-medium text-white/30 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-medium text-white/30 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-4 text-xs font-medium text-white/30 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center text-white/30">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                        <svg className="w-8 h-8 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                      </div>
                      <p>No jobs configured yet.</p>
                      <Link href="/jobs/new" className="text-blue-400 hover:underline">Create your first job</Link>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedJobs.map((job) => {
                  const displayStatus = getDisplayStatus(job);
                  const isRunning = displayStatus === "running";
                  const { progress, progressMessage } = getProgressData(job);

                  return (
                  <tr key={job.id} className="table-row-hover group border-b border-white/[0.04] last:border-0">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{job.name}</div>
                      <div className="text-[10px] text-white/20 mt-0.5 font-mono">ID: {job.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-white/60 border border-white/[0.08] uppercase">{job.type}</span>
                        {job.runMode === "scheduled" || job.runMode === "both" ? (
                          <span className="badge-auto text-[10px] !py-0.5">AUTO</span>
                        ) : (
                          <span className="badge-manual text-[10px] !py-0.5">MANUAL</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="text-sm text-white/80 truncate max-w-[160px]" title={job.targetSpreadsheetName || ""}>
                        {job.targetSpreadsheetName || "N/A"}
                      </div>
                      {job.targetSpreadsheetId && (
                        <a href={`https://docs.google.com/spreadsheets/d/${job.targetSpreadsheetId}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline inline-flex items-center gap-1 mt-0.5">
                          Open Sheet
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div>{getStatusBadge(displayStatus)}</div>
                      <div className="text-[10px] text-white/20 mt-1">{formatTimeAgo(job.lastRunAt)}</div>
                    </td>
                    <td className="px-6 py-4 w-1/5 hidden lg:table-cell">
                      {isRunning ? (
                        <div className="w-full">
                          <div className="flex justify-between text-[10px] mb-1.5">
                            <span className="text-blue-400 truncate max-w-[140px]" title={progressMessage || "Processing..."}>
                              {progressMessage || "Processing..."}
                            </span>
                            <span className="text-white/80 font-mono ml-2 shrink-0">{progress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300 ease-out rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-white/20">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                        <button onClick={() => handleRunClick(job)} className="p-2 rounded-xl bg-white/[0.04] hover:bg-blue-500/15 hover:text-blue-400 text-white/40 transition-all border border-transparent hover:border-blue-500/20" title="Run Job">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                        <Link href={`/jobs/${job.id}`} className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70 transition-all border border-transparent hover:border-white/10" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </Link>
                        <button onClick={() => handleDeleteClick(job)} className="p-2 rounded-xl bg-white/[0.04] hover:bg-red-500/15 hover:text-red-400 text-white/40 transition-all border border-transparent hover:border-red-500/20" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-6 border-t border-white/[0.06]">
            <div className="text-xs text-white/30">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredJobs.length)} of {filteredJobs.length} jobs
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    currentPage === page
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/60'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal
        isOpen={runModalOpen}
        onClose={() => setRunModalOpen(false)}
        title="Execute Sync Job"
        footer={
          <div className="flex gap-3 justify-end w-full">
            <button onClick={() => setRunModalOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={confirmRunJob} className="btn-primary">Start Sync</button>
          </div>
        }
      >
        <p className="text-white/50 text-sm">
          Are you sure you want to run <strong className="text-white">{selectedJob?.name}</strong>? This will process {selectedJob?.type} data from the source sheet.
        </p>
      </Modal>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Configuration"
        type="danger"
        footer={
          <div className="flex gap-3 justify-end w-full">
            <button onClick={() => setDeleteModalOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={confirmDeleteJob} className="btn-danger">Delete Permanently</button>
          </div>
        }
      >
        <p className="text-white/50 text-sm">
          This action is irreversible. All history for <strong className="text-white">{selectedJob?.name}</strong> will be lost.
        </p>
      </Modal>
    </div>
  );
}
