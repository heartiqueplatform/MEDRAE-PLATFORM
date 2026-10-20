"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { institutions } from "@/components/forms/institutions.data";
import {
    Trophy,
    Share2,
    UserPlus,
    ArrowUpRight,
    Search,
    X,
    GraduationCap,
    Check,
    Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const CACHE_KEY = "school_wars_leaderboard_v8";
const CURRENT_INSTITUTION_KEY = "school_wars_current_institution_v1";
const CACHE_TTL_MS = 15 * 60 * 1000;
const HARD_STALE_MS = 6 * 60 * 60 * 1000;
const POST_SAVE_STALE_MS = 30 * 1000; // force refetch if snapshot is older than this after a save
const VISIBLE_ROWS = 5;

const ATMOSPHERE_IMAGES = [
    "/high7.png",
    "/high8.png",
    "/background03.jpg",
    "/background02.jpg",
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

// ─── localStorage helpers ───────────────────────────────────────────────
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

// ─── Institution cache (so we never flash "Set institution" on reload) ──
function readCachedInstitution(): string | null {
    try {
        const raw = localStorage.getItem(CURRENT_INSTITUTION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { slug?: string; ts?: number };
        if (!parsed?.slug) return null;
        // Institution is stable — no TTL needed, but cap at 30 days for safety
        if (parsed.ts && Date.now() - parsed.ts > 30 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem(CURRENT_INSTITUTION_KEY);
            return null;
        }
        return parsed.slug;
    } catch {
        return null;
    }
}

function writeCachedInstitution(slug: string | null) {
    try {
        if (!slug || slug === "other") {
            localStorage.removeItem(CURRENT_INSTITUTION_KEY);
            return;
        }
        localStorage.setItem(
            CURRENT_INSTITUTION_KEY,
            JSON.stringify({ slug, ts: Date.now() })
        );
    } catch { }
}

function prettyLabel(slug: string, fallback: string): string {
    const found = institutions.find((i) => i.value === slug);
    return found?.label ?? fallback;
}

// ─── Institution picker ─────────────────────────────────────────────────
function InstitutionPicker({
    value,
    onChange,
    hasError,
}: {
    value: string;
    onChange: (v: string) => void;
    hasError?: boolean;
}) {
    const [query, setQuery] = useState("");
    const selected = institutions.find((i) => i.value === value);

    const grouped = useMemo(() => {
        const term = query.trim().toLowerCase();
        const filtered = term
            ? institutions.filter(
                (i) =>
                    i.label.toLowerCase().includes(term) ||
                    i.value.toLowerCase().includes(term)
            )
            : institutions;

        const tags = [
            { tag: "kmtc", title: "KMTC Campuses", items: filtered.filter((i) => i.tag === "kmtc") },
            { tag: "university", title: "Universities", items: filtered.filter((i) => i.tag === "university") },
            { tag: "hospital", title: "Hospital / Mission / Nursing Colleges", items: filtered.filter((i) => i.tag === "hospital") },
            { tag: "other", title: "Other Colleges", items: filtered.filter((i) => i.tag === "other") },
        ];
        return tags.filter((t) => t.items.length > 0);
    }, [query]);

    return (
        <Select value={value || ""} onValueChange={onChange}>
            <SelectTrigger
                className={`text-xs md:text-sm h-10 md:h-11 w-full bg-white dark:bg-[#1f2630] ${hasError ? "border-destructive" : ""
                    }`}
            >
                <SelectValue placeholder="Search or choose institution">
                    {selected?.label ?? ""}
                </SelectValue>
            </SelectTrigger>

            <SelectContent className="max-h-[340px] p-0">
                <div className="sticky -top-2 z-10 bg-popover border-b border-border p-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Search e.g. 'KMTC Nakuru'"
                            className="w-full pl-9 pr-8 py-2.5 rounded-none bg-transparent border-0 text-xs md:text-sm outline-none focus:ring-0"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-accent"
                            >
                                <X className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="py-1">
                    {grouped.length === 0 ? (
                        <div className="p-6 text-center text-xs md:text-sm text-muted-foreground">
                            No institution matches "{query}"
                        </div>
                    ) : (
                        grouped.map((group) => (
                            <div key={group.tag}>
                                <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50">
                                    {group.title} ({group.items.length})
                                </div>
                                {group.items.map((inst) => (
                                    <SelectItem
                                        key={inst.value}
                                        value={inst.value}
                                        className="text-xs md:text-sm"
                                    >
                                        {inst.label}
                                    </SelectItem>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </SelectContent>
        </Select>
    );
}

interface Props {
    currentUserInstitution: string | null | undefined;
    onInstitutionChanged?: (slug: string) => void;
}

export function SchoolWarsCard({
    currentUserInstitution,
    onInstitutionChanged,
}: Props) {
    const initial = readCache();

    // ── Synchronous boot: prefer cached institution so there's no flash ──
    const cachedInstitution = readCachedInstitution();

    const [rows, setRows] = useState<LeaderboardRow[]>(initial?.data ?? []);
    const [loading, setLoading] = useState(!initial);
    const [dbRefreshedAt, setDbRefreshedAt] = useState<number | null>(
        initial?.dbRefreshedAt ?? null
    );
    const [expanded, setExpanded] = useState(false);

    // Local institution override — seeded from cache so first paint is correct
    const [localInstitution, setLocalInstitution] = useState<string | null>(
        cachedInstitution
    );

    // Picker state
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickedInstitution, setPickedInstitution] = useState<string>("");
    const [savingInstitution, setSavingInstitution] = useState(false);

    // Track last save for post-save staleness check
    const lastSaveAtRef = useRef<number>(0);

    // ── Effective institution: local override > prop > cached ──
    const effectiveInstitution = useMemo(() => {
        if (localInstitution) return localInstitution;
        if (currentUserInstitution && currentUserInstitution !== "other")
            return currentUserInstitution;
        return cachedInstitution;
    }, [localInstitution, currentUserInstitution, cachedInstitution]);

    // Keep cache in sync whenever effectiveInstitution changes
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

    // ── Trigger the DB cron/refresh function so a new school appears ──
    const triggerCronRefresh = useCallback(async () => {
        try {
            // Adjust the RPC name to match your Supabase function.
            // Common names: "refresh_school_wars_leaderboard", "refresh_leaderboard"
            const { error } = await supabase.rpc("refresh_school_wars_leaderboard");
            if (error) {
                // Non-fatal: cron will catch up on its own schedule
                console.warn("[SchoolWars] cron refresh RPC failed:", error.message);
            }
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

            // If we recently saved an institution, force a refetch if the
            // snapshot is old enough that the cron may have already updated.
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
    const activeSchools = rows.filter((r) => r.has_activity).length;
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

    // ─── Invite coursemate (already on Medrae) ──────────────────────────
    const buildInviteCoursemate = useCallback(() => {
        if (!schoolLabelForInvites) return null;
        const label = schoolLabelForInvites;
        const gap = topScore - myScore;
        const lines =
            myRank && myRank > 1 && gap > 0
                ? [
                    `${label} is ranked #${myRank} on Medrae's School Wars.`,
                    ``,
                    `We're ${gap.toFixed(1)}% behind #1 — every quiz closes the gap.`,
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
    }, [schoolLabelForInvites, myRank, myScore, topScore]);

    // ─── Invite new campus (not on Medrae yet) ──────────────────────────
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
    };

    // ─── Inline institution save ────────────────────────────────────────
    const handleSaveInstitution = useCallback(async () => {
        if (!pickedInstitution) {
            toast({
                title: "Pick a school first",
                description: "Choose your institution from the list.",
                variant: "destructive",
            });
            return;
        }
        const known = institutions.some((i) => i.value === pickedInstitution);
        if (!known) {
            toast({
                title: "Invalid institution",
                description: "Please select from the dropdown list.",
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

            // ── Persist everywhere ──
            // 1. Local override (instant UI flip)
            setLocalInstitution(pickedInstitution);
            // 2. Institution cache (survives reloads, no flash)
            writeCachedInstitution(pickedInstitution);
            // 3. Mark the save time for post-save staleness
            lastSaveAtRef.current = Date.now();

            // 4. Sync userProfile cache
            try {
                const raw = localStorage.getItem("userProfile");
                if (raw) {
                    const parsed = JSON.parse(raw);
                    parsed.institution = pickedInstitution;
                    localStorage.setItem("userProfile", JSON.stringify(parsed));
                }
            } catch { }
            window.dispatchEvent(
                new CustomEvent("profileUpdated", {
                    detail: { institution: pickedInstitution },
                })
            );

            // 5. Invalidate leaderboard cache so a refetch pulls the new row
            try {
                localStorage.removeItem(CACHE_KEY);
            } catch { }

            toast({
                title: "Institution set",
                description: `You're now competing for ${prettyLabel(
                    pickedInstitution,
                    pickedInstitution
                )}.`,
            });

            setPickerOpen(false);
            setPickedInstitution("");
            onInstitutionChanged?.(pickedInstitution);

            // 6. Ask the DB to recompute the leaderboard immediately
            await triggerCronRefresh();

            // 7. Refetch fresh rows
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

    // ─── Row slicing ────────────────────────────────────────────────────
    const { visibleRows, restRows, hasHiddenRows } = useMemo(() => {
        const top5 = rows.slice(0, VISIBLE_ROWS);
        const rest = rows.slice(VISIBLE_ROWS);

        if (!mySchoolSlug) {
            return {
                visibleRows: top5,
                restRows: rest,
                hasHiddenRows: rest.length > 0,
            };
        }

        const mineInTop5 = top5.some((r) => r.institution === mySchoolSlug);
        if (mineInTop5) {
            return {
                visibleRows: top5,
                restRows: rest,
                hasHiddenRows: rest.length > 0,
            };
        }

        const mine = rows.find((r) => r.institution === mySchoolSlug)!;
        const lastTop5 = top5[VISIBLE_ROWS - 1];
        const swappedTop5 = [...top5.slice(0, VISIBLE_ROWS - 1), mine];
        const newRest = [lastTop5, ...rest].filter(
            (r) => r.institution !== mySchoolSlug
        );

        return {
            visibleRows: swappedTop5,
            restRows: newRest,
            hasHiddenRows: newRest.length > 0,
        };
    }, [rows, mySchoolSlug]);

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

    const renderChampion = (row: LeaderboardRow) => {
        const isMine = row.institution === mySchoolSlug;
        const label = prettyLabel(row.institution, row.institution_label);

        return (
            <div
                key={row.institution}
                className="relative px-4 py-5 overflow-hidden
                           bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50
                           dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-orange-950/30
                           border-y border-amber-200/60 dark:border-amber-800/40"
            >
                <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-amber-400/20 dark:bg-amber-500/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-16 w-48 h-48 rounded-full bg-white/40 dark:bg-amber-400/5 blur-3xl pointer-events-none" />

                <div className="relative">
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
                </div>
            </div>
        );
    };

    const renderRow = (row: LeaderboardRow) => {
        const isMine = row.institution === mySchoolSlug;
        const label = prettyLabel(row.institution, row.institution_label);

        return (
            <div
                key={row.institution}
                className={
                    isMine
                        ? "bg-slate-50 dark:bg-[#1f2630] px-4 py-3 border-l-2 border-blue-500"
                        : "px-4 py-3 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                }
            >
                <div className="flex items-center gap-3">
                    <div className="w-7 shrink-0">
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
                                <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                    Your school
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {row.member_count} student{row.member_count === 1 ? "" : "s"}
                            {row.has_activity
                                ? ` \u00B7 ${row.total_attempts} quiz${row.total_attempts === 1 ? "" : "zes"}`
                                : " \u00B7 no activity yet"}
                        </p>
                    </div>

                    <div className="shrink-0 text-right">
                        {row.has_activity ? (
                            <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                                {row.school_score.toFixed(1)}
                                <span className="text-slate-400 dark:text-slate-500 font-normal ml-0.5">%</span>
                            </span>
                        ) : (
                            <span className="text-xs text-slate-300 dark:text-slate-600 tabular-nums">—</span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const showInviteButtons = !!schoolLabelForInvites;

    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">

            {/* Atmosphere strip */}
            <div className="relative h-20 bg-slate-100 dark:bg-[#0d1117]">
                <div className="absolute inset-0 flex">
                    {ATMOSPHERE_IMAGES.map((src, i) => (
                        <div
                            key={src}
                            className="flex-1 relative overflow-hidden"
                            style={{ marginLeft: i === 0 ? 0 : "-8px", zIndex: ATMOSPHERE_IMAGES.length - i }}
                        >
                            <img
                                src={src}
                                alt=""
                                aria-hidden
                                loading="lazy"
                                onError={(e) => {
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
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent dark:from-[#161b22]" />
                <div className="absolute bottom-2 left-4 right-4 z-10">
                    <h3 className="text-base font-semibold tracking-tight drop-shadow-sm
                                   text-slate-900 dark:text-white
                                   bg-white/70 dark:bg-[#161b22]/80 backdrop-blur-sm
                                   inline-block px-2 py-0.5 rounded-md">
                        School Wars
                    </h3>
                </div>
            </div>

            {/* Header meta + description */}
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

            {/* ─── SMART BUTTONS ─── */}
            {showInviteButtons ? (
                <div className="px-4 pb-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => openInvite(buildInviteCoursemate)}
                            className="inline-flex items-center justify-center gap-1.5
                                       text-[12px] font-bold px-2.5 py-2.5 rounded-xl
                                       bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                                       text-white shadow-sm shadow-blue-500/30 transition-colors"
                        >
                            <Share2 size={13} />
                            Invite coursemate
                        </button>
                        <button
                            onClick={() => openInvite(buildInviteNewCampus)}
                            className="inline-flex items-center justify-center gap-1.5
                                       text-[12px] font-bold px-2.5 py-2.5 rounded-xl
                                       bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800
                                       text-white shadow-sm shadow-emerald-500/30 transition-colors"
                        >
                            <UserPlus size={13} />
                            Invite new campus
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                        Both invite to{" "}
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {schoolLabelForInvites}
                        </span>
                        {myRank ? (
                            <>
                                {" "}
                                · rank #{myRank}
                                {myRank > 1 && hasActivity && (
                                    <>
                                        {" "}
                                        ·{" "}
                                        <span className="text-orange-600 dark:text-orange-400 font-semibold">
                                            {(topScore - myScore).toFixed(1)}% behind #1
                                        </span>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                {" "}
                                · not on the board yet — first quiz will place you
                            </>
                        )}
                    </p>
                </div>
            ) : pickerOpen ? (
                <div className="px-4 pb-3">
                    <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/20 p-3 space-y-2">
                        <div className="flex items-center gap-1.5">
                            <GraduationCap size={14} className="text-blue-600 dark:text-blue-400" />
                            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                                Set your institution
                            </p>
                        </div>
                        <InstitutionPicker
                            value={pickedInstitution}
                            onChange={setPickedInstitution}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveInstitution}
                                disabled={!pickedInstitution || savingInstitution}
                                className="flex-1 inline-flex items-center justify-center gap-1.5
                                           text-[12px] font-bold px-3 py-2 rounded-lg
                                           bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                                           text-white shadow-sm shadow-blue-500/30 transition-colors
                                           disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {savingInstitution ? (
                                    <>
                                        <Loader2 size={13} className="animate-spin" />
                                        Saving…
                                    </>
                                ) : (
                                    <>
                                        <Check size={13} />
                                        Save & join board
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    setPickerOpen(false);
                                    setPickedInstitution("");
                                }}
                                className="px-3 py-2 rounded-lg text-[12px] font-semibold
                                           border border-slate-200 dark:border-white/10
                                           bg-white dark:bg-[#1f2630]
                                           text-slate-700 dark:text-slate-200
                                           hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="px-4 pb-3">
                    <button
                        onClick={() => setPickerOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-1.5
                                   text-[13px] font-bold px-3 py-2.5 rounded-xl
                                   bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                                   text-white shadow-sm shadow-blue-500/30 transition-colors"
                    >
                        <GraduationCap size={14} />
                        Set your institution to compete
                        <ArrowUpRight size={14} />
                    </button>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-1.5">
                        Pick your school once — then invite coursemates from here.
                    </p>
                </div>
            )}

            {/* Champion (rank 1) */}
            {champion && renderChampion(champion)}

            {/* Ranks 2–5 (or user swap-in) */}
            <div>
                {visibleRows
                    .filter((r) => r.institution !== champion?.institution)
                    .map(renderRow)}
            </div>

            {/* Expand / collapse */}
            {hasHiddenRows && (
                <div className="px-4 py-3 border-t border-slate-100 dark:border-white/[0.06]">
                    <button
                        onClick={() => setExpanded((e) => !e)}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                        {expanded ? "Hide full ranking" : `See all ${rows.length} schools`}
                        <ArrowUpRight size={13} className={expanded ? "rotate-90 transition-transform" : "transition-transform"} />
                    </button>
                </div>
            )}

            {expanded && restRows.length > 0 && (
                <div className="max-h-[320px] overflow-y-auto border-t border-slate-100 dark:border-white/[0.06]">
                    {restRows.map(renderRow)}
                </div>
            )}

            {/* Footer */}
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