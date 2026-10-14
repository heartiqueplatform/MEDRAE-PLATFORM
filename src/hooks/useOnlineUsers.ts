import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

// ✅ Online cutoff — a user counts as "online" if they were seen
//    within the last 3 minutes. Heartbeat interval (App.tsx) is 60s,
//    so active users always stay inside this window; crashed users
//    drop off within 3 minutes.
const ONLINE_WINDOW_MS = 3 * 60 * 1000;

// ✅ Throttle for AUTOMATIC background refreshes only.
const AUTO_REFRESH_THROTTLE_MS = 60 * 1000;

export const useOnlineUsers = () => {
    const authUser = useUser();
    const currentUserId = authUser?.id;
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const lastAutoFetchRef = useRef<number>(0);
    const inFlightRef = useRef<boolean>(false);

    // ✅ Core fetch. `manual` = true skips the throttle entirely.
    const fetchOnlineUsers = useCallback(
        async (manual: boolean = false) => {
            if (!currentUserId) return;
            if (inFlightRef.current) return;

            // Apply throttle ONLY to automatic (background) fetches.
            // Manual taps always go through.
            const now = Date.now();
            if (!manual && now - lastAutoFetchRef.current < AUTO_REFRESH_THROTTLE_MS) {
                return;
            }

            inFlightRef.current = true;
            if (!manual) lastAutoFetchRef.current = now;

            try {
                const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
                const { data, error } = await supabase
                    .from("profiles")
                    .select("user_id, name, username, role, avatar_url, is_online, last_seen")
                    .eq("is_online", true)
                    // ✅ Include yourself — the popover will mark you with "(you)"
                    .gte("last_seen", cutoff)
                    .order("last_seen", { ascending: false })
                    .limit(50);
                if (error) {
                    console.error("Error fetching online users:", error);
                } else {
                    setOnlineUsers(data || []);
                }
            } catch (err) {
                console.error("Error fetching online users:", err);
            } finally {
                inFlightRef.current = false;
                setLoading(false);
            }
        },
        [currentUserId]
    );

    // ✅ Manual refresh — bypasses the throttle. Exposed to the header
    //    so a tap on the badge always shows fresh data.
    const refresh = useCallback(() => fetchOnlineUsers(true), [fetchOnlineUsers]);

    useEffect(() => {
        if (!currentUserId) return;

        // Initial fetch
        fetchOnlineUsers(false);

        // Background poll — every 60s while the tab is visible
        const interval = setInterval(() => {
            if (document.visibilityState === "visible") {
                fetchOnlineUsers(false);
            }
        }, 60_000);

        // Refresh on tab focus (still throttled)
        const onVisibility = () => {
            if (document.visibilityState === "visible") fetchOnlineUsers(false);
        };
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [currentUserId, fetchOnlineUsers]);

    // ✅ Split: count includes everyone (including you);
    //    display list excludes yourself for the popover UI.
    // ✅ Sort: current user pinned to top, then everyone else by recency
    const sortedUsers = useMemo(() => {
        const me = onlineUsers.find((u) => u.user_id === currentUserId);
        const others = onlineUsers.filter((u) => u.user_id !== currentUserId);
        return me ? [me, ...others] : others;
    }, [onlineUsers, currentUserId]);

    return {
        onlineUsers: sortedUsers,        // for the popover — you appear first
        onlineCount: onlineUsers.length, // for the badge — everyone
        loading,
        refresh,
    };
};