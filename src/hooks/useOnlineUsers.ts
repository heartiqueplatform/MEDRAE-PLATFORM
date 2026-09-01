import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

export const useOnlineUsers = () => {
    const authUser = useUser();
    const currentUserId = authUser?.id;
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const lastFetchRef = useRef<number>(0);

    // 1. Fetch online users (only users active in last 5 minutes)
    const fetchOnlineUsers = useCallback(async () => {
        if (!currentUserId) return;

        // MAMA'S RULE: Don't fetch more than once every 2 minutes
        // unless specifically requested.
        const now = Date.now();
        if (now - lastFetchRef.current < 120000) return;
        lastFetchRef.current = now;

        try {
            // We look back 5 minutes to be safe
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

            const { data, error } = await supabase
                .from('profiles')
                .select('user_id, name, username, role, avatar_url, is_online') // Only what we need!
                .eq('is_online', true)
                .neq('user_id', currentUserId)
                .gte('last_seen', fiveMinutesAgo)
                .limit(20); // Do you really need 100 people at once? Let's do 20.

            if (!error) {
                setOnlineUsers(data || []);
            }
        } catch (err) {
            console.error("Error fetching online users:", err);
        } finally {
            setLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        if (!currentUserId) return;

        // Initial fetch
        fetchOnlineUsers();

        // 2. Slow down the poll!
        // Once every 5 minutes (300000ms) is plenty for a list of names.
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchOnlineUsers();
            }
        }, 300000);

        // 3. Refresh when the user comes back to the tab
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') fetchOnlineUsers();
        };

        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [currentUserId, fetchOnlineUsers]);

    return {
        onlineUsers,
        loading,
        count: onlineUsers.length,
        refresh: fetchOnlineUsers // Users can still click a button to refresh manually
    };
};