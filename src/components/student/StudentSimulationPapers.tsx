import { Laptop, Lightbulb, Layout, Clock, ListChecks, ArrowRight, WifiOff, RefreshCw, ShieldCheck, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { DeferredMount } from "@/components/DeferredMount";

type Props = {
    papers: any[];
    progress: Record<string, number>;
    onOpenPaper: (id: string) => void;
    /** Optional: true while the parent is still fetching */
    loading?: boolean;
    /** Optional: callback to retry the fetch */
    onRetry?: () => void;
};

export default function StudentSimulationPapers({
    papers,
    progress,
    onOpenPaper,
    loading = false,
    onRetry,
}: Props) {
    const isOffline =
        typeof navigator !== "undefined" && navigator.onLine === false;

    return (
        <DeferredMount fallback={<div className="h-[400px] rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />}>
            <section className="mt-1 space-y-2">
                {/* Header */}
                <div className="flex flex-col gap-3 px-2 sm:px-0">
                    {/* Header — facts only */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-2.5">
                                {/* word + count always together */}
                                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    Proctorium
                                </h2>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums
                     bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                    {papers.length} papers
                                </span>
                            </div>

                            {/* DigiProctor pill on its own line below — full room */}
                            <div className="mt-1.5">
                                <span className="inline-flex items-center gap-1.5 rounded-full
                     bg-blue-100 dark:bg-blue-500/20
                     text-blue-700 dark:text-blue-300
                     ring-1 ring-blue-200/60 dark:ring-blue-400/20
                     px-2.5 py-0.5 text-[11px] font-semibold">
                                    <ShieldCheck className="w-3 h-3" />
                                    DigiProctor style Environment
                                </span>
                            </div>
                            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                                Full-length simulations under NCK exam conditions.
                            </p>
                        </div>
                    </div>

                    {/* Capability strip — replaces the two tip cards */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Timed
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" /> Proctored
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Monitor className="w-3.5 h-3.5" /> Desktop recommended
                        </span>
                    </div>
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-2 gap-3 px-2 sm:px-0">
                    {loading && papers.length === 0 ? (
                        // Skeleton while parent is fetching
                        Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-[420px] rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse"
                            />
                        ))
                    ) : papers.length > 0 ? (
                        papers.map((paper) => (
                            <Card
                                key={paper.id}
                                className="group relative flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-none hover:-translate-y-1 border-0 bg-white dark:bg-muted/30 rounded-2xl"
                                onClick={() => onOpenPaper(paper.id)}
                            >
                                {/* Cover image */}
                                <div className="relative h-60 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                                    <img
                                        src={paper.image_url || "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80"}
                                        alt={paper.title}
                                        loading="lazy"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                    <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
                                        <Badge
                                            variant={paper.is_free ? "default" : "secondary"}
                                            className={paper.is_free ? "bg-emerald-500 hover:bg-emerald-600" : "bg-blue-600 text-white"}
                                        >
                                            {paper.is_free ? "Free" : "Premium"}
                                        </Badge>
                                        <div className="flex gap-1">
                                            {paper.difficulty && (
                                                <Badge variant="outline" className="capitalize text-[10px] bg-white/90">
                                                    {paper.difficulty}
                                                </Badge>
                                            )}
                                            {new Date(paper.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                                                <Badge className="bg-orange-500 text-[10px]">New</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <CardHeader className="p-5 pb-2">
                                    <CardTitle className="text-lg font-bold leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                                        {paper.title}
                                    </CardTitle>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                        <Layout className="w-3.5 h-3.5" />
                                        <span className="line-clamp-1">
                                            {paper.course || "General Nursing"} • {paper.block || "Block I"}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5 pt-2 flex-1">
                                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                                        {paper.description || "Comprehensive NCK-style simulation paper for self-assessment."}
                                    </p>

                                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-slate-400" />
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                {(() => {
                                                    const duration = Number(paper.duration) || 30;
                                                    return duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`;
                                                })()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ListChecks className="w-4 h-4 text-slate-400" />
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                {paper.attempt_count || 0} {paper.attempt_count === 1 ? "Attempt" : "Attempts"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                            Completion
                                        </span>
                                        <span className="inline-flex items-center justify-center min-w-[44px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-[11px] font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                                            {progress[paper.id] || 0}%
                                        </span>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="text-[10px] text-slate-400 font-medium italic">
                                            Added {formatDistanceToNow(new Date(paper.created_at))} ago
                                        </span>
                                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                            Start <ArrowRight className="w-3 h-3" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        // 🆕 Smart empty state — offline vs genuinely empty
                        <div className="col-span-full flex flex-col items-center justify-center py-14 px-4 text-center">
                            <div
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isOffline
                                    ? "bg-amber-50 dark:bg-amber-400/10"
                                    : "bg-slate-100 dark:bg-white/[0.04]"
                                    }`}
                            >
                                {isOffline ? (
                                    <WifiOff className="w-6 h-6 text-amber-600 dark:text-amber-400" strokeWidth={2.2} />
                                ) : (
                                    <ListChecks className="w-6 h-6 text-slate-400 dark:text-slate-500" strokeWidth={2.2} />
                                )}
                            </div>

                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {isOffline
                                    ? "You're offline"
                                    : "No simulation papers available"}
                            </h3>
                            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400 leading-snug max-w-[34ch]">
                                {isOffline
                                    ? "Papers need an internet connection the first time. Once loaded, they stay available offline."
                                    : "Check back soon — new papers are added regularly."}
                            </p>

                            {onRetry && (
                                <button
                                    onClick={onRetry}
                                    className="mt-5 h-10 px-5 rounded-xl bg-blue-600 text-white text-[13px] font-bold
                                               flex items-center gap-2
                                               active:scale-[0.98] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.4} />
                                    {isOffline ? "Try again (may fail)" : "Try again"}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="py-8 text-center">
                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500 italic">
                        "Every simulation you complete brings you one step closer to exam success."
                    </p>
                </div>
            </section>
        </DeferredMount>
    );
}