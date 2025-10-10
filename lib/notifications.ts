import { supabase } from "@/lib/supabaseClient";

export type Notification = {
  id: string;
  type: "reply_in_discussion" | "reply_to_you";
  room_id: string;              // uuid
  message_id: number;           // bigint
  actor_id: string;             // uuid
  created_at: string;
  read_at: string | null;

  // enriched from the notification_items view
  message_preview: string | null;
  parent_id: number | null;
  discussion_id: string | null; // uuid (may be null in some rows)
  actor_is_op: boolean | null;
  actor_alias: number | null;
  actor_display_name: string | null;
};

export async function fetchUnreadCount() {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { head: true, count: "exact" })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchLatest(limit = 20) {
  const { data, error } = await supabase
    .from("notification_items")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function markAllRead() {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

export async function markRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
