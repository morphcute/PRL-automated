"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SyncJob, SyncRun } from "@prisma/client";
import { signOut } from "next-auth/react";
import Modal from "./Modal";

type JobWithRuns = SyncJob & {
  runs: SyncRun[];
};

export default function Dashboard() {
  const [jobs, setJobs] = useState<JobWithRuns[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const ITEMS_PER_PAGE = 10;

  // Modal States
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithRuns | null>(null);

  // Info/Alert Modal States
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalConfig, setInfoModalConfig] = useState({
    title: "",
    message: "",
    type: "default" as "default" | "success" | "danger"
  });

  const showInfo = (title: string, message: string, type: "default" | "success" | "danger" = "default") => {
    setInfoModalConfig({ title, message, type });
    setInfoModalOpen(true);
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs");
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
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Background Scheduler & Polling
  useEffect(() => {
    const checkSchedule = async () => {
      if (document.visibilityState !== "visible") return;

      try {
        const res = await fetch("/api/jobs/check", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) fetchJobs();
        }
      } catch (error) {
        console.error("Scheduler heartbeat failed", error);
      }
    };

    const scheduleInterval = setInterval(checkSchedule, 300000); // every 5 minutes
    const scheduleTimeout = setTimeout(checkSchedule, 15000);

    const pollProgress = () => {
       const hasRunning = jobs.some(j => j.runs && j.runs[0]?.status === "running");
       if (hasRunning) fetchJobs();
    };
    const progressInterval = setInterval(pollProgress, 2000);

    return () => {
      clearInterval(scheduleInterval);
      clearTimeout(scheduleTimeout);
      clearInterval(progressInterval);
    };
  }, [jobs]);

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
    setRunModalOpen(false);
    
    try {
      const res = await fetch(`/api/jobs/${selectedJob.id}/run`, { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to run job");
      }
      showInfo("Sequence Initiated", "The sync job has been started successfully.", "success");
      fetchJobs();
    } catch (error: any) {
      showInfo("Execution Failed", error.message || "Error triggering job", "danger");
    }
  };

  const confirmDeleteJob = async () => {
    if (!selectedJob) return;
    setDeleteModalOpen(false);

    try {
      const res = await fetch(`/api/jobs/${selectedJob.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete job");
      setJobs(jobs.filter((j) => j.id !== selectedJob.id));
      showInfo("Job Deleted", "The sync job has been removed.", "default");
    } catch (error) {
      showInfo("Delete Failed", "Could not delete the job.", "danger");
    }
  };

  // Stats Calculation
  const activeJobs = jobs.filter(j => j.isEnabled).length;
  const runningJobs = jobs.filter(j => j.runs[0]?.status === "running").length;
  const successRate = jobs.length > 0 
    ? Math.round((jobs.filter(j => j.runs[0]?.status === "success").length / jobs.length) * 100) 
    : 0;

  // Filter & Pagination Logic
  const filteredJobs = jobs.filter(job => 
    job.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    job.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) return (
    <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      <div className="text-sm font-medium text-muted-foreground animate-pulse">Initializing System...</div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto px-6 py-10">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-white">PRL Automated</h1>
           <p className="text-muted-foreground mt-1 text-sm">Manage and monitor your sync operations.</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <Link
            href="/jobs/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Create Job
          </Link>
          <button 
            onClick={() => signOut({ callbackUrl: "/" })}
            className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-sm text-muted-foreground hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel rounded-xl p-6 flex flex-col justify-between h-32">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Total Jobs</div>
          <div className="text-4xl font-bold text-white">{jobs.length}</div>
          <div className="text-xs text-green-400 font-medium">{activeJobs} Active</div>
        </div>
        <div className="glass-panel rounded-xl p-6 flex flex-col justify-between h-32">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">System Status</div>
          <div className="text-4xl font-bold text-white flex items-center gap-3">
            {runningJobs > 0 ? (
              <>
                <span className="w-3 h-3 rounded-full bg-blue-500 animate-ping"></span>
                Processing
              </>
            ) : (
              <>
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                Idle
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{runningJobs} jobs running</div>
        </div>
        <div className="glass-panel rounded-xl p-6 flex flex-col justify-between h-32">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Success Rate</div>
          <div className="text-4xl font-bold text-white">{successRate}%</div>
          <div className="text-xs text-muted-foreground">Based on last run</div>
        </div>
      </div>

      {/* Main Content: Jobs Table */}
      <div className="glass-panel rounded-xl overflow-hidden min-h-[400px]">
        <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Active Jobs</h2>
            <div className="text-xs text-muted-foreground">Auto-refreshing every 2s</div>
          </div>
          
          <div className="relative w-full sm:w-64">
            <input 
              type="text" 
              placeholder="Search jobs..." 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 outline-none"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
        
        {/* Mobile View: Cards */}
        <div className="block sm:hidden p-4 space-y-4">
          {jobs.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              <p>No jobs configured.</p>
              <Link href="/jobs/new" className="text-primary hover:underline text-sm">Create one</Link>
            </div>
          ) : (
            paginatedJobs.map((job) => (
              <div key={job.id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-white">{job.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">ID: {job.id.slice(0, 8)}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRunClick(job)}
                      className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(job)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-white/40 text-xs uppercase mb-1">Type</div>
                    <div className="flex gap-2">
                       <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/80 border border-white/10 uppercase">
                          {job.type}
                       </span>
                       {job.runMode !== "manual" && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            AUTO
                          </span>
                       )}
                    </div>
                  </div>
                  <div>
                     <div className="text-white/40 text-xs uppercase mb-1">Target</div>
                     {job.targetSpreadsheetId ? (
                        <a 
                          href={`https://docs.google.com/spreadsheets/d/${job.targetSpreadsheetId}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          Open Sheet
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                     ) : <span className="text-muted-foreground">N/A</span>}
                  </div>
                </div>

                <div>
                   <div className="text-white/40 text-xs uppercase mb-1">Status</div>
                   <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        job.runs[0]?.status === "running" ? "bg-blue-500 animate-ping" :
                        job.runs[0]?.status === "success" ? "bg-green-500" :
                        job.runs[0]?.status === "failed" ? "bg-red-500" : "bg-white/20"
                      }`}></div>
                      <span className={`font-medium ${
                        job.runs[0]?.status === "running" ? "text-blue-400" :
                        job.runs[0]?.status === "success" ? "text-green-400" :
                        job.runs[0]?.status === "failed" ? "text-red-400" : "text-muted-foreground"
                      }`}>
                        {job.runs[0]?.status ? job.runs[0].status.toUpperCase() : "PENDING"}
                      </span>
                   </div>
                   {job.runs[0]?.status === "running" && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                           <span className="text-blue-400">{job.runs[0].progressMessage || "Processing..."}</span>
                           <span className="text-white">{job.runs[0].progress || 0}%</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                           <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${job.runs[0].progress || 0}%` }}></div>
                        </div>
                      </div>
                   )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-muted-foreground font-medium">
              <tr>
                <th className="px-6 py-4">Job Name</th>
                <th className="px-6 py-4">Configuration</th>
                <th className="px-6 py-4">Target</th>
                <th className="px-6 py-4">Last Status</th>
                <th className="px-6 py-4">Progress</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-10 h-10 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                      <p>No jobs configured yet.</p>
                      <Link href="/jobs/new" className="text-primary hover:underline">Create your first job</Link>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedJobs.map((job) => (
                  <tr key={job.id} className="table-row-hover group border-b border-white/5 last:border-0">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{job.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-mono opacity-70">ID: {job.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/80 border border-white/10 uppercase whitespace-nowrap">
                           {job.type}
                        </span>
                        {job.runMode === "scheduled" || job.runMode === "both" ? (
                           <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap">
                             AUTO
                           </span>
                        ) : (
                           <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">
                             MANUAL
                           </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="text-sm text-white truncate max-w-[150px]" title={job.targetSpreadsheetName || ""}>
                        {job.targetSpreadsheetName || "N/A"}
                      </div>
                      {job.targetSpreadsheetId && (
                        <a 
                          href={`https://docs.google.com/spreadsheets/d/${job.targetSpreadsheetId}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:text-blue-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          Open Sheet
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          job.runs[0]?.status === "running" ? "bg-blue-500 animate-pulse" :
                          job.runs[0]?.status === "success" ? "bg-green-500" :
                          job.runs[0]?.status === "failed" ? "bg-red-500" : "bg-white/20"
                        }`}></div>
                        <span className={`text-xs font-medium whitespace-nowrap ${
                          job.runs[0]?.status === "running" ? "text-blue-400" :
                          job.runs[0]?.status === "success" ? "text-green-400" :
                          job.runs[0]?.status === "failed" ? "text-red-400" : "text-muted-foreground"
                        }`}>
                          {job.runs[0]?.status ? job.runs[0].status.toUpperCase() : "PENDING"}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">
                        {job.lastRunAt ? new Date(job.lastRunAt).toLocaleDateString() : "Never run"}
                      </div>
                    </td>
                    <td className="px-6 py-4 w-1/4 hidden lg:table-cell">
                       {job.runs[0]?.status === "running" ? (
                         <div className="w-full">
                           <div className="flex justify-between text-xs mb-1">
                             <span className="text-blue-400 animate-pulse">{job.runs[0].progressMessage || "Processing..."}</span>
                             <span className="text-white font-mono">{job.runs[0].progress || 0}%</span>
                           </div>
                           <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                             <div 
                               className="h-full bg-blue-500 transition-all duration-500 ease-out rounded-full"
                               style={{ width: `${job.runs[0].progress || 0}%` }}
                             ></div>
                           </div>
                         </div>
                       ) : (
                         <span className="text-xs text-muted-foreground">-</span>
                       )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleRunClick(job)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors border border-white/5 hover:border-primary/30"
                          title="Run Job"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                        <Link
                          href={`/jobs/${job.id}`}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white transition-colors border border-white/5"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(job)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors border border-white/5 hover:border-red-500/30"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-6 border-t border-white/10">
            <div className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredJobs.length)} of {filteredJobs.length} jobs
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    currentPage === page 
                      ? 'bg-primary text-white' 
                      : 'bg-white/5 hover:bg-white/10 text-white'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <button 
              onClick={() => setRunModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={confirmRunJob}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-blue-600 text-white text-sm font-medium transition-colors"
            >
              Start Sync
            </button>
          </div>
        }
      >
        <p className="text-muted-foreground text-sm">
          Are you sure you want to run <strong>{selectedJob?.name}</strong>? This will process {selectedJob?.type} data from the source sheet.
        </p>
      </Modal>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Configuration"
        type="danger"
        footer={
          <div className="flex gap-3 justify-end w-full">
             <button 
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={confirmDeleteJob}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
            >
              Delete Permanently
            </button>
          </div>
        }
      >
        <p className="text-muted-foreground text-sm">
          This action is irreversible. All history for <strong>{selectedJob?.name}</strong> will be lost.
        </p>
      </Modal>

      <Modal
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        title={infoModalConfig.title}
        type={infoModalConfig.type}
        footer={
          <button 
            onClick={() => setInfoModalOpen(false)}
            className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        }
      >
        <p className="text-sm text-muted-foreground">{infoModalConfig.message}</p>
      </Modal>

    </div>
  );
}
