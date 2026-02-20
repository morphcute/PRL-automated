import { prisma } from "@/lib/prisma";
import { syncPreRegisteredList } from "@/lib/sync";

type RunDueJobsOptions = {
  userId?: string;
};

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

export async function runDueJobs(options: RunDueJobsOptions = {}) {
  const now = new Date();

  const jobs = await prisma.syncJob.findMany({
    where: {
      isEnabled: true,
      cronEnabled: true,
      runMode: { in: ["scheduled", "both"] },
      ...(options.userId ? { userId: options.userId } : {}),
    },
  });

  if (jobs.length === 0) {
    return { success: true, processed: 0, results: [] };
  }

  const results: any[] = [];

  for (const job of jobs) {
    if (!job.startAt) {
      await prisma.syncJob.update({
        where: { id: job.id },
        data: { cronEnabled: false },
      });
      results.push({ jobId: job.id, status: "skipped", reason: "Auto-pilot disabled: missing startAt" });
      continue;
    }

    // Skip if the job hasn't reached its start time yet.
    if (job.startAt && now < job.startAt) {
      continue;
    }

    // Disable expired jobs once and skip them.
    if (job.endAt && now > job.endAt) {
      await prisma.syncJob.update({
        where: { id: job.id },
        data: { isEnabled: false, cronEnabled: false },
      });
      results.push({ jobId: job.id, status: "skipped", reason: "Job expired (endAt passed), disabled" });
      continue;
    }

    const isOneTimeAutoPilot = !job.intervalMinutes;

    // One-time auto jobs should run once per configured schedule window.
    // If startAt was moved forward after a previous run, allow one more run.
    if (isOneTimeAutoPilot && job.lastRunAt) {
      const hasRunForCurrentSchedule = !job.startAt || job.lastRunAt >= job.startAt;
      if (hasRunForCurrentSchedule && job.cronEnabled) {
        await prisma.syncJob.update({
          where: { id: job.id },
          data: { cronEnabled: false },
        });
      }

      if (hasRunForCurrentSchedule) {
        results.push({ jobId: job.id, status: "skipped", reason: "One-time job already attempted" });
        continue;
      }
    }

    // For recurring jobs, skip if interval has not elapsed yet.
    if (!isOneTimeAutoPilot && job.intervalMinutes && job.lastRunAt) {
      const nextRun = new Date(job.lastRunAt.getTime() + job.intervalMinutes * 60000);
      if (now < nextRun) {
        continue;
      }
    }

    // Re-check running status just before launch to avoid overlap.
    const existingRun = await prisma.syncRun.findFirst({
      where: { jobId: job.id, status: "running" },
      select: { id: true },
    });
    if (existingRun) {
      continue;
    }

    // Claim this execution slot. If another scheduler call already claimed it,
    // skip this job to prevent duplicate runs.
    const claim = await prisma.syncJob.updateMany({
      where: {
        id: job.id,
        lastRunAt: job.lastRunAt,
        ...(isOneTimeAutoPilot ? { cronEnabled: true } : {}),
      },
      data: {
        lastRunAt: now,
        ...(isOneTimeAutoPilot ? { cronEnabled: false } : {}),
      },
    });

    if (claim.count === 0) {
      continue;
    }

    const runRecord = await prisma.syncRun.create({
      data: {
        jobId: job.id,
        status: "running",
        startedAt: now,
      },
    });

    let result: { rowsWritten: number; success: boolean } | null = null;

    try {
      result = await syncPreRegisteredList(job);
    } catch (error: any) {
      console.error(`Job ${job.id} failed during sync:`, error);
      const errorMessage = getSyncErrorMessage(error);

      await prisma.syncRun.update({
        where: { id: runRecord.id },
        data: {
          status: "failed",
          completedAt: new Date(),
          progressMessage: errorMessage,
        },
      });

      results.push({ jobId: job.id, status: "failed", error: errorMessage });
      continue;
    }

    try {
      await prisma.syncRun.update({
        where: { id: runRecord.id },
        data: {
          status: "success",
          completedAt: new Date(),
          rowsWritten: result.rowsWritten,
        },
      });
    } catch (error: any) {
      console.error(`Job ${job.id} completed but failed to update run status:`, error);
    }

    results.push({ jobId: job.id, status: "success", rows: result.rowsWritten });
  }

  return { success: true, processed: jobs.length, results };
}
