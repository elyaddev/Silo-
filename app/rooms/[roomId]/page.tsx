// app/rooms/[roomId]/page.tsx
import DiscussionList from "@/components/DiscussionList";
import DiscussionComposer from "@/components/DiscussionComposer";
import BackBar from "@/components/BackBar";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

type DiscussionRow = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
};

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const supabase = createServerComponentClient({ cookies });

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  const { data: discussions, error: discError } = await supabase
    .from("discussions")
    .select("id, title, body, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  const roomLabel = (room as any)?.name ?? (room as any)?.title ?? "(Room)";

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-10">
      <BackBar backHref="/rooms" backLabel="All Rooms" />

      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
        {roomLabel}
      </h1>

      {/* Composer */}
      <section aria-labelledby="start-discussion" className="w-full">
        <h2 id="start-discussion" className="sr-only">
          Start a new discussion
        </h2>

        {/* composer is a client component */}
        <DiscussionComposer roomId={roomId} />
      </section>

      {/* Discussions */}
      <section aria-labelledby="discussions" className="mt-6">
        <h2 id="discussions" className="text-2xl font-semibold text-slate-900 mb-4">
          Discussions
        </h2>

        {discError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load discussions: {discError.message}
          </div>
        ) : (
          <DiscussionList
            roomId={roomId}
            items={(discussions ?? []) as DiscussionRow[]}
          />
        )}
      </section>
    </div>
  );
}
