// src/staff-cpd/pages/ContributorApplyPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ChevronLeft, CheckCircle2, Clock, XCircle, Loader2,
    ShieldCheck, AlertCircle, UserCheck, ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (p: number | number[] = 15) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};
const tap = (type: "light" | "success" | "warning" = "light") => {
    try { playSound("ui-tap"); } catch { /* no-op */ }
    if (type === "success") vibrate([15, 30, 15]);
    else if (type === "warning") vibrate(40);
    else vibrate(12);
};

/* ------------------------------------------------------------------ */
/*  Admin IDs — must match the ones in ContributorReviewsPage         */
/* ------------------------------------------------------------------ */

const ADMIN_IDS = [
    "25f37970-c9b9-4c15-b8a2-514a912e3261",
    "731974f9-5af2-44c3-bf13-547fc4c89209",
];

/* ------------------------------------------------------------------ */
/*  Shared styles                                                     */
/* ------------------------------------------------------------------ */

const InputBase = "w-full h-10 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none";

const TextareaBase = "w-full rounded-xl bg-white dark:bg-[#161b22] px-3 py-2 text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none resize-y";

const PrimaryBtn = "h-10 px-4 rounded-xl bg-blue-600 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

const Sk = "rounded bg-slate-100 dark:bg-white/[0.06] animate-pulse";

const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
        {children}
    </label>
);

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Profile {
    user_id: string;
    name: string;
    nck_number: string | null;
    years_experience: number | null;
    workplace: string | null;
    specialization: string | null;
    is_verified_contributor: boolean;
    contributor_tier: string;
}

interface VerificationRow {
    id: string;
    status: "submitted" | "approved" | "rejected";
    submitted_at: string;
    reviewed_at: string | null;
    review_notes: string | null;
    nck_license_url: string | null;
    employer_letter_url: string | null;
    cv_url: string | null;
    additional_notes: string | null;
}

/* ------------------------------------------------------------------ */
/*  Skeleton loader — full page, no spinner                           */
/* ------------------------------------------------------------------ */

function SkeletonApplyPage() {
    return (
        <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]">
                <div className={`h-10 w-10 rounded-full shrink-0 ${Sk}`} />
                <div className="flex-1 space-y-1.5">
                    <div className={`h-3 w-32 ${Sk}`} />
                    <div className={`h-2 w-24 ${Sk}`} />
                </div>
            </header>

            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <div className="w-full max-w-[880px] mx-auto px-4 pt-4 pb-16 space-y-3">
                    {/* Requirements card skeleton */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <div className={`h-3 w-28 ${Sk}`} />
                        <div className="space-y-2 pt-1">
                            <div className={`h-2.5 w-full ${Sk}`} />
                            <div className={`h-2.5 w-5/6 ${Sk}`} />
                            <div className={`h-2.5 w-4/5 ${Sk}`} />
                            <div className={`h-2.5 w-3/4 ${Sk}`} />
                        </div>
                    </section>

                    {/* Application form skeleton */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <div className={`h-3 w-24 ${Sk}`} />

                        <div className="space-y-1.5">
                            <div className={`h-2 w-32 ml-1 ${Sk}`} />
                            <div className={`h-10 w-full rounded-xl ${Sk}`} />
                            <div className={`h-2 w-48 ml-1 ${Sk}`} />
                        </div>

                        <div className="space-y-1.5">
                            <div className={`h-2 w-28 ml-1 ${Sk}`} />
                            <div className={`h-10 w-full rounded-xl ${Sk}`} />
                        </div>

                        <div className="space-y-1.5">
                            <div className={`h-2 w-40 ml-1 ${Sk}`} />
                            <div className={`h-10 w-full rounded-xl ${Sk}`} />
                        </div>

                        <div className="space-y-1.5">
                            <div className={`h-2 w-36 ml-1 ${Sk}`} />
                            <div className={`h-20 w-full rounded-xl ${Sk}`} />
                        </div>

                        <div className={`h-10 w-full rounded-xl ${Sk}`} />
                    </section>
                </div>
            </main>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

export default function ContributorApplyPage() {
    const nav = useNavigate();
    const home = useHomeRoute();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [latestVerification, setLatestVerification] = useState<VerificationRow | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [nckLicenseUrl, setNckLicenseUrl] = useState("");
    const [employerLetterUrl, setEmployerLetterUrl] = useState("");
    const [cvUrl, setCvUrl] = useState("");
    const [additionalNotes, setAdditionalNotes] = useState("");
    const [err, setErr] = useState<string | null>(null);

    /* ---- Load profile + latest verification ---- */
    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }

            const [profileRes, verificationRes] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("user_id, name, nck_number, years_experience, workplace, specialization, is_verified_contributor, contributor_tier")
                    .eq("user_id", user.id)
                    .maybeSingle(),
                supabase
                    .from("contributor_verifications")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("submitted_at", { ascending: false })
                    .limit(1)
                    .maybeSingle(),
            ]);

            if (profileRes.data) setProfile(profileRes.data);
            if (verificationRes.data) setLatestVerification(verificationRes.data);
            setLoading(false);
        })();
    }, []);

    /* ---- Submit application ---- */
    const handleSubmit = async () => {
        if (submitting || !profile) return;

        if (!nckLicenseUrl.trim() || !cvUrl.trim()) {
            setErr("NCK licence image URL and CV URL are required.");
            tap("warning");
            return;
        }

        setErr(null);
        tap("success");
        setSubmitting(true);

        try {
            const { error } = await supabase
                .from("contributor_verifications")
                .insert({
                    user_id: profile.user_id,
                    nck_license_url: nckLicenseUrl.trim(),
                    employer_letter_url: employerLetterUrl.trim() || null,
                    cv_url: cvUrl.trim(),
                    additional_notes: additionalNotes.trim() || null,
                    status: "submitted",
                });

            if (error) throw error;

            const { data } = await supabase
                .from("contributor_verifications")
                .select("*")
                .eq("user_id", profile.user_id)
                .order("submitted_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            setLatestVerification(data ?? null);
            setNckLicenseUrl("");
            setEmployerLetterUrl("");
            setCvUrl("");
            setAdditionalNotes("");
        } catch (e: any) {
            setErr(e?.message ?? "Failed to submit application.");
        } finally {
            setSubmitting(false);
        }
    };

    /* ---- Loading (skeleton, no spinner) ---- */
    if (loading) return <SkeletonApplyPage />;

    if (!profile) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
                <header className="shrink-0 flex items-center gap-2 px-2 h-14
                                   bg-white dark:bg-[#0d1117]
                                   border-b border-slate-200/70 dark:border-white/[0.06]">
                    <button onClick={() => nav(-1)} className="h-10 w-10 rounded-full flex items-center justify-center active:bg-slate-100 dark:active:bg-white/5">
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-base font-bold">Apply to Contribute</h1>
                </header>
                <main className="flex-1 flex items-center justify-center p-4">
                    <p className="text-[12px] text-slate-500 dark:text-slate-400">Could not load profile.</p>
                </main>
            </div>
        );
    }

    /* ---- Derived flags ---- */
    const isApproved = profile.is_verified_contributor;
    const isPending = latestVerification?.status === "submitted";
    const isRejected = latestVerification?.status === "rejected";
    const isAdmin = ADMIN_IDS.includes(profile.user_id);

    /* ═══════════════════════════════════════════════════════════
       ADMIN BYPASS — admins skip the application entirely
       ═══════════════════════════════════════════════════════════ */
    if (isAdmin && !isApproved) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white">
                <header className="shrink-0 flex items-center gap-2 px-2 h-14
                                   bg-white dark:bg-[#0d1117]
                                   border-b border-slate-200/70 dark:border-white/[0.06]
                                   z-30 safe-top">
                    <button
                        onClick={() => { tap(); nav(-1); }}
                        aria-label="Back"
                        className="h-10 w-10 rounded-full flex items-center justify-center
                                   text-slate-700 dark:text-slate-200
                                   active:bg-slate-100 dark:active:bg-white/5"
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate">
                            Apply to Contribute
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            Admin access
                        </p>
                    </div>
                </header>

                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                    <div className="w-full max-w-[880px] mx-auto px-4 pt-4 pb-16 space-y-3">
                        {/* Admin notice */}
                        <section className="rounded-2xl bg-violet-50 dark:bg-violet-400/10 p-4">
                            <div className="flex items-start gap-2.5">
                                <div className="h-10 w-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0">
                                    <ShieldCheck className="h-5 w-5" strokeWidth={2.4} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider
                                                  text-violet-600 dark:text-violet-400 leading-none mb-1">
                                        Admin account
                                    </p>
                                    <h2 className="text-[13px] font-bold text-violet-700 dark:text-violet-300 leading-tight">
                                        You skip the application flow
                                    </h2>
                                    <p className="text-[11px] text-violet-700/80 dark:text-violet-400/80 mt-1 leading-snug">
                                        Admins don't apply — you toggle your own contributor status
                                        from the admin panel. One tap and you're in.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* What you can do */}
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                            <h2 className="text-[10px] font-bold uppercase tracking-wider
                                           text-slate-500 dark:text-slate-400">
                                What happens when you toggle on
                            </h2>

                            <ul className="space-y-2 text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    <span>Your <b>verified contributor badge</b> appears on the dashboard</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    <span>Your <b>MedraeCoins earnings card</b> appears on the dashboard and CPD page</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    <span>You can <b>author and publish CPD activities</b> like any contributor</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    <span>You earn <b>20 MC per completion</b> of your activities</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    <span>You can <b>toggle off anytime</b> to return to regular admin</span>
                                </li>
                            </ul>
                        </section>

                        {/* CTA */}
                        <button
                            onClick={() => { tap("success"); nav("/cpd/admin/contributors"); }}
                            className="w-full h-12 rounded-xl bg-violet-600 text-white
                                       text-[13px] font-bold
                                       flex items-center justify-center gap-2
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <UserCheck className="h-4 w-4" />
                            Go to admin panel
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>

                        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center leading-snug">
                            The admin panel has a one-tap toggle at the top — "Become contributor".
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════════
       REGULAR USER VIEW — normal application flow
       ═══════════════════════════════════════════════════════════ */
    return (
        <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white">
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={() => { tap(); nav(-1); }}
                    aria-label="Back"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5"
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate">
                        Apply to Contribute
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        Verified educators only
                    </p>
                </div>
            </header>

            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <div className="w-full max-w-[880px] mx-auto px-4 pt-4 pb-16 space-y-3">

                    {/* Approved banner */}
                    {isApproved && (
                        <section className="rounded-2xl bg-emerald-50 dark:bg-emerald-400/10 p-4">
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400">
                                        You're a verified contributor
                                    </p>
                                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1 leading-snug">
                                        Your tier: <span className="font-bold capitalize">{profile.contributor_tier.replace(/_/g, " ")}</span>. You can now submit CPD content and earn MedraeCoins.
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Pending banner */}
                    {isPending && !isApproved && (
                        <section className="rounded-2xl bg-amber-50 dark:bg-amber-400/10 p-4">
                            <div className="flex items-start gap-2.5">
                                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[13px] font-bold text-amber-700 dark:text-amber-400">
                                        Application under review
                                    </p>
                                    <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1 leading-snug">
                                        Submitted on {new Date(latestVerification!.submitted_at).toLocaleDateString()}. We'll review it soon — usually within 2-3 days.
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Rejected banner */}
                    {isRejected && !isApproved && (
                        <section className="rounded-2xl bg-rose-50 dark:bg-rose-400/10 p-4">
                            <div className="flex items-start gap-2.5">
                                <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[13px] font-bold text-rose-700 dark:text-rose-400">
                                        Application rejected
                                    </p>
                                    {latestVerification!.review_notes && (
                                        <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-1 leading-snug">
                                            Reason: {latestVerification!.review_notes}
                                        </p>
                                    )}
                                    <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-1 leading-snug">
                                        You can submit a new application below.
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Requirements */}
                    {!isApproved && (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
                            <h2 className="text-[13px] font-bold text-slate-900 dark:text-white">
                                Requirements
                            </h2>
                            <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    <span>Active NCK licence (3+ years post-registration)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    <span>Current employer verification</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    <span>30+ day unbroken streak in Medrae</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    <span>Endorsed by an existing contributor</span>
                                </li>
                            </ul>
                        </section>
                    )}

                    {/* Application form */}
                    {!isApproved && !isPending && (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                            <h2 className="text-[13px] font-bold text-slate-900 dark:text-white">
                                Application
                            </h2>

                            <div>
                                <Label>NCK Licence Image URL *</Label>
                                <input
                                    value={nckLicenseUrl}
                                    onChange={(e) => setNckLicenseUrl(e.target.value)}
                                    placeholder="https://…"
                                    className={InputBase}
                                />
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 ml-1">
                                    Upload to imgur, Google Drive (public), or any image host. Paste the direct URL.
                                </p>
                            </div>

                            <div>
                                <Label>CV / Resume URL *</Label>
                                <input
                                    value={cvUrl}
                                    onChange={(e) => setCvUrl(e.target.value)}
                                    placeholder="https://…"
                                    className={InputBase}
                                />
                            </div>

                            <div>
                                <Label>Employer Letter URL (optional)</Label>
                                <input
                                    value={employerLetterUrl}
                                    onChange={(e) => setEmployerLetterUrl(e.target.value)}
                                    placeholder="https://…"
                                    className={InputBase}
                                />
                            </div>

                            <div>
                                <Label>Additional Notes (optional)</Label>
                                <textarea
                                    value={additionalNotes}
                                    onChange={(e) => setAdditionalNotes(e.target.value)}
                                    placeholder="Anything we should know — specialty areas, teaching experience, etc."
                                    rows={3}
                                    className={TextareaBase}
                                />
                            </div>

                            {err && (
                                <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-400/10 p-3">
                                    <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-rose-700 dark:text-rose-300">{err}</p>
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !nckLicenseUrl.trim() || !cvUrl.trim()}
                                className={PrimaryBtn + " w-full"}
                                style={{ touchAction: "manipulation" }}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Submitting…
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        Submit application
                                    </>
                                )}
                            </button>
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
}