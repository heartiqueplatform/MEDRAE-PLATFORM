// lib/notifications/api.ts
import { supabase } from "@/lib/supabaseClient";

export interface NotificationRow {
    id: string;
    user_id: string | null;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    action_url?: string | null;
}

const PAGE_SIZE = 20;

/**
 * Count unread notifications for a user (own + global).
 * One head-only query — cheapest possible.
 * TODO(rpc): unread_notifications_count(p_user_id) → integer, single round-trip.
 */
export async function fetchUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .or(`user_id.eq.${userId},user_id.is.null`)
        .eq("is_read", false);
    if (error) throw error;
    return count ?? 0;
}

/**
 * Paginated feed. Cursor on `created_at` (ISO string).
 * Never queries the whole table — max 20 rows per call.
 */
export async function fetchNotificationsPage(
    userId: string,
    cursor?: string | null
): Promise<NotificationRow[]> {
    let q = supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

    if (cursor) q = q.lt("created_at", cursor);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as NotificationRow[];
}

/** Mark one notification as read. */
/** Mark one notification as read. */
export async function markNotificationRead(id: string): Promise<void> {
    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read: true })   // ✅ both
        .eq("id", id);
    if (error) throw error;
}

/** Mark all of a user's unread notifications as read. */
export async function markAllRead(userId: string): Promise<void> {
    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read: true })   // ✅ both
        .eq("is_read", false)
        .or(`user_id.eq.${userId},user_id.is.null`);
    if (error) throw error;
}
/** Delete one notification. */
export async function deleteNotification(id: string): Promise<void> {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) throw error;
}