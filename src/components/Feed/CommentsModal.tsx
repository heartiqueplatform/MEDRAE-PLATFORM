"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Reply, ThumbsUp, X } from "lucide-react";

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
};

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
}: Props) {
    // Get the current question
    const currentQuestion = questions.find((q) => q.id === activeQuestion);

    return (
        <Dialog
            open={!!activeQuestion}
            onOpenChange={() => {
                setActiveQuestion(null);
                setReplyTo(null);
            }}
        >
            <DialogContent
                className="
                    w-[95vw]
                    md:w-[90vw]
                    lg:w-[85vw]
                    xl:w-[80vw]
                    max-w-7xl
                    h-[90vh]
                    md:h-[85vh]
                    p-0
                    overflow-hidden
                    bg-white dark:bg-muted/95
                    rounded-xl
                    shadow-2xl
                "
                aria-describedby="comments-dialog-description"
            >
                {/* Header with close button */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-800 bg-white dark:bg-muted/30">
                    <DialogHeader className="p-0">
                        <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {replyTo ? "Reply to Comment" : "Discussion"}
                        </DialogTitle>
                    </DialogHeader>
                    <button
                        onClick={() => {
                            setActiveQuestion(null);
                            setReplyTo(null);
                        }}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X size={20} className="text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <p id="comments-dialog-description" className="sr-only">
                    View and post comments on this question. Replies appear indented under parent comments.
                </p>

                <div className="flex flex-col md:flex-row h-full overflow-hidden">
                    {/* LEFT SIDE - QUESTION PANEL */}
                    <div className="
                        w-full
                        md:w-1/2
                        lg:w-2/5
                        border-b
                        md:border-b-0
                        md:border-r
                        dark:border-gray-800
                        overflow-y-auto
                        custom-scrollbar
                        p-4
                        md:p-5
                        max-h-[40vh]
                        md:max-h-full
                        bg-gray-50/50
                        dark:bg-muted/20
                    ">
                        {currentQuestion && (
                            <div className="space-y-5">
                                {/* Quiz Title Badge */}
                                <div className="inline-block">
                                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/50 px-3 py-1 rounded-full">
                                        {currentQuestion.quiz_title}
                                    </span>
                                </div>

                                {/* Question Text */}
                                <p className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 leading-relaxed">
                                    {currentQuestion.question_text}
                                </p>

                                {/* Options Grid */}
                                <div className="flex flex-col gap-2.5">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        Answer Options
                                    </p>
                                    {["A", "B", "C", "D"].map((opt) => {
                                        const text = currentQuestion[`option_${opt.toLowerCase()}`];
                                        if (!text) return null;

                                        const isCorrect = currentQuestion.correct_answer === opt;

                                        return (
                                            <div
                                                key={opt}
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
                                                    <span className="text-gray-700 dark:text-gray-300 flex-1">
                                                        {text}
                                                    </span>
                                                    {isCorrect && (
                                                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                                            ✓ Correct
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Correct Answer Highlight */}
                                <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                                        💡 Correct Answer
                                    </p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        <span className="font-bold">{currentQuestion.correct_answer}.</span>{' '}
                                        {currentQuestion[`option_${currentQuestion.correct_answer.toLowerCase()}`]}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT SIDE - COMMENTS PANEL */}
                    <div className="w-full md:w-1/2 lg:w-3/5 flex flex-col flex-1 bg-white dark:bg-transparent">
                        {/* Reply Indicator Bar */}
                        {replyTo && (
                            <div className="flex items-center justify-between px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border-b dark:border-gray-800">
                                <p className="text-sm text-blue-600 dark:text-blue-400">
                                    Replying to comment #{replyTo.slice(0, 8)}
                                </p>
                                <button
                                    onClick={() => setReplyTo(null)}
                                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        {/* Comments List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                            {comments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                    <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">No comments yet</p>
                                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Be the first to start the discussion</p>
                                </div>
                            ) : (
                                comments.map((c) => {
                                    const isReply = !!c.parent_id;
                                    const liked = c.comment_likes?.some(
                                        (l: any) => l.user_id === user?.id
                                    );

                                    return (
                                        <div
                                            key={c.id}
                                            className={`
                                                flex items-start gap-3
                                                transition-all duration-200
                                                hover:bg-gray-50 dark:hover:bg-gray-800/30
                                                rounded-lg p-2
                                                ${isReply ? "ml-6 md:ml-8 pl-3 border-l-2 border-gray-200 dark:border-gray-700" : ""}
                                            `}
                                        >
                                            <img
                                                src={c.profiles?.avatar_url || "/UsersAvatar.jpg"}
                                                alt={c.profiles?.name || "User"}
                                                className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
                                            />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                                        {c.profiles?.name || "Anonymous"}
                                                    </p>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                                        {new Date(c.created_at).toLocaleDateString(undefined, {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>

                                                <p className="text-gray-700 dark:text-gray-300 text-sm mt-1 break-words">
                                                    {c.comment_text}
                                                </p>

                                                <div className="flex gap-4 text-xs mt-2">
                                                    <button
                                                        className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                                                        onClick={() => setReplyTo(c.id)}
                                                    >
                                                        <Reply size={14} />
                                                        <span>Reply</span>
                                                    </button>

                                                    <button
                                                        className="flex items-center gap-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                                                        onClick={() => toggleCommentLike(c.id)}
                                                    >
                                                        {liked ? (
                                                            <span className="text-red-500">❤️</span>
                                                        ) : (
                                                            <ThumbsUp size={14} />
                                                        )}
                                                        <span>{c.comment_likes?.length || 0}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Comment Input Section */}
                        <div className="border-t dark:border-gray-800 p-4 bg-white dark:bg-muted/20">
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <Input
                                        placeholder={replyTo ? "Write your reply..." : "Write a comment..."}
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && newComment.trim()) {
                                                addComment();
                                            }
                                        }}
                                        className="
                                            bg-gray-50
                                            dark:bg-gray-800/50
                                            border-gray-200
                                            dark:border-gray-700
                                            focus:ring-2
                                            focus:ring-blue-500
                                            focus:border-transparent
                                            rounded-xl
                                            py-2.5
                                            text-sm
                                        "
                                    />
                                    {replyTo && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Replying to comment • <button onClick={() => setReplyTo(null)} className="text-blue-600 hover:underline">Cancel reply</button>
                                        </p>
                                    )}
                                </div>
                                <Button
                                    onClick={addComment}
                                    disabled={!newComment.trim()}
                                    className="
                                        bg-gradient-to-r from-blue-600 to-purple-600
                                        hover:from-blue-700 hover:to-purple-700
                        text-white
                                        rounded-xl
                                        px-5
                                        transition-all
                                        duration-200
                                        disabled:opacity-50
                                        disabled:cursor-not-allowed
                                    "
                                >
                                    Post
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}