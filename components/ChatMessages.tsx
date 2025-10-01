"use client";

import { useEffect, useRef } from "react";

type Msg = {
  id: string;
  content: string;
  profile_id: string | null;
  created_at: string;
};

export default function ChatMessages({ messages }: { messages: Msg[] }) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        No messages yet — start the conversation!
      </div>
    );
  }

  const [first, ...rest] = messages;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
      {/* First message = question */}
      <article className="rounded-2xl border border-gray-300 bg-white px-5 py-4 shadow-sm">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight mb-2">
          {first.content}
        </h2>
        <div className="text-xs text-gray-400">
          {new Date(first.created_at).toLocaleString()}
        </div>
      </article>

      {/* Replies = answers */}
      <div className="space-y-4">
        {rest.map((m) => (
          <div
            key={m.id}
            className="ml-3 border-l-2 border-gray-200 pl-4"
          >
            <div className="rounded-xl bg-gray-100 px-4 py-3">
              <p className="whitespace-pre-wrap text-[15px] text-gray-800 leading-relaxed">
                {m.content}
              </p>
              <div className="mt-1 text-[11px] text-gray-400">
                {new Date(m.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div ref={endRef} />
    </div>
  );
}
