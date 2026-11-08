"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Heart, Send, Trash2, CornerDownRight,
    MessageCircle, ChevronDown, Check, X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { playSound } from "@/lib/soundManager";

type CommentNode = {
    id: string;
    card_id: string;
    user_id: string;
    parent_id: string | null;
    body: string;
    likes_count: number;
    created_at: string;
    updated_at?: string;
    author_name: string;
    author_avatar: string | null;
    children: CommentNode[];
    has_liked: boolean;
};

interface Props {
    cardId: string;
    user: any;
    commentsCount: number;
    onCountChange: (next: number) => void;
    open: boolean;
    onToggleOpen: () => void;
    /** "micro" = official micro case, "ward" = user-posted case */
    variant?: "micro" | "ward";
}

// ── RPC/table resolver per variant ──────────────────────────
function resolveEndpoints(variant: "micro" | "ward") {
    if (variant === "ward") {
        return {
            rpcList: "get_ward_case_comments",
            rpcLikes: "get_ward_comment_states",
            table: "user_ward_case_comments",
            likesTable: "user_ward_case_comment_likes",
        };
    }
    return {
        rpcList: "get_micro_case_comments",
        rpcLikes: "get_micro_comment_likes",
        table: "micro_case_comments",
        likesTable: "micro_case_comment_likes",
    };
}

function buildTree(flat: any[], likedSet: Set<string>): CommentNode[] {
    const byId = new Map<string, CommentNode>();
    const roots: CommentNode[] = [];
    for (const c of flat) {
        byId.set(c.id, {
            ...c,
            likes_count: Number(c.likes_count ?? 0),
            children: [],
            has_liked: likedSet.has(c.id),
        });
    }
    for (const c of byId.values()) {
        if (c.parent_id && byId.has(c.parent_id)) {
            byId.get(c.parent_id)!.children.push(c);
        } else {
            roots.push(c);
        }
    }
    return roots;
}

export default function MicroCaseComments({
    cardId,
    user,
    commentsCount,
    onCountChange,
    open,
    onToggleOpen,
    variant = "micro",
}: Props) {
    const ep = resolveEndpoints(variant);
    const [loading, setLoading] = useState(false);
    const [tree, setTree] = useState<CommentNode[]>([]);
    const [total, setTotal] = useState(commentsCount);
    const [replyTo, setReplyTo] = useState<CommentNode | null>(null);
    const [input, setInput] = useState("");
    const [posting, setPosting] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const loadedRef = useRef(false);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => { setTotal(commentsCount); }, [commentsCount]);

    useEffect(() => {
        if (!open) return;
        if (loadedRef.current) return;
        loadedRef.current = true;

        (async () => {
            setLoading(true);
            try {
                const idParam = variant === "ward" ? { p_case_id: cardId } : { p_card_id: cardId };
                const [{ data: rows }, { data: likes }] = await Promise.all([
                    supabase.rpc(ep.rpcList, idParam),
                    supabase.rpc(ep.rpcLikes, idParam),
                ]);
                const likedSet = new Set<string>();
                (likes ?? []).forEach((l: any) => {
                    if (l.comment_id) likedSet.add(l.comment_id);
                    else if (l.id) likedSet.add(l.id);
                });
                const flat = rows ?? [];
                if (isMounted.current) {
                    setTree(buildTree(flat, likedSet));
                    setTotal(flat.length);
                }
            } catch (err) {
                console.warn(`[Comments:${variant}] load failed:`, err);
            } finally {
                if (isMounted.current) setLoading(false);
            }
        })();
    }, [open, cardId, variant, ep.rpcList, ep.rpcLikes]);

    const handlePost = useCallback(async () => {
        const body = input.trim();
        if (!body || !user?.id || posting) return;
        setPosting(true);
        if (navigator.vibrate) navigator.vibrate(15);
        try {
            const parent_id = replyTo?.id ?? null;
            const { data: inserted, error } = await supabase
                .from(ep.table)
                .insert({ case_id: cardId, user_id: user.id, parent_id, body })
                .select("id, created_at")
                .single();
            if (error) throw error;

            const { data: profile } = await supabase
                .from("profiles")
                .select("name, avatar_url")
                .eq("user_id", user.id)
                .maybeSingle();

            const optimistic: CommentNode = {
                id: inserted!.id,
                card_id: cardId,
                user_id: user.id,
                parent_id,
                body,
                likes_count: 0,
                created_at: inserted!.created_at ?? new Date().toISOString(),
                author_name: profile?.name ?? "You",
                author_avatar: profile?.avatar_url ?? null,
                children: [],
                has_liked: false,
            };
            setTree((prev) => {
                if (!parent_id) return [...prev, optimistic];
                const clone = JSON.parse(JSON.stringify(prev)) as CommentNode[];
                const stack: CommentNode[] = [...clone];
                while (stack.length) {
                    const n = stack.pop()!;
                    if (n.id === parent_id) { n.children.push(optimistic); break; }
                    stack.push(...n.children);
                }
                return clone;
            });
            if (!isMounted.current) return;
            setInput("");
            setReplyTo(null);
            setTotal((t) => {
                const next = t + 1;
                onCountChange(next);
                return next;
            });
            playSound("tap-correct", false);
        } catch (err) {
            console.warn(`[Comments:${variant}] post failed:`, err);
        } finally {
            if (isMounted.current) setPosting(false);
        }
    }, [input, user?.id, posting, replyTo, cardId, onCountChange, variant, ep.table]);

    const handleLikeComment = useCallback(
        async (comment: CommentNode) => {
            if (!user?.id) return;
            if (navigator.vibrate) navigator.vibrate(10);
            const wasLiked = comment.has_liked;
            const delta = wasLiked ? -1 : 1;
            setTree((prev) => {
                const clone = JSON.parse(JSON.stringify(prev)) as CommentNode[];
                const stack: CommentNode[] = [...clone];
                while (stack.length) {
                    const n = stack.pop()!;
                    if (n.id === comment.id) {
                        n.has_liked = !wasLiked;
                        n.likes_count = Math.max(0, n.likes_count + delta);
                        break;
                    }
                    stack.push(...n.children);
                }
                return clone;
            });
            try {
                if (wasLiked) {
                    await supabase
                        .from(ep.likesTable)
                        .delete()
                        .match({ comment_id: comment.id, user_id: user.id });
                } else {
                    await supabase
                        .from(ep.likesTable)
                        .insert({ comment_id: comment.id, user_id: user.id });
                }
            } catch (err) {
                console.warn(`[Comments:${variant}] like failed:`, err);
                setTree((prev) => {
                    const clone = JSON.parse(JSON.stringify(prev)) as CommentNode[];
                    const stack: CommentNode[] = [...clone];
                    while (stack.length) {
                        const n = stack.pop()!;
                        if (n.id === comment.id) {
                            n.has_liked = wasLiked;
                            n.likes_count = Math.max(0, n.likes_count - delta);
                            break;
                        }
                        stack.push(...n.children);
                    }
                    return clone;
                });
            }
        },
        [user?.id, variant, ep.likesTable]
    );

    const handleDelete = useCallback(
        async (comment: CommentNode) => {
            if (!user?.id || comment.user_id !== user.id) return;
            if (!confirm("Delete this comment?")) return;
            try {
                await supabase
                    .from(ep.table)
                    .update({ is_deleted: true })
                    .eq("id", comment.id);
                setTree((prev) => {
                    const filter = (nodes: CommentNode[]): CommentNode[] =>
                        nodes.filter((n) => n.id !== comment.id)
                            .map((n) => ({ ...n, children: filter(n.children) }));
                    return filter(prev);
                });
                setTotal((t) => {
                    const next = Math.max(0, t - 1);
                    onCountChange(next);
                    return next;
                });
            } catch (err) {
                console.warn(`[Comments:${variant}] delete failed:`, err);
            }
        },
        [user?.id, onCountChange, variant, ep.table]
    );

    const handleSaveEdit = useCallback(
        async (comment: CommentNode, newBody: string) => {
            if (!user?.id || comment.user_id !== user.id) return false;
            const trimmed = newBody.trim();
            if (!trimmed) return false;
            if (trimmed === comment.body) return true;

            setTree((prev) => {
                const clone = JSON.parse(JSON.stringify(prev)) as CommentNode[];
                const stack: CommentNode[] = [...clone];
                while (stack.length) {
                    const n = stack.pop()!;
                    if (n.id === comment.id) {
                        n.body = trimmed;
                        n.updated_at = new Date().toISOString();
                        break;
                    }
                    stack.push(...n.children);
                }
                return clone;
            });

            try {
                const { error } = await supabase
                    .from(ep.table)
                    .update({ body: trimmed })
                    .eq("id", comment.id)
                    .eq("user_id", user.id);
                if (error) throw error;
                if (navigator.vibrate) navigator.vibrate(12);
                return true;
            } catch (err) {
                console.warn(`[Comments:${variant}] edit failed:`, err);
                setTree((prev) => {
                    const clone = JSON.parse(JSON.stringify(prev)) as CommentNode[];
                    const stack: CommentNode[] = [...clone];
                    while (stack.length) {
                        const n = stack.pop()!;
                        if (n.id === comment.id) {
                            n.body = comment.body;
                            n.updated_at = comment.updated_at;
                            break;
                        }
                        stack.push(...n.children);
                    }
                    return clone;
                });
                return false;
            }
        },
        [user?.id, variant, ep.table]
    );

    const startReply = useCallback((comment: CommentNode) => {
        setReplyTo(comment);
        requestAnimationFrame(() => inputRef.current?.focus());
    }, []);

    return (
        <div className="mt-1">
            <button
                type="button"
                onClick={onToggleOpen}
                className="w-full flex items-center justify-between px-2 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#161b22] active:scale-[0.99] transition-all"
            >
                <span className="flex items-center gap-2 text-[12px] font-bold text-gray-700 dark:text-[#e6edf3]">
                    <MessageCircle size={15} />
                    {total === 0 ? "Add a comment" : `${total} comment${total === 1 ? "" : "s"}`}
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-2 space-y-1.5">
                            {loading && (
                                <div className="py-4 text-center text-xs text-gray-500 dark:text-[#8b949e]">
                                    Loading comments…
                                </div>
                            )}
                            {!loading && tree.length === 0 && (
                                <div className="py-4 text-center text-xs text-gray-500 dark:text-[#8b949e]">
                                    No comments yet — be the first.
                                </div>
                            )}
                            {!loading &&
                                tree.map((c) => (
                                    <CommentRow
                                        key={c.id}
                                        node={c}
                                        depth={0}
                                        user={user}
                                        onReply={startReply}
                                        onLike={handleLikeComment}
                                        onDelete={handleDelete}
                                        onSaveEdit={handleSaveEdit}
                                    />
                                ))}

                            {replyTo && (
                                <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-blue-50 dark:bg-[#0d1c2e]">
                                    <p className="text-[11px] text-blue-700 dark:text-blue-300">
                                        Replying to <b>{replyTo.author_name}</b>
                                    </p>
                                    <button
                                        onClick={() => setReplyTo(null)}
                                        className="text-[11px] text-gray-500 hover:text-gray-700 dark:text-[#8b949e] dark:hover:text-[#e6edf3]"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}

                            {user?.id && (
                                <div className="flex gap-2 items-end pt-1">
                                    <textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handlePost();
                                            }
                                        }}
                                        placeholder={replyTo ? `Reply to ${replyTo.author_name}…` : "Write a comment…"}
                                        rows={1}
                                        className="flex-1 resize-none bg-gray-100 dark:bg-[#161b22] border-0 rounded-xl px-3 py-2 text-[13px] text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 dark:placeholder:text-[#8b949e] outline-none focus:ring-2 focus:ring-blue-500 max-h-32"
                                    />
                                    <button
                                        onClick={handlePost}
                                        disabled={!input.trim() || posting}
                                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white p-2 rounded-xl flex items-center justify-center min-w-[38px] min-h-[38px] active:scale-95 transition-all"
                                        aria-label="Post comment"
                                    >
                                        <Send size={15} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── One row (recursive, with inline edit) ───────────────────
function CommentRow({
    node, depth, user, onReply, onLike, onDelete, onSaveEdit,
}: {
    node: CommentNode;
    depth: number;
    user: any;
    onReply: (c: CommentNode) => void;
    onLike: (c: CommentNode) => void;
    onDelete: (c: CommentNode) => void;
    onSaveEdit: (c: CommentNode, newBody: string) => Promise<boolean>;
}) {
    const isMine = user?.id && node.user_id === user.id;
    const maxDepth = 4;
    const indent = Math.min(depth, maxDepth) * 14;
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(node.body);
    const [saving, setSaving] = useState(false);
    const editRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (editing && editRef.current) {
            editRef.current.focus();
            const len = editRef.current.value.length;
            editRef.current.setSelectionRange(len, len);
        }
    }, [editing]);

    useEffect(() => {
        if (!editing) setDraft(node.body);
    }, [node.body, editing]);

    const isEdited =
        node.updated_at &&
        new Date(node.updated_at).getTime() - new Date(node.created_at).getTime() > 2000;

    return (
        <div>
            <div className="flex gap-2 items-start" style={{ marginLeft: indent }}>
                <img
                    src={node.author_avatar || "/UsersAvatar.jpg"}
                    alt={node.author_name}
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                    loading="lazy"
                />
                <div className="flex-1 min-w-0">
                    {editing ? (
                        <div className="bg-gray-100 dark:bg-[#161b22] rounded-xl px-2.5 py-1.5">
                            <div className="flex items-center gap-1.5 mb-1">
                                <p className="text-[11px] font-bold text-gray-900 dark:text-[#e6edf3] truncate">
                                    {node.author_name}
                                </p>
                                <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold">
                                    editing
                                </span>
                            </div>
                            <textarea
                                ref={editRef}
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Escape") { e.preventDefault(); setEditing(false); setDraft(node.body); }
                                    else if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        (async () => {
                                            if (saving) return;
                                            setSaving(true);
                                            const ok = await onSaveEdit(node, draft);
                                            setSaving(false);
                                            if (ok) setEditing(false);
                                        })();
                                    }
                                }}
                                rows={2}
                                className="w-full resize-none bg-transparent border-0 outline-none text-[13px] text-gray-900 dark:text-[#e6edf3] leading-snug max-h-40"
                                style={{ minHeight: 40 }}
                            />
                            <div className="flex items-center justify-end gap-1.5 mt-1 pt-1 border-t border-gray-200/60 dark:border-[#30363d]">
                                <button
                                    onClick={() => { setEditing(false); setDraft(node.body); }}
                                    disabled={saving}
                                    className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-gray-700 dark:text-[#8b949e] dark:hover:text-[#e6edf3] px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-[#21262d] active:scale-95 transition-all disabled:opacity-50"
                                >
                                    <X size={11} />
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        if (saving) return;
                                        setSaving(true);
                                        const ok = await onSaveEdit(node, draft);
                                        setSaving(false);
                                        if (ok) setEditing(false);
                                    }}
                                    disabled={saving || !draft.trim() || draft.trim() === node.body}
                                    className="flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded-md active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Check size={11} />
                                    {saving ? "Saving…" : "Save"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-100 dark:bg-[#161b22] rounded-xl px-2.5 py-1.5">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <p className="text-[11px] font-bold text-gray-900 dark:text-[#e6edf3] truncate">
                                    {node.author_name}
                                </p>
                                <span className="text-[9px] text-gray-500 dark:text-[#8b949e] flex-shrink-0">
                                    {new Date(node.created_at).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                    })}
                                </span>
                                {isEdited && (
                                    <span className="text-[9px] text-gray-400 dark:text-[#8b949e] italic flex-shrink-0">
                                        · edited
                                    </span>
                                )}
                            </div>
                            <p className="text-[13px] text-gray-800 dark:text-[#e6edf3] break-words whitespace-pre-wrap">
                                {node.body}
                            </p>
                        </div>
                    )}

                    {!editing && (
                        <div className="flex items-center gap-3 mt-1 ml-1">
                            <button
                                onClick={() => onLike(node)}
                                className={`flex items-center gap-1 text-[10px] font-bold transition-colors ${node.has_liked
                                    ? "text-rose-500"
                                    : "text-gray-500 hover:text-rose-500 dark:text-[#8b949e] dark:hover:text-rose-400"
                                    }`}
                            >
                                <Heart size={11} fill={node.has_liked ? "currentColor" : "none"} />
                                {node.likes_count > 0 && node.likes_count}
                            </button>
                            <button
                                onClick={() => onReply(node)}
                                className="flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-blue-600 dark:text-[#8b949e] dark:hover:text-blue-400 transition-colors"
                            >
                                <CornerDownRight size={11} />
                                Reply
                            </button>
                            {isMine && (
                                <>
                                    <button
                                        onClick={() => { setDraft(node.body); setEditing(true); }}
                                        className="flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-blue-600 dark:text-[#8b949e] dark:hover:text-blue-400 transition-colors"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        onClick={() => onDelete(node)}
                                        className="flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-red-600 dark:text-[#8b949e] dark:hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 size={11} />
                                        Delete
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {node.children.length > 0 && (
                <div className="mt-1.5 space-y-1.5">
                    {node.children.map((child) => (
                        <CommentRow
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            user={user}
                            onReply={onReply}
                            onLike={onLike}
                            onDelete={onDelete}
                            onSaveEdit={onSaveEdit}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}