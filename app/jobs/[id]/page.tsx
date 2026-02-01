"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { JobForm } from "@/components/JobForm";
import { SyncJobInput } from "@/lib/validations";

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [initialData, setInitialData] = useState<SyncJobInput | null>(null);
  const [loading, setLoading] = useState(true);

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
      } catch (error) {
        console.error(error);
        alert("Failed to load job");
        router.push("/");
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
      alert(error.message || "Failed to update job");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!initialData) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Sync Job</h1>
      <JobForm initialData={initialData} onSubmit={handleUpdate} />
    </div>
  );
}
