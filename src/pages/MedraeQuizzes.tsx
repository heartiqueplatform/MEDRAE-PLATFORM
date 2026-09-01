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
  Heart, Play, BookOpen, Shuffle, Compass, ChevronRight,
  ClipboardCheck, CheckCircle2, Trophy, Zap, Lock, Sparkles,
  Search, RefreshCw, HelpCircle, GraduationCap, Stethoscope,
  FileText, Globe, Info, BookMarked, Layers, Tag, Type
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

// Category Types
type CategoryType = "all" | "paper1" | "paper2" | "practice" | "nclex" | "medical";

// Cache keys and durations
const SUBSCRIPTION_CACHE_KEY = "subscriptionStatus";
const FREE_UNITS_CACHE_KEY = "freeUnits";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Request deduplication
let subscriptionFetchInProgress = false;
let freeUnitsFetchInProgress = false;
let lastSubscriptionFetch = 0;
let lastFreeUnitsFetch = 0;
const MIN_FETCH_INTERVAL = 60 * 60 * 1000; // 1 hour minimum between fetches

// Cache helpers
const getCachedSubscription = () => {
  try {
    const cached = localStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (e) { }
  return null;
};

const setCachedSubscription = (data: any) => {
  try {
    localStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) { }
};

const getCachedFreeUnits = () => {
  try {
    const cached = localStorage.getItem(FREE_UNITS_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
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
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
};

export function MedraeQuizzes() {
  const user = useUser();
  const [isPremium, setIsPremium] = useState(() => {
    const cached = getCachedSubscription();
    return cached?.isPremium || false;
  });
  const [subscriptionChecked, setSubscriptionChecked] = useState(() => !!getCachedSubscription());
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = React.useState(false);
  const [freeUnits, setFreeUnits] = useState<string[]>(() => getCachedFreeUnits() || []);
  const [activeCategory, setActiveCategory] = useState<CategoryType>("all");


  const { papers, loading: unitsLoading, refreshUnits } = useUnits();
  const { data: unitCounts, loading: countsLoading, refreshCounts } = useUnitQuestionCount();

  const [showDescription, setShowDescription] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [popup, setPopup] = useState<string | null>(null);
  const [popupError, setPopupError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);



  // ✅ OPTIMIZED: Fetch subscription with caching (24 hours)
  const fetchSubscription = useCallback(async () => {
    if (!user) return;

    // Check 24-hour cache first
    const cached = getCachedSubscription();
    if (cached !== null) {
      if (isMounted.current) {
        setIsPremium(cached.isPremium);
        setSubscriptionChecked(true);
      }
      return;
    }

    // Rate limiting
    const now = Date.now();
    if (now - lastSubscriptionFetch < MIN_FETCH_INTERVAL) return;
    if (subscriptionFetchInProgress) return;

    subscriptionFetchInProgress = true;
    lastSubscriptionFetch = now;

    try {
      const { data } = await supabase
        .from("subscriptions")
        .select("plan_type, expires_at, is_active")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const premiumStatus = data?.is_active || false;

      if (isMounted.current) {
        setIsPremium(premiumStatus);
        setSubscriptionChecked(true);
        setCachedSubscription({ isPremium: premiumStatus });
      }
    } catch (err) {
      console.log("Offline mode: using cached subscription", err);
      const cachedSubscription = getCachedSubscription();
      if (cachedSubscription && isMounted.current) {
        setIsPremium(cachedSubscription.isPremium);
        setSubscriptionChecked(true);
      }
    } finally {
      subscriptionFetchInProgress = false;
    }
  }, [user]);

  // ✅ OPTIMIZED: Fetch free units with caching (24 hours)
  const fetchFreeUnits = useCallback(async () => {
    // Check 24-hour cache first
    const cached = getCachedFreeUnits();
    if (cached !== null) {
      if (isMounted.current) {
        setFreeUnits(cached);
      }
      return;
    }

    // Rate limiting
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

  // Initial data fetch (only once)
  useEffect(() => {
    fetchSubscription();
    fetchFreeUnits();
  }, [fetchSubscription, fetchFreeUnits]);

  // Helper to get question count for a unit
  const getQuestionCount = (code: string) => {
    const unit = unitCounts?.find((u) => u.unit_code?.trim() === code.trim());
    return unit ? unit.count : 0;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPopupError(false);
    try {
      // Clear caches to force fresh data
      localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
      localStorage.removeItem(FREE_UNITS_CACHE_KEY);

      await Promise.all([refreshCounts(), refreshUnits(), fetchSubscription(), fetchFreeUnits()]);
      setPopup("All units and question counts have been refreshed successfully!");
    } catch (err) {
      setPopupError(true);
      setPopup("Unable to refresh units. Please check your connection.");
    }
    setRefreshing(false);
  };

  // Filter units based on search term and category
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
      if (activeCategory === "nclex" && paperNumber !== 3) return [];
      if (activeCategory === "medical" && paperNumber !== 5) return [];
    }

    return filtered;
  };

  const shouldShowPaper = (paper: PaperData) => {
    const filteredUnits = getFilteredUnitsForPaper(paper.units, paper.paperNumber);
    return filteredUnits.length > 0;
  };

  const getRandomUnit = () => {
    let allAvailableUnits = papers.flatMap(p => p.units);

    if (activeCategory !== "all") {
      allAvailableUnits = allAvailableUnits.filter(unit => {
        if (activeCategory === "paper1") return unit.paperNumber === 1 || unit.paperNumber === 5;
        if (activeCategory === "paper2") return unit.paperNumber === 2;
        if (activeCategory === "practice") return unit.paperNumber === 4;
        if (activeCategory === "nclex") return unit.paperNumber === 3;
        if (activeCategory === "medical") return unit.paperNumber === 5;
        return true;
      });
    }

    if (allAvailableUnits.length === 0) return null;
    return allAvailableUnits[Math.floor(Math.random() * allAvailableUnits.length)];
  };

  const getRecommendedUnit = () => {
    const pastUnits = JSON.parse(localStorage.getItem("submittedUnits") || "[]");
    let allAvailableUnits = papers.flatMap(p => p.units);

    if (activeCategory !== "all") {
      allAvailableUnits = allAvailableUnits.filter(unit => {
        if (activeCategory === "paper1") return unit.paperNumber === 1 || unit.paperNumber === 5;
        if (activeCategory === "paper2") return unit.paperNumber === 2;
        if (activeCategory === "practice") return unit.paperNumber === 4;
        if (activeCategory === "nclex") return unit.paperNumber === 3;
        if (activeCategory === "medical") return unit.paperNumber === 5;
        return true;
      });
    }

    if (pastUnits.length > 0) {
      const notCompleted = allAvailableUnits.find(u => !pastUnits.includes(u.code));
      if (notCompleted) return notCompleted;
    }
    return allAvailableUnits[Math.floor(Math.random() * allAvailableUnits.length)];
  };

  const isLoading = (unitsLoading && papers.length === 0) || (countsLoading && !unitCounts?.length);

  // Category tabs configuration
  const categories = [
    { id: "all", label: "All Units", icon: BookOpen, color: "gray", description: "View all available quizzes" },
    { id: "paper1", label: "Paper 1", icon: GraduationCap, color: "amber", description: "Core Nursing Fundamentals & Foundation Units" },
    { id: "paper2", label: "Paper 2", icon: FileText, color: "blue", description: "Leadership, Research & Community Health" },
    { id: "practice", label: "Practice Papers", icon: ClipboardCheck, color: "emerald", description: "Full-length mock exams for readiness evaluation" },
    { id: "nclex", label: "NCLEX Prep", icon: Globe, color: "purple", description: "International nursing standards (Coming Soon)" },
    { id: "medical", label: "Medical Conditions", icon: Stethoscope, color: "rose", description: "Condition-specific quizzes - Hypertension, Diabetes & more" },
  ];

  const toggleDescription = (unitCode: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [unitCode]: !prev[unitCode]
    }));
  };

  if (!subscriptionChecked && !getCachedSubscription()) {
    return <GlobalLoader />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center">
      <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-2 px-0 sm:px-6 pt-4 sm:pt-8">
        {/* Popup Notification */}
        <AnimatePresence>
          {popup && (
            <PopupMessage
              message={popup}
              onClose={() => setPopup(null)}
              isError={popupError}
            />
          )}
        </AnimatePresence>
        {/* HERO HEADER CARD - full width on mobile */}
        <Card className="relative overflow-hidden md:shadow-xl md:shadow-blue-500/5 transition-all rounded-none md:rounded-xl border-0 bg-white dark:bg-muted/30 border-b border-gray-100 dark:border-gray-800 md:border-b-0">

          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-48 md:w-64 h-48 md:h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          <CardHeader className="relative pb-2 px-4 md:px-6 pt-4 md:pt-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg md:rounded-2xl">
                <Heart className="h-5 w-5 md:h-7 md:w-7 text-red-500 animate-pulse" fill="currentColor" />
              </div>
              <div>
                <CardTitle className="text-xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">
                  Prep Quizzes <span className="text-blue-600">Bank</span>
                </CardTitle>
                <p className="text-[9px] md:text-[10px] font-bold text-blue-500/60 uppercase tracking-[0.2em] mt-0.5 md:mt-1.5">
                  NCK, FQE & NCLEX Prep
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative space-y-2 md:space-y-2 px-4 md:px-6 pb-4 md:pb-6">
            {/* Collapsible Description Box */}
            <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-xl md:rounded-2xl p-3 md:p-4 border border-gray-100 dark:border-gray-800">
              <motion.div layout>
                <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm leading-relaxed">
                  Master nursing concepts with our comprehensive quizzes bank. Choose from core units, practice papers, or condition-specific quizzes to build confidence and save time...
                  <button
                    onClick={() => setShowDescription(!showDescription)}
                    className="text-blue-600 dark:text-blue-400 font-bold ml-1 hover:underline underline-offset-4 inline-flex items-center gap-1 transition-all"
                  >
                    {showDescription ? "Show less" : "Learn more"}
                  </button>
                </p>

                <AnimatePresence>
                  {showDescription && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 md:pt-4 space-y-2 md:space-y-3 border-t border-gray-200/50 dark:border-gray-700/50 mt-2 md:mt-3">
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-semibold text-amber-600">Paper 1:</span> Contains most frequently tested foundational nursing units<br />
                          <span className="font-semibold text-blue-600">Paper 2:</span> Leadership, research & community health focus<br />
                          <span className="font-semibold text-emerald-600">Practice Papers:</span> Mixed questions for comprehensive readiness evaluation<br />
                          <span className="font-semibold text-purple-600">NCLEX Prep:</span> International standards preparation (in development)<br />
                          <span className="font-semibold text-rose-600">Medical Conditions:</span> Condition-specific quizzes for targeted practice - jump directly to Hypertension, Diabetes, and more!
                        </p>
                        <div className="flex flex-col gap-1.5 md:gap-2">
                          <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 md:px-3 py-1.5 md:py-2 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" /> Finish quiz to unlock submission
                          </div>
                          <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 md:px-3 py-1.5 md:py-2 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" /> Progress saved locally to your device
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Category Tabs - horizontal scroll on mobile */}
            <div className="relative">
              <div className="flex overflow-x-auto scrollbar-hide gap-1.5 md:gap-2 pb-2 -mx-1 px-1 sm:overflow-visible sm:flex-wrap sm:justify-center">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id as CategoryType)}
                      className={`flex-shrink-0 flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg md:rounded-xl transition-all duration-200 whitespace-nowrap text-[10px] md:text-xs
                ${isActive
                          ? `bg-${cat.color}-500 text-white shadow-lg shadow-${cat.color}-500/30`
                          : `bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700`
                        }`}
                    >
                      <Icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isActive ? "text-white" : `text-${cat.color}-500`}`} />
                      <span className="font-bold">{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {activeCategory !== "all" && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 md:mt-2 text-center"
                >
                  <p className="text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400">
                    {categories.find(c => c.id === activeCategory)?.description}
                  </p>
                </motion.div>
              )}
            </div>

            {/* SEARCH BAR SECTION - phone optimized */}
            <div className="relative w-full group">
              <div className="relative w-full group">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-11 md:h-14 pl-9 md:pl-12 pr-20 md:pr-28 rounded-lg md:rounded-2xl bg-gray-100 dark:bg-gray-900 border-2 border-transparent text-xs md:text-base text-gray-900 dark:text-white placeholder-gray-400 font-medium focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none shadow-inner"
                  autoComplete="off"
                />

                <div className="absolute left-2.5 md:left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-focus-within:scale-110">
                  <Search className="w-3.5 h-3.5 md:w-5 md:h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>

                <div className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 md:gap-1">
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
                      className="absolute bottom-full right-0 mb-2 md:mb-3 w-64 md:w-72 p-2.5 md:p-3 bg-white dark:bg-gray-800 rounded-lg md:rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50"
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
                          <p className="text-gray-500 text-[9px] md:text-[10px]">💡 Use tabs above to filter by category</p>
                        </div>
                      </div>
                      <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 rotate-45"></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>

          {/* Dynamic Papers Rendering with Category Filtering */}
          {isLoading ? (
            <div className="space-y-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-4">
                  <div className="flex items-end justify-between px-2 sm:px-0">
                    <div className="h-12 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                    <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
                  </div>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    {[1, 2].map(j => (
                      <div key={j} className="h-44 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {papers.map(paper => {
                const filteredUnits = getFilteredUnitsForPaper(paper.units, paper.paperNumber);
                if (!shouldShowPaper(paper)) return null;

                const IconComponent = getIconComponent(paper.icon);
                const color = paper.color;

                let headerDescription = paper.description;
                if (paper.paperNumber === 1) {
                  headerDescription = "Most frequently tested foundational nursing units";
                } else if (paper.paperNumber === 2) {
                  headerDescription = "Leadership, research methodology & community health";
                } else if (paper.paperNumber === 3) {
                  headerDescription = "International nursing standards & RN preparation (Team working on it)";
                } else if (paper.paperNumber === 4) {
                  headerDescription = "Mixed questions for knowledge & readiness evaluation";
                } else if (paper.paperNumber === 5) {
                  headerDescription = "Condition-specific quizzes - Jump directly to any medical condition";
                }

                return (
                  <div key={paper.paperNumber} className="space-y-2">
                    <div className="flex items-end justify-between px-2 sm:px-0 mt-3">
                      <div>
                        <h2 className={`text-xl sm:text-2xl font-bold text-${color}-600 dark:text-${color}-500 flex items-center gap-2`}>
                          <div className={`w-2 h-8 bg-${color}-600 rounded-full`} />
                          {paper.paper}
                        </h2>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                          {headerDescription}
                        </p>
                      </div>
                      <div className={`bg-${color}-100 dark:bg-${color}-900/30 px-3 py-1 rounded-full border border-${color}-200`}>
                        <span className={`text-xs font-bold text-${color}-700 dark:text-${color}-400`}>
                          {paper.total_questions} Questions Total
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
                      {filteredUnits.map((unit, index) => {
                        const questionCount = getQuestionCount(unit.code);
                        const isUnitFree = freeUnits.includes((unit.code ?? "").trim()) || unit.is_free;
                        const hasStarted = hasStartedQuiz(unit.code);
                        const isExpanded = expandedDescriptions[unit.code] || false;

                        return (
                          <React.Fragment key={unit.code}>
                            <Card
                              className={`group relative overflow-hidden transition-all duration-300 rounded-xl border-2 border-gray-100 dark:border-gray-800 hover:border-${color}-400 dark:hover:border-${color}-500/50 bg-white dark:bg-gray-800 shadow-sm hover:shadow-xl`}
                            >
                              {paper.paperNumber === 4 && (
                                <div className="absolute -right-8 top-4 rotate-45 bg-emerald-500 text-white text-[10px] font-bold px-10 py-1 shadow-sm">
                                  NEW
                                </div>
                              )}

                              <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                  <div className={`p-2 bg-${color}-50 dark:bg-${color}-900/20 rounded-xl group-hover:scale-110 transition-transform`}>
                                    <IconComponent className={`h-5 w-5 text-${color}-600`} />
                                  </div>

                                  {isPremium ? (
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                                      <CheckCircle2 className="w-3 h-3" /> UNLOCKED
                                    </div>
                                  ) : isUnitFree ? (
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                                      <Sparkles className="w-3 h-3" /> FREE
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                                      <Lock className="w-3 h-3" /> PREMIUM
                                    </div>
                                  )}
                                </div>

                                <CardTitle className="text-lg font-bold leading-tight mt-3 text-gray-900 dark:text-gray-100 min-h-[3rem] line-clamp-2">
                                  {unit.title}
                                </CardTitle>
                                <CardDescription className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                                  {unit.code}
                                </CardDescription>
                              </CardHeader>

                              <CardContent>
                                <div className="flex flex-col gap-3">
                                  {/* QUIZ TYPE BADGE */}
                                  {unit.quiz_type && (
                                    <div className="flex items-center gap-1.5">
                                      <Type className="w-3 h-3 text-gray-400" />
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getQuizTypeColor(unit.quiz_type)}`}>
                                        {unit.quiz_type.toUpperCase()}
                                      </span>
                                    </div>
                                  )}

                                  {/* DESCRIPTION - Edge to edge with proper Read more toggle */}
                                  {unit.description && (
                                    <div className="px-3 py-2 -mx-3 bg-gray-50/80 dark:bg-gray-900/30 border-y border-gray-100/60 dark:border-gray-800/60">
                                      <p className={`text-xs text-gray-600 dark:text-gray-400 leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                        {unit.description}
                                      </p>
                                      {unit.description.length > 80 && (
                                        <button
                                          onClick={() => toggleDescription(unit.code)}
                                          className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-flex items-center gap-1 transition-all hover:gap-1.5"
                                        >
                                          {isExpanded ? 'Show less' : 'Read more'}
                                          <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {/* TOPIC, COURSE, BLOCK, UNIT INFO */}
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {unit.topic && (
                                      <Badge variant="outline" className="text-[9px] font-medium bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                        <Tag className="w-2.5 h-2.5 mr-1" />
                                        {unit.topic}
                                      </Badge>
                                    )}
                                    {unit.course && (
                                      <Badge variant="outline" className="text-[9px] font-medium bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                                        <BookMarked className="w-2.5 h-2.5 mr-1" />
                                        {unit.course}
                                      </Badge>
                                    )}
                                    {unit.block && (
                                      <Badge variant="outline" className="text-[9px] font-medium bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                                        <Layers className="w-2.5 h-2.5 mr-1" />
                                        Block {unit.block}
                                      </Badge>
                                    )}
                                    {unit.unit && (
                                      <Badge variant="outline" className="text-[9px] font-medium bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                                        <BookOpen className="w-2.5 h-2.5 mr-1" />
                                        Unit {unit.unit}
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Questions count and level */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-none font-bold">
                                      {questionCount} Questions
                                    </Badge>
                                    <Badge variant={getLevelVariant(unit.level)} className="font-bold border-none">
                                      {unit.level}
                                    </Badge>
                                  </div>

                                  {(isPremium || isUnitFree) ? (
                                    <Link
                                      to={`/quiz?unit=${encodeURIComponent(unit.title)}`}
                                      onClick={() => {
                                        markUnitStarted(unit.code);
                                        playSound("start");
                                        if (navigator.vibrate) navigator.vibrate(50);
                                      }}
                                      className="block w-full"
                                    >
                                      <Button
                                        className={`w-full h-12 rounded-2xl font-bold transition-all flex items-center justify-center gap-2
                                          ${hasStarted
                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 dark:shadow-none"
                                            : paper.paperNumber === 3
                                              ? "bg-purple-600 hover:bg-purple-700 text-white"
                                              : paper.paperNumber === 4
                                                ? "bg-gray-200 dark:bg-gray-900 text-black dark:text-white hover:opacity-90"
                                                : paper.paperNumber === 2
                                                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                                                  : paper.paperNumber === 5
                                                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                                                    : "bg-gray-200 dark:bg-gray-900 text-black dark:text-white hover:opacity-90"
                                          }`}
                                      >
                                        {hasStarted ? (
                                          <>
                                            <RefreshCw className="h-4 w-4 animate-spin-slow" />
                                            {paper.paperNumber === 4 ? "Continue Mock" : paper.paperNumber === 3 ? "Resume Mastery" : paper.paperNumber === 5 ? "Continue Practice" : "Continue Practicing"}
                                          </>
                                        ) : (
                                          <>
                                            {paper.paperNumber === 3 ? <Zap className="h-4 w-4 fill-current text-amber-300" /> : <Play className="h-4 w-4 fill-current" />}
                                            {paper.paperNumber === 4 ? "Take Exam" : paper.paperNumber === 3 ? "Start NCLEX Prep" : paper.paperNumber === 5 ? "Start Quiz" : "Start Practice"}
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
                                      {paper.paperNumber === 3 ? "Upgrade to Mastery" : "Locked for Pro"}
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>

                            {/* 👇 Show image after every 4th unit */}
                            <UnitPics position={index + 1} />
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {papers.every(paper => !shouldShowPaper(paper)) && (
                <div className="text-center py-12">
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

          {/* Progress & Sync Footer */}
          <Card className="mt-12 mb-8 overflow-hidden rounded-xl border-0 dark:bg-muted/30 ">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Your Journey
                </CardTitle>

                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-100 dark:border-emerald-800">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                    Cloud Synced
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-inner">
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  You are securely connected to <span className="font-bold text-gray-900 dark:text-white">Supabase Cloud</span>.
                  Your quiz progress, scores, and custom notes are being tracked in real-time.
                </p>

                <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Ready to see your results?</span>
                  <Link
                    to="/progress"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    View Study Progress <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-4">
                  <TermsButton />
                </div>
              </div>
            </CardContent>
          </Card>
        </Card>
      </div>
    </div>
  );
}