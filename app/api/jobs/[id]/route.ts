import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SyncJobSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const job = await prisma.syncJob.findUnique({
      where: { id: params.id },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("Failed to fetch job:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const existingJob = await prisma.syncJob.findUnique({
      where: { id: params.id },
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = SyncJobSchema.partial().parse(body);
    const runMode = validatedData.runMode;

    if ((runMode === "scheduled" || runMode === "both") && !validatedData.startAt) {
      return NextResponse.json(
        { error: "Start date/time is required when enabling auto-pilot mode" },
        { status: 400 }
      );
    }

    const updateData: any = { ...validatedData };

    if (validatedData.startAt) {
      const parsedStartAt = new Date(validatedData.startAt);
      if (Number.isNaN(parsedStartAt.getTime())) {
        return NextResponse.json({ error: "Invalid startAt value" }, { status: 400 });
      }
      updateData.startAt = parsedStartAt;
    }

    if (validatedData.endAt) {
      const parsedEndAt = new Date(validatedData.endAt);
      if (Number.isNaN(parsedEndAt.getTime())) {
        return NextResponse.json({ error: "Invalid endAt value" }, { status: 400 });
      }
      updateData.endAt = parsedEndAt;
    }

    const nextRunMode = validatedData.runMode ?? existingJob.runMode;
    const isAutoMode = nextRunMode === "scheduled" || nextRunMode === "both";
    const switchedManualToAuto = existingJob.runMode === "manual" && isAutoMode;

    const nextStartAt =
      Object.prototype.hasOwnProperty.call(validatedData, "startAt")
        ? (updateData.startAt ?? null)
        : existingJob.startAt;
    const nextIntervalMinutes =
      Object.prototype.hasOwnProperty.call(validatedData, "intervalMinutes")
        ? (validatedData.intervalMinutes ?? null)
        : existingJob.intervalMinutes;
    const isOneTimeAutoPilot = isAutoMode && !nextIntervalMinutes;

    const previousStartAtIso = existingJob.startAt ? new Date(existingJob.startAt).toISOString() : null;
    const nextStartAtIso = nextStartAt ? new Date(nextStartAt).toISOString() : null;
    const rescheduledStartAt = previousStartAtIso !== nextStartAtIso;

    // Reset run context so dashboard shows pending for new auto schedule.
    if (switchedManualToAuto || (isOneTimeAutoPilot && rescheduledStartAt)) {
      updateData.lastRunAt = null;
      updateData.cronEnabled = true;
    }

    const job = await prisma.syncJob.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(job);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to update job:", error);
    return NextResponse.json(
      { error: "Failed to update job" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    await prisma.syncJob.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete job:", error);
    return NextResponse.json(
      { error: "Failed to delete job" },
      { status: 500 }
    );
  }
}
