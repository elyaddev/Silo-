"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import supabase from "@/lib/supabaseClient";

type ActivityRow = {
  id: string;
  user_id: string;
  type: string | null;
  created_at: string;
  payload?: any | null;
};

function buildDiscussionHref(payload: any): string | null {
  if (!payload) return null;
  const roomId = payload.roomId ?? payload.room_id ?? null;
  const discussionId = payload.discussionId ?? payload.discussion_id ?? null;
  if (!roomId || !discussionId) return null;
  // 🔒 absolute app path (leading slash)
  return `/rooms/${roomId}/d/${discussionId}`;
}

function formatDate(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default function ActivityPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [items, setItems] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [openJsonId, setOpenJsonId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr(null);

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      setUserEmail(user?.email ?? null);

      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("activity")
        .select("id,user_id,type,created_at,payload")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) setErr(error.message);
      setItems(data ?? []);
      setLoading(false);
    };

    load();
  }, []);

  return (
    <main className="min-h-[70vh] px-6 py-12 bg-orange-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">My Activity</h1>
            {userEmail && <p className="text-sm text-neutral-600 mt-1">Signed in as {userEmail}</p>}
          </div>
          <Link
            href="/account"
            className="rounded-lg border border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white px-4 py-2 font-medium transition"
          >
            Account
          </Link>
        </header>

        {loading && <div className="text-neutral-600">Loading your recent activity…</div>}

        {!loading && err && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-4">{err}</div>
        )}

        {!loading && !err && items.length === 0 && (
          <div className="rounded-2xl border border-dashed p-10 text-center bg-white/70">
            <p className="text-neutral-800 mb-2 font-medium">No activity yet</p>
            <p className="text-neutral-500 text-sm">
              Create a room, post a message, or reply to see items appear here.
            </p>
          </div>
        )}

        {!loading && !err && items.length > 0 && (
          <ul className="space-y-4">
            {items.map((a) => {
              const href = buildDiscussionHref(a.payload);
              const excerpt =
                a?.payload?.excerpt ?? a?.payload?.text ?? null;

              const Card = (
                <div
                  className={[
                    "group relative rounded-2xl border bg-white p-4 shadow-sm transition",
                    href ? "hover:shadow-md hover:border-orange-300" : "",
                  ].join(" ")}
                  style={{ borderColor: "color-mix(in oklab, var(--color-brand), white 70%)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium mb-1"
                        style={{
                          background: "color-mix(in oklab, var(--color-brand), white 90%)",
                          color: "var(--color-brand)",
                        }}
                      >
                        {a.type ?? "activity"}
                      </span>

                      <div className="mt-1">
                        {excerpt ? (
                          <p className="text-[15px] text-neutral-800">{String(excerpt)}</p>
                        ) : (
                          <p className="text-[15px] text-neutral-700 italic">(No excerpt)</p>
                        )}
                      </div>

                      <div className="mt-2 text-[11px] text-neutral-500">
                        {formatDate(a.created_at)}
                      </div>
                    </div>

                    {href && (
                      <div className="shrink-0 self-center">
                        <span className="hidden md:inline text-orange-600 group-hover:underline">
                          Open discussion →
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenJsonId((id) => (id === a.id ? null : a.id));
                      }}
                      className="text-xs text-neutral-500 hover:text-neutral-700 underline"
                    >
                      {openJsonId === a.id ? "Hide details" : "View JSON"}
                    </button>
                    {openJsonId === a.id && (
                      <pre className="mt-2 text-xs text-neutral-800 bg-neutral-50 rounded-lg p-3 overflow-x-auto">
                        {JSON.stringify(a.payload ?? {}, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              );

              return (
                <li key={a.id}>
                  {href ? (
                    // ✅ Use Link with absolute href so the browser navigates correctly
                    <Link href={href} className="block">
                      {Card}
                    </Link>
                  ) : (
                    Card
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
