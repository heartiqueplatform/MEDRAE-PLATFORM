"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Gavel, AlertCircle, Shield, FileText } from "lucide-react";
import { CenteredModal } from "@/components/ui/CenteredModal";

interface LegalTermsModalProps {
    onClose: () => void;
    onAgree?: () => void;
}

export function LegalTermsModal({ onClose, onAgree }: LegalTermsModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    const handleAgree = () => {
        if (onAgree) onAgree();
        onClose();
    };

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
                    <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-slate-100 dark:bg-white/[0.06]">
                        <Gavel className="h-4 w-4 text-slate-600 dark:text-slate-300" strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-bold leading-tight truncate text-slate-900 dark:text-white">
                            Terms and Conditions
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            Please read before you pay
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
                    {/* No Refund Policy */}
                    <div className="rounded-2xl bg-slate-100 dark:bg-white/[0.04] p-4">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            No refund policy, legally binding and strictly enforced
                        </h3>
                        <div className="space-y-2 text-[13px] leading-relaxed">
                            <p className="font-semibold text-slate-900 dark:text-white">
                                By completing this purchase, you expressly agree to the following.
                            </p>
                            <ul className="list-decimal list-inside space-y-1.5">
                                <li>
                                    <strong>All sales are final.</strong> No refunds, chargebacks or reversals will be issued under any circumstances whatsoever.
                                </li>
                                <li>
                                    <strong>No exceptions.</strong> This includes but is not limited to change of mind, accidental purchase, non use of services, technical difficulties on your end, or dissatisfaction with content.
                                </li>
                                <li>
                                    <strong>Chargebacks will be contested.</strong> Any chargeback initiated by you or your financial institution will be disputed with full transaction evidence and may result in permanent account termination.
                                </li>
                                <li>
                                    <strong>Subscription access is discretionary.</strong> We reserve the right to modify, suspend or terminate access at any time for violation of our terms.
                                </li>
                                <li>
                                    <strong>You waive your right to dispute.</strong> By checking out, you waive any right to dispute this transaction with your bank or payment provider.
                                </li>
                            </ul>
                            <p className="text-[12px] italic text-slate-500 dark:text-slate-400">
                                This no refund policy is a material condition of sale and forms the entire basis of this transaction.
                            </p>
                        </div>
                    </div>

                    {/* Limitation of Liability */}
                    <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/[0.08] p-4">
                        <h3 className="font-bold text-base text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                            <Shield className="h-5 w-5 shrink-0" />
                            Limitation of liability
                        </h3>
                        <div className="space-y-2 text-[13px] leading-relaxed">
                            <p>
                                To the maximum extent permitted by law, Medrae and its affiliates shall not be liable for:
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Any indirect, incidental, special, consequential or punitive damages</li>
                                <li>Loss of profits, data, use, goodwill or other intangible losses</li>
                                <li>Damages related to your inability to use the service</li>
                                <li>Any unauthorised access to or use of our servers and personal information</li>
                            </ul>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400">
                                Our total liability shall not exceed the amount you paid for the subscription.
                            </p>
                        </div>
                    </div>

                    {/* Binding Arbitration Agreement */}
                    <div className="rounded-2xl bg-slate-100 dark:bg-white/[0.04] p-4">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <FileText className="h-5 w-5 shrink-0" />
                            Binding arbitration agreement
                        </h3>
                        <div className="space-y-2 text-[13px] leading-relaxed">
                            <p>
                                You agree that any dispute, claim or controversy arising out of or relating to this subscription shall be resolved through binding arbitration, not in court.
                            </p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                                You waive your right to:
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>A trial by jury</li>
                                <li>Participate in a class action lawsuit</li>
                                <li>Pursue claims on behalf of a group</li>
                            </ul>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400">
                                Arbitration shall be conducted in Nairobi, Kenya, under the Kenyan Arbitration Act. The decision of the arbitrator shall be final and binding.
                            </p>
                        </div>
                    </div>

                    {/* Acknowledgment */}
                    <div className="rounded-2xl bg-slate-100 dark:bg-white/[0.04] p-4">
                        <p className="text-[13px] font-bold text-slate-900 dark:text-white">
                            By clicking Pay and completing this transaction, you acknowledge that:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-[12px] mt-2 text-slate-700 dark:text-slate-300">
                            <li>You have read, understood and agree to all the terms above</li>
                            <li>You understand this is a non refundable purchase</li>
                            <li>You waive any right to chargeback or dispute</li>
                            <li>You agree to binding arbitration for any disputes</li>
                            <li>You are at least 18 years old or have parental consent</li>
                        </ul>
                    </div>
                </div>

                {/* ── FOOTER ────────────────────────────────────── */}
                <div className="shrink-0 px-4 py-3 border-t border-slate-100 dark:border-white/[0.06]">
                    <Button
                        onClick={handleAgree}
                        className="w-full h-12 rounded-xl text-sm font-bold
                                   bg-indigo-600 hover:bg-indigo-700 text-white
                                   active:scale-[0.98] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        I understand and agree to all terms
                    </Button>
                </div>
            </div>
        </CenteredModal>
    );
}