// src/staff-cpd/pages/CpdCatalogPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useActivities } from "../hooks";
import { CpdActivityCard, CpdEmptyState } from "../components";
import { FullScreen, PageHeader, ScrollBody, tap } from "./shared";

export function CpdCatalogPage() {
    const nav = useNavigate();
    const [search, setSearch] = useState("");
    const [debounced, setDebounced] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setDebounced(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    const q = useActivities({ search: debounced || undefined });
    const items = useMemo(() => q.data?.pages.flatMap(p => p.items) ?? [], [q.data]);

    return (
        <FullScreen>
            <PageHeader
                title="CPD Catalog"
                subtitle="Published activities you can enrol in"
                onBack={() => { tap(); nav("/cpd"); }}
            />

            <ScrollBody>
                <div className="px-4 pt-4 space-y-4">
                    <div className="relative">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search activities…"
                            className="w-full h-10 rounded-xl bg-white dark:bg-[#161b22]
                                       pl-9 pr-3 text-[13px] font-medium
                                       text-slate-900 dark:text-white
                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                       outline-none"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
                                          text-slate-400 pointer-events-none" />
                    </div>

                    {q.isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-64 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                            ))}
                        </div>
                    ) : items.length ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {items.map((a) => <CpdActivityCard key={a.id} activity={a} />)}
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
                            title={debounced ? "No matching activities" : "No activities yet"}
                            hint={debounced ? "Try a different search term." : "Once staff publish CPD activities they'll appear here."}
                        />
                    )}
                </div>
            </ScrollBody>
        </FullScreen>
    );
}