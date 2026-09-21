// src/pages/assessment/AssessmentResults.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Home, RotateCcw, Download, Share2,
    ChevronLeft, Award, Clock, CheckCircle, XCircle,
    TrendingUp, Target, Brain, Heart, MessageSquare
} from 'lucide-react';
import { assessmentService } from '@/services/assessmentService';
import { AssessmentAttempt, AssessmentResponse } from '@/types/assessmentTypes';
import { ScoreCard, ErrorState } from '@/components/assessment';

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

    const printRef = useRef<HTMLDivElement>(null);
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

    const handleRetake = async () => {
        if (!attempt?.assessment_id || !slug) return;
        if (attemptId) cache.clear();
        navigate(`/assessments/${slug}`);
    };

    const handleHome = () => navigate('/assessments');

    const handleDownloadReport = () => {
        if (!attempt || !attempt.assessment) return;

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
            'A': 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
            'B': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
            'C': 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
            'D': 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
            'F': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
        };
        return colors[grade] || 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#21262d]';
    };

    const toggleResponse = (responseId: string) => {
        setExpandedResponse(expandedResponse === responseId ? null : responseId);
    };

    // ─── Loading skeleton — mirrors real page structure exactly ───
    if (loading && !cache.get(getCacheKey(attemptId || ''))) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] w-full max-w-full mx-auto px-0 md:px-2 lg:px-6 py-4 md:py-8 space-y-4 md:space-y-6">

                {/* Back button + header skeleton */}
                <div className="px-2 md:px-0">
                    <div className="flex items-center gap-2 animate-pulse">
                        <div className="h-8 w-8 bg-gray-100 dark:bg-[#21262d] rounded-xl" />
                        <div className="space-y-1.5">
                            <div className="h-6 w-52 bg-gray-200 dark:bg-[#21262d] rounded" />
                            <div className="h-3 w-40 bg-gray-100 dark:bg-[#21262d] rounded" />
                        </div>
                    </div>
                </div>

                {/* Score card skeleton */}
                <div className="px-2 md:px-0">
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 md:p-6 shadow-sm animate-pulse space-y-4">
                        <div className="flex items-center justify-center">
                            <div className="h-32 w-32 rounded-full bg-gray-100 dark:bg-[#21262d]" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="space-y-2">
                                    <div className="h-3 w-3/4 bg-gray-100 dark:bg-[#21262d] rounded mx-auto" />
                                    <div className="h-5 w-1/2 bg-gray-200 dark:bg-[#30363d] rounded mx-auto" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Summary stats skeleton (2-col) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 px-2 md:px-0">
                    {[1, 2].map(i => (
                        <div key={i} className="bg-white dark:bg-[#161b22] rounded-2xl p-4 md:p-6 shadow-sm animate-pulse space-y-3">
                            <div className="h-4 w-40 bg-gray-200 dark:bg-[#30363d] rounded" />
                            {[1, 2, 3, 4].map(j => (
                                <div key={j} className="flex justify-between items-center">
                                    <div className="h-3 w-24 bg-gray-100 dark:bg-[#21262d] rounded" />
                                    <div className="h-3 w-16 bg-gray-200 dark:bg-[#30363d] rounded" />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Detailed answers skeleton */}
                <div className="px-2 md:px-0">
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 md:p-6 shadow-sm animate-pulse space-y-3">
                        <div className="h-4 w-40 bg-gray-200 dark:bg-[#30363d] rounded" />
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-14 bg-gray-100 dark:bg-[#21262d] rounded-xl" />
                        ))}
                    </div>
                </div>

                {/* Actions skeleton */}
                <div className="px-2 md:px-0">
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 md:p-6 shadow-sm animate-pulse flex flex-wrap gap-3 justify-center">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-11 w-40 bg-gray-100 dark:bg-[#21262d] rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error || !attempt) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] w-full max-w-full mx-auto px-2 md:px-2 lg:px-6 py-4 md:py-8">
                <ErrorState
                    message={error || 'Results not found'}
                    onRetry={() => {
                        if (attemptId) {
                            cache.clear();
                            loadResults(true);
                        }
                    }}
                />
            </div>
        );
    }

    const grade = getGrade(attempt.score);
    const gradeColor = getGradeColor(grade);
    const isPassing = attempt.score >= (attempt.assessment?.passing_score || 70);
    const totalQuestions = attempt.correct_answers + attempt.wrong_answers;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] w-full max-w-full mx-auto px-0 md:px-2 lg:px-6 py-4 md:py-8 space-y-4 md:space-y-6">

            {/* ─── Header ─── */}
            <div className="px-2 md:px-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleHome}
                        className="h-8 w-8 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] text-gray-600 dark:text-gray-400 flex items-center justify-center -ml-1 transition-colors"
                        aria-label="Go back"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg md:text-2xl font-bold text-gray-800 dark:text-gray-200">
                            Assessment results
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {attempt.assessment?.title || 'Assessment'}
                        </p>
                    </div>
                </div>

                {/* Grade + status pills */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${gradeColor}`}>
                        Grade: {grade}
                    </span>
                    <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${isPassing
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            }`}
                    >
                        {isPassing ? '✓ Passed' : '✕ Failed'}
                    </span>
                </div>
            </div>

            {/* ─── Score Card ─── */}
            <div className="px-2 md:px-0">
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 md:p-6 shadow-sm">
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
                </div>
            </div>

            {/* ─── Summary Stats (2-col) ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 px-2 md:px-0">
                {/* Time & Completion */}
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 md:p-6 shadow-sm">
                    <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        Time &amp; completion
                    </h3>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Time spent</span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 tabular-nums">
                                {Math.floor(attempt.time_spent_seconds / 60)}m {attempt.time_spent_seconds % 60}s
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Questions answered</span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 tabular-nums">{totalQuestions}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Passing score</span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 tabular-nums">
                                {attempt.assessment?.passing_score || 70}%
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Completed</span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                {new Date(attempt.completed_at || attempt.updated_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Accuracy */}
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 md:p-6 shadow-sm">
                    <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        Accuracy
                    </h3>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Correct</span>
                            <span className="text-sm font-medium text-green-600 dark:text-green-400 tabular-nums">
                                {attempt.correct_answers}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Wrong</span>
                            <span className="text-sm font-medium text-red-600 dark:text-red-400 tabular-nums">
                                {attempt.wrong_answers}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Accuracy</span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 tabular-nums">
                                {totalQuestions > 0 ? Math.round((attempt.correct_answers / totalQuestions) * 100) : 0}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Detailed Responses ─── */}
            {responses.length > 0 && (
                <div className="px-2 md:px-0">
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 md:p-6 shadow-sm">
                        <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                            <Brain className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            Detailed answers
                        </h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                            {responses.map((response, index) => (
                                <div
                                    key={response.id}
                                    className={`rounded-xl p-3 cursor-pointer transition-colors ${response.is_correct
                                        ? 'bg-green-50 dark:bg-green-900/10 hover:bg-green-100/70 dark:hover:bg-green-900/20'
                                        : 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100/70 dark:hover:bg-red-900/20'
                                        }`}
                                    onClick={() => toggleResponse(response.id)}
                                >
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 shrink-0">
                                                Q{index + 1}
                                            </span>
                                            {response.is_correct ? (
                                                <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 shrink-0" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                                            )}
                                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                                {response.step?.message?.substring(0, 60)}...
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className={`text-xs font-medium ${response.is_correct ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {response.is_correct ? 'Correct' : 'Incorrect'}
                                            </span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                                                {response.score}%
                                            </span>
                                        </div>
                                    </div>

                                    {expandedResponse === response.id && (
                                        <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-[#30363d] space-y-2">
                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                <span className="font-medium text-gray-800 dark:text-gray-200">Your answer:</span>{' '}
                                                {response.student_answer || 'No answer provided'}
                                            </p>
                                            {response.feedback && (
                                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                                    <span className="font-medium text-gray-800 dark:text-gray-200">Feedback:</span>{' '}
                                                    {response.feedback}
                                                </p>
                                            )}
                                            {response.matched_keywords && response.matched_keywords.length > 0 && (
                                                <div className="flex flex-wrap gap-1 items-center">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">Matched:</span>
                                                    {response.matched_keywords.map((kw, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                                                            {kw}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {response.missing_keywords && response.missing_keywords.length > 0 && (
                                                <div className="flex flex-wrap gap-1 items-center">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">Missing:</span>
                                                    {response.missing_keywords.map((kw, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full">
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
                    </div>
                </div>
            )}

            {/* ─── Actions ─── */}
            <div className="px-2 md:px-0">
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 md:p-6 shadow-sm">
                    <div className="flex flex-wrap gap-3 justify-center">
                        <button
                            onClick={handleRetake}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl transition-colors shadow-sm font-medium text-sm"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Retake assessment
                        </button>
                        <button
                            onClick={handleHome}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-[#21262d] text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-[#30363d] transition-colors font-medium text-sm"
                        >
                            <Home className="w-4 h-4" />
                            Back to home
                        </button>
                        <button
                            onClick={handleDownloadReport}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-[#21262d] text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-[#30363d] transition-colors font-medium text-sm"
                        >
                            <Download className="w-4 h-4" />
                            Download report
                        </button>
                        <button
                            onClick={handleShare}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-[#21262d] text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-[#30363d] transition-colors font-medium text-sm"
                        >
                            <Share2 className="w-4 h-4" />
                            Share results
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};