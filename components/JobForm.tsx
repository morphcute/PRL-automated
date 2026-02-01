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
      spreadsheetId: "",
      sheetName: "Pre Registered List",
      runMode: "manual",
      cronEnabled: false,
      isEnabled: true,
      targetSpreadsheetName: "",
    },
  });

  const runMode = form.watch("runMode");

  const handleSubmit = async (data: SyncJobInput) => {
    if (onSubmit) {
      await onSubmit(data);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-3xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="glass-card p-8 rounded-3xl border border-white/20 mb-8 bg-gradient-to-r from-blue-500/20 to-purple-500/20">
        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Create New Sync Job</h2>
        <p className="text-blue-100/80 text-lg">Follow the simple steps below to set up your automated list.</p>
      </div>

      {/* Step 1: Job Name */}
      <div className="glass-card p-8 rounded-3xl border border-white/10">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-white text-blue-900 w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-500/30">1</div>
          <h3 className="text-2xl font-semibold text-white">Name this Job</h3>
        </div>
        <div className="space-y-4">
          <label className="block text-lg font-medium text-blue-100/90">What should we call this task?</label>
          <input 
            {...form.register("name")} 
            className="w-full text-xl p-5 rounded-2xl glass-input focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-white/20" 
            placeholder="e.g. Weekly Customer List" 
          />
          {form.formState.errors.name && <span className="text-red-400 text-lg font-medium">{form.formState.errors.name.message}</span>}
        </div>
      </div>

      {/* Step 2: Source Link */}
      <div className="glass-card p-8 rounded-3xl border border-white/10">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-white text-blue-900 w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-500/30">2</div>
          <h3 className="text-2xl font-semibold text-white">Responses Sheet</h3>
        </div>
        <div className="space-y-4">
          <label className="block text-lg font-medium text-blue-100/90">Paste the Link (URL) of your Google Sheet here:</label>
          <input 
            {...form.register("spreadsheetId")} 
            className="w-full text-lg p-5 rounded-2xl glass-input font-mono text-blue-200 focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-white/20" 
            placeholder="https://docs.google.com/spreadsheets/d/..." 
          />
          <p className="text-blue-200/60 pl-2">We will read the data from this sheet.</p>
          {form.formState.errors.spreadsheetId && <span className="text-red-400 text-lg font-medium">{form.formState.errors.spreadsheetId.message}</span>}
        </div>
      </div>

      {/* Step 3: Target File */}
      <div className="glass-card p-8 rounded-3xl border border-white/10">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-white text-blue-900 w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-500/30">3</div>
          <h3 className="text-2xl font-semibold text-white">Target File</h3>
        </div>
        <div className="space-y-4">
          <label className="block text-lg font-medium text-blue-100/90">Name of the "Pre Registered List" file:</label>
          <input 
            {...form.register("targetSpreadsheetName")} 
            className="w-full text-xl p-5 rounded-2xl glass-input focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-white/20" 
            placeholder="e.g. Clean List 2024" 
          />
          <div className="bg-yellow-500/20 p-5 rounded-2xl border border-yellow-500/30 text-yellow-100 text-base">
            <strong className="text-yellow-200">Note:</strong> If this file doesn't exist in your Google Drive, we will create it for you automatically.
          </div>
          {form.formState.errors.targetSpreadsheetName && <span className="text-red-400 text-lg font-medium">{form.formState.errors.targetSpreadsheetName.message}</span>}
        </div>
      </div>

      {/* Step 4: Schedule */}
      <div className="glass-card p-8 rounded-3xl border border-white/10">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-white text-blue-900 w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-500/30">4</div>
          <h3 className="text-2xl font-semibold text-white">Scheduler (Optional)</h3>
        </div>
        
        <div className="space-y-8">
          <label className="block text-lg font-medium text-blue-100/90">Do you want this to run automatically?</label>
          
          <div className="flex gap-6">
            <label className={`flex-1 p-8 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
              runMode === 'manual' 
                ? 'border-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/20' 
                : 'border-white/10 hover:border-white/30 hover:bg-white/5'
            }`}>
              <input 
                type="radio" 
                value="manual" 
                {...form.register("runMode")} 
                className="sr-only"
              />
              <div className="text-center">
                <span className="block text-3xl font-bold mb-3 text-white">No</span>
                <span className="text-blue-200/80">I will run it manually</span>
              </div>
            </label>

            <label className={`flex-1 p-8 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
              runMode === 'both' 
                ? 'border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/20' 
                : 'border-white/10 hover:border-white/30 hover:bg-white/5'
            }`}>
              <input 
                type="radio" 
                value="both" 
                {...form.register("runMode")} 
                className="sr-only"
              />
              <div className="text-center">
                <span className="block text-3xl font-bold mb-3 text-white">Yes</span>
                <span className="text-blue-200/80">Run it automatically</span>
              </div>
            </label>
          </div>

          {(runMode === "both" || runMode === "scheduled") && (
            <div className="mt-8 p-8 bg-black/20 rounded-3xl border border-white/10 space-y-6 animate-in fade-in slide-in-from-top-4">
              <div>
                <label className="block text-lg font-medium text-blue-100 mb-3">Pick a Start Date & Time</label>
                <input 
                  type="datetime-local" 
                  {...form.register("startAt")} 
                  className="w-full text-xl p-5 rounded-2xl glass-input focus:ring-2 focus:ring-purple-500/50" 
                />
              </div>
              
              <div className="hidden">
                 <input {...form.register("intervalMinutes", { valueAsNumber: true })} value={60} />
              </div>
              <p className="text-blue-200/80">
                It will start running automatically from this date.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden Fields */}
      <div className="hidden">
        <input {...form.register("sheetName")} />
        <input {...form.register("cronEnabled")} />
      </div>

      <button 
        type="submit" 
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-2xl font-bold py-6 rounded-3xl hover:from-green-400 hover:to-emerald-500 shadow-xl shadow-green-500/30 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Saving..." : "Save & Create Job"}
      </button>

    </form>
  );
}
