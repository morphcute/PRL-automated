import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { page } = await req.json();
    const pageName = page || 'home';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Track page view using Prisma upsert
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