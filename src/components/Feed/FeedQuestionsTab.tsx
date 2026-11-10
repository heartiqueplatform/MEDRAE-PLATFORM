"use client";

import { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Heart, MessageCircle } from "lucide-react";
import ShareButtonsGroup from "@/components/Share/ShareButtonsGroup";
import FeedMediaPanel from "@/components/Feed/FeedMediaPanel";
import { playSound } from "@/lib/soundManager";

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

const vibrate = (p: number | number[] = 12) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};

const tap = () => {
    playSound("ui-tap");
    vibrate(12);
};

/* ------------------------------------------------------------------ */
/*  Skeleton — solid blocks, visible in both light & dark             */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 mb-2 animate-pulse">
            {/* Eyebrow */}
            <div className="h-3 w-24 rounded-full bg-slate-100 dark:bg-white/[0.06]" />

            {/* Question line */}
            <div className="mt-3 space-y-1.5">
                <div className="h-4 w-full rounded-md bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-4 w-4/5 rounded-md bg-slate-100 dark:bg-white/[0.06]" />
            </div>

            {/* Options */}
            <div className="mt-3 space-y-1.5">
                <div className="h-11 w-full rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-11 w-full rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-11 w-full rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-11 w-full rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
            </div>

            {/* Action row */}
            <div className="mt-3 flex items-center gap-2">
                <div className="h-9 w-20 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-9 w-20 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Question card                                                     */
/* ------------------------------------------------------------------ */

function QuestionCard({
    q,
    index,
    selected,
    liked,
    isMuted,
    setIsMuted,
    voteStats,
    user,
    onAnswer,
    onLike,
    onOpenComments,
}: {
    q: any;
    index: number;
    selected?: string;
    liked: boolean;
    isMuted: boolean;
    setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
    voteStats: Record<string, any>;
    user: any;
    onAnswer: (q: any, opt: string) => void;
    onLike: (questionId: string, liked: boolean) => void;
    onOpenComments: (questionId: string) => void;
}) {
    return (
        <motion.div
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="rounded-2xl bg-white dark:bg-[#161b22] mb-2 overflow-hidden"
        >
            <div className="p-3 space-y-2.5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider
                                  text-blue-600 dark:text-blue-400
                                  truncate flex-1 min-w-0">
                        {q.quiz_title}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            tap();
                            setIsMuted((prev) => !prev);
                        }}
                        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0
                                   text-slate-500 dark:text-slate-400
                                   active:bg-slate-100 dark:active:bg-white/5
                                   transition-colors"
                        style={{ touchAction: "manipulation" }}
                        aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? (
                            <VolumeX className="h-4 w-4" />
                        ) : (
                            <Volume2 className="h-4 w-4" />
                        )}
                    </button>
                </div>

                {/* Question */}
                <p className="text-[14.5px] font-bold text-slate-900 dark:text-white leading-snug">
                    {q.question_text}
                </p>

                {/* Options */}
                <div className="space-y-1.5 pt-1">
                    {["A", "B", "C", "D"].map((opt) => {
                        const text = q[`option_${opt.toLowerCase()}`];
                        if (!text) return null;
                        const chosen = selected === opt;
                        const correct = q.correct_answer === opt;
                        const stats = voteStats[q.id] || {
                            A: 0,
                            B: 0,
                            C: 0,
                            D: 0,
                        };
                        const totalVotes =
                            stats.A + stats.B + stats.C + stats.D;
                        const percent =
                            totalVotes > 0
                                ? Math.round((stats[opt] / totalVotes) * 100)
                                : 0;

                        let dotColor =
                            "bg-slate-300 dark:bg-white/[0.15]";
                        if (selected) {
                            if (correct && chosen)
                                dotColor = "bg-emerald-500";
                            else if (!correct && chosen)
                                dotColor = "bg-rose-500";
                            else if (correct)
                                dotColor = "bg-emerald-500/60";
                        }

                        return (
                            <button
                                key={opt}
                                onClick={() => {
                                    tap();
                                    onAnswer(q, opt);
                                }}
                                disabled={!!selected}
                                className={`relative w-full flex items-start gap-2.5
                                            px-3 py-2.5 text-left rounded-xl
                                            transition-colors overflow-hidden
                                            ${chosen
                                        ? correct
                                            ? "bg-emerald-50 dark:bg-emerald-400/10"
                                            : "bg-rose-50 dark:bg-rose-400/10"
                                        : selected
                                            ? "bg-slate-50 dark:bg-white/[0.03]"
                                            : "bg-slate-50 dark:bg-[#0d1117] active:scale-[0.99]"
                                    }`}
                                style={{ touchAction: "manipulation" }}
                            >
                                {selected && totalVotes > 0 && (
                                    <div
                                        className={`absolute left-0 top-0 h-full transition-all duration-500 ${correct
                                            ? "bg-emerald-500/15 dark:bg-emerald-400/10"
                                            : "bg-rose-500/15 dark:bg-rose-400/10"
                                            }`}
                                        style={{ width: `${percent}%` }}
                                    />
                                )}

                                <span
                                    className={`relative z-10 h-3.5 w-3.5 rounded-full mt-1 shrink-0 ${dotColor}`}
                                />

                                <div className="relative z-10 flex items-center justify-between gap-2 w-full min-w-0">
                                    <div className="flex items-baseline gap-1.5 min-w-0">
                                        <span className="text-[12px] font-bold text-slate-900 dark:text-white shrink-0">
                                            {opt}.
                                        </span>
                                        <span className="text-[13px] text-slate-800 dark:text-slate-200 leading-snug break-words">
                                            {text}
                                        </span>
                                    </div>
                                    {selected && totalVotes > 0 && (
                                        <span className="text-[10px] font-bold tabular-nums
                                                         text-slate-500 dark:text-slate-400 shrink-0">
                                            {percent}%
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Explanation */}
                {selected && (
                    <div className="mt-2 rounded-xl overflow-hidden
                                    bg-slate-50 dark:bg-[#0d1117]">
                        <div className="px-3 py-2 flex items-center gap-1.5
                                        border-b border-slate-100 dark:border-white/[0.04]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <p className="text-[11px] font-bold uppercase tracking-wider
                                          text-emerald-700 dark:text-emerald-400">
                                Correct answer: {q.correct_answer}
                            </p>
                        </div>
                        <div className="px-3 py-2.5">
                            <p className="text-[12.5px] text-slate-700 dark:text-slate-300 leading-relaxed">
                                {q.explanation}
                            </p>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-1">
                    <ActionButton
                        active={liked}
                        activeColor="rose"
                        icon={
                            <Heart
                                size={15}
                                fill={liked ? "currentColor" : "none"}
                                strokeWidth={2.25}
                            />
                        }
                        count={q.qfeed_likes?.length || 0}
                        onClick={() => {
                            tap();
                            onLike(q.id, liked);
                        }}
                    />
                    <ActionButton
                        icon={<MessageCircle size={15} strokeWidth={2.25} />}
                        count={q.comments_count || 0}
                        onClick={() => {
                            tap();
                            onOpenComments(q.id);
                        }}
                    />
                </div>

                {(index + 1) % 10 === 0 && (
                    <div className="pt-2">
                        <ShareButtonsGroup
                            user={user}
                            q={{
                                question_text: q.question_text,
                                correct_answer: q.correct_answer,
                            }}
                        />
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function ActionButton({
    icon,
    count,
    active,
    activeColor = "blue",
    onClick,
}: {
    icon: React.ReactNode;
    count: number;
    active?: boolean;
    activeColor?: "blue" | "rose";
    onClick: () => void;
}) {
    const activeClass =
        activeColor === "rose"
            ? "text-rose-600 dark:text-rose-400"
            : "text-blue-600 dark:text-blue-400";

    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center gap-1.5
                        h-9 px-3 rounded-full
                        text-[12px] font-bold
                        active:scale-[0.97] transition-transform
                        ${active
                    ? activeClass
                    : "text-slate-600 dark:text-slate-300"
                }
                        ${active
                    ? "bg-rose-50 dark:bg-rose-400/10"
                    : "bg-slate-100 dark:bg-white/[0.06]"
                }`}
            style={{ touchAction: "manipulation" }}
        >
            {icon}
            <span className="tabular-nums">{count}</span>
        </button>
    );
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

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

    const mediaGroupKeys = useMemo(() => {
        if (!feedImages || feedImages.length === 0) return [] as string[];
        const set = new Set<string>();
        for (const im of feedImages) {
            set.add(im.post_group_id || `single_${im.id}`);
        }
        return Array.from(set).sort();
    }, [feedImages]);

    const imagesReady = mediaGroupKeys.length > 0;

    return (
        <div className="w-full max-w-4xl mx-auto px-1">
            {loading && questions.length === 0 && (
                <>
                    <SkeletonCard />
                    <SkeletonCard />
                </>
            )}

            {questions.map((q, index) => {
                const liked = q.qfeed_likes?.some(
                    (l: any) => l.user_id === user?.id
                );
                const selected = answers[q.id];

                const shouldInjectMedia =
                    imagesReady && (index + 1) % MEDIA_EVERY_N === 0;

                const mediaGroupKey = shouldInjectMedia
                    ? mediaGroupKeys[
                    Math.floor(index / MEDIA_EVERY_N) %
                    mediaGroupKeys.length
                    ]
                    : null;

                return (
                    <div key={q.id}>
                        <QuestionCard
                            q={q}
                            index={index}
                            selected={selected}
                            liked={!!liked}
                            isMuted={isMuted}
                            setIsMuted={setIsMuted}
                            voteStats={voteStats}
                            user={user}
                            onAnswer={onAnswer}
                            onLike={onLike}
                            onOpenComments={onOpenComments}
                        />

                        {shouldInjectMedia && mediaGroupKey && (
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
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
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