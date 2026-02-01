"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SyncJob, SyncRun } from "@prisma/client";
import { signOut } from "next-auth/react";

type JobWithRuns = SyncJob & {
  runs: SyncRun[];
};

export default function Dashboard() {
  const [jobs, setJobs] = useState<JobWithRuns[]>([]);
  const [loading, setLoading] = useState(true);

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

  const runJob = async (id: string) => {
    if(!confirm("Are you sure you want to run this job now?")) return;
    try {
      const res = await fetch(`/api/jobs/${id}/run`, { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to run job");
      }
      alert("Success! The job has started.");
      fetchJobs();
    } catch (error: any) {
      alert(error.message || "Error triggering job");
    }
  };

  const deleteJob = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job?")) return;
    
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete job");
      setJobs(jobs.filter((j) => j.id !== id));
    } catch (error) {
      alert("Error deleting job");
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="text-2xl font-semibold text-white/70 animate-pulse">Loading your holographic workspace...</div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 glass-card p-8 rounded-3xl">
        <div>
           <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 drop-shadow-sm">Your Dashboard</h1>
           <p className="text-blue-100/80 mt-1 text-lg">Manage and run your automated lists</p>
        </div>
        
        <div className="flex gap-4">
          <Link
            href="/jobs/new"
            className="bg-blue-600/80 hover:bg-blue-600 text-white px-6 py-3 rounded-2xl text-lg font-semibold shadow-lg shadow-blue-500/20 transition-all hover:scale-105 hover:shadow-blue-500/40 backdrop-blur-md border border-white/10 flex items-center gap-2"
          >
            <span className="text-2xl">+</span> Create New Job
          </Link>
          <button 
            onClick={() => signOut()}
            className="text-white/60 hover:text-red-400 px-4 py-2 font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="grid gap-6">
        {jobs.length === 0 ? (
          <div className="text-center py-20 glass rounded-3xl border border-white/10 border-dashed">
            <p className="text-2xl text-white/50 font-medium mb-4">You haven't created any jobs yet.</p>
            <Link href="/jobs/new" className="text-blue-300 hover:text-blue-200 hover:underline text-xl">
              Click here to create your first one
            </Link>
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="glass-card rounded-3xl p-8 flex flex-col lg:flex-row justify-between gap-8 hover:bg-white/15 transition-all duration-300"
            >
              {/* Job Info */}
              <div className="space-y-6 flex-1">
                <div className="flex items-center gap-4 flex-wrap">
                  <h2 className="text-3xl font-bold text-white tracking-tight">{job.name}</h2>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide border backdrop-blur-md ${
                    job.runMode === "both" 
                      ? "bg-purple-500/20 text-purple-200 border-purple-500/30" 
                      : "bg-blue-500/20 text-blue-200 border-blue-500/30"
                  }`}>
                    {job.runMode === "both" ? "Auto-Scheduled" : "Manual Run"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base text-white/80 bg-black/20 p-6 rounded-2xl border border-white/5">
                  <div>
                    <span className="block text-xs font-bold text-white/40 uppercase mb-1">Target File</span>
                    <span className="text-lg font-medium text-white">{job.targetSpreadsheetName || "N/A"}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white/40 uppercase mb-1">Last Run Status</span>
                    <span className={`text-lg font-medium ${
                      job.runs[0]?.status === "success" ? "text-green-400" : 
                      job.runs[0]?.status === "failed" ? "text-red-400" : "text-white/50"
                    }`}>
                      {job.runs[0] 
                        ? `${job.runs[0].status.toUpperCase()} (${new Date(job.lastRunAt!).toLocaleDateString()})` 
                        : "Never Run"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 lg:w-auto w-full">
                <button
                  onClick={() => runJob(job.id)}
                  className="w-full sm:w-auto flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-5 rounded-2xl text-xl font-bold hover:from-green-400 hover:to-emerald-500 shadow-lg shadow-green-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 border border-white/20"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  RUN NOW
                </button>
                
                <div className="flex gap-2 w-full sm:w-auto">
                    <Link
                    href={`/jobs/${job.id}`}
                    className="flex-1 sm:flex-none text-center bg-white/10 hover:bg-white/20 border border-white/10 text-white px-6 py-5 rounded-2xl text-lg font-semibold transition-colors backdrop-blur-sm"
                    >
                    Edit
                    </Link>
                    <button
                    onClick={() => deleteJob(job.id)}
                    className="flex-1 sm:flex-none bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-200 px-6 py-5 rounded-2xl text-lg font-semibold transition-colors backdrop-blur-sm"
                    >
                    Delete
                    </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
