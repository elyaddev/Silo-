// components/DiscussionList.tsx
"use client";

import Link from "next/link";

type DiscussionRow = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
};

export default function DiscussionList({
  roomId,
  items,
}: {
  roomId: string;
  items: DiscussionRow[];
}) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-3xl border border-[#FFE0C8] bg-[#FFF6EE] p-6 text-sm text-neutral-700">
        No discussions yet. Start the first one!
      </div>
    );
  }

  return (
    <ul className="space-y-4 md:space-y-5">
      {items.map((d) => (
        <li key={d.id}>
          <Link
            href={`/rooms/${roomId}/d/${d.id}`}
            className={[
              "block rounded-3xl border bg-white shadow-sm",
              "border-[#FFE0C8] px-6 py-5 md:px-7 md:py-6",
              "text-[15px] md:text-[16px]",
              "transition-all duration-200 ease-out",
              "hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-lg",
              "hover:bg-[#FFF8F2] hover:border-[#FFCFAE]",
              "focus:outline-none focus:ring-2 focus:ring-[#FFB98A]/60",
            ].join(" ")}
          >
            <div className="flex flex-col gap-1.5">
              {/* Title now matches composer headline weight */}
              <h3 className="text-lg md:text-xl font-semibold tracking-tight text-neutral-900">
                {d.title}
              </h3>

              {d.body?.trim() ? (
                <p className="line-clamp-2 text-neutral-700">{d.body}</p>
              ) : (
                <p className="text-neutral-500">—</p>
              )}

              <div className="pt-1 text-xs md:text-[13px] text-neutral-500">
                {new Date(d.created_at).toLocaleString()}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}