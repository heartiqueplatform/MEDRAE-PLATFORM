// src/components/school-wars/SchoolStudentsSheet.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, ChevronRight, UserX, Star, Trophy } from "lucide-react";
import { CenteredModal } from "@/components/ui/CenteredModal";
import { supabase } from "@/lib/supabaseClient";
import { prettyLabel } from "@/lib/school-wars/schoolWarsCache";
import type { LeaderboardRow } from "@/lib/school-wars/schoolWarsCache";

type Student = {
    userid: string;
    name: string;
    avatar_url: string | null;
    stars: number;
    avg_score: number;
    attempts: number;
};

interface Props {
    open: boolean;
    onClose: () => void;
    school: LeaderboardRow | null;
    onPickStudent: (userId: string) => void;
}

export function SchoolStudentsSheet({ open, onClose, school, onPickStudent }: Props) {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!school) return;
        setLoading(true);
        setError(null);
        try {
            // ✅ scoped RPC — returns EVERY student in this institution, not just top 20
            const { data, error: err } = await supabase.rpc("get_school_students", {
                p_institution: school.institution,
            });
            if (err) throw err;

            const list = ((data ?? []) as any[]).map((s) => ({
                userid: s.userid,
                name: s.name || "Student",
                avatar_url: s.avatar_url || null,
                stars: Number(s.stars) || 0,
                avg_score: Number(s.avg_score) || 0,
                attempts: Number(s.attempts) || 0,
            }));

            setStudents(list);
        } catch (e: any) {
            console.warn("[SchoolStudents] load failed:", e);
            setError(e?.message || "Could not load students");
        } finally {
            setLoading(false);
        }
    }, [school]);

    useEffect(() => {
        if (open && school) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, school?.institution]);

    if (!school) return null;
    const label = prettyLabel(school.institution, school.institution_label);

    return (
        <CenteredModal
            open={open}
            onClose={onClose}
            title={label}
            subtitle={
                loading
                    ? "Loading students…"
                    : `${students.length} student${students.length === 1 ? "" : "s"}${school.has_activity ? ` · ${school.school_score.toFixed(1)}% avg` : ""
                    } · rank #${school.rank}`
            }
            maxWidthClass="max-w-lg"
            maxHeight="86vh"
        >
            <div className="px-2 pb-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">Loading students…</p>
                    </div>
                ) : error ? (
                    <div className="py-16 text-center px-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
                        <button
                            onClick={load}
                            className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Try again
                        </button>
                    </div>
                ) : students.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 px-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/[0.06]">
                            <UserX className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                            No students registered for {label} yet.
                            <br />
                            Be the first — set your institution and take a quiz.
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                        {students.map((s, idx) => (
                            <li key={s.userid}>
                                <button
                                    onClick={() => onPickStudent(s.userid)}
                                    className="w-full flex items-center gap-3 px-2 py-3 text-left rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] active:bg-slate-100 dark:active:bg-white/[0.06] transition-colors"
                                >
                                    <span className="w-5 text-center text-[11px] font-bold text-slate-400 tabular-nums shrink-0">
                                        {idx + 1}
                                    </span>
                                    <img
                                        src={s.avatar_url || "/UsersAvatar.jpg"}
                                        alt={s.name}
                                        loading="lazy"
                                        className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/10 shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                            {s.name}
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-wrap">
                                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                            {s.stars} star{s.stars === 1 ? "" : "s"}
                                            {s.attempts > 0 && (
                                                <>
                                                    <span className="text-slate-300 dark:text-slate-600">·</span>
                                                    {s.attempts} quiz{s.attempts === 1 ? "" : "zes"}
                                                </>
                                            )}
                                            {s.attempts === 0 && (
                                                <>
                                                    <span className="text-slate-300 dark:text-slate-600">·</span>
                                                    <span className="italic">no activity yet</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    {s.attempts > 0 && (
                                        <span className="shrink-0 text-[11px] font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                            {s.avg_score.toFixed(1)}%
                                        </span>
                                    )}
                                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {!loading && !error && students.length > 0 && (
                    <div className="mt-3 px-2 flex items-center gap-1.5 justify-center">
                        <Trophy className="w-3 h-3 text-amber-500" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Sorted by stars · then average score
                        </p>
                    </div>
                )}
            </div>
        </CenteredModal>
    );
}