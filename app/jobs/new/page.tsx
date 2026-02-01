"use client";

import { useRouter } from "next/navigation";
import { JobForm } from "@/components/JobForm";
import { SyncJobInput } from "@/lib/validations";

export default function NewJobPage() {
  const router = useRouter();

  const handleCreate = async (data: SyncJobInput) => {
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to create job");
      
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to create job");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Sync Job</h1>
      <JobForm onSubmit={handleCreate} />
    </div>
  );
}
