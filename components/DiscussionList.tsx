"use client";
import Link from "next/link";
import ClientTime from "@/components/ClientTime";

export default function DiscussionList({
  roomId,
  items,
}: {
  roomId: string;
  items: any[];
}) {
  if (!items?.length)
    return <p className="text-slate-500">No discussions yet — be first!</p>;

  return (
    <div className="grid gap-3">
      {items.map((d) => (
        <Link
          key={d.id}
          href={`/rooms/${roomId}/d/${d.id}`}
          className="block rounded-2xl border border-orange-100 bg-white p-4 hover:shadow-[0_4px_14px_rgba(255,122,0,0.08)] hover:-translate-y-[1px] transition"
        >
          <h3 className="text-[17px] font-semibold text-[var(--color-text)]">
            {d.title}
          </h3>
          {d.body && <p className="text-sm text-slate-600 mt-1">{d.body}</p>}
          <div className="mt-2 text-xs text-slate-400">
            <ClientTime iso={d.created_at} />
          </div>
        </Link>
      ))}
    </div>
  );
}
