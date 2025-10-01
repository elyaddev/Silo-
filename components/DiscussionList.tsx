"use client";
import Link from "next/link";

type Discussion = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
};

export default function DiscussionList({ roomId, items }: { roomId: string; items: Discussion[] }) {
  if (!items.length) return <p className="text-gray-500">No discussions yet — start one!</p>;
  return (
    <div className="space-y-3">
      {items.map((d) => (
        <Link
          key={d.id}
          href={`/rooms/${roomId}/d/${d.id}`}
          className="block rounded-2xl border bg-white px-4 py-3 hover:bg-gray-50"
        >
          <h3 className="font-semibold">{d.title}</h3>
          {d.body ? <p className="mt-1 line-clamp-2 text-sm text-gray-700">{d.body}</p> : null}
          <div className="mt-1 text-[11px] text-gray-400">{new Date(d.created_at).toLocaleString()}</div>
        </Link>
      ))}
    </div>
  );
}
