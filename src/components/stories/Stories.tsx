// src/components/stories/Stories.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '@/lib/supabaseClient';
import {
    fetchStories,
    fetchStoryTemplates,
    createStory,
    addReaction,
    removeReaction,
    joinChallenge,
    leaveChallenge,
    markStoryAsViewed,
    deleteStory,
    reportStory
} from '@/services/stories';
import type {
    StoryFeedResponse,
    StoryTemplate,
    CreateStoryInput
} from '@/types/stories';
import { StoryViewer } from './StoryViewer';
import { StoryCreator } from './StoryCreator';
import { StoryErrorState } from './StoryErrorState';
import { toast } from 'sonner';

interface StoriesProps {
    title?: string;
    subtitle?: string;
    className?: string;
}

// =============================================
// PSYCHOLOGICAL ENCOURAGEMENT MESSAGES
// =============================================
const ENCOURAGEMENT_MESSAGES = [
    { emoji: "📚", message: "Share your study milestone today!", subtext: "Every page read is progress" },
    { emoji: "💪", message: "What did you master today?", subtext: "Your small wins add up" },
    { emoji: "🌟", message: "Proud of your study journey?", subtext: "Share it with your study group" },
    { emoji: "🎯", message: "Conquered a tough topic?", subtext: "Your peers want to celebrate with you" },
    { emoji: "🔥", message: "Keep the momentum going!", subtext: "Share today's study victory" },
    { emoji: "💡", message: "Had a breakthrough moment?", subtext: "Your insight could help others" },
    { emoji: "⭐", message: "Ready to inspire others?", subtext: "Your study journey matters" },
    { emoji: "🎓", message: "Learning something new?", subtext: "Share your 'aha' moment!" }
];

// =============================================
// DEFAULT HANDCRAFTED STORY CARDS (4 cards)
// =============================================
const DEFAULT_STORY_CARDS = [
    { id: 'default-1', title: "Morning Study Session", description: "How did you start your study day? Share your routine!", emoji: "🌅", color: "from-orange-400 to-amber-500" },
    { id: 'default-2', title: "Breakthrough Moment", description: "Did something click today? Tell your study community!", emoji: "💡", color: "from-blue-400 to-indigo-500" },
    { id: 'default-3', title: "Study Win 🏆", description: "Celebrate your daily study achievement!", emoji: "⭐", color: "from-purple-400 to-pink-500" },
    { id: 'default-4', title: "Study Buddy", description: "Learning with friends? Share your study group moment!", emoji: "🤝", color: "from-green-400 to-teal-500" }
];

// =============================================
// FACEBOOK-STYLE STORY CARD COMPONENT
// =============================================
const StoryCardItem = memo(({
    story,
    onView,
    isDefault = false,
    defaultCard = null,
    storyCount = 1,
    shouldAnimate = false,
    isCurrentUser = false
}: {
    story?: StoryFeedResponse;
    onView: (id: string) => void;
    isDefault?: boolean;
    defaultCard?: typeof DEFAULT_STORY_CARDS[0] | null;
    storyCount?: number;
    shouldAnimate?: boolean;
    isCurrentUser?: boolean;
}) => {
    const [imageError, setImageError] = useState(false);
    const [isAnimating, setIsAnimating] = useState(shouldAnimate);

    useEffect(() => {
        if (shouldAnimate) {
            const timer = setTimeout(() => setIsAnimating(false), 400);
            return () => clearTimeout(timer);
        }
    }, [shouldAnimate]);

    const handleImageError = useCallback(() => setImageError(true), []);

    if (isDefault && defaultCard) {
        const randomMessage = ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];

        return (
            <div
                className={`flex-shrink-0 w-[140px] cursor-pointer group relative transition-all duration-400 ${isAnimating ? 'opacity-0 scale-95 translate-x-4' : 'opacity-100 scale-100 translate-x-0'
                    }`}
                onClick={() => onView(`default-${defaultCard.id}`)}
                onTouchStart={(e) => {
                    const touch = e.currentTarget;
                    touch.dataset.touchStartY = e.touches[0].clientY.toString();
                    touch.dataset.isScrolling = 'false';
                }}
                onTouchMove={(e) => {
                    const startY = parseFloat(e.currentTarget.dataset.touchStartY || '0');
                    const deltaY = Math.abs(e.touches[0].clientY - startY);
                    if (deltaY > 10) {
                        e.currentTarget.dataset.isScrolling = 'true';
                    }
                }}
                onTouchEnd={(e) => {
                    const isScrolling = e.currentTarget.dataset.isScrolling === 'true';
                    e.currentTarget.dataset.isScrolling = 'false';
                    if (isScrolling) {
                        e.preventDefault();
                    }
                }}
            >
                <div className={`rounded-2xl overflow-hidden bg-gradient-to-br ${defaultCard.color} h-[200px] relative transition-transform duration-300 group-hover:scale-[1.02] shadow-md`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute top-3 left-3 text-3xl">{defaultCard.emoji}</div>
                    <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-white/80 font-medium bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                                {randomMessage.emoji}
                            </span>
                        </div>
                        <p className="text-white text-sm font-semibold leading-tight mb-0.5">
                            {randomMessage.message}
                        </p>
                        <p className="text-white/70 text-[10px] leading-tight">
                            {randomMessage.subtext}
                        </p>
                    </div>
                    <div className="absolute top-3 right-3">
                        <div className="bg-blue-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full animate-pulse">
                            + Add
                        </div>
                    </div>
                </div>
                <div className="mt-1.5 text-center">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                        Share your story
                    </p>
                </div>
            </div>
        );
    }

    if (!story) return null;

    const userProfile = story.profiles || {};
    const avatarUrl = userProfile.avatar_url || '/pwa-192x192.png';
    const displayName = userProfile.name || userProfile.username || story.user_name || 'User';
    const hasViewed = story.has_viewed;
    const previewMedia = story.media_url;
    const previewText = story.text;

    return (
        <div
            className={`flex-shrink-0 w-[140px] cursor-pointer group relative transition-all duration-400 ${isAnimating ? 'opacity-0 scale-95 translate-x-4' : 'opacity-100 scale-100 translate-x-0'
                }`}
            onClick={() => onView(story.id)}
            onTouchStart={(e) => {
                const touch = e.currentTarget;
                touch.dataset.touchStartY = e.touches[0].clientY.toString();
                touch.dataset.isScrolling = 'false';
            }}
            onTouchMove={(e) => {
                const startY = parseFloat(e.currentTarget.dataset.touchStartY || '0');
                const deltaY = Math.abs(e.touches[0].clientY - startY);
                if (deltaY > 10) {
                    e.currentTarget.dataset.isScrolling = 'true';
                }
            }}
            onTouchEnd={(e) => {
                const isScrolling = e.currentTarget.dataset.isScrolling === 'true';
                e.currentTarget.dataset.isScrolling = 'false';
                if (isScrolling) {
                    e.preventDefault();
                }
            }}
        >
            <div className="relative">
                <div className={`absolute -inset-0.5 rounded-2xl transition-all duration-300 ${!hasViewed ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 animate-pulse' : 'bg-gray-300 dark:bg-gray-700'
                    }`}>
                    {!hasViewed && (
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-yellow-400/20 via-pink-500/20 to-purple-600/20 blur-sm" />
                    )}
                </div>
                <div className={`relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 h-[200px] transition-transform duration-300 group-hover:scale-[1.02] shadow-md ${!hasViewed ? 'ring-2 ring-white/50 dark:ring-gray-900/50' : ''
                    }`}>
                    {previewMedia && !imageError ? (
                        <img
                            src={previewMedia}
                            alt={displayName}
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                            loading="lazy"
                            decoding="async"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 p-3">
                            <div className="w-12 h-12 rounded-full bg-white/80 dark:bg-gray-700/80 flex items-center justify-center mb-2">
                                <span className="text-2xl">📖</span>
                            </div>
                            <p className="text-xs text-center text-gray-600 dark:text-gray-400 line-clamp-2">
                                {previewText || displayName}
                            </p>
                        </div>
                    )}
                    <div className="absolute bottom-2 left-2">
                        <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 overflow-hidden bg-white dark:bg-gray-700">
                            <img
                                src={avatarUrl}
                                alt={displayName}
                                className="w-full h-full object-cover"
                                onError={() => { }}
                                loading="lazy"
                                decoding="async"
                            />
                        </div>
                    </div>
                    {storyCount > 1 && (
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            {storyCount} Pulse
                        </div>
                    )}
                    {!hasViewed && (
                        <div className="absolute top-2 right-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-gray-900 animate-pulse" />
                        </div>
                    )}
                    {isCurrentUser && (
                        <div className="absolute top-2 left-2 bg-blue-500/80 backdrop-blur-sm text-white text-[9px] font-semibold px-2 py-0.5 rounded-full">
                            You
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-1.5 text-center flex items-center justify-center gap-1.5">
                <span className={`text-xs font-medium truncate ${!hasViewed ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                    {displayName.split(' ')[0] || 'User'}
                </span>
                {!hasViewed && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
            </div>
        </div>
    );
});

StoryCardItem.displayName = 'StoryCardItem';

// =============================================
// CREATE STORY BUTTON
// =============================================
const CreateStoryButton = memo(({ userProfile, onCreate }: { userProfile: any; onCreate: (e: React.MouseEvent) => void }) => {
    const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.src = '/pwa-192x192.png';
    }, []);

    const displayName = userProfile?.name || userProfile?.username || 'Your';
    const randomMessage = ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];

    return (
        <div
            className="flex-shrink-0 w-[140px] cursor-pointer group relative"
            onClick={onCreate}
            onTouchStart={(e) => {
                const touch = e.currentTarget;
                touch.dataset.touchStartY = e.touches[0].clientY.toString();
                touch.dataset.isScrolling = 'false';
            }}
            onTouchMove={(e) => {
                const startY = parseFloat(e.currentTarget.dataset.touchStartY || '0');
                const deltaY = Math.abs(e.touches[0].clientY - startY);
                if (deltaY > 10) {
                    e.currentTarget.dataset.isScrolling = 'true';
                }
            }}
            onTouchEnd={(e) => {
                const isScrolling = e.currentTarget.dataset.isScrolling === 'true';
                e.currentTarget.dataset.isScrolling = 'false';
                if (isScrolling) {
                    e.preventDefault();
                }
            }}
        >
            <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 h-[200px] relative transition-transform duration-300 group-hover:scale-[1.02] shadow-md border-2 border-dashed border-blue-300 dark:border-blue-700">
                <div className="absolute top-2 left-2 w-10 h-10 rounded-full border-2 border-white dark:border-gray-900 overflow-hidden bg-white dark:bg-gray-700">
                    <img
                        src={userProfile?.avatar_url || '/pwa-192x192.png'}
                        className="w-full h-full object-cover"
                        alt="Your Story"
                        onError={handleImageError}
                        loading="lazy"
                        decoding="async"
                    />
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                    <div className="bg-blue-500 text-white rounded-full p-2.5 mb-2 shadow-lg transition-transform group-hover:scale-110">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Create Story</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                        {randomMessage.emoji} {randomMessage.subtext}
                    </p>
                </div>
            </div>
            <div className="mt-1.5 text-center">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">{displayName}'s Story</p>
            </div>
        </div>
    );
});

CreateStoryButton.displayName = 'CreateStoryButton';

// =============================================
// MAIN COMPONENT
// =============================================

export const Stories: React.FC<StoriesProps> = memo(({
    title = "Study Stories",
    subtitle = "Share your daily learning journey",
    className = ""
}) => {
    const user = useUser();

    // State
    const [allStories, setAllStories] = useState<StoryFeedResponse[]>([]);
    const [templates, setTemplates] = useState<StoryTemplate[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [hasLoadedFromCache, setHasLoadedFromCache] = useState(false);
    const [animatingCards, setAnimatingCards] = useState<Set<string>>(new Set());
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Refs
    const isMountedRef = useRef(true);
    const storyCacheRef = useRef<Map<string, StoryFeedResponse>>(new Map());
    const isLoadingRef = useRef(false);
    const hasInitializedRef = useRef(false);

    // =============================================
    // MEMOIZED VALUES
    // =============================================

    const groupedStories = useMemo(() => {
        const grouped = new Map<string, {
            user_id: string;
            stories: StoryFeedResponse[];
            has_viewed: boolean;
            profiles: any;
            name: string;
        }>();

        allStories.forEach(story => {
            const userId = story.user_id;
            if (!grouped.has(userId)) {
                const profiles = story.profiles || {};
                const name = profiles.name || profiles.username || story.user_name || 'User';
                grouped.set(userId, {
                    user_id: userId,
                    stories: [],
                    has_viewed: story.has_viewed || false,
                    profiles: profiles,
                    name: name
                });
            }
            const group = grouped.get(userId)!;
            group.stories.push(story);
            if (!story.has_viewed) {
                group.has_viewed = false;
            }
            if (story.profiles?.name) group.name = story.profiles.name;
            else if (story.profiles?.username) group.name = story.profiles.username;
            else if (story.user_name) group.name = story.user_name;
        });

        grouped.forEach(group => {
            group.stories.sort((a, b) =>
                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
            );
        });

        return grouped;
    }, [allStories]);

    const groupedStoryList = useMemo(() => Array.from(groupedStories.values()), [groupedStories]);
    const currentStory = useMemo(() => {
        if (!selectedStoryId) return null;
        return allStories.find(s => s.id === selectedStoryId) || null;
    }, [allStories, selectedStoryId]);

    // =============================================
    // CACHE MANAGEMENT
    // =============================================

    useEffect(() => {
        if (hasInitializedRef.current) return;
        hasInitializedRef.current = true;

        if (user?.id) {
            setCurrentUserId(user.id);
        }

        try {
            const cached = sessionStorage.getItem('stories_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.stories && parsed.stories.length > 0) {
                    setAllStories(parsed.stories);
                    parsed.stories.forEach((story: StoryFeedResponse) => {
                        storyCacheRef.current.set(story.id, story);
                    });
                    setHasLoadedFromCache(true);
                }
                if (parsed.templates) {
                    setTemplates(parsed.templates);
                }
                if (parsed.userProfile) {
                    setUserProfile(parsed.userProfile);
                }
            }
        } catch (error) {
            // Silent fail for cache
        }
    }, [user?.id]);

    useEffect(() => {
        if (allStories.length > 0 || userProfile) {
            try {
                sessionStorage.setItem('stories_cache', JSON.stringify({
                    stories: allStories,
                    templates: templates,
                    userProfile: userProfile,
                    timestamp: Date.now()
                }));
                allStories.forEach(story => {
                    storyCacheRef.current.set(story.id, story);
                });
            } catch (error) {
                // Silent fail for cache
            }
        }
    }, [allStories, templates, userProfile]);

    // =============================================
    // BACKGROUND UPDATE
    // =============================================

    const detectNewStories = useCallback((oldStories: StoryFeedResponse[], newStories: StoryFeedResponse[]) => {
        const oldIds = new Set(oldStories.map(s => s.id));
        const newIds = new Set(newStories.map(s => s.id));

        const newStoryIds = new Set<string>();
        newIds.forEach(id => {
            if (!oldIds.has(id)) {
                newStoryIds.add(id);
            }
        });
        return newStoryIds;
    }, []);

    const loadAllData = useCallback(async (forceRefresh = false) => {
        if (!user?.id) return;
        if (isLoadingRef.current && !forceRefresh) return;

        isLoadingRef.current = true;

        try {
            setError(null);

            const [storiesData, templatesData, profileData] = await Promise.all([
                fetchStories(),
                fetchStoryTemplates(),
                supabase
                    .from('profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .single()
            ]);

            if (storiesData && isMountedRef.current) {
                const newStoryIds = detectNewStories(allStories, storiesData);

                if (newStoryIds.size > 0) {
                    setAnimatingCards(newStoryIds);
                    setAllStories(storiesData);
                    storiesData.forEach((story: StoryFeedResponse) => {
                        storyCacheRef.current.set(story.id, story);
                    });
                    setHasLoadedFromCache(true);

                    setTimeout(() => {
                        setAnimatingCards(new Set());
                    }, 500);
                } else if (JSON.stringify(storiesData) !== JSON.stringify(allStories)) {
                    setAllStories(storiesData);
                    storiesData.forEach((story: StoryFeedResponse) => {
                        storyCacheRef.current.set(story.id, story);
                    });
                    setHasLoadedFromCache(true);
                }
            }

            if (templatesData && isMountedRef.current) {
                setTemplates(templatesData);
            }

            if (!profileData.error && profileData.data && isMountedRef.current) {
                setUserProfile(profileData.data);
                if (profileData.data.user_id) {
                    setCurrentUserId(profileData.data.user_id);
                }
            }

        } catch (err) {
            console.error('Error loading data:', err);
            if (isMountedRef.current && !allStories.length && !hasLoadedFromCache) {
                setError(err instanceof Error ? err.message : 'Failed to load data');
            }
        } finally {
            if (isMountedRef.current) {
                isLoadingRef.current = false;
            }
        }
    }, [user?.id, allStories, hasLoadedFromCache, detectNewStories]);

    // =============================================
    // CREATE STORY
    // =============================================

    const handleCreateStory = useCallback(async (storyData: CreateStoryInput) => {
        try {
            toast.loading('Creating your story...');

            const newStory = await createStory(storyData);

            const userProfileData = userProfile || {};
            const userName = userProfileData.name ||
                userProfileData.username ||
                user?.user_metadata?.name ||
                user?.user_metadata?.username ||
                'You';
            const userAvatar = userProfileData.avatar_url ||
                user?.user_metadata?.avatar_url ||
                '/pwa-192x192.png';

            const storyWithDetails: StoryFeedResponse = {
                ...newStory,
                has_viewed: false,
                user_reaction: null,
                has_joined_challenge: false,
                views_count: 0,
                reaction_count: 0,
                join_count: 0,
                reactions: [],
                user_name: userName,
                profiles: {
                    user_id: newStory.user_id,
                    username: userProfileData.username || user?.user_metadata?.username || null,
                    name: userName,
                    avatar_url: userAvatar
                }
            };

            setAllStories(prevStories => {
                const filtered = prevStories.filter(s => s.id !== storyWithDetails.id);
                const updated = [storyWithDetails, ...filtered];
                return updated;
            });

            setAnimatingCards(new Set([storyWithDetails.id]));

            setTimeout(() => {
                setAnimatingCards(new Set());
            }, 500);

            setIsCreating(false);
            toast.dismiss();
            toast.success('Story shared! 🎉');

            setTimeout(() => {
                loadAllData(true);
            }, 3000);

        } catch (err) {
            console.error('Error creating story:', err);
            toast.dismiss();
            toast.error(err instanceof Error ? err.message : 'Failed to create story');
            throw err;
        }
    }, [userProfile, user, loadAllData]);

    // =============================================
    // HANDLERS - ORDER MATTERS! handleCloseViewer first
    // =============================================

    const openCreateModal = useCallback((e?: React.MouseEvent) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        setIsCreating(true);
    }, []);

    const closeCreateModal = useCallback((e?: React.MouseEvent) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        setIsCreating(false);
    }, []);

    const handleCloseViewer = useCallback(() => {
        setSelectedStoryId(null);
        setViewerIndex(0);
    }, []);

    const handleViewStory = useCallback(async (storyId: string) => {
        if (storyId.startsWith('default-')) {
            setIsCreating(true);
            return;
        }

        const story = allStories.find(s => s.id === storyId);
        if (!story) return;

        const userStories = allStories.filter(s => s.user_id === story.user_id);
        const firstUnviewed = userStories.find(s => !s.has_viewed);
        const targetStoryId = firstUnviewed?.id || storyId;
        const storyIndex = allStories.findIndex(s => s.id === targetStoryId);

        if (storyIndex === -1) return;

        setAllStories(prev => prev.map(s =>
            s.user_id === story.user_id
                ? { ...s, has_viewed: true, views_count: (s.views_count || 0) + 1 }
                : s
        ));

        setSelectedStoryId(targetStoryId);
        setViewerIndex(storyIndex);

        try {
            await Promise.all(userStories.map(s => markStoryAsViewed(s.id)));
        } catch (err) {
            console.error('Failed to mark stories as viewed:', err);
        }
    }, [allStories]);

    const handleNavigateViewer = useCallback((direction: 'next' | 'prev') => {
        if (direction === 'next' && viewerIndex < allStories.length - 1) {
            const nextIndex = viewerIndex + 1;
            setViewerIndex(nextIndex);
            setSelectedStoryId(allStories[nextIndex]?.id || null);
        } else if (direction === 'prev' && viewerIndex > 0) {
            const prevIndex = viewerIndex - 1;
            setViewerIndex(prevIndex);
            setSelectedStoryId(allStories[prevIndex]?.id || null);
        }
    }, [viewerIndex, allStories]);

    const handleReaction = useCallback(async (storyId: string, reaction: string) => {
        try {
            const currentStory = allStories.find(s => s.id === storyId);
            if (!currentStory) return;

            if (currentStory.user_reaction === reaction) {
                setAllStories(prev => prev.map(story =>
                    story.id === storyId
                        ? { ...story, user_reaction: null, reaction_count: Math.max(0, (story.reaction_count || 0) - 1) }
                        : story
                ));
                await removeReaction(storyId);
                toast.info('Reaction removed');
            } else {
                setAllStories(prev => prev.map(story =>
                    story.id === storyId
                        ? { ...story, user_reaction: reaction, reaction_count: (story.reaction_count || 0) + 1 }
                        : story
                ));
                await addReaction(storyId, reaction);
                toast.success('Reaction added!');
            }
        } catch (err) {
            console.error('Failed to handle reaction:', err);
            toast.error('Failed to add reaction');
        }
    }, [allStories]);

    const handleJoinChallenge = useCallback(async (storyId: string) => {
        try {
            const currentStory = allStories.find(s => s.id === storyId);
            if (!currentStory) return;

            if (currentStory.has_joined_challenge) {
                setAllStories(prev => prev.map(story =>
                    story.id === storyId
                        ? { ...story, has_joined_challenge: false, joined_count: Math.max(0, (story.joined_count || 0) - 1), join_count: Math.max(0, (story.join_count || 0) - 1) }
                        : story
                ));
                const newCount = await leaveChallenge(storyId);
                setAllStories(prev => prev.map(story =>
                    story.id === storyId ? { ...story, joined_count: newCount, join_count: newCount } : story
                ));
                toast.info('Left challenge');
            } else {
                setAllStories(prev => prev.map(story =>
                    story.id === storyId
                        ? { ...story, has_joined_challenge: true, joined_count: (story.joined_count || 0) + 1, join_count: (story.join_count || 0) + 1 }
                        : story
                ));
                const newCount = await joinChallenge(storyId);
                setAllStories(prev => prev.map(story =>
                    story.id === storyId ? { ...story, joined_count: newCount, join_count: newCount } : story
                ));
                toast.success('Joined challenge! 🎉');
            }
        } catch (err) {
            console.error('Failed to handle challenge join:', err);
            toast.error(err instanceof Error ? err.message : 'Failed to join challenge');
        }
    }, [allStories]);

    const handleReportStory = useCallback(async (storyId: string, reason: string) => {
        try {
            await reportStory(storyId, reason);
            toast.success('Story reported. We\'ll review it.');
        } catch (err) {
            toast.error('Failed to report story');
            throw err;
        }
    }, []);

    const handleViewerOnView = useCallback((storyId: string) => {
        setAllStories(prev => prev.map(story =>
            story.id === storyId ? { ...story, has_viewed: true, views_count: (story.views_count || 0) + 1 } : story
        ));
    }, []);

    // =============================================
    // FIXED: DELETE STORY - handleCloseViewer is now defined
    // =============================================

    const handleDeleteStory = useCallback(async (storyId: string) => {
        try {
            toast.loading('Deleting story...');

            await deleteStory(storyId);

            setAllStories(prev => {
                const updated = prev.filter(story => story.id !== storyId);
                console.log('🗑️ Story deleted, remaining:', updated.length);
                return updated;
            });

            storyCacheRef.current.delete(storyId);

            try {
                const cached = sessionStorage.getItem('stories_cache');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    const updatedStories = parsed.stories.filter((s: StoryFeedResponse) => s.id !== storyId);
                    sessionStorage.setItem('stories_cache', JSON.stringify({
                        ...parsed,
                        stories: updatedStories,
                        timestamp: Date.now()
                    }));
                }
            } catch (cacheError) {
                // Silent fail for cache
            }

            if (selectedStoryId === storyId) {
                handleCloseViewer();
            }

            toast.dismiss();
            toast.success('Story deleted successfully');

            setTimeout(() => {
                loadAllData(true);
            }, 2000);

        } catch (err) {
            console.error('Error deleting story:', err);
            toast.dismiss();
            toast.error(err instanceof Error ? err.message : 'Failed to delete story');
            loadAllData(true);
        }
    }, [allStories, selectedStoryId, handleCloseViewer, loadAllData]);

    // =============================================
    // EFFECTS
    // =============================================

    useEffect(() => {
        if (!user?.id) return;

        if (hasLoadedFromCache) {
            loadAllData(true);
        } else {
            loadAllData();
        }

        const refreshInterval = setInterval(() => {
            if (isMountedRef.current) {
                loadAllData(true);
            }
        }, 30000);

        return () => {
            isMountedRef.current = false;
            clearInterval(refreshInterval);
        };
    }, [user?.id, loadAllData, hasLoadedFromCache]);

    // =============================================
    // RENDER
    // =============================================

    if (error && !hasLoadedFromCache && !allStories.length) {
        return (
            <div className={`w-full ${className}`}>
                <StoryErrorState message={error} onRetry={() => loadAllData(true)} />
            </div>
        );
    }

    // Build story items
    const storyItems = [];

    groupedStoryList.forEach((group) => {
        const firstStory = group.stories[0];
        if (firstStory) {
            const storyWithName = {
                ...firstStory,
                user_name: group.name,
                profiles: { ...firstStory.profiles, name: group.name }
            };

            const isCurrentUser = currentUserId === group.user_id;

            storyItems.push(
                <StoryCardItem
                    key={group.user_id}
                    story={storyWithName}
                    onView={handleViewStory}
                    storyCount={group.stories.length}
                    shouldAnimate={animatingCards.has(firstStory.id)}
                    isCurrentUser={isCurrentUser}
                />
            );
        }
    });

    const userStoryCount = groupedStoryList.length;
    const defaultCardsToShow = userStoryCount < 4 ? DEFAULT_STORY_CARDS : [];

    defaultCardsToShow.forEach((card) => {
        storyItems.push(
            <StoryCardItem
                key={`default-${card.id}`}
                onView={handleViewStory}
                isDefault={true}
                defaultCard={card}
            />
        );
    });

    if (storyItems.length === 0) {
        DEFAULT_STORY_CARDS.forEach((card) => {
            storyItems.push(
                <StoryCardItem
                    key={`default-${card.id}`}
                    onView={handleViewStory}
                    isDefault={true}
                    defaultCard={card}
                />
            );
        });
    }

    return (
        <>
            <div className={`w-full pt-0 ${className}`}>
                <div className="px-4 mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
                </div>

                <div className="flex gap-4 overflow-x-auto px-4 pb-2 hide-scrollbar" style={{ touchAction: 'pan-x pan-y' }}>
                    <CreateStoryButton userProfile={userProfile} onCreate={openCreateModal} />
                    {storyItems}
                </div>
            </div>


            {selectedStoryId && currentStory && (
                <StoryViewer
                    stories={allStories}
                    currentIndex={viewerIndex}
                    onClose={handleCloseViewer}
                    onNavigate={handleNavigateViewer}
                    onReaction={handleReaction}
                    onJoinChallenge={handleJoinChallenge}
                    onDelete={handleDeleteStory}
                    onReport={handleReportStory}
                    onView={handleViewerOnView}
                />
            )
            }

            {isCreating && (
                <StoryCreator
                    templates={templates}
                    onCreate={handleCreateStory}
                    onClose={closeCreateModal}
                />
            )}
        </>
    );
});

Stories.displayName = 'Stories';

export default Stories;