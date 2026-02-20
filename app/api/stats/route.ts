import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 60_000;

type StatsPayload = {
  totalJobs: number;
  totalSuccessfulRuns: number;
  totalUsers: number;
  pageViews: number;
};

let statsCache: { expiresAt: number; payload: StatsPayload } | null = null;

export async function GET(_req: NextRequest) {
  try {
    const now = Date.now();
    if (statsCache && statsCache.expiresAt > now) {
      return NextResponse.json(statsCache.payload, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      });
    }

    const [totalJobs, totalSuccessfulRuns, totalUsers, pageViewResult] = await Promise.all([
      prisma.syncJob.count(),
      prisma.syncRun.count({
        where: { status: "success" },
      }),
      prisma.user.count(),
      prisma.pageView.aggregate({
        _sum: {
          count: true,
        },
      }),
    ]);

    const payload: StatsPayload = {
      totalJobs,
      totalSuccessfulRuns,
      totalUsers,
      pageViews: pageViewResult._sum.count || 0,
    };

    statsCache = {
      payload,
      expiresAt: now + CACHE_TTL_MS,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
