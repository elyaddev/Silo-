// app/account/activity/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

type Discussion = {
  id: string;
  room_id: string | null;
  title: string | null;
  content?: string | null;
  created_at: string;
};

type ReplyRow = {
  id: string;
  discussion_id: string | null;
  content: string | null;
  created_at: string;
  // Joined discussion (via inner join)
  discussions?: Discussion | null;
};

export default async function ActivityPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Protect the page. Also fixes "Auth session missing!"
    redirect("/login?next=/account/activity");
  }

  // 1) Discussions (questions) I started
  const { data: myDiscussions, error: discErr } = await supabase
    .from("discussions")
    .select("id, room_id, title, content, created_at")
    .eq("profile_id", user.id) // adjust to your author column
    .order("created_at", { ascending: false })
    .limit(50);

  // 2) Replies I posted (dedupe by discussion)
  const { data: myReplyRows, error: replyErr } = await supabase
    .from("messages")
    .select(
      "id, discussion_id, content, created_at, discussions!inner(id, room_id, title, created_at)"
    )
    .eq("profile_id", user.id) // adjust to your messages author column
    .order("created_at", { ascending: false })
    .limit(100);

  // Deduplicate replies by the discussion they belong to
  const seen = new Set<string>();
  const repliedDiscussions: Discussion[] = [];
  for (const r of (myReplyRows as ReplyRow[] | null) ?? []) {
    const d = r.discussions;
    if (d && !seen.has(d.id)) {
      seen.add(d.id);
      repliedDiscussions.push(d);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="heading">Your activity</h1>
        <Link href="/account" className="btn btn-outline">
          Back to Account
        </Link>
      </div>

      {(discErr || replyErr) && (
        <div className="alert alert-warn mb-6">
          {discErr?.message || replyErr?.message || "Failed to load data."}
        </div>
      )}

      <div className="grid gap-8">
        <section>
          <h2 className="section-title">Questions you started</h2>
          {(!myDiscussions || myDiscussions.length === 0) && (
            <p className="empty">You haven’t started any discussions yet.</p>
          )}

          <ul className="mt-3 space-y-3">
            {(myDiscussions as Discussion[] | null)?.map((d) => (
              <li key={d.id} className="card">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      {d.title || "Untitled discussion"}
                    </p>
                    <p className="mt-1 text-xs text-ink-dim">
                      {new Date(d.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    href={`/rooms/${d.room_id ?? ""}/d/${d.id}`}
                    className="btn btn-soft shrink-0"
                  >
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="section-title">Discussions you replied to</h2>
          {repliedDiscussions.length === 0 && (
            <p className="empty">No replies yet.</p>
          )}

          <ul className="mt-3 space-y-3">
            {repliedDiscussions.map((d) => (
              <li key={d.id} className="card">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      {d.title || "Untitled discussion"}
                    </p>
                    <p className="mt-1 text-xs text-ink-dim">
                      {new Date(d.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    href={`/rooms/${d.room_id ?? ""}/d/${d.id}`}
                    className="btn btn-soft shrink-0"
                  >
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
