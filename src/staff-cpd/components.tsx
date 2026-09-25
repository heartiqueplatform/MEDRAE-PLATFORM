// src/staff-cpd/components.tsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Award, BookOpen, Clock, PlayCircle, FileText, Headphones, ExternalLink,
    CheckCircle2, Circle, Lock, Sparkles, ArrowRight, Calendar,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
    CpdActivity, CpdContentItem, CpdCompletion, CpdCertificate,
    CONTENT_LABEL, fmtHours, fmtPoints, fmtDate, fmtDuration, extractYouTubeId,
} from "./lib";

// ═══════════════════════════════════════════════════════════════
// TONE MAPS — shared accent system across CPD components
// ═══════════════════════════════════════════════════════════════
const GRADIENT_TONES: Record<string, string> = {
    blue: "from-blue-500 to-indigo-600",
    green: "from-emerald-500 to-teal-600",
    amber: "from-amber-500 to-orange-600",
    violet: "from-violet-500 to-purple-600",
    rose: "from-rose-500 to-pink-600",
    slate: "from-slate-500 to-slate-700",
};

const SOFT_TONES: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
    green: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300",
    violet: "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300",
    rose: "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300",
    slate: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
};

// Completion status tones
const STATUS_TONES: Record<string, string> = {
    verified: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    revoked: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};
const getStatusTone = (s?: string) =>
    STATUS_TONES[(s ?? "").toLowerCase()] ?? STATUS_TONES.pending;

// ═══════════════════════════════════════════════════════════════
// STAT TILE — used on dashboard
// ═══════════════════════════════════════════════════════════════
export function CpdStatTile({ label, value, hint, icon: Icon, tone = "blue" }: {
    label: string; value: string | number; hint?: string;
    icon: React.ComponentType<any>; tone?: "blue" | "green" | "amber" | "violet" | "rose" | "slate";
}) {
    const gradient = GRADIENT_TONES[tone] ?? GRADIENT_TONES.blue;
    const soft = SOFT_TONES[tone] ?? SOFT_TONES.blue;

    return (
        <Card className="relative overflow-hidden rounded-xl border-0 bg-white dark:bg-muted/70 shadow-sm hover:shadow-xl transition-all duration-300 p-0">
            <CardContent className="p-4 md:p-5 flex items-start gap-3 md:gap-4">
                <div className={`h-11 w-11 md:h-12 md:w-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-md`}>
                    <Icon className="h-5 w-5 md:h-6 md:w-6 text-white" strokeWidth={2.4} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {label}
                    </p>
                    <p className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight mt-0.5">
                        {value}
                    </p>
                    {hint && (
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 ${soft}`}>
                            {hint}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════
// ACTIVITY CARD — used on catalog
// ═══════════════════════════════════════════════════════════════
export function CpdActivityCard({ activity }: { activity: CpdActivity }) {
    return (
        <Link to={`/cpd/activity/${activity.id}`} className="block group">
            <Card className="group relative overflow-hidden rounded-xl border-0 bg-white dark:bg-muted/70 shadow-sm hover:shadow-xl transition-all duration-300 p-0 h-full">
                {/* Cover image */}
                <div className="aspect-video relative overflow-hidden">
                    {activity.thumbnail_url ? (
                        <img
                            src={activity.thumbnail_url}
                            alt={activity.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <BookOpen className="h-12 w-12 text-white/60" strokeWidth={2.2} />
                        </div>
                    )}

                    {/* Category pill */}
                    {activity.category && (
                        <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-gray-800 shadow-md">
                            {activity.category}
                        </span>
                    )}

                    {/* Difficulty pill */}
                    {activity.difficulty && (
                        <span className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white capitalize shadow-md">
                            {activity.difficulty}
                        </span>
                    )}
                </div>

                <CardContent className="p-4 md:p-5 space-y-2">
                    <h3 className="font-bold text-sm md:text-base text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 min-h-[2.5rem]">
                        {activity.title}
                    </h3>

                    {activity.short_description && (
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                            {activity.short_description}
                        </p>
                    )}

                    {/* Meta chips */}
                    <div className="flex items-center gap-2 md:gap-3 pt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                            <Clock className="w-3 h-3" />
                            {fmtHours(activity.learning_hours)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                            <Award className="w-3 h-3" />
                            {fmtPoints(activity.configured_cpd_points)} pts
                        </span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

// ═══════════════════════════════════════════════════════════════
// COMPLETION ROW — used on dashboard + progress page
// ═══════════════════════════════════════════════════════════════
export function CpdCompletionRow({ completion }: { completion: CpdCompletion & { activity?: CpdActivity } }) {
    return (
        <div className="flex items-center gap-3 py-3 px-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
            {/* Icon tile */}
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-white" strokeWidth={2.6} />
            </div>

            {/* Meta */}
            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
                    {completion.activity?.title ?? "CPD Activity"}
                </p>
                <div className="flex items-center gap-2 md:gap-3 mt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                        <Calendar className="w-3 h-3" />
                        {fmtDate(completion.completed_at)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                        <Clock className="w-3 h-3" />
                        {fmtHours(completion.learning_hours_completed)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                        <Award className="w-3 h-3" />
                        {fmtPoints(completion.points_awarded)} pts
                    </span>
                </div>
            </div>

            {/* Status pill */}
            <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${getStatusTone(completion.completion_status)}`}
            >
                {completion.completion_status}
            </span>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// CERTIFICATE CARD — used on certificates page
// ═══════════════════════════════════════════════════════════════
export function CpdCertificateCard({ certificate }: { certificate: CpdCertificate }) {
    return (
        <Link to={`/cpd/certificates/${certificate.id}`} className="block group">
            <Card className="group relative overflow-hidden rounded-xl border-0 bg-white dark:bg-muted/70 shadow-sm hover:shadow-xl transition-all duration-300 p-0">
                {/* Top accent bar */}
                <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-orange-600" />

                <CardContent className="p-4 md:p-5">
                    <div className="flex items-start gap-3 md:gap-4">
                        <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                            <Award className="h-6 w-6 md:h-7 md:w-7 text-white" strokeWidth={2.4} />
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Certificate
                            </p>
                            <p className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100 truncate mt-0.5">
                                {certificate.certificate_number}
                            </p>

                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                    <Calendar className="w-3 h-3" />
                                    Issued {fmtDate(certificate.issued_at)}
                                </span>
                            </div>

                            <p className="text-[10px] md:text-[11px] text-gray-400 dark:text-gray-500 font-mono mt-1.5 truncate">
                                Code: {certificate.verification_code}
                            </p>
                        </div>

                        {/* Arrow cue */}
                        <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

// ═══════════════════════════════════════════════════════════════
// CONTENT RENDERERS — dispatch by content_type + external_provider
// ═══════════════════════════════════════════════════════════════
export function ContentRenderer({ item, onProgress }: { item: CpdContentItem; onProgress?: (pct: number, lastPos?: number) => void }) {
    const { content_type, external_provider, external_url, external_id, metadata, title } = item;

    if (content_type === "video" && external_provider === "youtube") {
        const vid = external_id || extractYouTubeId(external_url ?? "");
        if (!vid) return <FallbackLink url={external_url} label="Invalid YouTube URL" />;
        return (
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-md">
                <iframe
                    src={`https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1`}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                />
            </div>
        );
    }

    if (content_type === "podcast" && external_provider === "apple_podcasts") {
        const embed = external_url?.replace("podcasts.apple.com", "embed.podcasts.apple.com");
        return (
            <div className="space-y-3">
                <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 shadow-sm">
                    {embed ? (
                        <iframe
                            src={embed}
                            title={title}
                            allow="autoplay *; encrypted-media *; clipboard-write"
                            className="w-full h-[175px]"
                        />
                    ) : (
                        <FallbackLink url={external_url} label="Open in Apple Podcasts" />
                    )}
                </div>
                {metadata?.artwork && (
                    <img src={metadata.artwork} alt="" className="h-20 w-20 rounded-xl object-cover shadow-sm" />
                )}
            </div>
        );
    }

    if (content_type === "pdf" && external_url) {
        return (
            <div className="space-y-3">
                <iframe
                    src={external_url}
                    title={title}
                    className="w-full h-[70vh] rounded-xl bg-white shadow-sm border-0"
                />
                <FallbackLink url={external_url} label="Open PDF in new tab" />
            </div>
        );
    }

    if (content_type === "text" || content_type === "article" || content_type === "case_study") {
        return (
            <article className="prose prose-slate dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: metadata?.html ?? `<p>${item.description ?? ""}</p>` }} />
            </article>
        );
    }

    if (content_type === "external_resource" || content_type === "webinar" || external_provider === "external") {
        return (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-5 md:p-6 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                    <ExternalLink className="h-5 w-5 text-white" strokeWidth={2.4} />
                </div>
                <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                    {item.description ?? "External learning resource."}
                </p>
                {external_url && (
                    <Button
                        asChild
                        className="h-11 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/20 px-5"
                    >
                        <a href={external_url} target="_blank" rel="noopener noreferrer">
                            Open Resource
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </a>
                    </Button>
                )}
            </div>
        );
    }

    return <FallbackLink url={external_url} label="Open Content" />;
}

function FallbackLink({ url, label }: { url: string | null; label: string }) {
    if (!url) {
        return (
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                No content available.
            </div>
        );
    }
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:gap-3 transition-all"
        >
            <ExternalLink className="h-4 w-4" /> {label}
        </a>
    );
}

// ═══════════════════════════════════════════════════════════════
// CONTENT TYPE CHIP
// ═══════════════════════════════════════════════════════════════
const CHIP_ICON: Record<string, React.ComponentType<any>> = {
    video: PlayCircle, podcast: Headphones, article: FileText, pdf: FileText,
    text: FileText, case_study: BookOpen, external_resource: ExternalLink,
    webinar: ExternalLink, quiz: CheckCircle2, assessment: CheckCircle2,
};

const CHIP_TONES: Record<string, string> = {
    video: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    podcast: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    article: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    pdf: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    text: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    case_study: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    external_resource: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    webinar: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    quiz: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    assessment: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export function ContentTypeChip({ type }: { type: CpdContentItem["content_type"] }) {
    const Icon = CHIP_ICON[type] ?? FileText;
    const tone = CHIP_TONES[type] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex-shrink-0 ${tone}`}>
            <Icon className="h-3 w-3" /> {CONTENT_LABEL[type]}
        </span>
    );
}

// ═══════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════
export function CpdEmptyState({ title, hint, icon: Icon = BookOpen }: { title: string; hint?: string; icon?: React.ComponentType<any> }) {
    return (
        <div className="text-center py-12 md:py-16 px-4 rounded-xl bg-gray-50 dark:bg-gray-900/50">
            <div className="w-14 h-14 md:w-16 md:h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 mb-3">
                <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" strokeWidth={2.4} />
            </div>
            <p className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100">
                {title}
            </p>
            {hint && (
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    {hint}
                </p>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// PROGRESS CHECKLIST ROW (used on ActivityDetail)
// ═══════════════════════════════════════════════════════════════
export function ChecklistRow({ done, label, sublabel, locked }: { done: boolean; label: string; sublabel?: string; locked?: boolean }) {
    return (
        <div className="flex items-start gap-3 py-2.5 px-1">
            {locked ? (
                <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Lock className="h-3.5 w-3.5 text-gray-400" />
                </div>
            ) : done ? (
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm shadow-emerald-500/30">
                    <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={2.6} />
                </div>
            ) : (
                <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Circle className="h-3 w-3 text-gray-400" strokeWidth={2.5} />
                </div>
            )}
            <div className="min-w-0 flex-1">
                <p
                    className={`text-sm md:text-[15px] leading-snug ${done
                        ? "line-through text-gray-400 dark:text-gray-500"
                        : locked
                            ? "text-gray-400 dark:text-gray-500"
                            : "font-bold text-gray-900 dark:text-gray-100"
                        }`}
                >
                    {label}
                </p>
                {sublabel && (
                    <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {sublabel}
                    </p>
                )}
            </div>
        </div>
    );
}

// Re-export for convenience
export { Progress };