"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalJobs: number;
  totalSuccessfulRuns: number;
  totalUsers: number;
  pageViews: number;
}

function AnimatedCounter({ value, loading }: { value: number; loading: boolean }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (loading) return;
    const duration = 1200;
    const steps = 40;
    const stepTime = duration / steps;
    let current = 0;
    const increment = value / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value, loading]);

  if (loading) {
    return <div className="animate-pulse bg-white/10 rounded-lg w-20 h-10" />;
  }

  return <span className="animate-count-up">{display.toLocaleString()}</span>;
}

export default function HomePageClient() {
  const [stats, setStats] = useState<Stats>({
    totalJobs: 0,
    totalSuccessfulRuns: 0,
    totalUsers: 0,
    pageViews: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      ),
      color: "from-emerald-500 to-green-600",
    },
    {
      label: "Page Views",
      value: stats.pageViews,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      ),
      color: "from-blue-500 to-cyan-600",
    },
    {
      label: "Jobs Created",
      value: stats.totalJobs,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
      ),
      color: "from-violet-500 to-purple-600",
    },
  ];

  return (
    <section className="py-24 px-6 border-y border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Platform Statistics</h2>
          <p className="text-white/40">Trusted by tournament organizers across the community.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {statCards.map((stat, i) => (
            <div key={i} className="glass-panel-hover rounded-2xl p-7 gradient-border">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg`}>
                  {stat.icon}
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-white/40">{stat.label}</span>
              </div>
              <div className="text-4xl font-bold text-white">
                <AnimatedCounter value={stat.value} loading={loading} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}