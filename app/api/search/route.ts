import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const supabase = createRouteHandlerClient({ cookies });

  // Public search: no session check

  if (!q || q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const { data, error } = await supabase
    .from("discussions")
    .select("id, room_id, title, body, created_at")
    .or(`title.ilike.%${q}%,body.ilike.%${q}%`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: (data ?? []).map(d => ({
      id: d.id,
      room_id: d.room_id,
      title: d.title,
      snippet: (d.body ?? "").slice(0, 120),
      created_at: d.created_at,
    })),
  });
}
