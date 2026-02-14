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
    
    // if startAt exists and now < startAt -> skip
    if (job.startAt && now < job.startAt) {
      // results.push({ jobId: job.id, status: "skipped", reason: "Not started yet" });
      continue;
    }

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
        // results.push({ jobId: job.id, status: "skipped", reason: "Interval not reached" });
        continue;
      }
    }

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

      // Update Job lastRunAt
      await prisma.syncJob.update({
        where: { id: job.id },
        data: { 
          lastRunAt: now,
          // If it's a scheduled or auto-pilot job without an interval, 
          // disable cronEnabled after it runs once successfully.
          cronEnabled: !!job.intervalMinutes
        },
      });

      results.push({ jobId: job.id, status: "success", rows: result.rowsWritten });
    } catch (error: any) {
      console.error(`Job ${job.id} failed:`, error);
      
      // Update SyncRun (failed)
      await prisma.syncRun.update({
        where: { id: runRecord.id },
        data: {
          status: "failed",
          completedAt: new Date(),
          error: error.message || "Unknown error",
        },
      });
      
      results.push({ jobId: job.id, status: "failed", error: error.message });
    }
  }

  return { success: true, processed: jobs.length, results };
}
