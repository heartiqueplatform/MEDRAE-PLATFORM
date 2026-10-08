"use client";

import { useEffect, useState, useCallback, memo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import {
    X,
    Send,
    Sparkles,
    Trophy,
    RefreshCw,
    Users,
    WifiOff,
    Flame,
    Gift,
    Share2,
    Copy,
    Check,
    Clock,
    BookOpen,
} from "lucide-react";
import { StreakResuscitationModal } from "@/components/StreakResuscitation/StreakResuscitation";
import { useResuscitationLink } from "@/hooks/useResuscitationLink";
import {
    getMyReferralCode,
    getMyReferralStats,
    type ReferralStats,
} from "@/lib/referrals";

// ============================================
// TYPES & CONSTANTS
// ============================================

type EmotionType =
    | "motivated" | "stressed" | "happy" | "focused" | "tired"
    | "confused" | "excited" | "calm" | "anxious" | "grateful";

interface StudentMessage {
    id: string;
    user_id: string;
    display_name: string;
    message: string;
    emotion_type: EmotionType;
    is_anonymous: boolean;
    likes_count: number;
    created_at: string;
    avatar_url: string | null;
    pending?: boolean;
}

interface QueuedPost {
    localId: string;
    user_id: string;
    message: string;
    emotion_type: EmotionType;
    is_anonymous: boolean;
    created_at: string;
}

interface QueuedLike {
    messageId: string;
    queuedAt: number;
}

const EMOTION_CONFIG: Record<EmotionType, { emoji: string; label: string }> = {
    motivated: { emoji: "🔥", label: "Motivated" },
    stressed: { emoji: "😰", label: "Stressed" },
    happy: { emoji: "😊", label: "Happy" },
    focused: { emoji: "🎯", label: "Focused" },
    tired: { emoji: "😴", label: "Tired" },
    confused: { emoji: "🤔", label: "Confused" },
    excited: { emoji: "✨", label: "Excited" },
    calm: { emoji: "🌊", label: "Calm" },
    anxious: { emoji: "😥", label: "Anxious" },
    grateful: { emoji: "🙏", label: "Grateful" },
};

const ENCOURAGEMENT = [
    "Your flame is burning bright.",
    "Consistency compounds.",
    "You showed up. That matters.",
    "Day by day, you're building something.",
    "The streak is yours.",
    "Small steps. Real progress.",
];

// ─── Referral share config ───
const SHARE_IMAGE_PATH = "/medraeshare.jpeg";

const buildShareMessage = (code: string): string =>
    `🎓 I'm studying smarter with *Medrae* — an AI tutor for students.\n\n` +
    `Use my link and we BOTH get FREE Premium:\n` +
    `👉 https://medrae.app/?ref=${code}\n\n` +
    `You get 1 day free. I get 2. Everyone wins 💚`;

const loadShareImageFile = async (): Promise<File | null> => {
    try {
        const res = await fetch(SHARE_IMAGE_PATH);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new File([blob], "medrae.jpeg", { type: blob.type || "image/jpeg" });
    } catch {
        return null;
    }
};

// ─── Cache keys ───
const MESSAGES_CACHE_KEY = "emotion_messages_cache_v4";
const MESSAGES_CACHE_TTL_MS = 30 * 60 * 1000;
const STREAK_CACHE_KEY = "streak_cache";
const BEST_STREAK_CACHE_KEY = "best_streak_cache";
const QUEUED_POSTS_KEY = "emotion_queued_posts_v1";
const QUEUED_LIKES_KEY = "emotion_queued_likes_v1";
const FETCH_TIMEOUT_MS = 5000;

const DEFAULT_MESSAGES: StudentMessage[] = [
    {
        id: "default-1",
        user_id: "system",
        display_name: "Medrae Community",
        message: "Be the first to share how you're feeling today.",
        emotion_type: "motivated",
        is_anonymous: true,
        likes_count: 0,
        created_at: new Date().toISOString(),
        avatar_url: null,
    },
];

// ============================================
// SAFE STORAGE HELPERS
// ============================================

const safeGetItem = (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
};
const safeSetItem = (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch { }
};
const safeRemoveItem = (key: string): void => {
    try { localStorage.removeItem(key); } catch { }
};
const safeGetSessionItem = (key: string): string | null => {
    try { return sessionStorage.getItem(key); } catch { return null; }
};
const safeSetSessionItem = (key: string, value: string): void => {
    try { sessionStorage.setItem(key, value); } catch { }
};
const todayStr = () => new Date().toISOString().split("T")[0];

const readCachedMessages = (): StudentMessage[] | null => {
    try {
        const raw = safeGetItem(MESSAGES_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.data)) return null;
        if (Date.now() - (parsed.ts || 0) > MESSAGES_CACHE_TTL_MS) return null;
        if (parsed.data.length === 0) return null;
        return parsed.data as StudentMessage[];
    } catch { return null; }
};

const writeCachedMessages = (msgs: StudentMessage[]) => {
    if (!msgs || msgs.length === 0) return;
    safeSetItem(MESSAGES_CACHE_KEY, JSON.stringify({ data: msgs, ts: Date.now() }));
};

const readQueuedPosts = (): QueuedPost[] => {
    try {
        const raw = safeGetItem(QUEUED_POSTS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
};
const writeQueuedPosts = (queue: QueuedPost[]) => {
    safeSetItem(QUEUED_POSTS_KEY, JSON.stringify(queue));
};
const readQueuedLikes = (): QueuedLike[] => {
    try {
        const raw = safeGetItem(QUEUED_LIKES_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
};
const writeQueuedLikes = (queue: QueuedLike[]) => {
    safeSetItem(QUEUED_LIKES_KEY, JSON.stringify(queue));
};

// ============================================
// NETWORK DETECTION
// ============================================

let _onlineCache: { value: boolean; ts: number } | null = null;
const ONLINE_CACHE_MS = 3000;

const quickOnlineCheck = (): boolean => {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine !== false;
};

const realReachabilityCheck = async (timeoutMs = 1500): Promise<boolean> => {
    if (!quickOnlineCheck()) return false;
    if (_onlineCache && Date.now() - _onlineCache.ts < ONLINE_CACHE_MS) {
        return _onlineCache.value;
    }
    if (typeof fetch !== "function") return true;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        await fetch("https://www.gstatic.com/generate_204", {
            method: "GET",
            cache: "no-store",
            mode: "no-cors",
            signal: controller.signal,
        });
        clearTimeout(timer);
        _onlineCache = { value: true, ts: Date.now() };
        return true;
    } catch {
        clearTimeout(timer);
        _onlineCache = { value: false, ts: Date.now() };
        return false;
    }
};

const invalidateOnlineCache = () => { _onlineCache = null; };

const useOnlineStatus = () => {
    const [isOnline, setIsOnline] = useState<boolean>(() => quickOnlineCheck());
    useEffect(() => {
        let cancelled = false;
        const handleOnline = async () => {
            invalidateOnlineCache();
            const real = await realReachabilityCheck(1500);
            if (!cancelled) setIsOnline(real);
        };
        const handleOffline = () => {
            invalidateOnlineCache();
            if (!cancelled) setIsOnline(false);
        };
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        realReachabilityCheck(1500).then((real) => {
            if (!cancelled) setIsOnline(real);
        });
        return () => {
            cancelled = true;
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);
    return isOnline;
};

// ============================================
// OFFLINE BANNER
// ============================================

const OfflineBanner = ({ pendingCount }: { pendingCount: number }) => (
    <div className="px-5 py-2 bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center gap-2">
        <WifiOff size={13} className="text-amber-600 dark:text-amber-400" />
        <p className="text-[11px] text-amber-700 dark:text-amber-300">
            {pendingCount > 0
                ? `Offline · ${pendingCount} ${pendingCount === 1 ? "item" : "items"} will sync`
                : "Offline · showing saved data"}
        </p>
    </div>
);

// ============================================
// 🎁 REFERRAL SHARE MODAL
// ============================================

const ReferralShareModal = memo(
    ({
        isOpen,
        onClose,
        referralCode,
        referralStats,
    }: {
        isOpen: boolean;
        onClose: () => void;
        referralCode: string | null;
        referralStats?: ReferralStats | null;
    }) => {
        const [copied, setCopied] = useState(false);

        useEffect(() => {
            if (isOpen) setCopied(false);
        }, [isOpen]);

        const shareUrl = referralCode ? `https://medrae.app/?ref=${referralCode}` : "";
        const shareMessage = referralCode ? buildShareMessage(referralCode) : "";

        const handleShareWhatsApp = useCallback(() => {
            if (!referralCode) return;
            window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, "_blank");
        }, [referralCode, shareMessage]);

        const handleShareTelegram = useCallback(() => {
            if (!referralCode) return;
            window.open(
                `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
                    "🎓 Free AI tutor for students — use my link and we both get Premium:"
                )}`,
                "_blank"
            );
        }, [referralCode, shareUrl]);

        const handleCopy = useCallback(async () => {
            if (!referralCode) return;
            try {
                await navigator.clipboard.writeText(shareMessage);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch { /* ignore */ }
        }, [referralCode, shareMessage]);

        const handleShareNative = useCallback(async () => {
            if (!referralCode) return;
            const text = "🎓 Use my link and we BOTH get FREE Premium:";
            if (navigator.canShare) {
                const file = await loadShareImageFile();
                if (file && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: "Medrae — free AI tutor for students",
                            text: `${text}\n${shareUrl}`,
                        });
                        return;
                    } catch { /* cancelled */ }
                }
            }
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: "Medrae — free AI tutor for students",
                        text,
                        url: shareUrl,
                    });
                    return;
                } catch { /* cancelled */ }
            }
            handleCopy();
        }, [referralCode, shareUrl, handleCopy]);

        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

                <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
                    {/* Header — violet gradient */}
                    <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-5 relative">
                        <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="absolute top-3 right-3 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div className="relative">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur px-2 py-1 rounded-xl text-white mb-3">
                                <Flame size={11} /> Limited reward
                            </span>

                            <h3 className="text-xl font-black text-white leading-tight">
                                Get <span className="text-yellow-300">FREE Premium</span>{" "}
                                for every friend
                            </h3>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                        {/* Reward math */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-center">
                                <p className="text-3xl font-black text-violet-600 dark:text-violet-400 leading-none">+2</p>
                                <p className="text-[10px] font-bold uppercase tracking-wide mt-1 text-slate-500 dark:text-slate-400">
                                    Days for you
                                </p>
                            </div>
                            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-center">
                                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none">+1</p>
                                <p className="text-[10px] font-bold uppercase tracking-wide mt-1 text-slate-500 dark:text-slate-400">
                                    Day for them
                                </p>
                            </div>
                        </div>

                        {/* Why it stacks */}
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 space-y-2">
                            <div className="flex items-start gap-2">
                                <Clock className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                    Premium <strong>stacks</strong> — 5 friends = 10 days free
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <BookOpen className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                    More days = more practice questions &amp; analytics
                                </p>
                            </div>
                        </div>

                        {/* Live stats */}
                        {referralStats && referralStats.invites > 0 && (
                            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 flex items-center justify-center gap-4 text-[11px] font-bold text-slate-900 dark:text-white">
                                <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3 text-emerald-600" />
                                    {referralStats.invites} joined
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">·</span>
                                <span className="flex items-center gap-1">
                                    <Gift className="w-3 h-3 text-violet-600" />
                                    {referralStats.daysEarned} days earned
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="p-5 pt-3 space-y-2">
                        <button
                            onClick={handleShareWhatsApp}
                            disabled={!referralCode}
                            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
                        >
                            <Share2 size={16} />
                            Share on WhatsApp
                        </button>

                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={handleShareTelegram}
                                disabled={!referralCode}
                                className="h-11 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] transition-transform disabled:opacity-40"
                            >
                                <Send size={14} />
                                Telegram
                            </button>
                            <button
                                onClick={handleShareNative}
                                disabled={!referralCode}
                                className="h-11 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] transition-transform disabled:opacity-40"
                            >
                                <Flame size={14} />
                                More
                            </button>
                            <button
                                onClick={handleCopy}
                                disabled={!referralCode}
                                className="h-11 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] transition-transform disabled:opacity-40"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? "Copied" : "Copy"}
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full text-center text-[11px] font-bold text-slate-400 py-1"
                        >
                            Maybe later
                        </button>
                    </div>
                </div>
            </div>
        );
    }
);
ReferralShareModal.displayName = "ReferralShareModal";

// ============================================
// 🎯 MAIN WELCOME MODAL
// ============================================

const StreakWelcomeModal = memo(
    ({
        streak,
        bestStreak,
        isOnline,
        pendingCount,
        hasReferral,
        referralStats,
        onClose,
        onShareFeeling,
        onViewCommunity,
        onResuscitateClick,
        onOpenReferral,
    }: {
        streak: number;
        bestStreak: number;
        isOnline: boolean;
        pendingCount: number;
        hasReferral: boolean;
        referralStats?: ReferralStats | null;
        onClose: () => void;
        onShareFeeling: () => void;
        onViewCommunity: () => void;
        onResuscitateClick: () => void;
        onOpenReferral: () => void;
    }) => {
        const message = ENCOURAGEMENT[streak % ENCOURAGEMENT.length];
        const canResuscitate = bestStreak > streak && streak > 0;

        return (
            <div className="fixed inset-0 z-[99998] flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />

                <div className="relative w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="absolute top-3 right-3 z-10 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={18} />
                    </button>

                    {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

                    {/* Body */}
                    <div className="px-6 pt-8 pb-5 text-center">
                        <div className="inline-flex items-center justify-center gap-2 mb-2">
                            <Flame className="w-7 h-7 text-amber-500" />
                            <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                                {streak}
                            </span>
                        </div>

                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            {streak === 1 ? "day" : "days"} in a row
                        </p>

                        <p className="mt-3 text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                            {message}
                        </p>

                        {bestStreak > 0 && (
                            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                <Trophy size={12} className="text-amber-500" />
                                Best: {bestStreak} days
                            </div>
                        )}

                        {canResuscitate && (
                            <button
                                onClick={onResuscitateClick}
                                className="mt-5 w-full py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                            >
                                <RefreshCw size={15} />
                                Restore your best streak
                            </button>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="px-6 pb-6 space-y-2">
                        {/* 🎁 REFERRAL CTA */}
                        {hasReferral && (
                            <button
                                onClick={onOpenReferral}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold text-sm flex items-center justify-between px-4 active:scale-[0.98] transition-transform"
                            >
                                <span className="flex items-center gap-2">
                                    <Gift size={16} />
                                    Share &amp; earn Premium
                                </span>
                                <span className="text-[11px] font-black bg-white/20 backdrop-blur px-2 py-1 rounded-lg">
                                    +2 days
                                </span>
                            </button>
                        )}

                        {/* Primary — share feeling */}
                        <button
                            onClick={onShareFeeling}
                            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                        >
                            <Send size={15} />
                            Share how you feel
                        </button>

                        {/* Tertiary — community */}
                        <button
                            onClick={onViewCommunity}
                            className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-colors"
                        >
                            <Users size={15} />
                            See what others feel
                        </button>
                    </div>

                    <div className="px-6 pb-5">
                        <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
                            <Sparkles size={10} />
                            One check-in a day. That's it.
                        </p>
                    </div>
                </div>
            </div>
        );
    }
);
StreakWelcomeModal.displayName = "StreakWelcomeModal";

// ============================================
// 💬 COMMUNITY FEED
// ============================================

const CommunityFeedModal = memo(
    ({
        messages,
        isLoading,
        isOnline,
        pendingCount,
        onClose,
        onLike,
        onShareFeeling,
    }: {
        messages: StudentMessage[];
        isLoading: boolean;
        isOnline: boolean;
        pendingCount: number;
        onClose: () => void;
        onLike: (id: string) => void;
        onShareFeeling: () => void;
    }) => {
        return (
            <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

                <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Community pulse
                            </h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Real feelings from real students
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                        {isLoading && messages.length === 0 && (
                            <>
                                {[0, 1, 2].map((i) => (
                                    <div
                                        key={i}
                                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 animate-pulse"
                                    >
                                        <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
                                        <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                                        <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
                                    </div>
                                ))}
                            </>
                        )}

                        {!isLoading && messages.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    No messages yet. Be the first.
                                </p>
                            </div>
                        )}

                        {messages.map((msg) => {
                            const cfg = EMOTION_CONFIG[msg.emotion_type] ?? EMOTION_CONFIG.motivated;
                            return (
                                <div
                                    key={msg.id}
                                    className={`p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 ${msg.pending ? "opacity-60" : ""
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">{cfg.emoji}</span>
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                            {msg.display_name}
                                        </span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
                                            {msg.pending
                                                ? "sending..."
                                                : new Date(msg.created_at).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                        </span>
                                    </div>

                                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed break-words">
                                        {msg.message}
                                    </p>

                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 dark:text-slate-500">
                                            {cfg.label}
                                        </span>
                                        <button
                                            onClick={() => onLike(msg.id)}
                                            disabled={msg.pending}
                                            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                                        >
                                            ♥ {msg.likes_count || 0}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={onShareFeeling}
                            className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                        >
                            <Send size={15} />
                            Share your feeling
                        </button>
                    </div>
                </div>
            </div>
        );
    }
);
CommunityFeedModal.displayName = "CommunityFeedModal";

// ============================================
// ✍️ POST MODAL
// ============================================

const EmotionPostModal = memo(
    ({
        isOpen,
        isOnline,
        onClose,
        onSubmit,
    }: {
        isOpen: boolean;
        isOnline: boolean;
        onClose: () => void;
        onSubmit: (message: string, emotion: EmotionType, isAnonymous: boolean) => void;
    }) => {
        const [message, setMessage] = useState("");
        const [selectedEmotion, setSelectedEmotion] = useState<EmotionType>("motivated");
        const [isAnonymous, setIsAnonymous] = useState(false);
        const [isSubmitting, setIsSubmitting] = useState(false);

        const emotionOptions = Object.entries(EMOTION_CONFIG) as [
            EmotionType,
            typeof EMOTION_CONFIG[EmotionType]
        ][];

        const handleSubmit = useCallback(async () => {
            if (!message.trim()) return;
            setIsSubmitting(true);
            try {
                await onSubmit(message.trim(), selectedEmotion, isAnonymous);
                setMessage("");
                onClose();
            } catch (error) {
                console.error("Error posting:", error);
            } finally {
                setIsSubmitting(false);
            }
        }, [message, selectedEmotion, isAnonymous, onSubmit, onClose]);

        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

                <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            How are you feeling?
                        </h3>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {!isOnline && (
                        <div className="mb-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-start gap-2">
                            <WifiOff size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
                            <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                                You're offline. This will post automatically when you reconnect.
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-5 gap-1.5 mb-4">
                        {emotionOptions.map(([key, cfg]) => (
                            <button
                                key={key}
                                onClick={() => setSelectedEmotion(key)}
                                className={`p-2 rounded-xl text-center transition-all ${selectedEmotion === key
                                    ? "bg-amber-50 dark:bg-amber-950/30 ring-2 ring-amber-500"
                                    : "hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}
                            >
                                <div className="text-xl">{cfg.emoji}</div>
                                <div className="text-[9px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                    {cfg.label.slice(0, 4)}
                                </div>
                            </button>
                        ))}
                    </div>

                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Say it in your own words..."
                        className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                        rows={3}
                        maxLength={200}
                    />
                    <div className="text-right text-[10px] text-slate-400 mt-1">
                        {message.length}/200
                    </div>

                    <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            className="w-4 h-4 rounded accent-amber-500"
                        />
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                            Post anonymously
                        </span>
                    </label>

                    <button
                        onClick={handleSubmit}
                        disabled={!message.trim() || isSubmitting}
                        className="w-full mt-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                        {isSubmitting
                            ? "Posting..."
                            : isOnline
                                ? "Share feeling"
                                : "Save for later"}
                    </button>
                </div>
            </div>
        );
    }
);
EmotionPostModal.displayName = "EmotionPostModal";

// ============================================
// 🏠 MAIN COMPONENT
// ============================================

export default function StreakCandleWelcome() {
    const user = useUser();
    const isOnline = useOnlineStatus();

    const initialStreak = (() => {
        try {
            const raw = safeGetItem(STREAK_CACHE_KEY);
            if (!raw) return 0;
            const parsed = JSON.parse(raw);
            if (parsed.date === todayStr() && typeof parsed.streakValue === "number") {
                return parsed.streakValue;
            }
        } catch { }
        return 0;
    })();

    const initialBestStreak = (() => {
        try {
            const raw = safeGetItem(BEST_STREAK_CACHE_KEY);
            if (!raw) return 0;
            const parsed = JSON.parse(raw);
            if (parsed.date === todayStr() && typeof parsed.bestValue === "number") {
                return parsed.bestValue;
            }
        } catch { }
        return 0;
    })();

    const [streak, setStreak] = useState(initialStreak);
    const [bestStreak, setBestStreak] = useState(initialBestStreak);
    const [showWelcome, setShowWelcome] = useState(false);
    const [showCommunity, setShowCommunity] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);
    const [showReferralModal, setShowReferralModal] = useState(false);
    const [showResuscitation, setShowResuscitation] = useState(false);
    const [resuscitationData, setResuscitationData] = useState({
        highestStreak: 0,
        currentStreak: 0,
    });

    // ─── Referral state ───
    const [referralCode, setReferralCode] = useState<string | null>(null);
    const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);

    const [messages, setMessages] = useState<StudentMessage[]>(() => {
        const cached = readCachedMessages();
        return cached && cached.length > 0 ? cached : DEFAULT_MESSAGES;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isReady, setIsReady] = useState(() => initialStreak > 0);
    const [pendingCount, setPendingCount] = useState(0);

    const { isProcessing, result, setResult } = useResuscitationLink();
    const hasFetchedStreak = useRef(false);
    const hasFetchedMessages = useRef(false);
    const mounted = useRef(true);
    const wasOnlineRef = useRef(isOnline);
    const flushingRef = useRef(false);

    // ─── Session tracking ───
    const getSessionId = useCallback(() => {
        let sessionId = safeGetSessionItem("emotion_checkin_session");
        if (!sessionId) {
            sessionId = Date.now().toString() + "-" + Math.random().toString(36).slice(2, 9);
            safeSetSessionItem("emotion_checkin_session", sessionId);
        }
        return sessionId;
    }, []);

    const markShownThisSession = useCallback(() => {
        const sessionId = getSessionId();
        if (sessionId) safeSetSessionItem("emotion_checkin_shown", sessionId);
    }, [getSessionId]);

    const saveStreakToCache = useCallback((streakValue: number, bestValue?: number) => {
        safeSetItem(STREAK_CACHE_KEY, JSON.stringify({ streakValue, date: todayStr() }));
        if (typeof bestValue === "number") {
            safeSetItem(BEST_STREAK_CACHE_KEY, JSON.stringify({ bestValue, date: todayStr() }));
        }
    }, []);

    // ─── Fetch referral data ───
    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const [code, stats] = await Promise.all([
                    getMyReferralCode(user.id),
                    getMyReferralStats(user.id),
                ]);
                if (cancelled) return;
                setReferralCode(code);
                setReferralStats(stats);
            } catch { /* silent */ }
        })();
        return () => { cancelled = true; };
    }, [user?.id]);

    // ─── Fetch streak ───
    const fetchStreakData = useCallback(async () => {
        if (!user?.id) return;
        if (!quickOnlineCheck()) return;
        const reachable = await realReachabilityCheck(1500);
        if (!reachable) return;

        const withTimeout = <T,>(p: PromiseLike<T>, ms: number): Promise<T> =>
            new Promise<T>((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error("timeout")), ms);
                Promise.resolve(p).then(
                    (v) => { clearTimeout(timer); resolve(v); },
                    (e) => { clearTimeout(timer); reject(e); }
                );
            });

        try {
            const primary = supabase
                .from("user_streak_summary")
                .select("current_streak, best_streak")
                .eq("user_id", user.id)
                .single();

            const { data, error } = await withTimeout(primary, FETCH_TIMEOUT_MS);

            if (error) {
                const fallback = supabase
                    .from("login_activity")
                    .select("streak, best_streak")
                    .eq("user_id", user.id)
                    .order("login_date", { ascending: false })
                    .limit(1);

                const { data: fb, error: fbErr } = await withTimeout(fallback, FETCH_TIMEOUT_MS);
                if (!fbErr && fb && fb.length > 0) {
                    const cs = fb[0].streak || 0;
                    const cb = fb[0].best_streak || cs;
                    if (mounted.current) {
                        setStreak(cs);
                        setBestStreak(cb);
                        saveStreakToCache(cs, cb);
                    }
                }
            } else if (data) {
                const cs = data.current_streak || 0;
                const cb = data.best_streak || cs;
                if (mounted.current) {
                    setStreak(cs);
                    setBestStreak(cb);
                    saveStreakToCache(cs, cb);
                }
            }
        } catch {
            console.warn("Streak fetch skipped");
        }
    }, [user?.id, saveStreakToCache]);

    // ─── Fetch messages ───
    const fetchMessages = useCallback(async () => {
        const cached = readCachedMessages();
        if (cached && cached.length > 0) {
            setMessages(cached);
            setIsLoading(false);
        } else {
            if (!quickOnlineCheck()) { setIsLoading(false); return; }
            setIsLoading(true);
        }

        const reachable = await realReachabilityCheck(1500);
        if (!reachable) { setIsLoading(false); return; }

        const withTimeout = <T,>(p: PromiseLike<T>, ms: number): Promise<T> =>
            new Promise<T>((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error("timeout")), ms);
                Promise.resolve(p).then(
                    (v) => { clearTimeout(timer); resolve(v); },
                    (e) => { clearTimeout(timer); reject(e); }
                );
            });

        try {
            const primary = supabase
                .from("emotion_messages_with_profiles")
                .select("*")
                .limit(20);

            const { data, error } = await withTimeout(primary, FETCH_TIMEOUT_MS);

            if (error) {
                const fallback = supabase
                    .from("student_messages")
                    .select(`*, profiles:user_id (name, avatar_url)`)
                    .limit(20)
                    .order("created_at", { ascending: false });

                const { data: dd, error: de } = await withTimeout(fallback, FETCH_TIMEOUT_MS);
                if (de) throw de;

                if (dd && dd.length > 0) {
                    const formatted: StudentMessage[] = dd.map((msg: any) => ({
                        id: msg.id,
                        user_id: msg.user_id,
                        display_name: msg.is_anonymous ? "Anonymous Student" : msg.profiles?.name || "Student",
                        message: msg.message,
                        emotion_type: msg.emotion_type,
                        is_anonymous: msg.is_anonymous,
                        likes_count: msg.likes_count || 0,
                        created_at: msg.created_at,
                        avatar_url: msg.profiles?.avatar_url || null,
                    }));
                    if (mounted.current) {
                        setMessages(formatted);
                        writeCachedMessages(formatted);
                    }
                }
                return;
            }

            if (data && data.length > 0 && mounted.current) {
                setMessages(data);
                writeCachedMessages(data);
            }
        } catch {
            console.warn("Message fetch skipped");
        } finally {
            if (mounted.current) setIsLoading(false);
        }
    }, []);

    // ─── Flush queue ───
    const flushQueue = useCallback(async () => {
        if (flushingRef.current) return;
        if (!user?.id) return;
        if (!quickOnlineCheck()) return;
        const reachable = await realReachabilityCheck(1500);
        if (!reachable) return;

        flushingRef.current = true;
        try {
            const likeQueue = readQueuedLikes();
            if (likeQueue.length > 0) {
                const remaining: QueuedLike[] = [];
                for (const item of likeQueue) {
                    try {
                        await supabase.rpc("emotion_increment_likes", { message_id: item.messageId });
                    } catch {
                        remaining.push(item);
                    }
                }
                writeQueuedLikes(remaining);
            }

            const postQueue = readQueuedPosts();
            if (postQueue.length > 0) {
                const remaining: QueuedPost[] = [];
                for (const item of postQueue) {
                    try {
                        const { data, error } = await supabase
                            .from("student_messages")
                            .insert([{
                                user_id: item.user_id,
                                message: item.message,
                                emotion_type: item.emotion_type,
                                is_anonymous: item.is_anonymous,
                            }])
                            .select()
                            .single();

                        if (error) throw error;

                        if (data) {
                            setMessages((prev) => {
                                const next = prev.map((m) =>
                                    m.id === item.localId
                                        ? { ...m, id: data.id, created_at: data.created_at, pending: false }
                                        : m
                                );
                                writeCachedMessages(next.filter((m) => !m.pending));
                                return next;
                            });
                        }
                    } catch {
                        remaining.push(item);
                    }
                }
                writeQueuedPosts(remaining);
            }

            const total = readQueuedPosts().length + readQueuedLikes().length;
            if (mounted.current) setPendingCount(total);
            if (total === 0) fetchMessages();
        } finally {
            flushingRef.current = false;
        }
    }, [user?.id, fetchMessages]);

    // ─── Restore queued state ───
    useEffect(() => {
        const posts = readQueuedPosts();
        const likes = readQueuedLikes();
        setPendingCount(posts.length + likes.length);

        if (posts.length > 0) {
            setMessages((prev) => {
                const pendingMessages: StudentMessage[] = posts.map((p) => ({
                    id: p.localId,
                    user_id: p.user_id,
                    display_name: p.is_anonymous ? "Anonymous Student" : "You",
                    message: p.message,
                    emotion_type: p.emotion_type,
                    is_anonymous: p.is_anonymous,
                    likes_count: 0,
                    created_at: p.created_at,
                    avatar_url: null,
                    pending: true,
                }));
                const existingIds = new Set(prev.map((m) => m.id));
                const merged = [...pendingMessages.filter((p) => !existingIds.has(p.id)), ...prev];
                return merged.slice(0, 20);
            });
        }
    }, []);

    // ─── Like handler ───
    const handleLike = useCallback(async (messageId: string) => {
        if (
            messageId.startsWith("local-") ||
            messageId.startsWith("default-") ||
            messageId.startsWith("note-")
        ) return;

        setMessages((prev) => {
            const next = prev.map((m) =>
                m.id === messageId ? { ...m, likes_count: (m.likes_count || 0) + 1 } : m
            );
            writeCachedMessages(next.filter((m) => !m.pending));
            return next;
        });

        if (!quickOnlineCheck()) {
            const q = readQueuedLikes();
            q.push({ messageId, queuedAt: Date.now() });
            writeQueuedLikes(q);
            setPendingCount(readQueuedPosts().length + q.length);
            return;
        }

        try {
            await supabase.rpc("emotion_increment_likes", { message_id: messageId });
        } catch {
            const q = readQueuedLikes();
            q.push({ messageId, queuedAt: Date.now() });
            writeQueuedLikes(q);
            setPendingCount(readQueuedPosts().length + q.length);
        }
    }, []);

    // ─── Post handler ───
    const handlePostMessage = useCallback(
        async (message: string, emotion: EmotionType, isAnonymous: boolean) => {
            if (!user?.id) return;

            const optimisticId = `local-${Date.now()}`;
            const optimistic: StudentMessage = {
                id: optimisticId,
                user_id: user.id,
                display_name: isAnonymous ? "Anonymous Student" : "You",
                message,
                emotion_type: emotion,
                is_anonymous: isAnonymous,
                likes_count: 0,
                created_at: new Date().toISOString(),
                avatar_url: null,
                pending: true,
            };

            setMessages((prev) => {
                const next = [optimistic, ...prev].slice(0, 20);
                writeCachedMessages(next.filter((m) => !m.pending));
                return next;
            });

            const queueIt = () => {
                const q = readQueuedPosts();
                q.push({
                    localId: optimisticId,
                    user_id: user.id,
                    message,
                    emotion_type: emotion,
                    is_anonymous: isAnonymous,
                    created_at: optimistic.created_at,
                });
                writeQueuedPosts(q);
                setPendingCount(q.length + readQueuedLikes().length);
            };

            if (!quickOnlineCheck()) {
                queueIt();
                setShowPostModal(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("student_messages")
                    .insert([{
                        user_id: user.id,
                        message,
                        emotion_type: emotion,
                        is_anonymous: isAnonymous,
                    }])
                    .select()
                    .single();

                if (error) throw error;

                if (data) {
                    setMessages((prev) => {
                        const next = prev.map((m) =>
                            m.id === optimisticId
                                ? { ...m, id: data.id, created_at: data.created_at, pending: false }
                                : m
                        );
                        writeCachedMessages(next.filter((m) => !m.pending));
                        return next;
                    });
                }
                setShowPostModal(false);
            } catch {
                queueIt();
                setShowPostModal(false);
            }
        },
        [user?.id]
    );

    // ─── Load streak ───
    useEffect(() => {
        mounted.current = true;
        if (!user?.id) {
            setIsReady(true);
            return () => { mounted.current = false; };
        }
        if (initialStreak > 0) setIsReady(true);
        if (hasFetchedStreak.current) {
            setIsReady(true);
            return () => { mounted.current = false; };
        }
        hasFetchedStreak.current = true;

        fetchStreakData().finally(() => {
            if (mounted.current) setIsReady(true);
        });

        const emergency = setTimeout(() => {
            if (mounted.current) setIsReady(true);
        }, 4000);

        return () => {
            mounted.current = false;
            clearTimeout(emergency);
        };
    }, [user?.id, initialStreak, fetchStreakData]);

    useEffect(() => {
        const t = setTimeout(() => setIsReady(true), 4000);
        return () => clearTimeout(t);
    }, []);

    // ─── Auto-flush online ───
    useEffect(() => {
        if (isOnline && !wasOnlineRef.current) {
            flushQueue();
            if (user?.id) {
                fetchStreakData();
                if (hasFetchedMessages.current) fetchMessages();
            }
        }
        wasOnlineRef.current = isOnline;
    }, [isOnline, user?.id, flushQueue, fetchStreakData, fetchMessages]);

    useEffect(() => {
        if (isOnline && user?.id) flushQueue();
    }, [isOnline, user?.id, flushQueue]);

    // ─── Streak death check ───
    // ─── Streak death check ───
    useEffect(() => {
        if (!user?.id || !isReady) return;
        if (!isOnline) return;
        if (new Date().getDay() !== 3) return;   // 👈 add this


        let cancelled = false;

        const check = async () => {
            try {
                const { data, error } = await supabase
                    .from("login_activity")
                    .select("streak, best_streak, login_date")
                    .eq("user_id", user.id)
                    .order("login_date", { ascending: false })
                    .limit(1);

                if (error || cancelled) return;
                if (data && data.length > 0) {
                    const info = data[0];
                    const today = todayStr();
                    const lastLogin = info.login_date?.split("T")[0];

                    if (info.best_streak > bestStreak && mounted.current) {
                        setBestStreak(info.best_streak);
                    }

                    if (lastLogin && lastLogin !== today) {
                        const y = new Date();
                        y.setDate(y.getDate() - 1);
                        const yStr = y.toISOString().split("T")[0];

                        if (lastLogin !== yStr && info.streak > 0 && mounted.current) {
                            setResuscitationData({
                                highestStreak: info.best_streak || info.streak,
                                currentStreak: info.streak,
                            });
                            setShowResuscitation(true);
                        }
                    }
                }
            } catch { /* silent */ }
        };

        check();
        return () => { cancelled = true; };
    }, [user?.id, isReady, isOnline, bestStreak]);

    // ─── Resuscitate ───
    const handleResuscitate = useCallback(
        async (sharedWith: string[]) => {
            if (!user?.id) return false;
            try {
                const { data, error } = await supabase.rpc("resuscitate_streak", {
                    user_id_param: user.id,
                });
                if (error) throw error;
                if (!data || !data[0]?.success) return false;

                await supabase.rpc("record_streak_resuscitation", {
                    user_id_param: user.id,
                    shared_with: sharedWith,
                });

                const restored = data[0].restored_streak;
                setStreak(restored);
                setBestStreak(restored);
                saveStreakToCache(restored, restored);
                setResuscitationData({ highestStreak: restored, currentStreak: restored });

                safeRemoveItem(`streak_${user.id}`);
                safeRemoveItem(`best_streak_${user.id}`);

                if (typeof window !== "undefined") {
                    window.dispatchEvent(
                        new CustomEvent("streak-updated", { detail: { streak: restored } })
                    );
                }

                setShowResuscitation(false);
                return true;
            } catch (e) {
                console.error("Resuscitate error:", e);
                return false;
            }
        },
        [user?.id, saveStreakToCache]
    );

    // ─── Show welcome modal (Wednesday only, max 2 times per Wednesday) ───
    useEffect(() => {
        if (showResuscitation) return;
        if (!isReady) return;
        if (streak === 0) return;

        // Only on Wednesday (0=Sun, 3=Wed)
        if (new Date().getDay() !== 3) return;

        // 👇 Persistent per-Wednesday tracking
        const wednesdayKey = `welcome_wed_${todayStr()}`;  // e.g. welcome_wed_2026-10-07
        const shownCount = parseInt(safeGetItem(wednesdayKey) || "0", 10);

        // 👇 Cap at 2 shows per Wednesday
        if (shownCount >= 2) return;

        const timer = setTimeout(() => {
            // Increment counter BEFORE showing (avoid race conditions)
            safeSetItem(wednesdayKey, String(shownCount + 1));

            setShowWelcome(true);
            if (!hasFetchedMessages.current) {
                hasFetchedMessages.current = true;
                fetchMessages();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [isReady, streak, fetchMessages, showResuscitation]);
    // ─── Handlers ───
    const handleOpenResuscitation = useCallback(() => {
        setShowWelcome(false);
        const fetchLatest = async () => {
            if (!user?.id) return;
            try {
                safeRemoveItem(`streak_${user.id}`);
                safeRemoveItem(`best_streak_${user.id}`);
                if (!quickOnlineCheck()) {
                    setShowResuscitation(true);
                    return;
                }
                const { data, error } = await supabase
                    .from("login_activity")
                    .select("streak, best_streak")
                    .eq("user_id", user.id)
                    .order("login_date", { ascending: false })
                    .limit(1);
                if (!error && data && data.length > 0) {
                    const cs = data[0].streak || 0;
                    const cb = data[0].best_streak || cs;
                    setResuscitationData({ highestStreak: cb, currentStreak: cs });
                    setStreak(cs);
                    setBestStreak(cb);
                }
            } catch { /* silent */ }
            setShowResuscitation(true);
        };
        fetchLatest();
    }, [user?.id]);

    const handleCloseWelcome = useCallback(() => setShowWelcome(false), []);
    const handleOpenCommunity = useCallback(() => {
        setShowWelcome(false);
        setShowCommunity(true);
    }, []);
    const handleCloseCommunity = useCallback(() => setShowCommunity(false), []);
    const handleOpenPost = useCallback(() => {
        setShowCommunity(false);
        setShowPostModal(true);
    }, []);
    const handleClosePost = useCallback(() => setShowPostModal(false), []);

    // ─── Referral handlers ───
    const handleOpenReferral = useCallback(() => {
        setShowWelcome(false);
        setShowReferralModal(true);
    }, []);
    const handleCloseReferral = useCallback(() => setShowReferralModal(false), []);

    useEffect(() => {
        if (result?.success) fetchStreakData();
    }, [result, fetchStreakData]);

    return (
        <>
            {showWelcome && (
                <StreakWelcomeModal
                    streak={streak}
                    bestStreak={bestStreak}
                    isOnline={isOnline}
                    pendingCount={pendingCount}
                    hasReferral={!!referralCode}
                    referralStats={referralStats}
                    onClose={handleCloseWelcome}
                    onShareFeeling={handleOpenPost}
                    onViewCommunity={handleOpenCommunity}
                    onResuscitateClick={handleOpenResuscitation}
                    onOpenReferral={handleOpenReferral}
                />
            )}

            {showCommunity && (
                <CommunityFeedModal
                    messages={messages}
                    isLoading={isLoading}
                    isOnline={isOnline}
                    pendingCount={pendingCount}
                    onClose={handleCloseCommunity}
                    onLike={handleLike}
                    onShareFeeling={handleOpenPost}
                />
            )}

            {showReferralModal && (
                <ReferralShareModal
                    isOpen={showReferralModal}
                    onClose={handleCloseReferral}
                    referralCode={referralCode}
                    referralStats={referralStats}
                />
            )}

            {showPostModal && (
                <EmotionPostModal
                    isOpen={showPostModal}
                    isOnline={isOnline}
                    onClose={handleClosePost}
                    onSubmit={handlePostMessage}
                />
            )}

            {showResuscitation && (
                <StreakResuscitationModal
                    key={`${resuscitationData.highestStreak}-${resuscitationData.currentStreak}-${Date.now()}`}
                    highestStreak={resuscitationData.highestStreak}
                    currentStreak={resuscitationData.currentStreak}
                    isOpen={showResuscitation}
                    onClose={() => setShowResuscitation(false)}
                    onResuscitate={handleResuscitate}
                    isDarkMode={false}
                />
            )}

            {isProcessing && (
                <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-amber-500 mx-auto" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-4">
                            Restoring your streak...
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Just a moment.
                        </p>
                    </div>
                </div>
            )}

            {result && !isProcessing && (
                <div
                    className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => setResult(null)}
                >
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full mx-4 text-center">
                        <div className={`text-5xl mb-3 ${result.success ? "" : ""}`}>
                            {result.success ? "🎉" : "❌"}
                        </div>
                        <h3 className={`text-lg font-bold ${result.success ? "text-emerald-600" : "text-red-600"}`}>
                            {result.success ? "Streak restored" : "Couldn't restore"}
                        </h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            {result.message}
                        </p>
                        <button
                            onClick={() => {
                                setResult(null);
                                if (typeof window !== "undefined") window.location.href = "/";
                            }}
                            className="mt-4 w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors active:scale-[0.98]"
                        >
                            {result.success ? "Nice" : "Try again"}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}