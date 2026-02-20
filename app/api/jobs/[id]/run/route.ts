import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncPreRegisteredList } from "@/lib/sync";

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

  // Run in background (do not await)
  (async () => {
    let result: { rowsWritten: number; success: boolean } | null = null;

    try {
      result = await syncPreRegisteredList(job, runRecord.id);
    } catch (error: any) {
      console.error(`Manual run for job ${job.id} failed during sync:`, error);
      
      // Sync itself failed, mark run as failed.
      await prisma.syncRun.update({
        where: { id: runRecord.id },
        data: {
          completedAt: new Date(),
          status: "failed",
          progressMessage: error?.message || "Sync failed",
        },
      });
      return;
    }

    // Mark successful sync first; post-run metadata updates should not flip status to failed.
    try {
      await prisma.syncRun.update({
        where: { id: runRecord.id },
        data: {
          status: "success",
          progress: 100,
          completedAt: new Date(),
          rowsWritten: result.rowsWritten,
        },
      });
    } catch (error: any) {
      console.error(`Manual run for job ${job.id} completed but failed to update run status:`, error);
    }

    try {
      await prisma.syncJob.update({
        where: { id: job.id },
        data: { 
          lastRunAt: now,
          // If the user runs it manually, also disable the automatic schedule 
          // if it's a one-time job (no interval)
          cronEnabled: !!job.intervalMinutes
        },
      });
    } catch (error: any) {
      console.error(`Manual run for job ${job.id} completed but failed to update job metadata:`, error);
    }
  })();

  return NextResponse.json({ 
    success: true, 
    runId: runRecord.id,
    message: "Job started in background" 
  });
}
