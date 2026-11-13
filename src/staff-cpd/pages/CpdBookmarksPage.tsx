import { useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
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

    return (
        <FullScreen>
            <PageHeader
                title="Saved Activities"
                subtitle="Activities you've bookmarked"
                onBack={() => { tap(); nav("/cpd"); }}
            />

            <ScrollBody>
                <div className="px-4 pt-4 space-y-3">
                    {q.isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-64 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
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