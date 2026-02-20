import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_PAGES = new Set(["home", "dashboard", "jobs", "job-new", "job-edit", "login", "privacy", "terms", "other"]);
const BOT_UA_PATTERN = /bot|crawler|spider|headless|slurp|bingpreview|facebookexternalhit|whatsapp|pingdom|uptimerobot/i;

export async function POST(req: NextRequest) {
  try {
    const userAgent = req.headers.get("user-agent") || "";
    if (BOT_UA_PATTERN.test(userAgent)) {
      return NextResponse.json({ success: true, ignored: "bot" });
    }

    const body = await req.json().catch(() => ({} as { page?: unknown }));
    const rawPage = typeof body.page === "string" ? body.page.trim().toLowerCase() : "home";
    const pageName = ALLOWED_PAGES.has(rawPage) ? rawPage : "other";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    await prisma.pageView.upsert({
      where: {
        page_date: {
          page: pageName,
          date: today,
        },
      },
      update: {
        count: {
          increment: 1,
        },
      },
      create: {
        page: pageName,
        date: today,
        count: 1,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to track page view:", error);
    return NextResponse.json(
      { error: "Failed to track page view" },
      { status: 500 }
    );
  }
}
