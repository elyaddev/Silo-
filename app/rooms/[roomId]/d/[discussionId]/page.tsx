import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import ThreadClient from "./thread-client";
import BackBar from "@/components/BackBar";

type Discussion = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
};

type Reply = {
  id: number | string;
  content: string;
  created_at: string;
  profile_id: string | null;
  username: string | null;
  is_deleted: boolean;
  parent_id: number | null;
};

export default async function DiscussionPage({
  params,
}: {
  params: Promise<{ roomId: string; discussionId: string }>;
}) {
  const { roomId, discussionId } = await params;   // ✅ await the promise
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
    .select(
      "id, content, created_at, profile_id, is_deleted, parent_id, profiles!messages_profile_id_fkey(username)"
    )
    .eq("discussion_id", discussionId)
    .order("created_at", { ascending: true });

  const replies: Reply[] = (initialReplies ?? []).map((r: any) => ({
    id: r.id,
    content: r.content,
    created_at: r.created_at,
    profile_id: r.profile_id ?? null,
    username: r.profiles?.username ?? null,
    is_deleted: r.is_deleted ?? false,
    parent_id: r.parent_id ?? null,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <BackBar
        backHref={`/rooms/${roomId}`}
        backLabel="All discussions in this room"
        actions={[{ href: `/rooms/${roomId}#compose`, label: "Start new", icon: "plus" }]}
      />
      <ThreadClient roomId={roomId} discussion={discussion as Discussion} initialReplies={replies} />
    </div>
  );
}