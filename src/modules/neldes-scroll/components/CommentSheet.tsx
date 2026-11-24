// src/modules/neldes-scroll/components/CommentSheet.tsx
// ============================================================
// Neldes Scroll — comments sheet.
// Uses NeldesModal (dedicated dark modal, does not touch CenteredModal).
// ============================================================

import { useEffect, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { fetchComments, postComment } from "../lib/supabase-memes";
import type { MemeComment, FeedPost } from "../types";
import { NELDES_COLORS } from "../config/constants";
import { NeldesModal } from "./NeldesModal";

interface CommentSheetProps {
    open: boolean;
    post: FeedPost | null;
    onClose: () => void;
}

export function CommentSheet({ open, post, onClose }: CommentSheetProps) {
    const [comments, setComments] = useState<MemeComment[]>([]);
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !post) return;
        setLoading(true);
        setComments([]);
        fetchComments(post.id)
            .then(setComments)
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [open, post]);

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

    // Footer = input row. NeldesModal forces the dark input styling via
    // .neldes-modal-content on the footer wrapper — no inline bg classes needed.
    const footer = (
        <div className="flex gap-2">
            <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add a comment…"
                maxLength={500}
                className="flex-1 h-10 rounded-full px-4 text-[13px]"
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
    );

    return (
        <NeldesModal
            open={open}
            onClose={onClose}
            title={`Comments${comments.length ? ` (${comments.length})` : ""}`}
            subtitle={post?.title}
            maxWidthClass="max-w-md"
            maxHeight="70vh"
            footer={footer}
        >
            <div className="px-5 py-3 space-y-4">
                {loading && (
                    <div className="flex justify-center py-6">
                        <Loader2
                            className="w-5 h-5 animate-spin"
                            color={NELDES_COLORS.accent}
                        />
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
        </NeldesModal>
    );
}