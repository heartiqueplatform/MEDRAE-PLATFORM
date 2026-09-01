"use client";

import { useNavigate } from "react-router-dom";
import { FileText, ShieldCheck, Copyright } from "lucide-react";
import { cn } from "@/lib/utils";

interface TermsButtonProps {
    className?: string;
}

export function TermsButton({ className }: TermsButtonProps) {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    return (
        <footer className={cn(
            "mt-2 pb-2 md:pb-2 flex flex-col items-center",
            className
        )}>
            {/* Clinical Branding Divider */}
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-2 opacity-40">
                <div className="h-[1px] w-10 md:w-12 bg-slate-300" />
                <img
                    src="/pwa-192x192.png"
                    alt="Medrae"
                    className="h-5 w-5 md:h-6 md:w-6 object-contain"
                />
                <div className="h-[1px] w-10 md:w-12 bg-slate-300" />
            </div>

            {/* Main Content Card - full width on mobile */}
            <div className="max-w-2xl w-full md:bg-slate-50/50 dark:md:bg-slate-900/20 border-0 md:rounded-xl p-0 md:p-6 text-center">
                <div className="space-y-2 md:space-y-2 px-4 md:px-0">
                    {/* Platform Mission - Nursing Focus */}
                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                        "Empowering the next generation of healthcare professionals through rigorous revision and clinical excellence."
                    </p>

                    <p className="text-[11px] md:text-[13px] text-slate-500 dark:text-slate-500 leading-snug">
                        By utilizing <span className="font-semibold">
                            <span className="text-red-600 dark:text-red-500">Medrae</span>
                            <span className="text-gray-900 dark:text-white"> Nursing</span>
                            <span className="text-gray-500 dark:text-gray-400"> Platform</span>
                        </span> you commit to upholding clinical integrity, providing accurate data, and respecting the privacy of the nursing community.
                    </p>

                    {/* Navigation Actions */}
                    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 pt-1 md:pt-2">
                        <button
                            onClick={() => navigate("/terms")}
                            className="group flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-teal-600 transition-colors"
                        >
                            <FileText size={12} className="group-hover:scale-110 transition-transform" />
                            Terms of Service
                        </button>

                        <div className="h-1 w-1 rounded-full bg-slate-300" />

                        <button
                            onClick={() => navigate("/privacy")}
                            className="group flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-teal-600 transition-colors"
                        >
                            <ShieldCheck size={12} className="group-hover:scale-110 transition-transform" />
                            Privacy Protocol
                        </button>
                    </div>
                </div>
            </div>

            {/* Final Copyright */}
            <div className="mt-2 md:mt-2 flex items-center gap-1 md:gap-1.5 text-[10px] md:text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                <Copyright size={10} />
                <span>{currentYear} Medrae Platform • Clinical Revision System</span>
            </div>
        </footer>
    );
}