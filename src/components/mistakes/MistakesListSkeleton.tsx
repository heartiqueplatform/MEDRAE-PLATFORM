// src/components/mistakes/MistakesListSkeleton.tsx
export function MistakesListSkeleton({
    rows = 3,
    tabs = true,
    headerCard = true,
}: {
    rows?: number;
    /** Show the two tab pills skeleton (Needs work / Understood). */
    tabs?: boolean;
    /** Show the top header card skeleton (label + title + description + CTA). */
    headerCard?: boolean;
}) {
    return (
        <div className="w-full max-w-3xl mx-auto px-4 py-4 space-y-3 animate-pulse">
            {/* Institution filter slot (tutor only) — keep space reserved so layout
                doesn't jump when the real filter mounts. */}
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="h-3.5 w-40 rounded bg-slate-100 dark:bg-white/[0.06]" />
                </div>
            </div>

            {/* Tabs skeleton */}
            {tabs && (
                <div className="flex items-center gap-1.5 pt-1">
                    {[0, 1].map((i) => (
                        <div
                            key={i}
                            className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center gap-1.5"
                        >
                            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/[0.08]" />
                            <div className="h-[18px] min-w-[20px] px-1.5 rounded-full bg-slate-200 dark:bg-white/[0.08]" />
                        </div>
                    ))}
                </div>
            )}

            {/* Header card skeleton */}
            {headerCard && (
                <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/[0.06] shrink-0" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-2.5 w-28 rounded bg-slate-100 dark:bg-white/[0.06]" />
                            <div className="h-4 w-2/3 rounded bg-slate-100 dark:bg-white/[0.06]" />
                        </div>
                    </div>
                    <div className="h-3 w-full rounded bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="h-3 w-3/4 rounded bg-slate-100 dark:bg-white/[0.06]" />
                </section>
            )}

            {/* Row cards skeleton — matches NeedsWorkRow / UnderstoodRow shape */}
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2.5"
                >
                    {/* Meta line (Wrong N times / Marked) */}
                    <div className="space-y-1.5">
                        <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
                        {/* Question title — 2 lines */}
                        <div className="h-3.5 w-[92%] rounded bg-slate-100 dark:bg-white/[0.06]" />
                        <div className="h-3.5 w-2/3 rounded bg-slate-100 dark:bg-white/[0.06]" />
                        {/* Last attempt */}
                        <div className="h-2.5 w-44 rounded bg-slate-100 dark:bg-white/[0.06] mt-1" />
                    </div>

                    {/* Options A–D */}
                    <div className="space-y-1.5">
                        {[1, 2, 3, 4].map((j) => (
                            <div
                                key={j}
                                className="h-9 rounded-xl bg-slate-50 dark:bg-white/[0.04]"
                            />
                        ))}
                    </div>

                    {/* Explanation block */}
                    <div className="rounded-xl bg-slate-50 dark:bg-white/[0.04] p-3 space-y-1.5">
                        <div className="h-2.5 w-20 rounded bg-slate-200 dark:bg-white/[0.08]" />
                        <div className="h-3 w-full rounded bg-slate-200 dark:bg-white/[0.08]" />
                        <div className="h-3 w-4/5 rounded bg-slate-200 dark:bg-white/[0.08]" />
                    </div>

                    {/* Action button */}
                    <div className="h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                </div>
            ))}
        </div>
    );
}

export default MistakesListSkeleton;