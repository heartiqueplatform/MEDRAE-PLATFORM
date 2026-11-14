// src/components/MedraeQuizzes/QuizContributionCard.tsx

"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Sparkles,
    PlusCircle,
    Trophy,
    Users,
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
/*  Coin rewards — must match constants.ts / medrae_stu_coin_rules    */
/* ------------------------------------------------------------------ */

const REWARDS = [
    { label: "Someone starts your quiz", icon: Play, coins: 3, tone: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10" },
    { label: "Someone rates your quiz", icon: Star, coins: 4, tone: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10" },
    { label: "Someone bookmarks your quiz", icon: Bookmark, coins: 3, tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10" },
    { label: "Someone shares your quiz", icon: Share2, coins: 6, tone: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10" },
    { label: "Someone votes difficulty", icon: Flame, coins: 1, tone: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10" },
] as const;

interface Props {
    /** Optional — hide the "author stats" section if the parent already shows it */
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

    /* ── Fetch author stats — only if user has authored quizzes ── */
    useEffect(() => {
        if (!user?.id) {
            setSummary(null);
            return;
        }

        let cancelled = false;
        setLoading(true);

        (async () => {
            try {
                // Total quizzes + questions this user authored
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

                // Total earned from quiz-author actions
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

    /* ── CTA routing ── */
    const handleCTA = () => {
        playSound("ui-tap");
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);

        // Existing creators → explainer first
        // New creators → the contribute wizard
        // (the wizard's Gate redirects unapproved users to /wallet)
        navigate(hasAnyQuiz ? "/wallet/learn" : "/contribute");
    };

    return (
        <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden rounded-2xl
                       bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-700
                       text-white
                       shadow-lg shadow-purple-600/20"
        >
            {/* Decorative dots */}
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-10 w-40 h-40 rounded-full bg-white/5 blur-3xl pointer-events-none" />

            <div className="relative p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                            {hasAnyQuiz ? "You're contributing" : "New"}
                        </p>
                        <h3 className="text-[15px] font-bold leading-tight mt-0.5">
                            {hasAnyQuiz ? "Earn from your quizzes" : "Create quizzes. Earn coins."}
                        </h3>
                        <p className="text-[11.5px] opacity-85 leading-snug mt-1">
                            {hasAnyQuiz
                                ? "Every start, rate, bookmark, and share pays you coins automatically."
                                : "Add a quiz unit with 50+ questions and start earning every time someone engages with it."}
                        </p>
                    </div>
                </div>

                {/* Author stats — only if user has quizzes */}
                {hasAnyQuiz && (
                    <div className="grid grid-cols-3 gap-2">
                        <StatChip
                            label="Quizzes"
                            value={summary?.total_quizzes ?? 0}
                            loading={loading}
                        />
                        <StatChip
                            label="Questions"
                            value={summary?.total_questions ?? 0}
                            loading={loading}
                        />
                        <StatChip
                            label="Earned"
                            value={summary?.total_earned ?? 0}
                            loading={loading}
                            accent
                        />
                    </div>
                )}

                {/* Reward chips — compact row */}
                {!compact && (
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        {REWARDS.map((r) => (
                            <div
                                key={r.label}
                                className="shrink-0 flex items-center gap-1.5 rounded-full
                                           bg-white/15 px-2.5 py-1
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
                    <div className="rounded-xl bg-white/10 px-3 py-2 flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                        <p className="text-[10.5px] leading-snug">
                            Bonus: <strong className="font-bold">+100 coins</strong> when a quiz hits 50 questions
                        </p>
                    </div>
                )}

                {/* CTA */}
                <button
                    onClick={handleCTA}
                    className="w-full h-10 rounded-xl bg-white text-purple-700
                               text-[13px] font-bold
                               flex items-center justify-center gap-1.5
                               active:scale-[0.97] transition-transform
                               shadow-sm"
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
        <div className="rounded-xl bg-white/10 px-2.5 py-1.5 min-w-0">
            <p className="text-[8.5px] font-bold uppercase tracking-wider opacity-70 truncate">
                {label}
            </p>
            <p
                className={`text-[13px] font-bold tabular-nums leading-tight truncate mt-0.5 ${accent ? "text-amber-300" : ""
                    }`}
            >
                {loading ? (
                    <Loader2 className="w-3 h-3 animate-spin opacity-70" />
                ) : (
                    value.toLocaleString()
                )}
            </p>
        </div>
    );
}