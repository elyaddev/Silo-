// Adapted search route from the original repository.
//
// Changes:
//  1. Word matching: instead of matching substrings, this route now only
//     returns results where the query matches a full word in either the
//     discussion title/body or in any of its replies.  For example, a
//     search for `hi` will match a discussion titled “Hi there” but not
//     one containing “hindrance”.
//  2. Reply search: previously only discussions were searched.  This
//     implementation also searches the `messages` table (replies) for
//     matches and returns the parent discussion as a result when a
//     reply matches.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qRaw = (url.searchParams.get("q") || "").trim();
  const q = qRaw.toLowerCase();
  const supabase = createRouteHandlerClient({ cookies });

  // Public search: no session check
  if (!q || q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  // Escape regex special characters so user input cannot break our pattern
  function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  const pattern = new RegExp(`\\b${escapeRegExp(q)}\\b`, "i");

  // First query: fetch candidate discussions whose title or body contain the
  // query as a substring.  We fetch more than we will ultimately return so
  // we can filter by whole‑word matches client‑side.
  const { data: discData, error: discErr } = await supabase
    .from("discussions")
    .select("id, room_id, title, body, created_at")
    .or(`title.ilike.%${qRaw}%,body.ilike.%${qRaw}%`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (discErr) {
    return NextResponse.json(
      { items: [], error: discErr.message },
      { status: 500 }
    );
  }

  // Filter discussions to those with whole‑word matches
  const discMatches = (discData ?? []).filter((d) => {
    return pattern.test(d.title) || pattern.test(d.body ?? "");
  });

  // Second query: search replies for matches.  Replies live in the
  // `messages` table and have a `discussion_id` foreign key.  We select
  // only those messages whose content contains the query as a substring,
  // then filter by whole‑word match.
  const { data: msgData, error: msgErr } = await supabase
    .from("messages")
    .select("discussion_id, room_id, content, created_at")
    .ilike("content", `%${qRaw}%`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (msgErr) {
    return NextResponse.json(
      { items: [], error: msgErr.message },
      { status: 500 }
    );
  }

  // Filter reply messages to those with whole‑word matches
  const replyMatches = (msgData ?? []).filter((m) => pattern.test(m.content ?? ""));

  // Collect unique discussion IDs from matching replies
  const replyDiscussionIds = Array.from(
    new Set(replyMatches.map((m) => m.discussion_id).filter(Boolean))
  ) as string[];

  let replyDiscussions: any[] = [];
  if (replyDiscussionIds.length) {
    const { data: d2, error: d2Err } = await supabase
      .from("discussions")
      .select("id, room_id, title, body, created_at")
      .in("id", replyDiscussionIds);
    if (!d2Err) replyDiscussions = d2 ?? [];
  }

  // Build a map from discussion id to the first matching reply for snippet
  const snippetMap: Record<string, string> = {};
  for (const r of replyMatches) {
    const id = r.discussion_id;
    if (typeof id === "string" && !(id in snippetMap)) {
      snippetMap[id] = r.content.slice(0, 120);
    }
  }

  // Combine discussion matches and reply discussion matches, de‑duplicating by id
  const combinedMap: Record<string, any> = {};
  for (const d of discMatches) {
    combinedMap[d.id] = d;
  }
  for (const d of replyDiscussions) {
    if (!combinedMap[d.id]) combinedMap[d.id] = d;
  }

  const combined = Object.values(combinedMap);

  // Sort combined results by created_at descending
  combined.sort((a: any, b: any) => {
    return (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0);
  });

  // Build final items list with a maximum of 10 results
  const items = combined.slice(0, 10).map((d: any) => ({
    id: d.id,
    room_id: d.room_id,
    title: d.title,
    snippet: snippetMap[d.id] ?? (d.body ?? "").slice(0, 120),
    created_at: d.created_at,
  }));

  return NextResponse.json({ items });
}
