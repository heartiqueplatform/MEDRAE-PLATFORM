// src/pages/assessment/AssessmentQuestion.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Send, AlertCircle, Award, TrendingUp, Clock,
    CheckCircle, XCircle, ChevronRight,
} from 'lucide-react';
import { assessmentService } from '@/services/assessmentService';
import { useAuth } from '@/context/AuthProvider';
import { playSound } from '@/lib/soundManager';

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: 'light' | 'success' | 'warning' = 'light') => {
    try { playSound('ui-tap'); } catch { /* no-op */ }
    if (type === 'success') vibrate([15, 30, 15]);
    else if (type === 'warning') vibrate(60);
    else vibrate(15);
};

// Cache configuration - same as AssessmentHome
const CACHE_CONFIG = {
    TTL: 5 * 60 * 1000,
    STALE_WHILE_REVALIDATE: true,
};

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

const formatExplanation = (text: string): string => {
    if (!text) return '';
    let formatted = text.replace(/\n/g, '<br />');
    formatted = formatted.replace(/^[\s]*[-*]\s+(.+)$/gm, '• $1');
    formatted = formatted.replace(/^[\s]*(\d+)\.\s+(.+)$/gm, '$1. $2');
    formatted = formatted.replace(/(<br \/>){3,}/g, '<br /><br />');
    return formatted;
};

const getCacheKey = (slug: string, userId: string) => `assessment_${slug}_${userId}`;

/* ------------------------------------------------------------------ */
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

const QuestionSkeleton: React.FC = () => (
    <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
        <header className="shrink-0 flex items-center gap-2 px-2 h-14
                           bg-white dark:bg-[#0d1117]
                           border-b border-slate-200/70 dark:border-white/[0.06]
                           safe-top">
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="h-4 w-32 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
            </div>
            <div className="h-9 w-24 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-3">
            <div className="w-full max-w-[880px] mx-auto space-y-3">
                <div className="h-1 bg-slate-200 dark:bg-white/[0.06] rounded-full animate-pulse" />
                <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2 animate-pulse">
                    <div className="h-3 w-1/3 bg-slate-200 dark:bg-white/[0.1] rounded" />
                    <div className="h-4 w-3/4 bg-slate-200 dark:bg-white/[0.1] rounded" />
                    <div className="h-4 w-2/3 bg-slate-200 dark:bg-white/[0.1] rounded" />
                </div>
                <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2 animate-pulse">
                    <div className="h-28 w-full bg-slate-200 dark:bg-white/[0.1] rounded-xl" />
                    <div className="h-10 w-full bg-slate-200 dark:bg-white/[0.1] rounded-xl" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-2xl bg-white dark:bg-[#161b22] p-3 animate-pulse">
                            <div className="h-5 w-10 mx-auto bg-slate-200 dark:bg-white/[0.1] rounded mb-1" />
                            <div className="h-3 w-14 mx-auto bg-slate-200 dark:bg-white/[0.1] rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </main>
    </div>
);

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

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
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    const handleBack = () => {
        if (slug && user && !showResults) {
            const cacheKey = getCacheKey(slug, user.id);
            cache.set(cacheKey, {
                assessment, attempt, steps: allSteps, responses,
                currentStepIndex, correctCount, wrongCount, totalPoints, maxPoints,
            });
        }
        tap();
        navigate('/assessments');
    };

    const handleSubmitAnswer = async () => {
        if (!answer.trim() || !currentStep || !attempt) return;

        setSubmitting(true);
        setShowFeedback(false);
        tap();

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
        tap();
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

    /* ─── Loading ─────────────────────────────────────────────────── */
    if (loading && !cache.get(getCacheKey(slug || '', user?.id || ''))) {
        return <QuestionSkeleton />;
    }

    const showRefreshIndicator = isRefreshing && cache.get(getCacheKey(slug || '', user?.id || ''));

    /* ─── Error ───────────────────────────────────────────────────── */
    if (error && !cache.get(getCacheKey(slug || '', user?.id || ''))) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
                <header className="shrink-0 flex items-center gap-2 px-2 h-14
                                   bg-white dark:bg-[#0d1117]
                                   border-b border-slate-200/70 dark:border-white/[0.06]
                                   safe-top">
                    <button
                        onClick={handleBack}
                        aria-label="Go back"
                        className="h-10 w-10 rounded-full flex items-center justify-center
                                   text-slate-700 dark:text-slate-200
                                   active:bg-slate-100 dark:active:bg-white/5
                                   transition-colors"
                        style={{ touchAction: 'manipulation' }}
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate text-slate-900 dark:text-white">
                            Assessment
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            Something went wrong
                        </p>
                    </div>
                </header>
                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex items-center justify-center px-4">
                    <div className="max-w-md w-full rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center">
                        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-3" />
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">
                            Something went wrong
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-5 break-words leading-relaxed">
                            {error}
                        </p>
                        <button
                            onClick={() => {
                                tap();
                                if (slug && user) {
                                    cache.clear();
                                    loadAssessmentData(true);
                                }
                            }}
                            className="w-full h-10 rounded-xl bg-blue-600 text-white
                                       text-sm font-bold
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: 'manipulation' }}
                        >
                            Try again
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    /* ─── Not found ───────────────────────────────────────────────── */
    if (!assessment || !attempt) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
                <header className="shrink-0 flex items-center gap-2 px-2 h-14
                                   bg-white dark:bg-[#0d1117]
                                   border-b border-slate-200/70 dark:border-white/[0.06]
                                   safe-top">
                    <button
                        onClick={handleBack}
                        aria-label="Go back"
                        className="h-10 w-10 rounded-full flex items-center justify-center
                                   text-slate-700 dark:text-slate-200
                                   active:bg-slate-100 dark:active:bg-white/5
                                   transition-colors"
                        style={{ touchAction: 'manipulation' }}
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate text-slate-900 dark:text-white">
                            Assessment
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            Not found
                        </p>
                    </div>
                </header>
                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex items-center justify-center px-4">
                    <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">
                            Assessment not found
                        </h2>
                        <button
                            onClick={() => { tap(); navigate('/assessments'); }}
                            className="mt-3 h-10 px-4 rounded-xl
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-700 dark:text-slate-200
                                       text-sm font-bold
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: 'manipulation' }}
                        >
                            Return to assessments
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    /* ─── Completion ──────────────────────────────────────────────── */
    if (showResults || attempt.status === 'completed') {
        const percentage = Math.round((score / allSteps.length) * 100);

        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
                <header className="shrink-0 flex items-center gap-2 px-2 h-14
                                   bg-white dark:bg-[#0d1117]
                                   border-b border-slate-200/70 dark:border-white/[0.06]
                                   safe-top">
                    <div className="flex-1 min-w-0 px-2">
                        <h1 className="text-base font-bold leading-tight truncate text-slate-900 dark:text-white">
                            Assessment complete
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            {assessment.title}
                        </p>
                    </div>
                </header>
                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4">
                    <div className="w-full max-w-md mx-auto space-y-3">
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-5 text-center">
                            <div className="h-14 w-14 rounded-2xl
                                            bg-emerald-50 dark:bg-emerald-400/10
                                            flex items-center justify-center mx-auto mb-3">
                                <Award className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-wider
                                          text-emerald-600 dark:text-emerald-400 mb-1">
                                Result
                            </p>
                            <div className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                                {percentage}%
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                {score} of {allSteps.length} correct
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {totalPoints} / {maxPoints} points
                            </p>
                        </section>

                        <section className="grid grid-cols-3 gap-2">
                            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 text-center">
                                <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                    {correctCount}
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-wider
                                                text-slate-500 dark:text-slate-400 mt-0.5">
                                    Correct
                                </div>
                            </div>
                            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 text-center">
                                <div className="text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">
                                    {wrongCount}
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-wider
                                                text-slate-500 dark:text-slate-400 mt-0.5">
                                    Wrong
                                </div>
                            </div>
                            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 text-center">
                                <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                                    {formatTime(timeSpent)}
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-wider
                                                text-slate-500 dark:text-slate-400 mt-0.5">
                                    Time
                                </div>
                            </div>
                        </section>

                        <button
                            onClick={() => {
                                tap('success');
                                if (slug && user) cache.clear();
                                navigate('/assessments');
                            }}
                            className="w-full h-10 rounded-xl bg-blue-600 text-white
                                       text-sm font-bold
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: 'manipulation' }}
                        >
                            Back to assessments
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const progress = allSteps.length > 0
        ? Math.round((currentStepIndex / allSteps.length) * 100)
        : 0;

    /* ─── Active question ─────────────────────────────────────────── */
    return (
        <div
            className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white"
            style={{ WebkitTapHighlightColor: 'transparent' }}
        >
            {/* ── HEADER ──────────────────────────────────────────── */}
            <header className="shrink-0 bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <div className="flex items-center gap-2 px-2 h-14">
                    <button
                        onClick={handleBack}
                        aria-label="Go back"
                        className="h-10 w-10 rounded-full flex items-center justify-center
                                   text-slate-700 dark:text-slate-200
                                   active:bg-slate-100 dark:active:bg-white/5
                                   transition-colors shrink-0"
                        style={{ touchAction: 'manipulation' }}
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate text-slate-900 dark:text-white">
                            Assessment
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            {assessment.title}
                            {assessment.tutor_personality ? ` · ${assessment.tutor_personality}` : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <HeaderPill icon={Award} value={String(totalPoints)} />
                        <HeaderPill icon={TrendingUp} value={`${currentStepIndex + 1}/${allSteps.length}`} />
                        <HeaderPill icon={Clock} value={formatTime(timeSpent)} />
                    </div>
                </div>
                {/* Progress bar */}
                <div className="px-2 pb-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider
                                    text-slate-500 dark:text-slate-400 mb-1">
                        <span>Progress</span>
                        <span className="tabular-nums">{progress}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </header>

            {/* ── REFRESHING PILL ─────────────────────────────────── */}
            {showRefreshIndicator && (
                <div className="pointer-events-none absolute top-16 right-4 z-50">
                    <div className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider
                                    bg-slate-900 text-white dark:bg-white/[0.1] animate-pulse">
                        Refreshing…
                    </div>
                </div>
            )}

            {/* ── SCROLL BODY ─────────────────────────────────────── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                <div className="w-full max-w-[880px] mx-auto px-4 py-3 pb-24 safe-bottom space-y-3">

                    {/* Question card */}
                    <section
                        className={`rounded-2xl bg-white dark:bg-[#161b22] p-4 transition-opacity duration-300 ${showFeedback ? 'opacity-50 pointer-events-none' : ''
                            }`}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-7 w-7 rounded-lg
                                            bg-slate-100 dark:bg-white/[0.06]
                                            flex items-center justify-center
                                            text-[11px] font-bold tabular-nums shrink-0">
                                {currentStepIndex + 1}
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider
                                             text-slate-500 dark:text-slate-400">
                                Question {currentStepIndex + 1} of {allSteps.length}
                            </span>
                            {currentStep?.points && (
                                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider
                                                 text-slate-500 dark:text-slate-400
                                                 bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
                                    {currentStep.points} pts
                                </span>
                            )}
                        </div>
                        <p className="text-[13px] font-medium leading-relaxed break-words text-slate-900 dark:text-white">
                            {currentStep?.message || 'Question not available'}
                        </p>
                    </section>

                    {/* Answer input */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                        <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your answer here…"
                            className="w-full min-h-[120px] p-3 rounded-xl text-sm leading-relaxed resize-y
                                       bg-slate-50 dark:bg-[#0d1117]
                                       border-0 outline-none
                                       text-slate-900 dark:text-white
                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                       focus:ring-2 focus:ring-blue-500/40"
                            disabled={submitting || showFeedback}
                        />
                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 mt-3">
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 text-center sm:text-left">
                                Press{' '}
                                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/[0.06] rounded text-[10px] font-mono">
                                    Enter
                                </kbd>{' '}
                                to submit
                            </span>
                            <button
                                onClick={handleSubmitAnswer}
                                disabled={!answer.trim() || submitting || showFeedback}
                                className={`w-full sm:w-auto h-10 px-4 rounded-xl
                                            text-sm font-bold
                                            flex items-center justify-center gap-1.5
                                            active:scale-[0.97] transition-transform
                                            ${answer.trim() && !submitting && !showFeedback
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-200 dark:bg-white/[0.08] text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                    }`}
                                style={{ touchAction: 'manipulation' }}
                            >
                                {submitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                                        Submitting…
                                    </>
                                ) : (
                                    <>
                                        Submit answer
                                        <Send className="h-3.5 w-3.5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </section>

                    {/* Feedback card */}
                    {showFeedback && lastResponse && (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                            <div className="flex items-start gap-2.5">
                                <div className="shrink-0 mt-0.5">
                                    {lastResponse.isCorrect ? (
                                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-rose-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[12px] font-bold mb-1.5">
                                        {lastResponse.isCorrect ? 'Correct' : 'Not quite right'}
                                    </h3>
                                    <p className="text-[12px] text-slate-700 dark:text-slate-300 mb-2.5 break-words leading-relaxed">
                                        {lastResponse.feedback}
                                    </p>

                                    {lastResponse.explanation && (
                                        <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 mb-2.5">
                                            <p className="text-[10px] font-bold uppercase tracking-wider
                                                          text-slate-500 dark:text-slate-400 mb-1.5">
                                                Correct answer
                                            </p>
                                            <div
                                                className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed break-words"
                                                dangerouslySetInnerHTML={{
                                                    __html: formatExplanation(lastResponse.explanation)
                                                }}
                                            />
                                        </div>
                                    )}

                                    {lastResponse.expected_keywords && lastResponse.expected_keywords.length > 0 && (
                                        <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                            <p className="text-[10px] font-bold uppercase tracking-wider
                                                          text-slate-500 dark:text-slate-400 mb-2">
                                                Key concepts
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {lastResponse.expected_keywords.map((kw: string, idx: number) => {
                                                    const isMatched = lastResponse.matched_keywords?.includes(kw);
                                                    return (
                                                        <span
                                                            key={idx}
                                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold break-words ${isMatched
                                                                ? 'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400'
                                                                : 'bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-400'
                                                                }`}
                                                        >
                                                            {isMatched ? '✓' : '×'} {kw}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-3 flex items-center gap-2 text-[11px] flex-wrap">
                                        <Award className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                                        <span className="font-bold text-slate-700 dark:text-slate-300">
                                            {lastResponse.isCorrect ? `+${currentStep?.points || 10} points` : '0 points'}
                                        </span>
                                        <span className="text-slate-400 dark:text-slate-500">
                                            (Max: {currentStep?.points || 10})
                                        </span>
                                    </div>

                                    <button
                                        onClick={handleNextQuestion}
                                        className="mt-3 w-full h-10 rounded-xl bg-blue-600 text-white
                                                   text-sm font-bold
                                                   flex items-center justify-center gap-1.5
                                                   active:scale-[0.97] transition-transform"
                                        style={{ touchAction: 'manipulation' }}
                                    >
                                        {currentStepIndex + 1 >= allSteps.length ? (
                                            'See results'
                                        ) : (
                                            <>
                                                Next question
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Progress stats */}
                    <section className="grid grid-cols-3 gap-2">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 text-center">
                            <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                {correctCount}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-wider
                                            text-slate-500 dark:text-slate-400 mt-0.5">
                                Correct
                            </div>
                        </div>
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 text-center">
                            <div className="text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">
                                {wrongCount}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-wider
                                            text-slate-500 dark:text-slate-400 mt-0.5">
                                Wrong
                            </div>
                        </div>
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 text-center">
                            <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                                {totalPoints}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-wider
                                            text-slate-500 dark:text-slate-400 mt-0.5">
                                Points
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            {/* ── STICKY FOOTER ──────────────────────────────────── */}
            <footer
                className="shrink-0 bg-white dark:bg-[#0d1117]
               border-t border-slate-200/70 dark:border-white/[0.06]"
                style={{
                    paddingBottom:
                        "calc(env(safe-area-inset-bottom, 0px) + 72px)",
                }}
            >
                <div className="px-4 py-2.5 flex items-center justify-between">
                    <div className="text-[11px] font-bold uppercase tracking-wider
                        text-slate-500 dark:text-slate-400 tabular-nums">
                        {currentStepIndex + 1} of {allSteps.length}
                    </div>
                    <div className="flex items-center gap-1">
                        {allSteps.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1.5 rounded-full transition-all ${idx === currentStepIndex
                                    ? 'w-5 bg-blue-600'
                                    : idx < currentStepIndex
                                        ? 'w-1.5 bg-emerald-500'
                                        : 'w-1.5 bg-slate-200 dark:bg-white/[0.06]'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Subcomponent                                                      */
/* ------------------------------------------------------------------ */

function HeaderPill({ icon: Icon, value }: { icon: any; value: string }) {
    return (
        <div className="flex items-center gap-1 rounded-full px-2 py-1
                        bg-slate-100 dark:bg-white/[0.06]">
            <Icon className="h-3 w-3 text-slate-500 dark:text-slate-400" />
            <span className="text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-300">
                {value}
            </span>
        </div>
    );
}