// src/hooks/useCelebrationNotification.ts
"use client";

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export type CelebrationNotice = {
    id: string;
    title: string;
    message: string;
    type: string;
    link_url: string | null;
    created_at: string;
};

/**
 * Returns the newest UNREAD celebration notification for the current user.
 *
 * Refreshes on:
 *   - initial mount
 *   - route change (React Router location change)
 *   - browser tab regaining focus (visibilitychange)
 *
 * No realtime subscription — cheap and covers real usage.
 */
export function useCelebrationNotification() {
    const [notice, setNotice] = useState<CelebrationNotice | null>(null);
    const location = useLocation();

    // Re-run the query whenever the route changes.
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("notifications")
                .select("id, title, message, type, link_url, created_at")
                .eq("user_id", user.id)
                .eq("celebrate", true)
                .eq("is_read", false)
                .order("created_at", { ascending: false })
                .limit(1);

            if (error) {
                // Silent — this is a nice-to-have, don't spam the console
                return;
            }
            if (cancelled) return;

            setNotice(data && data.length > 0 ? (data[0] as CelebrationNotice) : null);
        };

        load();

        // Re-check when the tab becomes visible again
        const onVisibility = () => {
            if (document.visibilityState === "visible") load();
        };
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            cancelled = true;
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [location.pathname]); // ← re-runs on every route change

    return {
        notice,
        /**
         * Marks the notification as read in the DB. After this it's filtered
         * out of the next query — the overlay won't reappear even on refresh.
         */
        markRead: async (id: string) => {
            setNotice(null); // optimistic hide
            await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("id", id);
        },
    };
}