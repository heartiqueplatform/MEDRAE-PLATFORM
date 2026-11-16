// components/tutor/TutorDashboardSkeleton.tsx

function Bar({ w = "w-full", h = "h-3" }: { w?: string; h?: string }) {
    return (
        <div
            className={`${w} ${h} rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse`}
        />
    );
}

function SectionHeaderSkeleton() {
    return (
        <div className="flex items-center justify-between px-1">
            <Bar w="w-24" h="h-3" />
            <Bar w="w-16" h="h-7" />
        </div>
    );
}

export function TutorDashboardSkeleton() {
    return (
        <div className="min-h-screen bg-transparent">
            {/* Header */}
            <header className="border-b border-slate-200/70 dark:border-white/[0.06]">
                <div className="flex items-center gap-2 px-2 h-14 max-w-3xl mx-auto">
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                        <Bar w="w-40" h="h-4" />
                        <Bar w="w-28" h="h-3" />
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-3 space-y-4">
                {/* Stats row */}
                <div className="flex gap-2">
                    {[0, 1].map((i) => (
                        <div
                            key={i}
                            className="flex-1 h-20 rounded-2xl p-3 bg-white dark:bg-[#161b22] space-y-2"
                        >
                            <Bar w="w-16" h="h-2.5" />
                            <Bar w="w-20" h="h-5" />
                        </div>
                    ))}
                </div>

                {/* Classes block */}
                <div className="space-y-2">
                    <SectionHeaderSkeleton />
                    <div className="space-y-2">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className="h-14 rounded-2xl p-3 bg-white dark:bg-[#161b22] flex items-center gap-3"
                            >
                                <div className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                                <div className="flex-1 space-y-1.5">
                                    <Bar w="w-32" h="h-3" />
                                    <Bar w="w-24" h="h-2.5" />
                                </div>
                                <Bar w="w-14" h="h-6" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add students block */}
                <div className="h-16 rounded-2xl bg-white dark:bg-[#161b22] p-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <Bar w="w-40" h="h-3" />
                        <Bar w="w-56" h="h-2.5" />
                    </div>
                </div>

                {/* Cohort list block */}
                <div className="space-y-2">
                    <SectionHeaderSkeleton />
                    {[0, 1].map((i) => (
                        <div
                            key={i}
                            className="h-14 rounded-2xl p-3 bg-white dark:bg-[#161b22] flex items-center gap-3"
                        >
                            <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                            <div className="flex-1 space-y-1.5">
                                <Bar w="w-28" h="h-3" />
                                <Bar w="w-20" h="h-2.5" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}