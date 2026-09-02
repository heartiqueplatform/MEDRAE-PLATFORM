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

// Category avatar mapping - uses images from public folder
const categoryAvatars: Record<string, string> = {
  all: "/pwaa-512x512.png",
  paper1: "/indexbackground5.jpg",
  paper2: "/background05.jpg",
  practice: "/high4.png",
  nclex: "/pwaa-512x512.png",
  medical: "/pwaa-512x512.png"
};

// Paper avatar mapping
const paperAvatars: Record<number, string> = {
  1: "/indexbackground5.jpg",
  2: "/background05.jpg",
  3: "/high4.png",
  4: "/high1.png",
  5: "/high3.png"
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
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null); // For modal

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

    const cached = getCachedSubscription();
    if (cached !== null) {
      if (isMounted.current) {
        setIsPremium(cached.isPremium);
        setSubscriptionChecked(true);
      }
      return;
    }

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

  // Category tabs configuration with avatars
  const categories = [
    { id: "all", label: "All Units", icon: BookOpen, color: "gray", avatar: "/pwaa-512x512.png", description: "View all available quizzes" },
    { id: "paper1", label: "Paper 1", icon: GraduationCap, color: "amber", avatar: "/pwaa-512x512.png", description: "Core Nursing Fundamentals & Foundation Units" },
    { id: "paper2", label: "Paper 2", icon: FileText, color: "blue", avatar: "/pwaa-512x512.png", description: "Leadership, Research & Community Health" },
    { id: "practice", label: "Practice Papers", icon: ClipboardCheck, color: "emerald", avatar: "/pwaa-512x512.png", description: "Full-length mock exams for readiness evaluation" },
    { id: "nclex", label: "NCLEX Prep", icon: Globe, color: "purple", avatar: "/pwaa-512x512.png", description: "International nursing standards (Coming Soon)" },
    { id: "medical", label: "Medical Conditions", icon: Stethoscope, color: "rose", avatar: "/pwaa-512x512.png", description: "Condition-specific quizzes - Hypertension, Diabetes & more" },
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
      <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-2 px-2 sm:px-6 pt-4 sm:pt-8">
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

        {/* HERO HEADER CARD */}
        <Card className="relative overflow-hidden md:shadow-xl md:shadow-blue-500/5 transition-all rounded-none md:rounded-xl border-0 bg-white dark:bg-muted/30 border-b border-gray-100 dark:border-gray-800 md:border-b-0">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-48 md:w-64 h-48 md:h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          <CardHeader className="relative pb-2 px-4 md:px-6 pt-4 md:pt-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg md:rounded-2xl">
                <Heart className="h-5 w-5 md:h-7 md:w-7 text-red-500 animate-pulse" fill="currentColor" />
              </div>
              <div>
                <CardTitle className="text-xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">
                  Your <span className="text-blue-600">Nursing</span> Journey Starts Here
                </CardTitle>
                <p className="text-[9px] md:text-[10px] font-bold text-blue-500/60 uppercase tracking-[0.2em] mt-0.5 md:mt-1.5">
                  Master NCK • FQE • NCLEX with Confidence
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative space-y-2 md:space-y-2 px-4 md:px-6 pb-4 md:pb-6">
            {/* Description - Clean, no box */}
            <div>
              <motion.div layout>
                <p className="text-gray-700 dark:text-gray-300 text-sm md:text-base leading-relaxed">
                  <span className="font-bold text-blue-600 dark:text-blue-400">Master</span> nursing concepts with our comprehensive quizzes bank. Choose from core units, practice papers, or condition-specific quizzes to build confidence and save time.
                  <button
                    onClick={() => setShowDescription(!showDescription)}
                    className="text-blue-600 dark:text-blue-400 font-semibold ml-1 hover:underline underline-offset-4 inline-flex items-center gap-1 transition-all"
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
                          <span className="font-semibold text-amber-600">Paper 1:</span> Most frequently tested foundational nursing units<br />
                          <span className="font-semibold text-blue-600">Paper 2:</span> Leadership, research & community health<br />
                          <span className="font-semibold text-emerald-600">Practice Papers:</span> Mixed questions for readiness evaluation<br />
                          <span className="font-semibold text-purple-600">NCLEX Prep:</span> International standards (in development)<br />
                          <span className="font-semibold text-rose-600">Medical Conditions:</span> Targeted practice - Hypertension, Diabetes & more!
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

            {/* Category Tabs with Avatar Images */}
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
                      <img
                        src={cat.avatar}
                        alt={cat.label}
                        className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover border-2 border-white/20 flex-shrink-0"
                      />
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

            {/* SEARCH BAR */}
            <div className="relative w-full group">
              <div className="relative w-full group">
                <input
                  type="text"
                  placeholder="Search units, topics, or keywords..."
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

          {/* Dynamic Papers Rendering */}
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
                const paperAvatar = paperAvatars[paper.paperNumber] || "/pwaa-512x512.png";

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
                      <div className="flex items-center gap-3">
                        <img
                          src={paperAvatar}
                          alt={paper.paper}
                          className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700 flex-shrink-0"
                        />
                        <div>
                          <h2 className={`text-xl sm:text-2xl font-bold text-${color}-600 dark:text-${color}-500 flex items-center gap-2`}>
                            <div className={`w-2 h-8 bg-${color}-600 rounded-full`} />
                            {paper.paper}
                          </h2>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                            {headerDescription}
                          </p>
                        </div>
                      </div>
                      <div className={`bg-${color}-100 dark:bg-${color}-900/30 px-3 py-1 rounded-full border border-${color}-200`}>
                        <span className={`text-xs font-bold text-${color}-700 dark:text-${color}-400`}>
                          {paper.total_questions} Questions
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
                              className={`group relative overflow-hidden transition-all duration-300 rounded-xl border-2 border-gray-100 dark:border-gray-800 hover:border-${color}-400 dark:hover:border-${color}-500/50 bg-white dark:bg-gray-800 shadow-sm hover:shadow-xl cursor-pointer`}
                              onClick={() => setSelectedUnit(unit)}
                            >
                              {paper.paperNumber === 4 && (
                                <div className="absolute -right-8 top-4 rotate-45 bg-emerald-500 text-white text-[10px] font-bold px-10 py-1 shadow-sm">
                                  NEW
                                </div>
                              )}

                              <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                  <img
                                    src="/pwaa-512x512.png"
                                    alt="Unit"
                                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700 flex-shrink-0"
                                  />

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

                                  {/* DESCRIPTION - Clean, clickable */}
                                  {unit.description && (
                                    <div className="group/desc">
                                      <p className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                        {unit.description}
                                      </p>
                                      <div className="flex items-center gap-1 mt-1 text-xs font-medium text-blue-600 dark:text-blue-400 group-hover/desc:underline">
                                        <span>Tap for details</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      </div>
                                    </div>
                                  )}

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
                                      onClick={(e) => {
                                        e.stopPropagation();
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
          <Card className="mt-12 mb-8 overflow-hidden rounded-xl border-0 dark:bg-muted/30">
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
            </CardContent>
          </Card>
        </Card>
      </div>

      {/* DETAILS MODAL - Smart Bottom Sheet for Mobile, Centered for Desktop */}
      <AnimatePresence>
        {selectedUnit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999999999] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedUnit(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with avatar */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <img
                    src="/pwaa-512x512.png"
                    alt="Unit"
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                      {selectedUnit.title}
                    </h3>
                    <p className="text-xs font-medium text-gray-400">
                      {selectedUnit.code}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUnit(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors flex-shrink-0 -mr-1"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                {/* Full Description */}
                {selectedUnit.description && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {selectedUnit.description}
                    </p>
                  </div>
                )}

                {/* All Details in a Clean Grid */}
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

                  {/* Level & Questions Tags */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Badge variant={getLevelVariant(selectedUnit.level)} className="font-bold px-3 py-1.5 text-xs">
                      {selectedUnit.level}
                    </Badge>
                    <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold px-3 py-1.5 text-xs">
                      {getQuestionCount(selectedUnit.code)} Questions
                    </Badge>
                    {selectedUnit.quiz_type && (
                      <Badge className={`${getQuizTypeColor(selectedUnit.quiz_type)} font-bold px-3 py-1.5 text-xs`}>
                        {selectedUnit.quiz_type.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                {(isPremium || freeUnits.includes(selectedUnit.code?.trim() || "") || selectedUnit.is_free) ? (
                  <button
                    onClick={() => {
                      setSelectedUnit(null);
                      navigate(`/quiz?unit=${encodeURIComponent(selectedUnit.title)}`);
                    }}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Start Quiz
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

              {/* Bottom Safe Area for iOS */}
              <div className="h-1 sm:h-0" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-4">
          <TermsButton />
        </div>
      </div>
    </div>
  );
}