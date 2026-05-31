import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

export function useStreak() {
    const user = useUser();
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        if (!user?.id) return;

        const fetch = async () => {
            const { data } = await supabase
                .from("login_activity")
                .select("streak")
                .eq("user_id", user.id)
                .order("login_date", { ascending: false })
                .limit(1)
                .single();

            if (data) setStreak(data.streak || 0);
        };

        fetch();
    }, [user?.id]);

    return streak;
}