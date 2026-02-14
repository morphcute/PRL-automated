import Link from "next/link";
import { auth } from "@/lib/auth";
import HomePageClient from "@/components/HomePageClient";
import PageViewTracker from "@/components/PageViewTracker";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <PageViewTracker page="home" />
      {/* Navigation */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
           </div>
           <span className="font-bold text-xl text-white tracking-tight">PRL Automated</span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-white transition-colors">How it Works</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
        </nav>
        {session ? (
          <Link 
            href="/dashboard" 
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors border border-white/10"
          >
            Dashboard
          </Link>
        ) : (
          <Link 
            href="/login" 
            className="px-4 py-2 rounded-lg bg-primary hover:bg-blue-600 text-white text-sm font-medium transition-colors"
          >
            Sign In
          </Link>
        )}
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 md:py-32 px-6 text-center max-w-5xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary mb-4">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Automated MLBB Registration Verification
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight">
            Verify Tournament Registrations <br/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Instantly & Accurately</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Stop manually checking IDs. PRL Automated fetches your Google Sheet registrations and verifies Mobile Legends player IDs against the official server in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link 
              href={session ? "/dashboard" : "/login"} 
              className="px-8 py-3.5 rounded-xl bg-primary hover:bg-blue-600 text-white font-semibold transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              {session ? "Go to Dashboard" : "Get Started"}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
            <Link 
              href="#how-it-works" 
              className="px-8 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 flex items-center justify-center"
            >
              Learn More
            </Link>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-20 px-6 bg-white/5 border-y border-white/5">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-16">Why Organizers Trust Us</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: "Automated Verification",
                  desc: "Automatically validate Player IDs and Zone IDs directly with the game server. No more fake registrations.",
                  icon: (
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  )
                },
                {
                  title: "Google Sheets Sync",
                  desc: "We read your 'Pre Registered List' securely and write the verification status back to your own spreadsheet.",
                  icon: (
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  )
                },
                {
                  title: "Privacy First",
                  desc: "We don't store your data. Your spreadsheet content is processed in-transit and stays in your Google Drive.",
                  icon: (
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  )
                }
              ].map((feature, i) => (
                <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <HomePageClient />

        {/* How It Works */}
        <section id="how-it-works" className="py-20 px-6 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">How It Works</h2>
          <div className="space-y-12">
            {[
              {
                step: "01",
                title: "Connect Your Sheet",
                desc: "Sign in with Google and provide the link to your tournament registration spreadsheet."
              },
              {
                step: "02",
                title: "Configure Verification",
                desc: "Select the columns where Player IDs and Server IDs are located."
              },
              {
                step: "03",
                title: "Run Automation",
                desc: "Click 'Run' and watch as we verify every player and update your sheet with 'Verified' or 'Not Found' status."
              }
            ].map((item, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="text-4xl font-bold text-white/10">{item.step}</div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/10 text-center text-sm text-muted-foreground">
        <div className="flex justify-center gap-6 mb-4">
          <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white">Terms of Service</Link>
        </div>
        <p>© {new Date().getFullYear()} PRL Automated. All rights reserved.</p>
      </footer>
    </div>
  );
}
