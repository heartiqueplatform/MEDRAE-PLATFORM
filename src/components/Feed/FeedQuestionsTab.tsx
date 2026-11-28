"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { Volume2, VolumeX, Heart, MessageCircle } from "lucide-react";
import ShareButtonsGroup from "@/components/Share/ShareButtonsGroup";
import FeedMediaPanel from "@/components/Feed/FeedMediaPanel";
import { playSound } from "@/lib/soundManager";
import { UserProfileModal } from "@/components/UserProfileModal";
import { motion, AnimatePresence } from "framer-motion";
import { useConnectivity } from "@/context/ConnectivityContext";
import OfflineLottie from "@/components/OfflineLottie";
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
/*  Offline empty state — shown when the Questions feed is empty     */
/*  because we're offline. Uses the same Lottie as OfflineOverlay.   */
/* ------------------------------------------------------------------ */
function OfflineQuestionsEmpty({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="w-full max-w-4xl mx-auto px-1">
            <div className="
                rounded-2xl
                bg-white dark:bg-[#161b22]
                px-5 py-10 sm:py-14
                flex flex-col items-center text-center
                mb-2
            ">
                {/* Lottie — same asset as the OfflineOverlay */}
                <div className="w-40 h-40 sm:w-52 sm:h-52 md:w-60 md:h-60 shrink-0">
                    <OfflineLottie />
                </div>

                <h3 className="
                    mt-5 text-lg sm:text-xl font-bold tracking-tight
                    text-slate-900 dark:text-white
                ">
                    No questions loaded yet
                </h3>

                <p className="
                    mt-2 max-w-sm text-sm leading-relaxed
                    text-slate-500 dark:text-slate-400
                ">
                    You're offline and we haven't cached any questions for this
                    feed yet. Move to a stronger connection and we'll load them
                    automatically.
                </p>

                <button
                    type="button"
                    onClick={onRetry}
                    className="
                        mt-6 h-11 px-5 rounded-2xl
                        bg-violet-600 text-white
                        text-sm font-bold
                        flex items-center justify-center gap-2
                        active:scale-[0.97] transition-transform
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60
                    "
                    style={{ touchAction: "manipulation" }}
                >
                    <svg
                        viewBox="0 0 24 24" fill="none"
                        className="h-4 w-4" strokeWidth={2.4} stroke="currentColor"
                    >
                        <path d="M21 12a9 9 0 1 1-3-6.7" />
                        <polyline points="21 3 21 9 15 9" />
                    </svg>
                    Try again
                </button>

                <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                    Cached questions will still work offline once loaded.
                </p>
            </div>
        </div>
    );
}
/* ------------------------------------------------------------------ */
/*  Skeleton — solid blocks, visible in both light & dark             */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 mb-2 animate-pulse">
            <div className="h-3 w-24 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
            <div className="mt-3 space-y-1.5">
                <div className="h-4 w-full rounded-md bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-4 w-4/5 rounded-md bg-slate-100 dark:bg-white/[0.06]" />
            </div>
            <div className="mt-3 space-y-1.5">
                <div className="h-11 w-full rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-11 w-full rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-11 w-full rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-11 w-full rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
            </div>
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
    onOpenAuthor,
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
    onOpenAuthor: (userId: string) => void;
}) {
    // ── Peek / hint state ──────────────────────────────────────
    const [hintOpen, setHintOpen] = useState(false); // "Reveal hint" pill visible
    const [revealed, setRevealed] = useState(false); // explanation visible (hint mode)
    const [teaser, setTeaser] = useState(false);     // tiny clue toast

    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressFired = useRef(false);
    const hintAutoClose = useRef<ReturnType<typeof setTimeout> | null>(null);
    const revealAutoClose = useRef<ReturnType<typeof setTimeout> | null>(null);
    const teaserTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearLongPress = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    // Tiny teaser toast — appears once, fades on its own
    useEffect(() => {
        teaserTimer.current = setTimeout(() => setTeaser(true), 1200);
        const hide = setTimeout(() => setTeaser(false), 3600);
        return () => {
            if (teaserTimer.current) clearTimeout(teaserTimer.current);
            clearTimeout(hide);
        };
    }, []);

    const openHint = () => {
        longPressFired.current = true;
        setHintOpen(true);
        setTeaser(false);
        vibrate(20);
        playSound("ui-tap");
        if (hintAutoClose.current) clearTimeout(hintAutoClose.current);
        hintAutoClose.current = setTimeout(() => setHintOpen(false), 5000);
    };

    const closeHint = () => {
        setHintOpen(false);
        if (hintAutoClose.current) {
            clearTimeout(hintAutoClose.current);
            hintAutoClose.current = null;
        }
    };

    const revealHint = () => {
        tap();
        setRevealed(true);
        closeHint();
        // ── Auto-dismiss the hint after 4 s ──
        if (revealAutoClose.current) clearTimeout(revealAutoClose.current);
        revealAutoClose.current = setTimeout(() => setRevealed(false), 4000);
    };

    const dismissReveal = () => {
        setRevealed(false);
        if (revealAutoClose.current) {
            clearTimeout(revealAutoClose.current);
            revealAutoClose.current = null;
        }
    };

    useEffect(() => {
        return () => {
            clearLongPress();
            if (hintAutoClose.current) clearTimeout(hintAutoClose.current);
            if (revealAutoClose.current) clearTimeout(revealAutoClose.current);
            if (teaserTimer.current) clearTimeout(teaserTimer.current);
        };
    }, []);

    // ── Desktop right-click → show "Reveal hint" pill ─────────
    const handleContextMenu = (e: React.MouseEvent) => {
        if (selected || revealed) return;
        e.preventDefault();
        openHint();
    };

    // ── Mobile long-press → show "Reveal hint" pill ───────────
    const handlePointerDown = (e: React.PointerEvent) => {
        if (selected || revealed) return;
        if (e.pointerType === "mouse") return;
        longPressFired.current = false;
        clearLongPress();
        longPressTimer.current = setTimeout(() => openHint(), 450);
    };

    const handlePointerUp = () => {
        clearLongPress();
        if (longPressFired.current) {
            setTimeout(() => {
                longPressFired.current = false;
            }, 0);
        }
    };

    const handlePointerCancel = () => {
        clearLongPress();
        longPressFired.current = false;
    };

    // Show explanation if: user answered, OR hint is currently revealed
    const showExplanation = !!selected || revealed;

    return (
        <motion.div
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="rounded-2xl bg-white dark:bg-[#161b22] mb-2 overflow-hidden relative"
            onContextMenu={handleContextMenu}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerCancel}
            onPointerCancel={handlePointerCancel}
            style={{ touchAction: "manipulation", WebkitTouchCallout: "none" }}
        >
            {/* ── Tiny teaser toast ─────────────────────────── */}
            <AnimatePresence>
                {teaser && !selected && !hintOpen && !revealed && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.25 }}
                        className="absolute top-2 right-2 z-30 pointer-events-none"
                    >
                        <div className="px-2 py-1 rounded-full
                            bg-slate-100 dark:bg-white/[0.06]
                            text-slate-500 dark:text-slate-400
                            text-[9px] font-semibold tracking-wide
                            shadow-sm">
                            Right-click or hold to reveal
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="p-3 space-y-2.5">
                {/* Header row (unchanged) */}
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
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                </div>

                {/* Author row (unchanged) */}
                {q.author_id && q.author_name && (
                    <button
                        type="button"
                        onClick={() => {
                            tap();
                            onOpenAuthor(q.author_id);
                        }}
                        className="flex items-center gap-2.5 -mt-1 mb-1 active:scale-[0.98] transition-transform group w-full text-left"
                        aria-label={`View ${q.author_name}'s profile`}
                    >
                        <div className="relative shrink-0">
                            {q.author_avatar ? (
                                <img
                                    src={q.author_avatar}
                                    alt={q.author_name}
                                    className={`h-9 w-9 rounded-full object-cover ${q.author_verified
                                        ? "ring-2 ring-amber-400/70 ring-offset-1 ring-offset-white dark:ring-offset-[#161b22]"
                                        : "ring-1 ring-slate-200 dark:ring-white/[0.06]"
                                        }`}
                                />
                            ) : (
                                <div
                                    className={`h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[13px] font-bold ${q.author_verified
                                        ? "ring-2 ring-amber-400/70 ring-offset-1 ring-offset-white dark:ring-offset-[#161b22]"
                                        : ""
                                        }`}
                                >
                                    {q.author_name[0]?.toUpperCase() ?? "U"}
                                </div>
                            )}
                            {q.author_verified && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center ring-2 ring-white dark:ring-[#161b22]">
                                    <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5 text-white" strokeWidth={3.5} stroke="currentColor">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[12.5px] font-bold text-slate-900 dark:text-white truncate group-hover:underline underline-offset-2">
                                    {q.author_name}
                                </span>
                                {q.author_verified && (
                                    <span className="shrink-0 inline-flex items-center gap-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                        <svg viewBox="0 0 24 24" fill="none" className="h-2 w-2" strokeWidth={4} stroke="currentColor">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        {q.author_tier
                                            ? q.author_tier.charAt(0).toUpperCase() + q.author_tier.slice(1)
                                            : "Verified"}
                                    </span>
                                )}
                            </div>
                            {q.author_role && (
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">
                                    {q.author_role}
                                </p>
                            )}
                        </div>
                    </button>
                )}

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
                        const stats = voteStats[q.id] || { A: 0, B: 0, C: 0, D: 0 };
                        const totalVotes = stats.A + stats.B + stats.C + stats.D;
                        const percent =
                            totalVotes > 0 ? Math.round((stats[opt] / totalVotes) * 100) : 0;

                        let dotColor = "bg-slate-300 dark:bg-white/[0.15]";
                        if (selected) {
                            if (correct && chosen) dotColor = "bg-emerald-500";
                            else if (!correct && chosen) dotColor = "bg-rose-500";
                            else if (correct) dotColor = "bg-emerald-500/60";
                        }

                        return (
                            <button
                                key={opt}
                                onClick={() => {
                                    if (longPressFired.current) return;
                                    if (hintOpen) { closeHint(); return; }
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
                                <span className={`relative z-10 h-3.5 w-3.5 rounded-full mt-1 shrink-0 ${dotColor}`} />
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
                                        <span className="text-[10px] font-bold tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                                            {percent}%
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* ── "Reveal hint" pill ─────────────────────── */}
                <AnimatePresence>
                    {hintOpen && !revealed && !selected && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <button
                                type="button"
                                onClick={revealHint}
                                className="w-full flex items-center justify-center gap-1.5
                                           px-3 py-2 rounded-xl
                                           bg-emerald-50 dark:bg-emerald-400/10
                                           text-emerald-700 dark:text-emerald-400
                                           text-[11.5px] font-bold
                                           active:scale-[0.98] transition-transform"
                            >
                                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" strokeWidth={2.5} stroke="currentColor">
                                    <path d="M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2z" />
                                    <line x1="9" y1="21" x2="15" y2="21" />
                                </svg>
                                Reveal hint
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Explanation ────────────────────────────────
                    Answered state → decorated header (unchanged)
                    Hint state     → plain theme-matched panel, auto-dismiss 4 s
                ──────────────────────────────────────────────── */}
                {showExplanation && (
                    <div className="mt-2 rounded-xl overflow-hidden bg-slate-50 dark:bg-[#0d1117] relative">
                        {revealed && !selected && (
                            <button
                                type="button"
                                onClick={dismissReveal}
                                className="absolute top-1.5 right-1.5 z-20 h-6 w-6 rounded-full
                                           flex items-center justify-center
                                           text-slate-400 hover:text-slate-600
                                           dark:text-slate-500 dark:hover:text-slate-300
                                           bg-white dark:bg-[#161b22] shadow-sm"
                                aria-label="Hide hint"
                            >
                                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" strokeWidth={2.5} stroke="currentColor">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}

                        {/* Answered state: keep the original decorated header */}
                        {selected && (
                            <div className="px-3 py-2 flex items-center gap-1.5
                                            border-b border-slate-100 dark:border-white/[0.04]">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <p className="text-[11px] font-bold uppercase tracking-wider
                                              text-emerald-700 dark:text-emerald-400">
                                    Correct answer: {q.correct_answer}
                                </p>
                            </div>
                        )}

                        {/* Hint state: no dot, no label, just plain theme-matched text */}
                        <div className={`px-3 ${selected ? "py-2.5" : "py-3"}`}>
                            <p className="text-[12.5px] text-slate-700 dark:text-slate-300 leading-relaxed">
                                {q.explanation}
                            </p>
                        </div>

                        {/* Optional: tiny 4 s progress bar for hint mode */}
                        {revealed && !selected && (
                            <motion.div
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 4, ease: "linear" }}
                                className="absolute bottom-0 left-0 h-[2px] bg-emerald-500/60 dark:bg-emerald-400/50"
                            />
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-1">
                    <ActionButton
                        active={liked}
                        activeColor="rose"
                        icon={<Heart size={15} fill={liked ? "currentColor" : "none"} strokeWidth={2.25} />}
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
    const { isOnline } = useConnectivity();

    // Feed is genuinely empty AND we're offline → show offline state,
    // not a blank feed. `loading` guards against flashing during retries.
    const showOfflineEmpty =
        !isOnline && !loading && questions.length === 0;
    // 🆕 Author profile modal state
    const [profileModalUser, setProfileModalUser] = useState<string | null>(null);

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
            {showOfflineEmpty && (
                <OfflineQuestionsEmpty
                    onRetry={() => window.location.reload()}
                />
            )}
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
                            onOpenAuthor={(uid) => setProfileModalUser(uid)}
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

            {/* 🆕 Author profile modal */}
            {profileModalUser && (
                <UserProfileModal
                    open={!!profileModalUser}
                    userId={profileModalUser}
                    onClose={() => setProfileModalUser(null)}
                />
            )}
        </div>
    );
}