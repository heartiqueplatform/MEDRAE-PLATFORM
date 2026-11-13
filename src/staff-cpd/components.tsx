// src/staff-cpd/components.tsx
import React from "react";
import { Progress } from "@/components/ui/progress";
import {
    Award, BookOpen, Clock, PlayCircle, FileText, Headphones, ExternalLink,
    CheckCircle2, Circle, Lock, ArrowRight, Calendar,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
    CpdActivity, CpdContentItem, CpdCompletion, CpdCertificate,
    CONTENT_LABEL, fmtHours, fmtPoints, fmtDate, fmtDuration, extractYouTubeId,
} from "./lib";

/* ------------------------------------------------------------------ */
/*  Soft accent tones (no gradients)                                  */
/* ------------------------------------------------------------------ */

const SOFT_TONES: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400",
    green: "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
    amber: "bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400",
    violet: "bg-violet-50 dark:bg-violet-400/10 text-violet-700 dark:text-violet-400",
    rose: "bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-400",
    slate: "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300",
};

const ICON_BG: Record<string, string> = {
    blue: "bg-blue-600 text-white",
    green: "bg-emerald-600 text-white",
    amber: "bg-amber-600 text-white",
    violet: "bg-violet-600 text-white",
    rose: "bg-rose-600 text-white",
    slate: "bg-slate-600 text-white",
};

const STATUS_TONES: Record<string, string> = {
    verified: "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
    pending: "bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400",
    revoked: "bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-400",
};
const getStatusTone = (s?: string) =>
    STATUS_TONES[(s ?? "").toLowerCase()] ?? STATUS_TONES.pending;

/* ═══════════════════════════════════════════════════════════════
   STAT TILE — used on dashboard
   ═══════════════════════════════════════════════════════════════ */
export function CpdStatTile({ label, value, hint, icon: Icon, tone = "blue" }: {
    label: string; value: string | number; hint?: string;
    icon: React.ComponentType<any>; tone?: "blue" | "green" | "amber" | "violet" | "rose" | "slate";
}) {
    const soft = SOFT_TONES[tone] ?? SOFT_TONES.blue;
    const iconBg = ICON_BG[tone] ?? ICON_BG.blue;

    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
            <div className="flex items-start gap-2.5">
                <div className={`h-9 w-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className="h-4 w-4" strokeWidth={2.4} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {label}
                    </p>
                    <p className="text-base font-bold text-slate-900 dark:text-white leading-tight mt-0.5 tabular-nums">
                        {value}
                    </p>
                    {hint && (
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${soft}`}>
                            {hint}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   ACTIVITY CARD — used on catalog
   ═══════════════════════════════════════════════════════════════ */
export function CpdActivityCard({ activity }: { activity: CpdActivity }) {
    return (
        <Link
            to={`/cpd/activity/${activity.id}`}
            className="block rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden
                       active:scale-[0.99] transition-transform"
            style={{ touchAction: "manipulation" }}
        >
            <div className="aspect-video relative overflow-hidden bg-slate-100 dark:bg-white/[0.06]">
                {activity.thumbnail_url ? (
                    <img
                        src={activity.thumbnail_url}
                        alt={activity.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-slate-400 dark:text-slate-600" strokeWidth={2.2} />
                    </div>
                )}

                {activity.category && (
                    <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider
                                     px-2 py-0.5 rounded-full
                                     bg-black/60 text-white backdrop-blur-sm">
                        {activity.category}
                    </span>
                )}

                {activity.difficulty && (
                    <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider
                                     px-2 py-0.5 rounded-full capitalize
                                     bg-black/60 text-white backdrop-blur-sm">
                        {activity.difficulty}
                    </span>
                )}
            </div>

            <div className="p-3 space-y-2">
                <h3 className="text-[13px] font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 min-h-[2.25rem]">
                    {activity.title}
                </h3>

                {activity.short_description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                        {activity.short_description}
                    </p>
                )}

                <div className="flex items-center gap-2.5 pt-0.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium
                                     text-slate-500 dark:text-slate-400">
                        <Clock className="h-3 w-3" />
                        {fmtHours(activity.learning_hours)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium
                                     text-slate-500 dark:text-slate-400">
                        <Award className="h-3 w-3" />
                        {fmtPoints(activity.configured_cpd_points)} pts
                    </span>
                </div>
            </div>
        </Link>
    );
}

/* ═══════════════════════════════════════════════════════════════
   COMPLETION ROW
   ═══════════════════════════════════════════════════════════════ */
export function CpdCompletionRow({ completion }: { completion: CpdCompletion & { activity?: CpdActivity } }) {
    return (
        <div className="flex items-center gap-2.5 py-2.5 border-b border-slate-100 dark:border-white/[0.04] last:border-0">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2.6} />
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                    {completion.activity?.title ?? "CPD Activity"}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium
                                     text-slate-500 dark:text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {fmtDate(completion.completed_at)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium
                                     text-slate-500 dark:text-slate-400">
                        <Clock className="h-3 w-3" />
                        {fmtHours(completion.learning_hours_completed)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium
                                     text-slate-500 dark:text-slate-400">
                        <Award className="h-3 w-3" />
                        {fmtPoints(completion.points_awarded)} pts
                    </span>
                </div>
            </div>

            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0
                              ${getStatusTone(completion.completion_status)}`}>
                {completion.completion_status}
            </span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   CERTIFICATE CARD
   ═══════════════════════════════════════════════════════════════ */
export function CpdCertificateCard({ certificate }: { certificate: CpdCertificate }) {
    return (
        <Link
            to={`/cpd/certificates/${certificate.id}`}
            className="block rounded-2xl bg-white dark:bg-[#161b22] p-3
                       active:scale-[0.99] transition-transform"
            style={{ touchAction: "manipulation" }}
        >
            <div className="flex items-start gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                    <Award className="h-5 w-5" strokeWidth={2.4} />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Certificate
                    </p>
                    <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate mt-0.5">
                        {certificate.certificate_number}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium
                                         text-slate-500 dark:text-slate-400">
                            <Calendar className="h-3 w-3" />
                            Issued {fmtDate(certificate.issued_at)}
                        </span>
                    </div>

                    <p className="text-[9px] font-mono font-medium text-slate-400 dark:text-slate-500 mt-1 truncate">
                        {certificate.verification_code}
                    </p>
                </div>

                <ArrowRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 shrink-0 mt-1" />
            </div>
        </Link>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MARKDOWN RENDERER — reads the new `body` column
   ═══════════════════════════════════════════════════════════════ */

function MarkdownRenderer({ source }: { source: string }) {
    const lines = source.split("\n");
    return (
        <div className="space-y-2 text-[13px] leading-relaxed text-slate-800 dark:text-slate-200">
            {lines.map((line, i) => {
                if (!line.trim()) return <div key={i} className="h-2" />;

                /* Heading level 2 */
                if (line.startsWith("## ")) {
                    return (
                        <h2 key={i} className="text-[16px] font-bold text-slate-900 dark:text-white mt-3">
                            {renderInline(line.slice(3))}
                        </h2>
                    );
                }

                /* Heading level 3 */
                if (line.startsWith("### ")) {
                    return (
                        <h3 key={i} className="text-[14px] font-bold text-slate-900 dark:text-white mt-2">
                            {renderInline(line.slice(4))}
                        </h3>
                    );
                }

                /* Full-line image */
                const imgMatch = line.trim().match(/^!\[.*?\]\((.*?)\)$/);
                if (imgMatch) {
                    return (
                        <img
                            key={i}
                            src={imgMatch[1]}
                            alt=""
                            className="rounded-xl my-2 max-w-full w-full object-cover"
                            loading="lazy"
                        />
                    );
                }

                /* Bullet */
                if (line.trim().startsWith("- ")) {
                    return (
                        <div key={i} className="flex gap-2 ml-1">
                            <span className="text-slate-500 dark:text-slate-400 shrink-0">•</span>
                            <span>{renderInline(line.trim().slice(2))}</span>
                        </div>
                    );
                }

                /* Numbered */
                const numMatch = line.trim().match(/^(\d+)\.\s(.*)$/);
                if (numMatch) {
                    return (
                        <div key={i} className="flex gap-2 ml-1">
                            <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0">{numMatch[1]}.</span>
                            <span>{renderInline(numMatch[2])}</span>
                        </div>
                    );
                }

                /* Paragraph */
                return <p key={i}>{renderInline(line)}</p>;
            })}
        </div>
    );
}

function renderInline(s: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|!\[.*?\]\([^)]+\))/g;
    let last = 0, m, k = 0;
    while ((m = regex.exec(s)) !== null) {
        if (m.index > last) parts.push(s.slice(last, m.index));
        const tok = m[0];
        if (tok.startsWith("![")) {
            const im = tok.match(/!\[.*?\]\((.*?)\)/);
            if (im) parts.push(
                <img key={k++} src={im[1]} alt="" className="rounded-lg my-1 max-w-full" loading="lazy" />
            );
        } else if (tok.startsWith("**")) {
            parts.push(<b key={k++}>{tok.slice(2, -2)}</b>);
        } else if (tok.startsWith("*")) {
            parts.push(<i key={k++}>{tok.slice(1, -1)}</i>);
        } else {
            const lm = tok.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (lm) parts.push(
                <a key={k++} href={lm[2]}
                    className="text-blue-600 dark:text-blue-400 underline"
                    target="_blank" rel="noopener noreferrer">
                    {lm[1]}
                </a>
            );
        }
        last = m.index + tok.length;
    }
    if (last < s.length) parts.push(s.slice(last));
    return <>{parts}</>;
}

/* ═══════════════════════════════════════════════════════════════
   CONTENT RENDERER — dispatches on content_type
   ═══════════════════════════════════════════════════════════════ */
export function ContentRenderer({ item, onProgress }: {
    item: CpdContentItem;
    onProgress?: (pct: number, lastPos?: number) => void;
}) {
    const { content_type, external_provider, external_url, external_id, metadata, title } = item;

    /* ── Video (YouTube) ── */
    if (content_type === "video" && external_provider === "youtube") {
        const vid = external_id || extractYouTubeId(external_url ?? "");
        if (!vid) return <FallbackLink url={external_url} label="Invalid YouTube URL" />;
        return (
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
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

    /* ── Podcast (Apple) ── */
    if (content_type === "podcast" && external_provider === "apple_podcasts") {
        const embed = external_url?.replace("podcasts.apple.com", "embed.podcasts.apple.com");
        return (
            <div className="space-y-2">
                <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-white/[0.06]">
                    {embed ? (
                        <iframe
                            src={embed}
                            title={title}
                            allow="autoplay *; encrypted-media *; clipboard-write"
                            className="w-full h-[175px]"
                        />
                    ) : (
                        <div className="p-4">
                            <FallbackLink url={external_url} label="Open in Apple Podcasts" />
                        </div>
                    )}
                </div>
                {metadata?.artwork && (
                    <img src={metadata.artwork} alt="" className="h-20 w-20 rounded-xl object-cover" />
                )}
            </div>
        );
    }

    /* ── PDF ── */
    if (content_type === "pdf" && external_url) {
        return (
            <div className="space-y-2">
                <iframe
                    src={external_url}
                    title={title}
                    className="w-full h-[70vh] rounded-xl bg-white dark:bg-[#161b22] border-0"
                />
                <FallbackLink url={external_url} label="Open PDF in new tab" />
            </div>
        );
    }

    /* ── Reading / Article / Case Study — read `body` ── */
    if (content_type === "text" || content_type === "article" || content_type === "case_study") {
        /* 🆕 read the new column first */
        const body = item.body?.trim();
        if (body) {
            return <MarkdownRenderer source={body} />;
        }

        /* Fallback: older items that used metadata.html or metadata.body */
        const legacyHtml = metadata?.html as string | undefined;
        if (legacyHtml) {
            return (
                <article
                    className="prose prose-slate dark:prose-invert max-w-none text-[13px] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: legacyHtml }}
                />
            );
        }
        const legacyBody = (metadata?.body as string | undefined) ?? item.description ?? "";
        if (legacyBody) {
            return <MarkdownRenderer source={legacyBody} />;
        }

        return (
            <p className="text-[12px] text-slate-500 dark:text-slate-400 italic">
                No content attached to this item yet.
            </p>
        );
    }

    /* ── External resource / webinar ── */
    if (content_type === "external_resource" || content_type === "webinar" || external_provider === "external") {
        return (
            <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-4 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <ExternalLink className="h-4 w-4" strokeWidth={2.4} />
                </div>
                <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    {item.description ?? "External learning resource."}
                </p>
                {external_url && (
                    <a
                        href={external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl
                                   bg-blue-600 text-white text-[12px] font-bold
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        Open Resource
                        <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                )}
            </div>
        );
    }

    return <FallbackLink url={external_url} label="Open Content" />;
}

function FallbackLink({ url, label }: { url: string | null; label: string }) {
    if (!url) {
        return (
            <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 text-[11px] font-medium
                            text-slate-500 dark:text-slate-400">
                No content available.
            </div>
        );
    }
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold
                       text-blue-600 dark:text-blue-400
                       active:scale-[0.97] transition-transform"
        >
            <ExternalLink className="h-3.5 w-3.5" /> {label}
        </a>
    );
}

/* ═══════════════════════════════════════════════════════════════
   CONTENT TYPE CHIP
   ═══════════════════════════════════════════════════════════════ */
const CHIP_ICON: Record<string, React.ComponentType<any>> = {
    video: PlayCircle, podcast: Headphones, article: FileText, pdf: FileText,
    text: FileText, case_study: BookOpen, external_resource: ExternalLink,
    webinar: ExternalLink, quiz: CheckCircle2, assessment: CheckCircle2,
};

const CHIP_TONES: Record<string, string> = {
    video: "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400",
    podcast: "bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-400",
    article: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
    pdf: "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400",
    text: "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300",
    case_study: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
    external_resource: "bg-teal-50 text-teal-700 dark:bg-teal-400/10 dark:text-teal-400",
    webinar: "bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-400",
    quiz: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
    assessment: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
};

export function ContentTypeChip({ type }: { type: CpdContentItem["content_type"] }) {
    const Icon = CHIP_ICON[type] ?? FileText;
    const tone = CHIP_TONES[type] ?? "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300";
    return (
        <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${tone}`}>
            <Icon className="h-2.5 w-2.5" /> {CONTENT_LABEL[type]}
        </span>
    );
}

/* ═══════════════════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════════════════ */
export function CpdEmptyState({ title, hint, icon: Icon = BookOpen }: { title: string; hint?: string; icon?: React.ComponentType<any> }) {
    return (
        <div className="text-center py-10 px-4 rounded-2xl bg-white dark:bg-[#161b22]">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-white/[0.06]
                            flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-slate-400 dark:text-slate-500" strokeWidth={2.4} />
            </div>
            <p className="text-[13px] font-bold text-slate-900 dark:text-white">
                {title}
            </p>
            {hint && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-snug">
                    {hint}
                </p>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   PROGRESS CHECKLIST ROW
   ═══════════════════════════════════════════════════════════════ */
export function ChecklistRow({ done, label, sublabel, locked }: { done: boolean; label: string; sublabel?: string; locked?: boolean }) {
    return (
        <div className="flex items-start gap-2.5 py-2 px-1">
            {locked ? (
                <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                    <Lock className="h-3 w-3 text-slate-400" />
                </div>
            ) : done ? (
                <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.6} />
                </div>
            ) : (
                <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                    <Circle className="h-2.5 w-2.5 text-slate-400" strokeWidth={2.5} />
                </div>
            )}
            <div className="min-w-0 flex-1">
                <p
                    className={`text-[12px] leading-snug ${done
                        ? "line-through text-slate-400 dark:text-slate-500"
                        : locked
                            ? "text-slate-400 dark:text-slate-500"
                            : "font-bold text-slate-900 dark:text-white"
                        }`}
                >
                    {label}
                </p>
                {sublabel && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {sublabel}
                    </p>
                )}
            </div>
        </div>
    );
}

/* Re-export for convenience */
export { Progress };