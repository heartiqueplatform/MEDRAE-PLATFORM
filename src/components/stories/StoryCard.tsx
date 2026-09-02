// src/components/stories/StoryCard.tsx
import React, { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react';
import type { StoryFeedResponse } from '@/types/stories';

interface StoryCardProps {
    story: StoryFeedResponse;
    onView: () => void;
    onReaction: (reaction: string) => void;
    onJoinChallenge: () => void;
    onDelete?: () => void;
    onReport?: (reason: string) => void;
}

// =============================================
// FLOATING EMOJI ANIMATION COMPONENT
// =============================================
const FloatingEmoji = memo(({ emoji, x, y }: { emoji: string; x: number; y: number }) => {
    const [position, setPosition] = useState({ x, y });
    const [opacity, setOpacity] = useState(1);
    const [scale, setScale] = useState(0.5);
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Random trajectory
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 1.5;
        const distance = 100 + Math.random() * 150;
        const endX = Math.cos(angle) * distance;
        const endY = Math.sin(angle) * distance - 80 - Math.random() * 80;
        const duration = 600 + Math.random() * 400;

        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);

            // Position with easing
            const currentX = x + endX * easeOut;
            const currentY = y + endY * easeOut;

            // Fade out and scale up
            const currentOpacity = 1 - Math.pow(progress, 1.5);
            const currentScale = 0.5 + progress * 2;

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
    }, [x, y]);

    return (
        <div
            ref={elementRef}
            className="fixed pointer-events-none z-[100] text-2xl"
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
// MAIN STORY CARD COMPONENT
// =============================================

export const StoryCard: React.FC<StoryCardProps> = memo(({
    story,
    onView,
    onReaction,
    onJoinChallenge,
    onDelete,
    onReport
}) => {
    const [showActions, setShowActions] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [floatingEmojis, setFloatingEmojis] = useState<Array<{ id: string; emoji: string; x: number; y: number }>>([]);
    const emojiCounterRef = useRef(0);
    const cardRef = useRef<HTMLDivElement>(null);

    // =============================================
    // MEMOIZED VALUES
    // =============================================

    const isChallenge = useMemo(() =>
        story.challenge_target !== null && story.challenge_target > 0,
        [story.challenge_target]
    );

    const timeAgo = useMemo(() => {
        const diff = Date.now() - new Date(story.created_at).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    }, [story.created_at]);

    const storyIcon = useMemo(() => {
        const icons: Record<string, string> = {
            'study': '📚',
            'challenge': '🎯',
            'achievement': '🏆',
            'clinical': '🩺',
            'reflection': '❤️',
            'struggle': '😂'
        };
        return icons[story.story_type] || '📝';
    }, [story.story_type]);

    const backgroundColor = useMemo(() => {
        if (story.background_color) return story.background_color;
        const colors: Record<string, string> = {
            'study': 'from-blue-500 to-blue-600',
            'challenge': 'from-red-500 to-red-600',
            'achievement': 'from-yellow-500 to-yellow-600',
            'clinical': 'from-emerald-500 to-emerald-600',
            'reflection': 'from-purple-500 to-purple-600',
            'struggle': 'from-amber-700 to-amber-800'
        };
        return colors[story.story_type] || 'from-gray-500 to-gray-600';
    }, [story.background_color, story.story_type]);

    // =============================================
    // MEMOIZED CALLBACKS
    // =============================================

    const handleView = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onView();
    }, [onView]);

    const handleActionToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setShowActions(prev => !prev);
    }, []);

    const handleReactionWithAnimation = useCallback((emoji: string, event: React.MouseEvent) => {
        event.stopPropagation();

        // Get click position for emoji spawn
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        // Add floating emoji
        const id = `emoji-${Date.now()}-${emojiCounterRef.current++}`;
        setFloatingEmojis(prev => [...prev, { id, emoji, x, y }]);

        // Remove emoji after animation
        setTimeout(() => {
            setFloatingEmojis(prev => prev.filter(e => e.id !== id));
        }, 1200);

        // Call reaction handler
        onReaction(emoji);
    }, [onReaction]);

    const handleJoinChallengeClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onJoinChallenge();
    }, [onJoinChallenge]);

    const handleDelete = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this story?')) {
            onDelete?.();
        }
        setShowActions(false);
    }, [onDelete]);

    const handleReportClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setShowReport(true);
        setShowActions(false);
    }, []);

    const handleReportSubmit = useCallback(() => {
        if (reportReason.trim()) {
            onReport?.(reportReason);
            setShowReport(false);
            setReportReason('');
        }
    }, [onReport, reportReason]);

    const handleReportCancel = useCallback(() => {
        setShowReport(false);
        setReportReason('');
    }, []);

    const handleReportModalClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setShowReport(false);
            setReportReason('');
        }
    }, []);

    // =============================================
    // MEMOIZED REACTION BUTTONS
    // =============================================
    const reactionButtons = useMemo(() => {
        const emojis = ['🔥', '❤️', '👏', '😂', '💪'];
        return emojis.map((emoji) => {
            const isActive = story.user_reaction === emoji;
            return (
                <button
                    key={emoji}
                    onClick={(e) => handleReactionWithAnimation(emoji, e)}
                    className={`hover:scale-110 transition-transform text-sm sm:text-base lg:text-lg ${isActive ? 'scale-110 ring-2 ring-indigo-500 rounded-full p-0.5' : ''
                        }`}
                    aria-label={`React with ${emoji}`}
                >
                    {emoji}
                </button>
            );
        });
    }, [story.user_reaction, handleReactionWithAnimation]);
    // =============================================
    // RENDER
    // =============================================

    return (
        <>
            <div
                ref={cardRef}
                className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer bg-white dark:bg-gray-800 will-change-transform"
                onClick={handleView}
            >
                {/* Story Card Content */}
                <div
                    ref={cardRef}
                    className="relative rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer bg-white dark:bg-gray-800 will-change-transform"
                    onClick={handleView}
                >
                    {/* Story Card Content */}
                    <div className={`bg-gradient-to-br ${backgroundColor} p-3 sm:p-4 lg:p-5 min-h-[140px] sm:min-h-[160px] lg:min-h-[200px] flex flex-col justify-between`}>
                        {/* Header */}
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2">
                                <span className="text-lg sm:text-xl lg:text-2xl" aria-hidden="true">
                                    {storyIcon}
                                </span>
                                <span className="text-[8px] sm:text-[10px] lg:text-xs text-white font-medium bg-black/20 px-1.5 py-0.5 rounded-full capitalize">
                                    {story.story_type}
                                </span>
                            </div>

                            {/* More Actions Button */}
                            <button
                                onClick={handleActionToggle}
                                className="text-white/80 hover:text-white bg-black/20 hover:bg-black/30 rounded-full p-0.5 transition-colors"
                                aria-label="More actions"
                            >
                                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <circle cx="10" cy="3" r="2" />
                                    <circle cx="10" cy="10" r="2" />
                                    <circle cx="10" cy="17" r="2" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="mt-1.5 sm:mt-2 lg:mt-3">
                            {story.title && (
                                <h3 className="text-white font-semibold text-sm sm:text-base lg:text-lg mb-0.5 line-clamp-2">
                                    {story.title}
                                </h3>
                            )}
                            <p className="text-white/90 text-[10px] sm:text-xs lg:text-sm line-clamp-2">
                                {story.content}
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="mt-1.5 sm:mt-2 lg:mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-1 text-white/70 text-[8px] sm:text-[10px] lg:text-xs">
                                <span>{timeAgo}</span>
                                <span>•</span>
                                <span>{story.reactions_count || 0} reactions</span>
                            </div>

                            {isChallenge && (
                                <div className="flex items-center gap-0.5 bg-white/20 rounded-full px-1.5 py-0.5">
                                    <span className="text-[10px] sm:text-xs lg:text-sm text-white" aria-hidden="true">🎯</span>
                                    <span className="text-white text-[8px] sm:text-[10px] lg:text-xs font-medium">
                                        {story.challenge_target} {story.challenge_unit}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Reactions Bar - No border */}
                    <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white dark:bg-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-0.5 sm:gap-1">
                            {reactionButtons}
                        </div>
                        <div className="text-[8px] sm:text-[10px] lg:text-xs text-gray-400 dark:text-gray-500">
                            {story.reactions_count || 0} reactions
                        </div>
                    </div>
                </div>
                {/* Reactions Bar */}
                <div className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        {reactionButtons}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {story.reactions_count || 0} reactions
                    </div>
                </div>

                {/* Challenge Join Button */}
                {isChallenge && (
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                        <button
                            onClick={handleJoinChallengeClick}
                            className={`w-full text-sm font-medium rounded-lg px-4 py-2 transition-colors ${story.has_joined_challenge
                                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                        >
                            {story.has_joined_challenge ? '✅ Joined Challenge' : '🎯 Join Challenge'}
                        </button>
                    </div>
                )}

                {/* Actions Dropdown */}
                {showActions && (
                    <div
                        className="absolute top-12 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[140px] z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {onDelete && (
                            <button
                                onClick={handleDelete}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                            >
                                Delete Story
                            </button>
                        )}
                        {onReport && (
                            <button
                                onClick={handleReportClick}
                                className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/50 transition-colors"
                            >
                                Report Story
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Report Modal */}
            {showReport && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={handleReportModalClick}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                            Report Story
                        </h3>
                        <textarea
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                            rows={3}
                            placeholder="Why are you reporting this story?"
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            aria-label="Report reason"
                        />
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={handleReportCancel}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReportSubmit}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!reportReason.trim()}
                            >
                                Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Emojis */}
            {floatingEmojis.map((item) => (
                <FloatingEmoji
                    key={item.id}
                    emoji={item.emoji}
                    x={item.x}
                    y={item.y}
                />
            ))}
        </>
    );
});

StoryCard.displayName = 'StoryCard';

export default StoryCard;