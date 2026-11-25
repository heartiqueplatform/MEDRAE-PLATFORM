// components/subscription/SubscriptionInfoModal.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    X,
    Info,
    CreditCard,
    AlertCircle,
    HelpCircle,
    Check,
    Bell,
    Clock,
    Smartphone,
    RefreshCw,
    Mail,
    AlertTriangle,
    CalendarX,
    Users,
    Sparkles,
    TrendingDown,
    Wallet,
    Crown,
} from "lucide-react";
import { CenteredModal } from "@/components/ui/CenteredModal";

interface SubscriptionInfoModalProps {
    onClose: () => void;
    durationMonths?: number;
    tutorPrice?: number;
    studentPrice?: number;
    staffPrice?: number;
}

export function SubscriptionInfoModal({
    onClose,
    durationMonths = 2,
    tutorPrice = 1999,
    studentPrice = 399,
    staffPrice = 999,
}: SubscriptionInfoModalProps) {
    const is1Month = durationMonths === 1;
    const selectedLabelCap = is1Month ? "1 Month" : "2 Months";

    const student1mo = 229;
    const student2mo = 399;
    const tutor1mo = 1149;
    const tutor2mo = 1999;
    const staff1mo = 579;
    const staff2mo = 999;

    const groupStudent1mo = 199;
    const groupStudent2mo = 299;

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    return (
        <CenteredModal
            open
            onClose={onClose}
            hideHeader
            noScrollBody
            maxWidthClass="max-w-2xl"
            maxHeight="92vh"
            bodyClassName="relative"
        >
            <div className="relative flex flex-col flex-1 min-h-0">
                {/* ── HEADER ROW ────────────────────────────────── */}
                <div className="shrink-0 flex items-center gap-2 px-3 h-12 border-0">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-indigo-50 dark:bg-indigo-500/[0.12]">
                        <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-bold leading-tight truncate text-slate-900 dark:text-white">
                            Subscription guide
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            Everything you need to know
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="h-9 w-9 rounded-full flex items-center justify-center shrink-0
                                   text-slate-700 dark:text-slate-200
                                   active:bg-slate-100 dark:active:bg-white/5
                                   transition-colors"
                        style={{ touchAction: "manipulation" }}
                    >
                        <X className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                </div>

                {/* ── BODY ──────────────────────────────────────── */}
                <div
                    className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain
                               px-4 pt-3 pb-4 space-y-4
                               text-slate-700 dark:text-slate-300"
                    style={{ WebkitOverflowScrolling: "touch" }}
                >
                    {/* Plans */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <Crown className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            Choose your plan
                        </h3>
                        <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                            Two one time plans. Pick whichever fits how long you plan to study. Both give the same full access, only the length differs.
                        </p>

                        {/* 1 Month */}
                        <div
                            className={`rounded-2xl p-4 mb-2.5 ${is1Month
                                ? "bg-indigo-50 dark:bg-indigo-500/[0.10]"
                                : "bg-slate-100 dark:bg-white/[0.04]"
                                }`}
                        >
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/[0.15] flex items-center justify-center shrink-0">
                                        <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                                            1 Month plan
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            30 days of full access
                                        </p>
                                    </div>
                                </div>
                                {is1Month && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-600 text-white shrink-0">
                                        Selected
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white/70 dark:bg-black/20 mb-3">
                                <div className="text-center">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Student</p>
                                    <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 tabular-nums">KSh {student1mo}</p>
                                </div>
                                <div className="text-center border-l border-slate-200 dark:border-white/[0.08]">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Tutor</p>
                                    <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 tabular-nums">KSh {tutor1mo}</p>
                                </div>
                                <div className="text-center border-l border-slate-200 dark:border-white/[0.08]">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Staff</p>
                                    <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 tabular-nums">KSh {staff1mo}</p>
                                </div>
                            </div>

                            <ul className="space-y-1 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
                                <li className="flex items-start gap-2">
                                    <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                                    Full premium access for 30 days
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                                    All quizzes, exam bank and study resources
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                                    One time payment, no auto renewal
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                                    Best if you need short term access
                                </li>
                            </ul>
                        </div>

                        {/* 2 Months */}
                        <div
                            className={`rounded-2xl p-4 relative ${!is1Month
                                ? "bg-amber-50 dark:bg-amber-500/[0.10]"
                                : "bg-slate-100 dark:bg-white/[0.04]"
                                }`}
                        >
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/[0.15] flex items-center justify-center shrink-0">
                                        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                                            2 Months plan
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            60 days of full access, cheaper per month
                                        </p>
                                    </div>
                                </div>
                                {!is1Month && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-white shrink-0">
                                        Selected
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white/70 dark:bg-black/20 mb-3">
                                <div className="text-center">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Student</p>
                                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 tabular-nums">KSh {student2mo}</p>
                                </div>
                                <div className="text-center border-l border-slate-200 dark:border-white/[0.08]">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Tutor</p>
                                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 tabular-nums">KSh {tutor2mo}</p>
                                </div>
                                <div className="text-center border-l border-slate-200 dark:border-white/[0.08]">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Staff</p>
                                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 tabular-nums">KSh {staff2mo}</p>
                                </div>
                            </div>

                            <ul className="space-y-1 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
                                <li className="flex items-start gap-2">
                                    <Check className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                    Full premium access for 60 days
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                    All quizzes, exam bank and study resources
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                    One time payment, no auto renewal
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                    Better value per month than paying twice
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* GroupPay */}
                    <section className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/[0.08] p-4">
                        <div className="flex items-start gap-2 mb-2">
                            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                    Or save more with GroupPay
                                </h3>
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                                    Study together and split the cost.
                                </p>
                            </div>
                        </div>

                        <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                            Form a study group with classmates and unlock premium for everyone at a lower per person price. One leader pays and every member gets access.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="rounded-xl bg-white/80 dark:bg-black/20 p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        1 Month
                                    </span>
                                    <TrendingDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <p className="text-[13px] text-slate-700 dark:text-slate-300">
                                    From <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">KSh {groupStudent1mo}</span> per member
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Saves <span className="font-semibold text-emerald-600 dark:text-emerald-400">KSh {student1mo - groupStudent1mo}</span> compared to paying alone
                                </p>
                            </div>
                            <div className="rounded-xl bg-white/80 dark:bg-black/20 p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        2 Months
                                    </span>
                                    <TrendingDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <p className="text-[13px] text-slate-700 dark:text-slate-300">
                                    From <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">KSh {groupStudent2mo}</span> per member
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Saves <span className="font-semibold text-emerald-600 dark:text-emerald-400">KSh {student2mo - groupStudent2mo}</span> compared to paying alone
                                </p>
                            </div>
                        </div>

                        <ul className="space-y-1 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300 mt-3">
                            <li className="flex items-start gap-2">
                                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                Cheaper per member than buying individually
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                Leader pays once through M-Pesa and everyone else unlocks instantly
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                Perfect for study groups, classmates and friend circles
                            </li>
                            <li className="flex items-start gap-2">
                                <Wallet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                You can add members from the GroupPay page after creating your group
                            </li>
                        </ul>
                    </section>

                    {/* How Payment Works */}
                    <section className="rounded-2xl bg-slate-100 dark:bg-white/[0.04] p-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            How payment works
                        </h3>
                        <ul className="space-y-1.5 text-[13px] leading-relaxed">
                            <li className="flex items-start gap-2">
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold shrink-0">1.</span>
                                <span>Select your plan and enter your M-Pesa phone number.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold shrink-0">2.</span>
                                <span>Tap Pay and you will receive an STK push. Enter your M-Pesa PIN to complete.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold shrink-0">3.</span>
                                <span>On success, your {selectedLabelCap} subscription activates immediately.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold shrink-0">4.</span>
                                <span>You get full premium access for the entire period.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold shrink-0">5.</span>
                                <span>When the period ends, access simply expires and nothing is charged again.</span>
                            </li>
                        </ul>
                    </section>

                    {/* No auto renew */}
                    <section className="rounded-2xl bg-blue-50 dark:bg-blue-500/[0.08] p-4">
                        <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                            <CalendarX className="h-4 w-4 shrink-0" />
                            No auto renewal, you stay in control
                        </h3>
                        <div className="space-y-1.5 text-[13px] leading-relaxed text-blue-800 dark:text-blue-300">
                            <p>
                                This is a one time payment. We do not store your M-Pesa details and we never charge you automatically.
                            </p>
                            <ul className="list-disc list-inside space-y-0.5">
                                <li>No recurring charges, ever</li>
                                <li>No surprise deductions from your M-Pesa</li>
                                <li>When your period ends, you decide whether to renew</li>
                                <li>Renewal is always a fresh manual payment you initiate yourself</li>
                            </ul>
                        </div>
                    </section>

                    {/* No refund */}
                    <section className="rounded-2xl bg-slate-100 dark:bg-white/[0.04] p-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            No refund policy, legally binding
                        </h3>
                        <div className="space-y-1.5 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
                            <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                By completing this purchase you agree to a strict no refund policy.
                            </p>
                            <p>Once you complete your M-Pesa payment and your subscription is activated:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                                <li>No refunds will be issued for any reason</li>
                                <li>No partial refunds for unused time</li>
                                <li>No refunds for change of mind, accidental purchases or dissatisfaction</li>
                                <li>No refunds if you stop using the service early</li>
                                <li>Chargebacks will be contested and may result in account termination</li>
                            </ul>
                            <p className="text-[12px] italic text-slate-500 dark:text-slate-400">
                                For technical issues where you paid but received no access, contact support within 24 hours for resolution, not a refund.
                            </p>
                        </div>
                    </section>

                    {/* Important notes */}
                    <section className="rounded-2xl bg-amber-50 dark:bg-amber-500/[0.08] p-4">
                        <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                            <HelpCircle className="h-4 w-4 shrink-0" />
                            Important notes
                        </h3>
                        <ul className="space-y-2 text-[13px] leading-relaxed text-amber-900 dark:text-amber-300">
                            <li className="flex items-start gap-2">
                                <Bell className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span>You cannot purchase another plan while you have an active subscription.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span>Your subscription starts immediately after payment confirmation.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Smartphone className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span>Make sure your M-Pesa account has enough balance before paying.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <RefreshCw className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span>If a technical payment fails, M-Pesa reverses the amount automatically within 24 to 48 hours.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span>Contact support at medraenursing@gmail.com for payment issues.</span>
                            </li>
                        </ul>
                    </section>
                </div>

                {/* ── FOOTER ────────────────────────────────────── */}
                <div className="shrink-0 px-4 py-3 border-t border-slate-100 dark:border-white/[0.06]">
                    <Button
                        onClick={onClose}
                        className="w-full h-12 rounded-xl text-sm font-bold
                                   bg-indigo-600 hover:bg-indigo-700 text-white
                                   active:scale-[0.98] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        Got it, thanks
                    </Button>
                </div>
            </div>
        </CenteredModal>
    );
}