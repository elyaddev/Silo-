"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import ClientTime from "@/components/ClientTime";

type DMRequest = {
  id: string;
  requester_id: string;
  requested_id: string;
  status: "pending" | "accepted" | "declined" | "blocked" | "canceled";
  created_at: string;
  decided_at: string | null;
  conversation_id: string | null;
};

export default function DMRequestsPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<DMRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUid(session?.user?.id ?? null);
    })();
  }, []);

  async function load() {
    if (!uid) return;
    setLoading(true);
    // fetch pending where I am requester OR requested
    const { data, error } = await supabase
      .from("direct_requests")
      .select("id, requester_id, requested_id, status, created_at, decided_at, conversation_id")
      .eq("status", "pending")
      .or(`requested_id.eq.${uid},requester_id.eq.${uid}`)
      .order("created_at", { ascending: false });

    if (!error && data) setItems(data as DMRequest[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [uid]);

  const incoming = useMemo(
    () => items.filter((r) => r.requested_id === uid),
    [items, uid]
  );
  const outgoing = useMemo(
    () => items.filter((r) => r.requester_id === uid),
    [items, uid]
  );

  async function accept(id: string) {
    const { data, error } = await supabase.rpc("respond_dm_request", {
      p_request_id: id,
      p_action: "accept",
    });
    if (error) {
      alert(error.message);
      return;
    }
    const conv = (data as any)?.conversation_id as string | undefined;
    if (conv) router.push(`/dm/${conv}`);
    else await load();
  }

  async function decline(id: string) {
    const { error } = await supabase.rpc("respond_dm_request", {
      p_request_id: id,
      p_action: "decline",
    });
    if (error) {
      alert(error.message);
      return;
    }
    await load();
  }

  async function cancel(id: string) {
    const { error } = await supabase.rpc("respond_dm_request", {
      p_request_id: id,
      p_action: "cancel",
    });
    if (error) {
      alert(error.message);
      return;
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-10">
      <h1 className="text-2xl font-bold">Chat Requests</h1>

      {/* Incoming */}
      <section>
        <h2 className="mb-3 font-semibold">Incoming</h2>
        {loading ? (
          <div className="text-neutral-500 text-sm">Loading…</div>
        ) : incoming.length === 0 ? (
          <div className="text-neutral-500 text-sm">No incoming requests.</div>
        ) : (
          <ul className="space-y-3">
            {incoming.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3"
              >
                <div className="text-sm">
                  <div className="font-medium">Chat request</div>
                  <div className="text-neutral-600 text-xs">
                    <ClientTime iso={r.created_at} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-full px-3 py-1 text-sm border border-[var(--color-brand)] text-[var(--color-brand)] hover:bg-neutral-50"
                    onClick={() => void accept(r.id)}
                  >
                    Accept
                  </button>
                  <button
                    className="rounded-full px-3 py-1 text-sm border border-neutral-300 hover:bg-neutral-50"
                    onClick={() => void decline(r.id)}
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Outgoing */}
      <section>
        <h2 className="mb-3 font-semibold">Outgoing</h2>
        {loading ? (
          <div className="text-neutral-500 text-sm">Loading…</div>
        ) : outgoing.length === 0 ? (
          <div className="text-neutral-500 text-sm">No outgoing requests.</div>
        ) : (
          <ul className="space-y-3">
            {outgoing.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3"
              >
                <div className="text-sm">
                  <div className="font-medium">Waiting for response…</div>
                  <div className="text-neutral-600 text-xs">
                    <ClientTime iso={r.created_at} />
                  </div>
                </div>
                <button
                  className="rounded-full px-3 py-1 text-sm border border-neutral-300 hover:bg-neutral-50"
                  onClick={() => void cancel(r.id)}
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
