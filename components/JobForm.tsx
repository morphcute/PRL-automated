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
    <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-3xl mx-auto py-10 space-y-8">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Configure Sync Job</h2>
          <p className="text-muted-foreground mt-1">Set up your automation parameters below.</p>
        </div>
        <Link 
          href="/"
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors border border-white/10"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="glass-panel rounded-xl p-8 space-y-8">
        
        {/* Section 1: Basic Info */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Job Name</label>
            <input 
              {...form.register("name")} 
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all" 
              placeholder="e.g. Weekly Tournament List" 
            />
            {form.formState.errors.name && <p className="text-xs text-red-400">{form.formState.errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Job Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["5v5", "3v3", "onsite", "verifier"] as const).map((type) => (
                <label key={type} className={`relative flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                  jobType === type 
                    ? 'bg-primary/20 border-primary text-white font-medium' 
                    : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                }`}>
                  <input 
                    type="radio" 
                    value={type} 
                    {...form.register("type")} 
                    className="sr-only"
                  />
                  <span className="uppercase text-sm">{type === "verifier" ? "Verifier" : type}</span>
                </label>
              ))}
            </div>
          </div>

          {jobType !== "verifier" && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
              <input 
                type="checkbox" 
                id="validationEnabled"
                {...form.register("validationEnabled")} 
                className="w-5 h-5 rounded border-white/20 bg-white/10 text-primary focus:ring-primary/50"
              />
              <label htmlFor="validationEnabled" className="cursor-pointer">
                <span className="block text-sm font-medium text-white">Enable MLBB ID Verification</span>
                <span className="block text-xs text-muted-foreground">Verify Player ID & Zone ID</span>
              </label>
            </div>
          )}
        </div>

        <div className="h-px bg-white/10" />

        {/* Section 2: Data Sources */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Source Spreadsheet URL</label>
            <input 
              {...form.register("spreadsheetId")} 
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white font-mono text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all" 
              placeholder="https://docs.google.com/spreadsheets/d/..." 
            />
            {form.formState.errors.spreadsheetId && <p className="text-xs text-red-400">{form.formState.errors.spreadsheetId.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Target Sheet Name</label>
            <input 
              {...form.register("targetSpreadsheetName")} 
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all" 
              placeholder="e.g. PRL - Season 5" 
            />
            <p className="text-xs text-muted-foreground">This file will be created in your Google Drive if it doesn't exist.</p>
            {form.formState.errors.targetSpreadsheetName && <p className="text-xs text-red-400">{form.formState.errors.targetSpreadsheetName.message}</p>}
          </div>
        </div>

        <div className="h-px bg-white/10" />

        {/* Section 3: Automation */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-white">Execution Mode</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className={`relative p-4 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
              runMode === 'manual' 
                ? 'bg-blue-500/10 border-blue-500/50' 
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}>
              <input 
                type="radio" 
                value="manual" 
                {...form.register("runMode")} 
                className="sr-only"
              />
              <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${runMode === 'manual' ? 'border-blue-500' : 'border-muted-foreground'}`}>
                {runMode === 'manual' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
              </div>
              <div>
                <span className={`block text-sm font-medium ${runMode === 'manual' ? 'text-blue-400' : 'text-white'}`}>Manual Only</span>
                <span className="block text-xs text-muted-foreground mt-1">Run only when triggered manually.</span>
              </div>
            </label>

            <label className={`relative p-4 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
              runMode === 'both' 
                ? 'bg-purple-500/10 border-purple-500/50' 
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}>
              <input 
                type="radio" 
                value="both" 
                {...form.register("runMode")} 
                className="sr-only"
              />
              <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${runMode === 'both' ? 'border-purple-500' : 'border-muted-foreground'}`}>
                {runMode === 'both' && <div className="w-2 h-2 rounded-full bg-purple-500" />}
              </div>
              <div>
                <span className={`block text-sm font-medium ${runMode === 'both' ? 'text-purple-400' : 'text-white'}`}>Auto-Pilot</span>
                <span className="block text-xs text-muted-foreground mt-1">Run automatically + Manual option.</span>
              </div>
            </label>
          </div>

          {(runMode === "both" || runMode === "scheduled") && (
            <div className="pt-4 animate-in fade-in slide-in-from-top-2">
              <label className="text-sm font-medium text-white mb-2 block">Start Date & Time</label>
              <input 
                type="datetime-local" 
                {...form.register("startAt")} 
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500/50 outline-none" 
              />
            </div>
          )}
        </div>

        {/* Hidden Fields */}
        <input type="hidden" {...form.register("sheetName")} />
        <input type="hidden" {...form.register("cronEnabled")} />

      </div>

      <div className="flex justify-end pt-4">
        <button 
          type="submit" 
          disabled={form.formState.isSubmitting}
          className="bg-primary hover:bg-blue-600 text-white font-medium py-2.5 px-8 rounded-lg shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {form.formState.isSubmitting ? (
             <>
               <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               Creating...
             </>
          ) : (
            "Create Job"
          )}
        </button>
      </div>

    </form>
  );
}
