// src/assessment/assessmentTypes.ts

export interface AssessmentCategory {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    cover_image: string | null;
    color: string;
    display_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    assessment_count?: number;
    assessments?: { count: number }[]; // For the join query
}

export interface Assessment {
    id: string;
    category_id: string;
    title: string;
    slug: string;
    description: string | null;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
    estimated_minutes: number;
    cover_image: string | null;
    intro_message: string | null;
    starting_tutor_message: string | null;
    tutor_personality: 'Friendly' | 'Normal' | 'Roast';
    passing_score: number;
    total_steps: number;
    tags: string[];
    is_featured: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    category?: AssessmentCategory;
}

export interface AssessmentStep {
    id: string;
    assessment_id: string;
    step_number: number;
    parent_step_id: string | null;
    message: string;
    message_type: 'message' | 'question' | 'scenario' | 'emergency' | 'instruction' | 'feedback';
    expected_answer: string | null;
    accepted_answers: string[] | null;
    expected_keywords: string[];
    hint: string | null;
    explanation: string | null;
    clinical_reference: string | null;
    points: number;
    difficulty: number;
    time_limit: number | null;
    typing_delay: number | null;
    allow_retry: boolean;
    next_step: number | null;
    failure_step: number | null;
    emergency_branch: number | null;
    image_url: string | null;
    video_url: string | null;
    audio_url: string | null;
    created_at: string;
    updated_at: string;
    knowledge_id?: string | null;
}

export interface AssessmentAttempt {
    id: string;
    user_id: string;
    assessment_id: string;
    status: 'in_progress' | 'completed' | 'abandoned';
    current_step: number;
    score: number;
    total_points: number;
    correct_answers: number;
    wrong_answers: number;
    communication_score: number | null;
    confidence_score: number | null;
    clinical_score: number | null;
    patient_safety_score: number | null;
    overall_grade: string | null;
    started_at: string;
    completed_at: string | null;
    time_spent_seconds: number;
    created_at: string;
    updated_at: string;
    assessment?: Assessment;
    responses?: AssessmentResponse[];
}

export interface AssessmentResponse {
    id: string;
    attempt_id: string;
    step_id: string;
    student_answer: string | null;
    matched_keywords: string[] | null;
    missing_keywords: string[] | null;
    score: number;
    feedback: string | null;
    response_time_seconds: number | null;
    is_correct: boolean;
    created_at: string;
    step?: AssessmentStep;
}

export interface Knowledge {
    id: string;
    title: string;
    slug: string;
    category: string | null;
    topic: string | null;
    answer: string;
    summary: string | null;
    keywords: string[] | null;
    accepted_answers: string[] | null;
    clinical_references: string[] | null;
    mnemonics: string[] | null;
    tutor_notes: string | null;
    difficulty: number;
    tags: string[] | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ChatMessage {
    id: string;
    type: 'tutor' | 'student' | 'system';
    message: string;
    timestamp: string;
    step?: AssessmentStep;
    isTyping?: boolean;
    isCorrect?: boolean;
}

export interface AssessmentStats {
    total_attempts: number;
    average_score: number;
    total_time_spent: number;
    completed_count: number;
    best_score: number;
    recent_attempts: AssessmentAttempt[];
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface CreateAttemptRequest {
    assessment_id: string;
    user_id: string;
}

export interface CreateResponseRequest {
    attempt_id: string;
    step_id: string;
    student_answer: string;
    matched_keywords?: string[];
    missing_keywords?: string[];
    score?: number;
    feedback?: string | null;
    response_time_seconds?: number;
    is_correct?: boolean;
}

export interface AssessmentFilters {
    categoryId?: string;
    featured?: boolean;
    search?: string;
    difficulty?: string;
}

// ============================================
// EVALUATION TYPES
// ============================================

export interface KeywordMatchResult {
    matched: string[];
    missing: string[];
    score: number;
    isCorrect: boolean;
}

export interface StepEvaluation {
    stepId: string;
    studentAnswer: string;
    isCorrect: boolean;
    matchedKeywords: string[];
    missingKeywords: string[];
    score: number;
    feedback: string;
    explanation?: string;
    clinicalReference?: string;
}

// ============================================
// COMPONENT PROPS TYPES
// ============================================

export interface AssessmentCardProps {
    assessment: Assessment;
    className?: string;
    onStart?: (assessment: Assessment) => void;
}

export interface CategoryCardProps {
    category: AssessmentCategory;
    assessmentCount?: number;
}

export interface ScoreCardProps {
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

export interface ProgressHeaderProps {
    currentStep: number;
    totalSteps: number;
    score: number;
    timeSpent: number;
    title: string;
}

export interface FeedbackCardProps {
    isCorrect: boolean;
    feedback: string;
    explanation?: string | null;
    clinicalReference?: string | null;
    matchedKeywords?: string[];
    missingKeywords?: string[];
}

export interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    disabled?: boolean;
    placeholder?: string;
}

export interface TimerProps {
    seconds: number;
    className?: string;
}

export interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export interface LoadingSkeletonProps {
    count?: number;
    type?: 'card' | 'chat' | 'results';
}

export interface EmptyStateProps {
    title: string;
    description: string;
    icon?: React.ReactNode;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export interface ErrorStateProps {
    message: string;
    onRetry?: () => void;
}

export interface HistoryCardProps {
    attempt: AssessmentAttempt;
    onViewReport?: (attempt: AssessmentAttempt) => void;
    onResume?: (attempt: AssessmentAttempt) => void;
    onRetake?: (attempt: AssessmentAttempt) => void; // ✅ Added
}

export interface TutorBubbleProps {
    message: string;
    timestamp?: string;
    personality?: 'Friendly' | 'Normal' | 'Roast';
    isTyping?: boolean;
    avatar?: string;
}

export interface StudentBubbleProps {
    message: string;
    timestamp?: string;
    isCorrect?: boolean;
    avatar?: string;
}