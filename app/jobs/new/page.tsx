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
