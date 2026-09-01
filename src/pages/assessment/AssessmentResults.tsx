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
import { ScoreCard, LoadingSkeleton, ErrorState } from '@/components/assessment';

// Cache configuration - same as other pages
const CACHE_CONFIG = {
    TTL: 10 * 60 * 1000, // 10 minutes for results (static after completion)
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

// Singleton cache instance (shared with other pages)
const cache = new DataCache();

// Cache key generator
const getCacheKey = (attemptId: string) => `results_${attemptId}`;

export const AssessmentResults: React.FC = () => {
    const { slug, attemptId } = useParams<{ slug: string; attemptId: string }>();
    const navigate = useNavigate();

    const [attempt, setAttempt] = useState<AssessmentAttempt | null>(() => {
        // Initialize with cached data if available
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

        // If we have cached data and not forcing refresh, use it
        if (!forceRefresh && cachedData && !cache.isStale(cacheKey, CACHE_CONFIG.TTL)) {
            console.log('✅ Using cached results data');
            setAttempt(cachedData.attempt);
            setResponses(cachedData.responses || []);
            setLoading(false);
            initialLoadDoneRef.current = true;
            return;
        }

        // Set loading state only if we don't have cached data
        if (!cachedData) {
            setLoading(true);
        }

        setError(null);
        isLoadingRef.current = true;

        try {
            console.log('🟡 Loading results data...', forceRefresh ? '(force refresh)' : '');

            // Fetch attempt data
            const data = await assessmentService.getAttemptById(attemptId);
            if (!data) {
                setError('Results not found');
                return;
            }

            // Fetch responses
            const responsesData = await assessmentService.getResponsesWithSteps(attemptId);

            // Update state
            setAttempt(data);
            setResponses(responsesData);

            // Cache the data
            cache.set(cacheKey, {
                attempt: data,
                responses: responsesData,
            });

            initialLoadDoneRef.current = true;
            console.log('✅ Results loaded successfully');

        } catch (err) {
            console.error('❌ Failed to load results:', err);
            // Only show error if we have no cached data
            if (!cache.get(cacheKey)) {
                setError(err instanceof Error ? err.message : 'Failed to load results');
            }
        } finally {
            setLoading(!cache.get(cacheKey) && !initialLoadDoneRef.current);
            isLoadingRef.current = false;
        }
    }, [attemptId]);

    // Initial load with cache check
    useEffect(() => {
        if (attemptId) {
            const cacheKey = getCacheKey(attemptId);
            const cachedData = cache.get(cacheKey);

            if (cachedData && !cache.isStale(cacheKey, CACHE_CONFIG.TTL)) {
                console.log('📦 Loading results from cache');
                setAttempt(cachedData.attempt);
                setResponses(cachedData.responses || []);
                setLoading(false);
                initialLoadDoneRef.current = true;
            } else {
                console.log('🔄 No cache or stale, loading fresh');
                loadResults(true);
            }
        }
    }, [attemptId, loadResults]);

    // Handle visibility change (user comes back to tab)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && attemptId) {
                const cacheKey = getCacheKey(attemptId);
                const isStale = cache.isStale(cacheKey, CACHE_CONFIG.TTL);
                if (isStale) {
                    console.log('👁️ Page visible, cache stale, refreshing...');
                    loadResults(true);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [attemptId, loadResults]);

    // Handle pageshow (user navigates back)
    useEffect(() => {
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted && attemptId) {
                const cacheKey = getCacheKey(attemptId);
                const isStale = cache.isStale(cacheKey, CACHE_CONFIG.TTL);
                if (isStale) {
                    console.log('🔄 Page restored from bfcache, refreshing...');
                    loadResults(true);
                }
            }
        };

        window.addEventListener('pageshow', handlePageShow);
        return () => {
            window.removeEventListener('pageshow', handlePageShow);
        };
    }, [attemptId, loadResults]);

    const handleRetake = async () => {
        if (!attempt?.assessment_id || !slug) return;
        // Clear cache for this result before retaking
        if (attemptId) {
            cache.clear();
        }
        navigate(`/assessments/${slug}`);
    };

    const handleHome = () => {
        navigate('/assessments');
    };

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
        return colors[grade] || 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800';
    };

    const toggleResponse = (responseId: string) => {
        setExpandedResponse(expandedResponse === responseId ? null : responseId);
    };

    // Show skeleton on first load with no cache
    if (loading && !cache.get(getCacheKey(attemptId || ''))) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-muted/30 w-full md:max-w-[740px] mx-auto px-0 md:px-3 py-4 md:py-8">
                <LoadingSkeleton type="results" />
            </div>
        );
    }

    if (error || !attempt) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-muted/30 w-full md:max-w-[740px] mx-auto px-0 md:px-3 py-4 md:py-8">
                <ErrorState
                    message={error || 'Results not found'}
                    onRetry={() => {
                        if (attemptId) {
                            const cacheKey = getCacheKey(attemptId);
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
        <div className="min-h-screen bg-gray-50 dark:bg-muted/30 w-full md:max-w-[740px] mx-auto px-0 md:px-3 py-4 md:py-8 space-y-4 md:space-y-6">
            {/* Back Button */}
            <button
                onClick={handleHome}
                className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
                <ChevronLeft className="w-5 h-5" />
                <span>Back to Assessments</span>
            </button>

            {/* Header */}
            <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <Award className="w-8 h-8 text-yellow-500 dark:text-yellow-400" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Assessment Results</h1>
                </div>
                <p className="text-gray-500 dark:text-gray-400">{attempt.assessment?.title || 'Assessment'}</p>
                <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${gradeColor}`}>
                        Grade: {grade}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${isPassing ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                        {isPassing ? '✅ Passed' : '❌ Failed'}
                    </span>
                </div>
            </div>

            <div className="space-y-4 md:space-y-6">
                {/* Score Card */}
                <div className="bg-white/40 dark:bg-muted/30 backdrop-blur-md rounded-xl shadow-sm border-0 p-4 md:p-6">
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

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="bg-white/40 dark:bg-muted/30 backdrop-blur-md rounded-xl shadow-sm border-0 p-4 md:p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                            Time & Completion
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                                <span className="text-gray-600 dark:text-gray-400">Time Spent</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {Math.floor(attempt.time_spent_seconds / 60)}m {attempt.time_spent_seconds % 60}s
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                                <span className="text-gray-600 dark:text-gray-400">Questions Answered</span>
                                <span className="font-medium text-gray-900 dark:text-white">{totalQuestions}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                                <span className="text-gray-600 dark:text-gray-400">Passing Score</span>
                                <span className="font-medium text-gray-900 dark:text-white">{attempt.assessment?.passing_score || 70}%</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-gray-600 dark:text-gray-400">Completed</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {new Date(attempt.completed_at || attempt.updated_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Accuracy Stats */}
                    <div className="bg-white/40 dark:bg-muted/30 backdrop-blur-md rounded-xl shadow-sm border-0 p-4 md:p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Target className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                            Accuracy
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                                <span className="text-gray-600 dark:text-gray-400">Correct</span>
                                <span className="font-medium text-green-600 dark:text-green-400">{attempt.correct_answers}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                                <span className="text-gray-600 dark:text-gray-400">Wrong</span>
                                <span className="font-medium text-red-600 dark:text-red-400">{attempt.wrong_answers}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-gray-600 dark:text-gray-400">Accuracy</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {totalQuestions > 0 ? Math.round((attempt.correct_answers / totalQuestions) * 100) : 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Responses */}
                {responses.length > 0 && (
                    <div className="bg-white/40 dark:bg-muted/30 backdrop-blur-md rounded-xl shadow-sm border-0 p-4 md:p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Brain className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                            Detailed Answers
                        </h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                            {responses.map((response, index) => (
                                <div
                                    key={response.id}
                                    className={`rounded-lg p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors border-0 ${response.is_correct ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'
                                        }`}
                                    onClick={() => toggleResponse(response.id)}
                                >
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Q{index + 1}</span>
                                            {response.is_correct ? (
                                                <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                                            )}
                                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs">
                                                {response.step?.message?.substring(0, 60)}...
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-medium ${response.is_correct ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {response.is_correct ? 'Correct' : 'Incorrect'}
                                            </span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                {response.score}%
                                            </span>
                                        </div>
                                    </div>

                                    {expandedResponse === response.id && (
                                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                                <span className="font-medium">Your Answer:</span> {response.student_answer || 'No answer provided'}
                                            </p>
                                            {response.feedback && (
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                                    <span className="font-medium">Feedback:</span> {response.feedback}
                                                </p>
                                            )}
                                            {response.matched_keywords && response.matched_keywords.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">Matched:</span>
                                                    {response.matched_keywords.map((kw, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                                                            {kw}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {response.missing_keywords && response.missing_keywords.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
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
                )}

                {/* Actions */}
                <div className="bg-white/40 dark:bg-muted/30 backdrop-blur-md rounded-xl shadow-sm border-0 p-4 md:p-6">
                    <div className="flex flex-wrap gap-4 justify-center">
                        <button
                            onClick={handleRetake}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-lg transition-all shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 font-medium"
                        >
                            <RotateCcw className="w-5 h-5" />
                            Retake Assessment
                        </button>
                        <button
                            onClick={handleHome}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors font-medium"
                        >
                            <Home className="w-5 h-5" />
                            Back to Home
                        </button>
                        <button
                            onClick={handleDownloadReport}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium"
                        >
                            <Download className="w-5 h-5" />
                            Download Report
                        </button>
                        <button
                            onClick={handleShare}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium"
                        >
                            <Share2 className="w-5 h-5" />
                            Share Results
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};