// src/staff-cpd/pages/CpdVerifyPage.tsx
import { useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Award, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useVerifyCertificate } from "../hooks";
import { fmtDate, fmtHours, fmtPoints } from "../lib";
import { FullScreen, PageHeader, ScrollBody, tap } from "./shared";

export function CpdVerifyPage() {
    const { code = "" } = useParams();
    const nav = useNavigate();
    const q = useVerifyCertificate(code);

    const handleBack = useCallback(() => {
        tap();
        nav("/cpd");
    }, [nav]);

    return (
        <FullScreen>
            <PageHeader
                title="Certificate Verification"
                subtitle={`Code: ${code}`}
                onBack={handleBack}
            />

            <ScrollBody>
                {/* ✅ No px-* — ScrollBody owns the gutter */}
                <div className="pt-3">
                    {q.isLoading ? (
                        <VerifySkeleton />
                    ) : q.data?.valid ? (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center space-y-4">
                            <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center
                                            bg-emerald-50 dark:bg-emerald-400/10">
                                <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" strokeWidth={2.6} />
                            </div>
                            <p className="text-[14px] font-bold text-emerald-600 dark:text-emerald-400">
                                Valid Certificate
                            </p>

                            <div className="text-left space-y-3 pt-4 border-t border-slate-100 dark:border-white/[0.04]">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
                                        Activity
                                    </span>
                                    <span className="text-[12px] font-bold text-slate-900 dark:text-white text-right truncate">
                                        {q.data.activity?.title}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
                                        Issued
                                    </span>
                                    <span className="text-[12px] font-bold text-slate-900 dark:text-white">
                                        {fmtDate(q.data.certificate?.issued_at)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
                                        Points
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-900 dark:text-white tabular-nums">
                                        <Award className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                        {fmtPoints(q.data.completion?.points_awarded)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
                                        Hours
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-900 dark:text-white tabular-nums">
                                        <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                        {fmtHours(q.data.completion?.learning_hours_completed)}
                                    </span>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center space-y-3">
                            <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center
                                            bg-rose-50 dark:bg-rose-400/10">
                                <XCircle className="h-7 w-7 text-rose-600 dark:text-rose-400" strokeWidth={2.6} />
                            </div>
                            <p className="text-[14px] font-bold text-rose-600 dark:text-rose-400">
                                Certificate Not Found
                            </p>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                The verification code could not be matched to a valid certificate.
                            </p>
                        </section>
                    )}
                </div>
            </ScrollBody>
        </FullScreen>
    );
}

/* ── Skeleton — shape-matched to the "valid" card ────────────── */
function VerifySkeleton() {
    return (
        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center space-y-4 animate-pulse">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-200 dark:bg-white/[0.06]" />
            <div className="h-4 w-40 rounded-full bg-slate-200 dark:bg-white/[0.06] mx-auto" />

            <div className="text-left space-y-3 pt-4 border-t border-slate-100 dark:border-white/[0.04]">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                        <div className="h-2 w-16 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                        <div className="h-3 w-28 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
                    </div>
                ))}
            </div>
        </section>
    );
}