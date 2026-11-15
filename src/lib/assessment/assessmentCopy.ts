// src/lib/assessment/assessmentCopy.ts
export type AssessmentMode = "student" | "tutor";

export interface AssessmentCopy {
    headerTitle: string;
    headerSubtitle: (count: number) => string;
    heroHeading: string;
    heroBody: string;

    statCompleted: string;
    statAvg: string;
    statTime: string;
    statBest: string;

    availableHeading: string;
    viewAllLabel: string;

    categoriesHeading: string;

    continueTitle: string;
    continueBody: string;
    continueButton: string;

    emptyTitle: string;
    emptyBody: string;

    refreshing: string;

    /** Whether the per-user stats strip renders at all. */
    showStats: boolean;
    /** Whether the "Continue assessment" banner can render. */
    showContinue: boolean;

    backTo: string; // fallback dashboard route for the back button
}

const student: AssessmentCopy = {
    headerTitle: "Assessments",
    headerSubtitle: (n) => (n > 0 ? `${n} available` : "Clinical practice"),
    heroHeading: "Test your clinical knowledge",
    heroBody:
        "Practice real clinical scenarios with your AI nursing tutor. Get instant feedback and improve your clinical reasoning.",

    statCompleted: "Completed",
    statAvg: "Avg score",
    statTime: "Total time",
    statBest: "Best score",

    availableHeading: "Available",
    viewAllLabel: "View all",

    categoriesHeading: "Categories",

    continueTitle: "Continue assessment",
    continueBody: "You have an ongoing assessment in progress",
    continueButton: "Continue",

    emptyTitle: "No assessments available",
    emptyBody:
        "There are currently no assessments to display. Check back later or create your first assessment.",

    refreshing: "Refreshing…",

    showStats: true,
    showContinue: true,
    backTo: "/dashboard/student",
};

const tutor: AssessmentCopy = {
    headerTitle: "Clinical Assessments",
    headerSubtitle: (n) =>
        n > 0 ? `${n} in your catalog` : "Clinical practice library",
    heroHeading: "Preview clinical assessments",
    heroBody:
        "See the assessments your students are working through. Assign, review, and drill into results — this is your library to manage.",

    statCompleted: "Attempts",
    statAvg: "Avg cohort",
    statTime: "Time spent",
    statBest: "Top score",

    availableHeading: "Available assessments",
    viewAllLabel: "View all",

    categoriesHeading: "Categories",

    continueTitle: "Continue assessment",
    continueBody: "You have an ongoing assessment in progress",
    continueButton: "Continue",

    emptyTitle: "No assessments available",
    emptyBody:
        "There are currently no assessments in your catalog. Check back later or create your first assessment.",

    refreshing: "Refreshing…",

    showStats: false, // per-user stats are irrelevant for tutors
    showContinue: false,
    backTo: "/dashboard/tutor",
};

export function getAssessmentCopy(mode: AssessmentMode): AssessmentCopy {
    return mode === "tutor" ? tutor : student;
}