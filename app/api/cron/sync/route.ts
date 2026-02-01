import { NextRequest, NextResponse } from "next/server";
import { runDueJobs } from "@/lib/scheduler";

export async function POST(req: NextRequest) {
  // Check CRON_SECRET
  const cronSecret = req.headers.get("x-cron-secret");
  // Check against env var, fallback to a default if not set (for safety, though env should be set)
  if (cronSecret !== (process.env.CRON_SECRET || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDueJobs();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
