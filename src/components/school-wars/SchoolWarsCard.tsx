// src/components/school-wars/SchoolWarsCard.tsx
"use client";

import { useEffect, useState, useCallback, useMemo, useRef, memo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    Trophy, Share2, UserPlus, GraduationCap, Check, Loader2,
    ChevronRight, Users, ArrowUpRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { UserProfileModal } from "@/components/UserProfileModal";
import { InstitutionPicker } from "./InstitutionPicker";
import { AllSchoolsSheet } from "./AllSchoolsSheet";
import { SchoolStudentsSheet } from "./SchoolStudentsSheet";
import {
    CACHE_KEY, CURRENT_INSTITUTION_KEY, type LeaderboardRow, type CacheEnvelope,
    readCache, writeCache, isFresh, readCachedInstitution, writeCachedInstitution, prettyLabel,
} from "@/lib/school-wars/schoolWarsCache";

const POST_SAVE_STALE_MS = 30 * 1000;

interface Props {
    currentUserInstitution: string | null | undefined;
    onInstitutionChanged?: (slug: string) => void;
}

function initialOf(label: string) {
    return label.replace(/^university of /i, "").charAt(0).toUpperCase() || "?";
}

/* Avatar — #1 chip stays inverted (it's the "winner" signal).
   Everyone else neutral on both modes. */
const SchoolAvatar = memo(function SchoolAvatar({
    label, size = 44, dimmed = false, top = false,
}: {
    label: string;
    size?: number;
    dimmed?: boolean;
    top?: boolean;
}) {
    return (
        <div
            className={`rounded-2xl flex items-center justify-center shrink-0
                        ${top
                    ? "bg-zinc-900 dark:bg-white/[0.12] text-white font-bold"
                    : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-900 dark:text-white font-semibold"}
                        ${dimmed ? "opacity-55" : ""}`}
            style={{ width: size, height: size, fontSize: size * 0.38 }}
        >
            {initialOf(label)}
        </div>
    );
});

const SchoolCard = memo(function SchoolCard({
    row, isMine, onOpen,
}: {
    row: LeaderboardRow;
    isMine: boolean;
    onOpen: (row: LeaderboardRow) => void;
}) {
    const label = useMemo(
        () => prettyLabel(row.institution, row.institution_label),
        [row.institution, row.institution_label]
    );

    const score = row.has_activity
        ? `${row.school_score.toFixed(1)}`
        : "—";

    const rankColor =
        row.rank === 1
            ? "text-amber-600 dark:text-amber-300"
            : row.rank === 2
                ? "text-zinc-500 dark:text-zinc-200"
                : row.rank === 3
                    ? "text-orange-600 dark:text-orange-300"
                    : "text-zinc-400 dark:text-zinc-500";

    const rankBackground =
        row.rank === 1
            ? "bg-amber-100/80 dark:bg-amber-300/[0.12]"
            : row.rank === 2
                ? "bg-zinc-200/70 dark:bg-white/[0.09]"
                : row.rank === 3
                    ? "bg-orange-100/80 dark:bg-orange-300/[0.12]"
                    : "bg-zinc-100 dark:bg-white/[0.06]";

    return (
        <button
            onClick={() => onOpen(row)}
            className="
                group relative snap-start shrink-0
                w-[158px] h-[158px]
                overflow-hidden text-left
                flex flex-col justify-between
                rounded-[22px] p-3.5

                bg-gradient-to-br
                from-white via-[#FAFAFC] to-[#F0F1F5]
                shadow-[0_5px_18px_rgba(20,20,40,0.07)]

                dark:bg-none
                dark:bg-gradient-to-br
                dark:from-[#252630]
                dark:via-[#1C1D26]
                dark:to-[#15161D]
                dark:shadow-[0_8px_24px_rgba(0,0,0,0.28)]

                hover:shadow-[0_8px_22px_rgba(20,20,40,0.10)]
                dark:hover:shadow-[0_10px_28px_rgba(0,0,0,0.38)]

                active:scale-[0.965]
                transition-all duration-200 ease-out
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-rose-500/60
            "
            style={{
                contentVisibility: "auto",
                containIntrinsicSize: "158px 158px",
            }}
        >
            {/* Soft decorative glow */}
            <div
                className="
                    pointer-events-none absolute
                    -top-12 -right-12
                    w-28 h-28 rounded-full
                    bg-rose-300/[0.13]
                    dark:bg-rose-400/[0.09]
                    blur-2xl
                "
            />

            {/* Top */}
            <div className="relative flex items-start justify-between">
                <SchoolAvatar
                    label={label}
                    size={40}
                    dimmed={!row.has_activity}
                    top={row.rank === 1}
                />

                <span className={`
                    inline-flex items-center justify-center
                    min-w-[27px] h-[23px] px-1.5
                    rounded-lg
                    text-[10px] font-bold tabular-nums
                    ${rankColor} ${rankBackground}
                `}>
                    {row.rank}
                </span>
            </div>

            {/* Main information */}
            <div className="relative min-w-0 mt-2">
                <p className="
                    text-[11.5px] font-semibold
                    text-zinc-800 dark:text-zinc-100
                    leading-[1.4] line-clamp-2
                    min-h-[32px]
                    tracking-[-0.02em]
                ">
                    {label}
                </p>

                <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="
                        text-[24px] font-bold
                        tracking-[-0.055em]
                        leading-none tabular-nums
                        text-zinc-950 dark:text-white
                    ">
                        {score}
                    </span>

                    {row.has_activity && (
                        <span className="
                            text-[10px] font-semibold
                            text-zinc-400 dark:text-zinc-500
                        ">
                            %
                        </span>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="relative flex items-center justify-between mt-2">
                <span className={`
                    text-[9px] font-bold uppercase
                    tracking-[0.1em]
                    ${isMine
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-zinc-400 dark:text-zinc-500"
                    }
                `}>
                    {isMine
                        ? "Your institution"
                        : row.has_activity
                            ? "Active"
                            : "No activity"
                    }
                </span>

                <span className="
                    flex items-center justify-center
                    w-5 h-5 rounded-full
                    bg-zinc-200/70 dark:bg-white/[0.07]
                    text-zinc-500 dark:text-zinc-400
                    group-hover:text-rose-500
                    transition-colors
                ">
                    <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className="w-3 h-3"
                        aria-hidden="true"
                    >
                        <path
                            d="M7.5 4.5L13 10L7.5 15.5"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </span>
            </div>
        </button>
    );
});

export function SchoolWarsCard({ currentUserInstitution, onInstitutionChanged }: Props) {
    const initial = readCache();
    const cachedInstitution = readCachedInstitution();

    const [rows, setRows] = useState<LeaderboardRow[]>(initial?.data ?? []);
    const [loading, setLoading] = useState(!initial);
    const [dbRefreshedAt, setDbRefreshedAt] = useState<number | null>(initial?.dbRefreshedAt ?? null);
    const [localInstitution, setLocalInstitution] = useState<string | null>(cachedInstitution);

    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickedInstitution, setPickedInstitution] = useState("");
    const [savingInstitution, setSavingInstitution] = useState(false);
    const [inviteMenuOpen, setInviteMenuOpen] = useState(false);
    const [allSchoolsOpen, setAllSchoolsOpen] = useState(false);
    const [studentsSheet, setStudentsSheet] = useState<{ open: boolean; school: LeaderboardRow | null }>({
        open: false, school: null,
    });
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    const lastSaveAtRef = useRef(0);

    const effectiveInstitution = useMemo(() => {
        if (localInstitution) return localInstitution;
        if (currentUserInstitution && currentUserInstitution !== "other") return currentUserInstitution;
        return cachedInstitution;
    }, [localInstitution, currentUserInstitution, cachedInstitution]);

    useEffect(() => { writeCachedInstitution(effectiveInstitution); }, [effectiveInstitution]);

    const fetchLeaderboard = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data, error } = await supabase
                .from("school_wars_leaderboard")
                .select("rank, institution, institution_label, member_count, total_attempts, school_score, top_score, last_activity, has_activity, refreshed_at")
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
            const refreshedAt = data?.[0]?.refreshed_at ? new Date(data[0].refreshed_at).getTime() : Date.now();
            setRows(clean); setDbRefreshedAt(refreshedAt); writeCache(clean, refreshedAt);
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
        } catch (err) { console.warn("[SchoolWars] cron refresh threw:", err); }
    }, []);

    useEffect(() => {
        const cached = readCache();
        if (cached) {
            setRows(cached.data); setDbRefreshedAt(cached.dbRefreshedAt); setLoading(false);
            if (!isFresh(cached)) fetchLeaderboard(true);
        } else fetchLeaderboard(false);
    }, []); // eslint-disable-line

    useEffect(() => {
        const onFocus = () => {
            if (document.visibilityState !== "visible") return;
            if (lastSaveAtRef.current && Date.now() - lastSaveAtRef.current < 5 * 60 * 1000 &&
                dbRefreshedAt && Date.now() - dbRefreshedAt > POST_SAVE_STALE_MS) {
                fetchLeaderboard(true); return;
            }
            const cached = readCache();
            if (!cached) { fetchLeaderboard(true); return; }
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
                    if (Array.isArray(parsed?.data)) { setRows(parsed.data); setDbRefreshedAt(parsed.dbRefreshedAt); }
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

    const rowsBySlug = useMemo(() => {
        const m = new Map<string, LeaderboardRow>();
        for (const r of rows) m.set(r.institution, r);
        return m;
    }, [rows]);

    const mySchoolSlug =
        effectiveInstitution && effectiveInstitution !== "other" && rowsBySlug.has(effectiveInstitution)
            ? effectiveInstitution : null;
    const mySchool = mySchoolSlug ? rowsBySlug.get(mySchoolSlug) ?? null : null;

    const topScore = rows[0]?.school_score ?? 0;
    const myRank = mySchool?.rank ?? null;
    const myScore = mySchool?.school_score ?? 0;
    const hasActivity = mySchool?.has_activity ?? false;
    const gap = Math.max(0, topScore - myScore);

    const schoolLabelForInvites = useMemo(() => {
        if (mySchool) return prettyLabel(mySchool.institution, mySchool.institution_label);
        if (effectiveInstitution && effectiveInstitution !== "other")
            return prettyLabel(effectiveInstitution, effectiveInstitution);
        return null;
    }, [mySchool, effectiveInstitution]);

    const buildInviteCoursemate = useCallback(() => {
        if (!schoolLabelForInvites) return null;
        const label = schoolLabelForInvites;
        const lines = myRank && myRank > 1 && gap > 0
            ? [`${label} is ranked ${myRank} on Medrae's School Wars.`, ``, `We're ${gap.toFixed(1)}% behind first place — every quiz closes the gap.`, ``, `If you're already on Medrae, take a quiz this week:`, `https://medrae.vercel.app/quiz`, ``, `Make sure your institution is set to "${label}".`]
            : [`${label} is competing on Medrae's School Wars.`, ``, `Every quiz a student from ${label} completes adds to the score.`, ``, `Take a quiz this week:`, `https://medrae.vercel.app/quiz`];
        return `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
    }, [schoolLabelForInvites, myRank, gap]);

    const buildInviteNewCampus = useCallback(() => {
        if (!schoolLabelForInvites) return null;
        const label = schoolLabelForInvites;
        const lines = [`Join me on Medrae — free nursing quizzes and exam prep.`, ``, `We're pushing ${label} up the School Wars leaderboard.`, `Sign up and pick "${label}" as your institution:`, `https://medrae.vercel.app/register`, ``, `Every quiz you complete counts for our school.`];
        return `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
    }, [schoolLabelForInvites]);

    const openInvite = (builder: () => string | null) => {
        const url = builder(); if (url) window.open(url, "_blank"); setInviteMenuOpen(false);
    };

    const handleSaveInstitution = useCallback(async () => {
        if (!pickedInstitution) {
            toast({ title: "Pick a school first", description: "Choose from the list.", variant: "destructive" });
            return;
        }
        setSavingInstitution(true);
        try {
            const { data: { user }, error: userErr } = await supabase.auth.getUser();
            if (userErr || !user) throw new Error("Not signed in");
            const { error } = await supabase.from("profiles").update({ institution: pickedInstitution }).eq("user_id", user.id);
            if (error) throw error;
            setLocalInstitution(pickedInstitution);
            writeCachedInstitution(pickedInstitution);
            lastSaveAtRef.current = Date.now();
            try {
                const raw = localStorage.getItem("userProfile");
                if (raw) { const p = JSON.parse(raw); p.institution = pickedInstitution; localStorage.setItem("userProfile", JSON.stringify(p)); }
            } catch { }
            window.dispatchEvent(new CustomEvent("profileUpdated", { detail: { institution: pickedInstitution } }));
            try { localStorage.removeItem(CACHE_KEY); } catch { }
            toast({ title: "Institution set", description: `You're now competing for ${prettyLabel(pickedInstitution, pickedInstitution)}.` });
            setPickerOpen(false); setPickedInstitution("");
            onInstitutionChanged?.(pickedInstitution);
            await triggerCronRefresh(); await fetchLeaderboard(true);
        } catch (err: any) {
            toast({ title: "Couldn't save", description: err?.message || "Please try again.", variant: "destructive" });
        } finally { setSavingInstitution(false); }
    }, [pickedInstitution, onInstitutionChanged, fetchLeaderboard, triggerCronRefresh]);

    const showInvite = !!schoolLabelForInvites;
    const handleOpenCard = useCallback((row: LeaderboardRow) => setStudentsSheet({ open: true, school: row }), []);

    if (loading) {
        return (
            <div className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">
                <div className="px-4 pt-4 pb-3 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-white/5 animate-pulse" />
                    <div className="h-3 w-24 rounded bg-zinc-100 dark:bg-white/5 animate-pulse" />
                </div>
                <div className="px-4 pb-4 flex gap-2 overflow-hidden">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="w-[152px] h-[148px] rounded-2xl bg-white dark:bg-white/[0.03] animate-pulse shrink-0" />
                    ))}
                </div>
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-5">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-white/[0.1] flex items-center justify-center">
                        <Trophy className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />
                    </div>
                    <p className="text-[13px] font-semibold text-zinc-900 dark:text-white">School Board</p>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    The board is initialising. Complete a quiz to place your school.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">
                {/* HEADER */}
                <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-white/[0.1] flex items-center justify-center shrink-0">
                            <Trophy className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[13px] font-semibold text-zinc-900 dark:text-white leading-tight truncate">
                                School Wars
                            </h3>
                            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500 leading-tight">
                                This week
                            </p>
                        </div>
                    </div>

                    {showInvite && (
                        <div className="relative shrink-0">
                            <button
                                onClick={() => setInviteMenuOpen(v => !v)}
                                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-zinc-900 dark:text-white text-[11px] font-medium transition-colors"
                            >
                                <Share2 className="w-3 h-3" /> Invite
                            </button>
                            {inviteMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setInviteMenuOpen(false)} />
                                    <div className="absolute right-0 top-9 z-20 w-52 rounded-xl bg-white dark:bg-[#1c2128] overflow-hidden shadow-xl shadow-black/10 dark:shadow-black/60">
                                        <button onClick={() => openInvite(buildInviteCoursemate)}
                                            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-white/[0.04]">
                                            <Share2 className="w-3.5 h-3.5 text-zinc-400" /> Invite coursemate
                                        </button>
                                        <div className="h-px bg-zinc-100 dark:bg-white/[0.06]" />
                                        <button onClick={() => openInvite(buildInviteNewCampus)}
                                            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-white/[0.04]">
                                            <UserPlus className="w-3.5 h-3.5 text-zinc-400" /> Invite new campus
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* SET INSTITUTION CTA — neutral chip on both modes */}
                {!showInvite && !pickerOpen && (
                    <div className="px-4 pt-2 pb-2">
                        <button
                            onClick={() => setPickerOpen(true)}
                            className="w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold px-3 py-2.5 rounded-xl
                                       bg-zinc-100 dark:bg-white/[0.08]
                                       text-zinc-900 dark:text-white
                                       hover:bg-zinc-200 dark:hover:bg-white/[0.12]
                                       active:scale-[0.99] transition-colors"
                        >
                            <GraduationCap className="w-4 h-4" />
                            Set your institution
                            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                        </button>
                    </div>
                )}

                {/* PICKER */}
                {pickerOpen && (
                    <div className="px-4 pt-2 pb-3">
                        <div className="rounded-xl bg-zinc-50 dark:bg-white/[0.03] p-3 space-y-2">
                            <div className="flex items-center gap-1.5">
                                <GraduationCap className="w-3.5 h-3.5 text-zinc-500" />
                                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                                    Set your institution
                                </p>
                            </div>
                            <InstitutionPicker value={pickedInstitution} onChange={setPickedInstitution} />
                            <div className="flex gap-2">
                                <button onClick={handleSaveInstitution} disabled={!pickedInstitution || savingInstitution}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-lg
                                               bg-zinc-100 dark:bg-white/[0.1]
                                               text-zinc-900 dark:text-white
                                               hover:bg-zinc-200 dark:hover:bg-white/[0.14]
                                               disabled:opacity-40 transition-colors">
                                    {savingInstitution ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>) : (<><Check className="w-3.5 h-3.5" /> Save &amp; join</>)}
                                </button>
                                <button onClick={() => { setPickerOpen(false); setPickedInstitution(""); }}
                                    className="px-3 py-2 rounded-lg text-[12px] font-medium bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-white/[0.1] transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* HORIZONTAL RAIL */}
                <div className="px-4 pt-1 pb-1">
                    <div
                        className="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-px-4 pb-2
                       [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {rows.map((row) => (
                            <SchoolCard
                                key={row.institution}
                                row={row}
                                isMine={row.institution === mySchoolSlug}
                                onOpen={handleOpenCard}
                            />
                        ))}
                    </div>
                </div>

                {/* YOUR SCHOOL SPOTLIGHT */}
                {mySchool ? (
                    <div className="px-4 pb-3">
                        <button
                            onClick={() => setStudentsSheet({ open: true, school: mySchool })}
                            className="w-full rounded-xl bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200/70 dark:hover:bg-white/[0.07] text-left active:scale-[0.995] transition-colors group"
                        >
                            <div className="flex items-center gap-3 px-3.5 py-3">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                                    <span className="text-zinc-900 dark:text-white text-sm font-semibold tabular-nums">
                                        {myRank}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                                        Your school
                                    </p>
                                    <p className="text-[13px] font-semibold text-zinc-900 dark:text-white truncate leading-tight">
                                        {schoolLabelForInvites}
                                    </p>
                                </div>

                                <div className="shrink-0 text-right">
                                    <p className="text-[15px] font-semibold text-zinc-900 dark:text-white tabular-nums leading-none">
                                        {hasActivity ? `${myScore.toFixed(1)}%` : "—"}
                                    </p>
                                    {myRank && myRank > 1 && hasActivity && gap > 0 && (
                                        <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 tabular-nums mt-0.5 inline-flex items-center gap-0.5">
                                            <ArrowUpRight className="w-2.5 h-2.5" /> {gap.toFixed(1)}% behind
                                        </p>
                                    )}
                                    {myRank === 1 && (
                                        <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                                            Leading
                                        </p>
                                    )}
                                </div>

                                <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                            </div>
                        </button>
                    </div>
                ) : (
                    <div className="px-4 pb-3">
                        <button
                            onClick={() => setPickerOpen(true)}
                            className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200/70 dark:hover:bg-white/[0.07] transition-colors"
                        >
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                                <GraduationCap className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-[12px] font-semibold text-zinc-900 dark:text-white">
                                    Set your institution
                                </p>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                    Compete for your school
                                </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                        </button>
                    </div>
                )}

                {/* FOOTER */}
                <button
                    onClick={() => setAllSchoolsOpen(true)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50/60 dark:bg-white/[0.02] hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors"
                >
                    <span className="flex items-center gap-2 text-[12px] font-medium text-zinc-900 dark:text-white">
                        <Users className="w-3.5 h-3.5 text-zinc-400" />
                        All {rows.length} schools
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                </button>
            </div>

            <AllSchoolsSheet
                open={allSchoolsOpen} onClose={() => setAllSchoolsOpen(false)}
                rows={rows} mySchoolSlug={mySchoolSlug}
                onPickSchool={(row) => { setAllSchoolsOpen(false); setTimeout(() => setStudentsSheet({ open: true, school: row }), 180); }}
            />
            <SchoolStudentsSheet
                open={studentsSheet.open} onClose={() => setStudentsSheet({ open: false, school: null })}
                school={studentsSheet.school}
                onPickStudent={(userId) => { setStudentsSheet({ open: false, school: null }); setTimeout(() => setSelectedStudentId(userId), 180); }}
            />
            <UserProfileModal userId={selectedStudentId} onClose={() => setSelectedStudentId(null)} />
        </>
    );
}