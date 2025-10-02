// app/rooms/[roomId]/d/[discussionId]/page.tsx
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import ThreadClient from "./thread-client";

type Discussion = { id: string; title: string; body: string | null; created_at: string };
type Reply = { id: number | string; content: string; created_at: string };

export default async function DiscussionPage(
  props: { params: Promise<{ roomId: string; discussionId: string }> }
) {
  // 👇 Await the params directly so TS sees real strings, not a Promise
  const { roomId, discussionId } = await props.params;

  const supabase = createServerComponentClient({ cookies });

  const { data: discussion, error: dErr } = await supabase
    .from("discussions")
    .select("*")
    .eq("id", discussionId)
    .single();

  if (dErr || !discussion) {
    return <div className="mx-auto max-w-2xl p-6">Discussion not found.</div>;
  }

  const { data: initialReplies } = await supabase
    .from("messages")
    .select("*")
    .eq("discussion_id", discussionId)
    .order("created_at", { ascending: true });

  return (
    <ThreadClient
      roomId={roomId}
      discussion={discussion as Discussion}
      initialReplies={(initialReplies || []) as Reply[]}
    />
  );
}
