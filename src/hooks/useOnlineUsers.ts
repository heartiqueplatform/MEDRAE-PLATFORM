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
    is_online: boolean;
};

export const useOnlineUsers = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<Profile[]>([]);

    useEffect(() => {
        if (!user) return;

        let channel: any;

        // Fetch initial users immediately
        supabase
            .from<Profile>("profiles")
            .select(`
        user_id,
        name,
        username,
        role,
        avatar_url,
        institution,
        course,
        specialization,
        is_online
      `)
            .then(({ data, error }) => {
                if (error) {
                    console.error("Error fetching users:", error);
                    return;
                }
                if (data) setUsers(data); // instant set
            });

        // Subscribe to real-time changes
        channel = supabase.channel("online-users");

        channel
            .on(
                "postgres_changes",
                {
                    event: "*", // insert, update, delete
                    schema: "public",
                    table: "profiles",
                },
                (payload: any) => {
                    const updated = payload.new as Profile;
                    setUsers((prev) => {
                        const exists = prev.find((u) => u.user_id === updated.user_id);
                        if (exists) {
                            return prev.map((u) =>
                                u.user_id === updated.user_id ? updated : u
                            );
                        } else {
                            return [...prev, updated];
                        }
                    });
                }
            )
            .subscribe();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [user]);

    const onlineUsers = users.filter((u) => u.is_online);

    return { users, onlineUsers };
};