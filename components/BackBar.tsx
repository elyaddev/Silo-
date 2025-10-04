// components/BackBar.tsx
"use client";

import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

type BackBarProps = {
  backHref: string;
  backLabel?: string;          // default: "Back"
  actions?: Array<{ href: string; label: string; icon?: "plus" }>;
};

export default function BackBar({ backHref, backLabel = "Back", actions = [] }: BackBarProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 hover:bg-neutral-50"
      >
        <ArrowLeft size={18} />
        <span className="font-medium">{backLabel}</span>
      </Link>

      {actions.length > 0 && (
        <div className="flex items-center gap-2">
          {actions.map((a) => (
            <Link
              key={a.href + a.label}
              href={a.href}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 text-white px-3 py-1.5 hover:bg-orange-600"
            >
              {a.icon === "plus" && <Plus size={18} />}
              <span className="font-medium">{a.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
