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
    const difficultyColors = {
        Beginner: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
        Intermediate: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
        Advanced: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
        Expert: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    };

    const difficultyStars = {
        Beginner: '★☆☆☆',
        Intermediate: '★★☆☆',
        Advanced: '★★★☆',
        Expert: '★★★★'
    };

    return (
        <div className={`bg-white dark:bg-slate-900/90 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${className}`}>
            {assessment.cover_image && (
                <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${assessment.cover_image})` }} />
            )}

            <div className="p-5">
                {assessment.is_featured && (
                    <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-sm mb-2">
                        <Star className="w-4 h-4 fill-yellow-600 dark:fill-yellow-400" />
                        <span>Featured</span>
                    </div>
                )}

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {assessment.title}
                </h3>

                {assessment.description && (
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                        {assessment.description}
                    </p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{assessment.estimated_minutes} min</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        <span>{assessment.total_steps} steps</span>
                    </div>

                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[assessment.difficulty]}`}>
                        {difficultyStars[assessment.difficulty]} {assessment.difficulty}
                    </div>

                    {assessment.category && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            {assessment.category.name}
                        </span>
                    )}
                </div>

                {onStart && (
                    <button
                        onClick={() => onStart(assessment)}
                        className="mt-4 w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30"
                    >
                        <Play className="w-4 h-4" />
                        Start Assessment
                    </button>
                )}
            </div>
        </div>
    );
};

// ============================================
// CATEGORY CARD
// ============================================

// src/assessment/components/AssessmentComponents.tsx - CategoryCard

// ============================================
// CATEGORY CARD - Full content display
// ============================================

interface CategoryCardProps {
    category: AssessmentCategory;
    assessmentCount?: number;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, assessmentCount = 0 }) => {
    return (
        <Link
            to="/assessments"
            className="group block bg-white/40 dark:bg-muted/30 backdrop-blur-md rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border-0 h-full"
        >
            <div className="p-3 md:p-4 h-full flex flex-col items-center text-center">
                {category.icon && (
                    <div
                        className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-xl md:text-2xl mb-1.5 md:mb-2 flex-shrink-0"
                        style={{
                            backgroundColor: category.color ? `${category.color}20` : 'rgba(59, 130, 246, 0.1)',
                            color: category.color || '#3b82f6'
                        }}
                    >
                        {category.icon}
                    </div>
                )}

                <h3 className="font-semibold text-gray-900 dark:text-white text-xs md:text-sm group-hover:opacity-80 transition-opacity line-clamp-1">
                    {category.name}
                </h3>

                {category.description && (
                    <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 flex-1">
                        {category.description}
                    </p>
                )}

                <div className="mt-1.5 md:mt-2 flex items-center gap-1 text-[10px] md:text-xs text-gray-400 dark:text-gray-500">
                    <span>{assessmentCount} {assessmentCount === 1 ? 'assessment' : 'assessments'}</span>
                    <ArrowRight className="w-2.5 h-2.5 md:w-3 md:h-3 group-hover:translate-x-1 transition-transform flex-shrink-0" />
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
    const personalityEmojis = {
        Friendly: '😊',
        Normal: '👩‍⚕️',
        Roast: '🔥'
    };

    return (
        <div className="flex items-start gap-3 max-w-[85%]">
            <div className="flex-shrink-0">
                {avatar ? (
                    <img src={avatar} alt="Tutor" className="w-8 h-8 rounded-full" />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                )}
            </div>

            <div className="flex-1">
                <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl rounded-tl-none px-4 py-3">
                    {isTyping ? (
                        <div className="flex items-center gap-1 py-1">
                            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    ) : (
                        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{message}</p>
                    )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                        {personalityEmojis[personality]} {personality} Tutor
                    </span>
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
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                )}
            </div>

            <div className="flex-1">
                <div className="bg-blue-500 dark:bg-blue-600 rounded-2xl rounded-tr-none px-4 py-3">
                    <p className="text-white whitespace-pre-wrap">{message}</p>
                </div>

                <div className="flex items-center gap-2 mt-1 justify-end">
                    {isCorrect !== undefined && (
                        <span className={`text-xs ${isCorrect ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                            {isCorrect ? (
                                <CheckCircle className="w-4 h-4" />
                            ) : (
                                <XCircle className="w-4 h-4" />
                            )}
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
        <div className="bg-white dark:bg-slate-900/90 border-b border-gray-200 dark:border-slate-700 px-4 py-3">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1 mr-4">
                        {title}
                    </h2>

                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>{formatTime(timeSpent)}</span>
                        </div>
                        <div className="flex items-center gap-1 font-medium">
                            <Award className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                            <span className="text-gray-900 dark:text-white">{Math.round(score)}%</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
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
    const getGradeColor = (grade: string) => {
        const grades: Record<string, string> = {
            'A': 'text-green-600 dark:text-green-400',
            'B': 'text-blue-600 dark:text-blue-400',
            'C': 'text-yellow-600 dark:text-yellow-400',
            'D': 'text-orange-600 dark:text-orange-400',
            'F': 'text-red-600 dark:text-red-400'
        };
        return grades[grade] || 'text-gray-600 dark:text-gray-400';
    };

    const metrics = [
        { label: 'Communication', value: communication, icon: MessageSquare },
        { label: 'Clinical Knowledge', value: clinical, icon: Brain },
        { label: 'Confidence', value: confidence, icon: Sparkles },
        { label: 'Patient Safety', value: safety, icon: Shield }
    ];

    return (
        <div className="bg-white dark:bg-slate-900/90 rounded-xl shadow-sm p-6">
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-3">
                    <span className="text-3xl font-bold text-primary-600 dark:text-primary-400">{Math.round(score)}%</span>
                </div>
                {grade && (
                    <div className={`text-2xl font-bold ${getGradeColor(grade)}`}>
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
                        <div key={index} className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                            <Icon className="w-5 h-5 mx-auto text-gray-400 dark:text-gray-500 mb-1" />
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
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
        <div className="bg-white dark:bg-slate-900/90 rounded-xl shadow-sm p-5">
            <div className="animate-pulse">
                <div className="h-48 bg-gray-200 dark:bg-slate-700 rounded-lg mb-4" />
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4" />
                <div className="flex gap-2">
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-16" />
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-16" />
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-16" />
                </div>
            </div>
        </div>
    );

    const renderChat = () => (
        <div className="space-y-4">
            <div className="animate-pulse flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-full" />
                <div className="flex-1">
                    <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4">
                        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
                    </div>
                </div>
            </div>
            <div className="animate-pulse flex items-start gap-3 justify-end">
                <div className="flex-1 max-w-[70%]">
                    <div className="bg-blue-500 dark:bg-blue-600 rounded-2xl p-4">
                        <div className="h-4 bg-blue-400 dark:bg-blue-400/50 rounded w-2/3" />
                    </div>
                </div>
                <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-full" />
            </div>
        </div>
    );

    const renderResults = () => (
        <div className="animate-pulse space-y-6">
            <div className="w-24 h-24 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto" />
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mx-auto" />
            <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4">
                        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mx-auto mb-2" />
                        <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mx-auto" />
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{description}</p>
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-lg transition-all shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30"
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
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Something went wrong</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                >
                    Try Again
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
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
        <div className={`rounded-xl p-4 ${isCorrect ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
            <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
                <span className={`font-semibold ${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {isCorrect ? 'Correct!' : 'Not quite right'}
                </span>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-3">{feedback}</p>

            {!isCorrect && missingKeywords.length > 0 && (
                <div className="mb-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Missing keywords:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {missingKeywords.map((keyword, i) => (
                            <span key={i} className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full">
                                {keyword}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {matchedKeywords.length > 0 && (
                <div className="mb-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Matched keywords:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {matchedKeywords.map((keyword, i) => (
                            <span key={i} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                                {keyword}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {explanation && (
                <div className="mt-2 p-3 bg-white dark:bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-medium">Explanation:</span> {explanation}
                    </p>
                </div>
            )}

            {clinicalReference && (
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium">📚 Clinical Reference:</span> {clinicalReference}
                </div>
            )}
        </div>
    );
};

// ============================================
// HISTORY CARD - UPDATED
// ============================================

interface HistoryCardProps {
    attempt: AssessmentAttempt;
    onViewReport?: (attempt: AssessmentAttempt) => void;
    onResume?: (attempt: AssessmentAttempt) => void;
    onRetake?: (attempt: AssessmentAttempt) => void;
}

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
        if (hours > 0) {
            return `${hours}h ${mins % 60}m`;
        }
        return `${mins}m`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
            case 'in_progress': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
            case 'abandoned': return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-800';
            default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return '✅ Completed';
            case 'in_progress': return '⏳ In Progress';
            case 'abandoned': return '🚫 Abandoned';
            default: return status;
        }
    };

    const getGradeColor = (grade?: string) => {
        if (!grade) return 'text-gray-500 dark:text-gray-400';
        const colors: Record<string, string> = {
            'A': 'text-green-600 dark:text-green-400',
            'B': 'text-blue-600 dark:text-blue-400',
            'C': 'text-yellow-600 dark:text-yellow-400',
            'D': 'text-orange-600 dark:text-orange-400',
            'F': 'text-red-600 dark:text-red-400'
        };
        return colors[grade] || 'text-gray-500 dark:text-gray-400';
    };

    const title = attempt.assessment?.title || 'Unknown Assessment';
    const slug = attempt.assessment?.slug || '';
    const totalSteps = attempt.assessment?.total_steps || 0;
    const score = Math.round(attempt.score || 0);
    const passingScore = attempt.assessment?.passing_score || 70;

    return (
        <div className="bg-white dark:bg-slate-900/90 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {title}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-sm flex-wrap">
                        <span className="text-gray-500 dark:text-gray-400">{formatDate(attempt.started_at)}</span>
                        <span className="text-gray-400 dark:text-gray-500">·</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(attempt.status)}`}>
                            {getStatusLabel(attempt.status)}
                        </span>
                        {attempt.status === 'completed' && attempt.overall_grade && (
                            <>
                                <span className="text-gray-400 dark:text-gray-500">·</span>
                                <span className={`font-bold ${getGradeColor(attempt.overall_grade)}`}>
                                    Grade {attempt.overall_grade}
                                </span>
                            </>
                        )}
                        {attempt.status === 'completed' && (
                            <>
                                <span className="text-gray-400 dark:text-gray-500">·</span>
                                <span className={`font-bold ${score >= passingScore ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {score}%
                                </span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                        <span>Score: {score}%</span>
                        <span>Time: {formatTime(attempt.time_spent_seconds)}</span>
                        <span>Steps: {attempt.current_step || 0}/{totalSteps || 0}</span>
                        {attempt.status === 'completed' && (
                            <span>Correct: {attempt.correct_answers || 0}/{attempt.correct_answers + attempt.wrong_answers || 0}</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-4 flex-wrap">
                    {attempt.status === 'in_progress' && onResume && (
                        <button
                            onClick={() => onResume(attempt)}
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white text-sm rounded-lg transition-all shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30"
                        >
                            Resume
                        </button>
                    )}
                    {attempt.status === 'completed' && onViewReport && (
                        <button
                            onClick={() => onViewReport(attempt)}
                            className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                        >
                            View Report
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                    {attempt.status === 'completed' && onRetake && (
                        <button
                            onClick={() => onRetake(attempt)}
                            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Retake
                        </button>
                    )}
                    {attempt.status === 'abandoned' && (
                        <button
                            onClick={() => {
                                if (attempt.assessment?.slug) {
                                    navigate(`/assessments/${attempt.assessment.slug}`);
                                }
                            }}
                            className="px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-sm rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors flex items-center gap-1"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Start Fresh
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
        <div className="flex items-center gap-1 px-4 py-3 bg-gray-100 dark:bg-slate-800 rounded-2xl">
            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
    );
};

// ============================================
// CHAT INPUT - UPDATED with sticky behavior
// ============================================

// ============================================
// CHAT INPUT - WhatsApp Style
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
            if (value.trim() && !disabled) {
                onSend();
            }
        }
    };

    // Auto-resize textarea like WhatsApp
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
        <div className="flex items-end gap-2 bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border-t border-gray-200 dark:border-slate-700 p-2 md:p-3 rounded-b-2xl">
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
                    style={{
                        lineHeight: '1.5',
                        fontSize: '15px'
                    }}
                />
            </div>
            <button
                onClick={onSend}
                disabled={!value.trim() || disabled}
                className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all ${value.trim() && !disabled
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    }`}
            >
                <Send className="w-4 h-4" />
            </button>
        </div>
    );
};