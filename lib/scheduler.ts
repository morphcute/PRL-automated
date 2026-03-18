import { prisma } from "@/lib/prisma";
import { syncPreRegisteredList } from "@/lib/sync";

interface RunDueJobsOptions {
  userId?: string;
}

export async function runDueJobs(options?: RunDueJobsOptions) {
  const now = new Date();

  // Build filter — scope to a single user when called from the dashboard heartbeat
  const whereClause: any = {
    isEnabled: true,
    cronEnabled: true,
    runMode: { in: ["scheduled", "both"] },
  };
  if (options?.userId) {
    whereClause.userId = options.userId;
  }

  const jobs = await prisma.syncJob.findMany({
    where: whereClause,
  });

  const results = [];

  for (const job of jobs) {
    // 2. Schedule Checks
    
    // if startAt exists and now < startAt -> skip (job hasn't started yet)
    if (job.startAt && now < job.startAt) {
      continue;
    }

    // if endAt exists and now > endAt -> set isEnabled=false and skip
    if (job.endAt && now > job.endAt) {
      await prisma.syncJob.update({
        where: { id: job.id },
        data: { isEnabled: false },
      });
      results.push({ jobId: job.id, status: "skipped", reason: "Job expired (endAt passed), disabled" });
      continue;
    }

    // intervalMinutes: if lastRunAt exists and (now-lastRunAt) < intervalMinutes -> skip
    if (job.intervalMinutes && job.lastRunAt) {
      const nextRun = new Date(job.lastRunAt.getTime() + job.intervalMinutes * 60000);
      if (now < nextRun) {
        continue;
      }
    }

    const existingRun = await prisma.syncRun.findFirst({
      where: { jobId: job.id, status: "running" },
      select: { id: true },
    });
    if (existingRun) {
      continue;
    }

    // Check if this job name has already been run successfully today
    const isOneTimeAutoPilot = !job.intervalMinutes;
    if (isOneTimeAutoPilot) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingSuccessfulRun = await prisma.syncRun.findFirst({
        where: {
          job: {
            name: job.name,
            userId: job.userId,
          },
          status: "success",
          startedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
        select: { id: true },
      });

      if (existingSuccessfulRun) {
        results.push({ jobId: job.id, status: "skipped", reason: "Job name already processed today" });
        continue;
      }
    }

    await prisma.syncJob.update({
      where: { id: job.id },
      data: { lastRunAt: now },
    });

    // 3. Run Sync for eligible jobs
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

      if (isOneTimeAutoPilot) {
        await prisma.syncJob.update({
          where: { id: job.id },
          data: { cronEnabled: false },
        });
      }

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
