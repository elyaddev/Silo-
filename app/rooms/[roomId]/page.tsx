"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import MessageList from "@/components/MessageList";
import Composer from "@/components/Composer";
import { supabase } from "@/lib/supabaseClient";

function coerceId(
  roomid: string | string[] | undefined,
  pathname: string
): string {
  if (typeof roomid === "string" && roomid) return roomid;
  if (Array.isArray(roomid) && roomid.length) return roomid[0]!;
  const last = pathname.split("/").filter(Boolean).pop();
  return last ?? "";
}

export default function RoomPage() {
  const params = useParams<{ roomid?: string | string[] }>();
  const pathname = usePathname();
  const id = useMemo(() => coerceId(params?.roomid, pathname), [params, pathname]);

  const [roomName, setRoomName] = useState("Room");

  // Fetch name in background, never block rendering
  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("rooms")
        .select("name")
        .eq("id", id)
        .maybeSingle();
      if (!alive) return;
      if (data?.name) setRoomName(data.name);
    })();
    return () => { alive = false; };
  }, [id]);

  if (!id) {
    return (
      <AuthGuard>
        <main className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="text-2xl font-semibold mb-4">Room</h1>
          <p className="text-gray-600">Loading…</p>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">{roomName}</h1>
        <div className="rounded-2xl border">
          <div className="h-[55vh] overflow-y-auto p-4">
            <MessageList roomId={id} />
          </div>
          <div className="border-t p-3">
            <Composer roomId={id} />
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
