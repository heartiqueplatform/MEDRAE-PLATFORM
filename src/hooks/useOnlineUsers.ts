import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";

export type Profile = {
    user_id: string;
    name: string;
    username?: string;
    role: string;
    avatar_url?: string;
    institution?: string;
    course?: string;
    specialization?: string;
    is_online: boolean; // We will treat this as the "intended" status
    last_seen?: string;
};

export const useOnlineUsers = () => {
    const { user } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [liveOnlineIds, setLiveOnlineIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!user) return;

        // 1. Fetch initial profiles from your table
        const fetchProfiles = async () => {
            const { data, error } = await supabase
                .from("profiles") // Matches your table name
                .select(`
          user_id, name, username, role, avatar_url,
          institution, course, specialization, is_online, last_seen
        `);

            if (error) {
                console.error("Error fetching profiles:", error);
            } else if (data) {
                setProfiles(data as Profile[]);
            }
        };

        fetchProfiles();

        // 2. Initialize Presence Channel
        // This detects actual socket connections (kills the "glitch")
        const channel = supabase.channel("global_presence", {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState();
                // These are the users who are PHYSICALLY connected right now
                const onlineIds = new Set(Object.keys(state));
                setLiveOnlineIds(onlineIds);
            })
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "profiles"
            }, (payload: any) => {
                // Update local state if a profile changes in the DB
                const updated = payload.new as Profile;
                setProfiles((prev) => {
                    const exists = prev.find((u) => u.user_id === updated.user_id);
                    if (exists) {
                        return prev.map((u) => (u.user_id === updated.user_id ? updated : u));
                    }
                    return [...prev, updated];
                });
            })
            .subscribe(async (status) => {
                if (status === "SUBSCRIBED") {
                    // 3. Mark the current user as "Present"
                    await channel.track({
                        user_id: user.id,
                        online_at: new Date().toISOString(),
                    });

                    // OPTIONAL: Update your DB column to true when they connect
                    // But remember: Presence is what actually handles the "Offline" logic
                    await supabase
                        .from("profiles")
                        .update({ is_online: true, last_seen: new Date().toISOString() })
                        .eq("user_id", user.id);
                }
            });

        return () => {
            // When the component unmounts or user leaves, Supabase Presence
            // automatically broadcasts that this user is gone.
            supabase.removeChannel(channel);
        };
    }, [user]);

    // 4. MAPPING LOGIC: This is the most important part!
    // We don't trust the "is_online" column. We check if they are in liveOnlineIds.
    const usersWithCorrectStatus = profiles.map((p) => ({
        ...p,
        is_online: liveOnlineIds.has(p.user_id), // If their socket is active, they are online
    }));

    const onlineUsers = usersWithCorrectStatus.filter((u) => u.is_online);

    return {
        users: usersWithCorrectStatus,
        onlineUsers,
        totalCount: usersWithCorrectStatus.length,
        onlineCount: onlineUsers.length
    };
};