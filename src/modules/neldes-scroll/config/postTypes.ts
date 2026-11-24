// src/modules/neldes-scroll/config/postTypes.ts
// ============================================================
// Single source of truth for post categories.
// Add a type here → composer, badge, filter all pick it up.
// ============================================================

export type PostType =
    | "meme"
    | "news"
    | "job"
    | "promo"
    | "educational"
    | "mnemonics"
    | "clinical"
    | "exam"
    | "motivation"
    | "question";

export interface PostTypeMeta {
    key: PostType;
    /** short label shown in the composer picker */
    label: string;
    /** badge label shown on the feed card */
    badge: string;
    /** tailwind background class for the badge */
    color: string;
}

export const POST_TYPES: PostTypeMeta[] = [
    { key: "meme", label: "Meme", badge: "Meme", color: "bg-rose-500/90" },
    { key: "news", label: "News", badge: "News", color: "bg-blue-500/90" },
    { key: "job", label: "Job", badge: "Job", color: "bg-emerald-500/90" },
    { key: "promo", label: "Promo", badge: "Medrae", color: "bg-amber-500/90" },
    { key: "educational", label: "Education", badge: "Education", color: "bg-violet-500/90" },
    { key: "mnemonics", label: "Mnemonics", badge: "Mnemonics", color: "bg-cyan-500/90" },
    { key: "clinical", label: "Clinical", badge: "Clinical", color: "bg-indigo-500/90" },
    { key: "exam", label: "Exam", badge: "Exam", color: "bg-orange-500/90" },
    { key: "motivation", label: "Motivation", badge: "Motivation", color: "bg-pink-500/90" },
    { key: "question", label: "Question", badge: "Question", color: "bg-teal-500/90" },
];

/** Lookup map for O(1) badge/color access */
export const POST_TYPE_MAP: Record<string, PostTypeMeta> = Object.fromEntries(
    POST_TYPES.map((t) => [t.key, t])
);

/** Fallback for unknown types (e.g. old posts with deleted categories) */
export const DEFAULT_POST_TYPE: PostTypeMeta = {
    key: "meme",
    label: "Post",
    badge: "Post",
    color: "bg-slate-500/90",
};