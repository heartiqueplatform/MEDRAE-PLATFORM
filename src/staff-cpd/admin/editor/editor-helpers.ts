// src/staff-cpd/admin/editor/editor-helpers.ts
import { playSound } from "@/lib/soundManager";

export const vibrate = (p: number | number[] = 15) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};

export const tap = (type: "light" | "success" | "warning" = "light") => {
    try { playSound("ui-tap"); } catch { /* no-op */ }
    if (type === "success") vibrate([15, 30, 15]);
    else if (type === "warning") vibrate(40);
    else vibrate(12);
};

export const STATUS_TONES: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300",
    review: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
    published: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
    archived: "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400",
};

export const getStatusTone = (status?: string) =>
    STATUS_TONES[(status ?? "").toLowerCase()] ?? STATUS_TONES.draft;