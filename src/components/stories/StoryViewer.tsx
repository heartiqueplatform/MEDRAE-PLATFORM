// src/components/stories/StoryViewer.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import type { StoryFeedResponse } from '@/types/stories';
import { getProfileDisplayName, getProfileAvatar, formatStoryTime } from '@/types/stories';
import { X, Trash2, Flag, Pause, MoreHorizontal, Heart, ThumbsUp, Laugh, Flame, Star } from 'lucide-react';
import { useUser } from '@supabase/auth-helpers-react';
import { markStoryAsViewed } from '@/services/stories';

// =============================================
// FLOATING EMOJI ANIMATION COMPONENT
// =============================================
const FloatingEmoji = memo(({ emoji, index }: { emoji: string; index: number }) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(1);
    const [scale, setScale] = useState(1);
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Random starting position near the click
        const startX = (Math.random() - 0.5) * 100;
        const startY = (Math.random() - 0.5) * 100;

        // Random trajectory
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 1.5;
        const distance = 150 + Math.random() * 200;
        const endX = Math.cos(angle) * distance;
        const endY = Math.sin(angle) * distance - 100 - Math.random() * 100;

        // Animation timing with slight delay for cascading effect
        const delay = index * 50;
        const duration = 800 + Math.random() * 400;

        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime - delay;

            if (elapsed < 0) {
                animationFrame = requestAnimationFrame(animate);
                return;
            }

            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);

            // Position with easing
            const currentX = startX + endX * easeOut;
            const currentY = startY + endY * easeOut;

            // Fade out and scale down
            const currentOpacity = 1 - Math.pow(progress, 1.5);
            const currentScale = 1 + progress * 2;

            setPosition({ x: currentX, y: currentY });
            setOpacity(currentOpacity);
            setScale(currentScale);

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setOpacity(0);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        };
    }, [index]);

    return (
        <div
            ref={elementRef}
            className="fixed pointer-events-none z-[100] text-3xl"
            style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                opacity,
                transition: 'none',
                willChange: 'transform, opacity',
            }}
        >
            {emoji}
        </div>
    );
});

FloatingEmoji.displayName = 'FloatingEmoji';

// =============================================
// MAIN STORY VIEWER COMPONENT
// =============================================

interface StoryViewerProps {
    stories: StoryFeedResponse[];
    currentIndex: number;
    onClose: () => void;
    onNavigate: (direction: 'next' | 'prev') => void;
    onReaction: (storyId: string, reaction: string) => void;
    onJoinChallenge: (storyId: string) => void;
    onDelete?: (storyId: string) => void;
    onReport?: (storyId: string, reason: string) => void;
    onView?: (storyId: string) => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = memo(({
    stories,
    currentIndex,
    onClose,
    onNavigate,
    onReaction,
    onJoinChallenge,
    onDelete,
    onReport,
    onView
}) => {
    const user = useUser();
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [floatingEmojis, setFloatingEmojis] = useState<Array<{ id: string; emoji: string }>>([]);
    const [isPreloaded, setIsPreloaded] = useState(false);

    const progressIntervalRef = useRef<number | null>(null);
    const hasTrackedViewRef = useRef<Set<string>>(new Set());
    const preloadCacheRef = useRef<Map<string, boolean>>(new Map());
    const emojiCounterRef = useRef(0);

    // Memoize current story
    const currentStory = useMemo(() => stories[currentIndex], [stories, currentIndex]);

    // Memoize computed values
    const isOwnStory = useMemo(() => {
        if (!currentStory || !user) return false;
        return String(currentStory.user_id) === String(user.id);
    }, [currentStory, user]);

    const displayName = useMemo(() => {
        if (!currentStory) return '';
        return getProfileDisplayName(currentStory.profiles);
    }, [currentStory]);

    const avatarUrl = useMemo(() => {
        if (!currentStory) return '';
        return getProfileAvatar(currentStory.profiles);
    }, [currentStory]);

    const totalReactions = useMemo(() => currentStory?.reaction_count ?? 0, [currentStory]);
    const viewsCount = useMemo(() => currentStory?.views_count ?? 0, [currentStory]);

    const reactionList = useMemo(() => currentStory?.reactions || [], [currentStory]);
    const topReactions = useMemo(() => reactionList.slice(0, 3), [reactionList]);

    // =============================================
    // OPTIMIZATION 1: PRELOAD NEXT STORIES
    // =============================================
    useEffect(() => {
        // Preload next 3 stories
        const preloadNextStories = () => {
            const nextIndices = [currentIndex + 1, currentIndex + 2, currentIndex + 3];
            nextIndices.forEach(index => {
                if (index < stories.length) {
                    const story = stories[index];
                    if (story && !preloadCacheRef.current.has(story.id)) {
                        preloadCacheRef.current.set(story.id, true);
                        // Prefetch images and data
                        if (story.profiles?.avatar_url) {
                            const img = new Image();
                            img.src = story.profiles.avatar_url;
                        }
                        // Prefetch any other resources
                        if (story.story_type === 'challenge' && story.challenge_target) {
                            // Preload challenge data if needed
                        }
                    }
                }
            });
        };

        if (!isPreloaded) {
            preloadNextStories();
            setIsPreloaded(true);
        }

        // Preload on index change
        const timeoutId = setTimeout(preloadNextStories, 100);
        return () => clearTimeout(timeoutId);
    }, [currentIndex, stories, isPreloaded]);

    // =============================================
    // OPTIMIZATION 2: INSTANT VIEW TRACKING
    // =============================================
    useEffect(() => {
        if (!currentStory || !user) return;

        const storyId = currentStory.id;

        // Track view immediately (optimistic)
        if (!hasTrackedViewRef.current.has(storyId)) {
            hasTrackedViewRef.current.add(storyId);

            // Update parent immediately
            if (onView) {
                onView(storyId);
            }

            // Background sync with database
            const trackView = async () => {
                try {
                    await markStoryAsViewed(storyId);
                    console.log('✅ View tracked for story:', storyId);
                } catch (err) {
                    console.error('❌ Failed to view track:', err);
                }
            };

            trackView();
        }
    }, [currentStory, user, onView]);

    // =============================================
    // OPTIMIZATION 3: PROGRESS ANIMATION
    // =============================================
    useEffect(() => {
        if (!currentStory || isPaused) {
            if (progressIntervalRef.current) {
                cancelAnimationFrame(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
            return;
        }

        let startTime = Date.now();
        const duration = 5000;

        const updateProgress = () => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / duration) * 100, 100);
            setProgress(newProgress);

            if (newProgress < 100) {
                progressIntervalRef.current = requestAnimationFrame(updateProgress);
            } else {
                if (currentIndex < stories.length - 1) {
                    onNavigate('next');
                } else {
                    onClose();
                }
            }
        };

        progressIntervalRef.current = requestAnimationFrame(updateProgress);

        return () => {
            if (progressIntervalRef.current) {
                cancelAnimationFrame(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
        };
    }, [currentStory, currentIndex, stories.length, isPaused, onNavigate, onClose]);

    // =============================================
    // OPTIMIZATION 4: FLOATING EMOJI ANIMATION
    // =============================================
    const handleReactionWithAnimation = useCallback((emoji: string) => {
        if (!currentStory) return;

        // Add floating emoji
        const id = `emoji-${Date.now()}-${emojiCounterRef.current++}`;
        setFloatingEmojis(prev => [...prev, { id, emoji }]);

        // Remove emoji after animation completes
        setTimeout(() => {
            setFloatingEmojis(prev => prev.filter(e => e.id !== id));
        }, 1500);

        // Call reaction handler
        onReaction(currentStory.id, emoji);
    }, [currentStory, onReaction]);

    // =============================================
    // OPTIMIZATION 5: KEYBOARD NAVIGATION
    // =============================================
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentIndex < stories.length - 1) {
                    onNavigate('next');
                } else {
                    onClose();
                }
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentIndex > 0) onNavigate('prev');
            }
            if (e.key === ' ') {
                e.preventDefault();
                setIsPaused(prev => !prev);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, stories.length, onClose, onNavigate]);

    // =============================================
    // OPTIMIZATION 6: RESET STATE ON STORY CHANGE
    // =============================================
    useEffect(() => {
        setProgress(0);
        setIsPaused(false);
        setShowActions(false);
        // Reset preloaded flag for next story
        setIsPreloaded(false);
    }, [currentIndex]);

    // =============================================
    // OPTIMIZATION 7: MEMOIZED HANDLERS
    // =============================================
    const handleDelete = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete && currentStory) {
            if (window.confirm('Are you sure you want to delete this story?')) {
                onDelete(currentStory.id);
                setShowActions(false);
            }
        }
    }, [onDelete, currentStory]);

    const handleReport = useCallback(() => {
        if (onReport && currentStory && reportReason.trim()) {
            onReport(currentStory.id, reportReason);
            setShowReport(false);
            setReportReason('');
        }
    }, [onReport, currentStory, reportReason]);

    const handleTogglePause = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsPaused(prev => !prev);
    }, []);

    const handleClose = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onClose();
    }, [onClose]);

    const handleActionToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setShowActions(prev => !prev);
    }, []);

    const handleNavigatePrev = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentIndex > 0) onNavigate('prev');
    }, [currentIndex, onNavigate]);

    const handleNavigateNext = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentIndex < stories.length - 1) onNavigate('next');
        else onClose();
    }, [currentIndex, stories.length, onNavigate, onClose]);

    // =============================================
    // OPTIMIZATION 8: MEMOIZED STYLES
    // =============================================
    const getBackground = useCallback(() => {
        if (currentStory?.background_color) {
            return currentStory.background_color;
        }
        const colors: Record<string, string> = {
            'study': 'from-blue-600 via-blue-700 to-blue-900',
            'challenge': 'from-red-600 via-red-700 to-red-900',
            'achievement': 'from-yellow-500 via-yellow-600 to-yellow-800',
            'clinical': 'from-emerald-600 via-emerald-700 to-emerald-900',
            'reflection': 'from-purple-600 via-purple-700 to-purple-900',
            'struggle': 'from-amber-700 via-amber-800 to-amber-900'
        };
        return colors[currentStory?.story_type || 'study'] || 'from-gray-700 via-gray-800 to-gray-900';
    }, [currentStory]);

    const getReactionIcon = useCallback((emoji: string) => {
        const icons: Record<string, React.ReactNode> = {
            '🔥': <Flame className="w-5 h-5" />,
            '❤️': <Heart className="w-5 h-5" />,
            '👏': <ThumbsUp className="w-5 h-5" />,
            '😂': <Laugh className="w-5 h-5" />,
            '💪': <Star className="w-5 h-5" />,
        };
        return icons[emoji] || emoji;
    }, []);

    // Content size calculations
    const isLongContent = useMemo(() =>
        currentStory?.content && currentStory.content.length > 200,
        [currentStory]);

    const isVeryLongContent = useMemo(() =>
        currentStory?.content && currentStory.content.length > 500,
        [currentStory]);

    const contentTextSize = useMemo(() =>
        isVeryLongContent ? 'text-base' : isLongContent ? 'text-lg' : 'text-xl',
        [isLongContent, isVeryLongContent]);

    const titleTextSize = useMemo(() =>
        isVeryLongContent ? 'text-2xl' : isLongContent ? 'text-2xl' : 'text-3xl',
        [isLongContent, isVeryLongContent]);

    const paddingSize = useMemo(() =>
        isVeryLongContent ? 'p-4' : isLongContent ? 'p-6' : 'p-8',
        [isLongContent, isVeryLongContent]);

    // =============================================
    // OPTIMIZATION 9: MEMOIZED REACTION BUTTONS
    // =============================================
    const reactionButtons = useMemo(() => {
        const emojis = ['🔥', '❤️', '👏', '😂', '💪'];
        return emojis.map((emoji) => {
            const count = reactionList.filter(r => r.reaction === emoji).length;
            const isActive = currentStory?.user_reaction === emoji;

            return (
                <button
                    key={emoji}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleReactionWithAnimation(emoji);
                    }}
                    className={`relative group flex flex-col items-center gap-1 transition-all duration-200 ${isActive ? 'scale-110' : 'hover:scale-110'}`}
                >
                    <div className={`text-2xl p-3 rounded-full transition-transform active:scale-125 ${isActive
                        ? 'bg-white/30 ring-2 ring-white shadow-lg'
                        : 'bg-white/10 backdrop-blur-sm hover:bg-white/20'
                        }`}>
                        {emoji}
                    </div>
                    {count > 0 && (
                        <span className="text-white/50 text-[10px] font-medium">
                            {count}
                        </span>
                    )}
                </button>
            );
        });
    }, [reactionList, currentStory?.user_reaction, handleReactionWithAnimation]);

    // =============================================
    // RENDER
    // =============================================

    if (!currentStory) return null;

    return (
        <div
            className="fixed inset-0 bg-black/95 z-[99999] flex items-center justify-center"
            onClick={handleTogglePause}
        >
            <div className="relative w-full h-full max-w-lg mx-auto overflow-hidden bg-gray-900" onClick={(e) => e.stopPropagation()}>

                {/* TOP NAVIGATION & ACTIONS */}
                <div className="absolute top-0 left-0 right-0 z-50 p-4 pt-8 bg-gradient-to-b from-black/60 to-transparent">
                    {/* Progress Bars */}
                    <div className="flex gap-1 mb-4">
                        {stories.map((_, index) => (
                            <div key={index} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white transition-all duration-100 linear"
                                    style={{ width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%' }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* User Info & Action Buttons */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-full border-2 border-white/50 overflow-hidden flex-shrink-0">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white">
                                        {displayName[0]}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-white font-bold text-sm truncate">{displayName}</div>
                                <div className="text-white/70 text-xs flex gap-2 flex-wrap">
                                    <span>{formatStoryTime(currentStory.created_at)}</span>
                                    <span>•</span>
                                    <span>{viewsCount} views</span>
                                    {totalReactions > 0 && (
                                        <>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                {getReactionIcon(currentStory.user_reaction || '❤️')}
                                                <span>{totalReactions}</span>
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={handleActionToggle}
                                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors bg-black/20 backdrop-blur-sm"
                            >
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleClose}
                                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors bg-black/20 backdrop-blur-sm"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ACTION DROPDOWN */}
                {showActions && (
                    <div className="absolute top-20 right-4 z-[60] bg-white dark:bg-gray-800 rounded-lg shadow-xl py-1 min-w-[160px] overflow-hidden">
                        {isOwnStory ? (
                            onDelete && (
                                <button
                                    onClick={handleDelete}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete Story
                                </button>
                            )
                        ) : (
                            onReport && (
                                <button
                                    onClick={() => { setShowReport(true); setShowActions(false); }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <Flag className="w-4 h-4" /> Report Story
                                </button>
                            )
                        )}
                        {!isOwnStory && !onReport && !onDelete && (
                            <div className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 text-center">
                                No actions available
                            </div>
                        )}
                    </div>
                )}

                {/* MAIN CONTENT */}
                <div
                    className={`w-full h-full bg-gradient-to-br ${getBackground()} flex flex-col items-center justify-center ${paddingSize} text-center`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="w-full max-w-full flex flex-col items-center justify-center">
                        <h2 className={`text-white ${titleTextSize} font-bold mb-3 break-words max-w-full`}>
                            {currentStory.title}
                        </h2>

                        <p className={`text-white ${contentTextSize} leading-relaxed break-words max-w-full`}>
                            {currentStory.content}
                        </p>

                        {/* Challenge Box */}
                        {currentStory.challenge_target && currentStory.challenge_target > 0 && (
                            <div className="mt-6 p-4 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 w-full max-w-xs">
                                <p className="text-white/60 text-xs mb-1">CHALLENGE</p>
                                <p className="text-white font-bold text-lg">{currentStory.challenge_target} {currentStory.challenge_unit}</p>
                                <div className="text-white/50 text-xs mt-1">
                                    {currentStory.joined_count || 0} people joined
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onJoinChallenge(currentStory.id); }}
                                    className={`mt-3 w-full py-2 rounded-lg font-bold text-sm transition-all ${currentStory.has_joined_challenge
                                        ? 'bg-green-500/30 text-white hover:bg-green-500/40'
                                        : 'bg-white text-black hover:bg-white/90'
                                        }`}
                                >
                                    {currentStory.has_joined_challenge ? '✅ Joined' : '🎯 Join Now'}
                                </button>
                            </div>
                        )}

                        {/* Story Type Badge */}
                        <div className="mt-4 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm text-white/70 text-xs capitalize">
                            {currentStory.story_type || 'Study'}
                        </div>
                    </div>
                </div>

                {/* BOTTOM REACTIONS */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                    <div className="flex justify-center gap-4 pointer-events-auto">
                        {reactionButtons}
                    </div>
                    {totalReactions > 0 && (
                        <div className="text-center text-white/60 text-xs mt-4 pointer-events-auto">
                            {totalReactions} people reacted
                        </div>
                    )}
                </div>

                {/* Navigation tap areas */}
                <div className="absolute inset-y-0 left-0 w-1/4 z-10" onClick={handleNavigatePrev} />
                <div className="absolute inset-y-0 right-0 w-1/4 z-10" onClick={handleNavigateNext} />
            </div>

            {/* Report Modal */}
            {showReport && (
                <div
                    className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowReport(false);
                            setReportReason('');
                        }
                    }}
                >
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Report Story
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Why are you reporting this story?
                        </p>
                        <textarea
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                            rows={3}
                            placeholder="Describe the issue..."
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => {
                                    setShowReport(false);
                                    setReportReason('');
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReport}
                                disabled={!reportReason.trim()}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pause Indicator */}
            {isPaused && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/60 text-white p-4 rounded-full z-20 backdrop-blur-sm pointer-events-none">
                    <Pause className="w-8 h-8" />
                </div>
            )}

            {/* Floating Emojis */}
            {floatingEmojis.map((item, index) => (
                <FloatingEmoji key={item.id} emoji={item.emoji} index={index} />
            ))}
        </div>
    );
});

StoryViewer.displayName = 'StoryViewer';

export default StoryViewer;