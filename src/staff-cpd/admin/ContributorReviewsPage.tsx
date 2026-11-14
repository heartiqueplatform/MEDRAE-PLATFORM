// src/staff-cpd/admin/ContributorReviewsPage.tsx
import { useCallback, useEffect, useState } from "react";
import {
    CheckCircle2, XCircle, Clock, UserCheck,
    ExternalLink, ShieldCheck, AlertCircle, Power,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import { tap } from "../pages/shared";

/* ------------------------------------------------------------------ */
/*  ADMIN IDs                                                         */
/* ------------------------------------------------------------------ */
const ADMIN_IDS = [
    "25f37970-c9b9-4c15-b8a2-514a912e3261",
    "731974f9-5af2-44c3-bf13-547fc4c89209",
];

/* ------------------------------------------------------------------ */
/*  Shared styles — h-11 inputs                                       */
/* ------------------------------------------------------------------ */
const TextareaBase =
    "w-full rounded-xl bg-white dark:bg-[#161b22] px-3 py-2 text-[13px] font-medium " +
    "text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none resize-y";

const PrimaryBtn =
    "h-11 px-4 rounded-xl bg-emerald-600 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 " +
    "active:scale-[0.97] transition-transform disabled:opacity-50";

const SecondaryBtn =
    "h-11 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-[13px] font-bold " +
    "flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

const Sk = "rounded bg-slate-100 dark:bg-white/[0.06] animate-pulse";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface VerificationRow {
    id: string;
    user_id: string;
    nck_license_url: string | null;
    employer_letter_url: string | null;
    cv_url: string | null;
    additional_notes: string | null;
    status: "submitted" | "approved" | "rejected";
    reviewer_id: string | null;
    review_notes: string | null;
    submitted_at: string;
    reviewed_at: string | null;
}

interface ProfileInfo {
    user_id: string;
    name: string;
    email: string;
    nck_number: string | null;
    years_experience: number | null;
    workplace: string | null;
    specialization: string | null;
}

interface RowWithProfile extends VerificationRow {
    profile: ProfileInfo | null;
}

/* ------------------------------------------------------------------ */
/*  Skeletons                                                         */
/* ------------------------------------------------------------------ */
function SkeletonApplicationCard() {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
            <div className="flex items-start gap-2.5">
                <div className={`h-10 w-10 rounded-full shrink-0 ${Sk}`} />
                <div className="min-w-0 flex-1 space-y-2">
                    <div className={`h-3 w-36 ${Sk}`} />
                    <div className={`h-2.5 w-48 ${Sk}`} />
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <div className={`h-4 w-20 rounded-full ${Sk}`} />
                        <div className={`h-4 w-16 rounded-full ${Sk}`} />
                        <div className={`h-4 w-24 rounded-full ${Sk}`} />
                    </div>
                </div>
            </div>
            <div className="space-y-1.5">
                <div className={`h-10 w-full rounded-xl ${Sk}`} />
                <div className={`h-10 w-full rounded-xl ${Sk}`} />
            </div>
            <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                <div className={`h-11 flex-1 rounded-xl ${Sk}`} />
                <div className={`h-11 flex-1 rounded-xl ${Sk}`} />
            </div>
        </div>
    );
}

function SkeletonSelfToggle() {
    return (
        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
            <div className="flex items-start gap-2.5">
                <div className={`h-10 w-10 rounded-xl shrink-0 ${Sk}`} />
                <div className="min-w-0 flex-1 space-y-2">
                    <div className={`h-2 w-28 ${Sk}`} />
                    <div className={`h-3 w-44 ${Sk}`} />
                    <div className={`h-2.5 w-full ${Sk}`} />
                    <div className={`h-2.5 w-3/4 ${Sk}`} />
                </div>
            </div>
            <div className={`mt-3 h-11 w-full rounded-xl ${Sk}`} />
        </section>
    );
}

function SkeletonIntroCard() {
    return (
        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
            <div className="flex items-start gap-2.5">
                <div className={`h-10 w-10 rounded-xl shrink-0 ${Sk}`} />
                <div className="min-w-0 flex-1 space-y-2">
                    <div className={`h-3 w-48 ${Sk}`} />
                    <div className={`h-2.5 w-64 ${Sk}`} />
                </div>
            </div>
        </section>
    );
}

function SkeletonPage() {
    return (
        <div className="w-full max-w-[880px] mx-auto px-1.5 sm:px-4 pt-3 pb-16 space-y-3">
            <SkeletonSelfToggle />
            <SkeletonIntroCard />
            <div className="flex items-center gap-1.5 pb-1">
                <div className={`h-9 w-24 rounded-full ${Sk}`} />
                <div className={`h-9 w-24 rounded-full ${Sk}`} />
                <div className={`h-9 w-24 rounded-full ${Sk}`} />
            </div>
            <div className="space-y-2">
                <SkeletonApplicationCard />
                <SkeletonApplicationCard />
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Admin self-toggle                                                 */
/* ------------------------------------------------------------------ */
function AdminSelfToggle({ userId }: { userId: string }) {
    const [loading, setLoading] = useState(true);
    const [isContributor, setIsContributor] = useState(false);
    const [tier, setTier] = useState<string>("contributor");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data } = await supabase
                .from("profiles")
                .select("is_verified_contributor, contributor_tier")
                .eq("user_id", userId)
                .maybeSingle();
            if (cancelled) return;
            if (data) {
                setIsContributor(!!data.is_verified_contributor);
                setTier(data.contributor_tier ?? "contributor");
            }
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [userId]);

    const toggle = useCallback(async () => {
        if (busy) return;
        tap(isContributor ? "warning" : "success");
        setBusy(true);

        const next = !isContributor;
        const { error } = await supabase
            .from("profiles")
            .update({
                is_verified_contributor: next,
                contributor_tier: next ? "contributor" : "none",
                contributor_approved_at: next ? new Date().toISOString() : null,
                contributor_approved_by: next ? userId : null,
                nck_license_verified: next,
            })
            .eq("user_id", userId);

        if (!error) {
            setIsContributor(next);
            setTier(next ? "contributor" : "none");
        }
        setBusy(false);
    }, [busy, isContributor, userId]);

    if (loading) return <SkeletonSelfToggle />;

    return (
        <section className={`rounded-2xl p-4 ${isContributor
            ? "bg-emerald-50 dark:bg-emerald-400/10"
            : "bg-violet-50 dark:bg-violet-400/10"}`}>
            <div className="flex items-start gap-2.5">
                <div className={`h-10 w-10 rounded-xl text-white flex items-center justify-center shrink-0 ${isContributor ? "bg-emerald-600" : "bg-violet-600"}`}>
                    <ShieldCheck className="h-5 w-5" strokeWidth={2.4} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className={`text-[10px] font-bold uppercase tracking-wider leading-none mb-1 ${isContributor
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-violet-600 dark:text-violet-400"}`}>
                        Your contributor status
                    </p>
                    <h2 className={`text-[13px] font-bold leading-tight ${isContributor
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-violet-700 dark:text-violet-300"}`}>
                        {isContributor ? "You're a verified contributor" : "You're not a contributor yet"}
                    </h2>
                    <p className={`text-[11px] mt-1 leading-snug ${isContributor
                        ? "text-emerald-700/80 dark:text-emerald-400/80"
                        : "text-violet-700/80 dark:text-violet-400/80"}`}>
                        {isContributor
                            ? "Your badge + earnings card are live. Toggle off to return to regular admin."
                            : "One tap to enable your contributor badge, earnings card, and activity authoring."}
                    </p>
                </div>
            </div>

            <button
                onClick={toggle}
                disabled={busy}
                className={`mt-3 w-full h-11 rounded-xl text-white text-[13px] font-bold
                            flex items-center justify-center gap-2
                            active:scale-[0.97] transition-transform disabled:opacity-50 ${isContributor ? "bg-rose-600" : "bg-violet-600"}`}
                style={{ touchAction: "manipulation" }}
            >
                {busy ? (
                    <div className="h-4 w-24 rounded bg-white/30 animate-pulse" />
                ) : (
                    <Power className="h-4 w-4" />
                )}
                {isContributor ? "Remove contributor" : "Become contributor"}
            </button>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */
export default function ContributorReviewsPage() {
    const home = useHomeRoute();

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<RowWithProfile[]>([]);
    const [filter, setFilter] = useState<"submitted" | "approved" | "rejected">("submitted");
    const [actingId, setActingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
    const [rejectingOpenId, setRejectingOpenId] = useState<string | null>(null);
    const [tierPickerOpenId, setTierPickerOpenId] = useState<string | null>(null);

    /* ✅ loadRows declared BEFORE use, wrapped in useCallback */
    const loadRows = useCallback(async (status: "submitted" | "approved" | "rejected") => {
        const { data, error } = await supabase
            .from("contributor_verifications")
            .select(`
                *,
                profile:profiles!contributor_verifications_user_id_fkey (
                    user_id, name, email, nck_number, years_experience, workplace, specialization
                )
            `)
            .eq("status", status)
            .order("submitted_at", { ascending: false });
        if (error) {
            console.error("Failed to load verifications:", error);
            setRows([]);
            return;
        }
        setRows((data ?? []) as RowWithProfile[]);
    }, []);

    /* ✅ Auth check — no eslint-disable needed now */
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (cancelled) return;
            if (!user) { setLoading(false); return; }
            setCurrentUserId(user.id);
            const authorized = ADMIN_IDS.includes(user.id);
            setIsAuthorized(authorized);
            if (!authorized) { setLoading(false); return; }
            await loadRows("submitted");
            if (!cancelled) setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [loadRows]);

    const changeFilter = useCallback(async (f: "submitted" | "approved" | "rejected") => {
        tap();
        setFilter(f);
        await loadRows(f);
    }, [loadRows]);

    const handleApprove = useCallback(async (
        row: RowWithProfile,
        tier: "contributor" | "senior_contributor",
    ) => {
        if (!currentUserId || actingId) return;
        tap("success");
        setActingId(row.id);

        try {
            const { error: vErr } = await supabase
                .from("contributor_verifications")
                .update({
                    status: "approved",
                    reviewer_id: currentUserId,
                    reviewed_at: new Date().toISOString(),
                    review_notes: null,
                })
                .eq("id", row.id);
            if (vErr) throw vErr;

            const { error: pErr } = await supabase
                .from("profiles")
                .update({
                    is_verified_contributor: true,
                    contributor_tier: tier,
                    contributor_approved_at: new Date().toISOString(),
                    contributor_approved_by: currentUserId,
                    nck_license_verified: true,
                })
                .eq("user_id", row.user_id);
            if (pErr) throw pErr;

            await loadRows(filter);
            setTierPickerOpenId(null);
        } catch (e: any) {
            alert(e?.message ?? "Failed to approve.");
        } finally {
            setActingId(null);
        }
    }, [currentUserId, actingId, filter, loadRows]);

    const handleReject = useCallback(async (row: RowWithProfile) => {
        if (!currentUserId || actingId) return;
        const reason = (rejectReason[row.id] ?? "").trim();
        if (!reason) {
            tap("warning");
            alert("Please provide a rejection reason.");
            return;
        }
        tap("warning");
        setActingId(row.id);

        try {
            const { error } = await supabase
                .from("contributor_verifications")
                .update({
                    status: "rejected",
                    reviewer_id: currentUserId,
                    reviewed_at: new Date().toISOString(),
                    review_notes: reason,
                })
                .eq("id", row.id);
            if (error) throw error;
            await loadRows(filter);
            setRejectingOpenId(null);
        } catch (e: any) {
            alert(e?.message ?? "Failed to reject.");
        } finally {
            setActingId(null);
        }
    }, [currentUserId, actingId, rejectReason, filter, loadRows]);

    if (loading) return <SkeletonPage />;

    if (!isAuthorized) {
        return (
            // ✅ Gutter back since this page is bare-mounted
            <div className="w-full max-w-[880px] mx-auto px-1.5 sm:px-4 pt-8 pb-16">
                <div className="rounded-2xl bg-rose-50 dark:bg-rose-400/10 p-6 text-center">
                    <AlertCircle className="h-10 w-10 text-rose-600 dark:text-rose-400 mx-auto mb-3" />
                    <p className="text-[13px] font-bold text-rose-700 dark:text-rose-400">
                        Access denied
                    </p>
                    <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-1">
                        Only Medrae admins can review contributor applications.
                    </p>
                </div>
            </div>
        );
    }

    return (
        // ✅ Gutter restored
        <div className="w-full max-w-[880px] mx-auto px-1.5 sm:px-4 pt-3 pb-16 space-y-3">
            {currentUserId && <AdminSelfToggle userId={currentUserId} />}

            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                <div className="flex items-start gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <UserCheck className="h-4 w-4" strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight">
                            Contributor Applications
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                            Review nurses applying to contribute content
                        </p>
                    </div>
                </div>
            </section>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {(["submitted", "approved", "rejected"] as const).map((s) => {
                    const active = filter === s;
                    return (
                        <button
                            key={s}
                            onClick={() => changeFilter(s)}
                            className={`shrink-0 h-9 px-3 rounded-full text-[11px] font-bold capitalize
                                        active:scale-[0.97] transition-transform
                                        ${active
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"}`}
                            style={{ touchAction: "manipulation" }}
                        >
                            {s}
                        </button>
                    );
                })}
            </div>

            {rows.length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-[#161b22] p-8 text-center">
                    <Clock className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                    <p className="text-[12px] font-bold text-slate-900 dark:text-white">
                        No {filter} applications
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {filter === "submitted"
                            ? "New applications will appear here."
                            : "Nothing in this category yet."}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {rows.map((row) => {
                        const isActing = actingId === row.id;
                        return (
                            <div key={row.id} className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                                {/* Applicant header */}
                                <div className="flex items-start gap-2.5">
                                    <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-[13px] font-bold">
                                        {(row.profile?.name ?? "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                                            {row.profile?.name ?? "Unknown"}
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                            {row.profile?.email ?? "—"}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {row.profile?.nck_number && (
                                                <span className="inline-flex items-center rounded-full px-2 py-0.5
                                                                 text-[9px] font-bold
                                                                 bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                                                    NCK: {row.profile.nck_number}
                                                </span>
                                            )}
                                            {row.profile?.years_experience != null && (
                                                <span className="inline-flex items-center rounded-full px-2 py-0.5
                                                                 text-[9px] font-bold
                                                                 bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                                                    {row.profile.years_experience} yrs exp
                                                </span>
                                            )}
                                            {row.profile?.workplace && (
                                                <span className="inline-flex items-center rounded-full px-2 py-0.5
                                                                 text-[9px] font-bold truncate max-w-[160px]
                                                                 bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                                                    {row.profile.workplace}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Attachments */}
                                <div className="space-y-1.5">
                                    {row.nck_license_url && (
                                        <AttachmentLink href={row.nck_license_url} label="NCK Licence" />
                                    )}
                                    {row.cv_url && (
                                        <AttachmentLink href={row.cv_url} label="CV / Resume" />
                                    )}
                                    {row.employer_letter_url && (
                                        <AttachmentLink href={row.employer_letter_url} label="Employer Letter" />
                                    )}
                                </div>

                                {row.additional_notes && (
                                    <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                            Notes
                                        </p>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                                            {row.additional_notes}
                                        </p>
                                    </div>
                                )}

                                {/* Actions (only for submitted) */}
                                {row.status === "submitted" && (
                                    <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                                        {rejectingOpenId === row.id ? (
                                            <div className="space-y-2">
                                                <textarea
                                                    value={rejectReason[row.id] ?? ""}
                                                    onChange={(e) => setRejectReason(prev => ({ ...prev, [row.id]: e.target.value }))}
                                                    placeholder="Reason for rejection (required)"
                                                    rows={2}
                                                    className={TextareaBase}
                                                    style={{ touchAction: "manipulation" }}
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setRejectingOpenId(null)}
                                                        className={SecondaryBtn + " flex-1"}
                                                        style={{ touchAction: "manipulation" }}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(row)}
                                                        disabled={isActing || !(rejectReason[row.id] ?? "").trim()}
                                                        className="flex-1 h-11 rounded-xl bg-rose-600 text-white
                                                                   text-[13px] font-bold
                                                                   flex items-center justify-center gap-1.5
                                                                   active:scale-[0.97] transition-transform
                                                                   disabled:opacity-50"
                                                        style={{ touchAction: "manipulation" }}
                                                    >
                                                        {isActing ? (
                                                            <div className="h-3.5 w-14 rounded bg-white/30 animate-pulse" />
                                                        ) : (
                                                            <><XCircle className="h-3.5 w-3.5" /> Reject</>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : tierPickerOpenId === row.id ? (
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                    Set contributor tier
                                                </p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleApprove(row, "contributor")}
                                                        disabled={isActing}
                                                        className="flex-1 h-11 rounded-xl bg-emerald-600 text-white
                                                                   text-[12px] font-bold
                                                                   active:scale-[0.97] transition-transform
                                                                   disabled:opacity-50"
                                                        style={{ touchAction: "manipulation" }}
                                                    >
                                                        {isActing ? (
                                                            <div className="mx-auto h-3.5 w-16 rounded bg-white/30 animate-pulse" />
                                                        ) : "Contributor"}
                                                    </button>
                                                    <button
                                                        onClick={() => handleApprove(row, "senior_contributor")}
                                                        disabled={isActing}
                                                        className="flex-1 h-11 rounded-xl bg-blue-600 text-white
                                                                   text-[12px] font-bold
                                                                   active:scale-[0.97] transition-transform
                                                                   disabled:opacity-50"
                                                        style={{ touchAction: "manipulation" }}
                                                    >
                                                        {isActing ? (
                                                            <div className="mx-auto h-3.5 w-16 rounded bg-white/30 animate-pulse" />
                                                        ) : "Senior"}
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => setTierPickerOpenId(null)}
                                                    className={SecondaryBtn + " w-full"}
                                                    style={{ touchAction: "manipulation" }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setRejectingOpenId(row.id)}
                                                    className="flex-1 h-11 rounded-xl bg-rose-50 dark:bg-rose-400/10
                                                               text-rose-700 dark:text-rose-400
                                                               text-[13px] font-bold
                                                               flex items-center justify-center gap-1.5
                                                               active:scale-[0.97] transition-transform"
                                                    style={{ touchAction: "manipulation" }}
                                                >
                                                    <XCircle className="h-3.5 w-3.5" />
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => setTierPickerOpenId(row.id)}
                                                    className={PrimaryBtn + " flex-1"}
                                                    style={{ touchAction: "manipulation" }}
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Approve
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Reviewed info */}
                                {row.status !== "submitted" && row.reviewed_at && (
                                    <div className={`rounded-xl p-3 ${row.status === "approved"
                                        ? "bg-emerald-50 dark:bg-emerald-400/10"
                                        : "bg-rose-50 dark:bg-rose-400/10"}`}>
                                        <p className={`text-[11px] font-bold ${row.status === "approved"
                                            ? "text-emerald-700 dark:text-emerald-400"
                                            : "text-rose-700 dark:text-rose-400"}`}>
                                            {row.status === "approved" ? "Approved" : "Rejected"}{" "}
                                            on {new Date(row.reviewed_at).toLocaleDateString()}
                                        </p>
                                        {row.review_notes && (
                                            <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">
                                                {row.review_notes}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function AttachmentLink({ href, label }: { href: string; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => tap()}
            className="flex items-center gap-2 h-11 px-3 rounded-xl
                       bg-slate-50 dark:bg-[#0d1117]
                       text-[12px] font-bold text-blue-600 dark:text-blue-400
                       active:bg-slate-100 dark:active:bg-white/[0.08]
                       transition-colors"
            style={{ touchAction: "manipulation" }}
        >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            {label}
        </a>
    );
}