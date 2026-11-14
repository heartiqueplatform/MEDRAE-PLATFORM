// src/pages/studentcoins/components/WalletSkeleton.tsx

export function WalletSkeleton() {
    return (
        /* ✅ Locked shell — same structure as the real page */
        <div className="h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-[#0d1117] overflow-hidden">

            {/* Fixed header skeleton — matches WalletHeader */}
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/[0.06] animate-pulse" />
                <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="h-3.5 w-32 bg-slate-100 dark:bg-white/[0.06] rounded animate-pulse" />
                    <div className="h-2.5 w-48 bg-slate-100 dark:bg-white/[0.06] rounded animate-pulse" />
                </div>
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/[0.06] animate-pulse" />
            </header>

            {/* Scrollable body skeleton — mirrors the real content column */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
                <div className="w-full max-w-2xl mx-auto px-3 pt-4 pb-24 space-y-4">

                    {/* Balance card skeleton */}
                    <div className="h-44 rounded-3xl bg-slate-100 dark:bg-white/[0.06] animate-pulse" />

                    {/* Status banner skeleton */}
                    <div className="h-20 rounded-2xl bg-slate-100 dark:bg-white/[0.06] animate-pulse" />

                    {/* Stat strip skeleton — 3 tiles */}
                    <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-white/[0.06] animate-pulse" />
                        ))}
                    </div>

                    {/* Tabs skeleton */}
                    <div className="h-11 rounded-2xl bg-slate-100 dark:bg-white/[0.06] animate-pulse" />

                    {/* List skeletons */}
                    <div className="space-y-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-16 rounded-2xl bg-slate-100 dark:bg-white/[0.06] animate-pulse" />
                        ))}
                    </div>

                </div>
            </main>

        </div>
    );
}