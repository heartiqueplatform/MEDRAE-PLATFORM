// src/staff-cpd/pages/CpdCatalogPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Search, X, SlidersHorizontal } from "lucide-react";
import {
    useActivities, useActivityTree,
    useActivityComments, usePostComment,
    useMyBookmark, useToggleBookmark,
    useMyRating, useUpsertRating,
} from "../hooks";
import {
    CpdActivityCard, CpdEmptyState,
    CpdCommentPreviewSheet, CpdQuickRatingPopover,
} from "../components";
import type { CpdActivity } from "../lib";
import { FullScreen, PageHeader, ScrollBody, tap } from "./shared";

const CATEGORIES = ["All", "Clinical", "Leadership", "Ethics", "Research", "Education"];
const DIFFICULTIES = ["All", "beginner", "intermediate", "advanced"];

export function CpdCatalogPage() {
    const nav = useNavigate();
    const qc = useQueryClient();

    const [search, setSearch] = useState("");
    const [debounced, setDebounced] = useState("");
    const [category, setCategory] = useState<string>("All");
    const [difficulty, setDifficulty] = useState<string>("All");

    // Debounce search — but keep old results visible while typing.
    useEffect(() => {
        const t = setTimeout(() => setDebounced(search), 250);
        return () => clearTimeout(t);
    }, [search]);

    const q = useActivities({
        search: debounced || undefined,
        category: category === "All" ? undefined : category,
        difficulty: difficulty === "All" ? undefined : difficulty,
    });
    const items = useMemo(() => q.data?.pages.flatMap(p => p.items) ?? [], [q.data]);

    // ── Optimistic overlays ─────────────────────────────────────────────
    const [optimisticBookmarks, setOptimisticBookmarks] = useState<Record<string, boolean>>({});
    const [optimisticRatings, setOptimisticRatings] = useState<Record<string, number>>({});

    // Sheet/popover state
    const [sheetActivity, setSheetActivity] = useState<CpdActivity | null>(null);
    const [ratingActivity, setRatingActivity] = useState<CpdActivity | null>(null);

    // Prefetch detail on press for instant nav
    const prefetch = (activityId: string) => {
        qc.prefetchQuery({
            queryKey: ["cpd", "activity-tree", activityId],
            queryFn: () => fetchTree(activityId),
            staleTime: 60_000,
        });
    };

    const isFirstLoad = q.isLoading && items.length === 0;

    return (
        <FullScreen>
            <PageHeader
                title="CPD Catalog"
                subtitle="Published activities you can enrol in"
                onBack={() => { tap(); nav("/cpd"); }}
            />

            <ScrollBody>
                {/* Sticky header: search + filters */}
                <div className="sticky top-0 z-20 bg-[#f7f8fa] dark:bg-[#0d1117] pb-2">
                    <div className="px-4 pt-4 space-y-2">
                        <div className="relative">
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search activities…"
                                className="w-full h-10 rounded-xl bg-white dark:bg-[#161b22]
                                           pl-9 pr-9 text-[13px] font-medium
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           outline-none"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
                                              text-slate-400 pointer-events-none" />
                            {search && (
                                <button
                                    onClick={() => { tap(); setSearch(""); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg
                                               flex items-center justify-center
                                               text-slate-400 active:scale-90 transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Category chips */}
                        <FilterChipRow
                            options={CATEGORIES}
                            value={category}
                            onChange={(v) => { tap(); setCategory(v); }}
                        />
                        <FilterChipRow
                            options={DIFFICULTIES}
                            value={difficulty}
                            onChange={(v) => { tap(); setDifficulty(v); }}
                            renderLabel={(v) => v === "All" ? "All levels" : v}
                        />
                    </div>
                </div>

                <div className="px-4 pt-2 space-y-4">
                    {isFirstLoad ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-64 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                            ))}
                        </div>
                    ) : items.length ? (
                        <>
                            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 transition-opacity ${q.isFetching ? "opacity-60" : "opacity-100"
                                }`}>
                                {items.map((a) => (
                                    <CpdActivityCard
                                        key={a.id}
                                        activity={a}
                                        onPressStart={() => prefetch(a.id)}
                                        isBookmarked={optimisticBookmarks[a.id] ?? !!a.is_bookmarked}
                                        myRating={optimisticRatings[a.id] ?? a.my_rating ?? 0}
                                        onToggleBookmark={() => {
                                            const next = !(optimisticBookmarks[a.id] ?? !!a.is_bookmarked);
                                            tap();
                                            setOptimisticBookmarks(prev => ({ ...prev, [a.id]: next }));
                                            toggleBookmark.mutate(
                                                { activityId: a.id, isBookmarked: next },
                                                { onError: () => setOptimisticBookmarks(prev => ({ ...prev, [a.id]: !next })) }
                                            );
                                        }}
                                        onOpenComments={() => { tap(); setSheetActivity(a); }}
                                        onQuickRate={() => { tap(); setRatingActivity(a); }}
                                    />
                                ))}
                            </div>
                            {q.hasNextPage && (
                                <div className="flex justify-center pt-2">
                                    <button
                                        onClick={() => { tap(); q.fetchNextPage(); }}
                                        disabled={q.isFetchingNextPage}
                                        className="h-10 px-4 rounded-xl
                                                   bg-slate-100 dark:bg-white/[0.06]
                                                   text-slate-700 dark:text-slate-200
                                                   text-[12px] font-bold
                                                   active:scale-[0.97] transition-transform
                                                   disabled:opacity-50"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {q.isFetchingNextPage ? "Loading…" : "Load more"}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <CpdEmptyState
                            title={debounced || category !== "All" || difficulty !== "All" ? "No matching activities" : "No activities yet"}
                            hint={
                                debounced || category !== "All" || difficulty !== "All"
                                    ? "Try a different search term or filter."
                                    : "Once staff publish CPD activities they'll appear here."
                            }
                        />
                    )}
                </div>
            </ScrollBody>

            {/* Bottom-sheet comment preview */}
            {sheetActivity && (
                <CpdCommentPreviewSheet
                    activity={sheetActivity}
                    onClose={() => setSheetActivity(null)}
                    onOpenDetail={() => {
                        const id = sheetActivity.id;
                        setSheetActivity(null);
                        nav(`/cpd/activity/${id}`);
                    }}
                />
            )}

            {/* Inline quick rating popover */}
            {ratingActivity && (
                <CpdQuickRatingPopover
                    activity={ratingActivity}
                    currentRating={optimisticRatings[ratingActivity.id] ?? ratingActivity.my_rating ?? 0}
                    onClose={() => setRatingActivity(null)}
                    onRate={(stars) => {
                        const id = ratingActivity.id;
                        tap("success");
                        setOptimisticRatings(prev => ({ ...prev, [id]: stars }));
                        setRatingActivity(null);
                        // fire-and-forget; hooks roll back on error
                    }}
                />
            )}
        </FullScreen>
    );
}

/* ── helpers ───────────────────────────────────────────────────── */

function FilterChipRow({
    options, value, onChange, renderLabel,
}: {
    options: string[];
    value: string;
    onChange: (v: string) => void;
    renderLabel?: (v: string) => string;
}) {
    return (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
            {options.map((o) => {
                const active = o === value;
                return (
                    <button
                        key={o}
                        onClick={() => onChange(o)}
                        className={`shrink-0 h-7 px-2.5 rounded-full text-[10px] font-bold
                                    capitalize whitespace-nowrap
                                    active:scale-[0.96] transition-all
                                    ${active
                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                : "bg-white dark:bg-[#161b22] text-slate-600 dark:text-slate-300"
                            }`}
                        style={{ touchAction: "manipulation" }}
                    >
                        {renderLabel ? renderLabel(o) : o}
                    </button>
                );
            })}
        </div>
    );
}

// Placeholder — replace with your real fetcher from hooks
async function fetchTree(_id: string): Promise<any> {
    throw new Error("wire to real API");
}