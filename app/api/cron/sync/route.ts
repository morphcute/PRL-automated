import { NextRequest, NextResponse } from "next/server";
import { runDueJobs } from "@/lib/scheduler";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  // Check CRON_SECRET
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== (process.env.CRON_SECRET || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDueJobs();

    // Cleanup: delete SyncRun records older than 7 days to prevent unbounded growth
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      await prisma.syncRun.deleteMany({
        where: { startedAt: { lt: cutoff } },
      });
    } catch (cleanupError) {
      console.error("SyncRun cleanup failed (non-fatal):", cleanupError);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
