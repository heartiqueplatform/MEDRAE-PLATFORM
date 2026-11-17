import { Laptop, Lightbulb, Layout, Clock, ListChecks, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { DeferredMount } from "@/components/DeferredMount";

type Props = {
    papers: any[];
    progress: Record<string, number>;
    onOpenPaper: (id: string) => void;
};

export default function StudentSimulationPapers({ papers, progress, onOpenPaper }: Props) {
    return (
        <DeferredMount fallback={<div className="h-[400px] rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />}>
            <section className="mt-1 space-y-2">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 px-2 sm:px-0">
                    <div>
                        <h2 className="text-2xl tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                            Proctorium Papers V1
                            <span className="text-xs font-bold px-2 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full">
                                {papers.length} Available
                            </span>
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                            Simulations designed to mirror NCK exam conditions. Practice time management, reduce anxiety, and identify weak areas before the real exam.
                        </p>
                    </div>
                </div>

                {/* Tip row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 px-2 sm:px-0">
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border-0">
                        <Laptop className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-200/80 leading-relaxed">
                            <span className="font-bold">Desktop Recommended:</span> For the smoothest DigiProctor experience, we suggest using a laptop or tablet.
                        </p>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/5 border-0">
                        <Lightbulb className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-xs font-medium text-blue-800 dark:text-blue-200/80 leading-relaxed">
                            <span className="font-bold">Pro Tip:</span> Treat this as the real exam—find a quiet space, set a timer, and avoid breaks to build true stamina.
                        </p>
                    </div>
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-2 gap-3 px-2 sm:px-0">
                    {papers.length > 0 ? papers.map((paper) => (
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
                                {/* Description */}
                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                                    {paper.description || "Comprehensive NCK-style simulation paper for self-assessment."}
                                </p>

                                {/* Stats row */}
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

                                {/* ✅ Compact completion row — replaces the bar */}
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
                    )) : (
                        <div className="col-span-full text-center py-10">
                            <p className="text-sm font-bold text-slate-500 tracking-[2px]">No simulation papers available</p>
                        </div>
                    )}
                </div>

                {/* ✅ Closing quote restored */}
                <div className="py-8 text-center">
                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500 italic">
                        "Every simulation you complete brings you one step closer to exam success."
                    </p>
                </div>
            </section>
        </DeferredMount>
    );
}