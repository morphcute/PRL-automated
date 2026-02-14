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
      if (res.status === 401) {
        return;
      }
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

  // Background Scheduler Simulation (Auto Pilot Heartbeat)
  // This ensures scheduled jobs run while the dashboard is open, even without external cron.
  useEffect(() => {
    // 1. Scheduler Check (every 60s)
    const checkSchedule = async () => {
      try {
        const res = await fetch("/api/jobs/check", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            fetchJobs();
          }
        }
      } catch (error) {
        console.error("Scheduler heartbeat failed", error);
      }
    };

    const scheduleInterval = setInterval(checkSchedule, 60000);
    const scheduleTimeout = setTimeout(checkSchedule, 5000);

    // 2. Progress Polling (every 2s if any job is running)
    const pollProgress = () => {
       const hasRunning = jobs.some(j => j.runs && j.runs[0]?.status === "running");
       if (hasRunning) {
          fetchJobs();
       }
    };
    const progressInterval = setInterval(pollProgress, 2000);

    return () => {
      clearInterval(scheduleInterval);
      clearTimeout(scheduleTimeout);
      clearInterval(progressInterval);
    };
  }, [jobs]); // Re-run effect when jobs change to update polling logic if needed

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
      showInfo("Sequence Initiated", "The sync job has been started successfully. The data will be updated shortly.", "success");
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
      showInfo("Job Deleted", "The sync job has been permanently removed.", "default");
    } catch (error) {
      showInfo("Delete Failed", "Could not delete the job. Please try again.", "danger");
    }
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      <div className="text-xl font-medium text-white/50 animate-pulse">Initializing PRL System...</div>
    </div>
  );

  return (
    <div className="space-y-10 max-w-6xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-6 border-b border-white/10">
        <div className="animate-float w-full md:w-auto">
           <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] leading-tight">
             PRL AUTOMATED
           </h1>
           <p className="text-blue-200/60 mt-2 text-lg md:text-xl font-light tracking-wide">
             Pre Registered List Management System
           </p>
        </div>
        
        <div className="flex gap-4 items-center w-full md:w-auto">
          <Link
            href="/jobs/new"
            className="flex-1 md:flex-none justify-center group relative px-6 py-3 bg-blue-600 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] transition-all duration-300 hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              NEW JOB
            </span>
          </Link>
          <button 
            onClick={() => signOut()}
            className="px-4 py-3 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors font-medium"
          >
            LOGOUT
          </button>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 gap-8">
        {jobs.length === 0 ? (
          <div className="text-center py-32 glass-card rounded-3xl border border-white/5 border-dashed relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto mb-6 bg-white/5 rounded-full flex items-center justify-center text-white/20 group-hover:text-blue-400 group-hover:scale-110 transition-all duration-500">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <p className="text-3xl text-white/40 font-bold mb-2">No Active Jobs</p>
              <p className="text-white/20 mb-8">Your automation workspace is empty.</p>
              <Link href="/jobs/new" className="text-blue-400 hover:text-blue-300 font-bold tracking-wider hover:underline underline-offset-4">
                INITIALIZE FIRST JOB &rarr;
              </Link>
            </div>
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="glass-card glass-card-hover rounded-3xl p-1 relative overflow-hidden group"
            >
              {/* Card Content Container */}
              <div className="bg-black/40 rounded-[22px] p-8 h-full backdrop-blur-sm">
                
                {/* Top Row: Title & Status */}
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-8">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-3xl font-bold text-white tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-blue-300 transition-all">
                        {job.name}
                      </h2>
                      <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${
                        job.runMode === "both" 
                          ? "bg-purple-500/10 text-purple-300 border-purple-500/20" 
                          : "bg-blue-500/10 text-blue-300 border-blue-500/20"
                      }`}>
                        {job.runMode === "both" ? "Auto + Manual" : "Manual Only"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/40 font-mono">
                      <span>ID: {job.id.substring(0, 8)}...</span>
                    </div>
                  </div>

                  {/* Actions Row (Desktop) */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleRunClick(job)}
                      className="flex-1 lg:flex-none bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg shadow-white/10 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      RUN
                    </button>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"
                      title="Edit Settings"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(job)}
                      className="p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors border border-red-500/20"
                      title="Delete Job"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Target File Card */}
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/5 flex flex-col justify-between group/file hover:bg-white/10 transition-colors">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-white/30 uppercase tracking-wider">Target File</span>
                        <svg className="w-5 h-5 text-white/20 group-hover/file:text-green-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div className="text-lg font-medium text-white truncate pr-4">
                        {job.targetSpreadsheetName || "N/A"}
                      </div>
                    </div>
                    
                    {job.targetSpreadsheetId && (
                      <div className="mt-4">
                        <a 
                          href={`https://docs.google.com/spreadsheets/d/${job.targetSpreadsheetId}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-bold text-green-400 hover:text-green-300 transition-colors"
                        >
                          OPEN SPREADSHEET 
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Status Card */}
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/5 flex flex-col justify-between relative overflow-hidden">
                    {/* Progress Bar Background (Only if running) */}
                    {job.runs[0]?.status === "running" && (
                      <div 
                        className="absolute bottom-0 left-0 h-1 bg-green-500 transition-all duration-500 ease-out"
                        style={{ width: `${job.runs[0].progress || 0}%` }}
                      ></div>
                    )}
                    
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-white/30 uppercase tracking-wider">System Status</span>
                      <div className={`w-2 h-2 rounded-full ${
                        job.runs[0]?.status === "running" ? "bg-blue-500 animate-ping" : 
                        job.runs[0]?.status === "success" ? "bg-green-500" : 
                        job.runs[0]?.status === "failed" ? "bg-red-500" : "bg-white/20"
                      }`}></div>
                    </div>
                    <div>
                      <div className={`text-lg font-bold flex items-center gap-2 ${
                        job.runs[0]?.status === "running" ? "text-blue-400" : 
                        job.runs[0]?.status === "success" ? "text-green-400" : 
                        job.runs[0]?.status === "failed" ? "text-red-400" : "text-white/40"
                      }`}>
                        {job.runs[0]?.status ? job.runs[0].status.toUpperCase() : "PENDING"}
                        {job.runs[0]?.status === "running" && (
                          <span className="text-sm font-mono opacity-80">
                            {job.runs[0].progress || 0}%
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/40 mt-1">
                        {job.runs[0] 
                          ? `Last sync: ${new Date(job.lastRunAt!).toLocaleDateString()} at ${new Date(job.lastRunAt!).toLocaleTimeString()}` 
                          : "Waiting for first run..."}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ))
        )}
      </div>

      {/* Run Modal */}
      <Modal
        isOpen={runModalOpen}
        onClose={() => setRunModalOpen(false)}
        title="Initiate Sequence?"
        footer={
          <>
            <button 
              onClick={() => setRunModalOpen(false)}
              className="px-6 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors font-medium"
            >
              Cancel
            </button>
            <button 
              onClick={confirmRunJob}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all"
            >
              Confirm Start
            </button>
          </>
        }
      >
        <p>You are about to manually trigger the sync sequence for <strong>{selectedJob?.name}</strong>.</p>
        <p className="mt-2 text-white/60 text-base">This will pull the latest data from the source and overwrite the target list.</p>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Job?"
        type="danger"
        footer={
          <>
            <button 
              onClick={() => setDeleteModalOpen(false)}
              className="px-6 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors font-medium"
            >
              Cancel
            </button>
            <button 
              onClick={confirmDeleteJob}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all"
            >
              Delete Permanently
            </button>
          </>
        }
      >
        <p>Are you sure you want to delete <strong>{selectedJob?.name}</strong>?</p>
        <p className="mt-2 text-red-200/60 text-base">This action cannot be undone. All configuration and run history will be lost.</p>
      </Modal>

      {/* Info/Alert Modal */}
      <Modal
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        title={infoModalConfig.title}
        type={infoModalConfig.type}
        footer={
          <button 
            onClick={() => setInfoModalOpen(false)}
            className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
          >
            Close
          </button>
        }
      >
        <p className="text-lg">{infoModalConfig.message}</p>
      </Modal>

    </div>
  );
}
