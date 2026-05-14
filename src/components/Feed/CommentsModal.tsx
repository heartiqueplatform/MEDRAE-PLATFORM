"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Reply, ThumbsUp } from "lucide-react";

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
    return (
        <>
            {/* 💬 Comments Modal */}
            <Dialog
                open={!!activeQuestion}
                onOpenChange={() => setActiveQuestion(null)}
            >
                <DialogContent
                    className="max-w-6xl w-[95vw] p-0 overflow-hidden"
                    aria-describedby="comments-dialog-description"
                >
                    <DialogHeader className="px-4 pt-4">
                        <DialogTitle className="text-lg font-semibold">
                            Comments
                        </DialogTitle>
                    </DialogHeader>

                    <p id="comments-dialog-description" className="sr-only">
                        View and post comments on this question. Replies appear indented under parent comments.
                    </p>

                    <div className="flex flex-col md:flex-row h-[80vh]">

                        {/* QUESTION */}
                        <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r dark:border-gray-800 overflow-y-auto custom-scrollbar p-4 max-h-[40vh] md:max-h-full">

                            {questions
                                .filter((q) => q.id === activeQuestion)
                                .map((q) => (
                                    <div key={q.id} className="space-y-4">

                                        <p className="text-sm font-semibold text-blue-500 dark:text-blue-400">
                                            {q.quiz_title}
                                        </p>

                                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                            {q.question_text}
                                        </p>

                                        <div className="flex flex-col gap-2">
                                            {["A", "B", "C", "D"].map((opt) => {
                                                const text = q[`option_${opt.toLowerCase()}`];
                                                if (!text) return null;

                                                return (
                                                    <div
                                                        key={opt}
                                                        className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800"
                                                    >
                                                        <span className="font-semibold">{opt}.</span> {text}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                    </div>
                                ))}
                        </div>

                        {/* COMMENTS */}
                        <div className="w-full md:w-1/2 flex flex-col flex-1">

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 scrollbar scrollbar-thumb-gray-500/40 dark:scrollbar-thumb-gray-400/50 scrollbar-track-transparent">

                                {comments.map((c) => {
                                    const isReply = !!c.parent_id;
                                    const liked = c.comment_likes?.some(
                                        (l: any) => l.user_id === user?.id
                                    );

                                    return (
                                        <div
                                            key={c.id}
                                            className={`flex items-start gap-3 ${isReply ? "ml-8" : ""}`}
                                        >
                                            <img
                                                src={c.profiles?.avatar_url || "/UsersAvatar.jpg"}
                                                alt={c.profiles?.name || "User"}
                                                className="w-8 h-8 rounded-full"
                                            />

                                            <div className="flex-1">
                                                <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                                    {c.profiles?.name || "User"}
                                                </p>

                                                <p className="text-gray-700 dark:text-gray-300">
                                                    {c.comment_text}
                                                </p>

                                                <div className="flex gap-3 text-xs mt-1 text-gray-500 dark:text-gray-400">

                                                    <button
                                                        className="flex items-center gap-1"
                                                        onClick={() => setReplyTo(c.id)}
                                                    >
                                                        <Reply size={14} /> Reply
                                                    </button>

                                                    <button
                                                        className="flex items-center gap-1"
                                                        onClick={() => toggleCommentLike(c.id)}
                                                    >
                                                        {liked ? "❤️" : <ThumbsUp size={14} />}
                                                        {c.comment_likes?.length || 0}
                                                    </button>

                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* COMMENT INPUT */}
                            <div className="flex gap-2 p-3 border-t dark:border-gray-800">
                                <Input
                                    placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                />
                                <Button onClick={addComment}>Post</Button>
                            </div>

                        </div>

                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}