// src/staff-cpd/pages/CpdRedeemPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ChevronLeft, Coins, AlertCircle, CheckCircle2, Clock, XCircle,
    Wallet, ArrowRight, Smartphone, ShieldCheck, Receipt, Send,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { useMedraeCoinConfig } from "@/staff-cpd/lib/admin-hooks";
import {
    useWallet, useStaffProfile, useMyRedemptions,
} from "@/staff-cpd/lib/contributor-hooks";
import { useAuth } from "@/context/AuthProvider";
import { tap } from "./shared";

const Sk = "rounded bg-slate-100 dark:bg-white/[0.06] animate-pulse";

const InputBase =
    "w-full h-11 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[14px] font-medium " +
    "text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none";

const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
        {children}
    </label>
);

const STATUS_META: Record<
    "pending" | "approved" | "paid" | "rejected",
    { label: string; color: string; icon: React.ComponentType<any> }
> = {
    pending: { label: "Pending review", color: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10", icon: Clock },
    approved: { label: "Approved — sending soon", color: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-400/10", icon: Send },
    paid: { label: "Paid out", color: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10", icon: CheckCircle2 },
    rejected: { label: "Rejected", color: "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-400/10", icon: XCircle },
};

/* ------------------------------------------------------------------ */
/*  Full-page gate for non-contributors                               */
/* ------------------------------------------------------------------ */
function NotContributorGate({ onBack }: { onBack: () => void }) {
    return (
        <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white">
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={onBack}
                    aria-label="Back"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate">
                        Redeem MedraeCoins
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        Contributors only
                    </p>
                </div>
            </header>

            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
                {/* ✅ Gutter matched to rest of app */}
                <div className="w-full max-w-[560px] mx-auto px-1.5 sm:px-4 pt-6 pb-16 space-y-4">
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center space-y-4">
                        {/* Neutral surface for icon container */}
                        <div className="h-14 w-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-400/10
                                        flex items-center justify-center">
                            <AlertCircle className="h-7 w-7 text-rose-600 dark:text-rose-400" strokeWidth={2.4} />
                        </div>

                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider
                                          text-rose-600 dark:text-rose-400">
                                Access denied
                            </p>
                            <h2 className="text-[16px] font-bold text-slate-900 dark:text-white leading-tight">
                                Contributors only
                            </h2>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                                Only verified contributors can redeem MedraeCoins.
                                This page is where contributors cash out their earnings —
                                it opens up completely once you're approved.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-2 pt-2 text-left">
                            <div className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[11px] font-bold text-slate-900 dark:text-white">Verified badge</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                        Appears across the dashboard once approved
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                <Coins className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[11px] font-bold text-slate-900 dark:text-white">Earnings card live</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                        Track balance, lifetime earnings, and withdrawable amount
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[11px] font-bold text-slate-900 dark:text-white">Cash out via M-Pesa</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                        Convert your coins to KES when you hit the minimum
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Link
                            to="/cpd/apply"
                            onClick={() => tap("success")}
                            className="w-full h-12 rounded-xl bg-amber-500 text-white
                                       text-[13px] font-bold
                                       flex items-center justify-center gap-2
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            Apply to become a contributor
                            <ArrowRight className="h-4 w-4" />
                        </Link>

                        <Link
                            to="/cpd/coins-policy"
                            onClick={() => tap()}
                            className="inline-block text-[11px] font-bold
                                       text-slate-500 dark:text-slate-400
                                       underline underline-offset-4"
                            style={{ touchAction: "manipulation" }}
                        >
                            Read the MedraeCoins policy
                        </Link>
                    </section>

                    <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center leading-snug px-6">
                        Applications are reviewed within 2–3 business days.
                        You'll be notified in-app when your status changes.
                    </p>
                </div>
            </main>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */
export default function CpdRedeemPage() {
    const nav = useNavigate();
    const qc = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id ?? null;

    const { data: profile, isLoading: profileLoading } = useStaffProfile(userId);
    const { data: wallet, isLoading: walletLoading } = useWallet(userId);
    const { data: redemptions = [], isLoading: rLoading } = useMyRedemptions(userId);
    const { data: coinConfig } = useMedraeCoinConfig();

    const coinToKes = coinConfig?.coin_to_kes_rate ?? 0.01;
    const minWithdrawal = coinConfig?.minimum_withdrawal ?? 1000;

    const balance = wallet?.balance ?? 0;
    const canWithdraw = balance >= minWithdrawal;
    const needMore = Math.max(0, minWithdrawal - balance);
    const hasPending = redemptions.some((r) => r.status === "pending");
    const hasApproved = redemptions.some((r) => r.status === "approved");

    const [amount, setAmount] = useState<string>("");
    const [mpesaPhone, setMpesaPhone] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const amountNum = useMemo(() => {
        const n = parseInt(amount, 10);
        return isNaN(n) ? 0 : n;
    }, [amount]);

    const kesForAmount = (amountNum * coinToKes).toFixed(2);
    const isContributor = !!profile?.is_verified_contributor;

    const handleBack = useCallback(() => {
        tap();
        nav(-1);
    }, [nav]);

    /* Prefill M-Pesa */
    useEffect(() => {
        if (!mpesaPhone && redemptions.length > 0 && redemptions[0].mpesa_phone) {
            setMpesaPhone(redemptions[0].mpesa_phone);
        }
    }, [redemptions, mpesaPhone]);

    const validate = useCallback((): string | null => {
        if (!isContributor) return "Only verified contributors can redeem.";
        if (hasPending) return "You already have a pending redemption.";
        if (hasApproved) return "You already have an approved redemption in progress.";
        if (amountNum <= 0) return "Enter a coin amount.";
        if (amountNum > balance) return "Amount exceeds your wallet balance.";
        if (amountNum < minWithdrawal)
            return `Minimum redemption is ${minWithdrawal.toLocaleString()} MC.`;
        if (!/^\+?[0-9]{9,15}$/.test(mpesaPhone.replace(/\s/g, "")))
            return "Enter a valid M-Pesa phone number.";
        return null;
    }, [isContributor, hasPending, hasApproved, amountNum, balance, minWithdrawal, mpesaPhone]);

    const handleSubmit = useCallback(async () => {
        if (submitting) return;
        const v = validate();
        if (v) { setErr(v); tap("warning"); return; }

        setErr(null);
        tap("success");
        setSubmitting(true);

        try {
            const { error } = await supabase.rpc("medrae_request_redemption", {
                p_coins: amountNum,
                p_mpesa_phone: mpesaPhone.replace(/\s/g, ""),
            });
            if (error) throw error;

            await qc.invalidateQueries({ queryKey: ["medrae", "redemptions", "mine", userId] });
            setAmount("");
        } catch (e: any) {
            setErr(e?.message ?? "Failed to submit redemption request.");
        } finally {
            setSubmitting(false);
        }
    }, [submitting, validate, amountNum, mpesaPhone, qc, userId]);

    /* ── Loading ── */
    if (profileLoading) {
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
                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
                    {/* ✅ Gutter matched */}
                    <div className="w-full max-w-[880px] mx-auto px-1.5 sm:px-4 pt-3 pb-16 space-y-3">
                        <div className={`h-40 rounded-2xl ${Sk}`} />
                        <div className={`h-64 rounded-2xl ${Sk}`} />
                    </div>
                </main>
            </div>
        );
    }

    /* ── Not contributor ── */
    if (!isContributor) {
        return <NotContributorGate onBack={handleBack} />;
    }

    /* ── Contributor ── */
    return (
        <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white">
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={handleBack}
                    aria-label="Back"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate">
                        Redeem MedraeCoins
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        Turn coins into cash via M-Pesa
                    </p>
                </div>
            </header>

            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
                {/* ✅ Gutter matched */}
                <div className="w-full max-w-[880px] mx-auto px-1.5 sm:px-4 pt-3 pb-16 space-y-3">

                    {/* Balance — neutral surface, amber reserved for the "MC" suffix + icon */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <div className="flex items-start gap-2.5">
                            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                                <Wallet className="h-5 w-5" strokeWidth={2.4} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Your wallet
                                </p>
                                <h2 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight">
                                    {profile?.contributor_tier
                                        ? profile.contributor_tier.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                                        : "Contributor"}
                                </h2>
                            </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Wallet balance
                            </p>
                            <p className="h-8 text-2xl font-bold text-slate-900 dark:text-white tabular-nums leading-tight mt-0.5">
                                {walletLoading ? (
                                    <span className={`inline-block h-6 w-24 ${Sk}`} />
                                ) : (
                                    <>
                                        {balance.toLocaleString()}
                                        <span className="text-sm ml-1 text-amber-600 dark:text-amber-400">MC</span>
                                    </>
                                )}
                            </p>
                            <p className="h-4 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {walletLoading ? (
                                    <span className={`inline-block h-3 w-20 ${Sk}`} />
                                ) : (
                                    <>≈ KSh {(balance * coinToKes).toFixed(2)} · 1 MC = KSh {coinToKes.toFixed(4)}</>
                                )}
                            </p>
                        </div>
                    </section>

                    {/* Minimum notice — neutral surface, amber only on icon */}
                    {!walletLoading && !canWithdraw && (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
                            <div className="flex items-start gap-2.5">
                                <div className="h-8 w-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                                    <AlertCircle className="h-4 w-4" strokeWidth={2.4} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-bold text-slate-900 dark:text-white leading-snug">
                                        Minimum {minWithdrawal.toLocaleString()} MC to redeem
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                        You need {needMore.toLocaleString()} more MC (≈ KSh {(needMore * coinToKes).toFixed(2)}).
                                        Earn coins when nurses complete your activities.
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Approved banner */}
                    {hasApproved && (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                            <div className="flex items-start gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                                    <Send className="h-4 w-4" strokeWidth={2.4} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-bold text-slate-900 dark:text-white">
                                        Approved — payout in progress
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                                        Your redemption has been approved and the coins are on hold.
                                        The M-Pesa transfer is being processed — usually within 1–2 business days.
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Form */}
                    {canWithdraw && !hasPending && !hasApproved && (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                            <h2 className="text-[13px] font-bold text-slate-900 dark:text-white">
                                New redemption request
                            </h2>

                            <div>
                                <Label>Coins to redeem</Label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min={minWithdrawal}
                                    max={balance}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder={`${minWithdrawal} – ${balance}`}
                                    className={InputBase}
                                    style={{ touchAction: "manipulation" }}
                                />
                                <div className="flex items-center justify-between mt-1 ml-1">
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                        = <b className="text-slate-700 dark:text-slate-300">KSh {kesForAmount}</b>
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => { setAmount(String(balance)); tap(); }}
                                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 active:scale-[0.97] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        Use max ({balance.toLocaleString()})
                                    </button>
                                </div>
                            </div>

                            <div>
                                <Label>M-Pesa phone number</Label>
                                <div className="relative">
                                    <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    <input
                                        type="tel"
                                        inputMode="tel"
                                        value={mpesaPhone}
                                        onChange={(e) => setMpesaPhone(e.target.value)}
                                        placeholder="+2547XXXXXXXX"
                                        className={InputBase + " pl-10"}
                                        style={{ touchAction: "manipulation" }}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 ml-1">
                                    Payout will be sent to this number after approval.
                                </p>
                            </div>

                            {err && (
                                <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-400/10 p-3">
                                    <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-rose-700 dark:text-rose-300">{err}</p>
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full h-11 rounded-xl bg-amber-500 text-white text-[13px] font-bold
                                           flex items-center justify-center gap-1.5
                                           active:scale-[0.97] transition-transform disabled:opacity-50"
                                style={{ touchAction: "manipulation" }}
                            >
                                {submitting ? (
                                    <div className="h-3.5 w-32 rounded bg-white/30 animate-pulse" />
                                ) : (
                                    <><Coins className="h-4 w-4" /> Request redemption</>
                                )}
                            </button>
                        </section>
                    )}

                    {/* Pending banner — neutral surface */}
                    {hasPending && (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                            <div className="flex items-start gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                                    <Clock className="h-4 w-4" strokeWidth={2.4} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-bold text-slate-900 dark:text-white">
                                        Redemption under review
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                                        You already have a pending request. We'll review it within 2–3 business days.
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* History */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                        <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                            History
                        </h2>

                        {rLoading ? (
                            <div className="space-y-1">
                                <div className={`h-12 rounded-xl ${Sk}`} />
                                <div className={`h-12 rounded-xl ${Sk}`} />
                                <div className={`h-12 rounded-xl ${Sk}`} />
                            </div>
                        ) : redemptions.length === 0 ? (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center py-4">
                                No redemptions yet.
                            </p>
                        ) : (
                            <div className="space-y-1">
                                {redemptions.map((r) => {
                                    const meta = STATUS_META[r.status];
                                    const Icon = meta.icon;
                                    return (
                                        <div key={r.id} className="rounded-xl bg-slate-50 dark:bg-[#0d1117] px-2.5 py-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${meta.color}`}>
                                                    <Icon className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                                                        {r.coins_amount.toLocaleString()} MC → KSh {Number(r.kes_amount).toFixed(2)}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                        {new Date(r.requested_at).toLocaleDateString()} · {meta.label}
                                                    </p>
                                                </div>
                                            </div>

                                            {r.status === "paid" && r.mpesa_reference && (
                                                <div className="flex items-start gap-1.5 mt-1.5 ml-9 pt-1.5 border-t border-slate-200/60 dark:border-white/[0.06]">
                                                    <Receipt className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                                    <p className="text-[10px] text-slate-600 dark:text-slate-400">
                                                        M-Pesa ref: <span className="font-bold text-slate-900 dark:text-white">{r.mpesa_reference}</span>
                                                        {r.mpesa_sent_at && (
                                                            <> · {new Date(r.mpesa_sent_at).toLocaleDateString()}</>
                                                        )}
                                                    </p>
                                                </div>
                                            )}

                                            {r.status === "rejected" && r.review_notes && (
                                                <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1.5 ml-9 leading-snug">
                                                    Reason: {r.review_notes}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center leading-snug">
                        Redemptions are reviewed by Medrae admins. You'll receive the payout via M-Pesa after approval.
                        See our <Link to="/cpd/coins-policy" className="underline">MedraeCoins policy</Link>.
                    </p>
                </div>
            </main>
        </div>
    );
}