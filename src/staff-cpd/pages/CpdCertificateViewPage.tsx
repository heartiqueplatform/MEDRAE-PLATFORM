// src/staff-cpd/pages/CpdCertificateViewPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Award, Download } from "lucide-react";
import { useCertificate } from "../hooks";
import { CpdEmptyState } from "../components";
import { fmtDate } from "../lib";
import { supabase } from "@/lib/supabaseClient";
import { CpdCertificatePdf } from "../certificate-pdf";
import { FullScreen, PageHeader, ScrollBody, tap } from "./shared";

export function CpdCertificateViewPage() {
    const { id = "" } = useParams();
    const nav = useNavigate();
    const q = useCertificate(id);
    const [profile, setProfile] = useState<any>(null);
    const [activity, setActivity] = useState<any>(null);
    const [completion, setCompletion] = useState<any>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;

            const [profileRes, completionRes] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("name, nck_number, specialization, institution, county")
                    .eq("user_id", user.id)
                    .maybeSingle(),
                q.data?.completion_id
                    ? supabase
                        .from("cpd_completions")
                        .select("*, activity:cpd_activities(*)")
                        .eq("id", q.data.completion_id)
                        .maybeSingle()
                    : Promise.resolve({ data: null, error: null } as any),
            ]);

            if (cancelled) return;
            if (profileRes.data) setProfile(profileRes.data);
            if (completionRes.data) {
                setCompletion(completionRes.data);
                if (completionRes.data.activity) setActivity(completionRes.data.activity);
            }
        })();
        return () => { cancelled = true; };
    }, [q.data?.completion_id]);

    if (q.isLoading) {
        return (
            <FullScreen>
                <PageHeader title="Certificate" onBack={() => nav(-1)} />
                <ScrollBody>
                    {/* ✅ No inner px-* — ScrollBody owns the gutter */}
                    <div className="pt-3">
                        <CertificateSkeleton />
                    </div>
                </ScrollBody>
            </FullScreen>
        );
    }
    if (!q.data) {
        return (
            <FullScreen>
                <PageHeader title="Certificate" onBack={() => nav(-1)} />
                <ScrollBody>
                    <div className="pt-3">
                        <CpdEmptyState title="Certificate not found" />
                    </div>
                </ScrollBody>
            </FullScreen>
        );
    }
    const c: any = q.data;

    const handleDownloadPdf = () => {
        tap();
        window.print();
    };

    return (
        <>
            <FullScreen>
                <PageHeader
                    title="Certificate"
                    subtitle="Verified CPD completion"
                    onBack={() => { tap(); nav("/cpd/certificates"); }}
                />

                <ScrollBody>
                    {/* ✅ No inner px-* — ScrollBody owns the gutter */}
                    <div className="pt-3 print:hidden">
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center space-y-4">
                            {/* Award icon — neutral container, amber only on the glyph */}
                            <div className="h-16 w-16 mx-auto rounded-2xl flex items-center justify-center
                                            bg-slate-100 dark:bg-white/[0.06]">
                                <Award className="h-8 w-8 text-amber-500 dark:text-amber-400" strokeWidth={2.4} />
                            </div>

                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-amber-600 dark:text-amber-400">
                                    Certificate of Completion
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                    Medrae Nursing — Continuing Professional Development
                                </p>
                            </div>

                            <div className="border-t border-b border-slate-100 dark:border-white/[0.04] py-4 space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Awarded to
                                </p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">
                                    {profile?.name || "—"}
                                </p>
                                {(profile?.nck_number || profile?.institution) && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {profile?.nck_number ? `NCK: ${profile.nck_number}` : ""}
                                        {profile?.nck_number && profile?.institution ? " · " : ""}
                                        {profile?.institution || ""}
                                    </p>
                                )}
                            </div>

                            {activity?.title && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Activity
                                    </p>
                                    <p className="text-[14px] font-bold text-slate-900 dark:text-white mt-1">
                                        {activity.title}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 text-left">
                                <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Issued
                                    </p>
                                    <p className="text-[12px] font-bold text-slate-900 dark:text-white mt-1">
                                        {fmtDate(c.issued_at)}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Status
                                    </p>
                                    <p className="text-[12px] font-bold text-slate-900 dark:text-white capitalize mt-1">
                                        {c.status}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-1 text-left">
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-slate-500 dark:text-slate-400">
                                    Verification code
                                </p>
                                <p className="text-[12px] font-mono font-bold text-slate-900 dark:text-white break-all">
                                    {c.verification_code}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    Verify at /cpd/verify/{c.verification_code}
                                </p>
                            </div>

                            <button
                                onClick={handleDownloadPdf}
                                className="w-full h-11 rounded-xl bg-amber-500 text-white
                                           text-[13px] font-bold
                                           flex items-center justify-center gap-2
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                <Download className="h-4 w-4" />
                                Download PDF
                            </button>

                            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug">
                                In the print dialog, choose <b>Save as PDF</b> and set layout to <b>Landscape</b>.
                            </p>
                        </section>
                    </div>
                </ScrollBody>
            </FullScreen>

            <CpdCertificatePdf
                certificate={c}
                completion={completion}
                activity={activity}
                recipient={profile}
            />
        </>
    );
}

/* ── Skeleton — shape-matched to the real certificate card ──── */
function CertificateSkeleton() {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center space-y-4 animate-pulse">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-200 dark:bg-white/[0.06]" />
            <div className="space-y-1.5">
                <div className="mx-auto h-2.5 w-40 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
                <div className="mx-auto h-2 w-56 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
            </div>
            <div className="border-t border-b border-slate-100 dark:border-white/[0.04] py-4 space-y-2">
                <div className="mx-auto h-2 w-24 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                <div className="mx-auto h-5 w-40 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
                <div className="mx-auto h-2 w-32 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
            </div>
            <div className="space-y-1.5">
                <div className="mx-auto h-2 w-20 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                <div className="mx-auto h-3 w-48 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="h-16 rounded-xl bg-slate-100 dark:bg-white/[0.04]" />
                <div className="h-16 rounded-xl bg-slate-100 dark:bg-white/[0.04]" />
            </div>
            <div className="h-20 rounded-xl bg-slate-100 dark:bg-white/[0.04]" />
            <div className="h-11 rounded-xl bg-slate-200 dark:bg-white/[0.06]" />
        </div>
    );
}