// src/components/school-wars/SchoolWarsCard.tsx
"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    Trophy,
    Share2,
    UserPlus,
    GraduationCap,
    Check,
    Loader2,
    ChevronRight,
    Users,
    TrendingUp,
    Crown,
    Sparkles,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { UserProfileModal } from "@/components/UserProfileModal";
import { InstitutionPicker } from "./InstitutionPicker";
import { AllSchoolsSheet } from "./AllSchoolsSheet";
import { SchoolStudentsSheet } from "./SchoolStudentsSheet";
import {
    CACHE_KEY,
    CURRENT_INSTITUTION_KEY,
    type LeaderboardRow,
    type CacheEnvelope,
    readCache,
    writeCache,
    isFresh,
    readCachedInstitution,
    writeCachedInstitution,
    prettyLabel,
} from "@/lib/school-wars/schoolWarsCache";

const POST_SAVE_STALE_MS = 30 * 1000;

interface Props {
    currentUserInstitution: string | null | undefined;
    onInstitutionChanged?: (slug: string) => void;
}

/* ─────────────────────────  SUBCOMPONENTS  ───────────────────────── */

function PodiumAvatar({
    row,
    size = "md",
    ring = false,
}: {
    row: LeaderboardRow;
    size?: "sm" | "md" | "lg";
    ring?: boolean;
}) {
    const dims =
        size === "lg" ? "w-16 h-16" : size === "sm" ? "w-10 h-10" : "w-12 h-12";
    const textSize =
        size === "lg" ? "text-lg" : size === "sm" ? "text-[11px]" : "text-sm";
    const label = prettyLabel(row.institution, row.institution_label);
    const initial = label.replace(/^university of /i, "").charAt(0).toUpperCase() || "?";
    return (
        <div
            className={`relative ${dims} rounded-full flex items-center justify-center ${textSize} font-extrabold text-white shadow-md shrink-0 ${ring ? "ring-[3px] ring-amber-400 dark:ring-amber-300 ring-offset-2 ring-offset-white dark:ring-offset-[#161b22]" : ""
                }`}
            style={{ background: gradientFor(row.institution) }}
        >
            {initial}
        </div>
    );
}

function gradientFor(seed: string): string {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
    const h2 = (h + 40) % 360;
    return `linear-gradient(135deg, hsl(${h} 70% 55%), hsl(${h2} 75% 45%))`;
}

function MedalBadge({ rank }: { rank: number }) {
    if (rank === 1) {
        return (
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-[#161b22]">
                <Crown className="w-3 h-3" fill="currentColor" />
            </div>
        );
    }
    if (rank === 2) {
        return (
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-slate-200 to-slate-500 text-white flex items-center justify-center text-[10px] font-extrabold shadow-md ring-2 ring-white dark:ring-[#161b22]">
                2
            </div>
        );
    }
    return (
        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-orange-300 to-orange-600 text-white flex items-center justify-center text-[10px] font-extrabold shadow-md ring-2 ring-white dark:ring-[#161b22]">
            3
        </div>
    );
}

/* ─────────────────────────  MAIN COMPONENT  ───────────────────────── */

export function SchoolWarsCard({ currentUserInstitution, onInstitutionChanged }: Props) {
    const initial = readCache();
    const cachedInstitution = readCachedInstitution();

    const [rows, setRows] = useState<LeaderboardRow[]>(initial?.data ?? []);
    const [loading, setLoading] = useState(!initial);
    const [dbRefreshedAt, setDbRefreshedAt] = useState<number | null>(
        initial?.dbRefreshedAt ?? null
    );

    const [localInstitution, setLocalInstitution] = useState<string | null>(cachedInstitution);

    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickedInstitution, setPickedInstitution] = useState<string>("");
    const [savingInstitution, setSavingInstitution] = useState(false);

    const [inviteMenuOpen, setInviteMenuOpen] = useState(false);

    const [allSchoolsOpen, setAllSchoolsOpen] = useState(false);
    const [studentsSheet, setStudentsSheet] = useState<{
        open: boolean;
        school: LeaderboardRow | null;
    }>({ open: false, school: null });
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    const lastSaveAtRef = useRef<number>(0);

    const effectiveInstitution = useMemo(() => {
        if (localInstitution) return localInstitution;
        if (currentUserInstitution && currentUserInstitution !== "other")
            return currentUserInstitution;
        return cachedInstitution;
    }, [localInstitution, currentUserInstitution, cachedInstitution]);

    useEffect(() => {
        writeCachedInstitution(effectiveInstitution);
    }, [effectiveInstitution]);

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

    const triggerCronRefresh = useCallback(async () => {
        try {
            const { error } = await supabase.rpc("refresh_school_wars_leaderboard");
            if (error) console.warn("[SchoolWars] cron refresh RPC failed:", error.message);
        } catch (err) {
            console.warn("[SchoolWars] cron refresh threw:", err);
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
            if (
                lastSaveAtRef.current &&
                Date.now() - lastSaveAtRef.current < 5 * 60 * 1000 &&
                dbRefreshedAt &&
                Date.now() - dbRefreshedAt > POST_SAVE_STALE_MS
            ) {
                fetchLeaderboard(true);
                return;
            }
            const cached = readCache();
            if (!cached) {
                fetchLeaderboard(true);
                return;
            }
            if (Date.now() - cached.ts > 5 * 60 * 1000) fetchLeaderboard(true);
        };

        document.addEventListener("visibilitychange", onFocus);
        window.addEventListener("focus", onFocus);
        return () => {
            document.removeEventListener("visibilitychange", onFocus);
            window.removeEventListener("focus", onFocus);
        };
    }, [fetchLeaderboard, dbRefreshedAt]);

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === CACHE_KEY && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue) as CacheEnvelope;
                    if (Array.isArray(parsed?.data)) {
                        setRows(parsed.data);
                        setDbRefreshedAt(parsed.dbRefreshedAt);
                    }
                } catch { }
            }
            if (e.key === CURRENT_INSTITUTION_KEY && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue) as { slug?: string };
                    if (parsed?.slug) setLocalInstitution(parsed.slug);
                } catch { }
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const mySchoolSlug =
        effectiveInstitution &&
            effectiveInstitution !== "other" &&
            rows.some((r) => r.institution === effectiveInstitution)
            ? effectiveInstitution
            : null;

    const mySchool = useMemo(
        () => (mySchoolSlug ? rows.find((r) => r.institution === mySchoolSlug) ?? null : null),
        [rows, mySchoolSlug]
    );

    const topScore = rows[0]?.school_score ?? 0;
    const champion = rows[0];

    const schoolLabelForInvites = useMemo(() => {
        if (mySchool) return prettyLabel(mySchool.institution, mySchool.institution_label);
        if (effectiveInstitution && effectiveInstitution !== "other") {
            return prettyLabel(effectiveInstitution, effectiveInstitution);
        }
        return null;
    }, [mySchool, effectiveInstitution]);

    const myRank = mySchool?.rank ?? null;
    const myScore = mySchool?.school_score ?? 0;
    const hasActivity = mySchool?.has_activity ?? false;
    const gap = Math.max(0, topScore - myScore);

    const buildInviteCoursemate = useCallback(() => {
        if (!schoolLabelForInvites) return null;
        const label = schoolLabelForInvites;
        const lines =
            myRank && myRank > 1 && gap > 0
                ? [
                    `${label} is ranked ${myRank} on Medrae's School Wars.`,
                    ``,
                    `We're ${gap.toFixed(1)}% behind first place — every quiz closes the gap.`,
                    ``,
                    `If you're already on Medrae, take a quiz this week:`,
                    `https://medrae.vercel.app/quiz`,
                    ``,
                    `Make sure your institution is set to "${label}".`,
                ]
                : [
                    `${label} is competing on Medrae's School Wars.`,
                    ``,
                    `Every quiz a student from ${label} completes adds to the score.`,
                    ``,
                    `Take a quiz this week:`,
                    `https://medrae.vercel.app/quiz`,
                ];
        return `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
    }, [schoolLabelForInvites, myRank, gap]);

    const buildInviteNewCampus = useCallback(() => {
        if (!schoolLabelForInvites) return null;
        const label = schoolLabelForInvites;
        const lines = [
            `Join me on Medrae — free nursing quizzes and exam prep.`,
            ``,
            `We're pushing ${label} up the School Wars leaderboard.`,
            `Sign up and pick "${label}" as your institution:`,
            `https://medrae.vercel.app/register`,
            ``,
            `Every quiz you complete counts for our school.`,
        ];
        return `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
    }, [schoolLabelForInvites]);

    const openInvite = (builder: () => string | null) => {
        const url = builder();
        if (url) window.open(url, "_blank");
        setInviteMenuOpen(false);
    };

    const handleSaveInstitution = useCallback(async () => {
        if (!pickedInstitution) {
            toast({
                title: "Pick a school first",
                description: "Choose from the list.",
                variant: "destructive",
            });
            return;
        }
        setSavingInstitution(true);
        try {
            const {
                data: { user },
                error: userErr,
            } = await supabase.auth.getUser();
            if (userErr || !user) throw new Error("Not signed in");

            const { error } = await supabase
                .from("profiles")
                .update({ institution: pickedInstitution })
                .eq("user_id", user.id);
            if (error) throw error;

            setLocalInstitution(pickedInstitution);
            writeCachedInstitution(pickedInstitution);
            lastSaveAtRef.current = Date.now();

            try {
                const raw = localStorage.getItem("userProfile");
                if (raw) {
                    const parsed = JSON.parse(raw);
                    parsed.institution = pickedInstitution;
                    localStorage.setItem("userProfile", JSON.stringify(parsed));
                }
            } catch { }

            window.dispatchEvent(
                new CustomEvent("profileUpdated", { detail: { institution: pickedInstitution } })
            );

            try {
                localStorage.removeItem(CACHE_KEY);
            } catch { }

            toast({
                title: "Institution set",
                description: `You're now competing for ${prettyLabel(pickedInstitution, pickedInstitution)}.`,
            });

            setPickerOpen(false);
            setPickedInstitution("");
            onInstitutionChanged?.(pickedInstitution);

            await triggerCronRefresh();
            await fetchLeaderboard(true);
        } catch (err: any) {
            toast({
                title: "Couldn't save",
                description: err?.message || "Please try again.",
                variant: "destructive",
            });
        } finally {
            setSavingInstitution(false);
        }
    }, [pickedInstitution, onInstitutionChanged, fetchLeaderboard, triggerCronRefresh]);

    const showInvite = !!schoolLabelForInvites;

    /* ─────────────────────────  LOADING  ───────────────────────── */
    if (loading) {
        return (
            <div className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-[#0d1117] dark:via-[#161b22] dark:to-[#0d1117]">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
                <div className="p-4 flex justify-around items-end gap-2">
                    {[56, 80, 56].map((h, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                            <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" style={{ height: h }} />
                        </div>
                    ))}
                </div>
                <div className="px-4 pb-4">
                    <div className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
            </div>
        );
    }

    /* ─────────────────────────  EMPTY  ───────────────────────── */
    if (rows.length === 0) {
        return (
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-5">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">School Wars</p>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                            This week
                        </p>
                    </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    The leaderboard is initialising. Complete a quiz to place your school on the board.
                </p>
            </div>
        );
    }

    /* ─────────────────────────  MAIN CARD  ───────────────────────── */

    const podium = rows.slice(0, 3);
    const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);
    const myRankIsPodium = myRank != null && myRank <= 3;

    return (
        <>
            {/* No borders anywhere on the card shell — pure color/gradient separation */}
            <div className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden shadow-sm">
                {/* ── HEADER (gradient band, no border) ── */}
                <div className="px-4 py-3 bg-gradient-to-r from-amber-50 via-white to-amber-50 dark:from-[#1a1408] dark:via-[#161b22] dark:to-[#1a1408]">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm shrink-0">
                                <Trophy className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-[13px] font-extrabold text-slate-900 dark:text-white tracking-tight truncate leading-tight">
                                    School Wars
                                </h3>
                                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400 leading-tight">
                                    This week
                                </p>
                            </div>
                        </div>

                        {showInvite && (
                            <div className="relative shrink-0">
                                <button
                                    onClick={() => setInviteMenuOpen((v) => !v)}
                                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-900 active:bg-black text-white dark:bg-white/10 dark:hover:bg-white/15 dark:active:bg-white/20 text-[11px] font-bold transition-colors"
                                >
                                    <Share2 className="w-3 h-3" />
                                    Invite
                                </button>
                                {inviteMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setInviteMenuOpen(false)} />
                                        {/* Overlay popover keeps ring — it's a floating surface, not the card */}
                                        <div className="absolute right-0 top-9 z-20 w-52 rounded-xl bg-white dark:bg-[#1f2630] overflow-hidden shadow-xl dark:shadow-black/50 ring-1 ring-black/5 dark:ring-white/10">
                                            <button
                                                onClick={() => openInvite(buildInviteCoursemate)}
                                                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                                            >
                                                <Share2 className="w-3.5 h-3.5 text-blue-500" />
                                                Invite coursemate
                                            </button>
                                            <div className="h-px bg-slate-100 dark:bg-white/5" />
                                            <button
                                                onClick={() => openInvite(buildInviteNewCampus)}
                                                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                                            >
                                                <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
                                                Invite new campus
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── SET INSTITUTION CTA (no border) ── */}
                {!showInvite && !pickerOpen && (
                    <div className="px-4 pt-4 pb-2">
                        <button
                            onClick={() => setPickerOpen(true)}
                            className="w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-bold px-3 py-2.5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-100 text-white dark:text-slate-900 hover:opacity-90 active:scale-[0.99] transition-all shadow-sm"
                        >
                            <GraduationCap className="w-4 h-4" />
                            Set your institution to compete
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-1.5">
                            Pick your school once — then invite coursemates.
                        </p>
                    </div>
                )}

                {/* ── PICKER (inner block, no border) ── */}
                {pickerOpen && (
                    <div className="px-4 pt-3 pb-3">
                        <div className="rounded-xl bg-slate-50 dark:bg-white/[0.04] p-3 space-y-2">
                            <div className="flex items-center gap-1.5">
                                <GraduationCap className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                    Set your institution
                                </p>
                            </div>
                            <InstitutionPicker value={pickedInstitution} onChange={setPickedInstitution} />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveInstitution}
                                    disabled={!pickedInstitution || savingInstitution}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-bold px-3 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {savingInstitution ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-3.5 h-3.5" /> Save & join
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setPickerOpen(false);
                                        setPickedInstitution("");
                                    }}
                                    className="px-3 py-2 rounded-lg text-[12px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── PODIUM (no borders on tiers, gradients only) ── */}
                <div className="px-4 pt-4 pb-3">
                    <div className="flex items-end justify-around gap-2">
                        {podiumOrder.map((row) => {
                            const isFirst = row.rank === 1;
                            const isMine = row.institution === mySchoolSlug;
                            const label = prettyLabel(row.institution, row.institution_label);
                            const tierHeight = isFirst ? "h-20" : row.rank === 2 ? "h-16" : "h-14";
                            const tierBg = isFirst
                                ? "bg-gradient-to-b from-amber-100 to-amber-200/70 dark:from-amber-500/20 dark:to-amber-500/10"
                                : row.rank === 2
                                    ? "bg-gradient-to-b from-slate-100 to-slate-200/70 dark:from-slate-500/15 dark:to-slate-500/5"
                                    : "bg-gradient-to-b from-orange-100 to-orange-200/70 dark:from-orange-500/15 dark:to-orange-500/5";

                            return (
                                <button
                                    key={row.institution}
                                    onClick={() => setStudentsSheet({ open: true, school: row })}
                                    className="flex-1 flex flex-col items-center group min-w-0"
                                >
                                    <div className="relative mb-1.5">
                                        <PodiumAvatar row={row} size={isFirst ? "lg" : "md"} ring={isFirst} />
                                        <MedalBadge rank={row.rank} />
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-900 dark:text-white text-center truncate w-full leading-tight">
                                        {label}
                                    </p>
                                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 tabular-nums mb-1">
                                        {row.has_activity ? `${row.school_score.toFixed(1)}%` : "—"}
                                    </p>
                                    <div
                                        className={`w-full ${tierHeight} rounded-t-xl ${tierBg} flex items-start justify-center pt-1.5 group-hover:brightness-105 transition-all`}
                                    >
                                        <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 tabular-nums">
                                            #{row.rank}
                                        </span>
                                    </div>
                                    {isMine && (
                                        <span className="mt-1 text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500 text-white">
                                            You
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── YOUR SCHOOL SPOTLIGHT (gradient fills, no borders) ── */}
                {mySchool ? (
                    <div className="px-4 pb-3">
                        <button
                            onClick={() => setStudentsSheet({ open: true, school: mySchool })}
                            className="w-full rounded-xl overflow-hidden text-left transition-transform active:scale-[0.995] group"
                        >
                            <div
                                className="relative px-3 py-3"
                                style={{
                                    background: myRankIsPodium
                                        ? "linear-gradient(135deg, hsl(45 90% 55%), hsl(35 90% 45%))"
                                        : "linear-gradient(135deg, #1e40af, #3b82f6)",
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                                        <span className="text-white text-sm font-extrabold tabular-nums">
                                            #{myRank}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                                                Your school
                                            </p>
                                            {myRankIsPodium && <Sparkles className="w-3 h-3 text-white/90" />}
                                        </div>
                                        <p className="text-[13px] font-extrabold text-white truncate leading-tight">
                                            {schoolLabelForInvites}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-[15px] font-extrabold text-white tabular-nums leading-none">
                                            {hasActivity ? `${myScore.toFixed(1)}%` : "—"}
                                        </p>
                                        {myRank && myRank > 1 && hasActivity && gap > 0 && (
                                            <p className="text-[10px] font-bold text-white/90 tabular-nums mt-0.5 inline-flex items-center gap-0.5">
                                                <TrendingUp className="w-2.5 h-2.5" />
                                                {gap.toFixed(1)}% behind
                                            </p>
                                        )}
                                        {myRank === 1 && (
                                            <p className="text-[10px] font-bold text-white/95 mt-0.5">
                                                Leading 🎉
                                            </p>
                                        )}
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-white/70 shrink-0" />
                                </div>
                            </div>
                        </button>
                    </div>
                ) : (
                    <div className="px-4 pb-3">
                        {/* Empty-slot CTA: replaces dashed border with a lighter inset gradient + reduced opacity */}
                        <button
                            onClick={() => setPickerOpen(true)}
                            className="w-full flex items-center gap-3 rounded-xl px-3 py-3 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-white/[0.05] dark:to-white/[0.02] hover:from-slate-200 hover:to-slate-100 dark:hover:from-white/[0.08] dark:hover:to-white/[0.04] transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-white/[0.08] flex items-center justify-center shrink-0 shadow-sm">
                                <GraduationCap className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-[12px] font-bold text-slate-900 dark:text-white">
                                    Set your institution
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                    Compete for your school
                                </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        </button>
                    </div>
                )}

                {/* ── FOOTER CTA (no border-top, use bg tone shift) ── */}
                <button
                    onClick={() => setAllSchoolsOpen(true)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/60 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] active:bg-slate-200 dark:active:bg-white/[0.08] transition-colors"
                >
                    <span className="flex items-center gap-2 text-[12px] font-bold text-blue-600 dark:text-blue-400">
                        <Users className="w-3.5 h-3.5" />
                        View all {rows.length} schools
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
                </button>
            </div>

            {/* ── SHEETS ── */}
            <AllSchoolsSheet
                open={allSchoolsOpen}
                onClose={() => setAllSchoolsOpen(false)}
                rows={rows}
                mySchoolSlug={mySchoolSlug}
                onPickSchool={(row) => {
                    setAllSchoolsOpen(false);
                    setTimeout(() => setStudentsSheet({ open: true, school: row }), 180);
                }}
            />

            <SchoolStudentsSheet
                open={studentsSheet.open}
                onClose={() => setStudentsSheet({ open: false, school: null })}
                school={studentsSheet.school}
                onPickStudent={(userId) => {
                    setStudentsSheet({ open: false, school: null });
                    setTimeout(() => setSelectedStudentId(userId), 180);
                }}
            />

            <UserProfileModal
                userId={selectedStudentId}
                onClose={() => setSelectedStudentId(null)}
            />
        </>
    );
}