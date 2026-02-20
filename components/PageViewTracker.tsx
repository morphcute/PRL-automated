"use client";

import { useEffect } from "react";

interface PageViewTrackerProps {
  page: string;
}

export default function PageViewTracker({ page }: PageViewTrackerProps) {
  useEffect(() => {
    // Track page view
    fetch("/api/stats/views", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page }),
    }).catch((error) => {
      console.error("Failed to track page view:", error);
    });
  }, [page]);

  return null; // This component doesn't render anything
}