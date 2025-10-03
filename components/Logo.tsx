"use client";

import Link from "next/link";

/**
 * Slightly larger brand "S" (orange) with gentle overall letter-spacing.
 * We use a small positive letterSpacing so the word reads cleaner at larger sizes.
 */
export default function Logo({ className = "" }: { className?: string }) {
  const root =
    ["inline-flex items-baseline leading-none select-none", className]
      .filter(Boolean)
      .join(" ");

  return (
    <Link
      href="/"
      aria-label="Silo home"
      className={root}
      style={{ letterSpacing: "0.02em" }}   // ← a touch more space between letters
    >
      <span
        className="
          text-[var(--color-brand)]
          font-extrabold
          text-2xl md:text-3xl
        "
      >
        S
      </span>
      <span
        className="
          text-neutral-900
          font-semibold
          text-xl md:text-2xl
        "
      >
        ilo
      </span>
    </Link>
  );
}
