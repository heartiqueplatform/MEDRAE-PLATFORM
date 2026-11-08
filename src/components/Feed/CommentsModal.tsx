"use client";

import React, {
    useMemo,
    useState,
    useEffect,
    useCallback,
    useRef,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Send,
    Trash2,
    CornerDownRight,
    Heart,
    Check,
    ChevronDown,
    MessageCircle,
} from "lucide-react";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { supabase } from "@/lib/supabaseClient";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type Variant = "question" | "image";

type CommentRow = {
    id: string;
    body: string;            // normalized text (mapped from comment_text OR content)
    created_at: string;
    updated_at?: string;
    user_id: string;
    parent_id: string | null;
    profiles?: { name?: string; avatar_url?: string } | null;
    comment_likes?: { user_id: string }[];
    isOptimistic?: boolean;
    error?: boolean;
    is_deleted?: boolean;
};

type CommentNode = CommentRow & {
    children: CommentNode[];
    has_liked: boolean;
};

type Props = {
    variant?: Variant;
    /** ID of the question or image */
    entityId?: string;
    /** Optional content shown ONLY on desktop, to the left of the comments. */
    leftPanel?: React.ReactNode;


    // Legacy props (used by Feed.tsx for questions)
    activeQuestion?: any;
    setActiveQuestion?: (val: any) => void;
    questions?: any[];
    comments: any[];
    user: any;
    replyTo: any;
    setReplyTo: (val: any) => void;
    toggleCommentLike: (id: any) => void;
    newComment: string;
    setNewComment: (val: string) => void;
    addComment: () => void;
    deleteComment?: (commentId: string) => Promise<void>;
};

// ═══════════════════════════════════════════════════════════════
// VARIANT CONFIG
// ═══════════════════════════════════════════════════════════════

const VARIANTS = {
    question: {
        table: "qfeed_comments",
        textColumn: "comment_text" as const,
        parentColumn: "question_id" as const,
        likesTable: "qfeed_comment_likes" as const,
    },
    image: {
        table: "qfeed_images_comments",
        textColumn: "content" as const,
        parentColumn: "image_id" as const,
        likesTable: "qfeed_images_comment_likes" as const,
    },
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function normalize(raw: any, textKey: "comment_text" | "content"): CommentRow {
    return {
        id: raw.id,
        body: raw[textKey] ?? raw.body ?? "",
        created_at: raw.created_at,
        updated_at: raw.updated_at,
        user_id: raw.user_id,
        parent_id: raw.parent_id ?? null,
        profiles: raw.profiles ?? null,
        comment_likes: raw.comment_likes ?? [],
        isOptimistic: raw.isOptimistic,
        error: raw.error,
        is_deleted: raw.is_deleted,
    };
}

function buildTree(flat: CommentRow[], currentUserId?: string): CommentNode[] {
    const byId = new Map<string, CommentNode>();
    for (const c of flat) {
        if (c.is_deleted) continue;
        byId.set(c.id, {
            ...c,
            children: [],
            has_liked: !!c.comment_likes?.some((l) => l.user_id === currentUserId),
        });
    }
    const roots: CommentNode[] = [];
    for (const node of byId.values()) {
        if (node.parent_id && byId.has(node.parent_id)) {
            byId.get(node.parent_id)!.children.push(node);
        } else {
            roots.push(node);
        }
    }
    const sortRec = (nodes: CommentNode[]) => {
        nodes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        nodes.forEach((n) => sortRec(n.children));
    };
    sortRec(roots);
    return roots;
}

function countDescendants(node: CommentNode): number {
    let n = node.children.length;
    for (const c of node.children) n += countDescendants(c);
    return n;
}

const MAX_VISUAL_DEPTH = 4;

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function CommentsModal({
    variant = "question",
    entityId,
    activeQuestion,
    setActiveQuestion,
    questions,
    comments,
    user,
    replyTo,
    setReplyTo,
    toggleCommentLike,
    newComment,
    setNewComment,
    addComment,
    deleteComment,
    leftPanel,
}: Props) {
    const cfg = VARIANTS[variant];
    const isOpen = variant === "image" ? !!entityId : !!activeQuestion;
    const currentQuestion = useMemo(
        () => questions?.find((q) => q.id === activeQuestion),
        [questions, activeQuestion]
    );

    const [optimisticComments, setOptimisticComments] = useState<CommentRow[]>([]);
    const [isAddingOptimistic, setIsAddingOptimistic] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState("");
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [likeMap, setLikeMap] = useState<Record<string, boolean>>({});
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const isMounted = useRef(true);

    // Mobile detection
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setOptimisticComments([]);
            setIsAddingOptimistic(false);
            setEditingCommentId(null);
            setEditDraft("");
            setDeletingId(null);
        }
    }, [isOpen]);

    // Retry failed
    useEffect(() => {
        const handler = (event: CustomEvent) => {
            const failed = event.detail;
            setOptimisticComments((prev) => prev.filter((c) => c.id !== failed.id));
            setNewComment(failed.body ?? failed.comment_text ?? "");
            if (failed.parent_id) setReplyTo(failed.parent_id);
        };
        window.addEventListener("retryComment", handler as EventListener);
        return () => window.removeEventListener("retryComment", handler as EventListener);
    }, [setNewComment, setReplyTo]);

    // ── Build tree from parent-supplied comments ──────────
    const tree = useMemo(() => {
        const normalized: CommentRow[] = comments.map((c) =>
            normalize(
                {
                    ...c,
                    comment_likes: likeMap[c.id] !== undefined
                        ? c.comment_likes // let parent keep source of truth, or fallback below
                        : c.comment_likes,
                },
                cfg.textColumn
            )
        );
        const optimistic: CommentRow[] = optimisticComments;
        const merged = [
            ...normalized,
            ...optimistic.filter((o) => !normalized.some((c) => c.id === o.id)),
        ];
        const tree0 = buildTree(merged, user?.id);
        // Apply local likeMap overrides
        const applyLike = (nodes: CommentNode[]) => {
            nodes.forEach((n) => {
                if (likeMap[n.id] !== undefined) n.has_liked = likeMap[n.id];
                applyLike(n.children);
            });
        };
        applyLike(tree0);
        return tree0;
    }, [comments, optimisticComments, user?.id, cfg.textColumn, likeMap]);

    const totalCount = useMemo(() => {
        const count = (nodes: CommentNode[]): number =>
            nodes.reduce((s, n) => s + 1 + count(n.children), 0);
        return count(tree);
    }, [tree]);

    // ── Add ─────────────────────────────────────────────
    const handleAddComment = useCallback(async () => {
        if (!newComment.trim() || !user || !isOpen || isAddingOptimistic) return;

        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const optimistic: CommentRow = {
            id: tempId,
            body: newComment,
            created_at: new Date().toISOString(),
            user_id: user.id,
            parent_id: replyTo || null,
            profiles: {
                name: user.user_metadata?.full_name || user.email?.split("@")[0] || "You",
                avatar_url: user.user_metadata?.avatar_url || "/UsersAvatar.jpg",
            },
            comment_likes: [],
            isOptimistic: true,
        };

        setOptimisticComments((prev) => [...prev, optimistic]);
        setIsAddingOptimistic(true);

        const savedText = newComment;
        const savedReplyTo = replyTo;
        setNewComment("");
        if (replyTo) setReplyTo(null);
        if (navigator.vibrate) navigator.vibrate(15);

        try {
            await addComment();
            if (isMounted.current) {
                setOptimisticComments((prev) => prev.filter((c) => c.id !== tempId));
            }
        } catch (err) {
            console.error("Failed to add comment:", err);
            if (!isMounted.current) return;
            setOptimisticComments((prev) =>
                prev.map((c) =>
                    c.id === tempId ? { ...c, error: true, body: savedText } : c
                )
            );
            setNewComment(savedText);
            if (savedReplyTo) setReplyTo(savedReplyTo);
            setTimeout(() => {
                if (isMounted.current) {
                    setOptimisticComments((prev) => prev.filter((c) => c.id !== tempId));
                }
            }, 5000);
        } finally {
            if (isMounted.current) setIsAddingOptimistic(false);
        }
    }, [newComment, user, isOpen, replyTo, addComment, setNewComment, setReplyTo, isAddingOptimistic]);

    // ── Edit ────────────────────────────────────────────
    const handleSaveEdit = useCallback(
        async (comment: CommentNode) => {
            if (!user?.id || comment.user_id !== user.id) return false;
            const trimmed = editDraft.trim();
            if (!trimmed) return false;
            if (trimmed === comment.body) {
                setEditingCommentId(null);
                return true;
            }
            setIsSavingEdit(true);
            try {
                const { error } = await supabase
                    .from(cfg.table)
                    .update({ [cfg.textColumn]: trimmed })
                    .eq("id", comment.id)
                    .eq("user_id", user.id);
                if (error) throw error;
                if (navigator.vibrate) navigator.vibrate(12);
                setEditingCommentId(null);
                setEditDraft("");
                return true;
            } catch (err) {
                console.warn("[CommentsModal] edit failed:", err);
                return false;
            } finally {
                if (isMounted.current) setIsSavingEdit(false);
            }
        },
        [editDraft, user?.id, cfg.table, cfg.textColumn]
    );

    // ── Delete ──────────────────────────────────────────
    const handleDeleteTwoStep = useCallback(
        async (comment: CommentNode) => {
            if (!user?.id || comment.user_id !== user.id) return;
            if (deletingId !== comment.id) {
                setDeletingId(comment.id);
                setTimeout(() => {
                    setDeletingId((cur) => (cur === comment.id ? null : cur));
                }, 4000);
                return;
            }
            try {
                if (deleteComment) {
                    await deleteComment(comment.id);
                } else {
                    // Direct write when no parent callback
                    const { error } = await supabase
                        .from(cfg.table)
                        .update({ is_deleted: true })
                        .eq("id", comment.id)
                        .eq("user_id", user.id);
                    if (error) throw error;
                }
                setDeletingId(null);
            } catch (err) {
                console.warn("[CommentsModal] delete failed:", err);
            }
        },
        [user?.id, deletingId, deleteComment, cfg.table]
    );

    // ── Like (image variant writes directly) ────────────
    const handleLike = useCallback(
        async (commentId: string) => {
            if (!user?.id) return;
            const current = likeMap[commentId];
            const existing = tree
                .flatMap(function flatten(n): CommentNode[] {
                    return [n, ...n.children.flatMap(flatten)];
                })
                .find((c) => c.id === commentId);
            const wasLiked = current ?? existing?.has_liked ?? false;
            const next = !wasLiked;

            // Optimistic
            setLikeMap((prev) => ({ ...prev, [commentId]: next }));
            if (navigator.vibrate) navigator.vibrate(10);

            try {
                if (variant === "question" && toggleCommentLike) {
                    // Parent handles it (existing behaviour)
                    await Promise.resolve(toggleCommentLike(commentId));
                } else {
                    // Image: write directly
                    if (wasLiked) {
                        await supabase
                            .from(cfg.likesTable)
                            .delete()
                            .match({ comment_id: commentId, user_id: user.id });
                    } else {
                        await supabase
                            .from(cfg.likesTable)
                            .insert({ comment_id: commentId, user_id: user.id });
                    }
                }
            } catch (err) {
                console.warn("[CommentsModal] like failed:", err);
                setLikeMap((prev) => ({ ...prev, [commentId]: wasLiked }));
            }
        },
        [user?.id, likeMap, tree, toggleCommentLike, variant, cfg.likesTable]
    );

    // ── Close ───────────────────────────────────────────
    const handleClose = useCallback(() => {
        if (variant === "image" && setActiveQuestion) {
            setActiveQuestion(null);
        } else if (setActiveQuestion) {
            setActiveQuestion(null);
        }
        setReplyTo(null);
        setOptimisticComments([]);
        setIsAddingOptimistic(false);
        setEditingCommentId(null);
        setEditDraft("");
        setDeletingId(null);
        setLikeMap({});
    }, [setActiveQuestion, setReplyTo, variant]);

    // ── Enter key ───────────────────────────────────────
    const handleInputKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey && newComment.trim()) {
                e.preventDefault();
                handleAddComment();
            }
        },
        [newComment, handleAddComment]
    );

    if (!isOpen) return null;

    // ── Header content (compact entity summary) ─────────
    const headerBlock = variant === "question" && currentQuestion ? (
        <div className="flex-shrink-0 px-3 pt-2 pb-3 border-b border-gray-100 dark:border-[#30363d]">
            {currentQuestion.quiz_title && (
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-[#0d1c2e] px-2 py-0.5 rounded-md mb-1.5">
                    {currentQuestion.quiz_title}
                </span>
            )}
            <p className="text-[13px] font-semibold text-gray-900 dark:text-[#e6edf3] leading-snug">
                {currentQuestion.question_text}
            </p>
        </div>
    ) : null;

    const content = (
        <div className="flex flex-col h-full min-h-0">
            {headerBlock}

            <div className="flex-shrink-0 px-3 py-2 border-b border-gray-100 dark:border-[#30363d] flex items-center gap-1.5">
                <MessageCircle size={13} className="text-gray-500 dark:text-[#8b949e]" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-[#8b949e]">
                    {totalCount === 0
                        ? "No comments yet"
                        : `${totalCount} comment${totalCount === 1 ? "" : "s"}`}
                </p>
            </div>

            <div
                className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2 space-y-1"
                style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {tree.length === 0 && !isAddingOptimistic && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#161b22] flex items-center justify-center mb-2">
                            <MessageCircle size={22} className="text-gray-400 dark:text-[#8b949e]" />
                        </div>
                        <p className="text-[13px] font-bold text-gray-700 dark:text-[#e6edf3]">
                            No comments yet
                        </p>
                        <p className="text-[11.5px] text-gray-500 dark:text-[#8b949e] mt-0.5">
                            Be the first to start the discussion
                        </p>
                    </div>
                )}
                {tree.map((node) => (
                    <CommentRow
                        key={node.id}
                        node={node}
                        depth={0}
                        user={user}
                        replyTo={replyTo}
                        editingCommentId={editingCommentId}
                        editDraft={editDraft}
                        setEditDraft={setEditDraft}
                        isSavingEdit={isSavingEdit}
                        deletingId={deletingId}
                        onStartReply={(id) => {
                            setReplyTo(id);
                            requestAnimationFrame(() => inputRef.current?.focus());
                        }}
                        onLike={handleLike}
                        onStartEdit={(c) => {
                            setEditingCommentId(c.id);
                            setEditDraft(c.body);
                        }}
                        onCancelEdit={() => {
                            setEditingCommentId(null);
                            setEditDraft("");
                        }}
                        onSaveEdit={handleSaveEdit}
                        onDeleteTwoStep={handleDeleteTwoStep}
                    />
                ))}
            </div>

            <AnimatePresence>
                {replyTo && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex-shrink-0 overflow-hidden border-t border-gray-100 dark:border-[#30363d]"
                    >
                        <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-[#0d1c2e]">
                            <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 truncate">
                                Replying to{" "}
                                <b>
                                    {tree
                                        .flatMap(function flatten(n): CommentNode[] {
                                            return [n, ...n.children.flatMap(flatten)];
                                        })
                                        .find((c) => c.id === replyTo)?.profiles?.name || "comment"}
                                </b>
                            </p>
                            <button
                                onClick={() => setReplyTo(null)}
                                className="text-[11px] font-bold text-gray-500 hover:text-gray-700 dark:text-[#8b949e] dark:hover:text-[#e6edf3]"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {user?.id && (
                <div
                    className="flex-shrink-0 border-t border-gray-100 dark:border-[#30363d] p-2.5 flex gap-2 items-end bg-white dark:bg-[#0d1117]"
                    style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
                >
                    <img
                        src={user.user_metadata?.avatar_url || "/UsersAvatar.jpg"}
                        alt="You"
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <textarea
                        ref={inputRef}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder={replyTo ? "Write your reply…" : "Write a comment…"}
                        rows={1}
                        disabled={isAddingOptimistic}
                        className="flex-1 resize-none bg-gray-100 dark:bg-[#161b22] border-0 rounded-xl px-3 py-2 text-[13px] leading-snug text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 dark:placeholder:text-[#8b949e] outline-none focus:ring-2 focus:ring-blue-500 max-h-24 min-h-[38px]"
                    />
                    <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || isAddingOptimistic}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white p-2 rounded-xl flex items-center justify-center min-w-[38px] min-h-[38px] active:scale-95 transition-all flex-shrink-0"
                        aria-label="Post comment"
                    >
                        <Send size={15} />
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <>
            {isMobile ? (
                <BottomSheet
                    open={isOpen}
                    onClose={handleClose}
                    title="Discussion"
                    maxHeight="90vh"
                >
                    <div style={{ height: "calc(90vh - 44px)" }}>{content}</div>
                </BottomSheet>
            ) : (
                createPortal(
                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="fixed inset-0 z-[2147483647] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
                                onClick={handleClose}
                            >
                                <motion.div
                                    initial={{ scale: 0.96, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.96, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 320, damping: 32 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`w-full bg-white dark:bg-[#0d1117] rounded-2xl overflow-hidden flex ${leftPanel ? "max-w-6xl" : "max-w-2xl flex-col"
                                        }`}
                                    style={{ maxHeight: "85vh" }}
                                >
                                    {/* LEFT PANEL (only when provided — image preview) */}
                                    {leftPanel && (
                                        <div className="flex-1 min-w-0 bg-black flex items-center justify-center relative">
                                            {leftPanel}
                                        </div>
                                    )}

                                    {/* RIGHT SIDE: header + comments */}
                                    <div
                                        className={
                                            leftPanel
                                                ? "w-[400px] flex-shrink-0 flex flex-col min-h-0"
                                                : "flex flex-col min-h-0 flex-1"
                                        }
                                    >
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#30363d] flex-shrink-0">
                                            <h2 className="text-[15px] font-bold text-gray-900 dark:text-[#e6edf3]">
                                                Discussion
                                            </h2>
                                            <button
                                                onClick={handleClose}
                                                className="p-1.5 rounded-full bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#30363d] hover:dark:text-[#e6edf3] active:scale-95 transition"
                                                aria-label="Close"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                        {content}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )
            )}
        </>
    );
}

// ═══════════════════════════════════════════════════════════════
// CommentRow — recursive (unchanged from question variant)
// ═══════════════════════════════════════════════════════════════

function CommentRow({
    node,
    depth,
    user,
    replyTo,
    editingCommentId,
    editDraft,
    setEditDraft,
    isSavingEdit,
    deletingId,
    onStartReply,
    onLike,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onDeleteTwoStep,
}: {
    node: CommentNode;
    depth: number;
    user: any;
    replyTo: any;
    editingCommentId: string | null;
    editDraft: string;
    setEditDraft: (v: string) => void;
    isSavingEdit: boolean;
    deletingId: string | null;
    onStartReply: (id: string) => void;
    onLike: (id: string) => void;
    onStartEdit: (c: CommentNode) => void;
    onCancelEdit: () => void;
    onSaveEdit: (c: CommentNode) => Promise<boolean>;
    onDeleteTwoStep: (c: CommentNode) => void;
}) {
    const isMine = user?.id && node.user_id === user.id;
    const isReplying = replyTo === node.id;
    const isEditing = editingCommentId === node.id;
    const isDeleting = deletingId === node.id;
    const isOptimistic = !!node.isOptimistic;
    const hasError = !!node.error;

    const [showAllReplies, setShowAllReplies] = useState(false);
    const PREVIEW_COUNT = 3;
    const totalDescendants = useMemo(() => countDescendants(node), [node]);
    const hasMoreReplies = totalDescendants > PREVIEW_COUNT;
    const visibleChildren = showAllReplies ? node.children : node.children.slice(0, PREVIEW_COUNT);
    const hiddenCount = node.children.length - visibleChildren.length;
    const indent = Math.min(depth, MAX_VISUAL_DEPTH) * 16;

    return (
        <div>
            <div
                className={`flex gap-2 items-start ${isReplying ? "bg-blue-50/60 dark:bg-[#0d1c2e]/40 rounded-xl" : ""
                    } ${hasError ? "bg-red-50 dark:bg-[#241012] rounded-xl" : ""}`}
                style={{ marginLeft: indent, padding: "4px 6px" }}
            >
                <img
                    src={node.profiles?.avatar_url || "/UsersAvatar.jpg"}
                    alt={node.profiles?.name || "User"}
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                    loading="lazy"
                />
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <div className="bg-gray-100 dark:bg-[#161b22] rounded-xl px-2.5 py-1.5">
                            <div className="flex items-center gap-1.5 mb-1">
                                <p className="text-[11px] font-bold text-gray-900 dark:text-[#e6edf3] truncate">
                                    {node.profiles?.name || "You"}
                                </p>
                                <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold">
                                    editing
                                </span>
                            </div>
                            <textarea
                                value={editDraft}
                                onChange={(e) => setEditDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Escape") onCancelEdit();
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        onSaveEdit(node);
                                    }
                                }}
                                rows={2}
                                className="w-full resize-none bg-transparent border-0 outline-none text-[13px] leading-snug text-gray-900 dark:text-[#e6edf3] max-h-40"
                                autoFocus
                            />
                            <div className="flex items-center justify-end gap-1.5 mt-1 pt-1 border-t border-gray-200/60 dark:border-[#30363d]">
                                <button
                                    onClick={onCancelEdit}
                                    disabled={isSavingEdit}
                                    className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-gray-700 dark:text-[#8b949e] dark:hover:text-[#e6edf3] px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-[#21262d] active:scale-95 disabled:opacity-50"
                                >
                                    <X size={11} />
                                    Cancel
                                </button>
                                <button
                                    onClick={() => onSaveEdit(node)}
                                    disabled={isSavingEdit || !editDraft.trim() || editDraft.trim() === node.body}
                                    className="flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Check size={11} />
                                    {isSavingEdit ? "Saving…" : "Save"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-100 dark:bg-[#161b22] rounded-xl px-2.5 py-1.5">
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                <p className="text-[11px] font-bold text-gray-900 dark:text-[#e6edf3] truncate">
                                    {node.profiles?.name || "User"}
                                </p>
                                {isOptimistic && (
                                    <span className="text-[9px] text-blue-500 font-bold animate-pulse">
                                        sending…
                                    </span>
                                )}
                                {hasError && (
                                    <span className="text-[9px] text-red-500 font-bold">failed</span>
                                )}
                                <span className="text-[9px] text-gray-500 dark:text-[#8b949e] flex-shrink-0">
                                    ·{" "}
                                    {new Date(node.created_at).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                    })}
                                </span>
                            </div>
                            <p className="text-[13px] text-gray-800 dark:text-[#e6edf3] break-words whitespace-pre-wrap">
                                {node.body}
                            </p>
                        </div>
                    )}

                    {!isEditing && !isOptimistic && !hasError && (
                        <div className="flex items-center gap-3 mt-1 ml-1 flex-wrap">
                            <button
                                onClick={() => onLike(node.id)}
                                className={`flex items-center gap-1 text-[10px] font-bold transition-colors ${node.has_liked
                                    ? "text-rose-500"
                                    : "text-gray-500 hover:text-rose-500 dark:text-[#8b949e] dark:hover:text-rose-400"
                                    }`}
                            >
                                <Heart size={11} fill={node.has_liked ? "currentColor" : "none"} />
                                {(node.comment_likes?.length || 0) > 0 && node.comment_likes!.length}
                            </button>
                            <button
                                onClick={() => onStartReply(node.id)}
                                className="flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-blue-600 dark:text-[#8b949e] dark:hover:text-blue-400"
                            >
                                <CornerDownRight size={11} />
                                Reply
                            </button>
                            {isMine && (
                                <>
                                    <button
                                        onClick={() => onStartEdit(node)}
                                        className="flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-blue-600 dark:text-[#8b949e] dark:hover:text-blue-400"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        onClick={() => onDeleteTwoStep(node)}
                                        className={`flex items-center gap-1 text-[10px] font-bold transition-colors ${isDeleting
                                            ? "text-red-600 bg-red-50 dark:bg-[#241012] px-2 py-0.5 rounded-md"
                                            : "text-gray-500 hover:text-red-600 dark:text-[#8b949e] dark:hover:text-red-400"
                                            }`}
                                    >
                                        <Trash2 size={11} />
                                        {isDeleting ? "Confirm?" : "Delete"}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {hasError && (
                        <button
                            onClick={() =>
                                window.dispatchEvent(
                                    new CustomEvent("retryComment", { detail: node })
                                )
                            }
                            className="text-[10px] text-red-500 hover:text-red-600 font-bold mt-1 ml-1"
                        >
                            Click to retry
                        </button>
                    )}
                </div>
            </div>

            {node.children.length > 0 && (
                <div className="mt-1">
                    {visibleChildren.map((child) => (
                        <CommentRow
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            user={user}
                            replyTo={replyTo}
                            editingCommentId={editingCommentId}
                            editDraft={editDraft}
                            setEditDraft={setEditDraft}
                            isSavingEdit={isSavingEdit}
                            deletingId={deletingId}
                            onStartReply={onStartReply}
                            onLike={onLike}
                            onStartEdit={onStartEdit}
                            onCancelEdit={onCancelEdit}
                            onSaveEdit={onSaveEdit}
                            onDeleteTwoStep={onDeleteTwoStep}
                        />
                    ))}
                    {hasMoreReplies && !showAllReplies && (
                        <button
                            onClick={() => setShowAllReplies(true)}
                            className="flex items-center gap-1 mt-1 ml-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            style={{ marginLeft: indent + 36 }}
                        >
                            <ChevronDown size={12} />
                            Show {hiddenCount} more {hiddenCount === 1 ? "reply" : "replies"}
                        </button>
                    )}
                    {hasMoreReplies && showAllReplies && (
                        <button
                            onClick={() => setShowAllReplies(false)}
                            className="flex items-center gap-1 mt-1 ml-1 text-[11px] font-bold text-gray-500 dark:text-[#8b949e] hover:underline"
                            style={{ marginLeft: indent + 36 }}
                        >
                            <ChevronDown size={12} className="rotate-180" />
                            Show less
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}