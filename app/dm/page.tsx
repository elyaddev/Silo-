"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import ClientTime from "@/components/ClientTime";

type Row = {
  conversation_id: string;
  other_user_id: string | null;
  last_message_id: number | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};

export default function DMListPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUid(session?.user?.id ?? null);
    })();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_my_dms");
    if (error) {
      console.error(error);
      alert(error.message);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!uid) return;
    void load();

    // optional: realtime new DM messages -> refresh list
    const channel = supabase
      .channel("dm:list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        () => void load()
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [uid]);

  async function leave(convId: string) {
    if (!confirm("Leave this conversation?")) return;
    const { data, error } = await supabase.rpc("leave_dm", {
      p_conversation_id: convId,
    });
    if (error) {
      alert(error.message);
      return;
    }
    // remove from local list
    setRows((prev) => prev.filter((r) => r.conversation_id !== convId));
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Direct Messages</h1>
        <button
          className="rounded-full px-3 py-1 text-sm border border-neutral-300 hover:bg-neutral-50"
          onClick={() => router.push("/dm/requests")}
        >
          Requests
        </button>
      </div>

      {loading ? (
        <div className="text-neutral-600 text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-neutral-600 text-sm">No conversations yet.</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.conversation_id}
              className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4"
            >
              <button
                className="flex-1 text-left"
                onClick={() => router.push(`/dm/${r.conversation_id}${r.last_message_id ? `#msg-${r.last_message_id}` : ""}`)}
                title="Open conversation"
              >
                <div className="flex items-center gap-2">
                  <div className="font-medium">
                    Conversation
                    {r.other_user_id ? "" : " (group)"}
                  </div>
                  {r.unread_count > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-[var(--color-brand)] text-white text-[10px] h-5 min-w-[20px] px-1">
                      {r.unread_count > 99 ? "99+" : r.unread_count}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-neutral-700 line-clamp-1">
                  {r.last_message ?? "No messages yet"}
                </div>
                <div className="text-[12px] text-neutral-500 mt-0.5">
                  {r.last_message_at ? <ClientTime iso={r.last_message_at} /> : "—"}
                </div>
              </button>

              <button
                className="ml-3 rounded-full px-3 py-1 text-sm border border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => void leave(r.conversation_id)}
                title="Leave conversation"
              >
                Leave
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
