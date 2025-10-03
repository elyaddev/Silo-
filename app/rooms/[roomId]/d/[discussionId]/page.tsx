// app/rooms/[roomId]/d/[discussionId]/page.tsx
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import ThreadClient from "./thread-client";

type Discussion = { id: string; title: string; body: string | null; created_at: string };
type Reply = { id: number | string; content: string; created_at: string; profile_id: string | null; username: string | null };

export default async function DiscussionPage(
  props: { params: Promise<{ roomId: string; discussionId: string }> }
) {
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

  // Include username via implicit foreign key join
  const { data: initialReplies } = await supabase
    .from("messages")
    .select("id, content, created_at, profile_id, profiles!messages_profile_id_fkey(username)")
    .eq("discussion_id", discussionId)
    .order("created_at", { ascending: true });

  // Normalize: move joined username to flat field
  const replies: Reply[] = (initialReplies || []).map((r: any) => ({
    id: r.id,
    content: r.content,
    created_at: r.created_at,
    profile_id: r.profile_id ?? null,
    username: r.profiles?.username ?? null,
  }));

  return (
    <ThreadClient
      roomId={roomId}
      discussion={discussion as Discussion}
      initialReplies={replies}
    />
  );
}
