// app/rooms/[roomId]/d/[discussionId]/page.tsx
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import ThreadClient from "./thread-client";
import BackBar from "@/components/BackBar"; // <-- make sure this exists

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
};

export default async function DiscussionPage(
  props: { params: Promise<{ roomId: string; discussionId: string }> }
) {
  const { roomId, discussionId } = await props.params;
  const supabase = createServerComponentClient({ cookies });

  // Fetch the discussion
  const { data: discussion, error: dErr } = await supabase
    .from("discussions")
    .select("*")
    .eq("id", discussionId)
    .single();

  if (dErr || !discussion) {
    return <div className="mx-auto max-w-2xl p-6">Discussion not found.</div>;
  }

  // Fetch replies (messages) joined with profile usernames
  const { data: initialReplies } = await supabase
    .from("messages")
    .select("id, content, created_at, profile_id, profiles!messages_profile_id_fkey(username)")
    .eq("discussion_id", discussionId)
    .order("created_at", { ascending: true });

  const replies: Reply[] = (initialReplies || []).map((r: any) => ({
    id: r.id,
    content: r.content,
    created_at: r.created_at,
    profile_id: r.profile_id ?? null,
    username: r.profiles?.username ?? null,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      {/* ✅ Added back bar */}
      <BackBar 
        backHref={`/rooms/${roomId}`} 
        backLabel="All discussions in this room" 
        actions={[{ href: `/rooms/${roomId}#compose`, label: "Start new", icon: "plus" }]} 
      />

      {/* Keep existing ThreadClient that preserves replies */}
      <ThreadClient
        roomId={roomId}
        discussion={discussion as Discussion}
        initialReplies={replies}
      />
    </div>
  );
}
