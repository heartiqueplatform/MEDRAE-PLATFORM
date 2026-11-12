// src/staff-cpd/lib/contributor-hooks.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

/* ------------------------------------------------------------------ */
/*  Row types — exported so components can import them                */
/* ------------------------------------------------------------------ */

export interface WalletRow {
    balance: number;
    lifetime_earned: number;
    lifetime_withdrawn: number;
}

export interface TxRow {
    id: string;
    amount: number;
    balance_after: number;
    kind: string;
    reason: string | null;
    created_at: string;
}

export interface StaffProfile {
    name: string;
    is_verified_contributor: boolean;
    contributor_tier: string;
}

/* ------------------------------------------------------------------ */
/*  Wallet                                                            */
/* ------------------------------------------------------------------ */

export function useWallet(userId: string | null) {
    return useQuery({
        queryKey: ["medrae", "wallet", userId],
        enabled: !!userId,
        staleTime: 60_000, // 1 min — no refetch flash on remount
        queryFn: async (): Promise<WalletRow | null> => {
            const { data, error } = await supabase
                .from("medrae_coin_wallets")
                .select("balance, lifetime_earned, lifetime_withdrawn")
                .eq("user_id", userId)
                .maybeSingle();
            if (error) throw error;
            return (data ?? null) as WalletRow | null;
        },
    });
}

/* ------------------------------------------------------------------ */
/*  Recent transactions                                               */
/* ------------------------------------------------------------------ */

export function useRecentTransactions(userId: string | null, limit = 3) {
    return useQuery({
        queryKey: ["medrae", "tx", userId, limit],
        enabled: !!userId,
        staleTime: 60_000,
        queryFn: async (): Promise<TxRow[]> => {
            const { data, error } = await supabase
                .from("medrae_coin_transactions")
                .select("id, amount, balance_after, kind, reason, created_at")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(limit);
            if (error) throw error;
            return (data ?? []) as TxRow[];
        },
    });
}

/* ------------------------------------------------------------------ */
/*  Staff profile — gates the earnings card + verified badge          */
/* ------------------------------------------------------------------ */

export function useStaffProfile(userId: string | null) {
    return useQuery({
        queryKey: ["medrae", "staff-profile", userId],
        enabled: !!userId,
        staleTime: 5 * 60_000, // 5 min — profile rarely changes
        queryFn: async (): Promise<StaffProfile> => {
            const { data, error } = await supabase
                .from("profiles")
                .select("name, is_verified_contributor, contributor_tier")
                .eq("user_id", userId)
                .single();
            if (error) throw error;
            return data as StaffProfile;
        },
    });
}

/* ------------------------------------------------------------------ */
/*  Invalidation helper — call after awarding coins                   */
/* ------------------------------------------------------------------ */

export function useInvalidateWallet() {
    const qc = useQueryClient();
    return (userId: string) => {
        qc.invalidateQueries({ queryKey: ["medrae", "wallet", userId] });
        qc.invalidateQueries({ queryKey: ["medrae", "tx", userId] });
    };
}
/* ------------------------------------------------------------------ */
/*  Redemptions                                                       */
/* ------------------------------------------------------------------ */

export interface RedemptionRow {
    id: string;
    user_id: string;
    coins_amount: number;
    kes_amount: number;
    coin_to_kes_rate: number;
    status: "pending" | "approved" | "paid" | "rejected";
    mpesa_phone: string | null;
    review_notes: string | null;
    requested_at: string;
    reviewed_at: string | null;
    // joined when fetched by admin
    profile?: {
        name: string | null;
        email: string | null;
    } | null;
}

/** Current user's redemptions. */
export function useMyRedemptions(userId: string | null) {
    return useQuery({
        queryKey: ["medrae", "redemptions", "mine", userId],
        enabled: !!userId,
        staleTime: 30_000,
        queryFn: async (): Promise<RedemptionRow[]> => {
            const { data, error } = await supabase
                .from("medrae_coin_redemptions")
                .select(
                    "id, user_id, coins_amount, kes_amount, coin_to_kes_rate, status, mpesa_phone, review_notes, requested_at, reviewed_at"
                )
                .eq("user_id", userId)
                .order("requested_at", { ascending: false });
            if (error) throw error;
            return (data ?? []) as RedemptionRow[];
        },
    });
}

/** All redemptions (admin). Optional status filter. */
export function useAdminRedemptions(
    status: "pending" | "approved" | "paid" | "rejected" | "all" = "pending"
) {
    return useQuery({
        queryKey: ["medrae", "redemptions", "admin", status],
        staleTime: 10_000,
        queryFn: async (): Promise<RedemptionRow[]> => {
            let q = supabase
                .from("medrae_coin_redemptions")
                .select(
                    `id, user_id, coins_amount, kes_amount, coin_to_kes_rate, status,
                     mpesa_phone, review_notes, requested_at, reviewed_at,
                     profile:profiles!medrae_coin_redemptions_user_id_fkey (name, email)`
                )
                .order("requested_at", { ascending: false });
            if (status !== "all") q = q.eq("status", status);
            const { data, error } = await q;
            if (error) throw error;
            return (data ?? []) as unknown as RedemptionRow[];
        },
    });
}