import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

// ============================================
// INTERFACE
// ============================================

export type UnitQuestionCount = {
  unit: string;
  unit_code: string;
  count: number;
  description?: string | null;
  course?: string | null;
  block?: string | null;
  topic?: string | null;
  quiz_type?: string | null;
  is_free?: boolean;
};

// ============================================
// CACHE CONFIGURATION
// ============================================

const CACHE_KEY = "unitQuestionCounts_v5_full";
const CACHE_DURATION = 5 * 60 * 1000;
const MIN_FETCH_INTERVAL = 30 * 1000;

let cachedData: UnitQuestionCount[] | null = null;
let fetchInProgress = false;
let lastFetchTime = 0;

// ============================================
// HELPERS
// ============================================

const isOffline = (): boolean =>
  typeof navigator !== "undefined" && navigator.onLine === false;

const getCachedCounts = (ignoreTTL = false): UnitQuestionCount[] | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    if (ignoreTTL || Date.now() - timestamp < CACHE_DURATION) {
      cachedData = data;
      return data;
    }
    return null;
  } catch {
    return null;
  }
};

const saveCountsToCache = (data: UnitQuestionCount[]) => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, timestamp: Date.now() })
    );
    cachedData = data;
  } catch (err) {
    console.error("Cache error:", err);
  }
};

// ✅ shallow equality for one row — used to skip no-op array replacement
function eqRow(a: UnitQuestionCount, b: UnitQuestionCount): boolean {
  return (
    a.unit === b.unit &&
    a.unit_code === b.unit_code &&
    a.count === b.count &&
    a.is_free === b.is_free &&
    a.quiz_type === b.quiz_type
  );
}

function eqList(a: UnitQuestionCount[], b: UnitQuestionCount[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!eqRow(a[i], b[i])) return false;
  }
  return true;
}

// ============================================
// HOOK
// ============================================

export function useUnitQuestionCount() {
  const [data, setData] = useState<UnitQuestionCount[]>(() => {
    const cached = getCachedCounts(isOffline());
    if (cached) {
      cachedData = cached;
      return cached;
    }
    return [];
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  // ✅ Ref mirror for stable getters
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
    setVersion((v) => v + 1);
  }, [data]);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ✅ Only write if list actually changed
  const writeIfChanged = useCallback((next: UnitQuestionCount[]) => {
    setData((prev) => (eqList(prev, next) ? prev : next));
  }, []);

  // ============================================
  // MAIN FETCH
  // ============================================

  const fetchCounts = useCallback(async (force = false) => {
    if (isOffline()) {
      const cached = getCachedCounts(true);
      if (cached && isMounted.current) {
        writeIfChanged(cached);
        setError(null);
      }
      if (isMounted.current) setLoading(false);
      return cached;
    }

    const now = Date.now();

    if (!force && cachedData && cachedData.length > 0) {
      writeIfChanged(cachedData);
      return cachedData;
    }

    if (!force && now - lastFetchTime < MIN_FETCH_INTERVAL && cachedData) {
      writeIfChanged(cachedData);
      return cachedData;
    }

    if (fetchInProgress) {
      return new Promise((resolve) => {
        const checkDone = setInterval(() => {
          if (!fetchInProgress) {
            clearInterval(checkDone);
            resolve(cachedData);
          }
        }, 100);
      });
    }

    fetchInProgress = true;
    lastFetchTime = now;
    setLoading(true);
    setError(null);

    try {
      const { data: quizzes, error } = await supabase
        .from("quizzes")
        .select(
          `
          unit_code,
          title,
          description,
          course,
          block,
          unit,
          topic,
          quiz_type,
          is_free,
          question_count
        `
        )
        .eq("is_active", true)
        .order("unit_code", { ascending: true });

      if (error) throw error;

      const map = new Map<string, UnitQuestionCount>();

      (quizzes || []).forEach((q: any) => {
        if (!q.unit_code) return;
        const key = q.unit_code.trim().toLowerCase();
        const count = q.question_count || 0;

        if (!map.has(key)) {
          map.set(key, {
            unit: q.title || q.unit || q.unit_code,
            unit_code: q.unit_code,
            count: count,
            description: q.description || null,
            course: q.course || null,
            block: q.block || null,
            topic: q.topic || null,
            quiz_type: q.quiz_type || null,
            is_free: q.is_free || false,
          });
        } else {
          const existing = map.get(key)!;
          existing.count += count;
        }
      });

      const result = Array.from(map.values());

      if (isMounted.current) {
        writeIfChanged(result);
        saveCountsToCache(result);
        setError(null);
      }

      return result;
    } catch (err: any) {
      console.error("Error fetching unit counts:", err);

      const cachedFallback = getCachedCounts(true);
      if (cachedFallback && cachedFallback.length > 0) {
        if (isMounted.current) {
          writeIfChanged(cachedFallback);
          setError(null);
        }
        return cachedFallback;
      }

      if (isMounted.current) setError(err.message || "Failed to fetch unit counts");
      return null;
    } finally {
      if (isMounted.current) setLoading(false);
      fetchInProgress = false;
    }
  }, [writeIfChanged]);

  // ============================================
  // INITIAL LOAD
  // ============================================

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCounts();
    }, 50);
    return () => clearTimeout(timer);
  }, [fetchCounts]);

  // ============================================
  // SMART REFRESH ON VISIBILITY CHANGE
  // ============================================

  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (!document.hidden && isMounted.current) {
        if (isOffline()) return;
        clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(() => {
          const cached = getCachedCounts();
          if (!cached) fetchCounts();
        }, 500);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(visibilityTimeout);
    };
  }, [fetchCounts]);

  // ============================================
  // AUTO-REFRESH WHEN CONNECTION RETURNS
  // ============================================

  useEffect(() => {
    const handleOnline = () => {
      if (isMounted.current) fetchCounts(true);
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [fetchCounts]);

  // ============================================
  // CROSS-TAB SYNC
  // ============================================

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CACHE_KEY && e.newValue && isMounted.current) {
        try {
          const { data: newData } = JSON.parse(e.newValue);
          if (newData && newData.length > 0) {
            writeIfChanged(newData);
            cachedData = newData;
          }
        } catch (err) {
          console.error("Failed to parse storage event:", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [writeIfChanged]);

  // ============================================
  // HELPERS — stable identity (read from ref)
  // ============================================

  const incrementCount = useCallback((unitCode: string) => {
    setData((prev) => {
      const updated = prev.map((u) =>
        u.unit_code?.toLowerCase() === unitCode.toLowerCase()
          ? { ...u, count: u.count + 1 }
          : u
      );
      saveCountsToCache(updated);
      return updated;
    });
  }, []);

  const getCountByUnitCode = useCallback(
    (unitCode: string): number => {
      const found = dataRef.current.find(
        (u) => u.unit_code?.toLowerCase() === unitCode?.toLowerCase()
      );
      return found?.count || 0;
    },
    []
  );

  const getCountByUnitName = useCallback(
    (unitName: string): number => {
      const found = dataRef.current.find(
        (u) => u.unit?.toLowerCase() === unitName?.toLowerCase()
      );
      return found?.count || 0;
    },
    []
  );

  const getUnitByCode = useCallback(
    (unitCode: string): UnitQuestionCount | undefined => {
      return dataRef.current.find(
        (u) => u.unit_code?.toLowerCase() === unitCode?.toLowerCase()
      );
    },
    []
  );

  const getUnitsByPaper = useCallback(
    (paperNumber: number): UnitQuestionCount[] => {
      const prefix =
        paperNumber === 1 ? "HNX1" :
          paperNumber === 2 ? "HNX2" :
            paperNumber === 3 ? "HNX3" :
              paperNumber === 4 ? "FP" :
                paperNumber === 5 ? "MD" : "";
      if (!prefix) return [];
      return dataRef.current.filter((item) => item.unit_code?.startsWith(prefix));
    },
    []
  );

  const getUnitsByCategory = useCallback(
    (category: "paper1" | "paper2" | "nclex" | "medical" | "practice"): UnitQuestionCount[] => {
      const rows = dataRef.current;
      switch (category) {
        case "paper1": return rows.filter((item) => item.unit_code?.startsWith("HNX1"));
        case "paper2": return rows.filter((item) => item.unit_code?.startsWith("HNX2"));
        case "nclex": return rows.filter((item) => item.unit_code?.startsWith("HNX3"));
        case "medical": return rows.filter((item) => item.unit_code?.startsWith("MD"));
        case "practice": return rows.filter((item) => item.unit_code?.startsWith("FP"));
        default: return [];
      }
    },
    []
  );

  const getFreeUnits = useCallback((): UnitQuestionCount[] => {
    return dataRef.current.filter((item) => item.is_free === true);
  }, []);

  const getPremiumUnits = useCallback((): UnitQuestionCount[] => {
    return dataRef.current.filter((item) => item.is_free === false);
  }, []);

  const refreshCounts = useCallback(async () => {
    if (!isOffline()) {
      localStorage.removeItem(CACHE_KEY);
      cachedData = null;
    }
    setLoading(true);
    await fetchCounts(true);
  }, [fetchCounts]);

  return {
    data,
    version,           // ✅ NEW
    loading,
    error,
    incrementCount,
    refreshCounts,
    getCountByUnitCode,
    getCountByUnitName,
    getUnitByCode,
    getUnitsByPaper,
    getUnitsByCategory,
    getFreeUnits,
    getPremiumUnits,
  };
}