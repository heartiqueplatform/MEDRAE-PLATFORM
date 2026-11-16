// lib/tutor/colors.ts

/**
 * Deterministic cohort colors.
 * Same cohort key always returns the same color, regardless of render order.
 * Used for the colored dot / pill on class rows and cohort headers.
 */

export const COHORT_COLORS = [
    { dot: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20" },
    { dot: "bg-blue-500", chip: "bg-blue-500/10 text-blue-600 dark:text-blue-400", ring: "ring-blue-500/20" },
    { dot: "bg-violet-500", chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400", ring: "ring-violet-500/20" },
    { dot: "bg-amber-500", chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400", ring: "ring-amber-500/20" },
    { dot: "bg-rose-500", chip: "bg-rose-500/10 text-rose-600 dark:text-rose-400", ring: "ring-rose-500/20" },
    { dot: "bg-teal-500", chip: "bg-teal-500/10 text-teal-600 dark:text-teal-400", ring: "ring-teal-500/20" },
] as const;

/** Stable string hash (FNV-1a). Deterministic across sessions. */
function hashString(s: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/** Build a stable cohort key from its dimensions. */
export function cohortKey(block: string, year: number, semester: number): string {
    return `b:${block}|y:${year}|s:${semester}`;
}

/** Deterministic color for a cohort. */
export function cohortColor(block: string, year: number, semester: number) {
    const idx = hashString(cohortKey(block, year, semester)) % COHORT_COLORS.length;
    return COHORT_COLORS[idx];
}