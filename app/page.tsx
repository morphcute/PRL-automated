import Link from "next/link";
import { auth } from "@/lib/auth";
import HomePageClient from "@/components/HomePageClient";
import PageViewTracker from "@/components/PageViewTracker";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col -m-4 md:-m-8">
      <PageViewTracker page="home" />

      {/* Navigation */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-white/[0.06] bg-black/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <span className="font-bold text-xl text-white tracking-tight">PRL Automated</span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-white/50">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-white transition-colors">How it Works</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
        </nav>
        {session ? (
          <Link href="/dashboard" className="btn-primary text-sm !py-2 !px-4">
            Dashboard
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </Link>
        ) : (
          <Link href="/login" className="btn-primary text-sm !py-2 !px-4">
            Sign In
          </Link>
        )}
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="py-24 md:py-36 px-6 text-center max-w-5xl mx-auto space-y-8 relative">
          {/* Decorative orbs */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 space-y-8">
            <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Automated MLBB Registration Verification
            </div>

            <h1 className="animate-slide-up text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.1]">
              Verify Tournament<br/>
              Registrations{" "}
              <span className="shimmer-text">Instantly</span>
            </h1>

            <p className="animate-slide-up stagger-1 text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
              Stop manually checking IDs. PRL Automated verifies Mobile Legends player IDs against the official server and syncs everything to your Google Sheet — in seconds.
            </p>

            <div className="animate-slide-up stagger-2 flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href={session ? "/dashboard" : "/login"} className="btn-primary text-base !py-3.5 !px-8">
                {session ? "Go to Dashboard" : "Get Started Free"}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              <Link href="#how-it-works" className="btn-ghost text-base !py-3.5 !px-8">
                Learn More
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 px-6 border-y border-white/[0.06]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Why Organizers Trust Us</h2>
              <p className="text-white/40 max-w-xl mx-auto">Everything you need to run professional tournaments, automated.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: "Automated Verification",
                  desc: "Validate Player IDs and Zone IDs directly against the game server. No more fake registrations slipping through.",
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  ),
                  color: "from-emerald-500 to-green-600",
                  glow: "shadow-emerald-500/20"
                },
                {
                  title: "Google Sheets Sync",
                  desc: "Reads your registration sheet and writes verification status back automatically. Your data stays in your Drive.",
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  ),
                  color: "from-blue-500 to-cyan-600",
                  glow: "shadow-blue-500/20"
                },
                {
                  title: "Privacy First",
                  desc: "We don't store your spreadsheet data. Everything is processed in-transit and stays securely in your Google Drive.",
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  ),
                  color: "from-violet-500 to-purple-600",
                  glow: "shadow-violet-500/20"
                }
              ].map((feature, i) => (
                <div key={i} className="glass-panel-hover rounded-2xl p-7 group">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 text-white shadow-lg ${feature.glow} group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <HomePageClient />

        {/* How It Works */}
        <section id="how-it-works" className="py-24 px-6 max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-white/40">Three simple steps to automate your tournament.</p>
          </div>
          <div className="space-y-0">
            {[
              {
                step: "01",
                title: "Connect Your Sheet",
                desc: "Sign in with Google and provide the link to your tournament registration spreadsheet."
              },
              {
                step: "02",
                title: "Configure Verification",
                desc: "Choose your tournament type (5v5, 3v3, Onsite) and set up automated scheduling."
              },
              {
                step: "03",
                title: "Run Automation",
                desc: "Click Run and watch as every player is verified automatically — status written back to your sheet."
              }
            ].map((item, i) => (
              <div key={i} className="flex gap-6 items-start relative group">
                {/* Timeline line */}
                {i < 2 && (
                  <div className="absolute left-[23px] top-14 bottom-0 w-px bg-gradient-to-b from-white/10 to-transparent" />
                )}
                <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-sm font-bold text-white/30 flex-shrink-0 group-hover:bg-blue-500/10 group-hover:border-blue-500/20 group-hover:text-blue-400 transition-all duration-300">
                  {item.step}
                </div>
                <div className="pb-12">
                  <h3 className="text-lg font-semibold text-white mb-1.5">{item.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center glass-panel rounded-3xl p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-violet-500/5" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to Automate?</h2>
              <p className="text-white/40 mb-8 max-w-lg mx-auto">Join tournament organizers who save hours every event with automated verification.</p>
              <Link href={session ? "/dashboard" : "/login"} className="btn-primary inline-flex text-base !py-3.5 !px-8">
                {session ? "Open Dashboard" : "Start for Free"}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/[0.06] text-center">
        <div className="flex justify-center gap-6 mb-4 text-sm">
          <Link href="/privacy" className="text-white/30 hover:text-white/60 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="text-white/30 hover:text-white/60 transition-colors">Terms of Service</Link>
        </div>
        <p className="text-white/20 text-sm">© {new Date().getFullYear()} PRL Automated. All rights reserved.</p>
      </footer>
    </div>
  );
}
