import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runDueJobs } from "@/lib/scheduler";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // User-triggered checks should only evaluate that user's jobs.
    const result = await runDueJobs({ userId: session.user.id });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
