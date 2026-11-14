// src/pages/studentcoins/useWalletData.ts

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";
import { toast } from "sonner";
import type {
    WalletPageData,
    Reward,
} from "./types";

export function useWalletData() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<WalletPageData | null>(null);
    const [rewards, setRewards] = useState<Reward[]>([]);

    const load = useCallback(
        async (silent = false) => {
            if (!user?.id) return;
            if (!silent) setLoading(true);
            else setRefreshing(true);

            try {
                const [pageRes, rewardsRes] = await Promise.all([
                    supabase.rpc("get_wallet_page", { p_user_id: user.id }),
                    supabase.rpc("get_active_rewards"),
                ]);

                if (pageRes.error) throw pageRes.error;

                const d = pageRes.data || {};
                setData({
                    wallet: d.wallet ?? null,
                    config: d.config ?? null,
                    enrollment: d.enrollment ?? null,
                    today_earned: Number(d.today_earned) || 0,
                    week_earned: Number(d.week_earned) || 0,
                    recent: Array.isArray(d.recent) ? d.recent : [],
                    redemptions: Array.isArray(d.redemptions) ? d.redemptions : [],
                });

                if (rewardsRes.data) {
                    setRewards(rewardsRes.data as Reward[]);
                }
            } catch (err) {
                console.error("[Wallet] load failed:", err);
                toast.error("Could not load wallet");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [user?.id]
    );

    useEffect(() => {
        load();
    }, [load]);

    return {
        user,
        loading,
        refreshing,
        data,
        rewards,
        refresh: () => load(true),
    };
}