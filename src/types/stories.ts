// src/types/stories.ts

export interface AcademicStory {
    id: string;
    user_id: string;
    story_type: string;
    title: string | null;
    content: string;
    image_url: string | null;
    background_color: string | null;
    template_id: string | null;
    challenge_target: number | null;
    challenge_unit: string | null;
    challenge_start: string | null;
    challenge_end: string | null;
    joined_count: number;
    reactions_count: number;
    views_count: number;
    expires_at: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
}

export interface AcademicStoryReaction {
    id: string;
    story_id: string;
    user_id: string;
    reaction: string;
    created_at: string;
}

export interface AcademicStoryChallengeJoin {
    id: string;
    story_id: string;
    user_id: string;
    joined_at: string;
}

export interface AcademicStoryView {
    id: string;
    story_id: string;
    user_id: string;
    viewed_at: string;
}

export interface AcademicStoryReport {
    id: string;
    story_id: string;
    reporter_id: string;
    reason: string | null;
    created_at: string;
}

/**
 * Profile interface matching the profiles table schema
 * Uses 'name' as the primary display name field
 */
export interface Profile {
    user_id: string;
    username: string | null;
    name: string | null;
    avatar_url: string | null;
    // Optional additional fields that exist in your profiles table
    institution?: string | null;
    target_score?: number | null;
    role?: string | null;
    course?: string | null;
    block?: string | null;
    county?: string | null;
    phone?: string | null;
    bio?: string | null;
    subscription?: string | null;
    nck_number?: string | null;
    specialization?: string | null;
    years_experience?: number | null;
    workplace?: string | null;
    employment_type?: string | null;
}

/**
 * Extended profile for UI display with computed display name
 */
export interface ProfileWithDisplay extends Profile {
    display_name: string; // Computed from name or username
}

/**
 * Extended types for UI operations - FIXED to match database fields
 */
export interface StoryWithDetails extends AcademicStory {
    profiles?: Profile;
    // Optional arrays for detailed view
    views?: AcademicStoryView[];
    reactions?: AcademicStoryReaction[];
    challenge_joins?: AcademicStoryChallengeJoin[];
    // User-specific flags
    has_viewed: boolean;
    user_reaction: string | null;
    has_joined_challenge: boolean;
    // These match the database column names exactly
    // The counts are maintained by database triggers
    views_count: number;
    reactions_count: number; // Note: matches database column name
    joined_count: number;
}

export interface StoryFeedResponse extends StoryWithDetails {
    // Additional fields for feed response
    reactions?: AcademicStoryReaction[]; // For reaction list display
}

export interface StoryReactionResponse extends AcademicStoryReaction { }

export interface StoryJoinResponse extends AcademicStoryChallengeJoin { }

export interface StoryViewResponse extends AcademicStoryView { }

export interface CreateStoryInput {
    story_type?: string;
    title?: string | null;
    content: string;
    image_url?: string | null;
    background_color?: string | null;
    template_id?: string | null;
    challenge_target?: number | null;
    challenge_unit?: string | null;
    challenge_start?: string | null;
    challenge_end?: string | null;
    expires_at?: string;
}

export interface UpdateStoryInput {
    title?: string | null;
    content?: string;
    image_url?: string | null;
    background_color?: string | null;
    template_id?: string | null;
    challenge_target?: number | null;
    challenge_unit?: string | null;
    challenge_start?: string | null;
    challenge_end?: string | null;
}

/**
 * Story template interface
 */
export interface StoryTemplate {
    id: string;
    name: string;
    icon: string;
    background_color: string;
    text_color: string;
    prompts: string[];
}

/**
 * Story type options for filtering
 */
export type StoryType = 'study' | 'challenge' | 'achievement' | 'clinical' | 'reflection' | 'struggle';

/**
 * Story reaction options
 */
export type StoryReaction = '🔥' | '❤️' | '👏' | '😂' | '💪' | '🎯' | '📚' | '🩺';

/**
 * Available reactions with their display names
 */
export const STORY_REACTIONS: { emoji: StoryReaction; label: string }[] = [
    { emoji: '🔥', label: 'Fire' },
    { emoji: '❤️', label: 'Love' },
    { emoji: '👏', label: 'Clap' },
    { emoji: '😂', label: 'Laugh' },
    { emoji: '💪', label: 'Strong' },
    { emoji: '🎯', label: 'Target' },
    { emoji: '📚', label: 'Study' },
    { emoji: '🩺', label: 'Clinical' }
];

/**
 * Story type configuration
 */
export const STORY_TYPES: { value: StoryType; label: string; icon: string; color: string }[] = [
    { value: 'study', label: 'Study Session', icon: '📚', color: '#4F46E5' },
    { value: 'challenge', label: 'Challenge', icon: '🎯', color: '#DC2626' },
    { value: 'achievement', label: 'Achievement', icon: '🏆', color: '#D97706' },
    { value: 'clinical', label: 'Clinical Placement', icon: '🩺', color: '#059669' },
    { value: 'reflection', label: 'Reflection', icon: '❤️', color: '#7C3AED' },
    { value: 'struggle', label: 'Struggle', icon: '😂', color: '#92400E' }
];

/**
 * Story status types
 */
export type StoryStatus = 'active' | 'expired' | 'deleted';

/**
 * Helper function to get display name from profile
 * FIXED: Uses 'name' field as primary (matching database schema)
 */
export const getProfileDisplayName = (profile: Profile | null | undefined): string => {
    if (!profile) return 'Anonymous';
    return profile.name || profile.username || 'Anonymous';
};

/**
 * Helper function to get avatar URL from profile with fallback
 */
export const getProfileAvatar = (profile: Profile | null | undefined): string => {
    if (!profile) return '/high3.png';
    return profile.avatar_url || '/high3.png';
};

/**
 * Helper function to get story type configuration
 */
export const getStoryTypeConfig = (type: string): { label: string; icon: string; color: string } => {
    const found = STORY_TYPES.find(t => t.value === type);
    return found || { label: type, icon: '📝', color: '#6B7280' };
};

/**
 * Helper function to format time ago
 */
export const formatStoryTime = (date: string): string => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
};

/**
 * Helper function to check if a story is expired
 */
export const isStoryExpired = (story: AcademicStory): boolean => {
    return new Date(story.expires_at) < new Date();
};

/**
 * Helper function to check if a story is active (not expired and not deleted)
 */
export const isStoryActive = (story: AcademicStory): boolean => {
    return !story.is_deleted && !isStoryExpired(story);
};

/**
 * Helper function to get story status
 */
export const getStoryStatus = (story: AcademicStory): StoryStatus => {
    if (story.is_deleted) return 'deleted';
    if (isStoryExpired(story)) return 'expired';
    return 'active';
};

/**
 * Helper function to calculate time remaining until story expires
 */
export const getStoryTimeRemaining = (story: AcademicStory): { hours: number; minutes: number; total: number } => {
    const now = new Date();
    const expires = new Date(story.expires_at);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) {
        return { hours: 0, minutes: 0, total: 0 };
    }

    const totalHours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return {
        hours: totalHours,
        minutes: minutes,
        total: diff
    };
};

/**
 * Helper function to format time remaining
 */
export const formatStoryTimeRemaining = (story: AcademicStory): string => {
    const { hours, minutes } = getStoryTimeRemaining(story);
    if (hours === 0 && minutes === 0) return 'Expired';
    if (hours === 0) return `${minutes}m remaining`;
    if (hours < 24) return `${hours}h ${minutes}m remaining`;
    return `${Math.floor(hours / 24)}d remaining`;
};

/**
 * Helper function to get story progress (for challenges)
 */
export const getStoryProgress = (story: AcademicStory, currentProgress: number): number => {
    if (!story.challenge_target || story.challenge_target === 0) return 0;
    return Math.min(Math.round((currentProgress / story.challenge_target) * 100), 100);
};

/**
 * Helper function to get story color based on type
 */
export const getStoryColor = (type: string): string => {
    const config = getStoryTypeConfig(type);
    return config.color;
};

/**
 * Helper function to get story icon based on type
 */
export const getStoryIcon = (type: string): string => {
    const config = getStoryTypeConfig(type);
    return config.icon;
};

/**
 * Helper function to get story type label
 */
export const getStoryTypeLabel = (type: string): string => {
    const config = getStoryTypeConfig(type);
    return config.label;
};

/**
 * Helper function to check if user can delete a story
 */
export const canDeleteStory = (story: AcademicStory, userId: string | undefined): boolean => {
    if (!userId) return false;
    return story.user_id === userId;
};

/**
 * Helper function to check if user can report a story
 */
export const canReportStory = (story: AcademicStory, userId: string | undefined): boolean => {
    if (!userId) return false;
    return story.user_id !== userId;
};

/**
 * Helper function to format story content for display
 */
export const formatStoryContent = (content: string, maxLength?: number): string => {
    if (!content) return '';
    if (maxLength && content.length > maxLength) {
        return content.substring(0, maxLength) + '...';
    }
    return content;
};

/**
 * Helper function to get reaction count with pluralization
 */
export const getReactionCountText = (count: number): string => {
    if (count === 0) return 'No reactions';
    if (count === 1) return '1 reaction';
    return `${count} reactions`;
};

/**
 * Helper function to get view count with pluralization
 */
export const getViewCountText = (count: number): string => {
    if (count === 0) return 'No views';
    if (count === 1) return '1 view';
    return `${count} views`;
};

/**
 * Helper function to get join count with pluralization
 */
export const getJoinCountText = (count: number): string => {
    if (count === 0) return 'No joins';
    if (count === 1) return '1 join';
    return `${count} joins`;
};

/**
 * Helper function to check if story has challenge
 */
export const hasChallenge = (story: AcademicStory): boolean => {
    return !!story.challenge_target && story.challenge_target > 0;
};

/**
 * Helper function to get challenge status
 */
export const getChallengeStatus = (story: AcademicStory): 'not_started' | 'active' | 'ended' => {
    if (!hasChallenge(story)) return 'ended';

    const now = new Date();
    const start = story.challenge_start ? new Date(story.challenge_start) : null;
    const end = story.challenge_end ? new Date(story.challenge_end) : null;

    if (start && now < start) return 'not_started';
    if (end && now > end) return 'ended';
    return 'active';
};

/**
 * Helper function to get challenge progress text
 */
export const getChallengeProgressText = (story: AcademicStory, currentProgress: number): string => {
    if (!hasChallenge(story)) return '';
    const progress = getStoryProgress(story, currentProgress);
    return `${progress}% complete (${currentProgress}/${story.challenge_target} ${story.challenge_unit || 'units'})`;
};

/**
 * Helper function to sort stories (newest first)
 */
export const sortStoriesByDate = (stories: AcademicStory[]): AcademicStory[] => {
    return [...stories].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
};

/**
 * Helper function to filter active stories
 */
export const filterActiveStories = (stories: AcademicStory[]): AcademicStory[] => {
    return stories.filter(story => isStoryActive(story));
};

/**
 * Helper function to get story engagement score
 * Uses database-maintained count columns for performance
 */
export const getStoryEngagementScore = (story: AcademicStory): number => {
    const views = story.views_count || 0;
    const reactions = story.reactions_count || 0;
    const joins = story.joined_count || 0;
    return views + (reactions * 2) + (joins * 3);
};

/**
 * Helper function to format story creation date
 */
export const formatStoryDate = (date: string): string => {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Helper function to truncate story title
 */
export const truncateStoryTitle = (title: string | null, maxLength: number = 50): string => {
    if (!title) return '';
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
};

/**
 * Helper function to get reaction icon component name
 * For use with lucide-react icons
 */
export const getReactionIconName = (emoji: string): string => {
    const iconMap: Record<string, string> = {
        '🔥': 'Flame',
        '❤️': 'Heart',
        '👏': 'ThumbsUp',
        '😂': 'Laugh',
        '💪': 'Star',
        '🎯': 'Target',
        '📚': 'BookOpen',
        '🩺': 'Stethoscope'
    };
    return iconMap[emoji] || 'Circle';
};

/**
 * Helper function to get background color for story type
 */
export const getStoryTypeBackground = (type: string): string => {
    const colors: Record<string, string> = {
        'study': 'from-blue-600 via-blue-700 to-blue-900',
        'challenge': 'from-red-600 via-red-700 to-red-900',
        'achievement': 'from-yellow-500 via-yellow-600 to-yellow-800',
        'clinical': 'from-emerald-600 via-emerald-700 to-emerald-900',
        'reflection': 'from-purple-600 via-purple-700 to-purple-900',
        'struggle': 'from-amber-700 via-amber-800 to-amber-900'
    };
    return colors[type] || 'from-gray-700 via-gray-800 to-gray-900';
};

/**
 * Helper function to safely get counts with fallback
 * These are used when the database columns might not exist yet
 */
export const getSafeCounts = (story: any): { views: number; reactions: number; joins: number } => {
    return {
        views: story.views_count || 0,
        reactions: story.reactions_count || 0,
        joins: story.joined_count || 0
    };
};

/**
 * Helper function to check if counts are database-maintained
 * Returns true if the story has the count columns
 */
export const hasDatabaseCounts = (story: any): boolean => {
    return (
        typeof story.views_count === 'number' &&
        typeof story.reactions_count === 'number' &&
        typeof story.joined_count === 'number'
    );
};

/**
 * Helper function to get engagement summary text
 */
export const getEngagementSummary = (story: AcademicStory): string => {
    const parts = [];
    if (story.views_count > 0) parts.push(`${story.views_count} views`);
    if (story.reactions_count > 0) parts.push(`${story.reactions_count} reactions`);
    if (story.joined_count > 0) parts.push(`${story.joined_count} joined`);

    if (parts.length === 0) return 'No engagement yet';
    return parts.join(' • ');
};

/**
 * Helper function to get reaction count for a specific emoji
 */
export const getReactionCountForEmoji = (reactions: AcademicStoryReaction[] | undefined, emoji: string): number => {
    if (!reactions) return 0;
    return reactions.filter(r => r.reaction === emoji).length;
};

/**
 * Helper function to get top reactions
 */
export const getTopReactions = (reactions: AcademicStoryReaction[] | undefined, limit: number = 3): { emoji: string; count: number }[] => {
    if (!reactions) return [];

    const counts: Record<string, number> = {};
    reactions.forEach(r => {
        counts[r.reaction] = (counts[r.reaction] || 0) + 1;
    });

    return Object.entries(counts)
        .map(([emoji, count]) => ({ emoji, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
};

/**
 * Helper function to check if user has reacted
 */
export const hasUserReacted = (reactions: AcademicStoryReaction[] | undefined, userId: string): boolean => {
    if (!reactions) return false;
    return reactions.some(r => r.user_id === userId);
};

/**
 * Helper function to get user's reaction
 */
export const getUserReaction = (reactions: AcademicStoryReaction[] | undefined, userId: string): string | null => {
    if (!reactions) return null;
    const reaction = reactions.find(r => r.user_id === userId);
    return reaction?.reaction || null;
};

/**
 * Helper function to check if user has joined challenge
 */
export const hasUserJoinedChallenge = (joins: AcademicStoryChallengeJoin[] | undefined, userId: string): boolean => {
    if (!joins) return false;
    return joins.some(j => j.user_id === userId);
};

/**
 * Helper function to check if user has viewed story
 */
export const hasUserViewed = (views: AcademicStoryView[] | undefined, userId: string): boolean => {
    if (!views) return false;
    return views.some(v => v.user_id === userId);
};