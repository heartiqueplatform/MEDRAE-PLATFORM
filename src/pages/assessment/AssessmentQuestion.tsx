// src/pages/assessment/AssessmentQuestion.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, AlertCircle, Award, TrendingUp, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { assessmentService } from '@/services/assessmentService';
import { useAuth } from '@/context/AuthProvider';

// Cache configuration - same as AssessmentHome
const CACHE_CONFIG = {
    TTL: 5 * 60 * 1000, // 5 minutes
    STALE_WHILE_REVALIDATE: true,
};

// Simple in-memory cache
class DataCache {
    private cache: Map<string, { data: any; timestamp: number }> = new Map();

    set(key: string, data: any) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    get(key: string) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        return entry.data;
    }

    getAge(key: string): number {
        const entry = this.cache.get(key);
        if (!entry) return Infinity;
        return Date.now() - entry.timestamp;
    }

    isStale(key: string, ttl: number): boolean {
        return this.getAge(key) > ttl;
    }

    clear() {
        this.cache.clear();
    }
}

const cache = new DataCache();

// ═══════════════════════════════════════════════════════════════
// SKELETON — mirrors the real page structure
// ═══════════════════════════════════════════════════════════════
const QuestionSkeleton: React.FC = () => {
    return (
        <div className="w-full min-h-screen bg-gray-50 dark:bg-[#0d1117] overflow-x-hidden">
            <div className="flex flex-col min-h-screen">
                {/* Header */}
                <div className="flex-shrink-0 bg-white dark:bg-[#161b22] px-4 py-3">
                    <div className="flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-gray-200 dark:bg-[#21262d] rounded" />
                            <div className="w-16 h-4 bg-gray-200 dark:bg-[#21262d] rounded hidden sm:block" />
                        </div>
                        <div className="w-24 h-4 bg-gray-200 dark:bg-[#21262d] rounded" />
                        <div className="flex items-center gap-2">
                            <div className="w-14 h-6 bg-gray-200 dark:bg-[#21262d] rounded-full" />
                            <div className="w-14 h-6 bg-gray-200 dark:bg-[#21262d] rounded-full" />
                            <div className="w-14 h-6 bg-gray-200 dark:bg-[#21262d] rounded-full" />
                        </div>
                    </div>
                </div>

                {/* Progress */}
                <div className="flex-shrink-0 bg-white dark:bg-[#161b22] px-4 py-2">
                    <div className="flex items-center justify-between text-xs mb-1 animate-pulse">
                        <div className="w-12 h-3 bg-gray-200 dark:bg-[#21262d] rounded" />
                        <div className="w-8 h-3 bg-gray-200 dark:bg-[#21262d] rounded" />
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-[#21262d] rounded-full animate-pulse" />
                </div>

                {/* Main */}
                {/* Main */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="w-full bg-white dark:bg-[#161b22] rounded-2xl p-5 md:p-6 animate-pulse">
                        <div className="h-4 w-1/2 bg-gray-200 dark:bg-[#21262d] rounded mb-3" />
                        <div className="h-4 w-3/4 bg-gray-200 dark:bg-[#21262d] rounded mb-6" />
                        <div className="w-full h-32 bg-gray-100 dark:bg-[#21262d] rounded-xl mb-4" />
                        <div className="h-10 w-full bg-gray-200 dark:bg-[#21262d] rounded-xl" />
                    </div>

                    <div className="w-full mt-4 grid grid-cols-3 gap-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white dark:bg-[#161b22] rounded-2xl p-3 text-center animate-pulse">
                                <div className="w-10 h-6 bg-gray-200 dark:bg-[#21262d] rounded mx-auto mb-1" />
                                <div className="w-14 h-3 bg-gray-100 dark:bg-[#21262d] rounded mx-auto" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 bg-white dark:bg-[#161b22] px-4 py-3">
                    <div className="flex items-center justify-between animate-pulse">
                        <div className="w-24 h-3 bg-gray-200 dark:bg-[#21262d] rounded" />
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="w-2 h-2 bg-gray-200 dark:bg-[#21262d] rounded-full" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper to format explanation with bullet points and line breaks
const formatExplanation = (text: string): string => {
    if (!text) return '';
    let formatted = text.replace(/\n/g, '<br />');
    formatted = formatted.replace(/^[\s]*[-*]\s+(.+)$/gm, '• $1');
    formatted = formatted.replace(/^[\s]*(\d+)\.\s+(.+)$/gm, '$1. $2');
    formatted = formatted.replace(/(<br \/>){3,}/g, '<br /><br />');
    return formatted;
};

const getCacheKey = (slug: string, userId: string) => `assessment_${slug}_${userId}`;

export const AssessmentQuestion: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [assessment, setAssessment] = useState<any>(null);
    const [attempt, setAttempt] = useState<any>(null);
    const [currentStep, setCurrentStep] = useState<any>(null);
    const [allSteps, setAllSteps] = useState<any[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showResults, setShowResults] = useState(false);
    const [responses, setResponses] = useState<any[]>([]);
    const [score, setScore] = useState(0);
    const [totalPoints, setTotalPoints] = useState(0);
    const [maxPoints, setMaxPoints] = useState(0);
    const [timeSpent, setTimeSpent] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [showFeedback, setShowFeedback] = useState(false);
    const [lastResponse, setLastResponse] = useState<any>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const isLoadingRef = useRef(false);
    const initialLoadDoneRef = useRef(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        timerRef.current = setInterval(() => {
            setTimeSpent(prev => prev + 1);
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const loadAssessmentData = useCallback(async (forceRefresh = false) => {
        if (!slug || !user) return;
        if (isLoadingRef.current) return;

        const cacheKey = getCacheKey(slug, user.id);
        const cachedData = cache.get(cacheKey);

        if (!forceRefresh && cachedData && !cache.isStale(cacheKey, CACHE_CONFIG.TTL)) {
            const data = cachedData;
            setAssessment(data.assessment);
            setAttempt(data.attempt);
            setAllSteps(data.steps);
            setResponses(data.responses || []);
            setCurrentStepIndex(data.currentStepIndex || 0);
            setCorrectCount(data.correctCount || 0);
            setWrongCount(data.wrongCount || 0);
            setTotalPoints(data.totalPoints || 0);
            setMaxPoints(data.maxPoints || 0);

            if (data.steps && data.steps.length > 0) {
                const idx = data.currentStepIndex || 0;
                if (data.steps[idx]) setCurrentStep(data.steps[idx]);
            }

            if (data.attempt?.status === 'completed') {
                setShowResults(true);
                setScore(data.correctCount || 0);
            }

            setLoading(false);
            initialLoadDoneRef.current = true;
            return;
        }

        if (!cachedData) setLoading(true);
        else setIsRefreshing(true);

        setError(null);
        isLoadingRef.current = true;

        try {
            const assessmentData = await assessmentService.getAssessmentBySlug(slug);
            setAssessment(assessmentData);

            let attemptData = await assessmentService.getLatestAttempt(user.id, assessmentData.id);
            if (!attemptData || attemptData.status === 'completed' || attemptData.status === 'abandoned') {
                attemptData = await assessmentService.createAttempt(assessmentData.id, user.id);
            }
            setAttempt(attemptData);

            const steps = await assessmentService.getAssessmentSteps(assessmentData.id);
            setAllSteps(steps);

            const maxPointsTotal = steps.reduce((sum, s) => sum + (s.points || 0), 0);
            setMaxPoints(maxPointsTotal);

            const responsesData = await assessmentService.getResponsesWithSteps(attemptData.id);
            setResponses(responsesData);

            const correct = responsesData.filter(r => r.is_correct === true).length;
            const wrong = responsesData.filter(r => r.is_correct === false).length;
            setCorrectCount(correct);
            setWrongCount(wrong);

            const answeredCount = responsesData.length;
            const currentStepIdx = Math.min(answeredCount, steps.length - 1);
            setCurrentStepIndex(currentStepIdx);

            if (steps[currentStepIdx]) setCurrentStep(steps[currentStepIdx]);

            let total = 0;
            responsesData.forEach(r => {
                if (r.is_correct) total += r.step?.points || 0;
            });
            setTotalPoints(total);

            if (answeredCount >= steps.length && attemptData.status !== 'completed') {
                const finalScore = Math.round((correct / steps.length) * 100);
                await assessmentService.updateAttempt(attemptData.id, {
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    time_spent_seconds: timeSpent,
                    score: finalScore,
                    total_points: total,
                    correct_answers: correct,
                    wrong_answers: wrong
                });
                setShowResults(true);
                setScore(correct);
            } else if (attemptData.status === 'completed') {
                setShowResults(true);
                setScore(correct);
            }

            cache.set(cacheKey, {
                assessment: assessmentData,
                attempt: attemptData,
                steps: steps,
                responses: responsesData,
                currentStepIndex: currentStepIdx,
                correctCount: correct,
                wrongCount: wrong,
                totalPoints: total,
                maxPoints: maxPointsTotal,
            });

            initialLoadDoneRef.current = true;

        } catch (err) {
            console.error('❌ Error loading assessment:', err);
            if (!cache.get(cacheKey)) {
                setError(err instanceof Error ? err.message : 'Failed to load assessment');
            }
        } finally {
            setLoading(!cache.get(cacheKey) && !initialLoadDoneRef.current);
            setIsRefreshing(false);
            isLoadingRef.current = false;
        }
    }, [slug, user, timeSpent]);

    useEffect(() => {
        if (slug && user) {
            const cacheKey = getCacheKey(slug, user.id);
            const cachedData = cache.get(cacheKey);

            if (cachedData && !cache.isStale(cacheKey, CACHE_CONFIG.TTL)) {
                loadAssessmentData(false);
            } else {
                loadAssessmentData(true);
            }
        }
    }, [slug, user, loadAssessmentData]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && slug && user) {
                const cacheKey = getCacheKey(slug, user.id);
                if (cache.isStale(cacheKey, CACHE_CONFIG.TTL)) loadAssessmentData(true);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [slug, user, loadAssessmentData]);

    useEffect(() => {
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted && slug && user) {
                const cacheKey = getCacheKey(slug, user.id);
                if (cache.isStale(cacheKey, CACHE_CONFIG.TTL)) loadAssessmentData(true);
            }
        };
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, [slug, user, loadAssessmentData]);

    const handleSubmitAnswer = async () => {
        if (!answer.trim() || !currentStep || !attempt) return;

        setSubmitting(true);
        setShowFeedback(false);

        try {
            const expectedKeywords = currentStep.expected_keywords || [];
            const lowerAnswer = answer.toLowerCase();
            const matched = expectedKeywords.filter((kw: string) => lowerAnswer.includes(kw.toLowerCase()));
            const missing = expectedKeywords.filter((kw: string) => !lowerAnswer.includes(kw.toLowerCase()));
            const matchPercentage = expectedKeywords.length > 0 ? (matched.length / expectedKeywords.length) * 100 : 0;
            const isCorrect = matchPercentage >= 60;

            let feedback = '';
            let explanation = currentStep.explanation || '';

            if (isCorrect) {
                const encouragements = [
                    '✅ Excellent! You nailed it! 🎯',
                    '✅ Perfect answer! Great clinical reasoning! 💪',
                    '✅ Spot on! You really know your stuff! 🌟',
                    '✅ Outstanding! That\'s exactly right! 👏'
                ];
                feedback = encouragements[Math.floor(Math.random() * encouragements.length)];
            } else {
                if (matched.length === 0 && missing.length > 0) {
                    feedback = `❌ That's not quite right. Key concepts you missed: ${missing.join(', ')}.`;
                } else if (matched.length > 0 && missing.length > 0) {
                    feedback = `❌ Good start! You mentioned ${matched.join(', ')}. But you missed: ${missing.join(', ')}.`;
                } else {
                    feedback = `❌ That's not quite right. Review the explanation below.`;
                }
            }

            const response = await assessmentService.createResponse({
                attempt_id: attempt.id,
                step_id: currentStep.id,
                student_answer: answer,
                matched_keywords: matched,
                missing_keywords: missing,
                score: isCorrect ? currentStep.points || 10 : 0,
                feedback: feedback,
                response_time_seconds: timeSpent,
                is_correct: isCorrect
            });

            setLastResponse({
                ...response,
                isCorrect: isCorrect,
                explanation: explanation,
                expected_keywords: expectedKeywords,
                matched_keywords: matched,
                student_answer: answer
            });

            const newResponses = [...responses, response];
            setResponses(newResponses);

            if (isCorrect) {
                setCorrectCount(prev => prev + 1);
                setTotalPoints(prev => prev + (currentStep.points || 0));
            } else {
                setWrongCount(prev => prev + 1);
            }

            if (slug && user) {
                const cacheKey = getCacheKey(slug, user.id);
                const cachedData = cache.get(cacheKey);
                if (cachedData) {
                    cache.set(cacheKey, {
                        ...cachedData,
                        responses: newResponses,
                        correctCount: isCorrect ? cachedData.correctCount + 1 : cachedData.correctCount,
                        wrongCount: !isCorrect ? cachedData.wrongCount + 1 : cachedData.wrongCount,
                        totalPoints: isCorrect ? cachedData.totalPoints + (currentStep.points || 0) : cachedData.totalPoints,
                    });
                }
            }

            setShowFeedback(true);
            setAnswer('');

        } catch (err) {
            console.error('Error submitting answer:', err);
            setError(err instanceof Error ? err.message : 'Failed to submit answer');
            setShowFeedback(false);
        } finally {
            setSubmitting(false);
        }
    };

    const handleNextQuestion = () => {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex >= allSteps.length) {
            const finalScore = Math.round((correctCount / allSteps.length) * 100);
            assessmentService.updateAttempt(attempt.id, {
                status: 'completed',
                completed_at: new Date().toISOString(),
                time_spent_seconds: timeSpent,
                score: finalScore,
                total_points: totalPoints,
                correct_answers: correctCount,
                wrong_answers: wrongCount
            }).then(() => {
                setShowResults(true);
                setScore(correctCount);
                if (slug && user) cache.clear();
            });
        } else {
            setShowFeedback(false);
            setLastResponse(null);
            setCurrentStepIndex(nextIndex);
            setCurrentStep(allSteps[nextIndex]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && !showFeedback) {
            e.preventDefault();
            handleSubmitAnswer();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading && !cache.get(getCacheKey(slug || '', user?.id || ''))) {
        return <QuestionSkeleton />;
    }

    const showRefreshIndicator = isRefreshing && cache.get(getCacheKey(slug || '', user?.id || ''));

    if (error && !cache.get(getCacheKey(slug || '', user?.id || ''))) {
        return (
            <div className="w-full min-h-screen bg-gray-50 dark:bg-[#0d1117] flex items-center justify-center overflow-x-hidden px-4">
                <div className="max-w-md w-full bg-white dark:bg-[#161b22] rounded-2xl p-6 md:p-8 text-center">
                    <AlertCircle className="w-14 h-14 text-rose-500 mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">Something went wrong</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 break-words">{error}</p>
                    <button
                        onClick={() => {
                            if (slug && user) {
                                cache.clear();
                                loadAssessmentData(true);
                            }
                        }}
                        className="px-5 py-2.5 bg-gray-800 hover:bg-gray-900 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-white rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    if (!assessment || !attempt) {
        return (
            <div className="w-full min-h-screen bg-gray-50 dark:bg-[#0d1117] flex items-center justify-center overflow-x-hidden px-4">
                <div className="text-center">
                    <AlertCircle className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Assessment not found</h2>
                    <button
                        onClick={() => navigate('/assessments')}
                        className="mt-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline transition-colors"
                    >
                        Return to assessments
                    </button>
                </div>
            </div>
        );
    }

    if (showResults || attempt.status === 'completed') {
        const percentage = Math.round((score / allSteps.length) * 100);

        return (
            <div className="w-full min-h-screen bg-gray-50 dark:bg-[#0d1117] flex items-center justify-center overflow-x-hidden px-4 py-8">
                <div className="max-w-md w-full bg-white dark:bg-[#161b22] rounded-2xl p-6 md:p-8 text-center">
                    <div className="text-5xl mb-4">🎉</div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                        Assessment complete
                    </h2>

                    <div className="my-6">
                        <div className="text-5xl font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                            {percentage}%
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            {score} of {allSteps.length} questions correct
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {totalPoints} / {maxPoints} points
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-6">
                        <div className="bg-gray-50 dark:bg-[#21262d] rounded-xl p-3">
                            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {correctCount}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Correct</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#21262d] rounded-xl p-3">
                            <div className="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                {wrongCount}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Wrong</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#21262d] rounded-xl p-3">
                            <div className="text-xl font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                                {formatTime(timeSpent)}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Time</div>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            if (slug && user) cache.clear();
                            navigate('/assessments');
                        }}
                        className="w-full px-5 py-3 bg-gray-800 hover:bg-gray-900 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-white rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                    >
                        Back to assessments
                    </button>
                </div>
            </div>
        );
    }

    const progress = Math.round((currentStepIndex / allSteps.length) * 100);

    return (
        <div className="w-full min-h-screen flex flex-col bg-gray-50 dark:bg-[#0d1117] overflow-x-hidden">
            {showRefreshIndicator && (
                <div className="fixed top-0 right-0 m-4 z-50">
                    <div className="bg-gray-800 dark:bg-[#21262d] text-white text-xs px-3 py-1 rounded-full animate-pulse">
                        Refreshing…
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex-shrink-0 bg-white dark:bg-[#161b22] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                    <button
                        onClick={() => {
                            if (slug && user && !showResults) {
                                const cacheKey = getCacheKey(slug, user.id);
                                cache.set(cacheKey, {
                                    assessment, attempt, steps: allSteps, responses,
                                    currentStepIndex, correctCount, wrongCount, totalPoints, maxPoints,
                                });
                            }
                            navigate('/assessments');
                        }}
                        className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex-shrink-0"
                        aria-label="Go back"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="text-sm font-medium hidden sm:inline">Back</span>
                    </button>

                    <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">
                            {assessment.title}
                        </span>
                        {assessment.tutor_personality && (
                            <span className="text-[11px] px-2 py-0.5 bg-gray-100 dark:bg-[#21262d] rounded-full text-gray-500 dark:text-gray-400 hidden sm:inline flex-shrink-0">
                                {assessment.tutor_personality}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#21262d] px-2 py-1 rounded-full">
                            <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 dark:text-gray-400" />
                            <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                                {totalPoints}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#21262d] px-2 py-1 rounded-full">
                            <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 dark:text-gray-400" />
                            <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                                {currentStepIndex + 1}/{allSteps.length}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#21262d] px-2 py-1 rounded-full">
                            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 dark:text-gray-400" />
                            <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                                {formatTime(timeSpent)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="flex-shrink-0 bg-white dark:bg-[#161b22] px-4 py-2">
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                    <span>Progress</span>
                    <span className="tabular-nums">{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gray-800 dark:bg-gray-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="w-full">

                    {/* Question card */}
                    <div className={`bg-white dark:bg-[#161b22] rounded-2xl p-5 md:p-6 mb-4 transition-all duration-300 ${showFeedback ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-700 dark:text-gray-300 text-sm font-bold tabular-nums shrink-0">
                                {currentStepIndex + 1}
                            </div>
                            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                Question {currentStepIndex + 1} of {allSteps.length}
                            </span>
                            {currentStep?.points && (
                                <span className="ml-auto text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#21262d] px-2 py-0.5 rounded-full">
                                    {currentStep.points} pts
                                </span>
                            )}
                        </div>

                        <p className="text-base font-medium text-gray-800 dark:text-gray-200 leading-relaxed break-words">
                            {currentStep?.message || 'Question not available'}
                        </p>
                    </div>

                    {/* Answer input */}
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl p-5 md:p-6 mb-4">
                        <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your answer here…"
                            className="w-full min-h-[120px] sm:min-h-[140px] p-4 bg-gray-50 dark:bg-[#21262d] rounded-xl focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#30363d] focus:outline-none resize-y text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm leading-relaxed"
                            disabled={submitting || showFeedback}
                        />

                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 mt-3">
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 text-center sm:text-left">
                                Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#21262d] rounded text-[10px] font-mono">Enter</kbd> to submit
                            </span>
                            <button
                                onClick={handleSubmitAnswer}
                                disabled={!answer.trim() || submitting || showFeedback}
                                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${answer.trim() && !submitting && !showFeedback
                                    ? 'bg-gray-800 hover:bg-gray-900 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-white'
                                    : 'bg-gray-200 dark:bg-[#21262d] text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                    }`}
                            >
                                {submitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                                        Submitting…
                                    </>
                                ) : (
                                    <>
                                        Submit answer
                                        <Send className="w-3.5 h-3.5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Feedback card */}
                    {showFeedback && lastResponse && (
                        <div className="bg-white dark:bg-[#161b22] rounded-2xl p-5 md:p-6 mb-4">
                            <div className="flex items-start gap-3">
                                <div className="shrink-0 mt-0.5">
                                    {lastResponse.isCorrect ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
                                        {lastResponse.isCorrect ? 'Correct' : 'Not quite right'}
                                    </h3>

                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 break-words leading-relaxed">
                                        {lastResponse.feedback}
                                    </p>

                                    {lastResponse.explanation && (
                                        <div className="bg-gray-50 dark:bg-[#21262d] rounded-xl p-4 mb-3">
                                            <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1.5">
                                                Correct answer
                                            </p>
                                            <div
                                                className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words"
                                                dangerouslySetInnerHTML={{
                                                    __html: formatExplanation(lastResponse.explanation)
                                                }}
                                            />
                                        </div>
                                    )}

                                    {lastResponse.expected_keywords && lastResponse.expected_keywords.length > 0 && (
                                        <div className="bg-gray-50 dark:bg-[#21262d] rounded-xl p-4">
                                            <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-2">
                                                Key concepts
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {lastResponse.expected_keywords.map((kw: string, idx: number) => {
                                                    const isMatched = lastResponse.matched_keywords?.includes(kw);
                                                    return (
                                                        <span
                                                            key={idx}
                                                            className={`px-2.5 py-1 rounded-full text-xs break-words ${isMatched
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                                                                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
                                                                }`}
                                                        >
                                                            {isMatched ? '✓' : '×'} {kw}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-3 flex items-center gap-2 text-xs flex-wrap">
                                        <Award className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                                            {lastResponse.isCorrect ? `+${currentStep?.points || 10} points` : '0 points'}
                                        </span>
                                        <span className="text-gray-400 dark:text-gray-500">
                                            (Max: {currentStep?.points || 10})
                                        </span>
                                    </div>

                                    <button
                                        onClick={handleNextQuestion}
                                        className="mt-4 w-full px-5 py-2.5 bg-gray-800 hover:bg-gray-900 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                    >
                                        {currentStepIndex + 1 >= allSteps.length ? (
                                            'See results'
                                        ) : (
                                            <>
                                                Next question
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Progress stats */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white dark:bg-[#161b22] rounded-2xl p-3 text-center">
                            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {correctCount}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Correct</div>
                        </div>
                        <div className="bg-white dark:bg-[#161b22] rounded-2xl p-3 text-center">
                            <div className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                {wrongCount}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Wrong</div>
                        </div>
                        <div className="bg-white dark:bg-[#161b22] rounded-2xl p-3 text-center">
                            <div className="text-lg font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                                {totalPoints}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Points</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky footer */}
            <div className="flex-shrink-0 bg-white dark:bg-[#161b22] px-4 py-3">
                <div className="w-full flex items-center justify-between">
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                        {currentStepIndex + 1} of {allSteps.length}
                    </div>
                    <div className="flex items-center gap-1">
                        {allSteps.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1.5 rounded-full transition-all ${idx === currentStepIndex
                                    ? 'w-5 bg-gray-800 dark:bg-gray-400'
                                    : idx < currentStepIndex
                                        ? 'w-1.5 bg-emerald-500 dark:bg-emerald-400'
                                        : 'w-1.5 bg-gray-200 dark:bg-[#21262d]'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};