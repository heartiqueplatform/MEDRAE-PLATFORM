"use client";

import { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Heart, MessageCircle } from "lucide-react";
import ShareButtonsGroup from "@/components/Share/ShareButtonsGroup";
import FeedMediaPanel from "@/components/Feed/FeedMediaPanel";

interface Props {
    questions: any[];
    loading: boolean;
    hasMore: boolean;
    answers: Record<string, string>;
    voteStats: Record<string, any>;
    user: any;
    isMuted: boolean;
    setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
    onAnswer: (q: any, opt: string) => void;
    onLike: (questionId: string, liked: boolean) => void;
    onOpenComments: (questionId: string) => void;
    onLoadMore: () => void;

    feedImages: any[];
    loadedImages: Record<string, boolean>;
    setLoadedImages: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    session: any;
    supabase: any;
    openViewer: (img: any) => void;
    handleDeleteImage: (img: any) => void;
    showUpload: boolean;
    setShowUpload: React.Dispatch<React.SetStateAction<boolean>>;
    uploadFiles: File[];
    setUploadFiles: React.Dispatch<React.SetStateAction<File[]>>;
    uploading: boolean;
    handleImageUpload: (isRelated?: boolean) => void;
    imageTitle: string;
    setImageTitle: React.Dispatch<React.SetStateAction<string>>;
    imageDescription: string;
    setImageDescription: React.Dispatch<React.SetStateAction<string>>;
}

const MEDIA_EVERY_N = 2;

const SkeletonCard = () => (
    <div className="animate-pulse bg-white dark:bg-[#0d1117] p-3 mb-2">
        <div className="h-4 w-24 bg-gray-200 dark:bg-[#161b22] rounded mb-3" />
        <div className="h-5 w-full bg-gray-200 dark:bg-[#161b22] rounded mb-3" />
        <div className="h-10 w-full bg-gray-100 dark:bg-[#161b22] rounded mb-1.5" />
        <div className="h-10 w-full bg-gray-100 dark:bg-[#161b22] rounded mb-1.5" />
        <div className="h-10 w-full bg-gray-100 dark:bg-[#161b22] rounded mb-1.5" />
        <div className="h-10 w-full bg-gray-100 dark:bg-[#161b22] rounded" />
    </div>
);

export default function FeedQuestionsTab({
    questions,
    loading,
    hasMore,
    answers,
    voteStats,
    user,
    isMuted,
    setIsMuted,
    onAnswer,
    onLike,
    onOpenComments,
    onLoadMore,

    feedImages,
    loadedImages,
    setLoadedImages,
    session,
    supabase,
    openViewer,
    handleDeleteImage,
    showUpload,
    setShowUpload,
    uploadFiles,
    setUploadFiles,
    uploading,
    handleImageUpload,
    imageTitle,
    setImageTitle,
    imageDescription,
    setImageDescription,
}: Props) {
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return;
        const obs = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    onLoadMore();
                }
            },
            { rootMargin: "600px 0px", threshold: 0 }
        );
        obs.observe(node);
        return () => obs.disconnect();
    }, [hasMore, loading, onLoadMore]);

    const mediaPosts = useMemo(() => {
        if (!feedImages || feedImages.length === 0) return [];
        const groups = new Map<string, any[]>();
        for (const im of feedImages) {
            const key = im.post_group_id || `single_${im.id}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(im);
        }
        return Array.from(groups.keys());
    }, [feedImages]);

    return (
        <div className="w-full max-w-4xl mx-auto">
            {loading && questions.length === 0 && (
                <>
                    <SkeletonCard />
                    <SkeletonCard />
                </>
            )}

            {questions.map((q, index) => {
                const liked = q.qfeed_likes?.some((l: any) => l.user_id === user?.id);
                const selected = answers[q.id];

                const shouldInjectMedia =
                    mediaPosts.length > 0 &&
                    (index + 1) % MEDIA_EVERY_N === 0;

                const mediaPostIndex =
                    Math.floor(index / MEDIA_EVERY_N) % mediaPosts.length;
                const mediaGroupKey = mediaPosts[mediaPostIndex];

                return (
                    <div key={q.id}>
                        <motion.div
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="w-full bg-white dark:bg-[#0d1117] mb-2 overflow-hidden"
                        >
                            <Card className="border-0 rounded-none shadow-none bg-transparent">
                                <CardContent className="flex flex-col gap-2 px-3 pt-3 pb-2 w-full">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[12px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wide">
                                            {q.quiz_title}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setIsMuted((prev) => !prev)}
                                            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#161b22] transition-colors"
                                            aria-label={isMuted ? "Unmute" : "Mute"}
                                        >
                                            {isMuted ? (
                                                <VolumeX className="w-4 h-4 text-gray-500 dark:text-[#8b949e]" />
                                            ) : (
                                                <Volume2 className="w-4 h-4 text-gray-500 dark:text-[#8b949e]" />
                                            )}
                                        </button>
                                    </div>

                                    <p className="font-semibold text-gray-900 dark:text-[#e6edf3] text-[15px] leading-snug">
                                        {q.question_text}
                                    </p>

                                    <div className="flex flex-col gap-1.5 mt-1 w-full">
                                        {["A", "B", "C", "D"].map((opt) => {
                                            const text = q[`option_${opt.toLowerCase()}`];
                                            if (!text) return null;
                                            const chosen = selected === opt;
                                            const correct = q.correct_answer === opt;
                                            const stats = voteStats[q.id] || { A: 0, B: 0, C: 0, D: 0 };
                                            const totalVotes = stats.A + stats.B + stats.C + stats.D;
                                            const percent = totalVotes > 0 ? Math.round((stats[opt] / totalVotes) * 100) : 0;

                                            let circleColor = "bg-gray-400 dark:bg-[#30363d]";
                                            if (selected) {
                                                if (correct && chosen) circleColor = "bg-green-500";
                                                else if (!correct && chosen) circleColor = "bg-red-500";
                                            }

                                            return (
                                                <button
                                                    key={opt}
                                                    onClick={() => onAnswer(q, opt)}
                                                    disabled={!!selected}
                                                    className={`relative w-full flex items-start gap-2.5 px-3 py-2.5 text-left rounded-xl transition-all overflow-hidden ${chosen
                                                        ? correct
                                                            ? "bg-green-100 dark:bg-[#0d2018]"
                                                            : "bg-red-100 dark:bg-[#241012]"
                                                        : "hover:bg-gray-100 dark:hover:bg-[#161b22] active:scale-[0.99]"
                                                        }`}
                                                >
                                                    {selected && (
                                                        <div
                                                            className="absolute left-0 top-0 h-full bg-blue-500/25 dark:bg-blue-500/20 transition-all duration-500"
                                                            style={{ width: `${percent}%` }}
                                                        />
                                                    )}
                                                    <span
                                                        className={`relative z-10 w-3.5 h-3.5 rounded-full mt-1 flex-shrink-0 ${circleColor}`}
                                                    />
                                                    <div className="relative z-10 flex justify-between items-center w-full gap-2">
                                                        <div className="flex gap-2 break-words items-center">
                                                            <span className="font-semibold text-[13px] text-gray-900 dark:text-[#e6edf3]">
                                                                {opt}.
                                                            </span>
                                                            <span className="break-words text-[14px] text-gray-800 dark:text-[#e6edf3]">
                                                                {text}
                                                            </span>
                                                        </div>
                                                        {selected && totalVotes > 0 && (
                                                            <span className="ml-2 text-[11px] font-medium text-gray-600 dark:text-[#8b949e] flex-shrink-0">
                                                                {percent}%
                                                            </span>
                                                        )}
                                                        {chosen && correct && (
                                                            <span className="ml-1 text-2xl animate-emoji-zoom">😊</span>
                                                        )}
                                                        {chosen && !correct && (
                                                            <span className="ml-1 text-2xl animate-emoji-zoom">😢</span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* ── EXPLANATION — GitHub dark, no blue ── */}
                                    {selected && (
                                        <div className="mt-2 w-full rounded-xl overflow-hidden bg-gray-50 dark:bg-[#161b22]">
                                            <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-200 dark:border-[#30363d]">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                                                <p className="text-emerald-700 dark:text-emerald-400 font-bold text-[12.5px]">
                                                    Correct Answer: {q.correct_answer}
                                                </p>
                                            </div>
                                            <div className="px-3 py-3">
                                                <p className="text-gray-800 dark:text-[#e6edf3] text-[13px] leading-relaxed">
                                                    {q.explanation}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── ACTION BUTTONS — medium-big, Lucide icons, grouped left ── */}
                                    <div className="flex items-center gap-2 mt-2 pt-1">
                                        <Button
                                            variant="ghost"
                                            onClick={() => onLike(q.id, liked)}
                                            className={`flex items-center gap-1.5 h-10 px-3 rounded-full bg-gray-100 dark:bg-[#161b22] hover:bg-gray-200 dark:hover:bg-[#21262d] active:scale-95 transition-all ${liked
                                                ? "text-rose-500 dark:text-rose-400"
                                                : "text-gray-700 dark:text-[#8b949e]"
                                                }`}
                                        >
                                            <Heart
                                                size={18}
                                                fill={liked ? "currentColor" : "none"}
                                            />
                                            <span className="text-[13px] font-bold tabular-nums">
                                                {q.qfeed_likes?.length || 0}
                                            </span>
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            onClick={() => onOpenComments(q.id)}
                                            className="flex items-center gap-1.5 h-10 px-3 rounded-full bg-gray-100 dark:bg-[#161b22] hover:bg-gray-200 dark:hover:bg-[#21262d] active:scale-95 transition-all text-gray-700 dark:text-[#8b949e]"
                                        >
                                            <MessageCircle size={18} />
                                            <span className="text-[13px] font-bold tabular-nums">
                                                {q.comments_count || 0}
                                            </span>
                                        </Button>
                                    </div>

                                    {(index + 1) % 10 === 0 && (
                                        <ShareButtonsGroup
                                            user={user}
                                            q={{
                                                question_text: q.question_text,
                                                correct_answer: q.correct_answer,
                                            }}
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>

                        {shouldInjectMedia && (
                            <FeedMediaPanel
                                key={`media-inline-${index}-${mediaGroupKey}`}
                                index={index}
                                groupKey={mediaGroupKey}
                                feedImages={feedImages}
                                loadedImages={loadedImages}
                                setLoadedImages={setLoadedImages}
                                session={session}
                                supabase={supabase}
                                user={user}
                                openViewer={openViewer}
                                handleDeleteImage={handleDeleteImage}
                                showUpload={showUpload}
                                setShowUpload={setShowUpload}
                                uploadFiles={uploadFiles}
                                setUploadFiles={setUploadFiles}
                                uploading={uploading}
                                handleImageUpload={handleImageUpload}
                                imageTitle={imageTitle}
                                setImageTitle={setImageTitle}
                                imageDescription={imageDescription}
                                setImageDescription={setImageDescription}
                            />
                        )}
                    </div>
                );
            })}

            {hasMore && (
                <div
                    ref={sentinelRef}
                    className="flex flex-col items-center justify-center py-6 w-full"
                >
                    {loading ? (
                        <p className="text-[11px] text-gray-400 dark:text-[#8b949e]">
                            Loading more…
                        </p>
                    ) : (
                        <div className="h-10 w-full" />
                    )}
                </div>
            )}
        </div>
    );
}