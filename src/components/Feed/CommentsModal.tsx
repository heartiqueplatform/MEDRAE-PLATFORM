"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Reply, ThumbsUp, X, Trash2, MoreVertical } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Cache for question details (prevents re-fetching)
const questionDetailsCache = new Map();

type Props = {
    activeQuestion: any;
    setActiveQuestion: (val: any) => void;
    questions: any[];
    comments: any[];
    user: any;
    replyTo: any;
    setReplyTo: (val: any) => void;
    toggleCommentLike: (id: any) => void;
    newComment: string;
    setNewComment: (val: string) => void;
    addComment: () => void;
    deleteComment: (commentId: string) => Promise<void>;
};

// Memoized option component to prevent re-renders
const OptionItem = React.memo(({ opt, text, isCorrect }: { opt: string; text: string; isCorrect: boolean }) => {
    if (!text) return null;

    return (
        <div
            className={`
                p-3 rounded-lg
                transition-all duration-200
                ${isCorrect
                    ? 'bg-green-100 dark:bg-green-950/30 border-l-4 border-green-500'
                    : 'bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-800'
                }
            `}
        >
            <div className="flex items-start gap-2">
                <span className={`
                    font-bold text-sm px-2 py-0.5 rounded
                    ${isCorrect
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }
                `}>
                    {opt}
                </span>
                <span className="text-gray-700 dark:text-gray-300 flex-1 break-words">
                    {text}
                </span>
                {isCorrect && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium flex-shrink-0">
                        ✓ Correct
                    </span>
                )}
            </div>
        </div>
    );
});

OptionItem.displayName = 'OptionItem';

// Memoized comment component
const CommentItem = React.memo(({
    comment,
    user,
    onReply,
    onLike,
    onDelete,
    isDeleting
}: {
    comment: any;
    user: any;
    onReply: (id: string) => void;
    onLike: (id: string) => void;
    onDelete: (id: string) => void;
    isDeleting: boolean;
}) => {
    const isReply = !!comment.parent_id;
    const liked = comment.comment_likes?.some((l: any) => l.user_id === user?.id);
    const isFailed = comment.error;
    const isOwner = user?.id === comment.user_id;

    if (comment.is_deleted) return null;

    return (
        <div
            className={`
                flex items-start gap-3
                transition-all duration-200
                hover:bg-gray-50 dark:hover:bg-gray-800/30
                rounded-lg p-2 group
                ${isReply ? "ml-6 md:ml-8 pl-3 border-l-2 border-gray-200 dark:border-gray-700" : ""}
                ${isFailed ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800" : ""}
            `}
        >
            <img
                src={comment.profiles?.avatar_url || "/UsersAvatar.jpg"}
                alt={comment.profiles?.name || "User"}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700 flex-shrink-0"
                loading="lazy"
            />

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                            {comment.profiles?.name || "Anonymous"}
                            {comment.isOptimistic && (
                                <span className="ml-2 text-xs text-blue-500 animate-pulse">
                                    Sending...
                                </span>
                            )}
                            {isFailed && (
                                <span className="ml-2 text-xs text-red-500">
                                    Failed - Click to retry
                                </span>
                            )}
                        </p>
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                            {new Date(comment.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>

                    {isOwner && !comment.isOptimistic && !isFailed && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex-shrink-0"
                                    aria-label="Comment actions"
                                >
                                    <MoreVertical size={14} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                                <DropdownMenuItem
                                    onClick={() => onDelete(comment.id)}
                                    className="text-red-600 focus:text-red-600"
                                    disabled={isDeleting}
                                >
                                    <Trash2 size={14} className="mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                <p className="text-gray-700 dark:text-gray-300 text-sm mt-1 break-words">
                    {comment.comment_text}
                </p>

                {!comment.isOptimistic && !isFailed && (
                    <div className="flex gap-4 text-xs mt-2">
                        <button
                            className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                            onClick={() => onReply(comment.id)}
                            aria-label="Reply to comment"
                        >
                            <Reply size={14} />
                            <span>Reply</span>
                        </button>

                        <button
                            className="flex items-center gap-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                            onClick={() => onLike(comment.id)}
                            aria-label={liked ? "Unlike comment" : "Like comment"}
                        >
                            {liked ? (
                                <span className="text-red-500">❤️</span>
                            ) : (
                                <ThumbsUp size={14} />
                            )}
                            <span>{comment.comment_likes?.length || 0}</span>
                        </button>
                    </div>
                )}

                {isFailed && (
                    <button
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('retryComment', { detail: comment }));
                        }}
                        className="text-xs text-red-500 hover:text-red-600 mt-1"
                    >
                        Click to retry
                    </button>
                )}
            </div>
        </div>
    );
});

CommentItem.displayName = 'CommentItem';

export default function CommentsModal({
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
}: Props) {
    // Get the current question - memoized to prevent unnecessary recalculations
    const currentQuestion = useMemo(() =>
        questions.find((q) => q.id === activeQuestion),
        [questions, activeQuestion]
    );

    // Local state for optimistic comment updates
    const [optimisticComments, setOptimisticComments] = useState<any[]>([]);
    const [isAddingOptimistic, setIsAddingOptimistic] = useState(false);
    const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const isMounted = useRef(true);

    // Combine real comments with optimistic ones
    const displayComments = useMemo(() => {
        if (optimisticComments.length === 0) return comments;
        const existingIds = new Set(comments.map(c => c.id));
        const newOptimistic = optimisticComments.filter(c => !existingIds.has(c.id));
        return [...comments, ...newOptimistic];
    }, [comments, optimisticComments]);

    // Filter out deleted comments
    const visibleComments = useMemo(() => {
        return displayComments.filter(comment => !comment.is_deleted);
    }, [displayComments]);

    // Reset optimistic comments when modal closes
    useEffect(() => {
        if (!activeQuestion) {
            setOptimisticComments([]);
            setIsAddingOptimistic(false);
            setDeletingCommentId(null);
        }
    }, [activeQuestion]);

    // Cleanup on unmount
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Retry comment handler
    useEffect(() => {
        const handleRetry = (event: CustomEvent) => {
            const failedComment = event.detail;
            setOptimisticComments(prev => prev.filter(c => c.id !== failedComment.id));
            setNewComment(failedComment.comment_text);
            if (failedComment.parent_id) setReplyTo(failedComment.parent_id);
        };

        window.addEventListener('retryComment', handleRetry as EventListener);
        return () => window.removeEventListener('retryComment', handleRetry as EventListener);
    }, [setNewComment, setReplyTo]);

    // Wrapper for addComment with optimistic update
    const handleAddComment = useCallback(async () => {
        if (!newComment.trim() || !user || !activeQuestion || isAddingOptimistic) return;

        // Create optimistic comment
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const optimisticComment = {
            id: tempId,
            comment_text: newComment,
            created_at: new Date().toISOString(),
            user_id: user.id,
            parent_id: replyTo || null,
            profiles: {
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || "User",
                avatar_url: user.user_metadata?.avatar_url || "/UsersAvatar.jpg"
            },
            comment_likes: [],
            isOptimistic: true,
            is_deleted: false
        };

        // Add optimistic comment to UI immediately
        setOptimisticComments(prev => [...prev, optimisticComment]);
        setIsAddingOptimistic(true);

        // Store current input and reply state
        const currentComment = newComment;
        const currentReplyTo = replyTo;

        // Clear input immediately for better UX
        setNewComment("");
        if (replyTo) setReplyTo(null);

        try {
            // Call the actual addComment function
            await addComment();

            // Remove optimistic comment after successful addition
            setOptimisticComments(prev => prev.filter(c => c.id !== tempId));
        } catch (error) {
            // On error, keep the optimistic comment but mark it as failed
            console.error("Failed to add comment:", error);
            setOptimisticComments(prev =>
                prev.map(c =>
                    c.id === tempId
                        ? { ...c, error: true, comment_text: currentComment }
                        : c
                )
            );

            // Restore input on error
            setNewComment(currentComment);
            if (currentReplyTo) setReplyTo(currentReplyTo);

            // Remove failed optimistic comment after 5 seconds (increased from 3)
            setTimeout(() => {
                if (isMounted.current) {
                    setOptimisticComments(prev => prev.filter(c => c.id !== tempId));
                }
            }, 5000);
        } finally {
            setIsAddingOptimistic(false);
        }
    }, [newComment, user, activeQuestion, replyTo, addComment, setNewComment, setReplyTo, isAddingOptimistic]);

    // Handle delete comment
    const handleDeleteComment = useCallback(async (commentId: string) => {
        if (!user) return;

        setIsDeleting(true);
        try {
            await deleteComment(commentId);
            setDeletingCommentId(null);
        } catch (error) {
            console.error("Failed to delete comment:", error);
            alert("Failed to delete comment. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    }, [deleteComment, user]);

    // Handle keyboard shortcut
    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newComment.trim() && !e.shiftKey && !isAddingOptimistic) {
            e.preventDefault();
            handleAddComment();
        }
    }, [newComment, handleAddComment, isAddingOptimistic]);

    // Memoize the options list
    const optionsList = useMemo(() => {
        if (!currentQuestion) return null;
        return ["A", "B", "C", "D"].map((opt) => {
            const text = currentQuestion[`option_${opt.toLowerCase()}`];
            if (!text) return null;
            return (
                <OptionItem
                    key={opt}
                    opt={opt}
                    text={text}
                    isCorrect={currentQuestion.correct_answer === opt}
                />
            );
        }).filter(Boolean);
    }, [currentQuestion]);

    // Memoize the comments list
    const commentsList = useMemo(() => {
        if (visibleComments.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center py-10 md:py-12">
                    <div className="w-14 h-14 md:w-16 md:h-16 mb-3 md:mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <svg className="w-7 h-7 md:w-8 md:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium text-sm md:text-base">No comments yet</p>
                    <p className="text-xs md:text-sm text-gray-400 dark:text-gray-500 mt-1">Be the first to start the discussion</p>
                </div>
            );
        }

        return visibleComments.map((c) => (
            <CommentItem
                key={c.id}
                comment={c}
                user={user}
                onReply={setReplyTo}
                onLike={toggleCommentLike}
                onDelete={setDeletingCommentId}
                isDeleting={isDeleting && deletingCommentId === c.id}
            />
        ));
    }, [visibleComments, user, setReplyTo, toggleCommentLike, isDeleting, deletingCommentId]);

    if (!activeQuestion) return null;

    return (
        <>
            <Dialog
                open={!!activeQuestion}
                onOpenChange={() => {
                    setActiveQuestion(null);
                    setReplyTo(null);
                    setOptimisticComments([]);
                    setIsAddingOptimistic(false);
                    setDeletingCommentId(null);
                }}
            >
                <DialogContent
                    className="w-full md:w-[90vw] lg:w-[85vw] xl:w-[80vw] max-w-7xl h-[100dvh] md:h-[85vh] p-0 overflow-hidden bg-white dark:bg-zinc-900 rounded-none md:rounded-xl shadow-2xl border-0"
                    aria-describedby={undefined}
                >
                    {/* Drag handle for mobile */}
                    <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
                        <div className="w-8 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between p-3 md:p-4 border-b dark:border-gray-800 bg-white dark:bg-zinc-900 flex-shrink-0">
                        <DialogHeader className="p-0">
                            <DialogTitle className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                {replyTo ? "Reply to Comment" : "Discussion"}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                View and post comments on this question. Replies appear indented under parent comments.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
                        {/* LEFT SIDE - QUESTION PANEL */}
                        <div className="w-full md:w-1/2 lg:w-2/5 border-b md:border-b-0 md:border-r dark:border-gray-800 overflow-y-auto custom-scrollbar p-3 md:p-5 max-h-[35vh] md:max-h-full bg-gray-50/50 dark:bg-zinc-800/30 flex-shrink-0">
                            {currentQuestion && (
                                <div className="space-y-4 md:space-y-5">
                                    {/* Quiz Title Badge */}
                                    <div className="inline-block">
                                        <span className="text-[10px] md:text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/50 px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                                            {currentQuestion.quiz_title}
                                        </span>
                                    </div>

                                    {/* Question Text */}
                                    <p className="text-sm md:text-base lg:text-lg font-bold text-gray-900 dark:text-gray-100 leading-relaxed">
                                        {currentQuestion.question_text}
                                    </p>

                                    {/* Options Grid */}
                                    <div className="flex flex-col gap-2 md:gap-2.5">
                                        <p className="text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                            Answer Options
                                        </p>
                                        {optionsList}
                                    </div>

                                    {/* Correct Answer Highlight */}
                                    <div className="mt-3 md:mt-4 p-2.5 md:p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                                        <p className="text-[10px] md:text-xs font-semibold text-blue-600 dark:text-blue-400 mb-0.5 md:mb-1">
                                            💡 Correct Answer
                                        </p>
                                        <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 break-words">
                                            <span className="font-bold">{currentQuestion.correct_answer}.</span>{' '}
                                            {currentQuestion[`option_${currentQuestion.correct_answer.toLowerCase()}`]}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT SIDE - COMMENTS PANEL */}
                        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900">
                            {/* Reply Indicator Bar */}
                            {replyTo && (
                                <div className="flex items-center justify-between px-3 md:px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border-b dark:border-gray-800 flex-shrink-0">
                                    <p className="text-xs md:text-sm text-blue-600 dark:text-blue-400">
                                        Replying to comment
                                    </p>
                                    <button
                                        onClick={() => setReplyTo(null)}
                                        className="text-[10px] md:text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                                        aria-label="Cancel reply"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}

                            {/* Comments List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 space-y-3 md:space-y-4">
                                {commentsList}
                            </div>

                            {/* Comment Input Section */}
                            <div className="border-t dark:border-gray-800 p-3 md:p-4 bg-white dark:bg-zinc-900 flex-shrink-0">
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <Input
                                            placeholder={replyTo ? "Write your reply..." : "Write a comment..."}
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            disabled={isAddingOptimistic}
                                            className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-xl py-2 md:py-2.5 text-xs md:text-sm"
                                            aria-label="Comment input"
                                        />
                                        {replyTo && (
                                            <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Replying to comment • <button
                                                    onClick={() => setReplyTo(null)}
                                                    className="text-blue-600 hover:underline transition-colors"
                                                    aria-label="Cancel reply"
                                                >
                                                    Cancel reply
                                                </button>
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        onClick={handleAddComment}
                                        disabled={!newComment.trim() || isAddingOptimistic}
                                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl px-4 md:px-5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm h-9 md:h-10 flex-shrink-0"
                                        aria-label="Post comment"
                                    >
                                        {isAddingOptimistic ? "Sending..." : "Post"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingCommentId} onOpenChange={() => setDeletingCommentId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                Are you sure you want to delete this comment? This action cannot be undone.

                                {deletingCommentId && (
                                    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded max-h-32 overflow-y-auto">
                                        <div className="text-sm text-gray-600 dark:text-gray-400 break-words">
                                            {visibleComments.find(c => c.id === deletingCommentId)?.comment_text}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deletingCommentId && handleDeleteComment(deletingCommentId)}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}