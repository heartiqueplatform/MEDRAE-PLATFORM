// src/pages/challenge/skeleton.tsx

export function StatCardSkeleton() {
    return (
        <div className="p-3.5 rounded-xl bg-slate-200 dark:bg-white/[0.06] animate-pulse h-[78px]" />
    );
}

export function PlayerRowSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="flex flex-col" aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/[0.06] shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-white/[0.06]" />
                        <div className="h-2.5 w-1/3 rounded bg-slate-200 dark:bg-white/[0.06]" />
                    </div>
                    <div className="h-8 w-16 rounded-full bg-slate-200 dark:bg-white/[0.06] shrink-0" />
                </div>
            ))}
        </div>
    );
}