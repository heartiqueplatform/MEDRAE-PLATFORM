// src/pages/assessment/AssessmentResults.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Home, RotateCcw, Download, Share2,
    ChevronLeft, Clock, CheckCircle, XCircle,
    Target, Brain,
} from 'lucide-react';
import { assessmentService } from '@/services/assessmentService';
import { AssessmentAttempt, AssessmentResponse } from '@/types/assessmentTypes';
import { ScoreCard, ErrorState } from '@/components/assessment';
import { playSound } from '@/lib/soundManager';

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: 'light' | 'success' = 'light') => {
    try { playSound('ui-tap'); } catch { /* no-op */ }
    if (type === 'success') vibrate([15, 30, 15]);
    else vibrate(15);
};

// Cache configuration - same as other pages
const CACHE_CONFIG = {
    TTL: 10 * 60 * 1000,
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
const getCacheKey = (attemptId: string) => `results_${attemptId}`;

export const AssessmentResults: React.FC = () => {
    const { slug, attemptId } = useParams<{ slug: string; attemptId: string }>();
    const navigate = useNavigate();

    const [attempt, setAttempt] = useState<AssessmentAttempt | null>(() => {
        if (attemptId) {
            const cached = cache.get(getCacheKey(attemptId));
            return cached?.attempt || null;
        }
        return null;
    });
    const [responses, setResponses] = useState<AssessmentResponse[]>(() => {
        if (attemptId) {
            const cached = cache.get(getCacheKey(attemptId));
            return cached?.responses || [];
        }
        return [];
    });
    const [loading, setLoading] = useState(!cache.get(getCacheKey(attemptId || '')));
    const [error, setError] = useState<string | null>(null);
    const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

    const isLoadingRef = useRef(false);
    const initialLoadDoneRef = useRef(false);

    const loadResults = useCallback(async (forceRefresh = false) => {
        if (!attemptId) return;
        if (isLoadingRef.current) return;

        const cacheKey = getCacheKey(attemptId);
        const cachedData = cache.get(cacheKey);

        if (!forceRefresh && cachedData && !cache.isStale(cacheKey, CACHE_CONFIG.TTL)) {
            setAttempt(cachedData.attempt);
            setResponses(cachedData.responses || []);
            setLoading(false);
            initialLoadDoneRef.current = true;
            return;
        }

        if (!cachedData) setLoading(true);
        setError(null);
        isLoadingRef.current = true;

        try {
            const data = await assessmentService.getAttemptById(attemptId);
            if (!data) {
                setError('Results not found');
                return;
            }

            const responsesData = await assessmentService.getResponsesWithSteps(attemptId);

            setAttempt(data);
            setResponses(responsesData);

            cache.set(cacheKey, { attempt: data, responses: responsesData });
            initialLoadDoneRef.current = true;
        } catch (err) {
            console.error('❌ Failed to load results:', err);
            if (!cache.get(cacheKey)) {
                setError(err instanceof Error ? err.message : 'Failed to load results');
            }
        } finally {
            setLoading(!cache.get(cacheKey) && !initialLoadDoneRef.current);
            isLoadingRef.current = false;
        }
    }, [attemptId]);

    useEffect(() => {
        if (attemptId) {
            const cacheKey = getCacheKey(attemptId);
            const cachedData = cache.get(cacheKey);

            if (cachedData && !cache.isStale(cacheKey, CACHE_CONFIG.TTL)) {
                setAttempt(cachedData.attempt);
                setResponses(cachedData.responses || []);
                setLoading(false);
                initialLoadDoneRef.current = true;
            } else {
                loadResults(true);
            }
        }
    }, [attemptId, loadResults]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && attemptId) {
                const cacheKey = getCacheKey(attemptId);
                if (cache.isStale(cacheKey, CACHE_CONFIG.TTL)) loadResults(true);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [attemptId, loadResults]);

    useEffect(() => {
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted && attemptId) {
                const cacheKey = getCacheKey(attemptId);
                if (cache.isStale(cacheKey, CACHE_CONFIG.TTL)) loadResults(true);
            }
        };
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, [attemptId, loadResults]);

    const handleRetake = () => {
        if (!attempt?.assessment_id || !slug) return;
        tap();
        if (attemptId) cache.clear();
        navigate(`/assessments/${slug}`);
    };

    const handleHome = () => {
        tap();
        navigate('/assessments');
    };

    const handleDownloadReport = () => {
        if (!attempt || !attempt.assessment) return;
        tap();

        const report = `
MEDRAE ASSESSMENT REPORT
========================
Title: ${attempt.assessment.title}
Date: ${new Date(attempt.completed_at || attempt.updated_at).toLocaleDateString()}
Time Spent: ${Math.floor(attempt.time_spent_seconds / 60)} minutes

SCORE SUMMARY
-------------
Score: ${Math.round(attempt.score)}%
Grade: ${getGrade(attempt.score)}
Status: ${attempt.score >= (attempt.assessment.passing_score || 70) ? 'PASSED ✅' : 'FAILED ❌'}
Correct Answers: ${attempt.correct_answers}
Wrong Answers: ${attempt.wrong_answers}

DETAILED METRICS
----------------
Communication: ${Math.round(attempt.communication_score || 0)}%
Clinical Knowledge: ${Math.round(attempt.clinical_score || 0)}%
Confidence: ${Math.round(attempt.confidence_score || 0)}%
Patient Safety: ${Math.round(attempt.patient_safety_score || 0)}%

Passing Score Required: ${attempt.assessment.passing_score || 70}%

---
Generated by Medrae Assessment System
        `;

        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `assessment-report-${attempt.assessment.title}-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleShare = async () => {
        if (!attempt || !attempt.assessment) return;
        tap();

        const shareData = {
            title: `Assessment Results - ${attempt.assessment.title}`,
            text: `I scored ${Math.round(attempt.score)}% on ${attempt.assessment.title}! Check out my results.`,
            url: window.location.href,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
                alert('Results link copied to clipboard!');
            }
        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                console.error('Share failed:', err);
            }
        }
    };

    const getGrade = (score: number): string => {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    };

    const getGradeColor = (grade: string): string => {
        const colors: Record<string, string> = {
            'A': 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10',
            'B': 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-400/10',
            'C': 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10',
            'D': 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-400/10',
            'F': 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-400/10',
        };
        return colors[grade] || 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06]';
    };

    const toggleResponse = (responseId: string) => {
        tap();
        setExpandedResponse(expandedResponse === responseId ? null : responseId);
    };

    /* ─── Loading skeleton ─────────────────────────────────────────── */
    if (loading && !cache.get(getCacheKey(attemptId || ''))) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
                <header className="shrink-0 flex items-center gap-2 px-2 h-14
                                   bg-white dark:bg-[#0d1117]
                                   border-b border-slate-200/70 dark:border-white/[0.06]
                                   safe-top">
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="h-4 w-40 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                        <div className="h-3 w-28 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                    </div>
                </header>
                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-3 pb-24 safe-bottom">
                    <div className="w-full max-w-[880px] mx-auto space-y-3">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3 animate-pulse">
                            <div className="h-28 w-28 rounded-full mx-auto bg-slate-200 dark:bg-white/[0.1]" />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="h-3 w-3/4 mx-auto bg-slate-200 dark:bg-white/[0.1] rounded" />
                                        <div className="h-5 w-1/2 mx-auto bg-slate-200 dark:bg-white/[0.1] rounded" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {[1, 2].map((i) => (
                                <div key={i} className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2.5 animate-pulse">
                                    <div className="h-3.5 w-32 bg-slate-200 dark:bg-white/[0.1] rounded" />
                                    {[1, 2, 3, 4].map((j) => (
                                        <div key={j} className="flex justify-between">
                                            <div className="h-3 w-24 bg-slate-200 dark:bg-white/[0.1] rounded" />
                                            <div className="h-3 w-14 bg-slate-200 dark:bg-white/[0.1] rounded" />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2 animate-pulse">
                            <div className="h-3.5 w-32 bg-slate-200 dark:bg-white/[0.1] rounded" />
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-12 rounded-xl bg-slate-200 dark:bg-white/[0.1]" />
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    /* ─── Error ────────────────────────────────────────────────────── */
    if (error || !attempt) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
                <header className="shrink-0 flex items-center gap-2 px-2 h-14
                                   bg-white dark:bg-[#0d1117]
                                   border-b border-slate-200/70 dark:border-white/[0.06]
                                   safe-top">
                    <button
                        onClick={handleHome}
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
                            Results
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            Something went wrong
                        </p>
                    </div>
                </header>
                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-6 safe-bottom">
                    <div className="w-full max-w-[880px] mx-auto">
                        <ErrorState
                            message={error || 'Results not found'}
                            onRetry={() => {
                                tap();
                                if (attemptId) {
                                    cache.clear();
                                    loadResults(true);
                                }
                            }}
                        />
                    </div>
                </main>
            </div>
        );
    }

    const grade = getGrade(attempt.score);
    const gradeColor = getGradeColor(grade);
    const isPassing = attempt.score >= (attempt.assessment?.passing_score || 70);
    const totalQuestions = attempt.correct_answers + attempt.wrong_answers;

    /* ─── Real page ───────────────────────────────────────────────── */
    return (
        <div
            className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white"
            style={{ WebkitTapHighlightColor: 'transparent' }}
        >
            {/* ── HEADER ──────────────────────────────────────────── */}
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={handleHome}
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
                        Results
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {attempt.assessment?.title || 'Assessment'}
                    </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5
                                      text-[10px] font-bold ${gradeColor}`}>
                        {grade}
                    </span>
                    <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5
                                    text-[10px] font-bold ${isPassing
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400'
                            }`}
                    >
                        {isPassing ? 'Passed' : 'Failed'}
                    </span>
                </div>
            </header>

            {/* ── SCROLLING BODY ──────────────────────────────────── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                <div className="w-full max-w-[880px] mx-auto px-4 py-3 pb-24 safe-bottom space-y-3">

                    {/* Score card */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                        <ScoreCard
                            score={attempt.score}
                            correct={attempt.correct_answers}
                            wrong={attempt.wrong_answers}
                            total={totalQuestions}
                            communication={attempt.communication_score || 0}
                            confidence={attempt.confidence_score || 0}
                            clinical={attempt.clinical_score || 0}
                            safety={attempt.patient_safety_score || 0}
                            grade={grade}
                        />
                    </section>

                    {/* Summary stats */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider
                                           text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                Time & completion
                            </h3>
                            <div className="space-y-1.5">
                                <SummaryRow
                                    label="Time spent"
                                    value={`${Math.floor(attempt.time_spent_seconds / 60)}m ${attempt.time_spent_seconds % 60}s`}
                                />
                                <SummaryRow
                                    label="Questions answered"
                                    value={String(totalQuestions)}
                                />
                                <SummaryRow
                                    label="Passing score"
                                    value={`${attempt.assessment?.passing_score || 70}%`}
                                />
                                <SummaryRow
                                    label="Completed"
                                    value={new Date(attempt.completed_at || attempt.updated_at).toLocaleDateString()}
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider
                                           text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                                <Target className="h-3.5 w-3.5" />
                                Accuracy
                            </h3>
                            <div className="space-y-1.5">
                                <SummaryRow
                                    label="Correct"
                                    value={String(attempt.correct_answers)}
                                    tone="emerald"
                                />
                                <SummaryRow
                                    label="Wrong"
                                    value={String(attempt.wrong_answers)}
                                    tone="rose"
                                />
                                <SummaryRow
                                    label="Accuracy"
                                    value={`${totalQuestions > 0 ? Math.round((attempt.correct_answers / totalQuestions) * 100) : 0}%`}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Detailed responses */}
                    {responses.length > 0 && (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider
                                           text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                                <Brain className="h-3.5 w-3.5" />
                                Detailed answers
                            </h3>
                            <div className="space-y-1.5 max-h-96 overflow-y-auto no-scrollbar overscroll-contain">
                                {responses.map((response, index) => (
                                    <div
                                        key={response.id}
                                        onClick={() => toggleResponse(response.id)}
                                        className={`rounded-xl p-2.5 cursor-pointer transition-colors
                                                    active:bg-slate-100 dark:active:bg-white/[0.1]
                                                    ${response.is_correct
                                                ? 'bg-emerald-50 dark:bg-emerald-400/[0.06]'
                                                : 'bg-rose-50 dark:bg-rose-400/[0.06]'
                                            }`}
                                        style={{ touchAction: 'manipulation' }}
                                    >
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-[10px] font-bold uppercase tracking-wider
                                                                 text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                                                    Q{index + 1}
                                                </span>
                                                {response.is_correct ? (
                                                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                                                ) : (
                                                    <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                                                )}
                                                <span className="text-[12px] text-slate-700 dark:text-slate-300 truncate">
                                                    {response.step?.message?.substring(0, 60)}…
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${response.is_correct
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-rose-600 dark:text-rose-400'
                                                    }`}>
                                                    {response.is_correct ? 'Correct' : 'Incorrect'}
                                                </span>
                                                <span className="text-[10px] font-bold tabular-nums
                                                                 text-slate-400 dark:text-slate-500">
                                                    {response.score}%
                                                </span>
                                            </div>
                                        </div>

                                        {expandedResponse === response.id && (
                                            <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 dark:border-white/[0.06] space-y-1.5">
                                                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                                    <span className="font-bold text-slate-900 dark:text-white">Your answer:</span>{' '}
                                                    {response.student_answer || 'No answer provided'}
                                                </p>
                                                {response.feedback && (
                                                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                                        <span className="font-bold text-slate-900 dark:text-white">Feedback:</span>{' '}
                                                        {response.feedback}
                                                    </p>
                                                )}
                                                {response.matched_keywords && response.matched_keywords.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 items-center">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider
                                                                         text-slate-500 dark:text-slate-400">
                                                            Matched:
                                                        </span>
                                                        {response.matched_keywords.map((kw, i) => (
                                                            <span
                                                                key={i}
                                                                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold
                                                                           bg-emerald-50 text-emerald-700
                                                                           dark:bg-emerald-400/10 dark:text-emerald-400"
                                                            >
                                                                {kw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {response.missing_keywords && response.missing_keywords.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 items-center">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider
                                                                         text-slate-500 dark:text-slate-400">
                                                            Missing:
                                                        </span>
                                                        {response.missing_keywords.map((kw, i) => (
                                                            <span
                                                                key={i}
                                                                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold
                                                                           bg-rose-50 text-rose-700
                                                                           dark:bg-rose-400/10 dark:text-rose-400"
                                                            >
                                                                {kw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Actions */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleRetake}
                                className="h-10 rounded-xl bg-blue-600 text-white
                                           text-sm font-bold
                                           flex items-center justify-center gap-1.5
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: 'manipulation' }}
                            >
                                <RotateCcw className="h-4 w-4" />
                                Retake
                            </button>
                            <button
                                onClick={handleHome}
                                className="h-10 rounded-xl
                                           bg-slate-100 dark:bg-white/[0.06]
                                           text-slate-700 dark:text-slate-200
                                           text-sm font-bold
                                           flex items-center justify-center gap-1.5
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: 'manipulation' }}
                            >
                                <Home className="h-4 w-4" />
                                Home
                            </button>
                            <button
                                onClick={handleDownloadReport}
                                className="h-10 rounded-xl
                                           bg-slate-100 dark:bg-white/[0.06]
                                           text-slate-700 dark:text-slate-200
                                           text-sm font-bold
                                           flex items-center justify-center gap-1.5
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: 'manipulation' }}
                            >
                                <Download className="h-4 w-4" />
                                Report
                            </button>
                            <button
                                onClick={handleShare}
                                className="h-10 rounded-xl
                                           bg-slate-100 dark:bg-white/[0.06]
                                           text-slate-700 dark:text-slate-200
                                           text-sm font-bold
                                           flex items-center justify-center gap-1.5
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: 'manipulation' }}
                            >
                                <Share2 className="h-4 w-4" />
                                Share
                            </button>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Subcomponent                                                      */
/* ------------------------------------------------------------------ */

function SummaryRow({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone?: 'emerald' | 'rose';
}) {
    const valueColor =
        tone === 'emerald'
            ? 'text-emerald-600 dark:text-emerald-400'
            : tone === 'rose'
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-900 dark:text-white';
    return (
        <div className="flex justify-between items-center gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{label}</span>
            <span className={`text-[11px] font-bold tabular-nums ${valueColor}`}>{value}</span>
        </div>
    );
}