// src/staff-cpd/pages/CpdVerifyPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { Award, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useVerifyCertificate } from "../hooks";
import { fmtDate, fmtHours, fmtPoints } from "../lib";
import { FullScreen, PageHeader, ScrollBody } from "./shared";

export function CpdVerifyPage() {
    const { code = "" } = useParams();
    const nav = useNavigate();
    const q = useVerifyCertificate(code);

    return (
        <FullScreen>
            <PageHeader
                title="Certificate Verification"
                subtitle={`Code: ${code}`}
                onBack={() => { tap(); nav("/cpd"); }}
            />

            <ScrollBody>
                <div className="px-4 pt-4">
                    {q.isLoading ? (
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center">
                            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                                Checking…
                            </p>
                        </div>
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
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Activity
                                    </span>
                                    <span className="text-[12px] font-bold text-slate-900 dark:text-white text-right truncate">
                                        {q.data.activity?.title}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Issued
                                    </span>
                                    <span className="text-[12px] font-bold text-slate-900 dark:text-white">
                                        {fmtDate(q.data.certificate?.issued_at)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Points
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-amber-600 dark:text-amber-400">
                                        <Award className="h-3.5 w-3.5" />
                                        {fmtPoints(q.data.completion?.points_awarded)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Hours
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-blue-600 dark:text-blue-400">
                                        <Clock className="h-3.5 w-3.5" />
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