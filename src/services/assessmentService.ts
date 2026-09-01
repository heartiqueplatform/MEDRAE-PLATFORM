// src/assessment/assessmentService.ts

import { supabase } from '@/lib/supabaseClient';
import {
    Assessment,
    AssessmentCategory,
    AssessmentStep,
    AssessmentAttempt,
    AssessmentResponse,
    Knowledge,
    AssessmentStats
} from './assessmentTypes';

export const assessmentService = {
    // ============================================
    // CATEGORIES
    // ============================================

    async getCategories(): Promise<AssessmentCategory[]> {
        const { data, error } = await supabase
            .from('mm_assessment_categories')
            .select(`
                *,
                assessments:mm_assessments(count)
            `)
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (error) throw error;

        return (data || []).map(category => ({
            ...category,
            assessment_count: category.assessments?.[0]?.count || 0
        }));
    },

    async getCategoryBySlug(slug: string): Promise<AssessmentCategory | null> {
        const { data, error } = await supabase
            .from('mm_assessment_categories')
            .select(`
                *,
                assessments:mm_assessments(count)
            `)
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

        if (error) throw error;

        if (data) {
            return {
                ...data,
                assessment_count: data.assessments?.[0]?.count || 0
            };
        }
        return null;
    },

    // ============================================
    // ASSESSMENTS
    // ============================================

    async getAssessments(filters?: {
        categoryId?: string;
        featured?: boolean;
        search?: string;
        difficulty?: string;
    }): Promise<Assessment[]> {
        let query = supabase
            .from('mm_assessments')
            .select(`
                *,
                category:mm_assessment_categories(*)
            `)
            .eq('is_active', true);

        if (filters?.categoryId) {
            query = query.eq('category_id', filters.categoryId);
        }
        if (filters?.featured) {
            query = query.eq('is_featured', true);
        }
        if (filters?.difficulty) {
            query = query.eq('difficulty', filters.difficulty);
        }
        if (filters?.search) {
            query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getAssessmentById(id: string): Promise<Assessment | null> {
        const { data, error } = await supabase
            .from('mm_assessments')
            .select(`
                *,
                category:mm_assessment_categories(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async getAssessmentBySlug(slug: string): Promise<Assessment | null> {
        const { data, error } = await supabase
            .from('mm_assessments')
            .select(`
                *,
                category:mm_assessment_categories(*)
            `)
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

        if (error) throw error;
        return data;
    },

    // ============================================
    // STEPS
    // ============================================

    async getAssessmentSteps(assessmentId: string): Promise<AssessmentStep[]> {
        const { data, error } = await supabase
            .from('mm_assessment_steps')
            .select('*')
            .eq('assessment_id', assessmentId)
            .order('step_number', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async getStepById(stepId: string): Promise<AssessmentStep | null> {
        const { data, error } = await supabase
            .from('mm_assessment_steps')
            .select('*')
            .eq('id', stepId)
            .single();

        if (error) throw error;
        return data;
    },

    // ============================================
    // ATTEMPTS
    // ============================================

    async createAttempt(assessmentId: string, userId: string): Promise<AssessmentAttempt> {
        const { data, error } = await supabase
            .from('mm_assessment_attempts')
            .insert({
                assessment_id: assessmentId,
                user_id: userId,
                status: 'in_progress',
                current_step: 1,
                score: 0,
                total_points: 0,
                correct_answers: 0,
                wrong_answers: 0,
                communication_score: 0,
                confidence_score: 0,
                clinical_score: 0,
                patient_safety_score: 0,
                started_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getAttempts(userId: string, assessmentId?: string): Promise<AssessmentAttempt[]> {
        let query = supabase
            .from('mm_assessment_attempts')
            .select(`
                *,
                assessment:mm_assessments(
                    id,
                    title,
                    slug,
                    description,
                    difficulty,
                    estimated_minutes,
                    passing_score,
                    total_steps,
                    is_featured,
                    is_active,
                    created_at,
                    category:mm_assessment_categories(
                        id,
                        name,
                        slug,
                        color,
                        icon
                    )
                )
            `)
            .eq('user_id', userId)
            .order('started_at', { ascending: false });

        if (assessmentId) {
            query = query.eq('assessment_id', assessmentId);
        }

        const { data, error } = await query;
        if (error) {
            console.error('❌ Error fetching attempts:', error);
            throw error;
        }

        console.log('✅ Attempts loaded:', data?.length || 0);
        return data || [];
    },

    async getLatestAttempt(userId: string, assessmentId: string): Promise<AssessmentAttempt | null> {
        const { data, error } = await supabase
            .from('mm_assessment_attempts')
            .select('*')
            .eq('user_id', userId)
            .eq('assessment_id', assessmentId)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('❌ Error fetching latest attempt:', error);
            throw error;
        }
        return data;
    },

    async getAttemptById(attemptId: string): Promise<AssessmentAttempt | null> {
        const { data, error } = await supabase
            .from('mm_assessment_attempts')
            .select(`
                *,
                assessment:mm_assessments(
                    *,
                    category:mm_assessment_categories(*)
                )
            `)
            .eq('id', attemptId)
            .single();

        if (error) {
            console.error('❌ Error fetching attempt by ID:', error);
            throw error;
        }
        return data;
    },

    async getAttemptWithDetails(attemptId: string): Promise<AssessmentAttempt | null> {
        const { data, error } = await supabase
            .from('mm_assessment_attempts')
            .select(`
                *,
                assessment:mm_assessments(
                    id,
                    title,
                    slug,
                    description,
                    difficulty,
                    estimated_minutes,
                    passing_score,
                    total_steps,
                    is_featured,
                    is_active,
                    created_at,
                    category:mm_assessment_categories(
                        id,
                        name,
                        slug,
                        color,
                        icon,
                        description
                    )
                )
            `)
            .eq('id', attemptId)
            .single();

        if (error) {
            console.error('❌ Error fetching attempt with details:', error);
            return null;
        }

        console.log('✅ Attempt with details loaded:', data?.id);
        return data;
    },

    async updateAttempt(attemptId: string, updates: Partial<AssessmentAttempt>): Promise<void> {
        const { error } = await supabase
            .from('mm_assessment_attempts')
            .update(updates)
            .eq('id', attemptId);

        if (error) {
            console.error('❌ Error updating attempt:', error);
            throw error;
        }
    },

    async deleteAttempt(attemptId: string): Promise<void> {
        const { error } = await supabase
            .from('mm_assessment_attempts')
            .delete()
            .eq('id', attemptId);

        if (error) {
            console.error('❌ Error deleting attempt:', error);
            throw error;
        }

        console.log('✅ Attempt deleted:', attemptId);
    },

    // ============================================
    // RESPONSES
    // ============================================

    async createResponse(response: Omit<AssessmentResponse, 'id' | 'created_at'>): Promise<AssessmentResponse> {
        const { data, error } = await supabase
            .from('mm_assessment_responses')
            .insert({
                attempt_id: response.attempt_id,
                step_id: response.step_id,
                student_answer: response.student_answer,
                matched_keywords: response.matched_keywords || [],
                missing_keywords: response.missing_keywords || [],
                score: response.score || 0,
                feedback: response.feedback || null,
                response_time_seconds: response.response_time_seconds || 0,
                is_correct: response.is_correct || false
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Error creating response:', error);
            throw error;
        }

        console.log('✅ Response created:', data.id);
        return data;
    },

    async getResponses(attemptId: string): Promise<AssessmentResponse[]> {
        const { data, error } = await supabase
            .from('mm_assessment_responses')
            .select('*')
            .eq('attempt_id', attemptId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('❌ Error fetching responses:', error);
            throw error;
        }
        return data || [];
    },

    async getResponsesWithSteps(attemptId: string): Promise<AssessmentResponse[]> {
        const { data, error } = await supabase
            .from('mm_assessment_responses')
            .select(`
                *,
                step:mm_assessment_steps(*)
            `)
            .eq('attempt_id', attemptId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('❌ Error fetching responses with steps:', error);
            throw error;
        }
        return data || [];
    },

    async deleteResponse(responseId: string): Promise<void> {
        const { error } = await supabase
            .from('mm_assessment_responses')
            .delete()
            .eq('id', responseId);

        if (error) {
            console.error('❌ Error deleting response:', error);
            throw error;
        }

        console.log('✅ Response deleted:', responseId);
    },

    async deleteResponsesForAttempt(attemptId: string): Promise<void> {
        const { error } = await supabase
            .from('mm_assessment_responses')
            .delete()
            .eq('attempt_id', attemptId);

        if (error) {
            console.error('❌ Error deleting responses for attempt:', error);
            throw error;
        }

        console.log('✅ All responses deleted for attempt:', attemptId);
    },

    // ============================================
    // KNOWLEDGE
    // ============================================

    async getKnowledgeByStep(stepId: string): Promise<Knowledge | null> {
        const step = await this.getStepById(stepId);
        if (!step) return null;

        const { data, error } = await supabase
            .from('mm_knowledge')
            .select('*')
            .eq('is_active', true)
            .or(`title.ilike.%${step.message}%,category.ilike.%${step.message}%,topic.ilike.%${step.message}%`)
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('❌ Error fetching knowledge by step:', error);
            throw error;
        }
        return data;
    },

    async getKnowledgeBySlug(slug: string): Promise<Knowledge | null> {
        const { data, error } = await supabase
            .from('mm_knowledge')
            .select('*')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

        if (error) {
            console.error('❌ Error fetching knowledge by slug:', error);
            throw error;
        }
        return data;
    },

    async getKnowledgeByCategory(category: string): Promise<Knowledge[]> {
        const { data, error } = await supabase
            .from('mm_knowledge')
            .select('*')
            .eq('category', category)
            .eq('is_active', true)
            .order('title', { ascending: true });

        if (error) {
            console.error('❌ Error fetching knowledge by category:', error);
            throw error;
        }
        return data || [];
    },

    // ============================================
    // STATS
    // ============================================

    async getUserStats(userId: string): Promise<AssessmentStats> {
        try {
            const attempts = await this.getAttempts(userId);
            const completed = attempts.filter(a => a.status === 'completed');

            return {
                total_attempts: attempts.length,
                completed_count: completed.length,
                average_score: completed.length > 0
                    ? completed.reduce((sum, a) => sum + a.score, 0) / completed.length
                    : 0,
                total_time_spent: completed.reduce((sum, a) => sum + a.time_spent_seconds, 0),
                best_score: completed.length > 0
                    ? Math.max(...completed.map(a => a.score))
                    : 0,
                recent_attempts: attempts.slice(0, 5)
            };
        } catch (error) {
            console.error('❌ Error getting user stats:', error);
            throw error;
        }
    }
};