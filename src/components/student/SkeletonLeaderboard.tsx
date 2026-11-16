// src/components/Student/SkeletonLeaderboard.tsx
export function SkeletonLeaderboard({ count = 5 }: { count?: number }) {
    return (
        <div className="flex flex-col" aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2.5 py-2.5 animate-pulse">
                    <div className="w-6 shrink-0 flex justify-center"><div className="h-3 w-4 rounded bg-slate-200 dark:bg-white/10" /></div>
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
                        <div className="h-2.5 w-1/3 rounded bg-slate-200 dark:bg-white/10" />
                    </div>
                    <div className="shrink-0 h-6 w-12 rounded-full bg-slate-200 dark:bg-white/10" />
                </div>
            ))}
        </div>
    );
}