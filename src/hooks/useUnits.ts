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

const UNITS_CACHE_KEY = "dynamic_units_cache_v2";
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour — ONLINE only
const MIN_FETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Memory cache
let cachedPapers: PaperData[] | null = null;
let cachedAllUnits: Unit[] | null = null;
let cacheTimestamp = 0;
let fetchInProgress = false;
let lastFetchTime = 0;

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

const isOffline = (): boolean =>
    typeof navigator !== "undefined" && navigator.onLine === false;

/**
 * Read units from localStorage.
 * @param ignoreTTL  when true, returns the cache no matter how old it is.
 *                   Used offline and as a last-resort fallback on fetch failure.
 */
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

// Helper to save data to cache
const saveUnitsToCache = (papers: PaperData[], allUnits: Unit[]) => {
    try {
        localStorage.setItem(
            UNITS_CACHE_KEY,
            JSON.stringify({
                papers,
                allUnits,
                timestamp: Date.now(),
            })
        );
        cachedPapers = papers;
        cachedAllUnits = allUnits;
        cacheTimestamp = Date.now();
    } catch (error) {
        console.error("Failed to cache units:", error);
    }
};

// Helper to determine paper properties
const getPaperProperties = (paperNumber: number) => {
    switch (paperNumber) {
        case 1:
            return { color: "amber", icon: "BookOpen", description: "Foundational Nursing Units" };
        case 2:
            return { color: "blue", icon: "BookOpen", description: "Leadership, Research & Community Health" };
        case 3:
            return { color: "purple", icon: "Trophy", description: "International Nursing Standards & RN Prep" };
        case 4:
            return { color: "emerald", icon: "ClipboardCheck", description: "2026 Updated Full-Length Mock Exams" };
        case 5:
            return { color: "rose", icon: "Heart", description: "Medical-Surgical Nursing Units (MD Series)" };
        default:
            return { color: "gray", icon: "BookOpen", description: "Nursing Units" };
    }
};

// Helper to determine level
const getUnitLevel = (unitCode: string, title: string): string => {
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

// Helper to determine paper from unit code
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
        return { paper: "Paper 3: NCLEX Mastery", paperNumber: 3 };
    }
    if (unitCode.startsWith("FP")) {
        return { paper: "Practice Papers", paperNumber: 4 };
    }
    return { paper: "Paper 1", paperNumber: 1 };
};

// Transform raw data into units
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

    // Sort units within each paper
    papersMap.forEach((paper) => {
        paper.units.sort((a, b) => a.code.localeCompare(b.code));
    });

    return { allUnits: allUnitsArray, papersMap };
};

// ---------------------------------------------------------------
// Hook
// ---------------------------------------------------------------

export function useUnits() {
    // ✅ Instant hydration — serve cache no matter how old it is when offline
    const [papers, setPapers] = useState<PaperData[]>(() => {
        if (typeof window === "undefined") return [];
        const cached = getCachedUnits(isOffline());
        if (cached) {
            cachedPapers = cached.papers;
            cachedAllUnits = cached.allUnits;
            cacheTimestamp = Date.now();
            return cached.papers;
        }
        return [];
    });

    const [allUnits, setAllUnits] = useState<Unit[]>(() => {
        if (typeof window === "undefined") return [];
        const cached = getCachedUnits(isOffline());
        return cached ? cached.allUnits : [];
    });

    // ✅ Only show loader if we have nothing to show
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
        // ✅ OFFLINE: skip network entirely, serve cache with TTL ignored
        if (isOffline()) {
            const cached = getCachedUnits(true);
            if (cached && isMounted.current) {
                setPapers(cached.papers);
                setAllUnits(cached.allUnits);
                setError(null);
            }
            if (isMounted.current) setLoading(false);
            return;
        }

        const now = Date.now();

        // Rate limiting (online only)
        if (now - lastFetchTime < MIN_FETCH_INTERVAL && cachedPapers) {
            if (isMounted.current) {
                setPapers(cachedPapers);
                setAllUnits(cachedAllUnits || []);
                setLoading(false);
            }
            return;
        }

        // Prevent concurrent fetches
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
                    question_count
                `
                )
                .eq("is_active", true)
                .order("created_at", { ascending: true });

            if (fetchError) throw fetchError;

            if (!data || data.length === 0) {
                throw new Error("No units found");
            }

            const { allUnits: transformedUnits, papersMap } = transformUnits(data);
            const papersArray = Array.from(papersMap.values()).sort(
                (a, b) => a.paperNumber - b.paperNumber
            );

            if (isMounted.current) {
                setPapers(papersArray);
                setAllUnits(transformedUnits);
                setError(null);
                saveUnitsToCache(papersArray, transformedUnits);
            }
        } catch (err) {
            console.error("Error fetching units:", err);

            // ✅ Fallback: use cache regardless of age
            const cached = getCachedUnits(true);
            if (cached && cached.papers.length > 0) {
                if (isMounted.current) {
                    setPapers(cached.papers);
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

    // Initial fetch
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUnits();
        }, 100);
        return () => clearTimeout(timer);
    }, [fetchUnits]);

    // Smart refresh when tab becomes visible (only if cache is stale AND online)
    useEffect(() => {
        let visibilityTimeout: NodeJS.Timeout;
        const handleVisibilityChange = () => {
            if (!document.hidden && isMounted.current) {
                if (visibilityTimeout) clearTimeout(visibilityTimeout);
                visibilityTimeout = setTimeout(() => {
                    if (isOffline()) return; // don't even try offline
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

    // 🔁 Auto-refresh when connection returns
    useEffect(() => {
        const handleOnline = () => {
            if (isMounted.current) fetchUnits();
        };
        window.addEventListener("online", handleOnline);
        return () => window.removeEventListener("online", handleOnline);
    }, [fetchUnits]);

    // Listen for cache invalidation from other tabs
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === UNITS_CACHE_KEY && e.newValue && isMounted.current) {
                try {
                    const { papers: cachedPapersData, allUnits: cachedUnitsData } =
                        JSON.parse(e.newValue);
                    if (cachedPapersData && cachedUnitsData) {
                        setPapers(cachedPapersData);
                        setAllUnits(cachedUnitsData);
                        cachedPapers = cachedPapersData;
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
        // Only clear cache if online — offline refresh just re-serves cache
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