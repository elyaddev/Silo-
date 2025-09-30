"use client";
import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";

type Room = { id: string; name: string; is_private: boolean; created_at: string };

export default function RoomsList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  async function load() {
    setErr(null);
    setLoading(true);
    const { data, error } = await supabase
      .from("rooms")
      .select("id,name,is_private,created_at")
      .order("created_at", { ascending: false });
    if (error) setErr(error.message);
    setRooms(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setErr(null);

    // 1) get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErr("You must be signed in.");
      setCreating(false);
      return;
    }

    // 2) ensure profile exists (covers accounts created before the trigger)
    const { error: upsertErr } = await supabase
      .from("profiles")
      .upsert({ id: user.id }, { onConflict: "id" });
    if (upsertErr) {
      setErr(upsertErr.message);
      setCreating(false);
      return;
    }

    // 3) create room with created_by set to the current user
    const { data: room, error: insertErr } = await supabase
      .from("rooms")
      .insert([{ name: name.trim(), is_private: isPrivate, created_by: user.id }])
      .select()
      .single();

    if (insertErr || !room) {
      setErr(insertErr?.message || "Failed to create room.");
      setCreating(false);
      return;
    }

    // 4) join the room (RLS requires profile_id = auth.uid())
    const { error: memberErr } = await supabase
      .from("memberships")
      .insert([{ room_id: room.id, profile_id: user.id }]);

    if (memberErr) {
      // not fatal to show the new room, but useful feedback
      setErr(memberErr.message);
    }

    setName("");
    setIsPrivate(false);
    setCreating(false);
    await load();
  }

  if (loading) return <p className="text-gray-600">Loading rooms…</p>;

  return (
    <div className="space-y-8">
      {/* Create room */}
      <form onSubmit={onCreate} className="rounded-2xl border p-4 space-y-3">
        <h2 className="text-lg font-semibold">Create a room</h2>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border px-3 py-2"
            placeholder="Room name (e.g., General)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-xl border px-4 py-2 font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
          />
          Make room private
        </label>
      </form>

      {/* List rooms */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Rooms</h2>
        {rooms.length === 0 ? (
          <p className="text-gray-600">No rooms yet. Create the first one!</p>
        ) : (
          <ul className="grid gap-3">
            {rooms.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-sm text-gray-600">
                    {r.is_private ? "Private" : "Public"}
                  </div>
                </div>
                <a href={`/rooms/${r.id}`} className="text-sm underline hover:opacity-80">
                  Open
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
