"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SyncJobSchema, SyncJobInput } from "@/lib/validations";

interface JobFormProps {
  initialData?: SyncJobInput;
  onSubmit?: (data: SyncJobInput) => Promise<void>;
}

export function JobForm({ initialData, onSubmit }: JobFormProps) {
  const form = useForm<SyncJobInput>({
    resolver: zodResolver(SyncJobSchema),
    defaultValues: initialData || {
      name: "",
      type: "5v5",
      validationEnabled: false,
      spreadsheetId: "",
      sheetName: "Pre Registered List",
      runMode: "manual",
      cronEnabled: false,
      isEnabled: true,
      targetSpreadsheetName: "",
    },
  });

  const runMode = form.watch("runMode");
  const jobType = form.watch("type");
  const validationEnabled = form.watch("validationEnabled");

  // Force validation to true if jobType is 'verifier'
  if (jobType === "verifier" && !validationEnabled) {
     form.setValue("validationEnabled", true);
  }

  const handleSubmit = async (data: SyncJobInput) => {
    if (onSubmit) {
      // Convert local time strings to UTC ISO strings before submitting
      const adjustedData = { ...data };
      if (data.startAt) {
        adjustedData.startAt = new Date(data.startAt).toISOString();
      }

      // Automatically enable cron if runMode is set to auto-pilot (both) or scheduled
      if (data.runMode === "both" || data.runMode === "scheduled") {
        adjustedData.cronEnabled = true;
      } else {
        adjustedData.cronEnabled = false;
      }

      await onSubmit(adjustedData);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-4xl mx-auto space-y-12 pb-20">
      
      {/* Header */}
      <div className="glass-card p-10 rounded-3xl border border-white/20 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-glow"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-white mb-3 tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            Create New Sync Job
          </h2>
          <p className="text-blue-100/70 text-xl font-light">Configure your automation sequence in 4 simple steps.</p>
        </div>
      </div>

      {/* Steps Container */}
      <div className="space-y-8">
        
        {/* Step 1: Job Name */}
        <div className="glass-card glass-card-hover p-6 md:p-8 rounded-3xl border border-white/10 group hover:border-blue-500/30 transition-colors">
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
            <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-2xl md:text-3xl font-black text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-white/20">
              1
            </div>
            <div className="flex-1 space-y-4 md:space-y-6 w-full">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Job Identity</h3>
                <label className="block text-base md:text-lg text-white/60">Give this automation task a unique name.</label>
              </div>
              <div className="relative">
                <input 
                  {...form.register("name")} 
                  className="w-full text-lg md:text-xl p-4 md:p-6 pl-6 rounded-2xl glass-input focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all placeholder:text-white/20 bg-black/20" 
                  placeholder="e.g. Weekly Tournament List" 
                />
                <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/5"></div>
              </div>
              {form.formState.errors.name && <span className="inline-block px-4 py-2 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 font-medium animate-pulse">{form.formState.errors.name.message}</span>}
              
              <div className="pt-4">
                <label className="block text-base md:text-lg text-white/60 mb-3">Job Type</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(["5v5", "3v3", "onsite", "verifier"] as const).map((type) => (
                    <label key={type} className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 text-center ${
                      jobType === type 
                        ? 'border-blue-400 bg-blue-500/10 text-white font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                        : 'border-white/10 text-white/40 hover:border-white/30 hover:bg-white/5'
                    }`}>
                      <input 
                        type="radio" 
                        value={type} 
                        {...form.register("type")} 
                        className="sr-only"
                      />
                      <span className="uppercase">{type === "verifier" ? "MLBB Verifier" : type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {jobType !== "verifier" && (
                <div className="pt-4 animate-in fade-in slide-in-from-top-2">
                  <label className="flex items-center gap-4 cursor-pointer group/toggle">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        {...form.register("validationEnabled")} 
                        className="sr-only"
                      />
                      <div className={`w-14 h-8 rounded-full transition-colors duration-300 ${validationEnabled ? 'bg-green-500' : 'bg-white/10'}`}></div>
                      <div className={`absolute left-1 top-1 w-6 h-6 rounded-full bg-white transition-transform duration-300 ${validationEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                    <div>
                      <span className="block text-lg font-bold text-white group-hover/toggle:text-green-300 transition-colors">Enable MLBB ID Verification</span>
                      <span className="text-sm text-white/50">Automatically verify Player ID & Zone ID with MooGold</span>
                    </div>
                  </label>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Step 2: Source Link */}
        <div className="glass-card glass-card-hover p-6 md:p-8 rounded-3xl border border-white/10 group hover:border-purple-500/30 transition-colors">
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
            <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-2xl md:text-3xl font-black text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] border border-white/20">
              2
            </div>
            <div className="flex-1 space-y-4 md:space-y-6 w-full">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Data Source</h3>
                <label className="block text-base md:text-lg text-white/60">Paste the full URL of the source Google Sheet (Responses).</label>
              </div>
              <div className="relative group/input">
                <input 
                  {...form.register("spreadsheetId")} 
                  className="w-full text-base md:text-lg p-4 md:p-6 rounded-2xl glass-input font-mono text-purple-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 transition-all placeholder:text-white/20 bg-black/20" 
                  placeholder="https://docs.google.com/spreadsheets/d/..." 
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-hover/input:text-purple-400 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                </div>
              </div>
              {form.formState.errors.spreadsheetId && <span className="inline-block px-4 py-2 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 font-medium animate-pulse">{form.formState.errors.spreadsheetId.message}</span>}
            </div>
          </div>
        </div>

        {/* Step 3: Target File */}
        <div className="glass-card glass-card-hover p-6 md:p-8 rounded-3xl border border-white/10 group hover:border-pink-500/30 transition-colors">
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
            <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center text-2xl md:text-3xl font-black text-white shadow-[0_0_20px_rgba(236,72,153,0.5)] border border-white/20">
              3
            </div>
            <div className="flex-1 space-y-4 md:space-y-6 w-full">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Target Destination</h3>
                <label className="block text-base md:text-lg text-white/60">Name for the "Pre Registered List" file.</label>
              </div>
              <input 
                {...form.register("targetSpreadsheetName")} 
                className="w-full text-lg md:text-xl p-4 md:p-6 rounded-2xl glass-input focus:ring-2 focus:ring-pink-500/50 focus:border-pink-400/50 transition-all placeholder:text-white/20 bg-black/20" 
                placeholder="e.g. PRL - Season 5" 
              />
              
              <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-transparent border-l-4 border-blue-400">
                <div className="bg-blue-500/20 p-2 rounded-lg text-blue-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-blue-100/80 text-sm">
                  System will <span className="text-blue-300 font-bold">automatically create</span> this file in your Google Drive if it doesn't exist.
                </p>
              </div>
              
              {form.formState.errors.targetSpreadsheetName && <span className="inline-block px-4 py-2 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 font-medium animate-pulse">{form.formState.errors.targetSpreadsheetName.message}</span>}
            </div>
          </div>
        </div>

        {/* Step 4: Schedule */}
        <div className="glass-card glass-card-hover p-6 md:p-8 rounded-3xl border border-white/10 group hover:border-emerald-500/30 transition-colors">
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
            <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-2xl md:text-3xl font-black text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-white/20">
              4
            </div>
            <div className="flex-1 space-y-6 md:space-y-8 w-full">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Execution Protocol</h3>
                <label className="block text-base md:text-lg text-white/60">Choose how this job should run.</label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className={`relative p-6 rounded-3xl border-2 cursor-pointer transition-all duration-300 group/option ${
                  runMode === 'manual' 
                    ? 'border-blue-400 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]' 
                    : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                }`}>
                  <input 
                    type="radio" 
                    value="manual" 
                    {...form.register("runMode")} 
                    className="sr-only"
                  />
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className={`p-4 rounded-full ${runMode === 'manual' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/40 group-hover/option:text-white'} transition-colors`}>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                    </div>
                    <div>
                      <span className="block text-xl font-bold mb-1 text-white">Manual Command</span>
                      <span className="text-sm text-white/50">Run only when I click the button</span>
                    </div>
                  </div>
                </label>

                <label className={`relative p-6 rounded-3xl border-2 cursor-pointer transition-all duration-300 group/option ${
                  runMode === 'both' 
                    ? 'border-purple-400 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.2)]' 
                    : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                }`}>
                  <input 
                    type="radio" 
                    value="both" 
                    {...form.register("runMode")} 
                    className="sr-only"
                  />
                  <div className="flex flex-col items-center text-center gap-4">
                     <div className={`p-4 rounded-full ${runMode === 'both' ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/40 group-hover/option:text-white'} transition-colors`}>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <span className="block text-xl font-bold mb-1 text-white">Auto-Pilot</span>
                      <span className="text-sm text-white/50">Run automatically + Manual option</span>
                    </div>
                  </div>
                </label>
              </div>

              {(runMode === "both" || runMode === "scheduled") && (
                <div className="mt-8 p-8 bg-black/30 rounded-3xl border border-white/10 space-y-6 animate-in fade-in slide-in-from-top-4 backdrop-blur-md">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <h4 className="text-xl font-bold text-white">Scheduler Configuration</h4>
                  </div>
                  
                  <div>
                    <label className="block text-base font-medium text-white/70 mb-3">Start Date & Time</label>
                    <input 
                      type="datetime-local" 
                      {...form.register("startAt")} 
                      className="w-full text-xl p-5 rounded-2xl glass-input focus:ring-2 focus:ring-purple-500/50 text-white" 
                    />
                  </div>
                  
                  <div className="hidden">
                     <input {...form.register("intervalMinutes", { valueAsNumber: true })} value={60} />
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-purple-200/60 bg-purple-500/5 p-4 rounded-xl">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    System will initiate sync sequence automatically starting from this timestamp.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Fields */}
      <div className="hidden">
        <input {...form.register("sheetName")} />
        <input {...form.register("cronEnabled")} />
      </div>

      <button 
        type="submit" 
        className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-2xl font-black py-8 rounded-3xl shadow-[0_0_40px_rgba(79,70,229,0.4)] transition-all transform hover:scale-[1.01] hover:shadow-[0_0_60px_rgba(79,70,229,0.6)] disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
        disabled={form.formState.isSubmitting}
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 backdrop-blur-sm"></div>
        <span className="relative z-10 flex items-center justify-center gap-3">
          {form.formState.isSubmitting ? (
             <>
               <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               INITIALIZING...
             </>
          ) : (
            <>
              INITIALIZE JOB
              <svg className="w-8 h-8 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </>
          )}
        </span>
      </button>

    </form>
  );
}
