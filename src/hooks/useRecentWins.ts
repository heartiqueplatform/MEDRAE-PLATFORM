import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface RecentWin {
    challenge_id: string;
    winner_id: string;
    winner_name: string;
    winner_username: string;
    winner_avatar: string | null;
    won_at: string;
}

const CACHE_KEY = "recent_duel_wins_v1";
const CACHE_TTL = 60 * 1000; // 1 min — this is a "live feed", keep it fresh

function readCache(): RecentWin[] | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL) return null;
        return data;
    } catch { return null; }
}

function writeCache(data: RecentWin[]) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
    } catch { /* ignore */ }
}

export function useRecentWins() {
    const [wins, setWins] = useState<RecentWin[]>(() => readCache() ?? []);
    const [loading, setLoading] = useState(() => readCache() === null);

    const refresh = useCallback(async (silent = false) => {
        if (!silent && readCache() === null) setLoading(true);
        try {
            const { data, error } = await supabase.rpc("get_recent_duel_wins", { lim: 10 });
            if (error) throw error;
            const list = (data ?? []) as RecentWin[];
            setWins(list);
            writeCache(list);
        } catch {
            /* keep cache */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh(readCache() !== null);

        const onVis = () => {
            if (document.visibilityState === "visible") refresh(true);
        };
        document.addEventListener("visibilitychange", onVis);
        const id = setInterval(() => refresh(true), 60_000);
        return () => {
            document.removeEventListener("visibilitychange", onVis);
            clearInterval(id);
        };
    }, [refresh]);

    return { wins, loading, refresh };
}