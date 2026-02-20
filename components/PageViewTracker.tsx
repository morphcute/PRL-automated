"use client";

import { useEffect } from "react";

interface PageViewTrackerProps {
  page: string;
}

export default function PageViewTracker({ page }: PageViewTrackerProps) {
  useEffect(() => {
    const dateKey = new Date().toISOString().slice(0, 10);
    const storageKey = `pv:${page}:${dateKey}`;

    try {
      if (window.localStorage.getItem(storageKey)) {
        return;
      }
    } catch {
      // Ignore storage read failures and continue with best effort tracking.
    }

    fetch("/api/stats/views", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page }),
      keepalive: true,
    })
      .then(() => {
        try {
          window.localStorage.setItem(storageKey, "1");
        } catch {
          // Ignore storage write failures.
        }
      })
      .catch((error) => {
        console.error("Failed to track page view:", error);
      });
  }, [page]);

  return null; // This component doesn't render anything
}
