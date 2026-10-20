"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { institutions } from "@/components/forms/institutions.data";
import { Trophy } from "lucide-react";
const CACHE_KEY = "school_wars_leaderboard_v8";
const CACHE_TTL_MS = 15 * 60 * 1000;
const HARD_STALE_MS = 6 * 60 * 60 * 1000;
const VISIBLE_ROWS = 5;

// Atmosphere strip — swap these for class-life photos when ready
// (currently points to your existing public/ high*.png images)
const ATMOSPHERE_IMAGES = [
    "/high7.png",
    "/high8.png",
    "/high9.png",
    "/high10.png",

];
type LeaderboardRow = {
    rank: number;
    institution: string;
    institution_label: string;
    member_count: number;
    total_attempts: number;
    school_score: number;
    top_score: number;
    last_activity: string | null;
    has_activity: boolean;
};

type CacheEnvelope = {
    data: LeaderboardRow[];
    ts: number;
    dbRefreshedAt: number | null;
};

function readCache(): CacheEnvelope | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CacheEnvelope;
        if (!Array.isArray(parsed?.data)) return null;
        if (Date.now() - parsed.ts > HARD_STALE_MS) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function writeCache(data: LeaderboardRow[], dbRefreshedAt: number | null) {
    try {
        const envelope: CacheEnvelope = { data, ts: Date.now(), dbRefreshedAt };
        localStorage.setItem(CACHE_KEY, JSON.stringify(envelope));
    } catch { }
}

function isFresh(env: CacheEnvelope | null): boolean {
    if (!env) return false;
    return Date.now() - env.ts < CACHE_TTL_MS;
}

function prettyLabel(slug: string, fallback: string): string {
    const found = institutions.find((i) => i.value === slug);
    return found?.label ?? fallback;
}

interface Props {
    currentUserInstitution: string | null | undefined;
}

export function SchoolWarsCard({ currentUserInstitution }: Props) {
    const initial = readCache();
    const [rows, setRows] = useState<LeaderboardRow[]>(initial?.data ?? []);
    const [loading, setLoading] = useState(!initial);
    const [dbRefreshedAt, setDbRefreshedAt] = useState<number | null>(
        initial?.dbRefreshedAt ?? null
    );
    const [expanded, setExpanded] = useState(false);

    const fetchLeaderboard = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);

        try {
            const { data, error } = await supabase
                .from("school_wars_leaderboard")
                .select(
                    "rank, institution, institution_label, member_count, total_attempts, school_score, top_score, last_activity, has_activity, refreshed_at"
                )
                .order("rank", { ascending: true })
                .limit(100);

            if (error) throw error;

            const clean: LeaderboardRow[] = (data ?? []).map((r: any) => ({
                rank: Number(r.rank),
                institution: r.institution,
                institution_label: r.institution_label,
                member_count: Number(r.member_count),
                total_attempts: Number(r.total_attempts),
                school_score: Number(r.school_score),
                top_score: Number(r.top_score),
                last_activity: r.last_activity,
                has_activity: Boolean(r.has_activity),
            }));

            const refreshedAt =
                data && data.length > 0 && data[0].refreshed_at
                    ? new Date(data[0].refreshed_at).getTime()
                    : Date.now();

            setRows(clean);
            setDbRefreshedAt(refreshedAt);
            writeCache(clean, refreshedAt);
        } catch (err) {
            console.warn("[SchoolWars] fetch failed:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const cached = readCache();
        if (cached) {
            setRows(cached.data);
            setDbRefreshedAt(cached.dbRefreshedAt);
            setLoading(false);
            if (!isFresh(cached)) fetchLeaderboard(true);
        } else {
            fetchLeaderboard(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const onFocus = () => {
            if (document.visibilityState !== "visible") return;
            const cached = readCache();
            if (!cached) {
                fetchLeaderboard(true);
                return;
            }
            const age = Date.now() - cached.ts;
            if (age > 5 * 60 * 1000) fetchLeaderboard(true);
        };

        document.addEventListener("visibilitychange", onFocus);
        window.addEventListener("focus", onFocus);
        return () => {
            document.removeEventListener("visibilitychange", onFocus);
            window.removeEventListener("focus", onFocus);
        };
    }, [fetchLeaderboard]);

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key !== CACHE_KEY || !e.newValue) return;
            try {
                const parsed = JSON.parse(e.newValue) as CacheEnvelope;
                if (Array.isArray(parsed?.data)) {
                    setRows(parsed.data);
                    setDbRefreshedAt(parsed.dbRefreshedAt);
                }
            } catch { }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const handleInvite = (
        slug: string,
        rank: number,
        schoolScore: number,
        topScore: number,
        isMySchool: boolean
    ) => {
        const label = prettyLabel(slug, slug);
        const gap = topScore - schoolScore;
        const pickWord = isMySchool ? "our school" : "that campus";

        const lines =
            gap > 0 && rank > 1
                ? [
                    `${label} is ranked #${rank} on Medrae and we're ${gap.toFixed(
                        1
                    )}% behind #1.`,
                    ``,
                    `That gap closes if more of us take quizzes. Join and help ${pickWord} climb:`,
                    `https://medrae.vercel.app/register`,
                    ``,
                    `Pick "${label}" as your institution when you sign up. Every quiz you complete counts.`,
                ]
                : [
                    `${label} is ranked #${rank} on Medrae's School Wars leaderboard.`,
                    ``,
                    `Every quiz a student from ${pickWord} completes adds to the score. Join and help:`,
                    `https://medrae.vercel.app/register`,
                    ``,
                    `Pick "${label}" as your institution when you sign up.`,
                ];

        window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
    };

    const { visibleRows, restRows, hasHiddenRows } = useMemo(() => {
        const top5 = rows.slice(0, VISIBLE_ROWS);
        const rest = rows.slice(VISIBLE_ROWS);

        const hasRealInstitution =
            currentUserInstitution &&
            currentUserInstitution !== "other" &&
            rows.some((r) => r.institution === currentUserInstitution);

        if (!hasRealInstitution) {
            return {
                visibleRows: top5,
                restRows: rest,
                hasHiddenRows: rest.length > 0,
            };
        }

        const mineInTop5 = top5.some(
            (r) => r.institution === currentUserInstitution
        );
        if (mineInTop5) {
            return {
                visibleRows: top5,
                restRows: rest,
                hasHiddenRows: rest.length > 0,
            };
        }

        const mine = rows.find((r) => r.institution === currentUserInstitution)!;
        const lastTop5 = top5[VISIBLE_ROWS - 1];

        const swappedTop5 = [...top5.slice(0, VISIBLE_ROWS - 1), mine];
        const newRest = [lastTop5, ...rest].filter(
            (r) => r.institution !== currentUserInstitution
        );

        return {
            visibleRows: swappedTop5,
            restRows: newRest,
            hasHiddenRows: newRest.length > 0,
        };
    }, [rows, currentUserInstitution]);

    const timeAgo = useMemo(() => {
        if (!dbRefreshedAt) return null;
        const ms = Date.now() - dbRefreshedAt;
        if (ms < 60_000) return "just now";
        const min = Math.floor(ms / 60_000);
        if (min < 60) return `${min}m ago`;
        const hr = Math.floor(min / 60);
        return `${hr}h ago`;
    }, [dbRefreshedAt]);

    if (!loading && rows.length === 0) {
        return (
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-5">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    School Wars
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    The leaderboard is initialising. Complete a quiz to place your school on the board.
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-5 animate-pulse">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl mb-2" />
                ))}
            </div>
        );
    }

    const topScore = rows[0]?.school_score ?? 0;
    const activeSchools = rows.filter((r) => r.has_activity).length;
    const champion = rows[0];

    // ── Champion (rank 1) gets a special block ──
    // ── Champion (rank 1) — share-worthy card, theme-aware ──
    const renderChampion = (row: LeaderboardRow) => {
        const isMine = row.institution === currentUserInstitution;
        const label = prettyLabel(row.institution, row.institution_label);

        return (
            <div
                key={row.institution}
                className="relative px-4 py-5 overflow-hidden
                           bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50
                           dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-orange-950/30
                           border-y border-amber-200/60 dark:border-amber-800/40"
            >
                {/* Radial gold glow — top-right */}
                <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-amber-400/20 dark:bg-amber-500/10 blur-3xl pointer-events-none" />
                {/* Radial white glow — bottom-left */}
                <div className="absolute -bottom-20 -left-16 w-48 h-48 rounded-full bg-white/40 dark:bg-amber-400/5 blur-3xl pointer-events-none" />

                <div className="relative">
                    {/* ── Eyebrow: "Champion" ── */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest
                                         text-amber-700 dark:text-amber-300
                                         bg-amber-200/70 dark:bg-amber-500/20
                                         px-2 py-1 rounded-md">
                            <Trophy size={11} />
                            Champion
                        </span>
                        {isMine && (
                            <span className="text-[10px] font-bold uppercase tracking-widest
                                             text-amber-800 dark:text-amber-200">
                                Your school
                            </span>
                        )}
                    </div>

                    {/* ── School name + score ── */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight truncate">
                                {label}
                            </h4>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 font-medium">
                                {row.member_count} student{row.member_count === 1 ? "" : "s"}
                                {row.has_activity && ` · ${row.total_attempts} quiz${row.total_attempts === 1 ? "" : "zes"}`}
                            </p>
                        </div>

                        {row.has_activity && (
                            <div className="shrink-0 text-right">
                                <div className="text-3xl font-black text-amber-600 dark:text-amber-400 tabular-nums leading-none">
                                    {row.school_score.toFixed(1)}
                                    <span className="text-base font-bold ml-0.5">%</span>
                                </div>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700/70 dark:text-amber-300/70 mt-1">
                                    Avg score
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ── Tagline + CTA ── */}
                    <div className="mt-4 flex items-center justify-between gap-3">
                        <p className={`text-[11px] leading-snug flex-1 ${isMine
                            ? "text-amber-800 dark:text-amber-200 font-semibold"
                            : "text-slate-600 dark:text-slate-300"
                            }`}>
                            {isMine
                                ? "You're leading. Hold the position."
                                : "Current leader. Every quiz extends the gap."}
                        </p>

                        <button
                            onClick={() =>
                                handleInvite(
                                    row.institution,
                                    row.rank,
                                    row.school_score,
                                    topScore,
                                    isMine
                                )
                            }
                            className="shrink-0 text-[12px] font-bold px-3.5 py-2 rounded-lg
                                       bg-amber-500 hover:bg-amber-600 active:bg-amber-700
                                       text-white shadow-sm shadow-amber-500/30
                                       transition-colors"
                        >
                            {isMine ? "Invite coursemate" : "Invite campus"}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ── Standard row (ranks 2+) ──
    const renderRow = (row: LeaderboardRow) => {
        const isMine = row.institution === currentUserInstitution;
        const label = prettyLabel(row.institution, row.institution_label);
        const gap =
            isMine && row.rank > 1 && row.has_activity
                ? (topScore - row.school_score).toFixed(1)
                : null;

        return (
            <div
                key={row.institution}
                className={
                    isMine
                        ? "bg-slate-50 dark:bg-[#1f2630] px-4 py-3"
                        : "px-4 py-3 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                }
            >
                <div className="flex items-start gap-3">
                    <div className="w-7 shrink-0 pt-0.5">
                        <span
                            className={`text-sm font-semibold tabular-nums ${row.rank <= 3
                                ? "text-slate-900 dark:text-white"
                                : "text-slate-400 dark:text-slate-500"
                                }`}
                        >
                            {row.rank}
                        </span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {label}
                            </p>
                            {isMine && (
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Your school
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {row.member_count} student
                            {row.member_count === 1 ? "" : "s"}
                            {row.has_activity
                                ? ` \u00B7 ${row.total_attempts} quiz${row.total_attempts === 1 ? "" : "zes"
                                }`
                                : " \u00B7 no activity yet"}
                        </p>
                    </div>

                    <div className="shrink-0 text-right pt-0.5">
                        {row.has_activity ? (
                            <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                                {row.school_score.toFixed(1)}
                                <span className="text-slate-400 dark:text-slate-500 font-normal ml-0.5">
                                    %
                                </span>
                            </span>
                        ) : (
                            <span className="text-xs text-slate-300 dark:text-slate-600 tabular-nums">
                                —
                            </span>
                        )}
                    </div>
                </div>

                <div className="mt-2 pl-10 flex items-center justify-between gap-3">
                    <p
                        className={`text-[11px] leading-snug flex-1 ${isMine && gap
                            ? "text-orange-600 dark:text-orange-400 font-medium"
                            : isMine && row.rank === 1
                                ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                : !row.has_activity && isMine
                                    ? "text-amber-600 dark:text-amber-400 font-medium"
                                    : "text-slate-400 dark:text-slate-500"
                            }`}
                    >
                        {gap ? (
                            <>{gap}% behind #1. Every quiz closes the gap.</>
                        ) : !row.has_activity && isMine ? (
                            <>No one from your school has quizzed yet. Be the first.</>
                        ) : !row.has_activity ? (
                            <>Awaiting first quiz.</>
                        ) : (
                            <>&nbsp;</>
                        )}
                    </p>

                    <button
                        onClick={() =>
                            handleInvite(
                                row.institution,
                                row.rank,
                                row.school_score,
                                topScore,
                                isMine
                            )
                        }
                        className="shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors"
                    >
                        {isMine ? "Invite coursemate" : "Invite campus"}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">

            {/* ─── Atmosphere strip ─── */}
            <div className="relative h-20 bg-slate-100 dark:bg-[#0d1117]">
                {/* Images layer — behind everything */}
                <div className="absolute inset-0 flex">
                    {ATMOSPHERE_IMAGES.map((src, i) => (
                        <div
                            key={src}
                            className="flex-1 relative overflow-hidden"
                            style={{
                                marginLeft: i === 0 ? 0 : "-8px",
                                zIndex: ATMOSPHERE_IMAGES.length - i,
                            }}
                        >
                            <img
                                src={src}
                                alt=""
                                aria-hidden
                                loading="lazy"
                                onError={(e) => {
                                    // If image fails to load, hide it (leaves the slate bg showing)
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                                className="w-full h-full object-cover"
                                style={{
                                    maskImage:
                                        "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
                                    WebkitMaskImage:
                                        "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Single subtle gradient — bottom fade only */}
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent dark:from-[#161b22]" />

                {/* Title — sits ON TOP with z-index */}
                <div className="absolute bottom-2 left-4 right-4 z-10">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
                        School Wars
                    </h3>
                </div>
            </div>

            {/* ─── Header meta ─── */}
            <div className="px-4 pt-3 pb-3">
                <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        This week
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider tabular-nums">
                        {activeSchools} of {rows.length} active
                    </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Nursing schools ranked by average quiz performance. Resets Sunday, 9PM.
                </p>
            </div>

            {/* ─── Champion (rank 1) ─── */}
            {champion && renderChampion(champion)}

            {/* ─── Ranks 2–5 (or user swap-in) ─── */}
            <div>
                {visibleRows
                    .filter((r) => r.institution !== champion?.institution)
                    .map(renderRow)}
            </div>

            {/* ─── Expand / collapse ─── */}
            {hasHiddenRows && (
                <div className="px-4 py-3 border-t border-slate-100 dark:border-white/[0.06]">
                    <button
                        onClick={() => setExpanded((e) => !e)}
                        className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                        {expanded ? "Hide full ranking" : `See all ${rows.length} schools`}
                    </button>
                </div>
            )}

            {expanded && restRows.length > 0 && (
                <div className="max-h-[320px] overflow-y-auto border-t border-slate-100 dark:border-white/[0.06]">
                    {restRows.map(renderRow)}
                </div>
            )}

            {/* ─── Footer ─── */}
            {timeAgo && (
                <div className="px-4 py-3 border-t border-slate-100 dark:border-white/[0.06]">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        Standings updated {timeAgo}
                    </p>
                </div>
            )}
        </div>
    );
}