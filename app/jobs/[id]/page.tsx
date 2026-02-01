"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { JobForm } from "@/components/JobForm";
import { SyncJobInput } from "@/lib/validations";
import Modal from "@/components/Modal";

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [initialData, setInitialData] = useState<SyncJobInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/jobs/${id}`);
        if (!res.ok) throw new Error("Failed to fetch job");
        const data = await res.json();
        
        // Format dates for the form
        if (data.startAt) data.startAt = new Date(data.startAt).toISOString().slice(0, 16);
        if (data.endAt) data.endAt = new Date(data.endAt).toISOString().slice(0, 16);
        
        setInitialData(data);
      } catch (error: any) {
        console.error(error);
        setErrorMessage(error.message || "Failed to load job");
        setErrorModalOpen(true);
        // Delay redirect to let user see error
        setTimeout(() => router.push("/"), 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id, router]);

  const handleUpdate = async (data: SyncJobInput) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update job");
      }
      
      router.push("/");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Failed to update job");
      setErrorModalOpen(true);
    }
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      <div className="text-xl font-medium text-white/50 animate-pulse">Loading Job Details...</div>
    </div>
  );
  
  if (!initialData) return null;

  return (
    <div className="w-full">
      <JobForm initialData={initialData} onSubmit={handleUpdate} />

      <Modal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        title="Error"
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
