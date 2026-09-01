// src/services/stories.ts
import { supabase } from '@/lib/supabaseClient';
import type {
    AcademicStory,
    AcademicStoryReaction,
    AcademicStoryChallengeJoin,
    AcademicStoryView,
    CreateStoryInput,
    UpdateStoryInput,
    StoryWithDetails,
    StoryFeedResponse,
    StoryReactionResponse,
    StoryJoinResponse,
    StoryViewResponse
} from '@/types/stories';

/**
 * Service layer for Stories feature
 * All database operations for stories are centralized here
 * No component should directly query Supabase
 */

/**
 * Get the current authenticated user's ID
 * @throws Error if user is not authenticated
 */
const getCurrentUserId = async (): Promise<string> => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        throw new Error('User not authenticated');
    }
    return user.id;
};

/**
 * Fetch all active stories - OPTIMIZED
 * - Uses database-maintained count columns
 * - Fetches profiles in a single query
 * - Gets user-specific data with minimal queries
 */
export const fetchStories = async (): Promise<StoryFeedResponse[]> => {
    try {
        const userId = await getCurrentUserId();

        // OPTIMIZED: Fetch only the necessary data with profile join
        const { data: stories, error } = await supabase
            .from('academic_stories')
            .select(`
                id,
                user_id,
                story_type,
                title,
                content,
                image_url,
                background_color,
                template_id,
                challenge_target,
                challenge_unit,
                challenge_start,
                challenge_end,
                expires_at,
                created_at,
                updated_at,
                is_deleted,
                views_count,
                reactions_count,
                joined_count,
                profiles:user_id (
                    user_id,
                    name,
                    username,
                    avatar_url
                )
            `)
            .eq('is_deleted', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        if (!stories || stories.length === 0) {
            return [];
        }

        // Get all story IDs for user-specific queries
        const storyIds = stories.map(s => s.id);

        // OPTIMIZED: Get user reactions, views, and joins in parallel
        const [userReactions, userViews, userJoins] = await Promise.all([
            supabase
                .from('academic_story_reactions')
                .select('story_id, reaction')
                .eq('user_id', userId)
                .in('story_id', storyIds),
            supabase
                .from('academic_story_views')
                .select('story_id')
                .eq('user_id', userId)
                .in('story_id', storyIds),
            supabase
                .from('academic_story_challenge_joins')
                .select('story_id')
                .eq('user_id', userId)
                .in('story_id', storyIds)
        ]);

        // Create maps for quick lookups
        const reactionMap = new Map();
        if (userReactions.data) {
            userReactions.data.forEach(r => {
                reactionMap.set(r.story_id, r.reaction);
            });
        }

        const viewedSet = new Set();
        if (userViews.data) {
            userViews.data.forEach(v => viewedSet.add(v.story_id));
        }

        const joinedSet = new Set();
        if (userJoins.data) {
            userJoins.data.forEach(j => joinedSet.add(j.story_id));
        }

        // Transform the data with computed fields
        // Transform the data with computed fields
        const transformedStories: StoryFeedResponse[] = stories.map(story => {
            // Handle profile data - Supabase returns it as an array or object
            let profileData = null;
            if (story.profiles) {
                const profile = Array.isArray(story.profiles) ? story.profiles[0] : story.profiles;
                if (profile) {
                    profileData = {
                        user_id: profile.user_id,
                        name: profile.name || null,
                        username: profile.username || null,
                        avatar_url: profile.avatar_url || null
                    };
                }
            }

            // ✅ Check if this is a challenge and if the user is the owner
            const isOwner = story.user_id === userId;
            const hasChallenge = story.challenge_target && story.challenge_target > 0;
            const hasJoined = joinedSet.has(story.id) || (isOwner && hasChallenge);

            return {
                ...story,
                profiles: profileData || {
                    user_id: story.user_id,
                    name: null,
                    username: null,
                    avatar_url: null
                },
                has_viewed: viewedSet.has(story.id),
                user_reaction: reactionMap.get(story.id) || null,
                has_joined_challenge: hasJoined, // ✅ Updated to include owner
                // Use database-maintained count columns - all consistent with database schema
                views_count: story.views_count || 0,
                reactions_count: story.reactions_count || 0,
                joined_count: story.joined_count || 0,
                // Also set reaction_count for backward compatibility
                reaction_count: story.reactions_count || 0
            };
        });

        return transformedStories;
    } catch (error) {
        console.error('Error fetching stories:', error);
        return [];
    }
};

/**
 * Fetch stories created by a specific user
 */
export const fetchUserStories = async (userId: string): Promise<AcademicStory[]> => {
    try {
        const { data, error } = await supabase
            .from('academic_stories')
            .select('*')
            .eq('user_id', userId)
            .eq('is_deleted', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching user stories:', error);
        return [];
    }
};

/**
 * Fetch a single story by ID with all related data - OPTIMIZED
 */
export const fetchStoryById = async (storyId: string): Promise<StoryWithDetails | null> => {
    try {
        const userId = await getCurrentUserId();

        // OPTIMIZED: Fetch story with profile in a single query
        const { data, error } = await supabase
            .from('academic_stories')
            .select(`
                id,
                user_id,
                story_type,
                title,
                content,
                image_url,
                background_color,
                template_id,
                challenge_target,
                challenge_unit,
                challenge_start,
                challenge_end,
                expires_at,
                created_at,
                updated_at,
                is_deleted,
                views_count,
                reactions_count,
                joined_count,
                profiles:user_id (
                    user_id,
                    name,
                    username,
                    avatar_url
                )
            `)
            .eq('id', storyId)
            .eq('is_deleted', false)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (error) throw error;
        if (!data) return null;

        // OPTIMIZED: Get user-specific data in parallel
        const [userReaction, userView, userJoin] = await Promise.all([
            supabase
                .from('academic_story_reactions')
                .select('reaction')
                .eq('story_id', storyId)
                .eq('user_id', userId)
                .maybeSingle(),
            supabase
                .from('academic_story_views')
                .select('id')
                .eq('story_id', storyId)
                .eq('user_id', userId)
                .maybeSingle(),
            supabase
                .from('academic_story_challenge_joins')
                .select('id')
                .eq('story_id', storyId)
                .eq('user_id', userId)
                .maybeSingle()
        ]);

        // Handle profile data
        let profileData = null;
        if (data.profiles) {
            const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
            if (profile) {
                profileData = {
                    user_id: profile.user_id,
                    name: profile.name || null,
                    username: profile.username || null,
                    avatar_url: profile.avatar_url || null
                };
            }
        }

        return {
            ...data,
            profiles: profileData || {
                user_id: data.user_id,
                name: null,
                username: null,
                avatar_url: null
            },
            has_viewed: !!userView?.data,
            user_reaction: userReaction?.data?.reaction || null,
            has_joined_challenge: !!userJoin?.data,
            // Use database-maintained count columns
            views_count: data.views_count || 0,
            reactions_count: data.reactions_count || 0,
            joined_count: data.joined_count || 0,
            // Also set for backward compatibility
            reaction_count: data.reactions_count || 0,
            view_count: data.views_count || 0,
            join_count: data.joined_count || 0
        };
    } catch (error) {
        console.error('Error fetching story:', error);
        return null;
    }
};

/**
 * Create a new story
 */
export const createStory = async (input: CreateStoryInput): Promise<AcademicStory> => {
    try {
        const userId = await getCurrentUserId();

        const storyData = {
            user_id: userId,
            story_type: input.story_type || 'study',
            title: input.title || null,
            content: input.content,
            image_url: input.image_url || null,
            background_color: input.background_color || null,
            template_id: input.template_id || null,
            challenge_target: input.challenge_target || null,
            challenge_unit: input.challenge_unit || null,
            challenge_start: input.challenge_start || null,
            challenge_end: input.challenge_end || null,
            expires_at: input.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        const { data, error } = await supabase
            .from('academic_stories')
            .insert([storyData])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating story:', error);
        throw new Error('Failed to create story. Please try again.');
    }
};

/**
 * Update an existing story
 * Only the story owner can update
 */
export const updateStory = async (storyId: string, input: UpdateStoryInput): Promise<AcademicStory> => {
    try {
        const userId = await getCurrentUserId();

        // First verify ownership
        const { data: existingStory, error: fetchError } = await supabase
            .from('academic_stories')
            .select('user_id')
            .eq('id', storyId)
            .single();

        if (fetchError) throw fetchError;
        if (existingStory.user_id !== userId) {
            throw new Error('You do not have permission to update this story');
        }

        const { data, error } = await supabase
            .from('academic_stories')
            .update({
                ...input,
                updated_at: new Date().toISOString()
            })
            .eq('id', storyId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating story:', error);
        throw new Error('Failed to update story.');
    }
};

/**
 * Delete a story (soft delete)
 * Only the story owner can delete
 * Enhanced with better error handling and debugging
 */
export const deleteStory = async (storyId: string): Promise<void> => {
    try {
        const userId = await getCurrentUserId();

        console.log('🗑️ Attempting to delete story:', storyId);
        console.log('👤 Current user ID:', userId);

        // First check if the story exists and belongs to the user
        const { data: story, error: fetchError } = await supabase
            .from('academic_stories')
            .select('user_id, is_deleted')
            .eq('id', storyId)
            .single();

        if (fetchError) {
            console.error('❌ Error fetching story:', fetchError);
            throw new Error('Story not found or you do not have permission');
        }

        if (!story) {
            throw new Error('Story not found');
        }

        if (story.is_deleted) {
            throw new Error('Story is already deleted');
        }

        if (story.user_id !== userId) {
            console.error('❌ Permission denied. Story owner:', story.user_id, 'Current user:', userId);
            throw new Error('You do not have permission to delete this story');
        }

        // Perform soft delete
        const { error: updateError } = await supabase
            .from('academic_stories')
            .update({
                is_deleted: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', storyId)
            .eq('user_id', userId);

        if (updateError) {
            console.error('❌ Error updating story:', updateError);

            // Check if it's a permission error
            if (updateError.code === '42501') {
                throw new Error('Permission denied. Please check RLS policies.');
            }

            throw new Error(`Failed to delete story: ${updateError.message}`);
        }

        console.log('✅ Story deleted successfully:', storyId);
    } catch (error) {
        console.error('❌ Error in deleteStory:', error);
        throw error;
    }
};

/**
 * Add a reaction to a story
 * Uses database RPC function to maintain count
 */
export const addReaction = async (storyId: string, reaction: string): Promise<StoryReactionResponse> => {
    try {
        const userId = await getCurrentUserId();

        // Check if user already reacted
        const { data: existingReaction, error: checkError } = await supabase
            .from('academic_story_reactions')
            .select('id')
            .eq('story_id', storyId)
            .eq('user_id', userId)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing reaction:', checkError);
        }

        let result;
        if (existingReaction) {
            // Update existing reaction
            const { data, error } = await supabase
                .from('academic_story_reactions')
                .update({ reaction })
                .eq('id', existingReaction.id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            // Insert new reaction
            const { data, error } = await supabase
                .from('academic_story_reactions')
                .insert([{ story_id: storyId, user_id: userId, reaction }])
                .select()
                .single();

            if (error) throw error;
            result = data;

            // Database trigger will automatically increment reactions_count
            // No need to call RPC function - the trigger handles it
        }

        return result;
    } catch (error) {
        console.error('Error adding reaction:', error);
        throw new Error('Failed to add reaction.');
    }
};

/**
 * Remove a reaction from a story
 * Uses database trigger to maintain count
 */
export const removeReaction = async (storyId: string): Promise<void> => {
    try {
        const userId = await getCurrentUserId();

        const { error } = await supabase
            .from('academic_story_reactions')
            .delete()
            .eq('story_id', storyId)
            .eq('user_id', userId);

        if (error) throw error;

        // Database trigger will automatically decrement reactions_count
        // No need to call RPC function - the trigger handles it
    } catch (error) {
        console.error('Error removing reaction:', error);
        throw new Error('Failed to remove reaction.');
    }
};

/**
 * Join a challenge on a story
 * Uses database trigger to maintain count
 */
/**
 * Join a challenge - Uses RPC to get accurate count of ALL joins
 */
export const joinChallenge = async (storyId: string): Promise<number> => {
    try {
        const userId = await getCurrentUserId();

        console.log('🔍 Joining challenge - Story:', storyId);

        const { data, error } = await supabase
            .rpc('join_challenge_rpc', {
                p_story_id: storyId,
                p_user_id: userId
            });

        if (error) {
            console.error('❌ RPC Error:', error);
            throw error;
        }

        console.log('✅ New joined_count from RPC:', data);
        return data; // Returns the TOTAL count including ALL users
    } catch (error) {
        console.error('❌ Error joining challenge:', error);
        throw error instanceof Error ? error : new Error('Failed to join challenge.');
    }
};
/**
 * Leave a challenge on a story
 * Uses database trigger to maintain count
 */
/**
 * Leave a challenge - Uses RPC to get accurate count
 */
export const leaveChallenge = async (storyId: string): Promise<number> => {
    try {
        const userId = await getCurrentUserId();

        console.log('🔍 Leaving challenge - Story:', storyId);

        const { data, error } = await supabase
            .rpc('leave_challenge_rpc', {
                p_story_id: storyId,
                p_user_id: userId
            });

        if (error) {
            console.error('❌ RPC Error:', error);
            throw error;
        }

        console.log('✅ New joined_count from RPC:', data);
        return data;
    } catch (error) {
        console.error('❌ Error leaving challenge:', error);
        throw error instanceof Error ? error : new Error('Failed to leave challenge.');
    }
};

/**
 * Get challenge participants for a story
 */
export const getChallengeParticipants = async (storyId: string): Promise<{ user_id: string; joined_at: string }[]> => {
    try {
        const { data, error } = await supabase
            .from('academic_story_challenge_joins')
            .select('user_id, joined_at')
            .eq('story_id', storyId)
            .order('joined_at', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching participants:', error);
        return [];
    }
};

/**
 * Mark a story as viewed by the current user
 * Uses database trigger to maintain count
 */
export const markStoryAsViewed = async (storyId: string): Promise<StoryViewResponse> => {
    try {
        const userId = await getCurrentUserId();

        // Check if already viewed
        const { data: existingView, error: checkError } = await supabase
            .from('academic_story_views')
            .select('id')
            .eq('story_id', storyId)
            .eq('user_id', userId)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (existingView) {
            return existingView;
        }

        const { data, error } = await supabase
            .from('academic_story_views')
            .insert([{ story_id: storyId, user_id: userId }])
            .select()
            .single();

        if (error) {
            // If duplicate key error, just return
            if (error.code === '23505') {
                console.log('User already viewed this story');
                return { id: '', story_id: storyId, user_id: userId, viewed_at: new Date().toISOString() };
            }
            throw error;
        }

        // Database trigger will automatically increment views_count
        // No need to call RPC function - the trigger handles it

        return data;
    } catch (error) {
        console.error('Error marking story as viewed:', error);
        // Don't throw - viewing is not critical
        return { id: '', story_id: storyId, user_id: '', viewed_at: new Date().toISOString() };
    }
};

/**
 * Report a story
 */
export const reportStory = async (storyId: string, reason: string): Promise<void> => {
    try {
        const userId = await getCurrentUserId();

        const { error } = await supabase
            .from('academic_story_reports')
            .insert([{ story_id: storyId, reporter_id: userId, reason }]);

        if (error) throw error;
    } catch (error) {
        console.error('Error reporting story:', error);
        throw new Error('Failed to report story.');
    }
};

/**
 * Fetch story templates
 * Returns predefined story templates that users can use
 */
export const fetchStoryTemplates = async (): Promise<StoryTemplate[]> => {
    // Return static templates
    return [
        {
            id: 'study_session',
            name: 'Study Session',
            icon: '📚',
            background_color: '#4F46E5',
            text_color: '#FFFFFF',
            prompts: [
                'What are you studying today?',
                'How long will you study?',
                'What\'s your goal for this session?'
            ]
        },
        {
            id: 'challenge',
            name: 'Challenge',
            icon: '🎯',
            background_color: '#DC2626',
            text_color: '#FFFFFF',
            prompts: [
                'What challenge are you taking on?',
                'What\'s your target?',
                'How will you measure success?'
            ]
        },
        {
            id: 'achievement',
            name: 'Achievement',
            icon: '🏆',
            background_color: '#D97706',
            text_color: '#FFFFFF',
            prompts: [
                'What did you achieve?',
                'What did you learn?',
                'What\'s next?'
            ]
        },
        {
            id: 'clinical',
            name: 'Clinical Placement',
            icon: '🩺',
            background_color: '#059669',
            text_color: '#FFFFFF',
            prompts: [
                'Where are you placed?',
                'What department?',
                'What did you learn today?'
            ]
        },
        {
            id: 'reflection',
            name: 'Reflection',
            icon: '❤️',
            background_color: '#7C3AED',
            text_color: '#FFFFFF',
            prompts: [
                'How are you feeling?',
                'What went well?',
                'What could be improved?'
            ]
        },
        {
            id: 'struggle',
            name: 'Struggle',
            icon: '😂',
            background_color: '#92400E',
            text_color: '#FFFFFF',
            prompts: [
                'What\'s challenging you?',
                'How are you coping?',
                'What support do you need?'
            ]
        }
    ];
};

// Types for templates
export interface StoryTemplate {
    id: string;
    name: string;
    icon: string;
    background_color: string;
    text_color: string;
    prompts: string[];
}