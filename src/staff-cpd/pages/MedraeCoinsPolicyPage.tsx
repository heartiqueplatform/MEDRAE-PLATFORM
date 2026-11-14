// src/staff-cpd/pages/MedraeCoinsPolicyPage.tsx
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    ChevronLeft, Coins, TrendingUp, TrendingDown, ShieldCheck,
    Info, AlertTriangle, Ban, Award, Users, Clock,
} from "lucide-react";
import { useMedraeCoinConfig } from "@/staff-cpd/lib/admin-hooks";
import { tap } from "./shared";

/* ------------------------------------------------------------------ */
/*  Helper: format KES nicely                                         */
/* ------------------------------------------------------------------ */
function fmtKes(amount: number): string {
    if (amount < 1000) return amount.toFixed(2);
    return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function MedraeCoinsPolicyPage() {
    const nav = useNavigate();
    const { data: config, isLoading } = useMedraeCoinConfig();

    const coinToKes = config?.coin_to_kes_rate ?? 0.01;
    const coinsPerCompletion = config?.coins_per_completion ?? 20;
    const minWithdrawal = config?.minimum_withdrawal ?? 1000;

    const perCompletionKes = coinToKes * coinsPerCompletion;
    const minWithdrawalKes = coinToKes * minWithdrawal;

    const exampleEarnings = (completions: number) => {
        const mc = completions * coinsPerCompletion;
        const kes = mc * coinToKes;
        return { mc, kes };
    };

    const ex10 = exampleEarnings(10);
    const ex50 = exampleEarnings(50);
    const ex100 = exampleEarnings(100);
    const ex500 = exampleEarnings(500);

    const handleBack = useCallback(() => {
        tap();
        nav(-1);
    }, [nav]);

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
                        MedraeCoins Policy
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        How the coin economy works
                    </p>
                </div>
            </header>

            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
                {/* ✅ Gutter matched */}
                <div className="w-full max-w-[880px] mx-auto px-1.5 sm:px-4 pt-3 pb-16 space-y-3">

                    {/* Loading — shape-matched skeleton instead of a spinner */}
                    {isLoading && <PolicySkeleton />}

                    {!isLoading && (
                        <>
                            {/* Intro — neutral surface, amber icon only */}
                            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                                <div className="flex items-start gap-2.5">
                                    <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                                        <Coins className="h-5 w-5" strokeWidth={2.4} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight">
                                            MedraeCoins — Earned by teaching. Spent on learning.
                                        </h2>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                            MedraeCoins (MC) are Medrae's internal reward currency. Verified contributors
                                            earn them every time a nurse completes one of their CPD activities. Later,
                                            contributors can convert MedraeCoins to real money or spend them on premium
                                            features. This page explains exactly how they work, how they're priced, and
                                            what can reduce their value.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Section 1: Earning */}
                            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        How you earn MedraeCoins
                                    </h3>
                                </div>

                                <div className="space-y-2">
                                    {/* Highlight block — neutral surface + emerald icon */}
                                    <div className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                        <div className="h-8 w-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                            <Award className="h-4 w-4" strokeWidth={2.4} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[12px] font-bold text-slate-900 dark:text-white">
                                                {coinsPerCompletion} MedraeCoins per verified completion
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                Every time a nurse enrolls in one of your published CPD activities
                                                and completes it, you earn <b className="text-slate-900 dark:text-white">{coinsPerCompletion} MedraeCoins</b>.
                                                This rate is set by Medrae and cannot be changed by you or by any user.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                        <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                                            <Users className="h-4 w-4" strokeWidth={2.4} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-bold text-slate-900 dark:text-white">
                                                Why {coinsPerCompletion}? Because it matches CPD points.
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                NCK requires nurses to earn 20 CPD points per year. We've mirrored that:
                                                one activity = 20 CPD points = {coinsPerCompletion} MedraeCoins to the
                                                contributor. Clean, simple, memorable. You don't need to think about it.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                        <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                                            <Clock className="h-4 w-4" strokeWidth={2.4} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-bold text-slate-900 dark:text-white">
                                                You cannot complete your own activities for coins.
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                Self-completions are blocked. If you enroll in and complete an activity
                                                you authored, you earn 0 MedraeCoins. This prevents gaming the system.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Section 2: Value */}
                            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Coins className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        What MedraeCoins are worth
                                    </h3>
                                </div>

                                <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-1.5">
                                    <p className="text-[12px] font-bold text-slate-900 dark:text-white">
                                        Current rate: <span className="text-amber-600 dark:text-amber-400">1 MedraeCoin = KSh {coinToKes}</span>
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                                        {coinsPerCompletion} MedraeCoins per completion = KSh {fmtKes(perCompletionKes)} per completion to the contributor.
                                        This rate applies until it changes (see "What can reduce value" below).
                                    </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                    <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-1">
                                        Example earnings
                                    </p>
                                    <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                                        <li>• 10 completions = {ex10.mc} MC = KSh {fmtKes(ex10.kes)}</li>
                                        <li>• 50 completions = {ex50.mc} MC = KSh {fmtKes(ex50.kes)}</li>
                                        <li>• 100 completions = {ex100.mc} MC = KSh {fmtKes(ex100.kes)}</li>
                                        <li>• 500 completions = {ex500.mc} MC = KSh {fmtKes(ex500.kes)}</li>
                                    </ul>
                                </div>
                            </section>

                            {/* Section 3: Withdrawal */}
                            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Withdrawing your MedraeCoins
                                    </h3>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                        <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                                            <Info className="h-4 w-4" strokeWidth={2.4} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-bold text-slate-900 dark:text-white">
                                                Minimum withdrawal: {minWithdrawal.toLocaleString()} MedraeCoins (KSh {fmtKes(minWithdrawalKes)})
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                This threshold exists because payment processing costs money. It
                                                protects both you and us. Small balances accumulate until you cross
                                                {" "}{minWithdrawal.toLocaleString()} MC — no expiry, no penalty.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Warning — amber icon only, neutral surface */}
                                    <div className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                        <div className="h-8 w-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                                            <AlertTriangle className="h-4 w-4" strokeWidth={2.4} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-bold text-slate-900 dark:text-white">
                                                Withdrawal is not yet live
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                You can earn MedraeCoins today. Withdrawal opens after the first
                                                cohort of contributors completes their initial cycle — we'll notify
                                                everyone by email and in-app when that happens. Your balance is
                                                fully preserved and will be withdrawable at that point.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Section 4: What can reduce value */}
                            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <TrendingDown className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        What can reduce the value of your MedraeCoins
                                    </h3>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                        <div className="h-8 w-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0">
                                            <TrendingDown className="h-4 w-4" strokeWidth={2.4} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-bold text-slate-900 dark:text-white">
                                                The coin-to-shilling rate can change
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                Currently 1 MC = KSh {coinToKes}. We reserve the right to adjust this rate
                                                based on revenue, operating costs, and platform economics. Any change
                                                will be <b className="text-slate-900 dark:text-white">announced at least 30 days in advance</b> by email and
                                                in-app notification. Existing MedraeCoins retain their current value
                                                — if we lower the rate, existing balances are converted at the current
                                                rate first, then future earnings use the new rate.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                        <div className="h-8 w-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0">
                                            <Ban className="h-4 w-4" strokeWidth={2.4} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-bold text-slate-900 dark:text-white">
                                                Fraud or abuse forfeits your balance
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                If we detect fabricated completions, coordinated abuse, plagiarism,
                                                or account sharing to farm MedraeCoins, the affected balance is
                                                forfeited and the contributor account is permanently removed. We
                                                review every completion pattern; coordinated abuse is rare but it
                                                happens.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                        <div className="h-8 w-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                            <ShieldCheck className="h-4 w-4" strokeWidth={2.4} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-bold text-slate-900 dark:text-white">
                                                Activity archival does not erase earned coins
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                If an activity is archived or removed, the coins you earned from
                                                completions before that point are still yours. Only future
                                                completions stop. This is our commitment: you are paid for work
                                                already delivered.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Section 5: Security */}
                            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Your balance is safe
                                    </h3>
                                </div>

                                <div className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                    <div className="h-8 w-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                        <ShieldCheck className="h-4 w-4" strokeWidth={2.4} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-bold text-slate-900 dark:text-white">
                                            Every transaction is logged
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Every MedraeCoin that enters or leaves your account is recorded in an
                                            immutable audit log. You can view the last 20 transactions on your
                                            wallet page. If anything looks wrong, contact us — every transaction
                                            is reversible if it was fraudulent.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Footer */}
                            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed text-center">
                                    Last updated: {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                                    <br />
                                    Medrae reserves the right to update this policy with 30 days' notice.
                                    Continued use of the platform after changes constitutes acceptance.
                                </p>
                            </section>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

/* ── Skeleton — replaces the spinner ──────────────────────── */
function PolicySkeleton() {
    return (
        <div className="space-y-3 animate-pulse">
            {/* Intro */}
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
                <div className="flex items-start gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-white/[0.06] shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
                        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                        <div className="h-2.5 w-5/6 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                    </div>
                </div>
            </div>
            {/* Two content sections */}
            {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                    <div className="h-3 w-40 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
                    <div className="space-y-2">
                        <div className="h-16 rounded-xl bg-slate-100 dark:bg-white/[0.04]" />
                        <div className="h-16 rounded-xl bg-slate-100 dark:bg-white/[0.04]" />
                    </div>
                </div>
            ))}
        </div>
    );
}