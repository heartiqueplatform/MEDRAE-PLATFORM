// src/staff-cpd/pages/CpdBookmarksPage.tsx
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark } from "lucide-react";
import { useMyBookmarks } from "../hooks";
import { CpdActivityCard, CpdEmptyState } from "../components";
import { FullScreen, PageHeader, ScrollBody, tap } from "./shared";

export function CpdBookmarksPage() {
    const nav = useNavigate();
    const q = useMyBookmarks();
    const items = useMemo(
        () => q.data?.pages.flatMap(p => p.items).filter(x => x.activity) ?? [],
        [q.data]
    );

    const handleBack = useCallback(() => {
        tap();
        nav("/cpd");
    }, [nav]);

    return (
        <FullScreen>
            <PageHeader
                title="Saved Activities"
                subtitle="Activities you've bookmarked"
                onBack={handleBack}
            />

            <ScrollBody>
                {/* ✅ No inner px-* — ScrollBody owns the gutter */}
                <div className="pt-3 space-y-3">
                    {q.isLoading && !items.length ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <BookmarkCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : items.length ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {items.map((b) => (
                                    <CpdActivityCard key={b.id} activity={b.activity} />
                                ))}
                            </div>
                            {q.hasNextPage && (
                                <div className="flex justify-center pt-2 pb-4">
                                    <button
                                        onClick={() => { tap(); q.fetchNextPage(); }}
                                        disabled={q.isFetchingNextPage}
                                        className="h-11 px-5 rounded-xl
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
                            title="No saved activities"
                            hint="Tap the bookmark icon on any activity to save it here."
                            icon={Bookmark}
                        />
                    )}
                </div>
            </ScrollBody>
        </FullScreen>
    );
}

/* ── Skeleton — shape-matched to CpdActivityCard ────────────── */
function BookmarkCardSkeleton() {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 animate-pulse">
            <div className="h-32 rounded-xl bg-slate-200 dark:bg-white/[0.06] mb-3" />
            <div className="h-3 w-2/3 rounded-full bg-slate-200 dark:bg-white/[0.06] mb-2" />
            <div className="h-2 w-1/2 rounded-full bg-slate-100 dark:bg-white/[0.04] mb-3" />
            <div className="flex gap-2">
                <div className="h-6 w-14 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                <div className="h-6 w-14 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
            </div>
        </div>
    );
}