import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Get total jobs count
    const totalJobs = await prisma.syncJob.count();
    
    // Get total successful runs count
    const totalSuccessfulRuns = await prisma.syncRun.count({
      where: { status: "success" }
    });
    
    // Get total users count
    const totalUsers = await prisma.user.count();
    
    // Get total page views from all pages
    const pageViewResult = await prisma.pageView.aggregate({
      _sum: {
        count: true
      }
    });
    
    const totalPageViews = pageViewResult._sum.count || 0;

    return NextResponse.json({
      totalJobs,
      totalSuccessfulRuns,
      totalUsers,
      pageViews: totalPageViews,
    });
  } catch (error: any) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}