import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { page } = await req.json();
    
    // Track page view (simple implementation)
    // In a real app, you'd want to use a proper analytics service
    await prisma.$executeRaw`
      INSERT INTO page_views (page, date, count) 
      VALUES (${page || 'home'}, CURRENT_DATE, 1) 
      ON CONFLICT (page, date) 
      DO UPDATE SET count = page_views.count + 1
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to track page view:", error);
    return NextResponse.json(
      { error: "Failed to track page view" },
      { status: 500 }
    );
  }
}