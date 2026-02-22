import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export type Profile = {
    user_id: string;
    name: string;
    username?: string;
    role: string;
    subscription?: string;
    avatar_url?: string;
    institution?: string;
    course?: string;
    specialization?: string;
    is_online: boolean;
};

export const useOnlineUsers = () => {
    const [users, setUsers] = useState<Profile[]>([]);

    useEffect(() => {
        let channel: any;

        const fetchUsers = async () => {
            // 1️⃣ Fetch initial users
            const { data, error } = await supabase
                .from<Profile>("profiles")
                .select(`
  user_id,
  name,
  username,
  role,
  subscription,
  avatar_url,
  institution,
  course,
  specialization,
  is_online
`);

            if (error) {
                console.error("Error fetching users:", error);
                return;
            }

            setUsers(data || []);

            // 2️⃣ Subscribe to changes in 'profiles'
            channel = supabase.channel("online-users");

            await channel
                .on(
                    "postgres_changes",
                    {
                        event: "*", // listen to insert, update, delete
                        schema: "public",
                        table: "profiles",
                    },
                    (payload: any) => {
                        const updated = payload.new as Profile;

                        setUsers((prev) => {
                            const exists = prev.find((u) => u.user_id === updated.user_id);
                            if (exists) {
                                // Update existing user
                                return prev.map((u) =>
                                    u.user_id === updated.user_id ? updated : u
                                );
                            } else {
                                // Add new user
                                return [...prev, updated];
                            }
                        });
                    }
                )
                .subscribe();
        };

        fetchUsers();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    const onlineUsers = users.filter((u) => u.is_online);

    return { users, onlineUsers };
};
