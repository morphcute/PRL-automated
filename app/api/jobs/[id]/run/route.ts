import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncPreRegisteredList } from "@/lib/sync";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
      startedAt: now,
    },
  });

  try {
    const result = await syncPreRegisteredList(job);

    // Update SyncRun (success)
    await prisma.syncRun.update({
      where: { id: runRecord.id },
      data: {
        status: "success",
        completedAt: new Date(),
        rowsWritten: result.rowsWritten,
      },
    });

    // Update Job lastRunAt
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { lastRunAt: now },
    });

    return NextResponse.json({ rowsWritten: result.rowsWritten });
  } catch (error: any) {
    console.error(`Manual run for job ${job.id} failed:`, error);
    
    // Update SyncRun (failed)
    await prisma.syncRun.update({
      where: { id: runRecord.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        error: error.message || "Unknown error",
      },
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
