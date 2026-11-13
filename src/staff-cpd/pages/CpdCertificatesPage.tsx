// src/staff-cpd/pages/CpdCertificatesPage.tsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Award } from "lucide-react";
import { useMyCertificates } from "../hooks";
import { CpdCertificateCard, CpdEmptyState } from "../components";
import { FullScreen, PageHeader, ScrollBody, tap } from "./shared";

export function CpdCertificatesPage() {
    const nav = useNavigate();
    const q = useMyCertificates();
    const items = useMemo(() => q.data?.pages.flatMap(p => p.items) ?? [], [q.data]);

    return (
        <FullScreen>
            <PageHeader
                title="My Certificates"
                subtitle="Verified CPD certificates"
                onBack={() => { tap(); nav("/cpd"); }}
            />

            <ScrollBody>
                <div className="px-4 pt-4 space-y-3">
                    {q.isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-28 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                            ))}
                        </div>
                    ) : items.length ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {items.map((c) => <CpdCertificateCard key={c.id} certificate={c} />)}
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