// src/lib/nursing/nursingCopy.ts
export type NursingMode = "student" | "tutor";

export interface NursingCopy {
    headerTitle: string;
    headerSubtitle: (yearsCount: number) => string;
    heroLabel: string;
    heroHeading: string;
    heroBody: string;

    statsYears: string;
    statsUnits: string;
    statsQuestions: string;

    progressTitle: string;
    progressSubtitleLoading: string;
    progressSubtitleActive: (answered: number, accuracy: number) => string;
    progressSubtitleEmpty: string;
    progressEmptyBody: string;

    quickAction1Title: string;
    quickAction1Body: string;
    quickAction2Title: string;
    quickAction2Body: string;

    yearListHeading: string;
    yearListBadge: string;

    yearCardAnswered: (answered: string, total: string) => string;
    yearCardTotal: (total: string) => string;

    emptyTitle: string;
    emptyBody: string;
}

const student: NursingCopy = {
    headerTitle: "Nursing Curriculum",
    headerSubtitle: (n) => `KRCHN · ${n} year${n === 1 ? "" : "s"}`,
    heroLabel: "KRCHN Curriculum",
    heroHeading: "Choose your year",
    heroBody:
        "Study smarter. Move through the curriculum one unit at a time.",

    statsYears: "Years",
    statsUnits: "Units",
    statsQuestions: "Questions",

    progressTitle: "Your Progress",
    progressSubtitleLoading: "Loading...",
    progressSubtitleActive: (answered, accuracy) =>
        `${answered} answered · ${Math.round(accuracy)}% accuracy`,
    progressSubtitleEmpty: "Start your journey",
    progressEmptyBody: "Take a quiz to start tracking.",

    quickAction1Title: "Quick Practice",
    quickAction1Body: "Jump to any topic",
    quickAction2Title: "Full Progress",
    quickAction2Body: "Deep analytics",

    yearListHeading: "Your learning path",
    yearListBadge: "Keep going",

    yearCardAnswered: (answered, total) => `${answered} / ${total} answered`,
    yearCardTotal: (total) => `${total} questions`,

    emptyTitle: "No curriculum years available",
    emptyBody: "Please check back later.",
};

const tutor: NursingCopy = {
    headerTitle: "Nursing Curriculum",
    headerSubtitle: (n) => `KRCHN · ${n} year${n === 1 ? "" : "s"} · Preview`,
    heroLabel: "KRCHN Curriculum",
    heroHeading: "Browse the curriculum",
    heroBody:
        "Preview the curriculum your students are studying. Jump into any year to review units and question banks.",

    statsYears: "Years",
    statsUnits: "Units",
    statsQuestions: "Questions",

    progressTitle: "Cohort progress",
    progressSubtitleLoading: "Loading...",
    progressSubtitleActive: (answered, accuracy) =>
        `${answered} answers from your cohort · ${Math.round(accuracy)}% accuracy`,
    progressSubtitleEmpty: "No cohort activity yet",
    progressEmptyBody: "Your students' attempts will appear here.",

    quickAction1Title: "Question Bank",
    quickAction1Body: "Browse by topic",
    quickAction2Title: "Cohort Analytics",
    quickAction2Body: "Student performance",

    yearListHeading: "Curriculum years",
    yearListBadge: "Preview mode",

    yearCardAnswered: (answered, total) => `${answered} / ${total} answered by cohort`,
    yearCardTotal: (total) => `${total} questions`,

    emptyTitle: "No curriculum years available",
    emptyBody: "Please check back later.",
};

export function getNursingCopy(mode: NursingMode): NursingCopy {
    return mode === "tutor" ? tutor : student;
}