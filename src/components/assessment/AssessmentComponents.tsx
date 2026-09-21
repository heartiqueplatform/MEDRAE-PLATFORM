// src/assessment/components/AssessmentComponents.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Clock, Target, Star, TrendingUp, ArrowRight, User,
    CheckCircle, XCircle, Award, Calendar, Search,
    Filter, ChevronRight, Play, RotateCcw, Home,
    Sparkles, BookOpen, Brain, Heart, Shield, MessageSquare,
    RefreshCw, Send
} from 'lucide-react';
import { Assessment, AssessmentCategory, AssessmentAttempt } from '../assessmentTypes';

// ============================================
// ASSESSMENT CARD
// ============================================

interface AssessmentCardProps {
    assessment: Assessment;
    className?: string;
    onStart?: (assessment: Assessment) => void;
}

export const AssessmentCard: React.FC<AssessmentCardProps> = ({
    assessment,
    className = '',
    onStart
}) => {
    return (
        <div className={`bg-white dark:bg-[#161b22] rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full ${className}`}>
            {assessment.cover_image && (
                <div
                    className="h-60 md:h-64 bg-cover bg-center shrink-0"
                    style={{ backgroundImage: `url(${assessment.cover_image})` }}
                />
            )}

            <div className="p-4 md:p-5 flex flex-col flex-1">
                {/* Top row — featured + difficulty */}
                <div className="flex items-center justify-between gap-2 mb-2">
                    {assessment.is_featured ? (
                        <div className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>Featured</span>
                        </div>
                    ) : (
                        <span />
                    )}

                    {assessment.difficulty && (
                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#21262d] px-2 py-0.5 rounded-full">
                            {assessment.difficulty}
                        </span>
                    )}
                </div>

                {/* Title — up to 3 lines, no cut-off */}
                <h3 className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-200 leading-snug line-clamp-3 break-words">
                    {assessment.title}
                </h3>

                {/* Description — up to 3 lines */}
                {assessment.description && (
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed line-clamp-3 break-words">
                        {assessment.description}
                    </p>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-3">
                    <div className="flex items-center gap-1 bg-gray-50 dark:bg-[#21262d] rounded-lg px-2 py-1">
                        <Clock className="w-3 h-3" />
                        <span>{assessment.estimated_minutes} min</span>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-50 dark:bg-[#21262d] rounded-lg px-2 py-1">
                        <Target className="w-3 h-3" />
                        <span>{assessment.total_steps} steps</span>
                    </div>
                    {assessment.category && (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                            {assessment.category.name}
                        </span>
                    )}
                </div>

                {/* CTA — pushed to bottom */}
                {onStart && (
                    <button
                        onClick={() => onStart(assessment)}
                        className="mt-4 w-full bg-gray-800 hover:bg-gray-900 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-white px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-semibold active:scale-[0.98]"
                    >
                        <Play className="w-3.5 h-3.5" />
                        Start assessment
                    </button>
                )}
            </div>
        </div>
    );
};

// ============================================
// CATEGORY CARD
// ============================================

interface CategoryCardProps {
    category: AssessmentCategory;
    assessmentCount?: number;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, assessmentCount = 0 }) => {
    return (
        <Link
            to="/assessments"
            className="group block bg-white dark:bg-[#161b22] rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden h-full"
        >
            <div className="p-3 md:p-4 h-full flex flex-col items-center text-center">
                {category.icon && (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-xl md:text-2xl mb-2 flex-shrink-0 bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-gray-400">
                        {category.icon}
                    </div>
                )}

                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-xs md:text-sm group-hover:opacity-80 transition-opacity line-clamp-2 break-words">
                    {category.name}
                </h3>

                {category.description && (
                    <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 flex-1">
                        {category.description}
                    </p>
                )}

                <div className="mt-2 flex items-center gap-1 text-[10px] md:text-xs text-gray-400 dark:text-gray-500">
                    <span>
                        {assessmentCount} {assessmentCount === 1 ? 'assessment' : 'assessments'}
                    </span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </div>
            </div>
        </Link>
    );
};

// ============================================
// TUTOR BUBBLE
// ============================================

interface TutorBubbleProps {
    message: string;
    timestamp?: string;
    personality?: 'Friendly' | 'Normal' | 'Roast';
    isTyping?: boolean;
    avatar?: string;
}

export const TutorBubble: React.FC<TutorBubbleProps> = ({
    message,
    timestamp,
    personality = 'Normal',
    isTyping = false,
    avatar
}) => {
    return (
        <div className="flex items-start gap-3 max-w-[85%]">
            <div className="flex-shrink-0">
                {avatar ? (
                    <img src={avatar} alt="Tutor" className="w-8 h-8 rounded-full" />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#21262d] flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="bg-gray-100 dark:bg-[#21262d] rounded-2xl rounded-tl-none px-4 py-3">
                    {isTyping ? (
                        <div className="flex items-center gap-1 py-1">
                            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    ) : (
                        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap text-sm leading-relaxed">{message}</p>
                    )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                        {personality} tutor
                    </span>
                    {timestamp && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            · {new Date(timestamp).toLocaleTimeString()}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================
// STUDENT BUBBLE
// ============================================

interface StudentBubbleProps {
    message: string;
    timestamp?: string;
    isCorrect?: boolean;
    avatar?: string;
}

export const StudentBubble: React.FC<StudentBubbleProps> = ({
    message,
    timestamp,
    isCorrect,
    avatar
}) => {
    return (
        <div className="flex items-start gap-3 max-w-[85%] ml-auto flex-row-reverse">
            <div className="flex-shrink-0">
                {avatar ? (
                    <img src={avatar} alt="You" className="w-8 h-8 rounded-full" />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-800 dark:bg-[#21262d] flex items-center justify-center">
                        <User className="w-4 h-4 text-white dark:text-gray-400" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="bg-gray-800 dark:bg-[#21262d] rounded-2xl rounded-tr-none px-4 py-3">
                    <p className="text-white dark:text-gray-200 whitespace-pre-wrap text-sm leading-relaxed">{message}</p>
                </div>

                <div className="flex items-center gap-2 mt-1 justify-end">
                    {isCorrect !== undefined && (
                        <span className={`text-xs ${isCorrect ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                            {isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </span>
                    )}
                    {timestamp && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(timestamp).toLocaleTimeString()}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================
// PROGRESS HEADER
// ============================================

interface ProgressHeaderProps {
    currentStep: number;
    totalSteps: number;
    score: number;
    timeSpent: number;
    title: string;
}

export const ProgressHeader: React.FC<ProgressHeaderProps> = ({
    currentStep,
    totalSteps,
    score,
    timeSpent,
    title
}) => {
    const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-white dark:bg-[#161b22] border-b border-gray-100 dark:border-[#21262d] px-4 py-3">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1 mr-4">
                        {title}
                    </h2>

                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>{formatTime(timeSpent)}</span>
                        </div>
                        <div className="flex items-center gap-1 font-medium">
                            <Award className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-800 dark:text-gray-200">{Math.round(score)}%</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gray-800 dark:bg-gray-500 transition-all duration-500"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        Step {currentStep}/{totalSteps}
                    </span>
                </div>
            </div>
        </div>
    );
};

// ============================================
// SCORE CARD
// ============================================

interface ScoreCardProps {
    score: number;
    correct: number;
    wrong: number;
    total: number;
    communication?: number;
    confidence?: number;
    clinical?: number;
    safety?: number;
    grade?: string;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
    score,
    correct,
    wrong,
    total,
    communication = 0,
    confidence = 0,
    clinical = 0,
    safety = 0,
    grade
}) => {
    const metrics = [
        { label: 'Communication', value: communication, icon: MessageSquare },
        { label: 'Clinical knowledge', value: clinical, icon: Brain },
        { label: 'Confidence', value: confidence, icon: Sparkles },
        { label: 'Patient safety', value: safety, icon: Shield }
    ];

    return (
        <div className="bg-white dark:bg-[#161b22] rounded-2xl shadow-sm p-6">
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-100 dark:bg-[#21262d] mb-3">
                    <span className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                        {Math.round(score)}%
                    </span>
                </div>
                {grade && (
                    <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                        Grade: {grade}
                    </div>
                )}
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {correct} correct · {wrong} wrong · {total} total
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {metrics.map((metric, index) => {
                    const Icon = metric.icon;
                    return (
                        <div key={index} className="bg-gray-50 dark:bg-[#21262d] rounded-xl p-3 text-center">
                            <Icon className="w-5 h-5 mx-auto text-gray-500 dark:text-gray-400 mb-1" />
                            <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                {Math.round(metric.value)}%
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{metric.label}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ============================================
// TIMER
// ============================================

interface TimerProps {
    seconds: number;
    className?: string;
}

export const Timer: React.FC<TimerProps> = ({ seconds, className = '' }) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const timeString = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;

    return (
        <div className={`flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 ${className}`}>
            <Clock className="w-4 h-4" />
            <span>{timeString}</span>
        </div>
    );
};

// ============================================
// LOADING SKELETON
// ============================================

interface LoadingSkeletonProps {
    count?: number;
    type?: 'card' | 'chat' | 'results';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
    count = 1,
    type = 'card'
}) => {
    const renderCard = () => (
        <div className="bg-white dark:bg-[#161b22] rounded-2xl shadow-sm overflow-hidden flex flex-col h-full animate-pulse">
            {/* Cover image — exact same class as real card */}
            <div className="h-60 md:h-64 bg-gray-200 dark:bg-[#21262d] shrink-0" />

            {/* Content padding matches card: p-4 md:p-5 */}
            <div className="p-4 md:p-5 flex flex-col flex-1">
                {/* Top row — featured spacer + difficulty pill */}
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="h-3 w-16 bg-gray-100 dark:bg-[#30363d] rounded" />
                    <div className="h-4 w-16 bg-gray-100 dark:bg-[#30363d] rounded-full" />
                </div>

                {/* Title — 3 lines matching text-sm md:text-base leading-snug */}
                <div className="space-y-1.5">
                    <div className="h-3.5 bg-gray-200 dark:bg-[#30363d] rounded w-full" />
                    <div className="h-3.5 bg-gray-200 dark:bg-[#30363d] rounded w-11/12" />
                    <div className="h-3.5 bg-gray-200 dark:bg-[#30363d] rounded w-2/3" />
                </div>

                {/* Description — mt-1.5 matches card, 3 lines */}
                <div className="space-y-1.5 mt-1.5">
                    <div className="h-3 bg-gray-100 dark:bg-[#30363d] rounded w-full" />
                    <div className="h-3 bg-gray-100 dark:bg-[#30363d] rounded w-10/12" />
                    <div className="h-3 bg-gray-100 dark:bg-[#30363d] rounded w-3/4" />
                </div>

                {/* Meta pills — mt-3 matches card */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                    <div className="h-6 w-16 bg-gray-100 dark:bg-[#30363d] rounded-lg" />
                    <div className="h-6 w-16 bg-gray-100 dark:bg-[#30363d] rounded-lg" />
                    <div className="h-3 w-20 bg-gray-100 dark:bg-[#30363d] rounded" />
                </div>

                {/* CTA button — mt-4 + h-9 mirrors py-2 text-sm button */}
                <div className="h-9 w-full bg-gray-100 dark:bg-[#30363d] rounded-xl mt-4" />
            </div>
        </div>
    );

    const renderChat = () => (
        <div className="space-y-4">
            <div className="animate-pulse flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-[#21262d] rounded-full" />
                <div className="flex-1">
                    <div className="bg-gray-100 dark:bg-[#21262d] rounded-2xl p-4">
                        <div className="h-4 bg-gray-200 dark:bg-[#30363d] rounded w-3/4 mb-2" />
                        <div className="h-4 bg-gray-200 dark:bg-[#30363d] rounded w-1/2" />
                    </div>
                </div>
            </div>
            <div className="animate-pulse flex items-start gap-3 justify-end">
                <div className="flex-1 max-w-[70%]">
                    <div className="bg-gray-800 dark:bg-[#21262d] rounded-2xl p-4">
                        <div className="h-4 bg-gray-700 dark:bg-[#30363d] rounded w-2/3" />
                    </div>
                </div>
                <div className="w-8 h-8 bg-gray-200 dark:bg-[#21262d] rounded-full" />
            </div>
        </div>
    );

    const renderResults = () => (
        <div className="animate-pulse space-y-6">
            <div className="w-24 h-24 bg-gray-200 dark:bg-[#21262d] rounded-full mx-auto" />
            <div className="h-8 bg-gray-200 dark:bg-[#21262d] rounded w-1/3 mx-auto" />
            <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-gray-50 dark:bg-[#21262d] rounded-xl p-4">
                        <div className="h-4 bg-gray-200 dark:bg-[#30363d] rounded w-1/2 mx-auto mb-2" />
                        <div className="h-8 bg-gray-200 dark:bg-[#30363d] rounded w-1/3 mx-auto" />
                    </div>
                ))}
            </div>
        </div>
    );

    const renderers = { card: renderCard, chat: renderChat, results: renderResults };
    const Renderer = renderers[type];

    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i}>{Renderer()}</div>
            ))}
        </div>
    );
};

// ============================================
// EMPTY STATE
// ============================================

interface EmptyStateProps {
    title: string;
    description: string;
    icon?: React.ReactNode;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    description,
    icon,
    action
}) => {
    return (
        <div className="text-center py-12">
            {icon || <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />}
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">{title}</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{description}</p>
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-900 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-white rounded-xl transition-all text-sm font-semibold active:scale-[0.98]"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};

// ============================================
// ERROR STATE
// ============================================

interface ErrorStateProps {
    message: string;
    onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
    return (
        <div className="text-center py-12">
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Something went wrong
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-gray-100 dark:bg-[#21262d] text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-[#30363d] transition-colors text-sm font-medium"
                >
                    Try again
                </button>
            )}
        </div>
    );
};

// ============================================
// SEARCH BAR
// ============================================

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChange,
    placeholder = 'Search assessments...',
    className = ''
}) => {
    return (
        <div className={`relative ${className}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-10 pr-4 py-3 border-0 bg-white dark:bg-[#161b22] text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#30363d] shadow-sm transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
        </div>
    );
};

// ============================================
// FEEDBACK CARD
// ============================================

interface FeedbackCardProps {
    isCorrect: boolean;
    feedback: string;
    explanation?: string | null;
    clinicalReference?: string | null;
    matchedKeywords?: string[];
    missingKeywords?: string[];
}

export const FeedbackCard: React.FC<FeedbackCardProps> = ({
    isCorrect,
    feedback,
    explanation,
    clinicalReference,
    matchedKeywords = [],
    missingKeywords = []
}) => {
    return (
        <div className="rounded-2xl p-4 bg-gray-50 dark:bg-[#21262d]">
            <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                ) : (
                    <XCircle className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                )}
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {isCorrect ? 'Correct' : 'Not quite right'}
                </span>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-3 text-sm leading-relaxed">{feedback}</p>

            {!isCorrect && missingKeywords.length > 0 && (
                <div className="mb-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Missing keywords:
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {missingKeywords.map((keyword, i) => (
                            <span
                                key={i}
                                className="px-2 py-1 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-xs rounded-full"
                            >
                                {keyword}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {matchedKeywords.length > 0 && (
                <div className="mb-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Matched keywords:
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {matchedKeywords.map((keyword, i) => (
                            <span
                                key={i}
                                className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-full"
                            >
                                {keyword}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {explanation && (
                <div className="mt-2 p-3 bg-white dark:bg-[#161b22] rounded-xl">
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        <span className="font-medium">Explanation:</span> {explanation}
                    </p>
                </div>
            )}

            {clinicalReference && (
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Clinical reference:</span> {clinicalReference}
                </div>
            )}
        </div>
    );
};

// ============================================
// HISTORY CARD
// ============================================
export const HistoryCard: React.FC<HistoryCardProps> = ({
    attempt,
    onViewReport,
    onResume,
    onRetake
}) => {
    const navigate = useNavigate();

    const formatDate = (date: string) => {
        try {
            return new Date(date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return 'Invalid date';
        }
    };

    const formatTime = (seconds: number) => {
        if (!seconds || seconds === 0) return '0m';
        const mins = Math.floor(seconds / 60);
        const hours = Math.floor(mins / 60);
        if (hours > 0) return `${hours}h ${mins % 60}m`;
        return `${mins}m`;
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'completed':
                return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30';
            case 'in_progress':
                return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30';
            case 'abandoned':
                return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#21262d]';
            default:
                return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#21262d]';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Completed';
            case 'in_progress': return 'In progress';
            case 'abandoned': return 'Abandoned';
            default: return status;
        }
    };

    const title = attempt.assessment?.title || 'Unknown assessment';
    const totalSteps = attempt.assessment?.total_steps || 0;
    const score = Math.round(attempt.score || 0);
    const passingScore = attempt.assessment?.passing_score || 70;
    const coverImage = attempt.assessment?.cover_image;

    return (
        <div className="bg-white dark:bg-[#161b22] rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
            {/* Cover image — same height as AssessmentCard */}
            {coverImage && (
                <div
                    className="h-40 md:h-44 bg-cover bg-center shrink-0"
                    style={{ backgroundImage: `url(${coverImage})` }}
                />
            )}

            <div className="p-4 flex flex-col flex-1">
                {/* Title + status pill */}
                <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 break-words flex-1 line-clamp-2">
                        {title}
                    </h4>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${getStatusStyle(attempt.status)}`}>
                        {getStatusLabel(attempt.status)}
                    </span>
                </div>

                {/* Date + score row */}
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                    <span>{formatDate(attempt.started_at)}</span>
                    {attempt.status === 'completed' && attempt.overall_grade && (
                        <>
                            <span>·</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                                Grade {attempt.overall_grade}
                            </span>
                        </>
                    )}
                    {attempt.status === 'completed' && (
                        <>
                            <span>·</span>
                            <span className={`font-bold ${score >= passingScore ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {score}%
                            </span>
                        </>
                    )}
                </div>

                {/* Stats pills */}
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                    <span className="bg-gray-50 dark:bg-[#21262d] rounded-lg px-2 py-0.5">
                        {formatTime(attempt.time_spent_seconds)}
                    </span>
                    <span className="bg-gray-50 dark:bg-[#21262d] rounded-lg px-2 py-0.5">
                        {attempt.current_step || 0}/{totalSteps || 0} steps
                    </span>
                    {attempt.status === 'completed' && (
                        <span className="bg-gray-50 dark:bg-[#21262d] rounded-lg px-2 py-0.5">
                            {attempt.correct_answers || 0}/{(attempt.correct_answers || 0) + (attempt.wrong_answers || 0)}
                        </span>
                    )}
                </div>

                {/* Actions — pushed to bottom */}
                <div className="flex items-center gap-2 mt-auto pt-3">
                    {attempt.status === 'in_progress' && onResume && (
                        <button
                            onClick={() => onResume(attempt)}
                            className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-900 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-white text-sm rounded-xl transition-all font-medium active:scale-[0.98]"
                        >
                            Resume
                        </button>
                    )}
                    {attempt.status === 'completed' && onViewReport && (
                        <button
                            onClick={() => onViewReport(attempt)}
                            className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-900 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-white text-sm rounded-xl transition-all font-medium active:scale-[0.98] flex items-center justify-center gap-1"
                        >
                            Report
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {attempt.status === 'completed' && onRetake && (
                        <button
                            onClick={() => onRetake(attempt)}
                            className="px-3 py-2 bg-gray-100 dark:bg-[#21262d] text-gray-700 dark:text-gray-300 text-sm rounded-xl hover:bg-gray-200 dark:hover:bg-[#30363d] transition-colors font-medium active:scale-[0.98]"
                            title="Retake"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {attempt.status === 'abandoned' && (
                        <button
                            onClick={() => {
                                if (attempt.assessment?.slug) {
                                    navigate(`/assessments/${attempt.assessment.slug}`);
                                }
                            }}
                            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-[#21262d] text-gray-700 dark:text-gray-300 text-sm rounded-xl hover:bg-gray-200 dark:hover:bg-[#30363d] transition-colors font-medium active:scale-[0.98] flex items-center justify-center gap-1"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Start fresh
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
// ============================================
// TYPING INDICATOR
// ============================================

export const TypingIndicator: React.FC = () => {
    return (
        <div className="flex items-center gap-1 px-4 py-3 bg-gray-100 dark:bg-[#21262d] rounded-2xl">
            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
    );
};

// ============================================
// CHAT INPUT
// ============================================

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    disabled?: boolean;
    placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    value,
    onChange,
    onSend,
    disabled = false,
    placeholder = 'Type your answer...'
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [rows, setRows] = useState(1);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (value.trim() && !disabled) onSend();
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
            textareaRef.current.style.height = `${newHeight}px`;
            const newRows = Math.ceil(newHeight / 24);
            setRows(Math.min(newRows, 5));
        }
    }, [value]);

    return (
        <div className="flex items-end gap-2 bg-white/80 dark:bg-[#161b22]/90 backdrop-blur-md border-t border-gray-100 dark:border-[#21262d] p-2 md:p-3 rounded-b-2xl">
            <div className="flex-1 relative">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={rows}
                    className="w-full resize-none border-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] max-h-[120px] py-2 px-3 rounded-xl scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
                    style={{ lineHeight: '1.5', fontSize: '15px' }}
                />
            </div>
            <button
                onClick={onSend}
                disabled={!value.trim() || disabled}
                className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all ${value.trim() && !disabled
                    ? 'bg-gray-800 hover:bg-gray-900 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-white active:scale-[0.95]'
                    : 'bg-gray-200 dark:bg-[#21262d] text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    }`}
            >
                <Send className="w-4 h-4" />
            </button>
        </div>
    );
};