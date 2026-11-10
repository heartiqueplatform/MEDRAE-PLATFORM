// components/progress/TriagePopup.tsx
"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { CenteredModal } from "@/components/ui/CenteredModal";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type TriageCode = "RED" | "YELLOW" | "GREEN" | "BLACK";

export interface TriageLevel {
    code: TriageCode;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    threshold: number;
    emoji: string;
    actionText: string;
    actionLink: string;
    critical?: boolean;
    detailedMessage: string;
}

interface TriagePopupProps {
    triage: TriageLevel;
    onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 15) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = () => {
    playSound("ui-tap");
    vibrate(12);
};

/* ------------------------------------------------------------------ */
/*  Tone map — every triage code gets an explicit token combo        */
/* ------------------------------------------------------------------ */

type Tone = {
    chip: string;   // soft background for chip
    text: string;   // accent text
    solid: string;  // solid button bg
};

const TONE: Record<TriageCode, Tone> = {
    GREEN: {
        chip: "bg-emerald-50 dark:bg-emerald-400/10",
        text: "text-emerald-700 dark:text-emerald-400",
        solid: "bg-emerald-600",
    },
    YELLOW: {
        chip: "bg-amber-50 dark:bg-amber-400/10",
        text: "text-amber-700 dark:text-amber-400",
        solid: "bg-amber-500",
    },
    RED: {
        chip: "bg-rose-50 dark:bg-rose-400/10",
        text: "text-rose-700 dark:text-rose-400",
        solid: "bg-rose-600",
    },
    BLACK: {
        chip: "bg-slate-100 dark:bg-white/[0.06]",
        text: "text-slate-700 dark:text-slate-300",
        solid: "bg-slate-800 dark:bg-slate-200 dark:text-slate-900",
    },
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function TriagePopup({ triage, onClose }: TriagePopupProps) {
    const navigate = useNavigate();
    const tone = TONE[triage.code] ?? TONE.BLACK;

    // Play a soft toast sound + haptic when the popup appears
    useEffect(() => {
        const timer = setTimeout(() => {
            playSound("toast-sound", false);
            vibrate(25);
        }, 300);
        return () => clearTimeout(timer);
    }, [triage.code]);

    const handleAction = () => {
        tap();
        onClose();
        navigate(triage.actionLink);
    };

    const handleClose = () => {
        tap();
        onClose();
    };

    return (
        <CenteredModal
            open={true}
            onClose={handleClose}
            title={triage.label}
            maxWidthClass="max-w-md"
            maxHeight="90vh"
        >
            <div className="px-4 pt-2 pb-4 space-y-3">
                {/* ── Hero chip + eyebrow ─────────────────── */}
                <div className="flex flex-col items-center text-center pt-1">
                    <div
                        className={`h-20 w-20 rounded-full
                                    flex flex-col items-center justify-center
                                    ${tone.chip} ${tone.text}`}
                    >
                        <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
                            Code
                        </span>
                        <span className="text-base font-bold leading-none mt-1">
                            {triage.code}
                        </span>
                    </div>

                    <p className="text-[10px] font-bold uppercase tracking-wider
                                  text-slate-500 dark:text-slate-400 mt-3">
                        Triage status
                    </p>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white
                                   leading-tight mt-1">
                        {triage.label}
                    </h2>
                </div>

                {/* ── Message ─────────────────────────────── */}
                <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                    <p className="text-[12px] text-slate-700 dark:text-slate-300
                                  leading-relaxed whitespace-pre-line">
                        {triage.detailedMessage}
                    </p>
                </div>

                {/* ── Actions ─────────────────────────────── */}
                <div className="space-y-2 pt-1">
                    <button
                        onClick={handleAction}
                        className={`w-full h-11 rounded-xl text-white
                                    text-sm font-bold
                                    flex items-center justify-center gap-2
                                    active:scale-[0.97] transition-transform
                                    ${tone.solid}`}
                        style={{ touchAction: "manipulation" }}
                    >
                        {triage.actionText}
                        <span aria-hidden>→</span>
                    </button>

                    <button
                        onClick={handleClose}
                        className="w-full h-10 rounded-xl
                                   bg-slate-100 dark:bg-white/[0.06]
                                   text-slate-700 dark:text-slate-200
                                   text-sm font-bold
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        Continue to progress
                    </button>
                </div>
            </div>
        </CenteredModal>
    );
}