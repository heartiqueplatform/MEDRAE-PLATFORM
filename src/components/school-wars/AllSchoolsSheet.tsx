// src/components/school-wars/AllSchoolsSheet.tsx
"use client";

import { useMemo, useState } from "react";
import { Search, X, ChevronRight } from "lucide-react";
import { CenteredModal } from "@/components/ui/CenteredModal";
import type { LeaderboardRow } from "@/lib/school-wars/schoolWarsCache";
import { prettyLabel } from "@/lib/school-wars/schoolWarsCache";

interface Props {
    open: boolean;
    onClose: () => void;
    rows: LeaderboardRow[];
    mySchoolSlug: string | null;
    onPickSchool: (row: LeaderboardRow) => void;
}

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1)
        return <div className="w-6 h-6 rounded-full flex items-center justify-center bg-amber-500 text-white text-[11px] font-bold tabular-nums shrink-0">1</div>;
    if (rank === 2)
        return <div className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-400 text-white text-[11px] font-bold tabular-nums shrink-0">2</div>;
    if (rank === 3)
        return <div className="w-6 h-6 rounded-full flex items-center justify-center bg-orange-500 text-white text-[11px] font-bold tabular-nums shrink-0">3</div>;
    return <div className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 text-[11px] font-bold tabular-nums shrink-0">{rank}</div>;
}

export function AllSchoolsSheet({ open, onClose, rows, mySchoolSlug, onPickSchool }: Props) {
    const [query, setQuery] = useState("");

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter(
            (r) =>
                r.institution_label.toLowerCase().includes(term) ||
                r.institution.toLowerCase().includes(term) ||
                prettyLabel(r.institution, r.institution_label).toLowerCase().includes(term)
        );
    }, [rows, query]);

    return (
        <CenteredModal
            open={open}
            onClose={onClose}
            title="All Schools"
            subtitle={`${filtered.length} of ${rows.length} schools`}
            maxWidthClass="max-w-lg"
            maxHeight="86vh"
        >
            {/* Sticky search */}
            <div className="sticky top-0 z-10 px-4 pt-3 pb-3 bg-white dark:bg-[#161b22]">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search schools…"
                        className="w-full pl-9 pr-9 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] border-0 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10"
                            aria-label="Clear search"
                        >
                            <X className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div className="py-16 text-center px-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        No school matches "{query}"
                    </p>
                </div>
            ) : (
                <ul className="divide-y divide-slate-100 dark:divide-white/[0.04] px-2 pb-2">
                    {filtered.map((row) => {
                        const isMine = row.institution === mySchoolSlug;
                        const label = prettyLabel(row.institution, row.institution_label);
                        return (
                            <li key={row.institution}>
                                <button
                                    onClick={() => onPickSchool(row)}
                                    className={`w-full flex items-center gap-3 px-2 py-3 text-left rounded-xl transition-colors ${isMine
                                        ? "bg-blue-50/70 dark:bg-blue-950/20"
                                        : "hover:bg-slate-50 dark:hover:bg-white/[0.03] active:bg-slate-100 dark:active:bg-white/[0.06]"
                                        }`}
                                >
                                    <RankBadge rank={row.rank} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
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
                                    <div className="shrink-0 flex items-center gap-1.5">
                                        {row.has_activity ? (
                                            <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                                                {row.school_score.toFixed(1)}
                                                <span className="text-slate-400 font-normal ml-0.5">%</span>
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                                        )}
                                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </CenteredModal>
    );
}