// src/modules/neldes-scroll/components/DesktopCommentsPanel.tsx
// ============================================================
// Neldes Scroll — desktop right-side comments panel.
// Same data functions as the mobile CommentSheet.
// ============================================================

import { useEffect, useState } from "react";
import { Send, Loader2, Eye, Heart, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { fetchComments, postComment } from "../lib/supabase-memes";
import type { MemeComment, FeedPost } from "../types";
import { NELDES_COLORS } from "../config/constants";

interface DesktopCommentsPanelProps {
    post: FeedPost | null;
}

function formatCount(n: number): string {
    if (n < 1000) return String(n);
    if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
    return `${(n / 1_000_000).toFixed(1)}m`;
}

export function DesktopCommentsPanel({ post }: DesktopCommentsPanelProps) {
    const [comments, setComments] = useState<MemeComment[]>([]);
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!post) {
            setComments([]);
            return;
        }
        setLoading(true);
        setComments([]);
        fetchComments(post.id)
            .then(setComments)
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [post?.id]);

    const handleSend = async () => {
        if (!post || !body.trim() || sending) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setSending(true);
        try {
            const c = await postComment(post.id, body.trim(), {
                id: user.id,
                name: user.user_metadata?.name ?? "You",
                avatar: user.user_metadata?.avatar_url ?? null,
            });
            setComments((prev) => [c, ...prev]);
            setBody("");
        } catch {
            /* non-fatal */
        } finally {
            setSending(false);
        }
    };

    if (!post) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-[13px]" style={{ color: NELDES_COLORS.textSecondary }}>
                    Scroll the feed to see comments
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-[#21262d] flex-shrink-0">
                <h3
                    className="text-[14px] font-bold truncate"
                    style={{ color: NELDES_COLORS.textPrimary }}
                >
                    {post.title || "Comments"}
                </h3>

                {/* ── Stats row: views · likes · comments ─────── */}
                <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" color={NELDES_COLORS.textSecondary} />
                        <span className="text-[11px] font-semibold" style={{ color: NELDES_COLORS.textSecondary }}>
                            {formatCount(post.views_count)}
                        </span>
                    </div>
                    <span className="text-[11px]" style={{ color: "#484f58" }}>·</span>
                    <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" color={NELDES_COLORS.heart} fill={NELDES_COLORS.heart} />
                        <span className="text-[11px] font-semibold" style={{ color: NELDES_COLORS.textSecondary }}>
                            {formatCount(post.likes_count)}
                        </span>
                    </div>
                    <span className="text-[11px]" style={{ color: "#484f58" }}>·</span>
                    <div className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" color={NELDES_COLORS.textSecondary} />
                        <span className="text-[11px] font-semibold" style={{ color: NELDES_COLORS.textSecondary }}>
                            {formatCount(post.comments_count)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
                {loading && (
                    <div className="flex justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin" color={NELDES_COLORS.accent} />
                    </div>
                )}

                {!loading && comments.length === 0 && (
                    <p
                        className="text-center text-[13px] mt-8"
                        style={{ color: NELDES_COLORS.textSecondary }}
                    >
                        No comments yet. Be the first.
                    </p>
                )}

                {comments.map((c) => (
                    <div key={c.id} className="flex gap-2.5">
                        {c.user_avatar ? (
                            <img
                                src={c.user_avatar}
                                alt={c.user_name}
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-[#30363d] flex items-center justify-center text-[11px] font-bold text-[#f0f6fc] shrink-0">
                                {c.user_name?.[0]?.toUpperCase() ?? "U"}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p
                                className="text-[12px] font-bold"
                                style={{ color: NELDES_COLORS.textPrimary }}
                            >
                                {c.user_name}
                            </p>
                            <p
                                className="text-[13px] leading-snug break-words"
                                style={{ color: NELDES_COLORS.textSecondary }}
                            >
                                {c.body}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Composer */}
            <div className="px-4 py-3 border-t border-[#21262d] flex gap-2 flex-shrink-0">
                <input
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Add a comment…"
                    maxLength={500}
                    className="flex-1 h-10 rounded-full px-4 text-[13px] bg-[#21262d] border-0 outline-none"
                    style={{ color: NELDES_COLORS.textPrimary }}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <button
                    onClick={handleSend}
                    disabled={!body.trim() || sending}
                    className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
                    style={{ backgroundColor: NELDES_COLORS.accent }}
                >
                    {sending ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                        <Send className="w-4 h-4 text-white" />
                    )}
                </button>
            </div>
        </div>
    );
}