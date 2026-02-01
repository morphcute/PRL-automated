import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SyncJobSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { getUserAuth } from "@/lib/google";
import { google } from "googleapis";

function extractSpreadsheetId(input: string): string {
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : input;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs = await prisma.syncJob.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        runs: {
          take: 1,
          orderBy: { startedAt: "desc" },
        },
      },
    });
    return NextResponse.json(jobs);
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

    // 1. Resolve Source ID
    const sourceId = extractSpreadsheetId(validatedData.spreadsheetId);

    // 2. Resolve Target ID (Check Drive)
    const authClient = await getUserAuth(session.user.id);
    const drive = google.drive({ version: "v3", auth: authClient });
    
    const targetName = validatedData.targetSpreadsheetName;
    let targetId = "";

    // Search for existing file
    const searchRes = await drive.files.list({
      q: `name = '${targetName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
      fields: "files(id, name)",
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      targetId = searchRes.data.files[0].id!;
    } else {
      // Create new file
      const createRes = await drive.files.create({
        requestBody: {
          name: targetName,
          mimeType: "application/vnd.google-apps.spreadsheet",
        },
        fields: "id",
      });
      targetId = createRes.data.id!;
    }

    // 3. Create Job
    const job = await prisma.syncJob.create({
      data: {
        ...validatedData,
        spreadsheetId: sourceId, // Normalized ID
        targetSpreadsheetId: targetId,
        targetSpreadsheetName: targetName,
        userId: session.user.id,
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to create job:", error);
    return NextResponse.json(
      { error: "Failed to create job: " + (error.message || "") },
      { status: 500 }
    );
  }
}
