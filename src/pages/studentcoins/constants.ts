// src/pages/studentcoins/constants.ts

import {
    Heart,
    MessageCircle,
    Bookmark,
    Star,
    Share2,
    CheckCircle2,
    Trophy,
    Swords,
    Flame,
    Sparkles,
    ArrowDownToLine,
    Crown,
    Wallet,
    Zap,
    Gift,
    Clock,
    AlertCircle,
    RefreshCw,
    Play,
} from "lucide-react";

import type { RedemptionStatus } from "./types";

/* ------------------------------------------------------------------ */
/*  ACTION_META — the canonical map of every earnable action          */
/*  Keep `coins` in sync with `medrae_stu_coin_rules` in the DB       */
/* ------------------------------------------------------------------ */

export interface ActionMeta {
    label: string;
    icon: any;
    tone: string;
    category: "social" | "learning" | "system";
    /** Base coin reward — mirrors `medrae_stu_coin_rules.coins`. */
    coins: number;
}

export const ACTION_META: Record<string, ActionMeta> = {
    receive_like: {
        label: "Someone liked your post",
        icon: Heart,
        tone: "text-rose-500 bg-rose-50 dark:bg-rose-500/10",
        category: "social",
        coins: 2,
    },
    receive_comment: {
        label: "New comment on your post",
        icon: MessageCircle,
        tone: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
        category: "social",
        coins: 5,
    },
    receive_comment_reply: {
        label: "Someone replied to you",
        icon: MessageCircle,
        tone: "text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10",
        category: "social",
        coins: 3,
    },
    receive_bookmark: {
        label: "Someone saved your quiz",
        icon: Bookmark,
        tone: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
        category: "social",
        coins: 3,
    },
    receive_rating: {
        label: "Someone rated your quiz",
        icon: Star,
        tone: "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
        category: "social",
        coins: 4,
    },
    receive_share: {
        label: "Your post was shared",
        icon: Share2,
        tone: "text-violet-500 bg-violet-50 dark:bg-violet-500/10",
        category: "social",
        coins: 6,
    },
    quiz_completed: {
        label: "Quiz completed",
        icon: CheckCircle2,
        tone: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
        category: "learning",
        coins: 10,
    },
    quiz_passed: {
        label: "Quiz passed (≥75%)",
        icon: Trophy,
        tone: "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
        category: "learning",
        coins: 25,
    },
    challenge_won: {
        label: "Challenge won",
        icon: Swords,
        tone: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
        category: "learning",
        coins: 50,
    },
    challenge_participated: {
        label: "Challenge participated",
        icon: Swords,
        tone: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
        category: "learning",
        coins: 10,
    },
    daily_streak: {
        label: "Daily streak bonus",
        icon: Flame,
        tone: "text-orange-500 bg-orange-50 dark:bg-orange-500/10",
        category: "learning",
        coins: 20,
    },
    first_post_bonus: {
        label: "Welcome bonus",
        icon: Sparkles,
        tone: "text-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-500/10",
        category: "system",
        coins: 15,
    },
    redeem: {
        label: "Coin redemption",
        icon: ArrowDownToLine,
        tone: "text-slate-500 bg-slate-100 dark:bg-white/[0.06]",
        category: "system",
        coins: 0,
    },
    quiz_started_by_other: {
        label: "Someone started your quiz",
        icon: Play,
        tone: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
        category: "social",
        coins: 3,
    },
    quiz_rated_by_other: {
        label: "Someone rated your quiz",
        icon: Star,
        tone: "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
        category: "social",
        coins: 4,
    },
    quiz_bookmarked_by_other: {
        label: "Someone bookmarked your quiz",
        icon: Bookmark,
        tone: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
        category: "social",
        coins: 3,
    },
    quiz_shared_by_other: {
        label: "Someone shared your quiz",
        icon: Share2,
        tone: "text-violet-500 bg-violet-50 dark:bg-violet-500/10",
        category: "social",
        coins: 6,
    },
    quiz_difficulty_voted: {
        label: "Someone voted on your quiz difficulty",
        icon: Flame,
        tone: "text-orange-500 bg-orange-50 dark:bg-orange-500/10",
        category: "social",
        coins: 1,
    },
    quiz_milestone_50: {
        label: "Your quiz reached 50 questions",
        icon: Trophy,
        tone: "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
        category: "learning",
        coins: 100,
    },
};

/* ------------------------------------------------------------------ */
/*  REWARD_ICONS — the keys must match `medrae_stu_rewards.icon`      */
/* ------------------------------------------------------------------ */

export const REWARD_ICONS: Record<string, any> = {
    wallet: Wallet,
    crown: Crown,
    quiz: Zap,
    gift: Gift,
};

/* ------------------------------------------------------------------ */
/*  EARN_CATEGORIES — section headings on the Earn tab               */
/* ------------------------------------------------------------------ */

export const EARN_CATEGORIES: {
    id: "social" | "learning";
    title: string;
    subtitle: string;
}[] = [
        {
            id: "social",
            title: "From community",
            subtitle: "Earn when others engage with your posts, quizzes, and comments",
        },
        {
            id: "learning",
            title: "From learning",
            subtitle: "Earn by completing quizzes, passing, and winning challenges",
        },
    ];

/* ------------------------------------------------------------------ */
/*  REDEMPTION_STATUS_META — labels + tones for redemption history   */
/* ------------------------------------------------------------------ */

export const REDEMPTION_STATUS_META: Record<
    RedemptionStatus,
    { label: string; tone: string; icon: any }
> = {
    pending: {
        label: "Pending",
        tone: "text-amber-600 bg-amber-50 dark:bg-amber-500/10",
        icon: Clock,
    },
    processing: {
        label: "Processing",
        tone: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
        icon: Clock,
    },
    fulfilled: {
        label: "Fulfilled",
        tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10",
        icon: CheckCircle2,
    },
    rejected: {
        label: "Rejected",
        tone: "text-rose-600 bg-rose-50 dark:bg-rose-500/10",
        icon: AlertCircle,
    },
    refunded: {
        label: "Refunded",
        tone: "text-slate-600 bg-slate-100 dark:bg-white/[0.06]",
        icon: RefreshCw,
    },
};

