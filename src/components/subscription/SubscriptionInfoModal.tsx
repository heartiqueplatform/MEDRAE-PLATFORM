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

interface SubscriptionInfoModalProps {
    onClose: () => void;
    durationMonths?: number;   // 1 or 2 — current selection
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
    // ============================================================
    // DERIVED — no hardcoded prices
    // ============================================================
    const is1Month = durationMonths === 1;
    const selectedLabelCap = is1Month ? "1 Month" : "2 Months";

    // Split prices into 1-month and 2-months per role
    // (caller passes whatever price matches the CURRENT selection — we compute the other)
    const student1mo = 229;
    const student2mo = 399;
    const tutor1mo = 1149;
    const tutor2mo = 1999;
    const staff1mo = 579;
    const staff2mo = 999;

    // GroupPay prices — always cheaper per member
    const groupStudent1mo = 199;
    const groupStudent2mo = 299;
    const groupTutor1mo = 999;
    const groupTutor2mo = 1699;
    const groupStaff1mo = 499;
    const groupStaff2mo = 899;

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="relative flex flex-col md:rounded-2xl shadow-2xl w-full md:max-w-3xl md:mx-4 border-0 bg-white dark:bg-muted/90 max-h-[90vh] overflow-hidden transform animate-in zoom-in-95 duration-300 rounded-t-2xl md:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle for mobile bottom sheet */}
                <div className="md:hidden flex justify-center pt-3 pb-1">
                    <div className="w-8 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                </div>

                {/* HEADER */}
                <div className="sticky top-0 z-20 bg-white dark:bg-muted/100 border-b border-gray-100 dark:border-gray-800 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                            <Info className="h-4 w-4 md:h-5 md:w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100">
                                Subscription Guide
                            </h2>
                            <p className="text-[10px] md:text-xs text-muted-foreground">
                                Everything you need to know
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                    >
                        <X className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8">
                    <div className="space-y-4 md:space-y-6 text-gray-700 dark:text-gray-300">

                        {/* ============================================ */}
                        {/* SECTION: Two Plans — Full Detail Cards */}
                        {/* ============================================ */}
                        <div>
                            <h3 className="font-bold text-base md:text-lg text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                                <Crown className="h-4 w-4 md:h-5 md:w-5 text-indigo-600 dark:text-indigo-400" />
                                Choose your plan
                            </h3>

                            <p className="text-xs md:text-sm text-muted-foreground mb-4">
                                Two one-time plans. Pick whichever fits how long you plan to study.
                            </p>

                            {/* 1 Month Card */}
                            <div className={`rounded-xl p-4 md:p-5 mb-3 border-0 transition-all ${is1Month
                                ? "bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 ring-2 ring-indigo-400/40"
                                : "bg-slate-50 dark:bg-slate-900/40"
                                }`}>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
                                            <Clock className="w-4 h-4 md:w-5 md:h-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                                                1 Month Plan
                                            </p>
                                            <p className="text-[10px] md:text-xs text-muted-foreground">
                                                30 days of full access
                                            </p>
                                        </div>
                                    </div>
                                    {is1Month && (
                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider
                                            px-2 py-0.5 rounded-full bg-indigo-600 text-white flex-shrink-0">
                                            Selected
                                        </span>
                                    )}
                                </div>

                                {/* Price per role */}
                                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-white/70 dark:bg-slate-950/40 mb-3">
                                    <div className="text-center">
                                        <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                                            Student
                                        </p>
                                        <p className="text-xs md:text-sm font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
                                            KSh {student1mo}
                                        </p>
                                    </div>
                                    <div className="text-center border-l border-slate-200 dark:border-slate-700">
                                        <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                                            Tutor
                                        </p>
                                        <p className="text-xs md:text-sm font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
                                            KSh {tutor1mo}
                                        </p>
                                    </div>
                                    <div className="text-center border-l border-slate-200 dark:border-slate-700">
                                        <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                                            Staff
                                        </p>
                                        <p className="text-xs md:text-sm font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
                                            KSh {staff1mo}
                                        </p>
                                    </div>
                                </div>

                                <ul className="space-y-1 text-[11px] md:text-xs text-slate-700 dark:text-slate-300">
                                    <li className="flex items-start gap-1.5">
                                        <Check className="h-3 w-3 md:h-3.5 md:w-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                                        Full premium access for 30 days
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <Check className="h-3 w-3 md:h-3.5 md:w-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                                        All quizzes, exam bank, and study resources
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <Check className="h-3 w-3 md:h-3.5 md:w-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                                        One-time payment — no auto-renewal
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <Check className="h-3 w-3 md:h-3.5 md:w-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                                        Best if you need short-term access or want to try premium
                                    </li>
                                </ul>
                            </div>

                            {/* 2 Months Card */}
                            <div className={`rounded-xl p-4 md:p-5 border-0 transition-all relative ${!is1Month
                                ? "bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 ring-0"
                                : "bg-slate-50 dark:bg-slate-900/40"
                                }`}>
                                <span className="absolute -top-2 right-3 text-[9px] md:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                                    Best value
                                </span>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
                                            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                                                2 Months Plan
                                            </p>
                                            <p className="text-[10px] md:text-xs text-muted-foreground">
                                                60 days of full access · cheaper per month
                                            </p>
                                        </div>
                                    </div>
                                    {!is1Month && (
                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider
                                            px-2 py-0.5 rounded-full bg-indigo-600 text-white flex-shrink-0">
                                            Selected
                                        </span>
                                    )}
                                </div>

                                {/* Price per role */}
                                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-white/70 dark:bg-slate-950/40 mb-3">
                                    <div className="text-center">
                                        <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                                            Student
                                        </p>
                                        <p className="text-xs md:text-sm font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
                                            KSh {student2mo}
                                        </p>
                                    </div>
                                    <div className="text-center border-l border-slate-200 dark:border-slate-700">
                                        <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                                            Tutor
                                        </p>
                                        <p className="text-xs md:text-sm font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
                                            KSh {tutor2mo}
                                        </p>
                                    </div>
                                    <div className="text-center border-l border-slate-200 dark:border-slate-700">
                                        <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                                            Staff
                                        </p>
                                        <p className="text-xs md:text-sm font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
                                            KSh {staff2mo}
                                        </p>
                                    </div>
                                </div>

                                <ul className="space-y-1 text-[11px] md:text-xs text-slate-700 dark:text-slate-300">
                                    <li className="flex items-start gap-1.5">
                                        <Check className="h-3 w-3 md:h-3.5 md:w-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                                        Full premium access for 60 days
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <Check className="h-3 w-3 md:h-3.5 md:w-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                                        All quizzes, exam bank, and study resources
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <Check className="h-3 w-3 md:h-3.5 md:w-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                                        One-time payment — no auto-renewal
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <Check className="h-3 w-3 md:h-3.5 md:w-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                                        Better value per month — save more vs paying 1-month twice
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* ============================================ */}
                        {/* SECTION: GroupPay — Alternative way to pay less */}
                        {/* ============================================================ */}
                        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 rounded-xl p-4 md:p-5 border-0">
                            <div className="flex items-start gap-2 mb-2">
                                <Users className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-bold text-base md:text-lg text-emerald-700 dark:text-emerald-400">
                                        Or save more with GroupPay
                                    </h3>
                                    <p className="text-[10px] md:text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                                        Study together. Split the cost.
                                    </p>
                                </div>
                            </div>

                            <p className="text-xs md:text-sm text-slate-700 dark:text-slate-300 mb-3">
                                Form a study group with classmates and unlock premium for everyone
                                at a much lower per-person price. One group leader pays — every member gets access.
                            </p>

                            {/* GroupPay pricing */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                {/* 1-month GroupPay */}
                                <div className="rounded-lg bg-white/80 dark:bg-slate-950/40 p-3 border-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            1 Month
                                        </span>
                                        <TrendingDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <p className="text-[11px] md:text-xs text-slate-700 dark:text-slate-300">
                                        From <span className="font-black text-emerald-700 dark:text-emerald-400 tabular-nums">KSh {groupStudent1mo}</span> per member
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Save <span className="font-bold text-emerald-600 dark:text-emerald-400">KSh {student1mo - groupStudent1mo}</span> vs individual
                                    </p>
                                </div>
                                {/* 2-months GroupPay */}
                                <div className="rounded-lg bg-white/80 dark:bg-slate-950/40 p-3 border-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            2 Months
                                        </span>
                                        <TrendingDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <p className="text-[11px] md:text-xs text-slate-700 dark:text-slate-300">
                                        From <span className="font-black text-emerald-700 dark:text-emerald-400 tabular-nums">KSh {groupStudent2mo}</span> per member
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Save <span className="font-bold text-emerald-600 dark:text-emerald-400">KSh {student2mo - groupStudent2mo}</span> vs individual
                                    </p>
                                </div>
                            </div>

                            <ul className="space-y-1 text-[11px] md:text-xs text-slate-700 dark:text-slate-300">
                                <li className="flex items-start gap-1.5">
                                    <Check className="h-3 w-3 md:h-3.5 md:w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                                    Cheaper per member than buying individually
                                </li>
                                <li className="flex items-start gap-1.5">
                                    <Check className="h-3 w-3 md:h-3.5 md:w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                                    Leader pays once via M-Pesa — everyone else unlocks instantly
                                </li>
                                <li className="flex items-start gap-1.5">
                                    <Check className="h-3 w-3 md:h-3.5 md:w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                                    Perfect for study groups, classmates, or friend circles
                                </li>
                                <li className="flex items-start gap-1.5">
                                    <Wallet className="h-3 w-3 md:h-3.5 md:w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                                    You can add members directly from the GroupPay page after creating your group
                                </li>
                            </ul>

                            <p className="text-[10px] md:text-xs text-muted-foreground mt-3 italic">
                                GroupPay is available from your GroupPay dashboard — you can start a group
                                any time after signing up.
                            </p>
                        </div>

                        {/* ============================================ */}
                        {/* SECTION: How Payment Works */}
                        {/* ============================================ */}
                        <div className="bg-indigo-50/50 dark:bg-muted/80 rounded-lg md:rounded-xl p-4 md:p-5 border-0">
                            <h3 className="font-bold text-base md:text-lg text-indigo-700 dark:text-indigo-400 mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
                                <CreditCard className="h-4 w-4 md:h-5 md:w-5" /> How Payment Works
                            </h3>
                            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-700 dark:text-gray-300">
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="text-indigo-500 font-bold">1.</span>
                                    <span>Select your plan (1 month or 2 months) and enter your M-Pesa phone number</span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="text-indigo-500 font-bold">2.</span>
                                    <span>Tap <strong>Pay</strong> and you'll receive an STK push — enter your M-Pesa PIN to complete</span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="text-indigo-500 font-bold">3.</span>
                                    <span>On success, your <strong>{selectedLabelCap} subscription</strong> activates immediately</span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="text-indigo-500 font-bold">4.</span>
                                    <span>You get full premium access for the entire period</span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="text-indigo-500 font-bold">5.</span>
                                    <span>When the period ends, access simply expires — nothing is charged again</span>
                                </li>
                            </ul>
                        </div>

                        {/* ============================================ */}
                        {/* SECTION: No Auto-Renew */}
                        {/* ============================================ */}
                        <div className="bg-blue-50/60 dark:bg-muted/80 rounded-lg md:rounded-xl p-4 md:p-5 border-0">
                            <h3 className="font-bold text-base md:text-lg text-blue-700 dark:text-blue-400 mb-1.5 md:mb-2 flex items-center gap-1.5 md:gap-2">
                                <CalendarX className="h-4 w-4 md:h-5 md:w-5" /> No Auto-Renew — You Stay in Control
                            </h3>
                            <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-blue-800 dark:text-blue-300">
                                <p>
                                    This is a <strong>one-time payment</strong>. We do <strong>not</strong> store
                                    your M-Pesa details and we <strong>never</strong> charge you automatically.
                                </p>
                                <ul className="list-disc list-inside ml-1 md:ml-2 space-y-0.5 md:space-y-1">
                                    <li>No recurring charges — ever</li>
                                    <li>No surprise deductions from your M-Pesa</li>
                                    <li>When your subscription period ends, you decide whether to renew</li>
                                    <li>Renewal is always a fresh manual payment you initiate yourself</li>
                                </ul>
                            </div>
                        </div>

                        {/* ============================================ */}
                        {/* SECTION: No Refund Policy */}
                        {/* ============================================ */}
                        <div className="bg-slate-50 dark:bg-muted/80 rounded-lg md:rounded-xl p-4 md:p-5 border-0">
                            <h3 className="font-bold text-base md:text-lg text-slate-800 dark:text-slate-100 mb-1.5 md:mb-2 flex items-center gap-1.5 md:gap-2">
                                <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-indigo-600" /> NO REFUND POLICY — LEGALLY BINDING
                            </h3>
                            <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-slate-700 dark:text-slate-300">
                                <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 md:gap-2">
                                    <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-600" />
                                    BY COMPLETING THIS PURCHASE, YOU AGREE TO A STRICT NO-REFUND POLICY
                                </p>
                                <p>Once you complete your M-Pesa payment and your subscription is activated:</p>
                                <ul className="list-disc list-inside ml-1 md:ml-2 space-y-0.5 md:space-y-1">
                                    <li>NO refunds will be issued for ANY reason whatsoever</li>
                                    <li>NO partial refunds for unused time under any circumstances</li>
                                    <li>NO refunds for change of mind, accidental purchases, or dissatisfaction</li>
                                    <li>NO refunds if you stop using the service early for any reason</li>
                                    <li>Chargebacks will be vigorously contested and may result in legal action</li>
                                </ul>
                                <p className="mt-1.5 md:mt-2 text-[10px] md:text-xs italic opacity-70">
                                    This no-refund policy is a binding condition of sale. For technical issues where
                                    you paid but received no access, contact support within 24 hours for resolution
                                    (not refund).
                                </p>
                            </div>
                        </div>

                        {/* ============================================ */}
                        {/* SECTION: Important Notes */}
                        {/* ============================================ */}
                        <div className="bg-amber-50/50 dark:bg-muted/80 rounded-lg md:rounded-xl p-4 md:p-5 border-0">
                            <h3 className="font-bold text-base md:text-lg text-amber-700 dark:text-amber-400 mb-1.5 md:mb-2 flex items-center gap-1.5 md:gap-2">
                                <HelpCircle className="h-4 w-4 md:h-5 md:w-5" /> Important Notes
                            </h3>
                            <ul className="space-y-2 md:space-y-3 text-xs md:text-sm text-amber-800 dark:text-amber-300">
                                <li className="flex items-start gap-2 md:gap-3">
                                    <Bell className="h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 shrink-0" />
                                    <span>You cannot purchase another plan while you have an active subscription</span>
                                </li>
                                <li className="flex items-start gap-2 md:gap-3">
                                    <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 shrink-0" />
                                    <span>Your subscription starts immediately after payment confirmation</span>
                                </li>
                                <li className="flex items-start gap-2 md:gap-3">
                                    <Smartphone className="h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 shrink-0" />
                                    <span>Make sure your M-Pesa account has sufficient balance before paying</span>
                                </li>
                                <li className="flex items-start gap-2 md:gap-3">
                                    <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 shrink-0" />
                                    <span>If a technical payment fails (STK error), your money is automatically reversed by M-Pesa within 24–48 hours</span>
                                </li>
                                <li className="flex items-start gap-2 md:gap-3">
                                    <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 shrink-0" />
                                    <span>Contact support at medraenursing@gmail.com for payment issues</span>
                                </li>
                            </ul>
                        </div>

                    </div>
                </div>

                {/* FOOTER BUTTON */}
                <div className="p-4 md:p-6 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
                    <Button
                        onClick={onClose}
                        className="w-full py-4 md:py-6 text-sm md:text-base font-bold dark:text-white rounded-lg md:rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 transition-all"
                    >
                        Got it, thanks!
                    </Button>
                </div>
            </div>
        </div>
    );
}