"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Gavel, AlertCircle, Shield, FileText } from "lucide-react";

interface LegalTermsModalProps {
    onClose: () => void;
    onAgree?: () => void;
}

export function LegalTermsModal({ onClose, onAgree }: LegalTermsModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleAgree = () => {
        if (onAgree) onAgree();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
            <div
                className="relative flex flex-col md:rounded-2xl shadow-2xl w-full md:md:max-w-full md:px-4 lg:px-6 md:mx-4 border-0 bg-white dark:bg-muted/50 max-h-[90vh] custom-scrollbar transform animate-in zoom-in-95 duration-300 rounded-t-2xl md:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle for mobile bottom sheet */}
                <div className="md:hidden flex justify-center pt-3 pb-1">
                    <div className="w-8 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                </div>

                {/* HEADER */}
                <div className="sticky top-0 z-20 bg-white dark:bg-muted/50 border-0 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                            <Gavel className="h-4 w-4 md:h-5 md:w-5 text-slate-600 dark:text-slate-300" />
                        </div>
                        <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100">Terms & Conditions</h2>
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

                        {/* No Refund Policy */}
                        <div className="bg-slate-50 dark:bg-muted/80 rounded-lg md:rounded-xl p-4 md:p-5 border-0">
                            <h3 className="font-bold text-lg md:text-xl text-slate-800 dark:text-slate-100 mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
                                <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-indigo-600" /> No refund policy - Legal binding and strictly enforced
                            </h3>
                            <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
                                <p className="font-semibold">BY COMPLETING THIS PURCHASE, YOU EXPRESSLY AGREE TO THE FOLLOWING:</p>
                                <ul className="list-decimal list-inside ml-1 md:ml-2 space-y-1.5 md:space-y-2">
                                    <li><strong>ALL SALES ARE FINAL.</strong> No refunds, chargebacks, or reversals will be issued under any circumstances whatsoever.</li>
                                    <li><strong>NO EXCEPTIONS.</strong> This includes but is not limited to: change of mind, accidental purchase, non-use of services, technical difficulties on your end, or dissatisfaction with content.</li>
                                    <li><strong>CHARGEBACKS WILL BE CONTESTED.</strong> Any chargeback initiated by you or your financial institution will be disputed with full transaction evidence and may result in permanent account termination.</li>
                                    <li><strong>SUBSCRIPTION ACCESS IS DISCRETIONARY.</strong> We reserve the right to modify, suspend, or terminate access at any time for violation of our terms.</li>
                                    <li><strong>YOU WAIVE YOUR RIGHT TO DISPUTE.</strong> By checking out, you waive any right to dispute this transaction with your bank or payment provider.</li>
                                </ul>
                                <p className="text-[10px] md:text-xs italic mt-1 md:mt-2">This no-refund policy is a material condition of sale and forms the entire basis of this transaction.</p>
                            </div>
                        </div>

                        {/* Limitation of Liability */}
                        <div className="bg-blue-50/50 dark:bg-muted/80 rounded-lg md:rounded-xl p-4 md:p-5 border-0">
                            <h3 className="font-bold text-base md:text-lg text-blue-900 dark:text-blue-300 mb-1.5 md:mb-2 flex items-center gap-1.5 md:gap-2">
                                <Shield className="h-4 w-4 md:h-5 md:w-5" /> Limitation of Liability
                            </h3>
                            <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                                <p>To the maximum extent permitted by law, Study World and its affiliates shall not be liable for:</p>
                                <ul className="list-disc list-inside ml-1 md:ml-2 space-y-0.5 md:space-y-1">
                                    <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                                    <li>Loss of profits, data, use, goodwill, or other intangible losses</li>
                                    <li>Damages related to your inability to use the service</li>
                                    <li>Any unauthorized access to or use of our servers and/or personal information</li>
                                </ul>
                                <p className="mt-1.5 md:mt-2 text-[10px] md:text-xs">Our total liability shall not exceed the amount you paid for the subscription.</p>
                            </div>
                        </div>

                        {/* Binding Arbitration Agreement */}
                        <div className="bg-slate-50 dark:bg-muted/80 rounded-lg md:rounded-xl p-4 md:p-5 border-0">
                            <h3 className="font-bold text-base md:text-lg text-slate-800 dark:text-slate-200 mb-1.5 md:mb-2 flex items-center gap-1.5 md:gap-2">
                                <FileText className="h-4 w-4 md:h-5 md:w-5" /> Binding Arbitration Agreement
                            </h3>
                            <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                                <p>You agree that any dispute, claim, or controversy arising out of or relating to this subscription shall be resolved through binding arbitration, not in court.</p>
                                <p className="font-semibold mt-1.5 md:mt-2">You waive your right to:</p>
                                <ul className="list-disc list-inside ml-1 md:ml-2">
                                    <li>A trial by jury</li>
                                    <li>Participate in a class action lawsuit</li>
                                    <li>Pursue claims on behalf of a group</li>
                                </ul>
                                <p className="mt-1.5 md:mt-2 text-[10px] md:text-xs">Arbitration shall be conducted in Nairobi, Kenya, under the Kenyan Arbitration Act. The arbitrator's decision shall be final and binding.</p>
                            </div>
                        </div>

                        {/* Acknowledgment */}
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg md:rounded-xl p-3 md:p-4">
                            <p className="text-xs md:text-sm font-bold">BY CLICKING "PAY" AND COMPLETING THIS TRANSACTION, YOU ACKNOWLEDGE THAT:</p>
                            <ul className="list-disc list-inside ml-1 md:ml-2 text-[10px] md:text-xs mt-1.5 md:mt-2 space-y-0.5 md:space-y-1">
                                <li>You have read, understood, and agree to all terms above</li>
                                <li>You understand this is a non-refundable purchase</li>
                                <li>You waive any right to chargeback or dispute</li>
                                <li>You agree to binding arbitration for any disputes</li>
                                <li>You are at least 18 years old or have parental consent</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* FOOTER BUTTON */}
                <div className="p-4 md:p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                    <Button
                        onClick={handleAgree}
                        className="w-full py-4 md:py-6 text-sm md:text-base font-bold dark:text-white rounded-lg md:rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 transition-all"
                    >
                        I understand and agree to all terms
                    </Button>
                </div>
            </div>
        </div>
    );
}