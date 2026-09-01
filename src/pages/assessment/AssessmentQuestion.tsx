// src/pages/assessment/AssessmentQuestion.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, AlertCircle, Award, TrendingUp, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
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
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
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

// Singleton cache instance (shared with AssessmentHome)
const cache = new DataCache();

// Skeleton Loader Component
const QuestionSkeleton: React.FC = () => {
    return (
        <div className="w-full min-h-screen bg-transparent dark:bg-muted/30 overflow-x-hidden">
            <div className="flex flex-col min-h-screen">
                {/* Header Skeleton */}
                <div className="flex-shrink-0 bg-white/50 dark:bg-muted/30 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse hidden sm:block"></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                            <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                            <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                </div>

                {/* Progress Bar Skeleton */}
                <div className="flex-shrink-0 bg-white/50 dark:bg-muted/30 px-4 py-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                        <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="w-8 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                </div>

                {/* Main Content Skeleton */}
                <div className="flex-1 overflow-y-auto px-4 py-4 bg-transparent">
                    <div className="bg-white/90 backdrop-blur-sm dark:bg-slate-900/90 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl shadow-slate-200/50 dark:shadow-black/50 p-6 md:p-8 mb-6">
                        <div className="flex items-start gap-3 mb-6">
                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                            <div className="flex-1">
                                <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                                <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            </div>
                        </div>
                        <div className="w-full min-h-[150px] bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                        <div className="flex justify-between items-center mt-4">
                            <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            <div className="w-36 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl p-3 text-center">
                                <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto"></div>
                                <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mt-1"></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-shrink-0 bg-white/50 dark:bg-muted/30 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="w-32 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="w-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
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

// Cache key generator
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

    // Refs for caching and loading state
    const isLoadingRef = useRef(false);
    const initialLoadDoneRef = useRef(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Timer with cleanup
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setTimeSpent(prev => prev + 1);
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    // Load assessment data with caching
    const loadAssessmentData = useCallback(async (forceRefresh = false) => {
        if (!slug || !user) return;
        if (isLoadingRef.current) return;

        const cacheKey = getCacheKey(slug, user.id);
        const cachedData = cache.get(cacheKey);

        // If we have cached data and not forcing refresh, use it
        if (!forceRefresh && cachedData && !cache.isStale(cacheKey, CACHE_CONFIG.TTL)) {
            console.log('✅ Using cached assessment data');
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
                if (data.steps[idx]) {
                    setCurrentStep(data.steps[idx]);
                }
            }

            if (data.attempt?.status === 'completed') {
                setShowResults(true);
                setScore(data.correctCount || 0);
            }

            setLoading(false);
            initialLoadDoneRef.current = true;
            return;
        }

        // Set loading state only if we don't have cached data
        if (!cachedData) {
            setLoading(true);
        } else {
            setIsRefreshing(true);
        }

        setError(null);
        isLoadingRef.current = true;

        try {
            console.log('🟡 Loading assessment data...', forceRefresh ? '(force refresh)' : '');

            // Fetch assessment data
            const assessmentData = await assessmentService.getAssessmentBySlug(slug);
            setAssessment(assessmentData);

            // Get or create attempt
            let attemptData = await assessmentService.getLatestAttempt(user.id, assessmentData.id);
            if (!attemptData || attemptData.status === 'completed' || attemptData.status === 'abandoned') {
                attemptData = await assessmentService.createAttempt(assessmentData.id, user.id);
            }
            setAttempt(attemptData);

            // Fetch steps
            const steps = await assessmentService.getAssessmentSteps(assessmentData.id);
            setAllSteps(steps);

            // Calculate max points
            const maxPointsTotal = steps.reduce((sum, s) => sum + (s.points || 0), 0);
            setMaxPoints(maxPointsTotal);

            // Fetch responses
            const responsesData = await assessmentService.getResponsesWithSteps(attemptData.id);
            setResponses(responsesData);

            // Calculate stats
            const correct = responsesData.filter(r => r.is_correct === true).length;
            const wrong = responsesData.filter(r => r.is_correct === false).length;
            setCorrectCount(correct);
            setWrongCount(wrong);

            // Determine current step
            const answeredCount = responsesData.length;
            const currentStepIdx = Math.min(answeredCount, steps.length - 1);
            setCurrentStepIndex(currentStepIdx);

            if (steps[currentStepIdx]) {
                setCurrentStep(steps[currentStepIdx]);
            }

            // Calculate total points
            let total = 0;
            responsesData.forEach(r => {
                if (r.is_correct) {
                    total += r.step?.points || 0;
                }
            });
            setTotalPoints(total);

            // Check if assessment is complete
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

            // Cache the data
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
            // Only show error if we have no cached data
            if (!cache.get(cacheKey)) {
                setError(err instanceof Error ? err.message : 'Failed to load assessment');
            }
        } finally {
            setLoading(!cache.get(cacheKey) && !initialLoadDoneRef.current);
            setIsRefreshing(false);
            isLoadingRef.current = false;
        }
    }, [slug, user, timeSpent]);

    // Initial load with cache check
    useEffect(() => {
        if (slug && user) {
            const cacheKey = getCacheKey(slug, user.id);
            const cachedData = cache.get(cacheKey);

            if (cachedData && !cache.isStale(cacheKey, CACHE_CONFIG.TTL)) {
                console.log('📦 Loading from cache');
                loadAssessmentData(false);
            } else {
                console.log('🔄 No cache or stale, loading fresh');
                loadAssessmentData(true);
            }
        }
    }, [slug, user, loadAssessmentData]);

    // Handle visibility change (user comes back to tab)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && slug && user) {
                const cacheKey = getCacheKey(slug, user.id);
                const isStale = cache.isStale(cacheKey, CACHE_CONFIG.TTL);
                if (isStale) {
                    console.log('👁️ Page visible, cache stale, refreshing...');
                    loadAssessmentData(true);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [slug, user, loadAssessmentData]);

    // Handle pageshow (user navigates back)
    useEffect(() => {
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted && slug && user) {
                const cacheKey = getCacheKey(slug, user.id);
                const isStale = cache.isStale(cacheKey, CACHE_CONFIG.TTL);
                if (isStale) {
                    console.log('🔄 Page restored from bfcache, refreshing...');
                    loadAssessmentData(true);
                }
            }
        };

        window.addEventListener('pageshow', handlePageShow);
        return () => {
            window.removeEventListener('pageshow', handlePageShow);
        };
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

            // Update cache with new data
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

                // Clear cache for this assessment
                if (slug && user) {
                    const cacheKey = getCacheKey(slug, user.id);
                    cache.clear();
                }
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

    const getScoreColor = (percentage: number) => {
        if (percentage >= 80) return 'text-green-600 dark:text-green-400';
        if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    // Show skeleton on first load with no cache
    if (loading && !cache.get(getCacheKey(slug || '', user?.id || ''))) {
        return <QuestionSkeleton />;
    }

    // Background refresh indicator
    const showRefreshIndicator = isRefreshing && cache.get(getCacheKey(slug || '', user?.id || ''));

    if (error && !cache.get(getCacheKey(slug || '', user?.id || ''))) {
        return (
            <div className="w-full min-h-screen bg-transparent dark:bg-muted/30 flex items-center justify-center overflow-x-hidden">
                <div className="max-w-md w-full mx-4 bg-white/90 backdrop-blur-sm dark:bg-slate-900/90 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl shadow-slate-200/50 dark:shadow-black/50 p-6 md:p-10 text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Something went wrong</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                    <button
                        onClick={() => {
                            if (slug && user) {
                                const cacheKey = getCacheKey(slug, user.id);
                                cache.clear();
                                loadAssessmentData(true);
                            }
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-xl shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 transition-all font-bold"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!assessment || !attempt) {
        return (
            <div className="w-full min-h-screen bg-transparent dark:bg-muted/30 flex items-center justify-center overflow-x-hidden">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Assessment not found</h2>
                    <button
                        onClick={() => navigate('/assessments')}
                        className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Return to assessments
                    </button>
                </div>
            </div>
        );
    }

    if (showResults || attempt.status === 'completed') {
        const percentage = Math.round((score / allSteps.length) * 100);
        const scoreColor = getScoreColor(percentage);

        return (
            <div className="w-full min-h-screen bg-transparent dark:bg-muted/30 flex items-center justify-center overflow-x-hidden">
                <div className="max-w-md w-full mx-4 bg-white/90 backdrop-blur-sm dark:bg-slate-900/90 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl shadow-slate-200/50 dark:shadow-black/50 p-6 md:p-10 text-center">
                    <div className="animate-bounce mb-4">
                        <span className="text-6xl">🎉</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Assessment Complete!</h2>

                    <div className="my-6">
                        <div className={`text-6xl font-bold ${scoreColor}`}>{percentage}%</div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            You got {score} out of {allSteps.length} questions correct
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Total Points: {totalPoints} / {maxPoints}
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{correctCount}</div>
                            <div className="text-xs text-green-600 dark:text-green-400">Correct</div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3">
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{wrongCount}</div>
                            <div className="text-xs text-red-600 dark:text-red-400">Wrong</div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatTime(timeSpent)}</div>
                            <div className="text-xs text-blue-600 dark:text-blue-400">Time</div>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            // Clear cache when leaving
                            if (slug && user) {
                                const cacheKey = getCacheKey(slug, user.id);
                                cache.clear();
                            }
                            navigate('/assessments');
                        }}
                        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-xl shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 transition-all font-bold"
                    >
                        Back to Assessments
                    </button>
                </div>
            </div>
        );
    }

    const progress = Math.round((currentStepIndex / allSteps.length) * 100);

    return (
        <div className="w-full min-h-screen flex flex-col bg-transparent dark:bg-muted/30 overflow-x-hidden">
            {/* Background refresh indicator */}
            {showRefreshIndicator && (
                <div className="fixed top-0 right-0 m-4 z-50">
                    <div className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full shadow-lg animate-pulse">
                        Refreshing...
                    </div>
                </div>
            )}

            {/* Header - sticky */}
            <div className="flex-shrink-0 bg-white/50 dark:bg-muted/30 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 py-3">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => {
                            // Save progress to cache before leaving
                            if (slug && user && !showResults) {
                                const cacheKey = getCacheKey(slug, user.id);
                                cache.set(cacheKey, {
                                    assessment,
                                    attempt,
                                    steps: allSteps,
                                    responses,
                                    currentStepIndex,
                                    correctCount,
                                    wrongCount,
                                    totalPoints,
                                    maxPoints,
                                });
                            }
                            navigate('/assessments');
                        }}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors flex-shrink-0"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="text-sm font-medium hidden sm:inline">Back</span>
                    </button>

                    <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px] sm:max-w-xs">
                            {assessment.title}
                        </span>
                        <span className="text-xs px-2 py-1 bg-muted dark:bg-muted/50 rounded-full text-muted-foreground hidden sm:inline flex-shrink-0">
                            {assessment.tutor_personality || 'Normal'} Tutor
                        </span>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
                        <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-1.5 sm:px-2 py-1 rounded-full">
                            <Award className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-400">{totalPoints} pts</span>
                        </div>
                        <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 px-1.5 sm:px-2 py-1 rounded-full">
                            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" />
                            <span className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-400">{currentStepIndex}/{allSteps.length}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/30 px-1.5 sm:px-2 py-1 rounded-full">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
                            <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">{formatTime(timeSpent)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="flex-shrink-0 bg-white/50 dark:bg-muted/30 px-4 py-2">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 bg-transparent dark:bg-muted/30 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                {/* Question Card */}
                <div className={`bg-white/90 backdrop-blur-sm dark:bg-slate-900/90 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl shadow-slate-200/50 dark:shadow-black/50 p-5 sm:p-6 md:p-8 mb-6 transition-all duration-500 ${showFeedback ? 'opacity-50 pointer-events-none' : ''
                    }`}>
                    <div className="mb-6">
                        {/* Number icon - centered at top */}
                        <div className="flex justify-center mb-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30">
                                {currentStepIndex + 1}
                            </div>
                        </div>

                        {/* Question text - starts from edge */}
                        <p className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 leading-relaxed break-words">
                            {currentStep?.message || 'Question not available'}
                        </p>
                    </div>

                    {/* Answer Input */}
                    <div className="space-y-4">
                        <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your answer here..."
                            className="w-full min-h-[120px] sm:min-h-[150px] p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none resize-y text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-base"
                            disabled={submitting || showFeedback}
                        />

                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
                            <span className="text-xs text-gray-400 dark:text-gray-500 text-center sm:text-left">
                                Press <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Enter</kbd> to submit
                            </span>
                            <button
                                onClick={handleSubmitAnswer}
                                disabled={!answer.trim() || submitting || showFeedback}
                                className={`
                    w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all
                    ${answer.trim() && !submitting && !showFeedback
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}
                `}
                            >
                                {submitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        Submit Answer
                                        <Send className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Feedback Card - Shows immediately after answering */}
                {showFeedback && lastResponse && (
                    <div className={`animate-slide-up rounded-[1.5rem] p-5 sm:p-6 md:p-8 mb-6 backdrop-blur-sm ${lastResponse.isCorrect
                        ? 'bg-green-50/90 dark:bg-green-900/30'
                        : 'bg-red-50/90 dark:bg-red-900/30'
                        }`}>
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                                {lastResponse.isCorrect ? (
                                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                                ) : (
                                    <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                                )}
                            </div>
                            <div className="flex-1 w-full min-w-0">
                                <h3 className={`text-lg font-semibold mb-2 ${lastResponse.isCorrect
                                    ? 'text-green-700 dark:text-green-300'
                                    : 'text-red-700 dark:text-red-300'
                                    }`}>
                                    {lastResponse.isCorrect ? '✅ Correct!' : '❌ Not quite right'}
                                </h3>

                                <p className="text-gray-700 dark:text-gray-300 mb-3 break-words">
                                    {lastResponse.feedback}
                                </p>

                                {/* Show the correct answer / explanation with formatting */}
                                {lastResponse.explanation && (
                                    <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-4 mb-3">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">📚 Correct Answer:</p>
                                        <div
                                            className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed break-words"
                                            dangerouslySetInnerHTML={{
                                                __html: formatExplanation(lastResponse.explanation)
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Show expected keywords */}
                                {lastResponse.expected_keywords && lastResponse.expected_keywords.length > 0 && (
                                    <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-4">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🔑 Key Concepts Expected:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {lastResponse.expected_keywords.map((kw: string, idx: number) => {
                                                const isMatched = lastResponse.matched_keywords?.includes(kw);
                                                return (
                                                    <span
                                                        key={idx}
                                                        className={`px-3 py-1 rounded-full text-sm break-words ${isMatched
                                                            ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                                                            : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                                                            }`}
                                                    >
                                                        {isMatched ? '✅' : '❌'} {kw}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Show points earned */}
                                <div className="mt-3 flex items-center gap-2 text-sm flex-wrap">
                                    <Award className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                        {lastResponse.isCorrect ? `+${currentStep?.points || 10} points` : '0 points'}
                                    </span>
                                    <span className="text-gray-400 dark:text-gray-500 text-xs">
                                        (Max: {currentStep?.points || 10} points)
                                    </span>
                                </div>

                                {/* Next Question Button - User must click to continue */}
                                <button
                                    onClick={handleNextQuestion}
                                    className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-xl shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 transition-all font-bold flex items-center justify-center gap-2"
                                >
                                    {currentStepIndex + 1 >= allSteps.length ? (
                                        '📊 See Results'
                                    ) : (
                                        <>
                                            Next Question
                                            <ChevronRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress Stats */}
                <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl p-3 text-center">
                        <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{correctCount}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Correct</div>
                    </div>
                    <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl p-3 text-center">
                        <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">{wrongCount}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Wrong</div>
                    </div>
                    <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl p-3 text-center">
                        <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{totalPoints}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Points</div>
                    </div>
                </div>
            </div>

            {/* Sticky Bottom - Question Navigator */}
            <div className="flex-shrink-0 bg-white/50 dark:bg-muted/30 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        Question {currentStepIndex + 1} of {allSteps.length}
                    </div>
                    <div className="flex items-center gap-1">
                        {allSteps.map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-2 h-2 rounded-full transition-all ${idx === currentStepIndex
                                    ? 'bg-blue-600 dark:bg-blue-400 w-4'
                                    : idx < currentStepIndex
                                        ? 'bg-green-500 dark:bg-green-400'
                                        : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};