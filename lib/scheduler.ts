import { prisma } from "@/lib/prisma";
import { syncPreRegisteredList } from "@/lib/sync";

export async function runDueJobs() {
  const now = new Date();

  // 1. Query candidate jobs
  // Query jobs with:
  // isEnabled = true
  // AND (runMode == "scheduled" OR runMode == "both")
  // AND cronEnabled == true
  const jobs = await prisma.syncJob.findMany({
    where: {
      isEnabled: true,
      cronEnabled: true,
      runMode: { in: ["scheduled", "both"] },
    },
  });

  const results = [];

  for (const job of jobs) {
    // 2. Schedule Checks
    
    // if startAt exists and now < startAt -> skip (job hasn't started yet)
    // Allow jobs to run even if they missed their exact start time by up to 24 hours
    if (job.startAt && now < job.startAt) {
      continue;
    }
    
    // If startAt is more than 24 hours in the past, consider it as "missed but still runnable"
    // This handles the case where a job was scheduled for 12:31 AM but now it's 12:34 AM (or later)

    // if endAt exists and now > endAt -> set isEnabled=false and skip
    if (job.endAt && now > job.endAt) {
      // Disable the job
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
    // This ensures auto-pilot runs once per job name, not per job ID
    const isOneTimeAutoPilot = !job.intervalMinutes;
    if (isOneTimeAutoPilot) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingSuccessfulRun = await prisma.syncRun.findFirst({
        where: {
          job: {
            name: job.name, // Same job name
            userId: job.userId, // Same user
          },
          status: "success",
          startedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (existingSuccessfulRun) {
        // Skip this job but don't disable it - another job with the same name already ran successfully today
        results.push({ jobId: job.id, status: "skipped", reason: "Job name already processed today" });
        continue;
      }
    }

    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        lastRunAt: now,
        // Only disable cron if this specific job ran successfully
        // Don't disable based on job name - let other jobs with same name try to run
      },
    });

    // 3. Run Sync for eligible jobs
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

      // Only disable this specific job after successful completion
      if (isOneTimeAutoPilot) {
        await prisma.syncJob.update({
          where: { id: job.id },
          data: { cronEnabled: false },
        });
      }

      results.push({ jobId: job.id, status: "success", rows: result.rowsWritten });
    } catch (error: any) {
      console.error(`Job ${job.id} failed:`, error);
      
      // Update SyncRun (failed)
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
