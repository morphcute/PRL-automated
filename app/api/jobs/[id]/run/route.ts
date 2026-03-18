import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncPreRegisteredList } from "@/lib/sync";

export const maxDuration = 300; // Allows Vercel Pro up to 300s, Hobby up to 60s


function getSyncErrorMessage(error: any): string {
  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message;
  }
  const apiMessage = error?.response?.data?.error?.message;
  if (typeof apiMessage === "string" && apiMessage.trim()) {
    return apiMessage;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return "Sync failed";
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const jobId = params.id;
  
  const job = await prisma.syncJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Manual run: Always run sync regardless of runMode (manual/scheduled/both)
  
  const now = new Date();
  
  // Create SyncRun record
  const runRecord = await prisma.syncRun.create({
    data: {
      jobId: job.id,
      status: "running",
      progress: 0,
      startedAt: now,
    },
  });

  // Run explicitly with await so Vercel keeps the function alive up to maxDuration
  try {
    const result = await syncPreRegisteredList(job, runRecord.id);
    
    // Mark successful sync
    await prisma.syncRun.update({
      where: { id: runRecord.id },
      data: {
        status: "success",
        progress: 100,
        completedAt: new Date(),
        rowsWritten: result.rowsWritten,
      },
    });

    await prisma.syncJob.update({
      where: { id: job.id },
      data: { 
        lastRunAt: now,
        cronEnabled: !!job.intervalMinutes
      },
    });
  } catch (error: any) {
    console.error(`Manual run for job ${job.id} failed during sync:`, error);
    const errorMessage = getSyncErrorMessage(error);
    
    await prisma.syncRun.update({
      where: { id: runRecord.id },
      data: {
        completedAt: new Date(),
        status: "failed",
        progressMessage: errorMessage,
      },
    });
  }

  return NextResponse.json({ 
    success: true, 
    runId: runRecord.id,
    message: "Job started in background" 
  });
}
