// hooks/useUnits.ts
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface Unit {
    code: string;
    title: string;
    description?: string | null;
    topic?: string | null;
    course?: string | null;
    block?: string | null;
    unit?: string | null;
    quiz_type?: string | null;
    level: string;
    paper: string;
    paperNumber: number;
    question_count: number;
    is_free: boolean;
    image_url?: string | null;
    image_alt?: string | null;
    accent_color?: string | null;
}

export interface PaperData {
    paper: string;
    paperNumber: number;
    units: Unit[];
    total_questions: number;
    color: string;
    icon: string;
    description: string;
}

const UNITS_CACHE_KEY = "dynamic_units_cache_v7"; // ⬅️ bumped → Help paper added
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour — ONLINE only
const MIN_FETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Memory cache
let cachedPapers: PaperData[] | null = null;
let cachedAllUnits: Unit[] | null = null;
let cacheTimestamp = 0;
let fetchInProgress = false;
let lastFetchTime = 0;

// ---------------------------------------------------------------
// 🆘 STATIC HELP PAPER — edit freely, no DB needed
// Content for each guide lives in src/data/helpGuides.ts
// ---------------------------------------------------------------
const HELP_PAPER: PaperData = {
    paper: "Help & Study Guides",
    paperNumber: 6,
    total_questions: 0,
    color: "yellow",
    icon: "HelpCircle",
    description: "Study guides, exam tips & how to use Medrae",
    units: [
        {
            code: "HELP01",
            title: "How to Study a Unit Effectively",
            description: "A 3-step routine: read → quiz cold → review every wrong answer.",
            level: "Beginner",
            paper: "Help & Study Guides",
            paperNumber: 6,
            question_count: 0,
            is_free: true,
            quiz_type: "guide",
            topic: "Study Skills",
            accent_color: "yellow",
            image_url: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&q=80&auto=format&fit=crop",
            image_alt: "Student studying with books and notes",
            course: null,
            block: null,
            unit: null,
        },
        {
            code: "HELP02",
            title: "How to Use Medrae Quizzes",
            description: "Pick a category, take the quiz, submit, review. That's the loop.",
            level: "Beginner",
            paper: "Help & Study Guides",
            paperNumber: 6,
            question_count: 0,
            is_free: true,
            quiz_type: "guide",
            topic: "Getting Started",
            accent_color: "yellow",
            image_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80&auto=format&fit=crop",
            image_alt: "Person using a laptop to study online",
            course: null,
            block: null,
            unit: null,
        },
        {
            code: "HELP03",
            title: "How to Pass ANY Exam",
            description: "Before, during & after strategies that work for every paper.",
            level: "Intermediate",
            paper: "Help & Study Guides",
            paperNumber: 6,
            question_count: 0,
            is_free: true,
            quiz_type: "guide",
            topic: "Exam Strategy",
            accent_color: "yellow",
            image_url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80&auto=format&fit=crop",
            image_alt: "Student writing an exam at a desk",
            course: null,
            block: null,
            unit: null,
        },
        {
            code: "HELP04",
            title: "How to Pass NCLEX",
            description: "Format, mindset, study routine & day-of strategies for the big one.",
            level: "Intermediate",
            paper: "Help & Study Guides",
            paperNumber: 6,
            question_count: 0,
            is_free: true,
            quiz_type: "guide",
            topic: "NCLEX Prep",
            accent_color: "purple",
            image_url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80&auto=format&fit=crop",
            image_alt: "Nurse in scrubs preparing for NCLEX",
            course: null,
            block: null,
            unit: null,
        },
        {
            code: "HELP05",
            title: "Exam Day Strategy",
            description: "Time per question, when to skip, when to guess. The playbook.",
            level: "Beginner",
            paper: "Help & Study Guides",
            paperNumber: 6,
            question_count: 0,
            is_free: true,
            quiz_type: "guide",
            topic: "Exam Tips",
            accent_color: "yellow",
            image_url: "https://images.unsplash.com/photo-1501139083538-0139583c060f?w=1200&q=80&auto=format&fit=crop",
            image_alt: "Clock and notebook — exam day timing",
            course: null,
            block: null,
            unit: null,
        },
    ],
};
/**
 * Always ensures HELP_PAPER is present in the papers array,
 * even when serving from cache. Removes any duplicate paperNumber 6.
 */
const mergeHelpPaper = (dbPapers: PaperData[]): PaperData[] => {
    const withoutHelp = dbPapers.filter((p) => p.paperNumber !== 6);
    return [...withoutHelp, HELP_PAPER].sort(
        (a, b) => a.paperNumber - b.paperNumber
    );
};

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

const isOffline = (): boolean =>
    typeof navigator !== "undefined" && navigator.onLine === false;

const getCachedUnits = (
    ignoreTTL = false
): { papers: PaperData[]; allUnits: Unit[] } | null => {
    try {
        const cached = localStorage.getItem(UNITS_CACHE_KEY);
        if (!cached) return null;

        const { papers, allUnits, timestamp } = JSON.parse(cached);

        if (!papers || !Array.isArray(papers) || papers.length === 0) return null;

        if (ignoreTTL || Date.now() - timestamp < CACHE_DURATION) {
            return { papers, allUnits };
        }
        return null;
    } catch {
        return null;
    }
};

const saveUnitsToCache = (papers: PaperData[], allUnits: Unit[]) => {
    try {
        const merged = mergeHelpPaper(papers); // ⬅️ ensure Help is in cache
        localStorage.setItem(
            UNITS_CACHE_KEY,
            JSON.stringify({
                papers: merged,
                allUnits,
                timestamp: Date.now(),
            })
        );
        cachedPapers = merged;
        cachedAllUnits = allUnits;
        cacheTimestamp = Date.now();
    } catch (error) {
        console.error("Failed to cache units:", error);
    }
};

const getPaperProperties = (paperNumber: number) => {
    switch (paperNumber) {
        case 1:
            return { color: "amber", icon: "BookOpen", description: "Foundational Nursing Units" };
        case 1.5:
            return { color: "sky", icon: "Sparkles", description: "Take a Break: Nursing Riddles & Brain Teasers" };
        case 2:
            return { color: "blue", icon: "BookOpen", description: "Leadership, Research & Community Health" };
        case 4:
            return { color: "emerald", icon: "ClipboardCheck", description: "2026 Updated Full-Length Mock Exams" };
        case 5:
            return { color: "rose", icon: "Heart", description: "Medical-Surgical Nursing Units (MD Series)" };
        case 6:
            return { color: "yellow", icon: "HelpCircle", description: "Study guides, exam tips & how to use Medrae" };
        case 99:
            return { color: "purple", icon: "Trophy", description: "International Nursing Standards & RN Prep" };
        default:
            return { color: "gray", icon: "BookOpen", description: "Nursing Units" };
    }
};

const getUnitLevel = (unitCode: string, title: string): string => {
    if (unitCode.startsWith("FUN")) {
        return "Just for Fun";
    }
    if (unitCode.startsWith("HELP")) {
        return "Guide";
    }

    const unitCodeNum = parseInt(unitCode.replace(/\D/g, "")) || 0;

    if (unitCode.startsWith("MD")) {
        const mdNum = parseInt(unitCode.replace("MD", "")) || 0;
        if (mdNum <= 2) return "Beginner";
        if (mdNum <= 4) return "Intermediate";
        return "Advanced";
    }

    if (unitCodeNum <= 3 || title?.toLowerCase().includes("beginner")) {
        return "Beginner";
    }
    if (unitCodeNum >= 10 || title?.toLowerCase().includes("advanced")) {
        return "Advanced";
    }
    if (
        title?.toLowerCase().includes("professional") ||
        title?.toLowerCase().includes("expert") ||
        title?.toLowerCase().includes("nclex")
    ) {
        return "Professional";
    }
    if (title?.toLowerCase().includes("foundation")) {
        return "Foundation";
    }

    return "Intermediate";
};

const getPaperFromUnitCode = (
    unitCode: string
): { paper: string; paperNumber: number } => {
    if (unitCode.startsWith("MD")) {
        return { paper: "Paper 1A: Medical-Surgical Nursing", paperNumber: 5 };
    }
    if (unitCode.startsWith("HNX2")) {
        return { paper: "Paper 2", paperNumber: 2 };
    }
    if (unitCode.startsWith("HNX3")) {
        return { paper: "Paper 3: NCLEX Mastery", paperNumber: 99 };
    }
    if (unitCode.startsWith("FP")) {
        return { paper: "Practice Papers", paperNumber: 4 };
    }
    if (unitCode.startsWith("FUN")) {
        return { paper: "Take a Break: Nursing Riddles", paperNumber: 1.5 };
    }
    if (unitCode.startsWith("HELP")) {
        return { paper: "Help & Study Guides", paperNumber: 6 };
    }
    return { paper: "Paper 1", paperNumber: 1 };
};

const transformUnits = (
    quizzes: any[]
): { allUnits: Unit[]; papersMap: Map<number, PaperData> } => {
    const uniqueUnitsMap = new Map<string, Unit>();

    quizzes?.forEach((quiz) => {
        if (quiz.unit_code && !uniqueUnitsMap.has(quiz.unit_code)) {
            const { paper, paperNumber } = getPaperFromUnitCode(quiz.unit_code);
            const level = getUnitLevel(quiz.unit_code, quiz.title);

            uniqueUnitsMap.set(quiz.unit_code, {
                code: quiz.unit_code,
                title: quiz.title || quiz.unit || `Unit ${quiz.unit_code}`,
                description: quiz.description || null,
                topic: quiz.topic || null,
                course: quiz.course || null,
                block: quiz.block || null,
                unit: quiz.unit || null,
                quiz_type: quiz.quiz_type || null,
                level: level,
                paper: paper,
                paperNumber: paperNumber,
                question_count: quiz.question_count || 0,
                is_free: quiz.is_free || false,
                image_url: quiz.image_url || null,
                image_alt: quiz.image_alt || null,
                accent_color: quiz.accent_color || null,
            });
        }
    });

    const allUnitsArray = Array.from(uniqueUnitsMap.values());
    const papersMap = new Map<number, PaperData>();

    allUnitsArray.forEach((unit) => {
        if (!papersMap.has(unit.paperNumber)) {
            const { color, icon, description } = getPaperProperties(unit.paperNumber);
            papersMap.set(unit.paperNumber, {
                paper: unit.paper,
                paperNumber: unit.paperNumber,
                units: [],
                total_questions: 0,
                color: color,
                icon: icon,
                description: description,
            });
        }

        const paperData = papersMap.get(unit.paperNumber)!;
        paperData.units.push(unit);
        paperData.total_questions += unit.question_count;
    });

    papersMap.forEach((paper) => {
        paper.units.sort((a, b) => a.code.localeCompare(b.code));
    });

    return { allUnits: allUnitsArray, papersMap };
};

// ---------------------------------------------------------------
// Hook
// ---------------------------------------------------------------

export function useUnits() {
    const [papers, setPapers] = useState<PaperData[]>(() => {
        if (typeof window === "undefined") return [HELP_PAPER];
        const cached = getCachedUnits(isOffline());
        if (cached) {
            cachedPapers = cached.papers;
            cachedAllUnits = cached.allUnits;
            cacheTimestamp = Date.now();
            return mergeHelpPaper(cached.papers); // ⬅️ ensure Help is present
        }
        return [HELP_PAPER];
    });

    const [allUnits, setAllUnits] = useState<Unit[]>(() => {
        if (typeof window === "undefined") return HELP_PAPER.units;
        const cached = getCachedUnits(isOffline());
        if (cached) return cached.allUnits;
        return HELP_PAPER.units;
    });

    const [loading, setLoading] = useState<boolean>(() => {
        if (typeof window === "undefined") return true;
        return getCachedUnits(isOffline()) === null;
    });

    const [error, setError] = useState<string | null>(null);

    const isMounted = useRef(true);
    const fetchTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    }, []);

    const fetchUnits = useCallback(async () => {
        if (isOffline()) {
            const cached = getCachedUnits(true);
            if (cached && isMounted.current) {
                setPapers(mergeHelpPaper(cached.papers));
                setAllUnits(cached.allUnits);
                setError(null);
            }
            if (isMounted.current) setLoading(false);
            return;
        }

        const now = Date.now();

        if (now - lastFetchTime < MIN_FETCH_INTERVAL && cachedPapers) {
            if (isMounted.current) {
                setPapers(mergeHelpPaper(cachedPapers));
                setAllUnits(cachedAllUnits || []);
                setLoading(false);
            }
            return;
        }

        if (fetchInProgress) return;
        fetchInProgress = true;
        lastFetchTime = now;

        try {
            const { data, error: fetchError } = await supabase
                .from("quizzes")
                .select(
                    `
                    unit_code,
                    title,
                    description,
                    topic,
                    course,
                    block,
                    unit,
                    quiz_type,
                    is_free,
                    question_count,
                    image_url,
                    image_alt,
                    accent_color
                `
                )
                .eq("is_active", true)
                .order("created_at", { ascending: true });

            if (fetchError) throw fetchError;

            if (!data || data.length === 0) {
                throw new Error("No units found");
            }

            const { allUnits: transformedUnits, papersMap } = transformUnits(data);
            const papersArray = mergeHelpPaper(
                Array.from(papersMap.values()).sort(
                    (a, b) => a.paperNumber - b.paperNumber
                )
            );

            if (isMounted.current) {
                setPapers(papersArray);
                setAllUnits(transformedUnits);
                setError(null);
                saveUnitsToCache(papersArray, transformedUnits);
            }
        } catch (err) {
            console.error("Error fetching units:", err);

            const cached = getCachedUnits(true);
            if (cached && cached.papers.length > 0) {
                if (isMounted.current) {
                    setPapers(mergeHelpPaper(cached.papers));
                    setAllUnits(cached.allUnits);
                    setError(null);
                }
            } else {
                if (isMounted.current) {
                    setError(
                        err instanceof Error ? err.message : "Failed to fetch units"
                    );
                }
            }
        } finally {
            if (isMounted.current) setLoading(false);
            fetchInProgress = false;
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUnits();
        }, 100);
        return () => clearTimeout(timer);
    }, [fetchUnits]);

    useEffect(() => {
        let visibilityTimeout: NodeJS.Timeout;
        const handleVisibilityChange = () => {
            if (!document.hidden && isMounted.current) {
                if (visibilityTimeout) clearTimeout(visibilityTimeout);
                visibilityTimeout = setTimeout(() => {
                    if (isOffline()) return;
                    const cached = getCachedUnits();
                    if (!cached || Date.now() - cacheTimestamp > 30 * 60 * 1000) {
                        fetchUnits();
                    }
                }, 500);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            if (visibilityTimeout) clearTimeout(visibilityTimeout);
        };
    }, [fetchUnits]);

    useEffect(() => {
        const handleOnline = () => {
            if (isMounted.current) fetchUnits();
        };
        window.addEventListener("online", handleOnline);
        return () => window.removeEventListener("online", handleOnline);
    }, [fetchUnits]);

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === UNITS_CACHE_KEY && e.newValue && isMounted.current) {
                try {
                    const { papers: cachedPapersData, allUnits: cachedUnitsData } =
                        JSON.parse(e.newValue);
                    if (cachedPapersData && cachedUnitsData) {
                        const merged = mergeHelpPaper(cachedPapersData);
                        setPapers(merged);
                        setAllUnits(cachedUnitsData);
                        cachedPapers = merged;
                        cachedAllUnits = cachedUnitsData;
                        cacheTimestamp = Date.now();
                    }
                } catch (err) {
                    console.error("Failed to parse storage event:", err);
                }
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    const refreshUnits = useCallback(async () => {
        if (!isOffline()) {
            localStorage.removeItem(UNITS_CACHE_KEY);
            cachedPapers = null;
            cachedAllUnits = null;
            cacheTimestamp = 0;
        }
        await fetchUnits();
    }, [fetchUnits]);

    const getUnitsByPaper = useCallback(
        (paperNumber: number) => papers.find((p) => p.paperNumber === paperNumber),
        [papers]
    );

    const getUnitByCode = useCallback(
        (code: string) => allUnits.find((u) => u.code === code),
        [allUnits]
    );

    return {
        papers,
        allUnits,
        loading,
        error,
        refreshUnits,
        getUnitsByPaper,
        getUnitByCode,
    };
}

// ✅ Optional: Lightweight hook for just units count
export function useUnitsCount() {
    const { allUnits, loading } = useUnits();
    return { count: allUnits.length, loading };
}

// ✅ Optional: Hook for free units only
export function useFreeUnits() {
    const { allUnits, loading } = useUnits();
    const freeUnits = allUnits.filter((unit) => unit.is_free);
    return { freeUnits, count: freeUnits.length, loading };
}

// ✅ Optional: Hook for fun/riddle units only (FUN prefix)
export function useFunUnits() {
    const { allUnits, loading } = useUnits();
    const funUnits = allUnits.filter((unit) => unit.code.startsWith("FUN"));
    return { funUnits, count: funUnits.length, loading };
}