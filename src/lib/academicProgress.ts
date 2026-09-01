// lib/academicProgress.ts

import { supabase } from '@/lib/supabaseClient';

export interface ProgressSummary {
    total_questions_attempted: number;
    correct_answers: number;
    incorrect_answers: number;
    skipped_questions: number;
    overall_accuracy: number;
    total_time_spent: number;
    questions_mastered: number;
    questions_needing_review: number;
}

export interface RecentAttempt {
    question_id: string;
    question_text: string;
    selected_option: string | null;
    is_correct: boolean;
    attempted_at: string;
    time_taken: number | null;
}

export interface WeakArea {
    question_id: string;
    question_text: string;
    accuracy: number;
    attempts_count: number;
    topic_id: string;
}

export interface QuestionProgress {
    id: string;
    user_id: string;
    question_id: string;
    attempts_count: number;
    correct_count: number;
    incorrect_count: number;
    skipped_count: number;
    current_score: number;
    accuracy: number;
    last_attempted_at: string | null;
    last_correct_at: string | null;
    is_completed: boolean;
    completed_at: string | null;
    answers: any;
    total_time_spent: number;
}

// =============================================
// SERVICE CLASS
// =============================================

export class AcademicProgressService {
    private static instance: AcademicProgressService;

    static getInstance(): AcademicProgressService {
        if (!AcademicProgressService.instance) {
            AcademicProgressService.instance = new AcademicProgressService();
        }
        return AcademicProgressService.instance;
    }

    // =============================================
    // GET OR CREATE PROGRESS FOR A QUESTION
    // =============================================
    async getOrCreateProgress(userId: string, questionId: string): Promise<QuestionProgress | null> {
        try {
            // Try to get existing
            const { data: existing, error } = await supabase
                .from('academic_user_progress')
                .select('*')
                .eq('user_id', userId)
                .eq('question_id', questionId)
                .maybeSingle();

            if (error) throw error;
            if (existing) return existing as QuestionProgress;

            // Create new
            const { data: created, error: createError } = await supabase
                .from('academic_user_progress')
                .insert([{
                    user_id: userId,
                    question_id: questionId,
                    answers: {},
                    total_time_spent: 0,
                    attempts_count: 0,
                    correct_count: 0,
                    incorrect_count: 0,
                    skipped_count: 0,
                    current_score: 0,
                    accuracy: 0,
                    is_completed: false
                }])
                .select()
                .single();

            if (createError) throw createError;
            return created as QuestionProgress;
        } catch (_error) {
            // Silent fail - no console
            return null;
        }
    }

    // =============================================
    // SAVE ATTEMPT
    // =============================================
    async saveAttempt(attempt: {
        user_id: string;
        question_id: string;
        progress_id?: string;
        selected_option?: string | null;
        is_correct?: boolean;
        is_skipped?: boolean;
        time_taken?: number;
        confidence_level?: 'high' | 'medium' | 'low' | 'guessed';
        mistake_reason?: string;
    }) {
        try {
            const { data, error } = await supabase
                .from('academic_question_attempts')
                .insert([{
                    ...attempt,
                    attempted_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (_error) {
            // Silent fail - no console
            return null;
        }
    }

    // =============================================
    // UPDATE PROGRESS
    // =============================================
    async updateProgress(
        userId: string,
        questionId: string,
        updates: Partial<QuestionProgress>
    ): Promise<QuestionProgress | null> {
        try {
            const { data, error } = await supabase
                .from('academic_user_progress')
                .update(updates)
                .eq('user_id', userId)
                .eq('question_id', questionId)
                .select()
                .single();

            if (error) throw error;
            return data as QuestionProgress;
        } catch (_error) {
            // Silent fail - no console
            return null;
        }
    }

    // =============================================
    // GET PROGRESS SUMMARY (Dashboard)
    // =============================================
    async getProgressSummary(userId: string): Promise<ProgressSummary | null> {
        try {
            // Get all progress for this user
            const { data: progressData, error: progressError } = await supabase
                .from('academic_user_progress')
                .select('*')
                .eq('user_id', userId);

            if (progressError) throw progressError;

            // Get all attempts for this user
            const { data: attemptsData, error: attemptsError } = await supabase
                .from('academic_question_attempts')
                .select('*')
                .eq('user_id', userId);

            if (attemptsError) throw attemptsError;

            if (!progressData || progressData.length === 0) {
                return {
                    total_questions_attempted: 0,
                    correct_answers: 0,
                    incorrect_answers: 0,
                    skipped_questions: 0,
                    overall_accuracy: 0,
                    total_time_spent: 0,
                    questions_mastered: 0,
                    questions_needing_review: 0
                };
            }

            // Calculate totals
            const totalAttempts = progressData.reduce((sum, p) => sum + (p.attempts_count || 0), 0);
            const correctAnswers = progressData.reduce((sum, p) => sum + (p.correct_count || 0), 0);
            const incorrectAnswers = progressData.reduce((sum, p) => sum + (p.incorrect_count || 0), 0);
            const skippedQuestions = progressData.reduce((sum, p) => sum + (p.skipped_count || 0), 0);
            const totalTimeSpent = progressData.reduce((sum, p) => sum + (p.total_time_spent || 0), 0);

            // Calculate mastery
            let mastered = 0;
            let needsReview = 0;
            progressData.forEach(p => {
                const total = p.attempts_count || 0;
                if (total === 0) return;
                const accuracy = (p.correct_count || 0) / total;
                if (accuracy >= 0.8) mastered++;
                else if (accuracy >= 0.5) needsReview++;
            });

            const overallAccuracy = totalAttempts > 0 ? (correctAnswers / totalAttempts) * 100 : 0;

            return {
                total_questions_attempted: totalAttempts,
                correct_answers: correctAnswers,
                incorrect_answers: incorrectAnswers,
                skipped_questions: skippedQuestions,
                overall_accuracy: overallAccuracy,
                total_time_spent: totalTimeSpent,
                questions_mastered: mastered,
                questions_needing_review: needsReview
            };
        } catch (_error) {
            // Silent fail - no console
            return {
                total_questions_attempted: 0,
                correct_answers: 0,
                incorrect_answers: 0,
                skipped_questions: 0,
                overall_accuracy: 0,
                total_time_spent: 0,
                questions_mastered: 0,
                questions_needing_review: 0
            };
        }
    }

    // =============================================
    // GET TOTAL ATTEMPTS FROM SUMMARY TABLE
    // =============================================
    async getTotalAttempts(): Promise<number> {
        try {
            // Direct query to the summary table
            const { data, error } = await supabase
                .from('quiz_attempts_summary')
                .select('total_attempts')
                .limit(1)
                .single();

            if (error) {
                // Silent fail - no console
                return 0;
            }

            return data?.total_attempts || 0;
        } catch (_error) {
            // Silent fail - no console
            return 0;
        }
    }

    // =============================================
    // GET FULL SUMMARY STATS
    // =============================================
    async getSummaryStats(): Promise<{
        totalAttempts: number;
        totalUsers: number;
        totalQuestionsAnswered: number;
        totalCorrect: number;
        totalIncorrect: number;
        totalSkipped: number;
        averageAccuracy: number;
        lastUpdated: string;
        dailyAttempts: Record<string, number>;
        monthlyAttempts: Record<string, number>;
        academicAttempts: number;
        quizAttempts: number;
        qfeedSeen: number;
    } | null> {
        try {
            // Direct query to the summary table
            const { data, error } = await supabase
                .from('quiz_attempts_summary')
                .select('*')
                .limit(1)
                .single();

            if (error) {
                // Silent fail - no console
                return null;
            }

            if (!data) {
                return null;
            }

            return {
                totalAttempts: data.total_attempts || 0,
                totalUsers: data.total_users || 0,
                totalQuestionsAnswered: data.total_questions_answered || 0,
                totalCorrect: data.total_correct_answers || 0,
                totalIncorrect: data.total_incorrect_answers || 0,
                totalSkipped: data.total_skipped_answers || 0,
                averageAccuracy: data.average_accuracy || 0,
                lastUpdated: data.last_updated,
                dailyAttempts: data.daily_attempts || {},
                monthlyAttempts: data.monthly_attempts || {},
                academicAttempts: data.academic_attempts || 0,
                quizAttempts: data.quiz_attempts_count || 0,
                qfeedSeen: data.qfeed_seen_count || 0
            };
        } catch (_error) {
            // Silent fail - no console
            return null;
        }
    }

    // =============================================
    // GET RECENT ATTEMPTS
    // =============================================
    async getRecentAttempts(userId: string, limit: number = 10): Promise<RecentAttempt[]> {
        try {
            const { data, error } = await supabase
                .from('academic_question_attempts')
                .select(`
                question_id,
                selected_option,
                is_correct,
                attempted_at,
                time_taken,
                academic_questions!inner (
                    stem
                )
            `)
                .eq('user_id', userId)
                .order('attempted_at', { ascending: false })
                .limit(limit);

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                return [];
            }

            return data.map(attempt => ({
                question_id: attempt.question_id,
                question_text: attempt.academic_questions?.stem || 'Question',
                selected_option: attempt.selected_option,
                is_correct: attempt.is_correct || false,
                attempted_at: attempt.attempted_at,
                time_taken: attempt.time_taken
            }));
        } catch (_error) {
            // Silent fail - no console
            return [];
        }
    }

    // =============================================
    // GET WEAK AREAS (Questions needing review)
    // =============================================
    async getWeakAreas(userId: string, limit: number = 5): Promise<WeakArea[]> {
        try {
            const { data, error } = await supabase
                .from('academic_user_progress')
                .select(`
                question_id,
                attempts_count,
                correct_count,
                accuracy,
                academic_questions!inner (
                    stem,
                    topic_id
                )
            `)
                .eq('user_id', userId)
                .gt('attempts_count', 0)
                .lt('accuracy', 50)
                .order('accuracy', { ascending: true })
                .limit(limit);

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                return [];
            }

            return data.map(item => ({
                question_id: item.question_id,
                question_text: item.academic_questions?.stem || 'Question',
                accuracy: item.accuracy || 0,
                attempts_count: item.attempts_count || 0,
                topic_id: item.academic_questions?.topic_id || ''
            }));
        } catch (_error) {
            // Silent fail - no console
            return [];
        }
    }

    // =============================================
    // GET QUESTION PROGRESS
    // =============================================
    async getQuestionProgress(userId: string, questionId: string): Promise<QuestionProgress | null> {
        try {
            const { data, error } = await supabase
                .from('academic_user_progress')
                .select('*')
                .eq('user_id', userId)
                .eq('question_id', questionId)
                .maybeSingle();

            if (error) throw error;
            return data as QuestionProgress | null;
        } catch (_error) {
            // Silent fail - no console
            return null;
        }
    }

    // =============================================
    // GET ALL PROGRESS FOR A USER
    // =============================================
    async getAllUserProgress(userId: string): Promise<QuestionProgress[]> {
        try {
            const { data, error } = await supabase
                .from('academic_user_progress')
                .select('*')
                .eq('user_id', userId)
                .order('last_attempted_at', { ascending: false });

            if (error) throw error;
            return (data || []) as QuestionProgress[];
        } catch (_error) {
            // Silent fail - no console
            return [];
        }
    }

    // =============================================
    // GET ATTEMPT HISTORY FOR A QUESTION
    // =============================================
    async getQuestionAttempts(userId: string, questionId: string): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('academic_question_attempts')
                .select('*')
                .eq('user_id', userId)
                .eq('question_id', questionId)
                .order('attempted_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (_error) {
            // Silent fail - no console
            return [];
        }
    }

    // =============================================
    // GET COMPLETED QUESTIONS COUNT
    // =============================================
    async getCompletedCount(userId: string): Promise<number> {
        try {
            const { count, error } = await supabase
                .from('academic_user_progress')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_completed', true);

            if (error) throw error;
            return count || 0;
        } catch (_error) {
            // Silent fail - no console
            return 0;
        }
    }

    // =============================================
    // GET MASTERY STATS
    // =============================================
    async getMasteryStats(userId: string): Promise<{
        mastered: number;
        needsReview: number;
        needsPractice: number;
        total: number;
    }> {
        try {
            const allProgress = await this.getAllUserProgress(userId);

            let mastered = 0;
            let needsReview = 0;
            let needsPractice = 0;

            allProgress.forEach(p => {
                const total = p.attempts_count || 0;
                if (total === 0) return;

                const accuracy = (p.correct_count || 0) / total;
                if (accuracy >= 0.8) mastered++;
                else if (accuracy >= 0.5) needsReview++;
                else needsPractice++;
            });

            return {
                mastered,
                needsReview,
                needsPractice,
                total: allProgress.length
            };
        } catch (_error) {
            // Silent fail - no console
            return { mastered: 0, needsReview: 0, needsPractice: 0, total: 0 };
        }
    }
}

// =============================================
// EXPORT SINGLETON INSTANCE
// =============================================

export const academicProgress = AcademicProgressService.getInstance();