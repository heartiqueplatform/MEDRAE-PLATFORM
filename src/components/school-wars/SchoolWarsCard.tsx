// src/components/school-wars/SchoolWarsCard.tsx
"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    Trophy,
    Share2,
    UserPlus,
    Search,
    GraduationCap,
    Check,
    Loader2,
    ChevronRight,
    Users,
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
const VISIBLE_ROWS = 5;

interface Props {
    currentUserInstitution: string | null | undefined;
    onInstitutionChanged?: (slug: string) => void;
}

export function SchoolWarsCard({ currentUserInstitution, onInstitutionChanged }: Props) {
    const initial = readCache();
    const cachedInstitution = readCachedInstitution();

    const [rows, setRows] = useState<LeaderboardRow[]>(initial?.data ?? []);
    const [loading, setLoading] = useState(!initial);
    const [dbRefreshedAt, setDbRefreshedAt] = useState<number | null>(
        initial?.dbRefreshedAt ?? null
    );

    const [localInstitution, setLocalInstitution] = useState<string | null>(
        cachedInstitution
    );

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

    const buildInviteCoursemate = useCallback(() => {
        if (!schoolLabelForInvites) return null;
        const label = schoolLabelForInvites;
        const gap = topScore - myScore;
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
    }, [schoolLabelForInvites, myRank, myScore, topScore]);

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
            toast({ title: "Pick a school first", description: "Choose from the list.", variant: "destructive" });
            return;
        }
        setSavingInstitution(true);
        try {
            const { data: { user }, error: userErr } = await supabase.auth.getUser();
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

            try { localStorage.removeItem(CACHE_KEY); } catch { }

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

    const top5 = useMemo(() => {
        if (!mySchoolSlug) return rows.slice(0, VISIBLE_ROWS);
        const inTop = rows.slice(0, VISIBLE_ROWS);
        if (inTop.some((r) => r.institution === mySchoolSlug)) return inTop;
        const mine = rows.find((r) => r.institution === mySchoolSlug);
        if (!mine) return inTop;
        return [...inTop.slice(0, VISIBLE_ROWS - 1), mine];
    }, [rows, mySchoolSlug]);

    const showInvite = !!schoolLabelForInvites;

    if (loading) {
        return (
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-5">
                <p className="text-sm font-bold text-slate-900 dark:text-white">School Wars</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    The leaderboard is initialising. Complete a quiz to place your school on the board.
                </p>
            </div>
        );
    }

    const RankBadge = ({ rank }: { rank: number }) => {
        if (rank === 1)
            return <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-500 text-white text-[13px] font-bold tabular-nums shrink-0">1</div>;
        if (rank === 2)
            return <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-400 text-white text-[13px] font-bold tabular-nums shrink-0">2</div>;
        if (rank === 3)
            return <div className="w-8 h-8 rounded-full flex items-center justify-center bg-orange-500 text-white text-[13px] font-bold tabular-nums shrink-0">3</div>;
        return <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 text-[13px] font-bold tabular-nums shrink-0">{rank}</div>;
    };
    return (
        <>
            <div className="rounded-none bg-white dark:bg-[#161b22] overflow-hidden border-0">
                {/* ── HEADER (slim, no image) ── */}
                {/* ── HEADER (slim, no image) ── */}
                <div className="px-4 py-3 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-[#0d1117] dark:via-[#161b22] dark:to-[#0d1117] border-b border-slate-200/70 dark:border-white/[0.04]">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
                                School Wars
                            </h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
                                · This week
                            </span>
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
                                        <div className="absolute right-0 top-9 z-20 w-52 rounded-xl bg-white dark:bg-[#1f2630] overflow-hidden shadow-lg dark:shadow-black/50">
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

                {/* ── SET INSTITUTION CTA ── */}
                {!showInvite && !pickerOpen && (
                    <div className="px-4 pt-3 pb-2">
                        <button
                            onClick={() => setPickerOpen(true)}
                            className="w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-bold px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-white/[0.1] active:scale-[0.99] transition-all"
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
                                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                                    ) : (
                                        <><Check className="w-3.5 h-3.5" /> Save & join</>
                                    )}
                                </button>
                                <button
                                    onClick={() => { setPickerOpen(false); setPickedInstitution(""); }}
                                    className="px-3 py-2 rounded-lg text-[12px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TOP 5 LIST ── */}
                <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {top5.map((row) => {
                        const isMine = row.institution === mySchoolSlug;
                        const label = prettyLabel(row.institution, row.institution_label);
                        return (
                            <li key={row.institution}>
                                <button
                                    onClick={() => setStudentsSheet({ open: true, school: row })}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isMine
                                        ? "bg-blue-50/60 dark:bg-blue-950/15"
                                        : "hover:bg-slate-50 dark:hover:bg-white/[0.03] active:bg-slate-100 dark:active:bg-white/[0.06]"
                                        }`}
                                >
                                    <RankBadge rank={row.rank} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                                                {label}
                                            </p>
                                            {isMine && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 shrink-0">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            {row.member_count} student{row.member_count === 1 ? "" : "s"}
                                            {row.has_activity
                                                ? ` · ${row.total_attempts} quiz${row.total_attempts === 1 ? "" : "zes"}`
                                                : " · no activity yet"}
                                        </p>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-1">
                                        {row.has_activity ? (
                                            <span className="text-[13px] font-bold text-slate-900 dark:text-white tabular-nums">
                                                {row.school_score.toFixed(1)}
                                                <span className="text-slate-400 font-normal ml-0.5">%</span>
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                                        )}
                                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>

                {/* ── FOOTER: See all ── */}
                <button
                    onClick={() => setAllSchoolsOpen(true)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/60 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] active:bg-slate-200 dark:active:bg-white/[0.08] transition-colors"
                >
                    <span className="flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-200">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        See all {rows.length} schools
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* My school status footer */}
                {mySchool && (
                    <div className="px-4 py-2 bg-slate-50/40 dark:bg-white/[0.01] flex items-center justify-between">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {schoolLabelForInvites}
                            </span>
                            {" "}· rank {myRank}
                        </p>
                        {myRank && myRank > 1 && hasActivity && (
                            <p className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 tabular-nums shrink-0">
                                {(topScore - myScore).toFixed(1)}% behind
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* ── SHEETS ── */}
            <AllSchoolsSheet
                open={allSchoolsOpen}
                onClose={() => setAllSchoolsOpen(false)}
                rows={rows}
                mySchoolSlug={mySchoolSlug}
                onPickSchool={(row) => {
                    setAllSchoolsOpen(false);
                    // small delay so the first sheet closes before the second opens
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