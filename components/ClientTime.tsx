"use client";

/**
 * Relative "time ago" formatter.
 * Rules:
 *  - < 1 minute: "just now"
 *  - < 60 minutes: "N min ago"
 *  - < 24 hours: "N hours ago"
 *  - < 7 days: "N days ago"
 *  - < 4 weeks: "N weeks ago"
 *  - < 12 months: "N months ago"
 *  - otherwise: "N years ago"
 *
 * Also avoids hydration mismatch by running on the client and re-ticking every 60s.
 */
import { useEffect, useMemo, useState } from "react";

function formatAgo(iso: string, nowMs: number): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";

  let diff = Math.floor((nowMs - ts) / 1000); // seconds diff
  if (diff < 0) diff = 0; // future → treat as "just now"

  if (diff < 60) return "just now";

  const m = Math.floor(diff / 60);
  if (m < 60) return `${m} min${m === 1 ? "" : "s"} ago`;

  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;

  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;

  const w = Math.floor(d / 7);
  if (w < 4) return `${w} week${w === 1 ? "" : "s"} ago`;

  // Approx months/years by weeks to match your rule set
  const months = Math.floor(w / 4); // 4 weeks ~ 1 month
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;

  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export default function ClientTime({ iso }: { iso: string }) {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000); // tick every minute
    return () => clearInterval(id);
  }, []);

  const label = useMemo(() => formatAgo(iso, now), [iso, now]);

  return (
    <time suppressHydrationWarning dateTime={iso} title={new Date(iso).toLocaleString()}>
      {label}
    </time>
  );
}
