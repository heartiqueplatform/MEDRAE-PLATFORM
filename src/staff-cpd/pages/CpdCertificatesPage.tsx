// src/staff-cpd/pages/CpdCertificatesPage.tsx
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Award } from "lucide-react";
import { useMyCertificates } from "../hooks";
import { CpdCertificateCard, CpdEmptyState } from "../components";
import { FullScreen, PageHeader, ScrollBody, tap } from "./shared";

export function CpdCertificatesPage() {
    const nav = useNavigate();
    const q = useMyCertificates();
    const items = useMemo(() => q.data?.pages.flatMap(p => p.items) ?? [], [q.data]);

    const handleBack = useCallback(() => {
        tap();
        nav("/cpd");
    }, [nav]);

    return (
        <FullScreen>
            <PageHeader
                title="My Certificates"
                subtitle="Verified CPD certificates"
                onBack={handleBack}
            />

            <ScrollBody>
                <div className="px-1.5 sm:px-4 pt-3 space-y-3">
                    {q.isLoading && !items.length ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <CertificateSkeleton key={i} />
                            ))}
                        </div>
                    ) : items.length ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {items.map((c) => (
                                    <CpdCertificateCard key={c.id} certificate={c} />
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
                            title="No certificates yet"
                            hint="Complete a CPD activity to earn your first certificate."
                            icon={Award}
                        />
                    )}
                </div>
            </ScrollBody>
        </FullScreen>
    );
}

/* ── Skeleton shaped like the real certificate card ───────────── */
function CertificateSkeleton() {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 animate-pulse">
            <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-white/[0.06] shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="h-3 w-3/4 rounded-full bg-slate-200 dark:bg-white/[0.06] mb-2" />
                    <div className="h-2 w-1/2 rounded-full bg-slate-100 dark:bg-white/[0.04] mb-3" />
                    <div className="flex gap-1.5">
                        <div className="h-4 w-16 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                        <div className="h-4 w-20 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                    </div>
                </div>
            </div>
            <div className="h-8 rounded-lg bg-slate-100 dark:bg-white/[0.04] mt-3" />
        </div>
    );
}