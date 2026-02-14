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
    try {
      const result = await syncPreRegisteredList(job, runRecord.id);

      // Update SyncRun (success)
      await prisma.syncRun.update({
        where: { id: runRecord.id },
        data: {
          status: "success",
          progress: 100,
          completedAt: new Date(),
          rowsWritten: result.rowsWritten,
        },
      });

      // Update Job lastRunAt
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
      console.error(`Manual run for job ${job.id} failed:`, error);
      
      // Update SyncRun (failed)
      await prisma.syncRun.update({
        where: { id: runRecord.id },
        data: {
          status: "failed",
          completedAt: new Date(),
        },
      });
    }
  })();

  return NextResponse.json({ 
    success: true, 
    runId: runRecord.id,
    message: "Job started in background" 
  });
}
