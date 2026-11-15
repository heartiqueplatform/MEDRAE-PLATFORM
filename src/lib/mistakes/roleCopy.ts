// src/lib/mistakes/roleCopy.ts
export type MistakesMode = "student" | "tutor";

export interface MistakesCopy {
    shellTitle: string;
    shellSubtitle: string;
    tabNeedsWork: string;
    tabUnderstood: string;
    headerNeedsWorkLabel: string;
    headerUnderstoodLabel: string;
    headerNeedsWorkCountOne: string;
    headerNeedsWorkCountMany: string;
    headerUnderstoodCountOne: string;
    headerUnderstoodCountMany: string;
    headerNeedsWorkEmpty: string;
    headerUnderstoodEmpty: string;
    headerNeedsWorkDesc: string;
    headerUnderstoodDesc: string;
    headerNeedsWorkEmptyDesc: string;
    headerUnderstoodEmptyDesc: string;
    emptyFlawlessTitle: string;
    emptyFlawlessDesc: string;
    understoodTabEmptyTitle: string;
    understoodTabEmptyDesc: string;
    wrongTimes: (n: number) => string;
    markedAt: string;
    studentsStumbled: string;
    detailOthers: string;
    markUnderstood: string;
    moveBack: string;
    takeQuiz: string;
    continueJourney: string;
    refresh: string;
    offlineTitle: string;
    offlineDesc: string;
    whyMissed: string;

    /** Badge label next to the learner's wrong pick. */
    studentChoiceLabel: string;
    /** Badge label next to the correct option. */
    correctChoiceLabel: string;
}

const student: MistakesCopy = {
    shellTitle: "My mistakes",
    shellSubtitle: "Learn from every miss",
    tabNeedsWork: "Needs work",
    tabUnderstood: "Understood",
    headerNeedsWorkLabel: "Your learning space",
    headerUnderstoodLabel: "Your archive",
    headerNeedsWorkCountOne: "question to revisit",
    headerNeedsWorkCountMany: "questions to revisit",
    headerUnderstoodCountOne: "question mastered",
    headerUnderstoodCountMany: "questions mastered",
    headerNeedsWorkEmpty: "Everything's clear",
    headerUnderstoodEmpty: "Nothing understood yet",
    headerNeedsWorkDesc:
        "Each one is a small lesson. Work through at your own pace.",
    headerUnderstoodDesc:
        "These are the ones you've conquered. Revisit anytime.",
    headerNeedsWorkEmptyDesc: "Keep going — you're on top of everything.",
    headerUnderstoodEmptyDesc:
        "Mark a mistake understood and it lands here for quick revision.",
    emptyFlawlessTitle: "Flawless performance",
    emptyFlawlessDesc:
        "No mistakes on record. Your clinical knowledge is peaking — keep the streak alive.",
    understoodTabEmptyTitle: "Nothing here yet",
    understoodTabEmptyDesc:
        "Mark a mistake understood and it'll show up here to revisit.",
    wrongTimes: (n) => `Wrong ${n} ${n === 1 ? "time" : "times"}`,
    markedAt: "Marked",
    studentsStumbled: "Others who paused here",
    detailOthers: "Others who paused here",
    markUnderstood: "Mark as understood",
    moveBack: "Move back to needs work",
    takeQuiz: "Take a new quiz",
    continueJourney: "Continue my journey",
    refresh: "Refresh",
    offlineTitle: "You're offline",
    offlineDesc:
        "Your mistakes will appear once you reconnect. Progress made offline is saved.",
    whyMissed: "Why you missed it",

    studentChoiceLabel: "Yours",
    correctChoiceLabel: "Correct",
};

const tutor: MistakesCopy = {
    shellTitle: "Cohort mistakes",
    shellSubtitle: "Where your students stumble",
    tabNeedsWork: "Cohort weak spots",
    tabUnderstood: "Resolved by students",
    headerNeedsWorkLabel: "Cohort learning space",
    headerUnderstoodLabel: "Cohort archive",
    headerNeedsWorkCountOne: "weak spot to review",
    headerNeedsWorkCountMany: "weak spots to review",
    headerUnderstoodCountOne: "spot resolved",
    headerUnderstoodCountMany: "spots resolved",
    headerNeedsWorkEmpty: "No weak spots recorded",
    headerUnderstoodEmpty: "Nothing resolved yet",
    headerNeedsWorkDesc:
        "Aggregated misses across your institution. Filter by school or drill into a question.",
    headerUnderstoodDesc:
        "Questions students have marked understood. Great for revision sessions.",
    headerNeedsWorkEmptyDesc:
        "Your cohort hasn't logged any open misses. Encourage a practice quiz.",
    headerUnderstoodEmptyDesc:
        "Once students mark a mistake understood, it appears here for quick revision.",
    emptyFlawlessTitle: "No weak spots recorded",
    emptyFlawlessDesc:
        "No aggregated misses for this institution yet. Invite students to take a quiz.",
    understoodTabEmptyTitle: "Nothing resolved yet",
    understoodTabEmptyDesc:
        "When students mark a mistake understood it appears here — useful for class review.",
    wrongTimes: (n) => `Missed ${n} ${n === 1 ? "time" : "times"} by students`,
    markedAt: "Resolved",
    studentsStumbled: "Students who missed this",
    detailOthers: "Students who missed this",
    markUnderstood: "Mark resolved",
    moveBack: "Reopen for cohort",
    takeQuiz: "Assign a practice quiz",
    continueJourney: "View curriculum",
    refresh: "Refresh cohort data",
    offlineTitle: "You're offline",
    offlineDesc:
        "Cohort data will refresh once you reconnect. Saved data is shown.",
    whyMissed: "Why students missed it",

    studentChoiceLabel: "Student's pick",
    correctChoiceLabel: "Correct",
};

export function getCopy(mode: MistakesMode): MistakesCopy {
    return mode === "tutor" ? tutor : student;
}