"use client";

import { useState } from "react";
import {
    Coins, RotateCcw, Image as ImageIcon, HelpCircle,
    TrendingUp, AlertTriangle, ChevronRight, Award,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Props {
    user: any;
    session: any;
    questionCount: number;
    userTokens: number;
    onResetQuestions: () => Promise<void>;
    onResetImages: () => Promise<void>;
    setFeedImages: (val: any) => void;
    setQuestions: (val: any) => void;
    setAnswers: (val: any) => void;
    setQuestionCount: (val: number) => void;
}

const TIER_NAMES = [
    { min: 0, name: "Starter" },
    { min: 500, name: "Rising" },
    { min: 3000, name: "Skilled" },
    { min: 5000, name: "Expert" },
    { min: 10000, name: "Legend" },
];

export default function FeedMoreTab({
    user,
    session,
    questionCount,
    userTokens,
    onResetQuestions,
    onResetImages,
    setFeedImages,
    setQuestions,
    setAnswers,
    setQuestionCount,
}: Props) {
    const [busy, setBusy] = useState<null | "images" | "questions">(null);
    const [confirming, setConfirming] = useState<null | "images" | "questions">(null);

    const nextXpAt = (Math.floor(questionCount / 10) + 1) * 10;
    const xpProgressPct = (questionCount % 10) * 10; // 0–90
    const tierName = [...TIER_NAMES].reverse().find((t) => questionCount >= t.min)?.name ?? "Starter";

    const handleResetQuestions = async () => {
        if (confirming !== "questions") {
            setConfirming("questions");
            return;
        }
        try {
            setBusy("questions");
            await onResetQuestions();
            setConfirming(null);
        } finally {
            setBusy(null);
        }
    };

    const handleResetImages = async () => {
        if (confirming !== "images") {
            setConfirming("images");
            return;
        }
        try {
            setBusy("images");
            await onResetImages();
            setConfirming(null);
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-3 py-3 space-y-3 pb-24">
            {/* Page intro */}
            <div>
                <h2 className="text-[17px] font-bold text-gray-900 dark:text-[#e6edf3]">
                    Your profile
                </h2>
                <p className="text-[12px] text-gray-600 dark:text-[#8b949e] mt-0.5">
                    Progress, XP, and feed settings.
                </p>
            </div>

            {/* XP CARD */}
            <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-[#241d0b] dark:via-[#2a1f0a] dark:to-[#241208] rounded-2xl p-4">
                <div className="flex items-start gap-3">
                    <div className="bg-amber-500 text-white rounded-xl p-2.5 flex-shrink-0">
                        <Coins size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-amber-700 dark:text-amber-400">
                            XP Balance
                        </p>
                        <p className="text-2xl font-extrabold text-amber-900 dark:text-amber-100 leading-tight tabular-nums">
                            {userTokens}
                            <span className="text-[13px] font-semibold text-amber-700 dark:text-amber-400 ml-1.5">
                                XP
                            </span>
                        </p>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5">
                            Earn 1 XP every 10 questions answered
                        </p>
                    </div>
                </div>

                {/* Progress to next XP */}
                <div className="mt-3">
                    <div className="flex items-center justify-between text-[10.5px] font-bold text-amber-800 dark:text-amber-300 mb-1">
                        <span>Next XP at {nextXpAt} questions</span>
                        <span className="tabular-nums">{questionCount % 10}/10</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-amber-200/60 dark:bg-[#30363d] overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                            style={{ width: `${Math.max(xpProgressPct, 3)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* STATS ROW */}
            <div className="grid grid-cols-3 gap-2">
                <StatCard
                    icon={<TrendingUp size={16} />}
                    label="Questions"
                    value={questionCount.toLocaleString()}
                    accent="blue"
                />
                <StatCard
                    icon={<Award size={16} />}
                    label="Tier"
                    value={tierName}
                    accent="purple"
                />
                <StatCard
                    icon={<Coins size={16} />}
                    label="XP"
                    value={userTokens.toString()}
                    accent="amber"
                />
            </div>

            {/* SETTINGS — Reset section */}
            <div className="pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#8b949e] px-1 mb-2">
                    Feed settings
                </p>

                {/* Reset Questions */}
                <SettingRow
                    icon={<RotateCcw size={18} />}
                    iconBg="bg-red-500"
                    title="Reset question history"
                    description={
                        questionCount > 0
                            ? `You've answered ${questionCount.toLocaleString()} questions. Reset to see them all fresh. XP stays safe.`
                            : "You have no questions to reset yet."
                    }
                    disabled={questionCount === 0 || busy !== null}
                    actionLabel={
                        busy === "questions"
                            ? "Resetting…"
                            : confirming === "questions"
                                ? "Tap again to confirm"
                                : "Reset"
                    }
                    danger
                    onClick={handleResetQuestions}
                    confirming={confirming === "questions"}
                    disabled2={questionCount === 0}
                />

                {/* Reset Images */}
                <div className="mt-2">
                    <SettingRow
                        icon={<ImageIcon size={18} />}
                        iconBg="bg-blue-500"
                        title="Reset seen images"
                        description="See all images from the start of the feed again."
                        disabled={busy !== null}
                        actionLabel={
                            busy === "images"
                                ? "Resetting…"
                                : confirming === "images"
                                    ? "Tap again to confirm"
                                    : "Reset"
                        }
                        danger
                        onClick={handleResetImages}
                        confirming={confirming === "images"}
                    />
                </div>

                {confirming && (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-red-600 dark:text-red-400 px-2">
                        <AlertTriangle size={12} />
                        Tap the button again to confirm. This action cannot be undone.
                    </p>
                )}
            </div>

            {/* ABOUT XP */}
            <div className="bg-gray-50 dark:bg-[#161b22] rounded-2xl p-3 mt-3">
                <div className="flex items-center gap-2 mb-2">
                    <HelpCircle size={14} className="text-gray-500 dark:text-[#8b949e]" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-[#e6edf3]">
                        How XP works
                    </p>
                </div>
                <ul className="text-[12px] text-gray-700 dark:text-[#8b949e] space-y-1.5 leading-relaxed">
                    <li>• Answer 10 questions → earn 1 XP</li>
                    <li>• XP is permanent — resetting questions never removes it</li>
                    <li>• Spend XP later on premium content, boosts, and rewards</li>
                </ul>
            </div>

            {/* Account preview */}
            {user && (
                <div className="bg-gray-50 dark:bg-[#161b22] rounded-2xl p-3 mt-3 flex items-center gap-3">
                    <img
                        src={user?.user_metadata?.avatar_url || "/UsersAvatar.jpg"}
                        alt="You"
                        className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-900 dark:text-[#e6edf3] truncate">
                            {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "You"}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-[#8b949e] truncate">
                            {user?.email}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({
    icon, label, value, accent,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    accent: "blue" | "purple" | "amber";
}) {
    const accents = {
        blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-[#0d1c2e]",
        purple: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-[#1a0d24]",
        amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-[#241d0b]",
    };
    return (
        <div className="bg-gray-50 dark:bg-[#161b22] rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accents[accent]}`}>
                {icon}
            </div>
            <p className="text-[13px] font-bold text-gray-900 dark:text-[#e6edf3] mt-1.5 tabular-nums">
                {value}
            </p>
            <p className="text-[9.5px] font-semibold uppercase tracking-wider text-gray-500 dark:text-[#8b949e] mt-0.5">
                {label}
            </p>
        </div>
    );
}

function SettingRow({
    icon, iconBg, title, description, disabled, actionLabel, danger, onClick, confirming, disabled2,
}: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    description: string;
    disabled?: boolean;
    actionLabel: string;
    danger?: boolean;
    onClick: () => void;
    confirming?: boolean;
    disabled2?: boolean;
}) {
    return (
        <div className="bg-gray-50 dark:bg-[#161b22] rounded-xl p-3 flex items-start gap-3">
            <div className={`${iconBg} text-white rounded-lg p-2 flex-shrink-0`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-gray-900 dark:text-[#e6edf3]">
                    {title}
                </p>
                <p className="text-[11.5px] text-gray-600 dark:text-[#8b949e] mt-0.5 leading-relaxed">
                    {description}
                </p>
            </div>
            <button
                onClick={onClick}
                disabled={disabled || disabled2}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${confirming
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : danger
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-gray-200 dark:bg-[#21262d] text-gray-700 dark:text-[#e6edf3]"
                    }`}
            >
                {actionLabel}
                {!confirming && !disabled && <ChevronRight size={12} />}
            </button>
        </div>
    );
}