import ThreadClient from "./thread-client";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export default async function DiscussionPage({
  params,
}: { params: { roomId: string; discussionId: string } }) {
  const supabase = createServerComponentClient({ cookies });

  const { data: discussion } = await supabase
    .from("discussions")
    .select("*")
    .eq("id", params.discussionId)
    .single();

  const { data: initialReplies } = await supabase
    .from("messages")
    .select("*")
    .eq("discussion_id", params.discussionId)
    .order("created_at", { ascending: true });

  return (
    <ThreadClient
      roomId={params.roomId}
      discussion={discussion}
      initialReplies={initialReplies ?? []}
    />
  );
}
