"use client";

import { useEffect, useState, useCallback, memo, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { X, Heart, User, UserCircle2, Send, Sparkles, Flame, Trophy, RefreshCw, Users, WifiOff } from "lucide-react";
import { StreakResuscitationModal } from "@/components/StreakResuscitation/StreakResuscitation";
import { useResuscitationLink } from '@/hooks/useResuscitationLink';

// ============================================
// TYPES & CONSTANTS
// ============================================

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

type EmotionType = 'motivated' | 'stressed' | 'happy' | 'focused' | 'tired' | 'confused' | 'excited' | 'calm' | 'anxious' | 'grateful';

const EMOTION_CONFIG: Record<EmotionType, { emoji: string; color: string; bgColor: string; label: string }> = {
    motivated: { emoji: '🔥', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.15)', label: 'Motivated' },
    stressed: { emoji: '😰', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)', label: 'Stressed' },
    happy: { emoji: '😊', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)', label: 'Happy' },
    focused: { emoji: '🎯', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)', label: 'Focused' },
    tired: { emoji: '😴', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.15)', label: 'Tired' },
    confused: { emoji: '🤔', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)', label: 'Confused' },
    excited: { emoji: '✨', color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.15)', label: 'Excited' },
    calm: { emoji: '🌊', color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.15)', label: 'Calm' },
    anxious: { emoji: '😥', color: '#f43f5e', bgColor: 'rgba(244, 63, 94, 0.15)', label: 'Anxious' },
    grateful: { emoji: '🙏', color: '#14b8a6', bgColor: 'rgba(20, 184, 166, 0.15)', label: 'Grateful' }
};

const STREAK_MESSAGES = [
    "Your flame is burning bright!",
    "Day by day, you're getting stronger!",
    "Consistency is key, keep going!",
    "Your journey is inspiring!",
    "Every day counts, and so do you!",
    "The fire of knowledge grows within you!",
    "You're building something amazing!",
    "Keep the momentum going!",
];

const backgroundImages = [
    "high1.png",
    "high2.png",
    "high3.png",
    "high4.png",
    "high5.png",
    "high6.png",
];

// ============================================
// CACHE KEYS & HELPERS
// ============================================

const MESSAGES_CACHE_KEY = 'emotion_messages_cache_v3';
const MESSAGES_CACHE_TTL_MS = 30 * 60 * 1000;
const STREAK_CACHE_KEY = 'streak_cache';
const BEST_STREAK_CACHE_KEY = 'best_streak_cache';
const QUEUED_POSTS_KEY = 'emotion_queued_posts_v1';
const QUEUED_LIKES_KEY = 'emotion_queued_likes_v1';
const FETCH_TIMEOUT_MS = 5000;

const DEFAULT_MESSAGES: StudentMessage[] = [
    {
        id: 'default-1',
        user_id: 'system',
        display_name: 'Medrae Nursing Community',
        message: 'Be the first to share how you are feeling today.',
        emotion_type: 'motivated',
        is_anonymous: true,
        likes_count: 0,
        created_at: new Date().toISOString(),
        avatar_url: null
    }
];

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

const todayStr = () => new Date().toISOString().split('T')[0];

const readCachedMessages = (): StudentMessage[] | null => {
    try {
        const raw = safeGetItem(MESSAGES_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.data)) return null;
        if (Date.now() - (parsed.ts || 0) > MESSAGES_CACHE_TTL_MS) return null;
        if (parsed.data.length === 0) return null;
        return parsed.data as StudentMessage[];
    } catch {
        return null;
    }
};

const writeCachedMessages = (msgs: StudentMessage[]) => {
    if (!msgs || msgs.length === 0) return;
    safeSetItem(MESSAGES_CACHE_KEY, JSON.stringify({ data: msgs, ts: Date.now() }));
};

// ============================================
// QUEUE STORAGE (offline posts and likes)
// ============================================

const readQueuedPosts = (): QueuedPost[] => {
    try {
        const raw = safeGetItem(QUEUED_POSTS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
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
    } catch {
        return [];
    }
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
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine !== false;
};

const realReachabilityCheck = async (timeoutMs = 1500): Promise<boolean> => {
    if (!quickOnlineCheck()) return false;

    if (_onlineCache && Date.now() - _onlineCache.ts < ONLINE_CACHE_MS) {
        return _onlineCache.value;
    }

    if (typeof fetch !== 'function') return true;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        await fetch('https://www.gstatic.com/generate_204', {
            method: 'GET',
            cache: 'no-store',
            mode: 'no-cors',
            signal: controller.signal
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

const invalidateOnlineCache = () => {
    _onlineCache = null;
};

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

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        realReachabilityCheck(1500).then((real) => {
            if (!cancelled) setIsOnline(real);
        });

        return () => {
            cancelled = true;
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
};

// ============================================
// BACKGROUND SLIDESHOW
// ============================================

const BackgroundSlideshow = memo(({ bgIndex }: { bgIndex: number }) => (
    <div className="hidden md:block md:w-1/2 relative overflow-hidden">
        {backgroundImages.map((img, index) => (
            <div
                key={index}
                className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
                style={{
                    backgroundImage: `url(/${img})`,
                    opacity: index === bgIndex ? 1 : 0
                }}
            />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40">
            <div className="absolute bottom-16 left-12 right-12 text-white space-y-4">
                <div className="inline-flex items-center gap-2 bg-amber-600/30 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase">
                    <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    Daily Check-in
                </div>
                <h1 className="text-5xl font-bold leading-tight">
                    Mindful Moment
                </h1>
                <p className="text-gray-300 text-lg max-w-md leading-relaxed">
                    Your consistency is building something extraordinary. Every day you show up, you grow stronger.
                </p>
            </div>
        </div>
    </div>
));

BackgroundSlideshow.displayName = "BackgroundSlideshow";

// ============================================
// LOADING DOTS
// ============================================

const LoadingDots = () => (
    <div className="flex gap-2 mt-4">
        {[0, 1, 2].map((i) => (
            <div
                key={i}
                className="w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-500"
                style={{
                    animation: 'bounce 1.4s ease-in-out infinite',
                    animationDelay: `${i * 0.3}s`
                }}
            />
        ))}
    </div>
);

// ============================================
// SKELETON COMPONENTS
// ============================================

const MessageSkeleton = () => (
    <div className="w-full mt-4 p-5 bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg animate-pulse">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
        </div>
        <div className="space-y-2 mb-4">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
        <div className="flex justify-between pt-3">
            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
    </div>
);

// ============================================
// OFFLINE BANNER
// ============================================

const OfflineBanner = ({ pendingCount }: { pendingCount: number }) => (
    <div className="px-6 py-2 bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center gap-2">
        <WifiOff size={14} className="text-amber-600 dark:text-amber-400" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
            {pendingCount > 0
                ? `Offline. ${pendingCount} ${pendingCount === 1 ? 'item' : 'items'} will send when you reconnect.`
                : 'Offline. Showing saved messages.'}
        </p>
    </div>
);

// ============================================
// EMOTIONAL CHECK-IN MODAL
// ============================================

const EmotionalCheckInModal = memo(({
    streak,
    bestStreak,
    messages,
    isLoadingMessages,
    isOnline,
    pendingCount,
    onClose,
    onLike,
    onShareFeeling,
    onResuscitateClick,
    bgIndex
}: {
    streak: number;
    bestStreak: number;
    messages: StudentMessage[];
    isLoadingMessages: boolean;
    isOnline: boolean;
    pendingCount: number;
    onClose: () => void;
    onLike: (id: string) => void;
    onShareFeeling: () => void;
    onResuscitateClick: () => void;
    bgIndex: number;
}) => {
    const [currentStep, setCurrentStep] = useState<'candle' | 'messages' | 'share'>('candle');
    const [currentIndex, setCurrentIndex] = useState(0);

    const streakMessage = STREAK_MESSAGES[streak % STREAK_MESSAGES.length];
    const currentMessage = useMemo(() => messages[currentIndex] || messages[0], [messages, currentIndex]);
    const config = currentMessage ? EMOTION_CONFIG[currentMessage.emotion_type as EmotionType] : EMOTION_CONFIG.motivated;

    useEffect(() => {
        if (currentStep !== 'messages' || messages.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % messages.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [currentStep, messages.length]);

    useEffect(() => {
        if (currentIndex >= messages.length) {
            setCurrentIndex(0);
        }
    }, [messages.length, currentIndex]);

    const handleNext = useCallback(() => {
        if (currentStep === 'candle') {
            setCurrentStep('messages');
        } else if (currentStep === 'messages') {
            setCurrentStep('share');
        } else {
            onClose();
        }
    }, [currentStep, onClose]);

    const handleSkip = useCallback(() => {
        onClose();
    }, [onClose]);

    // ============================================
    // STEP 1: CANDLE + STREAK
    // ============================================
    if (currentStep === 'candle') {
        return (
            <div className="flex h-screen w-full bg-white dark:bg-gray-900">
                <BackgroundSlideshow bgIndex={bgIndex} />

                <div className="w-full md:w-1/2 flex flex-col h-screen overflow-hidden bg-white/95 dark:bg-gray-800/95">
                    <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white relative shrink-0">
                        <button
                            onClick={handleSkip}
                            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="relative z-10 px-6 py-6">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-xs font-bold tracking-wider text-amber-100">
                                    Your Journey
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight font-serif">
                                Today's Check-in
                            </h2>
                        </div>
                    </div>

                    {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

                    <div className="flex-1 overflow-y-auto hide-scrollbar p-6">
                        <div className="flex flex-col items-center text-center">
                            <img
                                src="/cutee.png"
                                alt="Graduation Boy"
                                className="w-40 h-40 sm:w-48 sm:h-48 object-contain drop-shadow-lg"
                            />

                            <div className="mt-3">
                                <div className="flex items-center gap-2 justify-center">
                                    <img
                                        src="/fire-animation.gif"
                                        alt="Fire"
                                        className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
                                    />
                                    <span className="text-4xl sm:text-5xl font-extrabold text-amber-500">
                                        {streak}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {streak === 1 ? 'Day' : 'Days'} of consistency
                                </p>
                            </div>

                            {bestStreak > 0 && (
                                <div className="mt-2 flex items-center gap-2 justify-center">
                                    <Trophy size={16} className="text-amber-500" />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Best: <span className="font-bold text-amber-500">{bestStreak}</span> days
                                    </span>
                                </div>
                            )}

                            {(bestStreak > streak && streak > 0) && (
                                <button
                                    onClick={onResuscitateClick}
                                    className="mt-3 w-full max-w-xs py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-red-500 to-amber-500 text-white font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={16} />
                                    Resuscitate Your Best Streak
                                </button>
                            )}

                            <p className="mt-3 text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">
                                {streakMessage}
                            </p>

                            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                See what others are feeling today
                            </p>

                            <button
                                onClick={handleNext}
                                className="mt-5 w-full max-w-xs py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2"
                            >
                                See Community Feelings
                                <span>→</span>
                            </button>
                        </div>
                    </div>

                    <div className="px-6 py-3 shrink-0 bg-white/80 dark:bg-gray-800/80">
                        <p className="text-[10px] text-center text-slate-500 dark:text-slate-400">
                            <Sparkles className="w-3 h-3 inline mr-1" />
                            You are building more than a streak, you are building a brighter future
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // STEP 2: MESSAGES
    // ============================================
    if (currentStep === 'messages') {
        const showSkeleton = isLoadingMessages && messages.length === 0;
        const showEmpty = !isLoadingMessages && messages.length === 0;

        return (
            <div className="flex h-screen w-full bg-white dark:bg-gray-900">
                <BackgroundSlideshow bgIndex={bgIndex} />

                <div className="w-full md:w-1/2 flex flex-col h-screen overflow-hidden bg-white/95 dark:bg-gray-800/95">
                    <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white relative shrink-0">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="relative z-10 px-6 py-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg">
                                    <Users size={20} className="text-amber-100" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider text-amber-100">
                                    {showSkeleton ? 'Loading Messages' : `${messages.length} Messages`}
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight font-serif">
                                Community Pulse
                            </h2>
                            <p className="text-amber-50/80 text-sm mt-2 font-medium">
                                Real feelings from real students. Share yours too.
                            </p>
                        </div>
                    </div>

                    {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="flex flex-col items-center max-w-sm mx-auto">
                            <img
                                src="/relax.png"
                                alt="Relaxing Meditation"
                                className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-lg"
                            />

                            {showSkeleton && <MessageSkeleton />}

                            {showEmpty && (
                                <div className="w-full mt-4 p-5 bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg">
                                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                                        No messages yet. Be the first to share how you feel.
                                    </p>
                                </div>
                            )}

                            {!showSkeleton && currentMessage && (
                                <>
                                    <div className={`w-full mt-4 p-5 bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg ${currentMessage.pending ? 'opacity-70' : ''}`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            {currentMessage.is_anonymous ? (
                                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                    <UserCircle2 size={20} className="text-gray-500 dark:text-gray-400" />
                                                </div>
                                            ) : currentMessage.avatar_url ? (
                                                <img
                                                    src={currentMessage.avatar_url}
                                                    alt={currentMessage.display_name}
                                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                    <User size={18} className="text-gray-500 dark:text-gray-400" />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">
                                                    {currentMessage.display_name}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {currentMessage.pending
                                                        ? 'Sending...'
                                                        : new Date(currentMessage.created_at).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 mb-4">
                                            <span className="text-2xl flex-shrink-0">{config.emoji}</span>
                                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed break-words">
                                                "{currentMessage.message}"
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-3">
                                            <span
                                                className="text-xs px-3 py-1 rounded-full font-medium"
                                                style={{
                                                    backgroundColor: config.bgColor,
                                                    color: config.color
                                                }}
                                            >
                                                {config.label}
                                            </span>

                                            <button
                                                onClick={() => onLike(currentMessage.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group touch-manipulation"
                                            >
                                                <Heart
                                                    size={18}
                                                    className="text-gray-400 group-hover:text-red-500 transition-colors"
                                                    fill={currentMessage.likes_count > 0 ? "#ef4444" : "none"}
                                                    stroke={currentMessage.likes_count > 0 ? "#ef4444" : "currentColor"}
                                                />
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                                    {currentMessage.likes_count || 0}
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    {messages.length > 1 && (
                                        <div className="flex justify-center gap-2 mt-4">
                                            {messages.map((_, idx) => (
                                                <button
                                                    key={idx}
                                                    className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex
                                                        ? 'w-8 bg-amber-500'
                                                        : 'w-2 bg-gray-300 dark:bg-gray-600'
                                                        }`}
                                                    onClick={() => setCurrentIndex(idx)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="px-6 py-4 shrink-0 bg-white/80 dark:bg-gray-800/80">
                        <div className="space-y-2.5 max-w-sm mx-auto">
                            <button
                                onClick={handleNext}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2"
                            >
                                Share Your Feeling
                                <span>→</span>
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // STEP 3: SHARE FEELING
    // ============================================
    if (currentStep === 'share') {
        return (
            <div className="flex h-screen w-full bg-white dark:bg-gray-900">
                <BackgroundSlideshow bgIndex={bgIndex} />

                <div className="w-full md:w-1/2 flex flex-col h-screen overflow-hidden bg-white/95 dark:bg-gray-800/95">
                    <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white relative shrink-0">
                        <button
                            onClick={handleSkip}
                            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="relative z-10 px-6 py-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg">
                                    <Sparkles className="w-5 h-5 text-amber-100" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider text-amber-100">
                                    Emotional Check-in
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight font-serif">
                                How Are You Feeling?
                            </h2>
                            <p className="text-amber-50/80 text-sm mt-2 font-medium">
                                Naming your emotions reduces stress and improves focus.
                            </p>
                        </div>
                    </div>

                    {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="flex flex-col items-center text-center max-w-sm mx-auto">
                            <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                                <Sparkles size={36} className="text-amber-500" />
                            </div>

                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                                Share How You Are Feeling
                            </h3>

                            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                Emotional check-ins help you stay aware of your mental state and build emotional intelligence.
                                Studies show that naming your emotions reduces stress and improves focus.
                            </p>

                            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl w-full">
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                    <span className="font-medium">Self-talk and emotional awareness</span> are key to better studying and learning.
                                    When you acknowledge how you feel, you take the first step toward managing it effectively.
                                </p>
                            </div>

                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl w-full">
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                    <span className="font-medium">Did you know?</span> Students who regularly check in with their emotions
                                    report 40 percent less study-related anxiety and 25 percent better retention of information.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 shrink-0 bg-white/80 dark:bg-gray-800/80">
                        <div className="space-y-2.5 max-w-sm mx-auto">
                            <button
                                onClick={onShareFeeling}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2"
                            >
                                <Send size={16} />
                                Share My Feeling
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
});

EmotionalCheckInModal.displayName = "EmotionalCheckInModal";

// ============================================
// EMOTION POST MODAL
// ============================================

const EmotionPostModal = memo(({
    isOpen,
    isOnline,
    onClose,
    onSubmit
}: {
    isOpen: boolean;
    isOnline: boolean;
    onClose: () => void;
    onSubmit: (message: string, emotion: EmotionType, isAnonymous: boolean) => void;
}) => {
    const [message, setMessage] = useState('');
    const [selectedEmotion, setSelectedEmotion] = useState<EmotionType>('motivated');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;

    const emotionOptions = Object.entries(EMOTION_CONFIG) as [EmotionType, typeof EMOTION_CONFIG[EmotionType]][];

    const handleSubmit = useCallback(async () => {
        if (!message.trim()) return;
        setIsSubmitting(true);
        try {
            await onSubmit(message.trim(), selectedEmotion, isAnonymous);
            setMessage('');
            onClose();
        } catch (error) {
            console.error('Error posting message:', error);
        } finally {
            setIsSubmitting(false);
        }
    }, [message, selectedEmotion, isAnonymous, onSubmit, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Sparkles size={18} className="text-amber-500" />
                        How are you feeling?
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {!isOnline && (
                    <div className="mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-start gap-2">
                        <WifiOff size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                            You are offline. Your message will be saved and posted automatically when you reconnect.
                        </p>
                    </div>
                )}

                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Choose how you are feeling right now and share with the community
                </p>

                <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mb-4">
                    {emotionOptions.map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => setSelectedEmotion(key)}
                            className={`p-2 rounded-xl text-center transition-all touch-manipulation ${selectedEmotion === key
                                ? 'ring-2 ring-offset-2 scale-105'
                                : 'hover:scale-105'
                                }`}
                            style={{
                                backgroundColor: selectedEmotion === key ? config.bgColor : 'transparent',
                            }}
                        >
                            <div className="text-xl sm:text-2xl">{config.emoji}</div>
                            <div className="text-[8px] sm:text-[10px] font-medium text-gray-600 dark:text-gray-400 mt-0.5">
                                {config.label.slice(0, 4)}
                            </div>
                        </button>
                    ))}
                </div>

                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share how you are feeling today..."
                    className="w-full p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-sm sm:text-base resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                    rows={isMobile ? 3 : 4}
                    maxLength={200}
                />
                <div className="text-right text-xs text-gray-400 mt-1">
                    {message.length}/200
                </div>

                <div className="flex items-center gap-2 mt-3">
                    <input
                        type="checkbox"
                        id="anonymous"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />
                    <label htmlFor="anonymous" className="text-sm text-gray-600 dark:text-gray-400">
                        Post anonymously
                    </label>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || isSubmitting}
                    className="w-full mt-4 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                    {isSubmitting
                        ? 'Posting...'
                        : isOnline
                            ? 'Share Your Feeling'
                            : 'Save and Send Later'}
                </button>
            </div>
        </div>
    );
});

EmotionPostModal.displayName = "EmotionPostModal";

// ============================================
// MAIN COMPONENT
// ============================================

export default function StreakCandleWelcome() {
    const user = useUser();
    const isOnline = useOnlineStatus();

    const initialStreak = (() => {
        try {
            const raw = safeGetItem(STREAK_CACHE_KEY);
            if (!raw) return 0;
            const parsed = JSON.parse(raw);
            if (parsed.date === todayStr() && typeof parsed.streakValue === 'number') {
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
            if (parsed.date === todayStr() && typeof parsed.bestValue === 'number') {
                return parsed.bestValue;
            }
        } catch { }
        return 0;
    })();

    const [streak, setStreak] = useState(initialStreak);
    const [bestStreak, setBestStreak] = useState(initialBestStreak);
    const [showModal, setShowModal] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);
    const [showResuscitation, setShowResuscitation] = useState(false);
    const [resuscitationData, setResuscitationData] = useState<{
        highestStreak: number;
        currentStreak: number;
    }>({ highestStreak: 0, currentStreak: 0 });

    const [messages, setMessages] = useState<StudentMessage[]>(() => {
        const cached = readCachedMessages();
        return cached && cached.length > 0 ? cached : DEFAULT_MESSAGES;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isReady, setIsReady] = useState(() => initialStreak > 0);
    const [bgIndex, setBgIndex] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);

    const { isProcessing, result, setResult } = useResuscitationLink();
    const hasFetchedStreak = useRef(false);
    const hasFetchedMessages = useRef(false);
    const mounted = useRef(true);
    const wasOnlineRef = useRef(isOnline);
    const flushingRef = useRef(false);

    // ============================================
    // BACKGROUND SLIDESHOW
    // ============================================
    useEffect(() => {
        if (!showModal) return;
        const interval = setInterval(() => {
            setBgIndex((prev) => (prev + 1) % backgroundImages.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [showModal]);

    // ============================================
    // SESSION TRACKING
    // ============================================
    const getSessionId = useCallback(() => {
        let sessionId = safeGetSessionItem('emotion_checkin_session');
        if (!sessionId) {
            sessionId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
            safeSetSessionItem('emotion_checkin_session', sessionId);
        }
        return sessionId;
    }, []);

    const markShownThisSession = useCallback(() => {
        const sessionId = getSessionId();
        if (sessionId) {
            safeSetSessionItem('emotion_checkin_shown', sessionId);
        }
    }, [getSessionId]);

    const saveStreakToCache = useCallback((streakValue: number, bestValue?: number) => {
        safeSetItem(STREAK_CACHE_KEY, JSON.stringify({
            streakValue,
            date: todayStr()
        }));
        if (typeof bestValue === 'number') {
            safeSetItem(BEST_STREAK_CACHE_KEY, JSON.stringify({
                bestValue,
                date: todayStr()
            }));
        }
    }, []);

    // ============================================
    // FETCH STREAK DATA
    // ============================================
    const fetchStreakData = useCallback(async () => {
        if (!user?.id) return;
        if (!quickOnlineCheck()) return;

        const reachable = await realReachabilityCheck(1500);
        if (!reachable) return;

        const withTimeout = <T,>(promise: PromiseLike<T>, ms: number): Promise<T> => {
            return new Promise<T>((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('timeout')), ms);
                Promise.resolve(promise).then(
                    (v) => { clearTimeout(timer); resolve(v); },
                    (e) => { clearTimeout(timer); reject(e); }
                );
            });
        };

        try {
            const primary = supabase
                .from('user_streak_summary')
                .select('current_streak, best_streak')
                .eq('user_id', user.id)
                .single();

            const { data, error } = await withTimeout(primary, FETCH_TIMEOUT_MS);

            if (error) {
                const fallback = supabase
                    .from("login_activity")
                    .select("streak, best_streak")
                    .eq("user_id", user.id)
                    .order("login_date", { ascending: false })
                    .limit(1);

                const { data: fallbackData, error: fallbackError } = await withTimeout(fallback, FETCH_TIMEOUT_MS);

                if (!fallbackError && fallbackData && fallbackData.length > 0) {
                    const currentStreak = fallbackData[0].streak || 0;
                    const currentBestStreak = fallbackData[0].best_streak || currentStreak;
                    if (mounted.current) {
                        setStreak(currentStreak);
                        setBestStreak(currentBestStreak);
                        saveStreakToCache(currentStreak, currentBestStreak);
                    }
                }
            } else if (data) {
                const currentStreak = data.current_streak || 0;
                const currentBestStreak = data.best_streak || currentStreak;
                if (mounted.current) {
                    setStreak(currentStreak);
                    setBestStreak(currentBestStreak);
                    saveStreakToCache(currentStreak, currentBestStreak);
                }
            }
        } catch {
            console.warn("Streak fetch skipped (slow or offline network)");
        }
    }, [user?.id, saveStreakToCache]);

    // ============================================
    // FETCH MESSAGES
    // ============================================
    const fetchMessages = useCallback(async () => {
        const cached = readCachedMessages();
        if (cached && cached.length > 0) {
            setMessages(cached);
            setIsLoading(false);
        } else {
            if (!quickOnlineCheck()) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
        }

        const reachable = await realReachabilityCheck(1500);
        if (!reachable) {
            setIsLoading(false);
            return;
        }

        const withTimeout = <T,>(promise: PromiseLike<T>, ms: number): Promise<T> => {
            return new Promise<T>((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('timeout')), ms);
                Promise.resolve(promise).then(
                    (v) => { clearTimeout(timer); resolve(v); },
                    (e) => { clearTimeout(timer); reject(e); }
                );
            });
        };

        try {
            const primary = supabase
                .from('emotion_messages_with_profiles')
                .select('*')
                .limit(20);

            const { data, error } = await withTimeout(primary, FETCH_TIMEOUT_MS);

            if (error) {
                const fallback = supabase
                    .from('student_messages')
                    .select(`
                        *,
                        profiles:user_id (
                            name,
                            avatar_url
                        )
                    `)
                    .limit(20)
                    .order('created_at', { ascending: false });

                const { data: directData, error: directError } = await withTimeout(fallback, FETCH_TIMEOUT_MS);

                if (directError) throw directError;

                if (directData && directData.length > 0) {
                    const formattedMessages: StudentMessage[] = directData.map(msg => ({
                        id: msg.id,
                        user_id: msg.user_id,
                        display_name: msg.is_anonymous
                            ? 'Anonymous Student'
                            : msg.profiles?.name || 'Student',
                        message: msg.message,
                        emotion_type: msg.emotion_type,
                        is_anonymous: msg.is_anonymous,
                        likes_count: msg.likes_count || 0,
                        created_at: msg.created_at,
                        avatar_url: msg.profiles?.avatar_url || null
                    }));
                    if (mounted.current) {
                        setMessages(formattedMessages);
                        writeCachedMessages(formattedMessages);
                    }
                }
                return;
            }

            if (data && data.length > 0) {
                const today = todayStr();
                const hasToday = data.some(msg =>
                    msg.created_at && msg.created_at.startsWith(today)
                );

                let finalMessages: StudentMessage[];

                if (!hasToday) {
                    finalMessages = [
                        {
                            id: 'note-1',
                            user_id: 'system',
                            display_name: 'Medrae Nursing Community Note',
                            message: 'No one has shared today yet. Here is how everyone felt recently.',
                            emotion_type: 'calm',
                            is_anonymous: true,
                            likes_count: 0,
                            created_at: new Date().toISOString(),
                            avatar_url: null
                        },
                        ...data.slice(0, 19)
                    ];
                } else {
                    finalMessages = data;
                }

                if (mounted.current) {
                    setMessages(finalMessages);
                    writeCachedMessages(finalMessages);
                }
            }
        } catch {
            console.warn('Message refresh skipped (slow or offline network)');
        } finally {
            if (mounted.current) setIsLoading(false);
        }
    }, []);

    // ============================================
    // QUEUE FLUSHING (posts and likes)
    // ============================================
    const flushQueue = useCallback(async () => {
        if (flushingRef.current) return;
        if (!user?.id) return;
        if (!quickOnlineCheck()) return;

        const reachable = await realReachabilityCheck(1500);
        if (!reachable) return;

        flushingRef.current = true;

        try {
            // Flush likes
            const likeQueue = readQueuedLikes();
            if (likeQueue.length > 0) {
                const remaining: QueuedLike[] = [];
                for (const item of likeQueue) {
                    try {
                        await supabase.rpc('emotion_increment_likes', { message_id: item.messageId });
                    } catch {
                        remaining.push(item);
                    }
                }
                writeQueuedLikes(remaining);
            }

            // Flush posts
            const postQueue = readQueuedPosts();
            if (postQueue.length > 0) {
                const remaining: QueuedPost[] = [];
                for (const item of postQueue) {
                    try {
                        const { data, error } = await supabase
                            .from('student_messages')
                            .insert([{
                                user_id: item.user_id,
                                message: item.message,
                                emotion_type: item.emotion_type,
                                is_anonymous: item.is_anonymous
                            }])
                            .select()
                            .single();

                        if (error) throw error;

                        // Replace optimistic entry with real one
                        if (data) {
                            setMessages(prev => {
                                const next = prev.map(msg =>
                                    msg.id === item.localId
                                        ? { ...msg, id: data.id, created_at: data.created_at, pending: false }
                                        : msg
                                );
                                writeCachedMessages(next.filter(m => !m.pending));
                                return next;
                            });
                        }
                    } catch {
                        remaining.push(item);
                    }
                }
                writeQueuedPosts(remaining);
            }

            // Update pending count and refresh from server
            const total = readQueuedPosts().length + readQueuedLikes().length;
            if (mounted.current) setPendingCount(total);

            if (total === 0) {
                fetchMessages();
            }
        } finally {
            flushingRef.current = false;
        }
    }, [user?.id, fetchMessages]);

    // Restore queued state on mount
    useEffect(() => {
        const posts = readQueuedPosts();
        const likes = readQueuedLikes();
        setPendingCount(posts.length + likes.length);

        // Inject queued posts as pending messages
        if (posts.length > 0) {
            setMessages(prev => {
                const pendingMessages: StudentMessage[] = posts.map(p => ({
                    id: p.localId,
                    user_id: p.user_id,
                    display_name: p.is_anonymous ? 'Anonymous Student' : 'You',
                    message: p.message,
                    emotion_type: p.emotion_type,
                    is_anonymous: p.is_anonymous,
                    likes_count: 0,
                    created_at: p.created_at,
                    avatar_url: null,
                    pending: true
                }));

                // Merge, avoiding duplicates
                const existingIds = new Set(prev.map(m => m.id));
                const merged = [...pendingMessages.filter(p => !existingIds.has(p.id)), ...prev];
                return merged.slice(0, 20);
            });
        }
    }, []);

    // ============================================
    // LIKE HANDLER (optimistic + queued)
    // ============================================
    const handleLike = useCallback(async (messageId: string) => {
        // Skip liking pending local messages
        if (messageId.startsWith('local-') || messageId.startsWith('default-') || messageId.startsWith('note-')) {
            return;
        }

        setMessages(prev => {
            const next = prev.map(msg =>
                msg.id === messageId
                    ? { ...msg, likes_count: (msg.likes_count || 0) + 1 }
                    : msg
            );
            writeCachedMessages(next.filter(m => !m.pending));
            return next;
        });

        if (!quickOnlineCheck()) {
            const queue = readQueuedLikes();
            queue.push({ messageId, queuedAt: Date.now() });
            writeQueuedLikes(queue);
            setPendingCount(readQueuedPosts().length + queue.length);
            return;
        }

        try {
            await supabase.rpc('emotion_increment_likes', { message_id: messageId });
        } catch {
            const queue = readQueuedLikes();
            queue.push({ messageId, queuedAt: Date.now() });
            writeQueuedLikes(queue);
            setPendingCount(readQueuedPosts().length + queue.length);
        }
    }, []);

    // ============================================
    // POST HANDLER (optimistic + queued)
    // ============================================
    const handlePostMessage = useCallback(async (message: string, emotion: EmotionType, isAnonymous: boolean) => {
        if (!user?.id) return;

        const optimisticId = `local-${Date.now()}`;
        const optimisticMessage: StudentMessage = {
            id: optimisticId,
            user_id: user.id,
            display_name: isAnonymous ? 'Anonymous Student' : 'You',
            message,
            emotion_type: emotion,
            is_anonymous: isAnonymous,
            likes_count: 0,
            created_at: new Date().toISOString(),
            avatar_url: null,
            pending: true
        };

        setMessages(prev => {
            const next = [optimisticMessage, ...prev].slice(0, 20);
            writeCachedMessages(next.filter(m => !m.pending));
            return next;
        });

        // If offline, queue and return immediately
        if (!quickOnlineCheck()) {
            const queue = readQueuedPosts();
            queue.push({
                localId: optimisticId,
                user_id: user.id,
                message,
                emotion_type: emotion,
                is_anonymous: isAnonymous,
                created_at: optimisticMessage.created_at
            });
            writeQueuedPosts(queue);
            setPendingCount(queue.length + readQueuedLikes().length);
            setShowPostModal(false);
            setShowModal(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('student_messages')
                .insert([{
                    user_id: user.id,
                    message: message,
                    emotion_type: emotion,
                    is_anonymous: isAnonymous
                }])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setMessages(prev => {
                    const next = prev.map(msg =>
                        msg.id === optimisticId
                            ? { ...msg, id: data.id, created_at: data.created_at, pending: false }
                            : msg
                    );
                    writeCachedMessages(next.filter(m => !m.pending));
                    return next;
                });
            }

            setShowPostModal(false);
            setShowModal(false);
        } catch {
            // Network failed mid-request — queue it
            const queue = readQueuedPosts();
            queue.push({
                localId: optimisticId,
                user_id: user.id,
                message,
                emotion_type: emotion,
                is_anonymous: isAnonymous,
                created_at: optimisticMessage.created_at
            });
            writeQueuedPosts(queue);
            setPendingCount(queue.length + readQueuedLikes().length);
            setShowPostModal(false);
            setShowModal(false);
        }
    }, [user?.id]);

    // ============================================
    // LOAD STREAK (never blocks UI)
    // ============================================
    useEffect(() => {
        mounted.current = true;

        if (!user?.id) {
            setIsReady(true);
            return () => { mounted.current = false; };
        }

        if (initialStreak > 0) {
            setIsReady(true);
        }

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

    // Emergency unlock
    useEffect(() => {
        const t = setTimeout(() => setIsReady(true), 4000);
        return () => clearTimeout(t);
    }, []);

    // ============================================
    // AUTO-FLUSH WHEN BACK ONLINE
    // ============================================
    useEffect(() => {
        if (isOnline && !wasOnlineRef.current) {
            flushQueue();
            if (user?.id) {
                fetchStreakData();
                if (hasFetchedMessages.current) {
                    fetchMessages();
                }
            }
        }
        wasOnlineRef.current = isOnline;
    }, [isOnline, user?.id, flushQueue, fetchStreakData, fetchMessages]);

    // Flush on initial mount if online
    useEffect(() => {
        if (isOnline && user?.id) {
            flushQueue();
        }
    }, [isOnline, user?.id, flushQueue]);

    // ============================================
    // CHECK FOR STREAK DEATH
    // ============================================
    useEffect(() => {
        if (!user?.id || !isReady) return;
        if (!isOnline) return;

        let cancelled = false;

        const checkStreakStatus = async () => {
            try {
                const q = supabase
                    .from("login_activity")
                    .select("streak, best_streak, login_date")
                    .eq("user_id", user.id)
                    .order("login_date", { ascending: false })
                    .limit(1);

                const { data, error } = await q;
                if (error || cancelled) return;

                if (data && data.length > 0) {
                    const streakInfo = data[0];
                    const today = todayStr();
                    const lastLogin = streakInfo.login_date?.split('T')[0];

                    if (streakInfo.best_streak > bestStreak && mounted.current) {
                        setBestStreak(streakInfo.best_streak);
                    }

                    if (lastLogin && lastLogin !== today) {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        const yesterdayStr = yesterday.toISOString().split('T')[0];

                        if (lastLogin !== yesterdayStr && streakInfo.streak > 0 && mounted.current) {
                            setResuscitationData({
                                highestStreak: streakInfo.best_streak || streakInfo.streak,
                                currentStreak: streakInfo.streak
                            });
                            setShowResuscitation(true);
                        }
                    }
                }
            } catch {
                // silent
            }
        };

        checkStreakStatus();
        return () => { cancelled = true; };
    }, [user?.id, isReady, isOnline, bestStreak]);

    // ============================================
    // HANDLE RESUSCITATE
    // ============================================
    const handleResuscitate = useCallback(async (sharedWith: string[]) => {
        if (!user?.id) return false;
        try {
            const { data: resuscitateData, error: resuscitateError } = await supabase
                .rpc('resuscitate_streak', { user_id_param: user.id });

            if (resuscitateError) throw resuscitateError;
            if (!resuscitateData || !resuscitateData[0]?.success) return false;

            await supabase.rpc('record_streak_resuscitation', {
                user_id_param: user.id,
                shared_with: sharedWith
            });

            const restoredStreak = resuscitateData[0].restored_streak;
            setStreak(restoredStreak);
            setBestStreak(restoredStreak);
            saveStreakToCache(restoredStreak, restoredStreak);

            setResuscitationData({
                highestStreak: restoredStreak,
                currentStreak: restoredStreak
            });

            safeRemoveItem(`streak_${user.id}`);
            safeRemoveItem(`best_streak_${user.id}`);

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('streak-updated', {
                    detail: { streak: restoredStreak }
                }));
            }

            setShowResuscitation(false);
            return true;
        } catch (error) {
            console.error('Error resuscitating streak:', error);
            return false;
        }
    }, [user?.id, saveStreakToCache]);

    // ============================================
    // SHOW MODAL — Monday (1) and Friday (5)
    // ============================================
    useEffect(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();

        if (dayOfWeek !== 1 && dayOfWeek !== 5) return;
        if (showResuscitation) return;
        if (!isReady) return;
        if (streak === 0) return;

        const sessionId = getSessionId();
        const modalShown = safeGetSessionItem('emotion_checkin_shown');
        if (modalShown === sessionId) return;

        const timer = setTimeout(() => {
            markShownThisSession();
            setShowModal(true);

            if (!hasFetchedMessages.current) {
                hasFetchedMessages.current = true;
                fetchMessages();
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [isReady, streak, fetchMessages, showResuscitation, getSessionId, markShownThisSession]);

    // ============================================
    // OPEN RESUSCITATION FROM MODAL
    // ============================================
    const handleOpenResuscitation = useCallback(() => {
        setShowModal(false);
        const fetchLatestStreak = async () => {
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
                    const currentStreak = data[0].streak || 0;
                    const currentBest = data[0].best_streak || currentStreak;
                    setResuscitationData({
                        highestStreak: currentBest,
                        currentStreak: currentStreak
                    });
                    setStreak(currentStreak);
                    setBestStreak(currentBest);
                }
            } catch {
                // silent
            }
            setShowResuscitation(true);
        };
        fetchLatestStreak();
    }, [user?.id]);

    // ============================================
    // HANDLERS
    // ============================================
    const handleCloseModal = useCallback(() => {
        setShowModal(false);
    }, []);

    const handleOpenPostModal = useCallback(() => {
        setShowPostModal(true);
    }, []);

    const handleClosePostModal = useCallback(() => {
        setShowPostModal(false);
    }, []);

    useEffect(() => {
        if (result) {
            if (result.success) {
                fetchStreakData();
            }
        }
    }, [result, fetchStreakData]);

    return (
        <>
            {showModal && (
                <div className="fixed inset-0 z-[99998]">
                    <EmotionalCheckInModal
                        key={`${streak}-${bestStreak}`}
                        streak={streak}
                        bestStreak={bestStreak}
                        messages={messages}
                        isLoadingMessages={isLoading}
                        isOnline={isOnline}
                        pendingCount={pendingCount}
                        onClose={handleCloseModal}
                        onLike={handleLike}
                        onShareFeeling={handleOpenPostModal}
                        onResuscitateClick={handleOpenResuscitation}
                        bgIndex={bgIndex}
                    />
                </div>
            )}

            {showPostModal && (
                <EmotionPostModal
                    isOpen={showPostModal}
                    isOnline={isOnline}
                    onClose={handleClosePostModal}
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
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto" />
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mt-4">
                            Restoring Your Streak...
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Please wait while we bring your streak back.
                        </p>
                    </div>
                </div>
            )}

            {result && !isProcessing && (
                <div
                    className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => setResult(null)}
                >
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 text-center">
                        <div className={`text-6xl mb-4 ${result.success ? 'text-green-500' : 'text-red-500'}`}>
                            {result.success ? '🎉' : '❌'}
                        </div>
                        <h3 className={`text-xl font-bold ${result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {result.success ? 'Streak Restored!' : 'Failed to Restore'}
                        </h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {result.message}
                        </p>
                        {result.success && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                The person who shared this link got their streak back.
                            </p>
                        )}
                        <button
                            onClick={() => {
                                setResult(null);
                                if (typeof window !== 'undefined') {
                                    window.location.href = '/';
                                }
                            }}
                            className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold"
                        >
                            {result.success ? 'Awesome' : 'Try Again'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}