// src/pages/contribute/components/ContributionSkeleton.tsx

export function ContributionSkeleton() {
    return (
        <div className="h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-[#0d1117] overflow-hidden">
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]">
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/[0.06] animate-pulse" />
                <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-40 bg-slate-100 dark:bg-white/[0.06] rounded animate-pulse" />
                    <div className="h-2.5 w-56 bg-slate-100 dark:bg-white/[0.06] rounded animate-pulse" />
                </div>
            </header>
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <div className="max-w-2xl mx-auto px-3 pt-4 space-y-4">
                    <div className="h-24 rounded-2xl bg-slate-100 dark:bg-white/[0.06] animate-pulse" />
                    <div className="h-14 rounded-2xl bg-slate-100 dark:bg-white/[0.06] animate-pulse" />
                    <div className="h-64 rounded-2xl bg-slate-100 dark:bg-white/[0.06] animate-pulse" />
                </div>
            </main>
        </div>
    );
}