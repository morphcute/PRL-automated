import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SyncJobSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { getUserAuth } from "@/lib/google";
import { google } from "googleapis";
import { drive_v3 } from "googleapis";

function extractSpreadsheetId(input: string): string {
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : input;
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function normalizeSpreadsheetName(name: string): string {
  return name.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

async function isUsableSpreadsheetFile(drive: drive_v3.Drive, fileId: string): Promise<boolean> {
  try {
    const file = await drive.files.get({
      fileId,
      fields: "id,trashed,mimeType",
      supportsAllDrives: true,
    });

    return (
      Boolean(file.data.id) &&
      !file.data.trashed &&
      file.data.mimeType === "application/vnd.google-apps.spreadsheet"
    );
  } catch {
    return false;
  }
}

async function findSpreadsheetIdByName(
  drive: drive_v3.Drive,
  targetName: string
): Promise<string | null> {
  const normalizedTarget = normalizeSpreadsheetName(targetName);
  const escapedName = escapeDriveQueryValue(targetName);

  const baseParams: drive_v3.Params$Resource$Files$List = {
    fields: "files(id,name,modifiedTime,trashed,mimeType)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    pageSize: 100,
    orderBy: "modifiedTime desc",
  };

  const queries = [
    `name = '${escapedName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
    `name contains '${escapedName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
    `mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
  ];

  for (const q of queries) {
    const res = await drive.files.list({
      ...baseParams,
      q,
    });

    const files = res.data.files || [];
    const exactMatch = files.find((file) => {
      const fileName = file.name || "";
      return normalizeSpreadsheetName(fileName) === normalizedTarget;
    });

    if (exactMatch?.id) {
      return exactMatch.id;
    }
  }

  return null;
}

function isDrivePermissionError(error: any): boolean {
  const status = error?.response?.status || error?.code;
  const reason =
    error?.response?.data?.error?.errors?.[0]?.reason ||
    error?.response?.data?.error?.status ||
    "";

  return status === 403 || /insufficient|forbidden|permission/i.test(String(reason));
}

function isInvalidGrantError(error: any): boolean {
  const message = error?.message || "";
  const oauthError = error?.response?.data?.error || "";
  return /invalid_grant/i.test(String(message)) || /invalid_grant/i.test(String(oauthError));
}

// ─── Per-user job cache (10s TTL) ───
// With 100 users polling every 15s, this reduces DB queries from ~400/min to ~10/min.
// Each user's first request in a 10-second window hits the DB; subsequent ones are served from memory.
const JOB_CACHE_TTL_MS = 10_000;
const jobCache = new Map<string, { expiresAt: number; data: any }>();

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Check cache first
  const cached = jobCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "private, s-maxage=10, stale-while-revalidate=30" },
    });
  }

  try {
    const jobs = await prisma.syncJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        validationEnabled: true,
        spreadsheetId: true,
        targetSpreadsheetName: true,
        targetSpreadsheetId: true,
        sheetName: true,
        isEnabled: true,
        runMode: true,
        cronEnabled: true,
        lastRunAt: true,
        createdAt: true,
        updatedAt: true,
        intervalMinutes: true,
        startAt: true,
        endAt: true,
        userId: true,
        runs: {
          take: 1,
          orderBy: { startedAt: "desc" },
          select: {
            id: true,
            status: true,
            progress: true,
            progressMessage: true,
            rowsWritten: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    // Store in cache
    jobCache.set(userId, { data: jobs, expiresAt: Date.now() + JOB_CACHE_TTL_MS });

    // Cleanup stale cache entries periodically (prevent memory leak with many users)
    if (jobCache.size > 200) {
      const now = Date.now();
      for (const [key, val] of jobCache) {
        if (val.expiresAt < now) jobCache.delete(key);
      }
    }

    return NextResponse.json(jobs, {
      headers: { "Cache-Control": "private, s-maxage=10, stale-while-revalidate=30" },
    });
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = SyncJobSchema.parse(body);
    const isAutoMode = validatedData.runMode === "scheduled" || validatedData.runMode === "both";

    if (isAutoMode && !validatedData.startAt) {
      return NextResponse.json(
        { error: "Start date/time is required for auto-pilot jobs" },
        { status: 400 }
      );
    }

    const parsedStartAt = validatedData.startAt ? new Date(validatedData.startAt) : null;
    const parsedEndAt = validatedData.endAt ? new Date(validatedData.endAt) : null;

    if (parsedStartAt && Number.isNaN(parsedStartAt.getTime())) {
      return NextResponse.json({ error: "Invalid startAt value" }, { status: 400 });
    }

    if (parsedEndAt && Number.isNaN(parsedEndAt.getTime())) {
      return NextResponse.json({ error: "Invalid endAt value" }, { status: 400 });
    }

    const normalizedJobName = validatedData.name.trim();
    const normalizedTargetName = validatedData.targetSpreadsheetName.trim();

    if (!normalizedJobName) {
      return NextResponse.json({ error: "Job name is required" }, { status: 400 });
    }

    if (!normalizedTargetName) {
      return NextResponse.json({ error: "Target sheet name is required" }, { status: 400 });
    }

    // 1. Resolve Source ID
    const sourceId = extractSpreadsheetId(validatedData.spreadsheetId);

    // If a job with same target sheet name or same job name already exists
    // for this user, update it instead of creating a duplicate job.
    // Prioritize target sheet name match so we always push to the intended file.
    const existingByTarget = await prisma.syncJob.findFirst({
      where: {
        userId: session.user.id,
        targetSpreadsheetName: normalizedTargetName,
      },
      orderBy: { createdAt: "desc" },
    });

    const existingJob =
      existingByTarget ||
      (await prisma.syncJob.findFirst({
        where: {
          userId: session.user.id,
          name: normalizedJobName,
        },
        orderBy: { createdAt: "desc" },
      }));

    // 2. Resolve Target ID (Check Drive)
    const authClient = await getUserAuth(session.user.id);
    const drive = google.drive({ version: "v3", auth: authClient });
    
    const targetName = normalizedTargetName;
    let targetId = "";
    const isUpdatingExistingTarget = existingJob?.targetSpreadsheetName === targetName;

    // Reuse the existing job's target ID when matching target name.
    if (existingJob?.targetSpreadsheetName === targetName && existingJob.targetSpreadsheetId) {
      const fileStillExists = await isUsableSpreadsheetFile(drive, existingJob.targetSpreadsheetId);
      if (fileStillExists) {
        targetId = existingJob.targetSpreadsheetId;
      }
    }

    if (!targetId) {
      targetId = await findSpreadsheetIdByName(drive, targetName) || "";
    }

    if (!targetId) {
      // Prevent accidental duplicate creation when replacing a deleted file for
      // an existing job with the same target name. User likely needs re-consent
      // so manually created files are visible to the app.
      if (isUpdatingExistingTarget) {
        return NextResponse.json(
          {
            error:
              "Could not find an accessible existing spreadsheet with that name. Please sign out, sign in again, and retry so the app can detect manually created sheets.",
          },
          { status: 409 }
        );
      }

      // Create new file only when this is a genuinely new target name.
      const createRes = await drive.files.create({
        requestBody: {
          name: targetName,
          mimeType: "application/vnd.google-apps.spreadsheet",
        },
        fields: "id",
      });
      targetId = createRes.data.id!;
    }

    // 3. Create/Update Job
    const jobData: any = {
      ...validatedData,
      name: normalizedJobName,
      spreadsheetId: sourceId, // Normalized ID
      targetSpreadsheetId: targetId,
      targetSpreadsheetName: targetName,
      userId: session.user.id,
      startAt: parsedStartAt,
      endAt: parsedEndAt,
    };

    if (existingJob) {
      const switchedManualToAuto =
        existingJob.runMode === "manual" &&
        (validatedData.runMode === "scheduled" || validatedData.runMode === "both");
      const isOneTimeAutoPilot = isAutoMode && !validatedData.intervalMinutes;
      const existingStartAtIso = existingJob.startAt ? new Date(existingJob.startAt).toISOString() : null;
      const nextStartAtIso = parsedStartAt ? parsedStartAt.toISOString() : null;

      // Re-enable one-time auto jobs when user reschedules or switches from manual mode.
      if (
        switchedManualToAuto ||
        (
          isOneTimeAutoPilot &&
          (
            existingJob.cronEnabled === false ||
            existingStartAtIso !== nextStartAtIso
          )
        )
      ) {
        jobData.lastRunAt = null;
        jobData.cronEnabled = true;
      }

      const job = await prisma.syncJob.update({
        where: { id: existingJob.id },
        data: jobData,
      });
      return NextResponse.json({ ...job, reusedExistingJob: true });
    }

    const job = await prisma.syncJob.create({
      data: jobData,
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    if (isInvalidGrantError(error)) {
      return NextResponse.json(
        {
          error:
            "Google authorization expired or revoked. Please sign out, sign in again, and grant Google Drive access.",
        },
        { status: 401 }
      );
    }

    if (isDrivePermissionError(error)) {
      return NextResponse.json(
        {
          error:
            "Google Drive permissions changed. Please sign out, sign in again, and grant Drive access so manual spreadsheets can be detected.",
        },
        { status: 403 }
      );
    }

    console.error("Failed to create job:", error);
    return NextResponse.json(
      { error: "Failed to create job: " + (error.message || "") },
      { status: 500 }
    );
  }
}
