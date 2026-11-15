// src/lib/lastMinute/lastMinuteCopy.ts
export type LastMinuteMode = "student" | "tutor";

export interface LastMinuteCopy {
    headerTitle: string;
    heroHeading: string;
    heroSubheading: (cheapest: number | null) => string;
    heroBody: string;
    papersCountLabel: (n: number) => string;
    unlockedLabel: (n: number) => string;
    searchPlaceholder: string;
    emptyNoPapers: string;
    emptyNoMatches: string;
    clearFilters: string;
    footerDisclaimer: string;
    tutorBanner: string;
    ratePrompt: (rating: number) => string;
    ratePromptEmpty: string;
    saveLabel: { on: string; off: string };
    shareLabel: string;
    unlockCta: (price: string) => string;
    openCta: string;
    createCta: string; // tutor-only
}

const student: LastMinuteCopy = {
    headerTitle: "Last Minute",
    heroHeading: "The paper you need.",
    heroSubheading: (cheapest) =>
        cheapest !== null ? `From KSh ${cheapest.toLocaleString()}.` : "",
    heroBody: "One payment. One paper. Read it inside the app.",
    papersCountLabel: (n) => `${n} paper${n === 1 ? "" : "s"}`,
    unlockedLabel: (n) => `${n} unlocked`,
    searchPlaceholder: "Search papers…",
    emptyNoPapers: "No papers live yet.",
    emptyNoMatches: "Nothing matches your filter.",
    clearFilters: "Clear filters",
    footerDisclaimer:
        "Every paper locks automatically when its window ends. No auto-renewal. No download. No sharing — access stays yours alone.",
    tutorBanner: "",
    ratePrompt: (n) => `You rated this ${n} star${n === 1 ? "" : "s"} · tap again to clear`,
    ratePromptEmpty: "Tap a star to rate",
    saveLabel: { on: "Saved", off: "Save" },
    shareLabel: "Share",
    unlockCta: (price) => `Unlock for ${price}`,
    openCta: "Open Paper",
    createCta: "",
};

const tutor: LastMinuteCopy = {
    headerTitle: "Last Minute",
    heroHeading: "The paper your students are using.",
    heroSubheading: (cheapest) =>
        cheapest !== null ? `From KSh ${cheapest.toLocaleString()}.` : "",
    heroBody:
        "One payment. One paper. Review the exact questions your cohort is practising on.",
    papersCountLabel: (n) => `${n} paper${n === 1 ? "" : "s"}`,
    unlockedLabel: (n) => `${n} unlocked`,
    searchPlaceholder: "Search papers to review…",
    emptyNoPapers: "No papers live yet.",
    emptyNoMatches: "Nothing matches your filter.",
    clearFilters: "Clear filters",
    footerDisclaimer:
        "Every paper locks automatically when its window ends. Access is scoped to your account — share the insight, not the file.",
    tutorBanner:
        "You're reviewing as a tutor. Purchase a paper to see exactly what your students see.",
    ratePrompt: (n) => `You rated this ${n} star${n === 1 ? "" : "s"} · tap again to clear`,
    ratePromptEmpty: "Tap a star to rate",
    saveLabel: { on: "Saved", off: "Save" },
    shareLabel: "Share",
    unlockCta: (price) => `Review for ${price}`,
    openCta: "Review Paper",
    createCta: "Create a paper",
};

export function getLastMinuteCopy(mode: LastMinuteMode): LastMinuteCopy {
    return mode === "tutor" ? tutor : student;
}