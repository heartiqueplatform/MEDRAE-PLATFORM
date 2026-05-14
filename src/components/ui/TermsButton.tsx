"use client";

import { useNavigate } from "react-router-dom";
import { FileText, ShieldCheck, Copyright, HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";

interface TermsButtonProps {
    className?: string;
}

export function TermsButton({ className }: TermsButtonProps) {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    return (
        <footer className={cn(
            "mt-2 pb-2 px-6 flex flex-col items-center",
            className
        )}>
            {/* Clinical Branding Divider */}
            <div className="flex items-center gap-3 mb-2 opacity-40">
                <div className="h-[1px] w-12 bg-slate-300" />
                <HeartPulse className="h-5 w-5 text-teal-600" />
                <div className="h-[1px] w-12 bg-slate-300" />
            </div>

            <div className="max-w-2xl w-full bg-slate-50/50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 text-center">
                <div className="space-y-2">
                    {/* Platform Mission - Nursing Focus */}
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                        "Empowering the next generation of healthcare professionals through rigorous revision and clinical excellence."
                    </p>

                    <p className="text-[13px] text-slate-500 dark:text-slate-500 leading-snug">
                        By utilizing <span className="font-semibold text-teal-700 dark:text-teal-500">Medrae</span>, you commit to upholding clinical integrity, providing accurate data, and respecting the privacy of the nursing community.
                    </p>

                    {/* Navigation Actions */}
                    <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
                        <button
                            onClick={() => navigate("/terms")}
                            className="group flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-teal-600 transition-colors"
                        >
                            <FileText size={14} className="group-hover:scale-110 transition-transform" />
                            Terms of Service
                        </button>

                        <div className="h-1 w-1 rounded-full bg-slate-300" />

                        <button
                            onClick={() => navigate("/privacy")}
                            className="group flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-teal-600 transition-colors"
                        >
                            <ShieldCheck size={14} className="group-hover:scale-110 transition-transform" />
                            Privacy Protocol
                        </button>
                    </div>
                </div>
            </div>

            {/* Final Copyright */}
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                <Copyright size={12} />
                <span>{currentYear} Medrae Platform • Clinical Revision System</span>
            </div>
        </footer>
    );
}