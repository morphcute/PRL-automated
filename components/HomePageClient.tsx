"use client";

import { useEffect, useState } from "react";
import { isStaticExportBuild } from "@/lib/static-mode";

interface Stats {
  totalJobs: number;
  totalSuccessfulRuns: number;
  totalUsers: number;
  pageViews: number;
}

export default function HomePageClient() {
  const staticMode = isStaticExportBuild;
  const [stats, setStats] = useState<Stats>({
    totalJobs: 2341,
    totalSuccessfulRuns: 8543,
    totalUsers: 127,
    pageViews: 12847,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (staticMode) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [staticMode]);

  return (
    <>
      {/* Stats Section */}
      <section className="py-20 px-6 bg-white/5 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">Platform Statistics</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="glass-panel rounded-xl p-6 flex flex-col justify-between h-32">
                <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Total Users</div>
                <div className="text-4xl font-bold text-white flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  {loading ? (
                    <div className="animate-pulse bg-white/20 rounded w-16 h-8"></div>
                  ) : (
                    stats.totalUsers.toLocaleString()
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Registered users</div>
              </div>
            <div className="glass-panel rounded-xl p-6 flex flex-col justify-between h-32">
              <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Page Visit Views</div>
              <div className="text-4xl font-bold text-white">
                {loading ? (
                  <div className="animate-pulse bg-white/20 rounded w-20 h-8"></div>
                ) : (
                  stats.pageViews.toLocaleString()
                )}
              </div>
              <div className="text-xs text-muted-foreground">Total page views</div>
            </div>
            <div className="glass-panel rounded-xl p-6 flex flex-col justify-between h-32">
              <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Total Created Jobs</div>
              <div className="text-4xl font-bold text-white">
                {loading ? (
                  <div className="animate-pulse bg-white/20 rounded w-20 h-8"></div>
                ) : (
                  stats.totalJobs.toLocaleString()
                )}
              </div>
              <div className="text-xs text-muted-foreground">Jobs created by users</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
