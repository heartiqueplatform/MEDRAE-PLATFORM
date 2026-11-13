// src/staff-cpd/components/ContentRenderer.tsx
import React from "react";
import { ExternalLink, ArrowRight } from "lucide-react";
import { type CpdContentItem, extractYouTubeId } from "../lib";

/* ── internal markdown renderer ── */
function MarkdownRenderer({ source }: { source: string }) {
    const lines = source.split("\n");
    return (
        <div className="space-y-2 text-[13px] leading-relaxed text-slate-800 dark:text-slate-200">
            {lines.map((line, i) => {
                if (!line.trim()) return <div key={i} className="h-2" />;

                if (line.startsWith("## ")) {
                    return <h2 key={i} className="text-[16px] font-bold text-slate-900 dark:text-white mt-3">{renderInline(line.slice(3))}</h2>;
                }
                if (line.startsWith("### ")) {
                    return <h3 key={i} className="text-[14px] font-bold text-slate-900 dark:text-white mt-2">{renderInline(line.slice(4))}</h3>;
                }

                const imgMatch = line.trim().match(/^!\[.*?\]\((.*?)\)$/);
                if (imgMatch) {
                    return <img key={i} src={imgMatch[1]} alt="" className="rounded-xl my-2 max-w-full w-full object-cover" loading="lazy" />;
                }

                if (line.trim().startsWith("- ")) {
                    return (
                        <div key={i} className="flex gap-2 ml-1">
                            <span className="text-slate-500 dark:text-slate-400 shrink-0">•</span>
                            <span>{renderInline(line.trim().slice(2))}</span>
                        </div>
                    );
                }

                const numMatch = line.trim().match(/^(\d+)\.\s(.*)$/);
                if (numMatch) {
                    return (
                        <div key={i} className="flex gap-2 ml-1">
                            <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0">{numMatch[1]}.</span>
                            <span>{renderInline(numMatch[2])}</span>
                        </div>
                    );
                }

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
            if (im) parts.push(<img key={k++} src={im[1]} alt="" className="rounded-lg my-1 max-w-full" loading="lazy" />);
        } else if (tok.startsWith("**")) {
            parts.push(<b key={k++}>{tok.slice(2, -2)}</b>);
        } else if (tok.startsWith("*")) {
            parts.push(<i key={k++}>{tok.slice(1, -1)}</i>);
        } else {
            const lm = tok.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (lm) parts.push(
                <a key={k++} href={lm[2]} className="text-blue-600 dark:text-blue-400 underline" target="_blank" rel="noopener noreferrer">
                    {lm[1]}
                </a>
            );
        }
        last = m.index + tok.length;
    }
    if (last < s.length) parts.push(s.slice(last));
    return <>{parts}</>;
}

/* ── internal fallback link ── */
function FallbackLink({ url, label }: { url: string | null; label: string }) {
    if (!url) {
        return (
            <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                No content available.
            </div>
        );
    }
    return (
        <a href={url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600 dark:text-blue-400 active:scale-[0.97] transition-transform">
            <ExternalLink className="h-3.5 w-3.5" /> {label}
        </a>
    );
}

/* ── public renderer ── */
export function ContentRenderer({ item, onProgress }: {
    item: CpdContentItem;
    onProgress?: (pct: number, lastPos?: number) => void;
}) {
    const { content_type, external_provider, external_url, external_id, metadata, title } = item;

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

    if (content_type === "podcast" && external_provider === "apple_podcasts") {
        const embed = external_url?.replace("podcasts.apple.com", "embed.podcasts.apple.com");
        return (
            <div className="space-y-2">
                <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-white/[0.06]">
                    {embed ? (
                        <iframe src={embed} title={title} allow="autoplay *; encrypted-media *; clipboard-write" className="w-full h-[175px]" />
                    ) : (
                        <div className="p-4"><FallbackLink url={external_url} label="Open in Apple Podcasts" /></div>
                    )}
                </div>
                {metadata?.artwork && (
                    <img src={metadata.artwork} alt="" className="h-20 w-20 rounded-xl object-cover" />
                )}
            </div>
        );
    }

    if (content_type === "pdf" && external_url) {
        return (
            <div className="space-y-2">
                <iframe src={external_url} title={title} className="w-full h-[70vh] rounded-xl bg-white dark:bg-[#161b22] border-0" />
                <FallbackLink url={external_url} label="Open PDF in new tab" />
            </div>
        );
    }

    if (content_type === "text" || content_type === "article" || content_type === "case_study") {
        const body = item.body?.trim();
        if (body) return <MarkdownRenderer source={body} />;

        const legacyHtml = metadata?.html as string | undefined;
        if (legacyHtml) {
            return (
                <article className="prose prose-slate dark:prose-invert max-w-none text-[13px] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: legacyHtml }} />
            );
        }

        const legacyBody = (metadata?.body as string | undefined) ?? item.description ?? "";
        if (legacyBody) return <MarkdownRenderer source={legacyBody} />;

        return <p className="text-[12px] text-slate-500 dark:text-slate-400 italic">No content attached to this item yet.</p>;
    }

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
                    <a href={external_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-blue-600 text-white text-[12px] font-bold active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}>
                        Open Resource <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                )}
            </div>
        );
    }

    return <FallbackLink url={external_url} label="Open Content" />;
}