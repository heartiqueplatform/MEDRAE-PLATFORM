// components/progress/TriagePopup.tsx
"use client";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import {
    playAlert,
    playWarning,
    playSuccess,
    playAttention,
} from "simple-notification-sounds";

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
    detailedMessage: string;
}

interface TriagePopupProps {
    triage: TriageLevel;
    onClose: () => void;
}

export function TriagePopup({ triage, onClose }: TriagePopupProps) {
    const navigate = useNavigate();

    // Play sound based on triage code
    const playTriageSound = (code: TriageCode) => {
        switch (code) {
            case "RED":
                playAlert(); // Emergency alert sound (urgent)
                break;
            case "YELLOW":
                playWarning(); // Warning sound (moderate)
                break;
            case "GREEN":
                playSuccess(); //  Success/celebration sound (positive)
                break;
            case "BLACK":
                playAttention(); // Subtle notification sound
                break;
            default:
                break;
        }
    };

    // Play sound when popup appears
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        // Small delay to ensure the popup is visible before sound plays
        const timer = setTimeout(() => {
            playTriageSound(triage.code);
        }, 300);
        return () => {
            document.body.style.overflow = 'auto';
            clearTimeout(timer);
        };
    }, [triage.code]);

    // Vibrate pattern based on triage code (for mobile)
    const getVibrationPattern = (code: TriageCode): number[] => {
        switch (code) {
            case "RED":
                return [200, 100, 200, 100, 400]; // Urgent: long-short-long-short-long
            case "YELLOW":
                return [100, 100, 100, 100, 200]; // Warning: short-short-short-short-long
            case "GREEN":
                return [50, 50, 50]; // Success: short-short-short
            case "BLACK":
                return [100, 200, 100]; // Somber: medium-long-medium
            default:
                return [100];
        }
    };

    // Trigger vibration on mount
    useEffect(() => {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            const pattern = getVibrationPattern(triage.code);
            navigator.vibrate(pattern);
        }
    }, [triage.code]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 100 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 100 }}
                className={`relative w-full md:max-w-md md:rounded-xl md:border-2 ${triage.borderColor}
    ${triage.code === "RED" ? "bg-red-100 dark:bg-red-950" : triage.bgColor}
    bg-white dark:bg-gray-900 md:shadow-2xl
    p-4 md:p-6 max-h-[85vh] md:max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-xl border-0 md:border-2`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle for mobile bottom sheet */}
                <div className="md:hidden flex justify-center pb-2">
                    <div className="w-8 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 md:top-4 md:right-4 p-1.5 md:p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                    <X className="w-4 h-4 md:w-5 md:h-5 text-gray-500 dark:text-gray-400" />
                </button>

                <div className="flex flex-col items-center text-center">
                    {/* Emoji Circle with pulse animation for urgency */}
                    <div className={`rounded-full flex items-center justify-center md:border-4 ${triage.borderColor}
                        bg-white/80 dark:bg-gray-800/80 md:shadow-lg border-0
                        w-14 h-14 md:w-24 md:h-24 text-3xl md:text-5xl mb-2 md:mb-4
                        ${triage.code === "RED" ? "animate-pulse" : ""}`}>
                        {triage.emoji}
                    </div>

                    {/* Badge & Title */}
                    <div className="flex items-center gap-1.5 md:gap-3 mb-1 md:mb-2">
                        <Badge className={`${triage.bgColor} ${triage.textColor} border-0 font-bold
                            text-[10px] md:text-sm px-2 md:px-4 py-0.5 md:py-1.5`}>
                            CODE {triage.code}
                        </Badge>
                        <h2 className="text-base md:text-2xl font-bold text-gray-900 dark:text-white">
                            {triage.label}
                        </h2>
                    </div>

                    {/* Divider */}
                    <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-2 md:my-3" />

                    {/* Message */}
                    <p className="text-[11px] md:text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                        {triage.detailedMessage}
                    </p>

                    {/* Divider */}
                    <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-2 md:my-4" />

                    {/* Action Button */}
                    <button
                        onClick={() => {
                            playAttention(); // Subtle click feedback
                            onClose();
                            navigate(triage.actionLink);
                        }}
                        className={`w-full text-white text-xs md:text-sm font-bold rounded-xl transition-all md:hover:scale-105 md:shadow-lg active:scale-[0.98]
                            py-2.5 md:py-3
                            ${triage.code === "GREEN" ? "bg-emerald-600 hover:bg-emerald-700 md:shadow-emerald-500/30" :
                                triage.code === "YELLOW" ? "bg-amber-600 hover:bg-amber-700 md:shadow-amber-500/30" :
                                    triage.code === "RED" ? "bg-red-600 hover:bg-red-700 md:shadow-red-500/30" :
                                        "bg-gray-600 hover:bg-gray-700 md:shadow-gray-500/30"
                            }`}
                    >
                        {triage.actionText} →
                    </button>

                    {/* Close Link */}
                    <button
                        onClick={() => {
                            playAttention(); // Subtle soft tap sound
                            onClose();
                        }}
                        className="mt-2 md:mt-3 text-[10px] md:text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        Continue to progress
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}