// src/pages/contribute/types.ts

export type EnrollmentStatus = "pending" | "approved" | "rejected" | "suspended";

export type Step = "meta" | "questions" | "review";

export interface DraftQuestion {
    /** Temporary client id — used only for React keys */
    tempId: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: "A" | "B" | "C" | "D";
    explanation: string;
    additional: string;
    difficulty: "easy" | "medium" | "hard";
    course_tag: string;
}

export interface DraftQuiz {
    title: string;
    description: string;
    course: string;
    unit: string;
    unit_code: string;
    topic: string;
    quiz_type: "mcq" | "short" | "guide";
    is_free: boolean;
    image_url: string;
    accent_color: string;
    questions: DraftQuestion[];
}