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
    AlertTriangle
} from "lucide-react";

interface SubscriptionInfoModalProps {
    onClose: () => void;
    durationMonths?: number;
    tutorPrice?: number;
    studentPrice?: number;
}

export function SubscriptionInfoModal({
    onClose,
    durationMonths = 2,
    tutorPrice = 599,
    studentPrice = 5
}: SubscriptionInfoModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
            <div
                className="relative flex flex-col md:rounded-2xl shadow-2xl w-full md:max-w-2xl md:mx-4 border-0 bg-white dark:bg-muted/50 max-h-[90vh] overflow-hidden transform animate-in zoom-in-95 duration-300 rounded-t-2xl md:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle for mobile bottom sheet */}
                <div className="md:hidden flex justify-center pt-3 pb-1">
                    <div className="w-8 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                </div>

                {/* HEADER */}
                <div className="sticky top-0 z-20 bg-white dark:bg-muted/50 border-b border-gray-100 dark:border-gray-800 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                            <Info className="h-4 w-4 md:h-5 md:w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100">Subscription Guide</h2>
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

                        {/* How it works section */}
                        <div className="bg-indigo-50/50 dark:bg-muted/80 rounded-lg md:rounded-xl p-4 md:p-5 border-0">
                            <h3 className="font-bold text-base md:text-lg text-indigo-700 dark:text-indigo-400 mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
                                <CreditCard className="h-4 w-4 md:h-5 md:w-5" /> How Subscription Works
                            </h3>
                            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-700 dark:text-gray-300">
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="text-indigo-500 font-bold">1.</span>
                                    <span>Enter your M-Pesa phone number and click "Pay"</span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="text-indigo-500 font-bold">2.</span>
                                    <span>You'll receive an STK push on your phone - enter your M-Pesa PIN to complete payment</span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="text-indigo-500 font-bold">3.</span>
                                    <span>Upon successful payment, your <strong>{durationMonths}-month subscription</strong> activates immediately</span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="text-indigo-500 font-bold">4.</span>
                                    <span>Access all premium features for the full {durationMonths}-month period</span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="text-indigo-500 font-bold">5.</span>
                                    <span>After {durationMonths} months, access expires - you can renew with a new payment</span>
                                </li>
                            </ul>
                        </div>

                        {/* Refund Policy */}
                        <div className="bg-slate-50 dark:bg-muted/80 rounded-lg md:rounded-xl p-4 md:p-5 border-0">
                            <h3 className="font-bold text-base md:text-lg text-slate-800 dark:text-slate-100 mb-1.5 md:mb-2 flex items-center gap-1.5 md:gap-2">
                                <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-indigo-600" /> NO REFUND POLICY - LEGALLY BINDING
                            </h3>
                            <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-slate-700 dark:text-slate-300">
                                <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 md:gap-2">
                                    <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-600" /> BY COMPLETING THIS PURCHASE, YOU AGREE TO A STRICT NO-REFUND POLICY
                                </p>
                                <p>Once you complete your M-Pesa payment and your subscription is activated:</p>
                                <ul className="list-disc list-inside ml-1 md:ml-2 space-y-0.5 md:space-y-1">
                                    <li>NO refunds will be issued for ANY reason whatsoever</li>
                                    <li>NO partial refunds for unused time under any circumstances</li>
                                    <li>NO refunds for change of mind, accidental purchases, or dissatisfaction</li>
                                    <li>NO refunds if you stop using the service early for any reason</li>
                                    <li>Chargebacks will be vigorously contested and may result in legal action</li>
                                </ul>
                                <p className="mt-1.5 md:mt-2 text-[10px] md:text-xs italic opacity-70">This no-refund policy is a binding condition of sale. For technical issues where you paid but received no access, contact support within 24 hours for resolution (not refund).</p>
                            </div>
                        </div>

                        {/* Important Notes */}
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
                                    <span>If technical payment fails (STK error), your money is automatically refunded by M-Pesa within 24-48 hours</span>
                                </li>
                                <li className="flex items-start gap-2 md:gap-3">
                                    <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 shrink-0" />
                                    <span>Contact support at medraenursing@gmail.com for payment issues</span>
                                </li>
                            </ul>
                        </div>

                        {/* Plan Benefits */}
                        <div className="bg-emerald-50/50 dark:bg-muted/80 rounded-lg md:rounded-xl p-4 md:p-5 border-0">
                            <h3 className="font-bold text-base md:text-lg text-emerald-700 dark:text-emerald-400 mb-1.5 md:mb-2 flex items-center gap-1.5 md:gap-2">
                                <Check className="h-4 w-4 md:h-5 md:w-5" /> What You Get
                            </h3>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm text-emerald-800 dark:text-emerald-300">
                                <li className="flex items-center gap-1.5 md:gap-2"><Check className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" /> Full platform access</li>
                                <li className="flex items-center gap-1.5 md:gap-2"><Check className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" /> All premium features</li>
                                <li className="flex items-center gap-1.5 md:gap-2"><Check className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" /> {durationMonths} months of learning</li>
                                <li className="flex items-center gap-1.5 md:gap-2"><Check className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" /> 24/7 community support</li>
                                <li className="flex items-center gap-1.5 md:gap-2"><Check className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" /> Download resources</li>
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