// src/components/MedraeQuizzes/QuizContributionCard.tsx

"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles,
    PlusCircle,
    Trophy,
    Star,
    Bookmark,
    Share2,
    Flame,
    ChevronRight,
    Loader2,
    Play,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Carousel images — matched to unit-card image height               */
/* ------------------------------------------------------------------ */
const CAROUSEL_IMAGES = [
    {
        src: "https://plus.unsplash.com/premium_photo-1672660509844-449cb70bfcbe?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
        alt: "Creator writing quiz questions",
    },
    {
        src: "https://images.unsplash.com/photo-1604594849809-dfedbc827105?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
        alt: "Nursing study notes and coins",
    },
    {
        src: "https://images.unsplash.com/photo-1772413438631-a4bc7ccf0f4a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
        alt: "Students collaborating on quizzes",
    },
] as const;

/* ------------------------------------------------------------------ */
/*  Coin rewards                                                      */
/* ------------------------------------------------------------------ */
const REWARDS = [
    { label: "Someone starts your quiz", icon: Play, coins: 3 },
    { label: "Someone rates your quiz", icon: Star, coins: 4 },
    { label: "Someone bookmarks your quiz", icon: Bookmark, coins: 3 },
    { label: "Someone shares your quiz", icon: Share2, coins: 6 },
    { label: "Someone votes difficulty", icon: Flame, coins: 1 },
] as const;

interface Props {
    /** Optional — hide reward chips if the parent already shows them */
    compact?: boolean;
}

interface OwnQuizSummary {
    total_quizzes: number;
    total_questions: number;
    total_earned: number;
    has_50_question_quiz: boolean;
}

export function QuizContributionCard({ compact = false }: Props) {
    const user = useUser();
    const navigate = useNavigate();
    const [summary, setSummary] = useState<OwnQuizSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [imgIndex, setImgIndex] = useState(0);

    /* ── Auto-advance carousel every 4s ── */
    useEffect(() => {
        const t = setInterval(
            () => setImgIndex((i) => (i + 1) % CAROUSEL_IMAGES.length),
            4000
        );
        return () => clearInterval(t);
    }, []);

    /* ── Fetch author stats ── */
    useEffect(() => {
        if (!user?.id) {
            setSummary(null);
            return;
        }

        let cancelled = false;
        setLoading(true);

        (async () => {
            try {
                const { data: quizzes } = await supabase
                    .from("quizzes")
                    .select("id, question_count")
                    .eq("created_by", user.id);

                if (cancelled) return;

                if (!quizzes || quizzes.length === 0) {
                    setSummary({
                        total_quizzes: 0,
                        total_questions: 0,
                        total_earned: 0,
                        has_50_question_quiz: false,
                    });
                    return;
                }

                const { data: ledger } = await supabase
                    .from("medrae_stu_coin_ledger")
                    .select("action, coins")
                    .eq("user_id", user.id)
                    .like("action", "quiz_%")
                    .gt("coins", 0);

                if (cancelled) return;

                const earned = (ledger ?? []).reduce(
                    (sum, r) => sum + (Number(r.coins) || 0),
                    0
                );
                const totalQuestions = quizzes.reduce(
                    (sum, q) => sum + (Number(q.question_count) || 0),
                    0
                );

                setSummary({
                    total_quizzes: quizzes.length,
                    total_questions: totalQuestions,
                    total_earned: earned,
                    has_50_question_quiz: quizzes.some(
                        (q) => (Number(q.question_count) || 0) >= 50
                    ),
                });
            } catch (err) {
                console.warn("[QuizContributionCard] load failed:", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    const hasAnyQuiz = (summary?.total_quizzes ?? 0) > 0;

    const handleCTA = () => {
        playSound("ui-tap");
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
        navigate(hasAnyQuiz ? "/wallet/learn" : "/contribute");
    };

    return (
        <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="group relative overflow-hidden rounded-2xl
                       bg-white dark:bg-[#161b22]
                       shadow-sm
                       text-gray-900 dark:text-white
                       h-full min-h-[28rem] flex flex-col"
        >
            {/* ══ CAROUSEL (matches unit card image height) ══ */}
            <div className="relative h-60 sm:h-64 w-full overflow-hidden shrink-0">
                <AnimatePresence mode="wait">
                    <motion.img
                        key={imgIndex}
                        src={CAROUSEL_IMAGES[imgIndex].src}
                        alt={CAROUSEL_IMAGES[imgIndex].alt}
                        initial={{ opacity: 0, scale: 1.08 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.04 }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading={imgIndex === 0 ? "eager" : "lazy"}
                    />
                </AnimatePresence>

                {/* Gradient overlay for label legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

                {/* Top-right "NEW" style badge */}
                <div className="absolute top-3 right-3">
                    <div className="flex items-center gap-1 text-[10px] font-bold
                                    px-2 py-1 rounded-lg
                                    bg-white/90 dark:bg-[#0d1117]/90
                                    backdrop-blur-md
                                    text-purple-700 dark:text-purple-400">
                        <Sparkles className="w-3 h-3" /> EARN
                    </div>
                </div>

                {/* Bottom label */}
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-white/80">
                            Creator Program
                        </p>
                        <p className="text-sm font-bold text-white leading-tight truncate">
                            {hasAnyQuiz ? "Your quizzes are earning" : "Share questions. Earn MedraeCoins."}
                        </p>
                    </div>
                    {/* Carousel dots */}
                    <div className="flex gap-1 shrink-0">
                        {CAROUSEL_IMAGES.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setImgIndex(i)}
                                aria-label={`Show image ${i + 1}`}
                                className={`h-1.5 rounded-full transition-all ${i === imgIndex
                                    ? "w-4 bg-white"
                                    : "w-1.5 bg-white/50 hover:bg-white/80"
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* ══ CONTENT ══ */}
            <div className="relative flex-1 p-4 flex flex-col gap-3 min-h-0">
                {/* Header */}
                <div className="flex items-start gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-500/15
                                    flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-[14px] font-bold leading-tight">
                            {hasAnyQuiz ? "Earn from your quizzes" : "Create quizzes. Earn coins."}
                        </h3>
                        <p className="text-[11.5px] text-gray-500 dark:text-gray-400 leading-snug mt-0.5 line-clamp-2">
                            {hasAnyQuiz
                                ? "Every start, rate, bookmark, and share pays you coins automatically."
                                : "Add a quiz unit with 50+ questions and start earning when others engage."}
                        </p>
                    </div>
                </div>

                {/* Author stats — only if user has quizzes */}
                {hasAnyQuiz && (
                    <div className="grid grid-cols-3 gap-2">
                        <StatChip label="Quizzes" value={summary?.total_quizzes ?? 0} loading={loading} />
                        <StatChip label="Questions" value={summary?.total_questions ?? 0} loading={loading} />
                        <StatChip label="Earned" value={summary?.total_earned ?? 0} loading={loading} accent />
                    </div>
                )}

                {/* Reward chips */}
                {!compact && (
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        {REWARDS.map((r) => (
                            <div
                                key={r.label}
                                className="shrink-0 flex items-center gap-1.5 rounded-full
                                           bg-purple-50 dark:bg-purple-500/10
                                           text-purple-700 dark:text-purple-300
                                           px-2.5 py-1
                                           text-[10px] font-bold whitespace-nowrap"
                            >
                                <r.icon className="w-3 h-3" />
                                +{r.coins}
                            </div>
                        ))}
                    </div>
                )}

                {/* Milestone callout — if not yet reached */}
                {summary && !summary.has_50_question_quiz && (
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10
                                    px-3 py-2 flex items-center gap-2
                                    border border-amber-200/60 dark:border-amber-500/20">
                        <Trophy className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <p className="text-[10.5px] leading-snug text-amber-800 dark:text-amber-300">
                            Bonus: <strong className="font-bold">+100 coins</strong> when a quiz hits 50 questions
                        </p>
                    </div>
                )}

                {/* CTA — pinned to bottom */}
                <button
                    onClick={handleCTA}
                    className="mt-auto w-full h-11 rounded-2xl
                               bg-gradient-to-r from-purple-600 to-fuchsia-600
                               hover:from-purple-700 hover:to-fuchsia-700
                               text-white text-[13px] font-bold
                               flex items-center justify-center gap-1.5
                               active:scale-[0.97] transition-transform
                               shadow-lg shadow-purple-500/20"
                    style={{ touchAction: "manipulation" }}
                >
                    {hasAnyQuiz ? (
                        <>
                            <span>See how coins work</span>
                            <ChevronRight className="w-4 h-4" />
                        </>
                    ) : (
                        <>
                            <PlusCircle className="w-4 h-4" />
                            <span>Start earning as a creator</span>
                        </>
                    )}
                </button>
            </div>
        </motion.section>
    );
}

/* ------------------------------------------------------------------ */
/*  Small stat chip                                                   */
/* ------------------------------------------------------------------ */
function StatChip({
    label,
    value,
    loading,
    accent = false,
}: {
    label: string;
    value: number;
    loading: boolean;
    accent?: boolean;
}) {
    return (
        <div className="rounded-xl bg-gray-50 dark:bg-white/[0.06] px-2.5 py-1.5 min-w-0">
            <p className="text-[8.5px] font-bold uppercase tracking-wider
                          text-gray-500 dark:text-gray-400 truncate">
                {label}
            </p>
            <p className={`text-[13px] font-bold tabular-nums leading-tight truncate mt-0.5
                          ${accent ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white"}`}>
                {loading ? (
                    <Loader2 className="w-3 h-3 animate-spin opacity-70" />
                ) : (
                    value.toLocaleString()
                )}
            </p>
        </div>
    );
}