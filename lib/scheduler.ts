import { prisma } from "@/lib/prisma";
import { syncPreRegisteredList } from "@/lib/sync";

type RunDueJobsOptions = {
  userId?: string;
};

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

    // One-time auto jobs should run only once automatically.
    if (isOneTimeAutoPilot && job.lastRunAt) {
      if (job.cronEnabled) {
        await prisma.syncJob.update({
          where: { id: job.id },
          data: { cronEnabled: false },
        });
      }
      results.push({ jobId: job.id, status: "skipped", reason: "One-time job already attempted" });
      continue;
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

    try {
      const result = await syncPreRegisteredList(job);

      await prisma.syncRun.update({
        where: { id: runRecord.id },
        data: {
          status: "success",
          completedAt: new Date(),
          rowsWritten: result.rowsWritten,
        },
      });

      results.push({ jobId: job.id, status: "success", rows: result.rowsWritten });
    } catch (error: any) {
      console.error(`Job ${job.id} failed:`, error);

      await prisma.syncRun.update({
        where: { id: runRecord.id },
        data: {
          status: "failed",
          completedAt: new Date(),
        },
      });
      
      results.push({ jobId: job.id, status: "failed", error: error.message });
    }
  }

  return { success: true, processed: jobs.length, results };
}
