// src/staff-cpd/pages/shared.tsx
import { forwardRef } from "react";
import { ChevronLeft } from "lucide-react";
import { playSound } from "@/lib/soundManager";

/* ─── Tap helper ─────────────────────────────────────────────── */

const vibrate = (pattern: number | number[] = 15) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

export const tap = (type: "light" | "success" | "warning" = "light") => {
    try { playSound("ui-tap"); } catch { /* no-op */ }
    if (type === "success") vibrate([15, 30, 15]);
    else if (type === "warning") vibrate(40);
    else vibrate(12);
};

/* ─── Status tones ───────────────────────────────────────────── */

export const STATUS_TONES: Record<string, string> = {
    verified: "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
    pending: "bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400",
    revoked: "bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-400",
    not_started: "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300",
    in_progress: "bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400",
    completed: "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
};

export const getStatusTone = (s?: string) =>
    STATUS_TONES[(s ?? "").toLowerCase()] ?? STATUS_TONES.not_started;

/* ─── Layout shells ──────────────────────────────────────────── */

export function PageHeader({
    title,
    subtitle,
    onBack,
    rightSlot,
}: {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    rightSlot?: React.ReactNode;
}) {
    return (
        <header className="shrink-0 flex items-center gap-2 px-2 h-14
                           bg-white dark:bg-[#0d1117]
                           border-b border-slate-200/70 dark:border-white/[0.06]
                           z-30 safe-top">
            {onBack && (
                <button
                    onClick={onBack}
                    aria-label="Back"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
            )}
            <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold leading-tight truncate text-slate-900 dark:text-white">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {subtitle}
                    </p>
                )}
            </div>
            {rightSlot}
        </header>
    );
}

export function FullScreen({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white"
            style={{ WebkitTapHighlightColor: "transparent" }}>
            {children}
        </div>
    );
}

/* 🆕 forwardRef — so the player can measure the actual scroll container */
export const ScrollBody = forwardRef<HTMLElement, { children: React.ReactNode }>(
    function ScrollBody({ children }, ref) {
        return (
            <main
                ref={ref}
                className="flex-1 min-h-0 overflow-y-auto no-scrollbar"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <div className="w-full max-w-[880px] mx-auto pb-16">
                    {children}
                </div>
            </main>
        );
    }
);