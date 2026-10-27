"use client";

import { useNavigate } from "react-router-dom";
import { FileText, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface TermsButtonProps {
    className?: string;
}

export function TermsButton({ className }: TermsButtonProps) {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    return (
        <footer className={cn(
            "mt-2 pb-4 flex flex-col items-center",
            className
        )}>
            <div className="max-w-2xl w-full text-center space-y-3 px-4">
                {/* Short commitment line — plain, not italic */}
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    By using <span className="font-medium text-slate-700 dark:text-slate-300">Medrae Nursing</span>,
                    you agree to uphold clinical integrity and respect user privacy.
                </p>

                {/* Nav actions — sentence case, no uppercase tracking */}
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
                    <button
                        onClick={() => navigate("/terms")}
                        className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400
                                   hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                    >
                        <FileText size={12} />
                        Terms
                    </button>

                    <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />

                    <button
                        onClick={() => navigate("/privacy")}
                        className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400
                                   hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                    >
                        <ShieldCheck size={12} />
                        Privacy
                    </button>
                </div>

                {/* Quiet copyright — no caps, no tracking, no tagline */}
                <p className="text-[11px] text-slate-400 dark:text-slate-600">
                    © {currentYear} Medrae Nursing
                </p>
            </div>
        </footer>
    );
}