"use client";

import { useEffect, useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Share2, Users, Clock, Flame, Trophy, RefreshCw, CheckCircle, Calendar } from "lucide-react";
import {
    playTap,
    playComplete,
    playVictory,
    playResuscitationProgress,
    playResuscitationComplete,
    playSound
} from "@/lib/soundManager";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

// ============================================
// TYPES
// ============================================

interface StreakResuscitationProps {
    highestStreak: number;
    currentStreak: number;
    isOpen: boolean;
    onClose: () => void;
    onResuscitate: (sharedWith: string[]) => Promise<boolean>;
    isDarkMode: boolean;
}

// ============================================
// HELPERS
// ============================================

const getHoursSince = (date: string): number => {
    const diff = Date.now() - new Date(date).getTime();
    return diff / (1000 * 60 * 60);
};

const getDaysSince = (date: string): number => {
    const diff = Date.now() - new Date(date).getTime();
    return diff / (1000 * 60 * 60 * 24);
};

const getRequiredShares = (daysSinceDeath: number): number => {
    return Math.floor(daysSinceDeath) + 1;
};

const formatTimeSince = (hours: number): string => {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    const minutes = Math.floor((hours % 1) * 60);

    if (days > 0) {
        return `${days}d ${remainingHours}h ${minutes}m`;
    }
    if (remainingHours > 0) {
        return `${remainingHours}h ${minutes}m`;
    }
    return `${minutes}m`;
};

const getTimeUntilNextRequirement = (daysSinceDeath: number): string => {
    const nextThreshold = Math.ceil(daysSinceDeath);
    const hoursUntilNext = (nextThreshold - daysSinceDeath) * 24;

    if (hoursUntilNext <= 0) return "Now!";
    const days = Math.floor(hoursUntilNext / 24);
    const hours = Math.floor(hoursUntilNext % 24);

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
};

// ============================================
// VIBRATION PATTERNS
// ============================================

const VIBRATION_PATTERNS = {
    light: 30,
    medium: 50,
    strong: 80,
    double: [30, 40, 30],
    triple: [50, 60, 50, 60, 80],
    success: [40, 30, 40],
    warning: 100,
};

let lastVibrationTime = 0;
const VIBRATION_DEBOUNCE = 100;

const triggerVibration = (pattern: number | number[] = VIBRATION_PATTERNS.light) => {
    const now = Date.now();
    if (now - lastVibrationTime < VIBRATION_DEBOUNCE) return;

    if (typeof window !== "undefined" && window.navigator?.vibrate) {
        const patternArray = Array.isArray(pattern) ? pattern : [pattern];
        if (patternArray.some(d => d > 0)) {
            window.navigator.vibrate(patternArray);
            lastVibrationTime = now;
        }
    }
};

// ============================================
// SUB-COMPONENT: Share Progress
// ============================================

const ShareProgress = memo(({
    required,
    completed,
    onShare,
    isSharing
}: {
    required: number;
    completed: number;
    onShare: (method: 'whatsapp' | 'copy') => void;
    isSharing: boolean;
}) => {
    const progress = Math.min((completed / required) * 100, 100);

    return (
        <div className="w-full space-y-3">
            <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                    Share Progress
                </span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {completed}/{required} shares
                </span>
            </div>

            <div className="relative w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => onShare('whatsapp')}
                    disabled={isSharing || completed >= required}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#25D366] text-white font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation flex items-center justify-center gap-2"
                >
                    <Share2 size={16} />
                    Share WhatsApp
                </button>

                <button
                    onClick={() => onShare('copy')}
                    disabled={isSharing || completed >= required}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation flex items-center justify-center gap-2"
                >
                    <RefreshCw size={16} />
                    Copy Link
                </button>
            </div>

            {completed >= required && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-2 bg-green-50 dark:bg-green-900/20 rounded-xl"
                >
                    <p className="text-green-600 dark:text-green-400 font-medium text-sm flex items-center justify-center gap-2">
                        <CheckCircle size={16} />
                        Ready to resuscitate!
                    </p>
                </motion.div>
            )}
        </div>
    );
});

ShareProgress.displayName = "ShareProgress";

// ============================================
// SUB-COMPONENT: Resuscitation Stats
// ============================================

const ResuscitationStats = memo(({
    highestStreak,
    hoursSinceDeath
}: {
    highestStreak: number;
    resuscitationCount: number;
    hoursSinceDeath: number;
}) => {
    const daysSinceDeath = hoursSinceDeath / 24;
    const required = getRequiredShares(daysSinceDeath);
    const timeDisplay = formatTimeSince(hoursSinceDeath);
    const timeUntilNext = getTimeUntilNextRequirement(daysSinceDeath);

    return (
        <div className="grid grid-cols-2 gap-2 w-full">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Highest Streak</p>
                <p className="text-xl font-bold text-amber-500">{highestStreak} days</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Shares Required</p>
                <p className="text-xl font-bold text-blue-500">{required}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {Math.floor(daysSinceDeath)} days since streak died
                </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center col-span-2">
                <div className="flex items-center justify-center gap-2">
                    <Clock size={14} className="text-purple-500" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Time Since Streak Died</p>
                </div>
                <p className="text-lg font-bold text-purple-500">
                    {timeDisplay}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    ⏳ Next share requirement in: {timeUntilNext}
                </p>
            </div>
        </div>
    );
});

ResuscitationStats.displayName = "ResuscitationStats";

// ============================================
// MAIN RESUSCITATION MODAL - NO localStorage
// ============================================

export const StreakResuscitationModal = memo(({
    highestStreak,
    currentStreak,
    isOpen,
    onClose,
    onResuscitate,
    isDarkMode
}: StreakResuscitationProps) => {
    const user = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const [isResuscitating, setIsResuscitating] = useState(false);
    const [sharedCount, setSharedCount] = useState(0);
    const [hoursSinceDeath, setHoursSinceDeath] = useState(0);
    const [daysSinceDeath, setDaysSinceDeath] = useState(0);
    const [requiredShares, setRequiredShares] = useState(1);
    const [isReady, setIsReady] = useState(false);

    // Load resuscitation data from database
    useEffect(() => {
        const loadData = async () => {
            if (!isOpen || !user?.id) return;

            try {
                const { data: loginData, error: loginError } = await supabase
                    .from('login_activity')
                    .select('login_date, streak, best_streak')
                    .eq('user_id', user.id)
                    .order('login_date', { ascending: false })
                    .limit(1);

                if (loginError) throw loginError;

                if (loginData && loginData.length > 0) {
                    const lastLogin = loginData[0];
                    const today = new Date().toISOString().split('T')[0];

                    if (lastLogin.login_date !== today) {
                        const deathDate = new Date(lastLogin.login_date);
                        deathDate.setDate(deathDate.getDate() + 1);

                        const hours = getHoursSince(deathDate.toISOString());
                        setHoursSinceDeath(hours);
                        setDaysSinceDeath(hours / 24);
                        setRequiredShares(getRequiredShares(hours / 24));
                    }
                }

                // Reset share count when modal opens
                setSharedCount(0);
                setIsReady(false);

            } catch (error) {
                console.error('Error loading resuscitation data:', error);
            }
        };

        if (isOpen) {
            loadData();
        }
    }, [isOpen, user?.id]);

    // Check if all shares are completed
    useEffect(() => {
        if (sharedCount >= requiredShares) {
            setIsReady(true);
        } else {
            setIsReady(false);
        }
    }, [sharedCount, requiredShares]);

    // ============================================
    // SHARE - No localStorage, just count shares
    // ============================================
    const handleShare = useCallback(async (method: 'whatsapp' | 'copy') => {
        if (isLoading || sharedCount >= requiredShares || !user?.id) return;

        setIsLoading(true);
        triggerVibration(VIBRATION_PATTERNS.medium);
        playTap();

        try {
            const shareId = `resuscitate_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            const shareUrl = `${window.location.origin}/?resuscitate=true&share_id=${shareId}&streak=${highestStreak}&user_id=${user.id}`;

            const message = `🔥 I lost my ${highestStreak}-day streak on Medrae!\n\nHelp me get it back by tapping this link:\n${shareUrl}\n\nThank you! 🙏`;

            // Use Web Share API if available (mobile/desktop)
            if (method === 'whatsapp' && navigator.share) {
                try {
                    await navigator.share({
                        title: 'Resuscitate My Streak! 🔥',
                        text: message,
                        url: shareUrl,
                    });
                    // User completed the share
                    const newCount = sharedCount + 1;
                    setSharedCount(newCount);
                    playResuscitationProgress();

                    if (newCount >= requiredShares) {
                        setIsReady(true);
                        playResuscitationComplete();
                        triggerVibration(VIBRATION_PATTERNS.success);
                    }
                } catch (shareError) {
                    // User cancelled share, don't count it
                    console.log('Share cancelled:', shareError);
                }
            } else if (method === 'whatsapp') {
                // Open WhatsApp with pre-filled message
                const encodedMessage = encodeURIComponent(message);
                window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');

                // Count the share
                const newCount = sharedCount + 1;
                setSharedCount(newCount);
                playResuscitationProgress();

                if (newCount >= requiredShares) {
                    setIsReady(true);
                    playResuscitationComplete();
                    triggerVibration(VIBRATION_PATTERNS.success);
                }
            } else if (method === 'copy') {
                // Copy link to clipboard
                await navigator.clipboard.writeText(message + '\n\n' + shareUrl);
                alert('✅ Link copied! Share it with someone to help restore your streak.');
                playComplete();

                const newCount = sharedCount + 1;
                setSharedCount(newCount);

                if (newCount >= requiredShares) {
                    setIsReady(true);
                    playResuscitationComplete();
                    triggerVibration(VIBRATION_PATTERNS.success);
                }
            }

        } catch (error) {
            console.error('Share failed:', error);
            alert('Failed to share. Please try again.');
            playSound('error', undefined, 0.6);
        } finally {
            setIsLoading(false);
        }
    }, [highestStreak, requiredShares, sharedCount, isLoading, user?.id]);

    const handleResuscitate = useCallback(async () => {
        if (!isReady || isResuscitating) return;

        setIsResuscitating(true);
        triggerVibration(VIBRATION_PATTERNS.triple);

        try {
            // Create a unique identifier for this resuscitation session
            const shareIds = Array.from({ length: sharedCount }, (_, i) => `share_${Date.now()}_${i}`);

            const success = await onResuscitate(shareIds);

            if (success) {
                playResuscitationComplete();
                setTimeout(() => playResuscitationComplete(), 300);
                setTimeout(() => playVictory(), 600);

                triggerVibration(VIBRATION_PATTERNS.success);

                setTimeout(() => {
                    onClose();
                }, 2500);
            }
        } catch (error) {
            console.error('Error resuscitating streak:', error);
            playSound('error', undefined, 0.6);
        } finally {
            setIsResuscitating(false);
        }
    }, [isReady, isResuscitating, sharedCount, onResuscitate, onClose]);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
        >
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => {
                    playTap();
                    onClose();
                }}
            />

            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => {
                        playTap();
                        onClose();
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-amber-100 dark:from-red-900/30 dark:to-amber-900/30 flex items-center justify-center">
                            <Flame size={40} className="text-amber-500" />
                        </div>
                        <div className="absolute -top-1 -right-1">
                            <span className="text-3xl">💔</span>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mt-4">
                        Resuscitate Your Streak
                    </h3>

                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        You had a {highestStreak}-day streak! Share with {requiredShares} friend{requiredShares > 1 ? 's' : ''} to bring it back.
                    </p>

                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl w-full">
                        <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
                            <Users size={14} />
                            Tap "Share WhatsApp" to choose a contact. Share as many times as needed!
                        </p>
                    </div>

                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg w-full">
                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-2">
                            <CheckCircle size={14} />
                            No limits - share until someone taps the link!
                        </p>
                    </div>

                    {daysSinceDeath > 7 && (
                        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <p className="text-xs text-yellow-700 dark:text-yellow-400 flex items-center gap-1.5">
                                <Calendar size={14} />
                                It's been {Math.floor(daysSinceDeath)} days since your streak died.
                                You need {requiredShares} shares to restore it!
                            </p>
                        </div>
                    )}

                    <div className="mt-4 w-full">
                        <ResuscitationStats
                            highestStreak={highestStreak}
                            resuscitationCount={0}
                            hoursSinceDeath={hoursSinceDeath}
                        />
                    </div>

                    <div className="mt-4 w-full border-t border-gray-200 dark:border-gray-700 pt-4">
                        <ShareProgress
                            required={requiredShares}
                            completed={sharedCount}
                            onShare={handleShare}
                            isSharing={isLoading}
                        />
                    </div>

                    {isReady && (
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={handleResuscitate}
                            disabled={isResuscitating}
                            className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation flex items-center justify-center gap-2"
                        >
                            <Trophy size={18} />
                            {isResuscitating ? 'Restoring...' : 'Restore Streak! 🔥'}
                        </motion.button>
                    )}

                    <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                        Share with {requiredShares} friend{requiredShares > 1 ? 's' : ''} to restore your streak.
                        {requiredShares > 1 && ` You need ${requiredShares} shares total.`}
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
});

StreakResuscitationModal.displayName = "StreakResuscitationModal";