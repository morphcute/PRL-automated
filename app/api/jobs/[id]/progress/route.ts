import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await props.params;
  const jobId = params.id;

  // Fetch only the latest run for this job, scoped to the user
  const job = await prisma.syncJob.findFirst({
    where: { id: jobId, userId: session.user.id },
    select: {
      id: true,
      runs: {
        orderBy: { startedAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          progress: true,
          progressMessage: true,
          completedAt: true,
          rowsWritten: true,
        },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const latestRun = job.runs[0] ?? null;

  return NextResponse.json({
    status: latestRun?.status ?? "idle",
    progress: latestRun?.progress ?? 0,
    progressMessage: latestRun?.progressMessage ?? null,
    completedAt: latestRun?.completedAt ?? null,
    rowsWritten: latestRun?.rowsWritten ?? 0,
  });
}
