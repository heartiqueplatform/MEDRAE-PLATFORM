"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Heart, Play, BookOpen, Shuffle, Compass, ChevronRight, ChevronLeft,
  ClipboardCheck, CheckCircle2, Trophy, Zap, Lock, Sparkles,
  Search, RefreshCw, HelpCircle, GraduationCap, Stethoscope,
  FileText, Globe, Info, BookMarked, Layers, Tag, Type, X
} from "lucide-react";
import { Link } from "react-router-dom";
import { useUnitQuestionCount } from "@/hooks/useUnitQuestionCount";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import { GlobalLoader } from "@/components/GlobalLoader";
import { useNavigate } from "react-router-dom";
import { playSound } from "@/lib/soundManager";
import { motion, AnimatePresence } from "framer-motion";
import { TermsButton } from "@/components/ui/TermsButton";
import { useUnits, Unit, PaperData } from "../hooks/useUnits";
import { UnitPics } from "@/components/deco/UnitPics";
import { getCachedPremium, resolveSubscription } from "@/lib/subscription";
import { useQuizEngagement } from "@/hooks/useQuizEngagement";
import { Star, Bookmark, Share2, Flame, Users } from "lucide-react";
import { useHomeRoute } from "@/hooks/useHomeRoute";
// Category Types
type CategoryType = "all" | "paper1" | "paper2" | "practice" | "medical" | "fun" | "nclex" | "help";

// Cache keys and durations
const FREE_UNITS_CACHE_KEY = "freeUnits";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Request deduplication
let freeUnitsFetchInProgress = false;
let lastFreeUnitsFetch = 0;
const MIN_FETCH_INTERVAL = 60 * 60 * 1000; // 1 hour minimum between fetches

const getCachedFreeUnits = () => {
  try {
    const cached = localStorage.getItem(FREE_UNITS_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (offline || Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (e) { }
  return null;
};

const setCachedFreeUnits = (data: any) => {
  try {
    localStorage.setItem(FREE_UNITS_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) { }
};
// ═══════════════════════════════════════════════════════════
// LOCAL MIRROR — survives refresh, no visual change
// ═══════════════════════════════════════════════════════════
const LOCAL_MIRROR_KEY = "quiz_local_mirror_v1";
type LocalMirror = Record<string, { bookmarked?: boolean; rating?: number; difficultyVote?: "easy" | "ok" | "hard" }>;

function readLocalMirror(): LocalMirror {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_MIRROR_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeLocalMirror(patch: LocalMirror) {
  if (typeof window === "undefined") return;
  try {
    const current = readLocalMirror();
    const merged = { ...current };
    for (const [k, v] of Object.entries(patch)) {
      merged[k] = { ...(current[k] ?? {}), ...v };
    }
    localStorage.setItem(LOCAL_MIRROR_KEY, JSON.stringify(merged));
  } catch { /* quota — ignore */ }
}

// Popup component
const PopupMessage = ({ message, onClose, isError = false }: { message: string; onClose: () => void; isError?: boolean }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border-2 backdrop-blur-md
        ${isError
          ? 'bg-red-50/90 border-red-200 text-red-800'
          : 'bg-white/90 border-blue-100 text-blue-900 dark:bg-gray-900/90 dark:border-blue-900/50 dark:text-blue-100'
        }`}
    >
      <div className={`p-2 rounded-xl ${isError ? 'bg-red-100' : 'bg-blue-50 dark:bg-blue-900/30'}`}>
        {isError ? (
          <HelpCircle className="w-5 h-5 text-red-600" />
        ) : (
          <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
        )}
      </div>
      <div className="flex flex-col">
        <p className="text-sm font-bold leading-tight">
          {isError ? "Oopsie!" : "All Synced!"}
        </p>
        <p className="text-xs font-medium opacity-80 mt-0.5">
          {message}
        </p>
      </div>
      <button
        onClick={onClose}
        className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
      >
        <ChevronRight className="w-4 h-4 rotate-90 opacity-50" />
      </button>
      <div className={`absolute -top-1 -left-1 w-3 h-3 rounded-full ${isError ? 'bg-red-400' : 'bg-blue-400'} animate-ping opacity-40`} />
    </motion.div>
  );
};

const hasStartedQuiz = (unitCode: string) => {
  const startedUnits = JSON.parse(localStorage.getItem("startedUnits") || "[]");
  return startedUnits.includes(unitCode);
};

const markUnitStarted = (unitCode: string) => {
  const startedUnits = JSON.parse(localStorage.getItem("startedUnits") || "[]");
  if (!startedUnits.includes(unitCode)) {
    startedUnits.push(unitCode);
    localStorage.setItem("startedUnits", JSON.stringify(startedUnits));
  }
};

const getLevelVariant = (level: string) => {
  switch (level.toLowerCase()) {
    case "beginner":
      return "default";
    case "intermediate":
      return "secondary";
    case "advanced":
      return "destructive";
    case "foundation":
      return "outline";
    default:
      return "outline";
  }
};

const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case "Trophy":
      return Trophy;
    case "ClipboardCheck":
      return ClipboardCheck;
    case "Heart":
      return Heart;
    default:
      return BookOpen;
  }
};

// Helper to get quiz type color
const getQuizTypeColor = (type: string) => {
  switch (type?.toLowerCase()) {
    case "mcq":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "short":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    case "assignment":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
    case "riddle":
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300";
    case "guide":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
};

/* Accent gradient fallback — used when a unit has no image */
const ACCENT_GRADIENTS: Record<string, string> = {
  blue: "from-blue-500 to-blue-700",
  emerald: "from-emerald-500 to-emerald-700",
  rose: "from-rose-500 to-rose-700",
  amber: "from-amber-500 to-amber-700",
  purple: "from-purple-500 to-purple-700",
  gray: "from-gray-600 to-gray-800",
  slate: "from-slate-500 to-slate-700",
  indigo: "from-indigo-500 to-indigo-700",
  teal: "from-teal-500 to-teal-700",
  cyan: "from-cyan-500 to-cyan-700",
  sky: "from-sky-400 to-cyan-600",
  yellow: "from-yellow-400 to-amber-600",
};

const getAccentGradient = (accent?: string | null) =>
  ACCENT_GRADIENTS[(accent ?? "blue").toLowerCase()] ?? ACCENT_GRADIENTS.blue;
// ═══════════════════════════════════════════════════════════
// BUBBLE POP — tiny particle burst on tap. Auto-removes.
// ═══════════════════════════════════════════════════════════
function BubblePop({ color = "#F59E0B", emoji }: { color?: string; emoji?: string }) {
  const particles = Array.from({ length: 6 });
  return (
    <span className="pointer-events-none absolute inset-0 overflow-visible z-20">
      {particles.map((_, i) => {
        const angle = (i / particles.length) * Math.PI * 2;
        const dist = 18 + (i % 3) * 4;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        return (
          <motion.span
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, x, y, scale: 1.3 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] leading-none"
            style={{ color }}
          >
            {emoji ?? "•"}
          </motion.span>
        );
      })}
      <motion.span
        initial={{ opacity: 0.5, scale: 0.4 }}
        animate={{ opacity: 0, scale: 1.5 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full"
        style={{ background: color, opacity: 0.35 }}
      />
    </span>
  );
}

/* ============================================================
   CATEGORY STORY TABS — Facebook-style
   ============================================================ */
const CATEGORY_STORIES: {
  id: CategoryType;
  label: string;
  avatar: string;
  ring: string;
  icon: React.ElementType;
}[] = [
    { id: "all", label: "All Units", avatar: "/pwaa-512x512.png", ring: "ring-gray-500", icon: BookOpen },
    { id: "paper1", label: "Paper 1", avatar: "/indexbackground5.jpg", ring: "ring-amber-500", icon: GraduationCap },
    { id: "paper2", label: "Paper 2", avatar: "/background05.jpg", ring: "ring-blue-500", icon: FileText },
    { id: "practice", label: "Practice", avatar: "/high4.png", ring: "ring-emerald-500", icon: ClipboardCheck },
    { id: "medical", label: "Medical", avatar: "/pwaa-512x512.png", ring: "ring-rose-500", icon: Stethoscope },
    { id: "fun", label: "Fun", avatar: "/pwaa-512x512.png", ring: "ring-sky-500", icon: Sparkles },
    { id: "nclex", label: "NCLEX", avatar: "/pwaa-512x512.png", ring: "ring-purple-500", icon: Globe },
    { id: "help", label: "Help", avatar: "/pwaa-512x512.png", ring: "ring-yellow-500", icon: HelpCircle },
  ];

const CATEGORY_DESCRIPTIONS: Record<CategoryType, string> = {
  all: "View all available quizzes",
  paper1: "Core Nursing Fundamentals & Foundation Units",
  paper2: "Leadership, Research & Community Health",
  practice: "Full-length mock exams for readiness evaluation",
  medical: "Condition-specific quizzes - Hypertension, Diabetes & more",
  fun: "Take a break with nursing riddles & brain teasers",
  nclex: "International nursing standards (Coming Soon)",
  help: "Study guides, exam tips & how to make the most of each unit",
};

export function MedraeQuizzes() {
  const user = useUser();
  const [isPremium, setIsPremium] = useState<boolean>(
    () => getCachedPremium(user?.id) ?? false
  );
  // Always consider "checked" so the page never blocks
  const [subscriptionChecked, setSubscriptionChecked] = useState(true);
  const navigate = useNavigate();
  // Scroll the inner content container (not window) — used by back button
  const home = useHomeRoute();
  const [showHelp, setShowHelp] = React.useState(false);
  const [freeUnits, setFreeUnits] = useState<string[]>(() => getCachedFreeUnits() || []);
  const [activeCategory, setActiveCategory] = useState<CategoryType>("all");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const { papers, loading: unitsLoading, refreshUnits } = useUnits();
  const { data: unitCounts, loading: countsLoading, refreshCounts, version: countsVersion } = useUnitQuestionCount();
  const [refreshing, setRefreshing] = useState(false);
  const [popup, setPopup] = useState<string | null>(null);
  const [popupError, setPopupError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const isMounted = useRef(true);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const handleBack = useCallback(() => {
    playSound("tap");
    if (navigator.vibrate) navigator.vibrate(20);

    // Soft back: clear filters first
    if (searchTerm || activeCategory !== "all") {
      setSearchTerm("");
      setActiveCategory("all");
      contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Hard back → home
    navigate(home, { replace: true })
  }, [navigate, searchTerm, activeCategory]);
  const {
    version: engagementVersion,
    hydrateStats, hydrateUserState,
    reportStart, rateQuiz, toggleBookmark, reportShare, voteDifficulty,
    getStats, getUserState,
  } = useQuizEngagement();
  // ═══════════════════════════════════════════════════════════
  // INSTANT MIRROR — persists taps across refresh, before network
  // ═══════════════════════════════════════════════════════════
  const [mirror, setMirror] = useState<LocalMirror>(() => readLocalMirror());
  const [bubbleKey, setBubbleKey] = useState<string | null>(null);
  const [difficultyBubble, setDifficultyBubble] = useState<string | null>(null);

  useEffect(() => {
    if (!difficultyBubble) return;
    const t = setTimeout(() => setDifficultyBubble(null), 700);
    return () => clearTimeout(t);
  }, [difficultyBubble]);
  useEffect(() => {
    if (!bubbleKey) return;
    const t = setTimeout(() => setBubbleKey(null), 600);
    return () => clearTimeout(t);
  }, [bubbleKey]);

  const patchMirror = useCallback((id: string, patch: LocalMirror[string]) => {
    setMirror((prev) => {
      const next = { ...prev, [id]: { ...(prev[id] ?? {}), ...patch } };
      writeLocalMirror(next);
      return next;
    });
  }, []);
  const withLocal = useCallback((id: string) => {
    const m = mirror[id] ?? {};
    const server = getUserState(id);
    return {
      bookmarked: m.bookmarked ?? server.bookmarked,
      rating: m.rating ?? server.rating,
      difficultyVote: m.difficultyVote ?? server.difficultyVote,
      startedAt: server.startedAt,
      completedAt: server.completedAt,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mirror, getUserState, engagementVersion]);

  // Hydrate engagement data whenever the paper list changes
  // Hydrate engagement data whenever the paper list changes
  const allQuizIds = React.useMemo(() => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const ids: string[] = [];
    papers.forEach((p) =>
      p.units.forEach((u: any) => {
        if (u.id && UUID_RE.test(u.id)) ids.push(u.id);
      })
    );
    return ids;
  }, [papers]);
  useEffect(() => {
    if (allQuizIds.length === 0) return;
    hydrateStats(allQuizIds);
    hydrateUserState(allQuizIds);
  }, [allQuizIds, hydrateStats, hydrateUserState]);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchSubscription = useCallback(async () => {
    if (!user) return;

    const cached = getCachedPremium(user.id);
    if (cached !== null && isMounted.current) {
      setIsPremium(cached);
      setSubscriptionChecked(true);
    }

    try {
      const snap = await resolveSubscription(user.id);
      if (isMounted.current) {
        setIsPremium(snap.isPremium);
        setSubscriptionChecked(true);
      }
    } catch (err) {
      console.log("Offline mode: using cached subscription", err);
    }
  }, [user]);

  const fetchFreeUnits = useCallback(async () => {
    const cached = getCachedFreeUnits();
    if (cached !== null) {
      if (isMounted.current) {
        setFreeUnits(cached);
      }
      return;
    }

    const now = Date.now();
    if (now - lastFreeUnitsFetch < MIN_FETCH_INTERVAL) return;
    if (freeUnitsFetchInProgress) return;

    freeUnitsFetchInProgress = true;
    lastFreeUnitsFetch = now;

    try {
      const { data } = await supabase
        .from("quizzes")
        .select("unit_code, is_free")
        .eq("is_active", true);

      if (data && isMounted.current) {
        const free = data.filter((q) => q.is_free).map((q) => q.unit_code?.trim());
        setFreeUnits(free);
        setCachedFreeUnits(free);
      }
    } catch (err) {
      console.log("Offline mode: using cached free units", err);
      const cachedFree = getCachedFreeUnits();
      if (cachedFree && isMounted.current) {
        setFreeUnits(cachedFree);
      }
    } finally {
      freeUnitsFetchInProgress = false;
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
    fetchFreeUnits();
  }, [fetchSubscription, fetchFreeUnits]);

  useEffect(() => {
    if (!user) return;
    const onOnline = () => {
      resolveSubscription(user.id, { force: true }).then((snap) => {
        if (isMounted.current) setIsPremium(snap.isPremium);
      });
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [user]);

  const getQuestionCount = (code: string) => {
    const unit = unitCounts?.find((u) => u.unit_code?.trim() === code.trim());
    return unit ? unit.count : 0;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPopupError(false);
    try {
      localStorage.removeItem(FREE_UNITS_CACHE_KEY);

      await Promise.all([
        refreshCounts(),
        refreshUnits(),
        user
          ? resolveSubscription(user.id, { force: true }).then((snap) => {
            if (isMounted.current) {
              setIsPremium(snap.isPremium);
              setSubscriptionChecked(true);
            }
          })
          : Promise.resolve(),
        fetchFreeUnits(),
      ]);
      setPopup("All units and question counts have been refreshed successfully!");
    } catch (err) {
      setPopupError(true);
      setPopup("Unable to refresh units. Please check your connection.");
    }
    setRefreshing(false);
  };

  const getFilteredUnitsForPaper = (units: Unit[], paperNumber: number) => {
    let filtered = units;

    if (searchTerm) {
      filtered = filtered.filter(unit =>
        (unit.title ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (unit.description ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (unit.topic ?? "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (activeCategory !== "all") {
      if (activeCategory === "paper1" && paperNumber !== 1 && paperNumber !== 5) return [];
      if (activeCategory === "paper2" && paperNumber !== 2) return [];
      if (activeCategory === "practice" && paperNumber !== 4) return [];
      if (activeCategory === "nclex" && paperNumber !== 99) return [];
      if (activeCategory === "medical" && paperNumber !== 5) return [];
      if (activeCategory === "fun" && paperNumber !== 1.5) return [];
      if (activeCategory === "help" && paperNumber !== 6) return [];
    }

    return filtered;
  };

  const shouldShowPaper = (paper: PaperData) => {
    const filteredUnits = getFilteredUnitsForPaper(paper.units, paper.paperNumber);
    return filteredUnits.length > 0;
  };

  const getRandomUnit = () => {
    let allAvailableUnits = papers.flatMap(p => p.units);

    allAvailableUnits = allAvailableUnits.filter(unit => {
      if (activeCategory === "paper1") return unit.paperNumber === 1 || unit.paperNumber === 5;
      if (activeCategory === "paper2") return unit.paperNumber === 2;
      if (activeCategory === "practice") return unit.paperNumber === 4;
      if (activeCategory === "nclex") return unit.paperNumber === 99;
      if (activeCategory === "medical") return unit.paperNumber === 5;
      if (activeCategory === "fun") return unit.paperNumber === 1.5;
      if (activeCategory === "help") return unit.paperNumber === 6;
      return true;
    });

    if (allAvailableUnits.length === 0) return null;
    return allAvailableUnits[Math.floor(Math.random() * allAvailableUnits.length)];
  };

  const getRecommendedUnit = () => {
    const pastUnits = JSON.parse(localStorage.getItem("submittedUnits") || "[]");
    let allAvailableUnits = papers.flatMap(p => p.units);

    allAvailableUnits = allAvailableUnits.filter(unit => {
      if (activeCategory === "paper1") return unit.paperNumber === 1 || unit.paperNumber === 5;
      if (activeCategory === "paper2") return unit.paperNumber === 2;
      if (activeCategory === "practice") return unit.paperNumber === 4;
      if (activeCategory === "nclex") return unit.paperNumber === 99;
      if (activeCategory === "medical") return unit.paperNumber === 5;
      if (activeCategory === "fun") return unit.paperNumber === 1.5;
      if (activeCategory === "help") return unit.paperNumber === 6;
      return true;
    });

    if (pastUnits.length > 0) {
      const notCompleted = allAvailableUnits.find(u => !pastUnits.includes(u.code));
      if (notCompleted) return notCompleted;
    }
    return allAvailableUnits[Math.floor(Math.random() * allAvailableUnits.length)];
  };

  // Only show skeleton when we truly have NOTHING to display.
  // Once papers has ANY data (from cache), render the cards immediately.
  // Question counts can update in the background without blocking the page.
  const isLoading = papers.length === 0;
  const toggleDescription = (unitCode: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [unitCode]: !prev[unitCode]
    }));
  };


  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden">
      {/* Sticky top bar with back arrow — full-screen chrome */}
      <header className="flex-shrink-0 w-full flex items-center gap-3 px-3 sm:px-6 py-2.5 sm:py-3
    border-b border-gray-100 dark:border-gray-800
    bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80
    z-30 safe-top">
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="flex items-center justify-center h-10 w-10 rounded-full
        bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
        active:scale-95 transition-all touch-manipulation"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white truncate">
          Medrae Nursing Quizzes
        </h1>
      </header>

      {/* Internally-scrolling content — no visible browser scrollbar */}
      <div
        ref={contentRef}
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden
        custom-scrollbar overscroll-contain
        px-0 sm:px-6 md:px-4 lg:px-6"
      >
        <div className="w-full max-w-full space-y-2 pb-24 safe-bottom">
          <AnimatePresence>
            {popup && (
              <PopupMessage
                message={popup}
                onClose={() => setPopup(null)}
                isError={popupError}
              />
            )}
          </AnimatePresence>

          {/* HERO HEADER CARD */}
          <Card className="relative overflow-hidden md:shadow-xl md:shadow-blue-500/5 transition-all rounded-none md:rounded-xl border-0 bg-transparent dark:bg-transparent border-b border-gray-100 dark:border-gray-800 md:border-b-0">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-48 md:w-64 h-48 md:h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <CardContent className="relative space-y-3 md:space-y-4 px-0 md:px-6 pb-4 md:pb-6">

              {/* FACEBOOK-STYLE STORY TABS */}
              <div className="relative">
                <div className="flex overflow-x-auto scrollbar-hide gap-3 md:gap-4 pb-2 pt-1
                  -mx-0 px-4 md:mx-0 md:px-0
                  sm:flex-wrap sm:justify-center sm:overflow-visible">
                  {CATEGORY_STORIES.map((cat) => {
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          playSound("tap");
                          setActiveCategory(cat.id);
                        }}
                        className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[68px] md:w-[76px]
                          focus:outline-none group"
                      >
                        <div
                          className={`relative rounded-full p-[2.5px] transition-all duration-200
                            ${isActive
                              ? `bg-foreground ring-2 ring-offset-2 ring-offset-background ${cat.ring}`
                              : 'bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600'
                            }`}
                        >
                          <div className="rounded-full p-[2px] bg-background">
                            {cat.id === "help" ? (
                              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                                <HelpCircle className="w-7 h-7 md:w-8 md:h-8 text-yellow-600 dark:text-yellow-400" />
                              </div>
                            ) : (
                              <img
                                src={cat.avatar}
                                alt={cat.label}
                                className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover"
                              />
                            )}
                          </div>
                          {isActive && (
                            <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background ${cat.ring.replace('ring-', 'bg-')}`} />
                          )}
                        </div>

                        <span
                          className={`text-[10px] md:text-[11px] font-semibold leading-tight text-center truncate w-full
                            ${isActive
                              ? 'text-foreground'
                              : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'
                            }`}
                        >
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {activeCategory !== "all" && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 md:mt-3 text-center px-4 md:px-0"
                  >
                    <p className="text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400">
                      {CATEGORY_DESCRIPTIONS[activeCategory]}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* SEARCH BAR */}
              <div className="relative w-full group px-4 md:px-0">
                <div className="relative w-full group">
                  <input
                    type="text"
                    placeholder="Search units etc..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-11 md:h-14 pl-9 md:pl-12 pr-20 md:pr-28 rounded-lg md:rounded-2xl bg-gray-100 dark:bg-gray-900 border-2 border-transparent text-xs md:text-base text-gray-900 dark:text-white placeholder-gray-400 font-medium focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none shadow-inner"
                    autoComplete="off"
                  />
                  <div className="absolute left-6 md:left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-focus-within:scale-110">
                    <Search className="w-3.5 h-3.5 md:w-5 md:h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <div className="absolute right-5 md:right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 md:gap-1">
                    <button
                      onClick={() => setShowHelp(!showHelp)}
                      className={`p-1 md:p-1.5 rounded-lg transition-colors ${showHelp ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:bg-gray-200'}`}
                    >
                      <HelpCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                    <div className="w-px h-4 md:h-5 bg-gray-300 dark:bg-gray-700" />
                    <button
                      onClick={() => {
                        const randomUnit = getRandomUnit();
                        if (randomUnit) navigate(`/quiz?unit=${encodeURIComponent(randomUnit.title)}`);
                      }}
                      className="p-1 md:p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-800 transition-all"
                    >
                      <Shuffle className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const recommendedUnit = getRecommendedUnit();
                        if (recommendedUnit) navigate(`/quiz?unit=${encodeURIComponent(recommendedUnit.title)}`);
                      }}
                      className="p-1 md:p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-800 transition-all"
                    >
                      <Compass className="w-3.5 h-3.5 md:w-5 md:h-5" />
                    </button>
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="p-1 md:p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-800 transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {showHelp && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full right-4 md:right-0 mb-2 md:mb-3 w-64 md:w-72 p-2.5 md:p-3 bg-white dark:bg-gray-800 rounded-lg md:rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50"
                      >
                        <div className="space-y-2 md:space-y-3 text-[10px] md:text-xs">
                          <div className="flex gap-2 md:gap-3">
                            <Shuffle className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500 shrink-0" />
                            <p className="text-gray-600 dark:text-gray-300"><span className="font-bold text-gray-900 dark:text-white">Random:</span> Picks a surprise unit.</p>
                          </div>
                          <div className="flex gap-2 md:gap-3">
                            <Compass className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500 shrink-0" />
                            <p className="text-gray-600 dark:text-gray-300"><span className="font-bold text-gray-900 dark:text-white">Recommend:</span> Units you haven't completed.</p>
                          </div>
                          <div className="flex gap-2 md:gap-3">
                            <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-500 shrink-0" />
                            <p className="text-gray-600 dark:text-gray-300"><span className="font-bold text-gray-900 dark:text-white">Refresh:</span> Syncs latest units.</p>
                          </div>
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-1.5 md:pt-2 mt-1">
                            <p className="text-gray-500 text-[9px] md:text-[10px]"> Use tabs above to filter by category</p>
                          </div>
                        </div>
                        <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 rotate-45"></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </CardContent>

            {/* Dynamic Papers Rendering */}
            {isLoading ? (
              <div className="space-y-4 px-2 sm:px-0">
                <div className="flex items-end justify-between">
                  <div className="h-12 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                  <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map(j => (
                    <div
                      key={j}
                      className="rounded-xl overflow-hidden bg-white dark:bg-muted/70 shadow-sm animate-pulse"
                    >
                      <div className="h-60 sm:h-64 w-full bg-gray-200 dark:bg-gray-800" />
                      <div className="p-4 space-y-3">
                        <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                        <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded-lg" />
                        <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                        <div className="flex gap-2 pt-2">
                          <div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded-full" />
                          <div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
                        </div>
                        <div className="h-12 w-full bg-gray-200 dark:bg-gray-800 rounded-2xl mt-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {papers.map(paper => {
                  const filteredUnits = getFilteredUnitsForPaper(paper.units, paper.paperNumber);
                  if (!shouldShowPaper(paper)) return null;

                  let headerDescription = paper.description;
                  if (paper.paperNumber === 1) {
                    headerDescription = "Most frequently tested foundational nursing units";
                  } else if (paper.paperNumber === 1.5) {
                    headerDescription = "Take a break with nursing riddles & brain teasers";
                  } else if (paper.paperNumber === 2) {
                    headerDescription = "Leadership, research methodology & community health";
                  } else if (paper.paperNumber === 4) {
                    headerDescription = "Mixed questions for knowledge & readiness evaluation";
                  } else if (paper.paperNumber === 5) {
                    headerDescription = "Condition-specific quizzes - Jump directly to any medical condition";
                  } else if (paper.paperNumber === 6) {
                    headerDescription = "Study guides, exam tips & how to make the most of each unit";
                  } else if (paper.paperNumber === 99) {
                    headerDescription = "International nursing standards & RN preparation (Team working on it)";
                  }

                  return (
                    <div key={paper.paperNumber} className="space-y-3 px-[4px] md:px-0">
                      {/* PAPER HEADER */}
                      <div className="flex items-center justify-between gap-3 mt-5 md:mt-6 pb-2 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-1.5 h-8 md:h-10 rounded-full bg-${paper.color}-500 flex-shrink-0`} />
                          <div className="min-w-0">
                            <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white leading-tight truncate">
                              {paper.paper}
                            </h2>
                            <p className="text-[11px] md:text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                              {headerDescription}
                            </p>
                          </div>
                        </div>
                        <div className="flex-shrink-0 px-2.5 md:px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                          <span className="text-[10px] md:text-xs font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {paper.total_questions} Questions
                          </span>
                        </div>
                      </div>

                      {/* GRID */}
                      <div className="grid gap-[8px] sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 w-full">
                        {filteredUnits.map((unit, index) => {
                          const questionCount = getQuestionCount(unit.code);
                          const isUnitFree = freeUnits.includes((unit.code ?? "").trim()) || unit.is_free;
                          const hasStarted = hasStartedQuiz(unit.code);
                          const isExpanded = expandedDescriptions[unit.code] || false;
                          const isHelpUnit = paper.paperNumber === 6;
                          const stats = unit.id ? getStats(unit.id) : null;
                          const myState = unit.id ? withLocal(unit.id) : null;
                          const isHot = (stats?.recentStarts24h ?? 0) >= 10;
                          return (
                            <React.Fragment key={unit.code}>
                              <Card
                                className={`group relative overflow-hidden transition-all duration-300 rounded-xl sm:rounded-xl border-0 hover:border-${paper.color}-400 dark:hover:border-${paper.color}-500/50 bg-white dark:bg-muted/70 shadow-sm hover:shadow-xl cursor-pointer p-0`}

                                onClick={() => setSelectedUnit(unit)}
                              >
                                <div className="relative h-60 sm:h-64 w-full overflow-hidden">
                                  {unit.image_url ? (
                                    <img
                                      src={unit.image_url}
                                      alt={unit.image_alt ?? unit.title}
                                      loading="lazy"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                        e.currentTarget.parentElement?.classList.add(
                                          "bg-gradient-to-br",
                                          "from-blue-500",
                                          "to-blue-700"
                                        );
                                      }}
                                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                  ) : (
                                    <div className={`h-full w-full bg-gradient-to-br ${getAccentGradient(unit.accent_color ?? paper.color)} flex items-center justify-center`}>
                                      {isHelpUnit ? (
                                        <HelpCircle className="w-12 h-12 text-white/60" />
                                      ) : (
                                        <BookOpen className="w-12 h-12 text-white/60" />
                                      )}
                                    </div>
                                  )}

                                  {paper.paperNumber === 4 && (
                                    <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
                                      NEW
                                    </div>
                                  )}

                                  {paper.paperNumber === 1.5 && (
                                    <div className="absolute top-3 left-3 bg-sky-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                                      <Sparkles className="w-3 h-3" /> FUN
                                    </div>
                                  )}

                                  {isHelpUnit && (
                                    <div className="absolute top-3 left-3 bg-yellow-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                                      <HelpCircle className="w-3 h-3" /> GUIDE
                                    </div>
                                  )}

                                  <div className="absolute top-3 right-3">
                                    {isHelpUnit ? (
                                      <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-700 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg shadow">
                                        <BookOpen className="w-3 h-3" /> READ
                                      </div>
                                    ) : isPremium ? (
                                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg shadow">
                                        <CheckCircle2 className="w-3 h-3" /> UNLOCKED
                                      </div>
                                    ) : isUnitFree ? (
                                      <div className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg shadow">
                                        <Sparkles className="w-3 h-3" /> FREE
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg shadow">
                                        <Lock className="w-3 h-3" /> PREMIUM
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <CardHeader className="pb-2 pt-3 px-4">
                                  {/* Engagement stats row */}
                                  {/* Engagement stats row — tappable badges with bubble pops */}
                                  <div className="flex items-center gap-2 flex-wrap mb-2 min-h-[20px]">
                                    {stats && stats.ratingCount > 0 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!unit.id) return;
                                          setBubbleKey(`bd:${unit.code}:rating`);
                                          if (navigator.vibrate) navigator.vibrate(15);
                                          // small delay so user sees the bubble before modal opens
                                          setTimeout(() => setSelectedUnit(unit), 220);
                                        }}
                                        className="relative inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 px-1.5 py-0.5 -mx-1.5 -my-0.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/30 active:scale-95 transition-all touch-manipulation"
                                        title={`${stats.ratingAvg.toFixed(1)} average · ${stats.ratingCount} ${stats.ratingCount === 1 ? "rating" : "ratings"}`}
                                        aria-label={`Rated ${stats.ratingAvg.toFixed(1)} from ${stats.ratingCount} users. Tap to rate.`}
                                      >
                                        {bubbleKey === `bd:${unit.code}:rating` && (
                                          <BubblePop color="#F59E0B" emoji="⭐" />
                                        )}
                                        <Star size={11} fill="currentColor" className="relative z-10" />
                                        <span className="relative z-10">{stats.ratingAvg.toFixed(1)}</span>
                                        <span className="text-gray-400 font-medium relative z-10">
                                          ({stats.ratingCount})
                                        </span>
                                      </button>
                                    )}
                                    {stats && stats.startCount > 0 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!unit.id) return;
                                          setBubbleKey(`bd:${unit.code}:starts`);
                                          if (navigator.vibrate) navigator.vibrate(15);
                                        }}
                                        className="relative inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 px-1.5 py-0.5 -mx-1.5 -my-0.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 active:scale-95 transition-all touch-manipulation"
                                        title={`${stats.startCount} students have started this`}
                                        aria-label={`${stats.startCount} students started. Tap for info.`}
                                      >
                                        {bubbleKey === `bd:${unit.code}:starts` && (
                                          <BubblePop color="#3B82F6" emoji="👥" />
                                        )}
                                        <Users size={11} className="relative z-10" />
                                        <span className="relative z-10">
                                          {stats.startCount >= 1000
                                            ? `${(stats.startCount / 1000).toFixed(1)}K`
                                            : stats.startCount}{" "}
                                          started
                                        </span>
                                      </button>
                                    )}
                                    {isHot && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!unit.id) return;
                                          setBubbleKey(`bd:${unit.code}:hot`);
                                          if (navigator.vibrate) navigator.vibrate(15);
                                        }}
                                        className="relative inline-flex items-center gap-0.5 text-[10px]   text-orange-600 dark:text-orange-400 px-1.5 py-0.5 -mx-1.5 -my-0.5 rounded-md hover:bg-orange-50 dark:hover:bg-orange-950/30 active:scale-95 transition-all touch-manipulation"
                                        title={`${stats?.recentStarts24h ?? 0} students started this in the last 24h`}
                                        aria-label="Trending hot right now"
                                      >
                                        {bubbleKey === `bd:${unit.code}:hot` && (
                                          <BubblePop color="#EA580C" emoji="🔥" />
                                        )}
                                        <Flame size={11} className="relative z-10" />
                                        <span className="relative z-10">HOT</span>
                                      </button>
                                    )}
                                  </div>
                                  <CardTitle className="text-lg font-bold leading-tight text-gray-900 dark:text-gray-100 min-h-[3rem] line-clamp-2">
                                    {unit.title}
                                  </CardTitle>
                                </CardHeader>

                                <CardContent>
                                  <div className="flex flex-col gap-3">
                                    {unit.description && (
                                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2">
                                        {unit.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {!isHelpUnit && (
                                        <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-none font-bold">
                                          {questionCount} Questions
                                        </Badge>
                                      )}
                                      {unit.quiz_type && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getQuizTypeColor(unit.quiz_type)}`}>
                                          {unit.quiz_type.toUpperCase()}
                                        </span>
                                      )}
                                      <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-none font-bold text-[8px] px-1.5 py-0 leading-none h-4">
                                        {unit.code}
                                      </Badge>
                                      <Badge variant={getLevelVariant(unit.level)} className="font-bold border-none">
                                        {unit.level}
                                      </Badge>
                                    </div>

                                    {isHelpUnit ? (
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          playSound("tap");
                                          setSelectedUnit(unit);
                                        }}
                                        className="w-full h-12 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white"
                                      >
                                        <BookOpen className="h-4 w-4" />
                                        Read Guide
                                      </Button>
                                    ) : (isPremium || isUnitFree) ? (
                                      <Link
                                        to={`/quiz?unit=${encodeURIComponent(unit.title)}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markUnitStarted(unit.code);
                                          playSound("start");
                                          if (navigator.vibrate) navigator.vibrate(50);
                                          // ✅ report the start
                                          if (unit.id) reportStart(unit.id);
                                        }}
                                        className="block w-full"
                                      >
                                        <Button
                                          className={`w-full h-12 rounded-2xl font-bold transition-all flex items-center justify-center gap-2
                                          ${hasStarted
                                              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 dark:shadow-none"
                                              : paper.paperNumber === 99
                                                ? "bg-purple-600 hover:bg-purple-700 text-white"
                                                : paper.paperNumber === 4
                                                  ? "bg-gray-200 dark:bg-gray-900 text-black dark:text-white hover:opacity-90"
                                                  : paper.paperNumber === 2
                                                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                                                    : paper.paperNumber === 5
                                                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                                                      : paper.paperNumber === 1.5
                                                        ? "bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-200 dark:shadow-none"
                                                        : "bg-gray-200 dark:bg-gray-900 text-black dark:text-white hover:opacity-90"
                                            }`}
                                        >
                                          {hasStarted ? (
                                            <>
                                              <Play className="h-4 w-4 fill-current" />
                                              {paper.paperNumber === 4
                                                ? "Continue Mock"
                                                : paper.paperNumber === 99
                                                  ? "Resume Mastery"
                                                  : paper.paperNumber === 5
                                                    ? "Continue Practice"
                                                    : paper.paperNumber === 1.5
                                                      ? "Continue Riddles"
                                                      : "Continue Practicing"}
                                            </>
                                          ) : (
                                            <>
                                              {paper.paperNumber === 99
                                                ? <Zap className="h-4 w-4 fill-current text-amber-300" />
                                                : paper.paperNumber === 1.5
                                                  ? <Sparkles className="h-4 w-4" />
                                                  : <Play className="h-4 w-4 fill-current" />}
                                              {paper.paperNumber === 4
                                                ? "Take Exam"
                                                : paper.paperNumber === 99
                                                  ? "Start NCLEX Prep"
                                                  : paper.paperNumber === 5
                                                    ? "Start Quiz"
                                                    : paper.paperNumber === 1.5
                                                      ? "Take a Break"
                                                      : "Start Practice"}
                                            </>
                                          )}
                                        </Button>
                                      </Link>
                                    ) : (
                                      <Button
                                        className="w-full h-12 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-400 font-bold"
                                        variant="outline"
                                        disabled
                                      >
                                        <Lock className="w-4 h-4 mr-2" />
                                        {paper.paperNumber === 99 ? "Upgrade to Mastery" : "Locked for Pro"}
                                      </Button>
                                    )}
                                  </div>
                                  {/* ✅ ACTION ROW — inside CardContent, bigger tap targets */}
                                  <div className="pt-3 mt-1 border-t border-gray-100 dark:border-gray-800">
                                    {/* Tiny hint so users know they can rate */}
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 text-center">
                                      {myState?.rating
                                        ? `You rated this ${myState.rating} ${myState.rating === 1 ? "star" : "stars"} · tap again to clear`
                                        : "Tap a star to rate this quiz"}
                                    </p>

                                    <div className="flex items-center justify-between gap-2">
                                      {/* Bookmark — 44px minimum for phones */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!unit.id) return;
                                          setBubbleKey(`bm:${unit.code}`);
                                          const nextBookmarked = !(withLocal(unit.id).bookmarked);
                                          patchMirror(unit.id, { bookmarked: nextBookmarked });
                                          toggleBookmark(unit.id);
                                          if (navigator.vibrate) navigator.vibrate(30);
                                        }}
                                        className={`relative flex items-center justify-center h-11 w-11 rounded-xl transition-colors touch-manipulation active:scale-95 ${myState?.bookmarked
                                          ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                                          : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                          }`}
                                        title={myState?.bookmarked ? "Bookmarked — tap to remove" : "Save for later"}
                                      >
                                        {bubbleKey === `bm:${unit.code}` && <BubblePop color="#10B981" emoji="🔖" />}
                                        <Bookmark size={22} fill={myState?.bookmarked ? "currentColor" : "none"} className="relative z-10" />
                                      </button>

                                      {/* Stars — bigger, more spacing */}
                                      {/* Stars — compact visual, full tap target */}
                                      <div className="flex items-center">
                                        {[1, 2, 3, 4, 5].map((n) => {
                                          const filled = (myState?.rating ?? 0) >= n;
                                          return (
                                            <button
                                              key={n}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (!unit.id) return;

                                                const current = withLocal(unit.id).rating ?? 0;
                                                const nextRating = current === n ? 0 : n;

                                                setBubbleKey(`rt:${unit.code}:${n}`);
                                                patchMirror(unit.id, { rating: nextRating === 0 ? undefined : nextRating });
                                                rateQuiz(unit.id, nextRating);
                                                if (navigator.vibrate) navigator.vibrate(20);
                                              }}
                                              className="relative flex items-center justify-center h-11 w-5 rounded-md transition-transform hover:scale-110 active:scale-95 touch-manipulation"
                                              aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                                            >
                                              {bubbleKey === `rt:${unit.code}:${n}` && <BubblePop color="#F59E0B" emoji="⭐" />}
                                              <Star
                                                size={15}
                                                fill={filled ? "currentColor" : "none"}
                                                strokeWidth={1.75}
                                                className={`relative z-10 transition-colors ${filled ? "text-amber-500" : "text-gray-300 dark:text-gray-600"
                                                  }`}
                                              />
                                            </button>
                                          );
                                        })}
                                      </div>

                                      {/* Share — 44px minimum for phones */}
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const url = `${window.location.origin}/quiz?unit=${encodeURIComponent(unit.title)}`;
                                          try {
                                            if (navigator.share) {
                                              await navigator.share({ title: unit.title, url });
                                            } else {
                                              await navigator.clipboard.writeText(url);
                                            }
                                            if (unit.id) reportShare(unit.id);
                                          } catch { /* user cancelled */ }
                                        }}
                                        className="relative flex items-center justify-center h-11 w-11 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors touch-manipulation active:scale-95"
                                        title="Share this unit"
                                      >
                                        <Share2 size={22} />
                                      </button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                              <UnitPics position={index + 1} />
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {papers.every(paper => !shouldShowPaper(paper)) && (
                  <div className="text-center py-12 px-4">
                    <p className="text-gray-500 dark:text-gray-400">No units match your search or category selection.</p>
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setActiveCategory("all");
                      }}
                      className="mt-2 text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Progress & Sync Footer */}
          <Card className="mt-10 mb-8 overflow-hidden rounded-2xl border-0 bg-transparent dark:bg-transparent shadow-none px-[4px] md:px-[4px] mx-0">
            <CardHeader className="pb-2 px-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base md:text-lg font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                    Your Journey
                  </CardTitle>
                  <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Progress synced in real time
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-0 pt-3">
              <div className="rounded-2xl bg-white dark:bg-gray-900/60 border-0 p-4 md:p-5">
                <p className="text-[13px] md:text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  Your progress, scores, and notes are securely stored and synced in real time.
                </p>

                <div className="mt-4 pt-4 flex items-center justify-between gap-3 border-0">
                  <span className="text-[11px] md:text-xs font-medium text-gray-400 dark:text-gray-500">
                    See how far you've come
                  </span>
                  <Link
                    to="/progress"
                    className="inline-flex items-center gap-1 text-[11px] md:text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-3 py-1.5 rounded-lg transition-colors shadow-sm shadow-blue-500/20"
                  >
                    View Progress
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DETAILS MODAL */}
          <AnimatePresence>
            {selectedUnit && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[999999999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
                onClick={() => setSelectedUnit(null)}
              >
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative h-44 w-full overflow-hidden flex-shrink-0">
                    {selectedUnit.image_url ? (
                      <img
                        src={selectedUnit.image_url}
                        alt={selectedUnit.image_alt ?? selectedUnit.title}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className={`h-full w-full bg-gradient-to-br ${getAccentGradient(selectedUnit.accent_color)} flex items-center justify-center`}>
                        <BookOpen className="w-16 h-16 text-white/60" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    <button
                      onClick={() => setSelectedUnit(null)}
                      className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>

                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1">
                        {selectedUnit.code}
                      </p>
                      <h3 className="text-lg font-bold text-white leading-tight">
                        {selectedUnit.title}
                      </h3>
                    </div>
                  </div>

                  <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                    {selectedUnit.description && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {selectedUnit.description}
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                        Details
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedUnit.topic && (
                          <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center flex-shrink-0">
                              <Tag className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-medium text-gray-400 uppercase">Topic</p>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{selectedUnit.topic}</p>
                            </div>
                          </div>
                        )}
                        {selectedUnit.course && (
                          <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 rounded-xl px-3 py-2.5">
                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-800/30 flex items-center justify-center flex-shrink-0">
                              <BookMarked className="w-4 h-4 text-green-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-medium text-gray-400 uppercase">Course</p>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{selectedUnit.course}</p>
                            </div>
                          </div>
                        )}
                        {selectedUnit.block && (
                          <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2.5">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-800/30 flex items-center justify-center flex-shrink-0">
                              <Layers className="w-4 h-4 text-purple-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-medium text-gray-400 uppercase">Block</p>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Block {selectedUnit.block}</p>
                            </div>
                          </div>
                        )}
                        {selectedUnit.unit && (
                          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2.5">
                            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center flex-shrink-0">
                              <BookOpen className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-medium text-gray-400 uppercase">Unit</p>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Unit {selectedUnit.unit}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <Badge variant={getLevelVariant(selectedUnit.level)} className="font-bold px-3 py-1.5 text-xs">
                          {selectedUnit.level}
                        </Badge>
                        {selectedUnit.paperNumber !== 6 && (
                          <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold px-3 py-1.5 text-xs">
                            {getQuestionCount(selectedUnit.code)} Questions
                          </Badge>
                        )}
                        {selectedUnit.quiz_type && (
                          <Badge className={`${getQuizTypeColor(selectedUnit.quiz_type)} font-bold px-3 py-1.5 text-xs`}>
                            {selectedUnit.quiz_type.toUpperCase()}
                          </Badge>
                        )}
                      </div>

                      {selectedUnit.id && (
                        <div className="pt-2">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                            How hard was this?
                          </p>
                          <div className="flex gap-2">
                            {[
                              { key: "easy" as const, label: "Too Easy", emoji: "😌", color: "#10B981" },
                              { key: "ok" as const, label: "Just Right", emoji: "🎯", color: "#3B82F6" },
                              { key: "hard" as const, label: "Tough", emoji: "🔥", color: "#EA580C" },
                            ].map(({ key, label, emoji, color }) => {
                              const selected = withLocal(selectedUnit.id!).difficultyVote === key;
                              const isBubbling = difficultyBubble === key;

                              return (
                                <button
                                  key={key}
                                  onClick={() => {
                                    // haptic: stronger for a "commit" gesture
                                    if (navigator.vibrate) navigator.vibrate([20, 30, 40]);
                                    setDifficultyBubble(key);
                                    patchMirror(selectedUnit.id!, { difficultyVote: key });
                                    voteDifficulty(selectedUnit.id!, key);
                                  }}
                                  className={`relative flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border-2 overflow-visible active:scale-95 ${selected
                                    ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300"
                                    : "bg-gray-50 dark:bg-gray-800/50 border-transparent text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"
                                    }`}
                                >
                                  {isBubbling && <BubblePop color={color} emoji={emoji} />}

                                  <motion.span
                                    key={selected ? "on" : "off"}
                                    initial={{ scale: 1 }}
                                    animate={isBubbling ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                                    transition={{ duration: 0.35 }}
                                    className="relative z-10 block text-base mb-0.5"
                                  >
                                    {emoji}
                                  </motion.span>

                                  <span className="relative z-10">{label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedUnit.paperNumber === 6 ? (
                      <button
                        onClick={() => {
                          setSelectedUnit(null);
                          playSound("tap");
                          if (navigator.vibrate) navigator.vibrate(50);
                          navigate(`/guide?unit=${encodeURIComponent(selectedUnit.code)}`);
                        }}
                        className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/30"
                      >
                        <BookOpen className="w-4 h-4" />
                        Read Guide
                      </button>
                    ) : (isPremium || freeUnits.includes(selectedUnit.code?.trim() || "") || selectedUnit.is_free) ? (
                      <button
                        onClick={() => {
                          setSelectedUnit(null);
                          markUnitStarted(selectedUnit.code);
                          playSound("start");
                          if (navigator.vibrate) navigator.vibrate(50);
                          navigate(`/quiz?unit=${encodeURIComponent(selectedUnit.title)}`);
                        }}
                        className={`w-full py-3.5 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg
                      ${selectedUnit.paperNumber === 1.5
                            ? "bg-sky-500 hover:bg-sky-600 shadow-sky-500/30"
                            : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-500/30"
                          }`}
                      >
                        {selectedUnit.paperNumber === 1.5
                          ? <Sparkles className="w-4 h-4" />
                          : <Play className="w-4 h-4 fill-current" />}
                        {selectedUnit.paperNumber === 1.5 ? "Take a Break" : "Start Quiz"}
                      </button>
                    ) : (
                      <button
                        className="w-full py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-400 font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                        disabled
                      >
                        <Lock className="w-4 h-4" />
                        Premium Content
                      </button>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 px-4 md:px-0">
            <div className="flex items-center gap-4">
              <TermsButton />
            </div>
          </div>   {/* inner space-y-2 wrapper */}
        </div>     {/* scrolling content */}
      </div>
    </div>
  );
}