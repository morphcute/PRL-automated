"use client";

import Link from "next/link";
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

  if (jobType === "verifier" && !validationEnabled) {
    form.setValue("validationEnabled", true);
  }

  const handleSubmit = async (data: SyncJobInput) => {
    if (onSubmit) {
      const adjustedData = { ...data };
      if (data.startAt) {
        adjustedData.startAt = new Date(data.startAt).toISOString();
      }
      if (data.runMode === "both" || data.runMode === "scheduled") {
        adjustedData.cronEnabled = true;
      } else {
        adjustedData.cronEnabled = false;
      }
      await onSubmit(adjustedData);
    }
  };

  // Step progress
  const steps = [
    { label: "Basic Info", icon: "1" },
    { label: "Data Sources", icon: "2" },
    { label: "Automation", icon: "3" },
  ];

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-3xl mx-auto py-6 md:py-10 space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Configure Sync Job</h2>
          <p className="text-white/40 mt-1 text-sm">Set up your automation parameters below.</p>
        </div>
        <Link href="/dashboard" className="btn-ghost">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-0">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-xs font-bold text-white/40">
                {step.icon}
              </div>
              <span className="text-xs font-medium text-white/40 hidden sm:block">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-8 sm:w-16 h-px bg-white/[0.08] mx-2 sm:mx-4" />
            )}
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-8">
        
        {/* Section 1: Basic Info */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold">1</div>
            <span className="text-sm font-semibold text-white">Basic Information</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Job Name</label>
            <input 
              {...form.register("name")} 
              className="input-field" 
              placeholder="e.g. Weekly Tournament List" 
            />
            {form.formState.errors.name && <p className="text-xs text-red-400 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" /></svg>{form.formState.errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Job Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["5v5", "3v3", "onsite", "verifier"] as const).map((type) => (
                <label key={type} className={`relative flex items-center justify-center p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                  jobType === type 
                    ? 'bg-blue-500/10 border-blue-500/30 text-white shadow-lg shadow-blue-500/5' 
                    : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:bg-white/[0.06] hover:border-white/[0.12]'
                }`}>
                  <input type="radio" value={type} {...form.register("type")} className="sr-only" />
                  <span className="uppercase text-sm font-semibold">{type === "verifier" ? "Verifier" : type}</span>
                </label>
              ))}
            </div>
          </div>

          {jobType !== "verifier" && (
            <label className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] cursor-pointer hover:bg-white/[0.05] transition-all group">
              <input 
                type="checkbox" 
                id="validationEnabled"
                {...form.register("validationEnabled")} 
                className="w-5 h-5 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500/50 cursor-pointer"
              />
              <div>
                <span className="block text-sm font-medium text-white group-hover:text-white/90">Enable MLBB ID Verification</span>
                <span className="block text-xs text-white/30 mt-0.5">Verify Player ID & Zone ID against the game server</span>
              </div>
            </label>
          )}
        </div>

        <div className="h-px bg-white/[0.06]" />

        {/* Section 2: Data Sources */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 text-xs font-bold">2</div>
            <span className="text-sm font-semibold text-white">Data Sources</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Source Spreadsheet URL</label>
            <input 
              {...form.register("spreadsheetId")} 
              className="input-field font-mono !text-xs" 
              placeholder="https://docs.google.com/spreadsheets/d/..." 
            />
            {form.formState.errors.spreadsheetId && <p className="text-xs text-red-400">{form.formState.errors.spreadsheetId.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Target Sheet Name</label>
            <input 
              {...form.register("targetSpreadsheetName")} 
              className="input-field" 
              placeholder="e.g. PRL - Season 5" 
            />
            <p className="text-[10px] text-white/25 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              This file will be created in your Google Drive if it doesn&apos;t exist.
            </p>
            {form.formState.errors.targetSpreadsheetName && <p className="text-xs text-red-400">{form.formState.errors.targetSpreadsheetName.message}</p>}
          </div>
        </div>

        <div className="h-px bg-white/[0.06]" />

        {/* Section 3: Automation */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-bold">3</div>
            <span className="text-sm font-semibold text-white">Execution Mode</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className={`relative p-5 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-4 ${
              runMode === 'manual' 
                ? 'bg-sky-500/5 border-sky-500/30 shadow-lg shadow-sky-500/5' 
                : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05]'
            }`}>
              <input type="radio" value="manual" {...form.register("runMode")} className="sr-only" />
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                runMode === 'manual' ? 'border-sky-400' : 'border-white/20'
              }`}>
                {runMode === 'manual' && <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />}
              </div>
              <div>
                <span className={`block text-sm font-semibold ${runMode === 'manual' ? 'text-sky-400' : 'text-white/80'}`}>Manual Only</span>
                <span className="block text-xs text-white/30 mt-1">Run only when you click the Run button.</span>
              </div>
            </label>

            <label className={`relative p-5 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-4 ${
              runMode === 'both' 
                ? 'bg-violet-500/5 border-violet-500/30 shadow-lg shadow-violet-500/5' 
                : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05]'
            }`}>
              <input type="radio" value="both" {...form.register("runMode")} className="sr-only" />
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                runMode === 'both' ? 'border-violet-400' : 'border-white/20'
              }`}>
                {runMode === 'both' && <div className="w-2.5 h-2.5 rounded-full bg-violet-400" />}
              </div>
              <div>
                <span className={`block text-sm font-semibold ${runMode === 'both' ? 'text-violet-400' : 'text-white/80'}`}>Auto-Pilot</span>
                <span className="block text-xs text-white/30 mt-1">Runs automatically on schedule + manual.</span>
              </div>
            </label>
          </div>

          {(runMode === "both" || runMode === "scheduled") && (
            <div className="pt-2 animate-slide-up">
              <label className="text-sm font-medium text-white/80 mb-2 block">Start Date & Time *</label>
              <input 
                type="datetime-local" 
                {...form.register("startAt")} 
                required={runMode === "both" || runMode === "scheduled"}
                className="input-field" 
              />
              <p className="text-[10px] text-white/25 mt-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Auto-pilot runs at/after this time. One-time jobs run only once automatically.
              </p>
            </div>
          )}
        </div>

        {/* Hidden Fields */}
        <input type="hidden" {...form.register("sheetName")} />
        <input type="hidden" {...form.register("cronEnabled")} />

      </div>

      <div className="flex justify-end pt-2">
        <button 
          type="submit" 
          disabled={form.formState.isSubmitting}
          className="btn-primary !py-3 !px-8"
        >
          {form.formState.isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
              Creating...
            </>
          ) : (
            <>
              Create Job
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
