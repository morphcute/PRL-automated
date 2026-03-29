"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JobForm } from "@/components/JobForm";
import { SyncJobInput } from "@/lib/validations";
import Modal from "@/components/Modal";

export default function NewJobPage() {
  const router = useRouter();
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleCreate = async (data: SyncJobInput) => {
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create job");
      }

      router.replace("/dashboard");
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Failed to create job");
      setErrorModalOpen(true);
      // Optional: Redirect back to dashboard if creation fails? 
      // Usually we want to stay on the page to fix errors, 
      // but if it's a critical error we might want to redirect.
      // The user specifically said "after Create Job too".
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
            <span className="text-yellow-400 font-bold text-sm">i</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">Instructions</h2>
        </div>
        <ul className="space-y-3 text-white/70">
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2 shrink-0" />
            <p><strong className="text-white font-semibold flex-shrink-0">Source Spreadsheet URL:</strong> The URL of the Tournament Response Sheet.</p>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2 shrink-0" />
            <p><strong className="text-white font-semibold flex-shrink-0">Target Sheet Name:</strong> The PRL Sheet Name.</p>
          </li>
        </ul>
      </div>

      <JobForm onSubmit={handleCreate} />
      
      <Modal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        title="Creation Failed"
        type="danger"
        footer={
          <button 
            onClick={() => setErrorModalOpen(false)}
            className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
          >
            Close
          </button>
        }
      >
        <p className="text-lg">{errorMessage}</p>
      </Modal>
    </div>
  );
}
