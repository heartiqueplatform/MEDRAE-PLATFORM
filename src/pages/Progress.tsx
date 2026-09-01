"use client";
import { GlobalLoader } from "@/components/GlobalLoader";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom"; // Add this
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  TrendingUp,
  Search,
  Flame,
  Target,
  Star,
  BookOpen,
  Clock,
  Award,
  Heart,
  RefreshCw,
  Check,
  Activity,
  X,
} from "lucide-react";
import { playSound } from "@/lib/soundManager";
import { motion, AnimatePresence } from "framer-motion";
import { allUnits } from "@/constants/units";
import { TermsButton } from "@/components/ui/TermsButton";
import { useSession } from "@supabase/auth-helpers-react";
import { TriagePopup, TriageLevel } from "@/components/progress/TriagePopup";
import { TRIAGE_LEVELS, getTriageCode } from "@/components/progress/triageConfig";
// Cache helpers
const progressCache = new Map();
const profileCache = new Map();
const simResultsCache = new Map();
const triviaResultsCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const LOCAL_STORAGE_KEY = "study_progress_cache";
const TRIAGE_POPUP_KEY = "triage_popup_shown";

function saveToLocalStorage(userId: string, data: any) {
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ userId, timestamp: Date.now(), ...data })
    );
  } catch (e) {
    console.error("Error saving to localStorage:", e);
  }
}

function loadFromLocalStorage(userId: string) {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const now = Date.now();
    if (parsed.userId === userId && now - (parsed.timestamp || 0) < CACHE_DURATION) {
      return parsed;
    }
    return null;
  } catch (e) {
    console.error("Error reading from localStorage:", e);
    return null;
  }
}

function isEqualData(a: any[], b: any[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// 🚨 TRIAGE BANNER COMPONENT
// 🚨 TRIAGE BANNER COMPONENT
function TriageBanner({
  overallProgress,
  hasData,
  totalStars,
  totalUnits,
}: {
  overallProgress: number;
  hasData: boolean;
  totalStars: number;
  totalUnits: number;
}) {
  const navigate = useNavigate();
  const triage = getTriageCode(overallProgress, hasData);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring" }}
      className={`relative overflow-hidden md:rounded-2xl p-4 md:p-5 border-0 ${triage.bgColor} border-b border-gray-100 dark:border-gray-800 md:border-b-0`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
        {/* Triage Badge */}
        <div className="flex-shrink-0">
          <div className={`w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl md:text-4xl font-black border-0 bg-white/80 dark:bg-gray-800/80 md:shadow-lg`}>
            {triage.emoji}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1">
            <Badge className={`${triage.bgColor} ${triage.textColor} border-0 text-xs md:text-sm font-bold px-2.5 md:px-4 py-1 md:py-1.5`}>
              CODE {triage.code}
            </Badge>
            <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${triage.color}`}>
              {triage.label}
            </span>
          </div>
          <p className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
            {triage.description}
          </p>
          {hasData && (
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1.5 md:mt-2 text-[10px] md:text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Activity className="w-2.5 h-2.5 md:w-3 md:h-3" />
                {overallProgress}% Overall
              </span>
              <span className="w-px h-3 md:h-4 bg-gray-300 dark:bg-gray-600" />
              <span className="flex items-center gap-1">
                <Star className="w-2.5 h-2.5 md:w-3 md:h-3 text-yellow-400 fill-current" />
                {totalStars} Stars
              </span>
              <span className="w-px h-3 md:h-4 bg-gray-300 dark:bg-gray-600" />
              <span className="flex items-center gap-1">
                <BookOpen className="w-2.5 h-2.5 md:w-3 md:h-3" />
                {totalUnits} Units
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={() => navigate(triage.actionLink)}
          className={`flex-shrink-0 w-full sm:w-auto px-4 md:px-4 py-2 md:py-2 text-white text-xs md:text-xs font-bold rounded-xl transition-all md:hover:scale-105 md:shadow-lg active:scale-[0.98] ${triage.code === "GREEN" ? "bg-emerald-600 hover:bg-emerald-700 md:shadow-emerald-500/30" :
            triage.code === "YELLOW" ? "bg-amber-600 hover:bg-amber-700 md:shadow-amber-500/30" :
              triage.code === "RED" ? "bg-red-600 hover:bg-red-700 md:shadow-red-500/30" :
                "bg-gray-600 hover:bg-gray-700 md:shadow-gray-500/30"
            }`}
        >
          {triage.actionText}
        </button>
      </div>

      {/* Animated Pulse Effect */}
      {(triage.code === "RED" || triage.code === "YELLOW") && (
        <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 -mr-6 md:-mr-8 -mt-6 md:-mt-8 opacity-10">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-full h-full rounded-full bg-current"
          />
        </div>
      )}
    </motion.div>
  );
}

// 🚨 UNIT TRIAGE BADGE
function UnitTriageBadge({ subject }: { subject: any }) {
  const triage = getTriageCode(subject.progress, true);

  return (
    <div className={`flex items-center justify-between px-2.5 md:px-3 py-1.5 md:py-2 md:rounded-xl border-0 ${triage.bgColor} border-b border-gray-100 dark:border-gray-800 md:border-b-0`}>
      <div className="flex items-center gap-1.5 md:gap-2">
        <span className="text-base md:text-lg">{triage.emoji}</span>
        <span className="text-[10px] md:text-xs font-bold text-gray-600 dark:text-gray-300">
          Status: <span className={triage.textColor}>{triage.code}</span>
        </span>
      </div>
      <Badge variant="outline" className={`text-[7px] md:text-[8px] font-black ${triage.textColor} border-current`}>
        {triage.label}
      </Badge>
    </div>
  );
}
export function StudyProgress() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStarsEarned, setTotalStarsEarned] = useState(0);
  const [unitsWithStats, setUnitsWithStats] = useState<any[]>([]);
  const [totalTopicsInApp, setTotalTopicsInApp] = useState(0);
  const [showProgressDescription, setShowProgressDescription] = useState(false);
  const [hasAnyData, setHasAnyData] = useState(false);
  const [showTriagePopup, setShowTriagePopup] = useState(false);
  const session = useSession();
  const user = session?.user || null;

  const isMounted = useRef(true);
  const isFetchingProgress = useRef(false);
  const channelRef = useRef<any>(null);
  const lastFetchTime = useRef(0);

  const fetchProgress = useCallback(async (showLoader = true) => {
    if (!user || isFetchingProgress.current) return;

    const now = Date.now();
    const cacheKey = `progress_${user.id}`;

    if (progressCache.has(cacheKey)) {
      const cached = progressCache.get(cacheKey);
      if (now - cached.timestamp < CACHE_DURATION && isMounted.current) {
        setSubjects(cached.subjects || []);
        setTotalStarsEarned(cached.totalStarsEarned || 0);
        setUnitsWithStats(cached.subjects || []);
        setTotalTopicsInApp(cached.totalTopicsInApp || 0);
        setHasAnyData(cached.hasAnyData || false);
        if (showLoader) setLoading(false);
        // Show popup after data loads
        // Always show popup for testing
        setTimeout(() => setShowTriagePopup(true), 500);
        return;
      }
    }

    const cached = loadFromLocalStorage(user.id);
    if (cached && isMounted.current) {
      setSubjects(cached.subjects || []);
      setTotalStarsEarned(cached.totalStarsEarned || 0);
      setUnitsWithStats(cached.subjects || []);
      setTotalTopicsInApp(cached.totalTopicsInApp || 0);
      setHasAnyData(cached.hasAnyData || false);
      progressCache.set(cacheKey, {
        subjects: cached.subjects,
        totalStarsEarned: cached.totalStarsEarned,
        totalTopicsInApp: cached.totalTopicsInApp,
        hasAnyData: cached.hasAnyData || false,
        timestamp: cached.timestamp
      });
      if (showLoader) setLoading(false);
      // Always show popup for testing
      setTimeout(() => setShowTriagePopup(true), 500);
    }

    if (showLoader && isMounted.current) setLoading(true);
    isFetchingProgress.current = true;
    lastFetchTime.current = now;

    try {
      const { data, error } = await supabase
        .from("quiz_results")
        .select("unit, score, total_questions, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: allQuizzes, error: quizError } = await supabase
        .from("quizzes")
        .select("unit, id");

      if (quizError) throw quizError;

      const totalTopicsInAppCount = allQuizzes?.length || 0;
      const hasData = data && data.length > 0;

      const grouped: Record<string, { highestProgress: number; attempts: number }> = {};

      data?.forEach((res) => {
        const key = res.unit || "Unknown";
        const percent = res.total_questions > 0 ? (res.score / res.total_questions) * 100 : 0;

        if (!grouped[key]) grouped[key] = { highestProgress: percent, attempts: 1 };
        else {
          grouped[key].highestProgress = Math.max(grouped[key].highestProgress, percent);
          grouped[key].attempts += 1;
        }
      });

      const computedUnits = Object.keys(grouped).map((unitName) => {
        const stats = grouped[unitName];
        const bestPercent = stats.highestProgress;

        let rating = 0;
        if (bestPercent >= 90) rating = 5;
        else if (bestPercent >= 75) rating = 4;
        else if (bestPercent >= 60) rating = 3;
        else if (bestPercent >= 45) rating = 2;
        else if (bestPercent >= 30) rating = 1;

        return {
          id: unitName,
          name: unitName,
          progress: Math.round(stats.highestProgress),
          hoursStudied: stats.attempts * 1.5,
          topicsCompleted: stats.attempts,
          totalTopics: allQuizzes?.filter((q) => q.unit === unitName).length || stats.attempts,
          rating: rating,
        };
      });

      const totalStars = computedUnits.reduce((acc, s) => acc + s.rating, 0);

      if (isMounted.current) {
        setUnitsWithStats(computedUnits);
        setSubjects(computedUnits);
        setTotalStarsEarned(totalStars);
        setTotalTopicsInApp(totalTopicsInAppCount);
        setHasAnyData(hasData);

        const newState = {
          subjects: computedUnits,
          totalStarsEarned: totalStars,
          totalTopicsInApp: totalTopicsInAppCount,
          hasAnyData: hasData,
        };

        saveToLocalStorage(user.id, newState);
        progressCache.set(cacheKey, { ...newState, timestamp: now });

        // Show popup after data loads (only once)
        // Always show popup for testing
        setTimeout(() => setShowTriagePopup(true), 500);
      }
    } catch (err) {
      console.error("Error fetching progress:", err);
    } finally {
      if (isMounted.current) {
        if (showLoader) setLoading(false);
      }
      isFetchingProgress.current = false;
    }
  }, [user]);

  useEffect(() => {
    isMounted.current = true;
    fetchProgress(true);
    return () => { isMounted.current = false; };
  }, [fetchProgress]);

  useEffect(() => {
    let focusTimer: NodeJS.Timeout;
    let lastFocusRefresh = 0;

    const handleFocus = () => {
      if (focusTimer) clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        const now = Date.now();
        if (now - lastFocusRefresh < 30000) return;
        lastFocusRefresh = now;
        if (user && isMounted.current) {
          fetchProgress(false);
        }
      }, 500);
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [user, fetchProgress]);

  const overallStats = {
    totalHours: unitsWithStats.reduce((acc, s) => acc + s.hoursStudied, 0),
    totalStars: unitsWithStats.reduce((acc, s) => acc + s.rating, 0),
    totalProgress: unitsWithStats.length
      ? Math.round(unitsWithStats.reduce((acc, s) => acc + s.progress, 0) / unitsWithStats.length)
      : 0,
    completedTopics: unitsWithStats.reduce((acc, s) => acc + s.topicsCompleted, 0),
    totalTopics: totalTopicsInApp,
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? "text-yellow-400 fill-current" : "text-gray-300"}`}
      />
    ));

  const triage = getTriageCode(overallStats.totalProgress, hasAnyData);

  const handleClosePopup = () => {
    setShowTriagePopup(false);
    localStorage.setItem(TRIAGE_POPUP_KEY, "true");
  };

  return (
    <div className="min-h-screen w-full flex mt-0 flex-col items-center pb-20 md:pb-6">
      {/* 🚨 TRIAGE POPUP / OVERLAY */}
      <AnimatePresence>
        {showTriagePopup && (
          <TriagePopup triage={triage} onClose={handleClosePopup} />
        )}
      </AnimatePresence>

      <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-0 md:space-y-2 px-0 md:px-6 pt-0 md:pt-8">
        {/* Main Card - full width on mobile, no rounded corners */}
        <Card className="relative overflow-hidden md:shadow-xl md:shadow-blue-500/5 transition-all rounded-none md:rounded-xl border-0 bg-white dark:bg-muted/30 border-b border-gray-100 dark:border-gray-800 md:border-b-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />
          <CardHeader className="pb-2 px-4 md:px-6 pt-4 md:pt-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 md:p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl md:rounded-2xl">
                <Heart className="h-6 w-6 md:h-7 md:w-7 text-red-500 animate-pulse" fill="currentColor" />
              </div>
              <div>
                <CardTitle className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Study <span className="text-blue-600">Progress</span>
                </CardTitle>
                <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-0.5 md:mt-1">
                  Real-time Learning Analytics
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-2 md:space-y-2 px-4 md:px-6 pb-4 md:pb-6">
            {/* 🚨 TRIAGE BANNER */}
            <TriageBanner
              overallProgress={overallStats.totalProgress}
              hasData={hasAnyData}
              totalStars={overallStats.totalStars}
              totalUnits={unitsWithStats.length}
            />

            {/* Metric Explanation Section */}
            <div className="bg-gray-50/80 dark:bg-gray-900/50 rounded-2xl md:rounded-3xl p-4 md:p-5 border-0">
              <motion.div layout>
                <div className="flex items-center justify-between mb-1.5 md:mb-2">
                  <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-500">Metric Guide</h3>
                  <button
                    onClick={() => setShowProgressDescription(!showProgressDescription)}
                    className="text-[9px] md:text-[10px] font-bold text-blue-600 hover:underline px-1.5 md:px-2 py-0.5 md:py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg"
                  >
                    {showProgressDescription ? "Close Info" : "How is this calculated?"}
                  </button>
                </div>

                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                  Track your journey through core nursing units. Your activity is measured across three key performance indicators.
                </p>

                <AnimatePresence>
                  {showProgressDescription && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-2 pt-3 md:pt-4 mt-3 md:mt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex gap-2 md:gap-3">
                          <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center text-blue-600 font-bold text-[10px] md:text-xs">%</div>
                          <p className="text-[10px] md:text-[11px] text-gray-500 leading-snug"><strong>Progress:</strong> Highest quiz score achieved per unit.</p>
                        </div>
                        <div className="flex gap-2 md:gap-3">
                          <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg flex items-center justify-center text-yellow-600 font-bold text-[10px] md:text-xs">★</div>
                          <p className="text-[10px] md:text-[11px] text-gray-500 leading-snug"><strong>Stars:</strong> 5 Stars awarded for every unit attempted.</p>
                        </div>
                        <div className="flex gap-2 md:gap-3">
                          <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-[10px] md:text-xs">H</div>
                          <p className="text-[10px] md:text-[11px] text-gray-500 leading-snug"><strong>Hours:</strong> Calculated as 1.5hrs per unique attempt.</p>
                        </div>
                      </div>
                      <p className="mt-3 md:mt-4 text-[9px] md:text-[10px] italic text-gray-400 border-l-2 border-blue-500 pl-3">
                        Submit your quizzes in the App to sync results here automatically.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* OVERALL STATS GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-2">
              {/* 🚨 TRIAGE CODE STAT CARD */}
              <Card className="md:border md:border-gray-100 md:dark:border-gray-800 bg-white dark:bg-gray-900 md:shadow-sm md:hover:shadow-md transition-all duration-300 md:rounded-[1.5rem] overflow-hidden border-0 rounded-none border-b border-gray-100 dark:border-gray-800 md:border-b md:border-gray-100">
                <CardContent className="p-3 md:p-5 flex flex-col items-center text-center">
                  <div className={`p-2 md:p-3 rounded-xl md:rounded-2xl ${triage.bgColor} ${triage.color} mb-2 md:mb-3`}>
                    <Activity className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <span className="text-xl md:text-2xl">{triage.emoji}</span>
                    <h4 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white leading-none">
                      CODE {triage.code}
                    </h4>
                  </div>
                  <p className="text-[9px] md:text-[10px] lg:text-xs font-bold text-gray-400 uppercase tracking-tight mt-1 md:mt-2">
                    {triage.label} Status
                  </p>
                </CardContent>
              </Card>

              <StatCard
                icon={<TrendingUp className="w-4 h-4 md:w-5 md:h-5" />}
                value={`${Math.round(overallStats.totalProgress)}%`}
                label="Overall Progress"
                color="text-blue-600"
                bgColor="bg-blue-50 dark:bg-blue-900/20"
              />
              <StatCard
                icon={<Clock className="w-4 h-4 md:w-5 md:h-5" />}
                value={overallStats.totalHours}
                label="Hours Studied"
                color="text-indigo-600"
                bgColor="bg-indigo-50 dark:bg-indigo-900/20"
              />
              <StatCard
                icon={<Star className="w-4 h-4 md:w-5 md:h-5" />}
                value={`${overallStats.totalStars}`}
                label="Stars Earned"
                color="text-amber-500"
                bgColor="bg-amber-50 dark:bg-amber-900/20"
              />
            </div>
          </CardContent>

          <SimulationAndTriviaSummary user={user} />

          <Tabs defaultValue="subjects" className="space-y-2">
            <div className="flex justify-center">
              <TabsList className="bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl h-12 inline-flex border-0">
                <TabsTrigger value="subjects" className="rounded-xl px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all">
                  By Unit
                </TabsTrigger>
                <TabsTrigger value="timeline" className="rounded-xl px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all">
                  Timeline View
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="subjects" className="space-y-2 outline-none">
              {subjects.length === 0 && loading ? (
                <div className="flex flex-col justify-center items-center py-20 space-y-4">
                  <GlobalLoader />
                  <p className="text-sm font-medium text-gray-400 animate-pulse">Analysing your data...</p>
                </div>
              ) : (
                <>
                  {/* 🚨 UNIT TRIAGE SUMMARY */}
                  {subjects.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 mb-4">
                      {subjects.slice(0, 3).map((subject) => (
                        <UnitTriageBadge key={subject.id} subject={subject} />
                      ))}
                      {subjects.length > 3 && (
                        <p className="text-center text-xs text-gray-400 font-medium">
                          +{subjects.length - 3} more units
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full px-0">
                    {subjects.map((subject) => {
                      const unitTriage = getTriageCode(subject.progress, true);
                      return (
                        <Card key={subject.id} className="group relative overflow-hidden border-2 border-gray-100 dark:border-gray-900 hover:border-blue-500/50 bg-white dark:bg-gray-800 rounded-xl transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/5 flex flex-col">
                          <CardHeader className="pb-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1 max-w-[65%]">
                                <CardTitle className="text-base font-bold leading-tight group-hover:text-blue-600 transition-colors">
                                  {subject.name}
                                </CardTitle>
                                <CardDescription className="text-[10px] font-bold uppercase tracking-wider">
                                  {subject.topicsCompleted} of {subject.totalTopics} Attempts
                                </CardDescription>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <div className="flex items-center gap-0.5 text-amber-400">
                                  {renderStars(subject.rating)}
                                </div>
                                {subject.progress >= 80 && (
                                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px] font-bold border-none">
                                    MASTERED
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-6 flex-1 flex flex-col">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tighter">
                                <span className="text-gray-400">Total Mastery</span>
                                <span className="text-blue-600">{subject.progress}%</span>
                              </div>
                              <div className="relative h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${subject.progress}%` }}
                                  className={`absolute top-0 left-0 h-full rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)] ${unitTriage.code === "GREEN" ? "bg-emerald-500" :
                                    unitTriage.code === "YELLOW" ? "bg-amber-500" :
                                      "bg-red-500"
                                    }`}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 py-3 border-t border-gray-50 dark:border-gray-900">
                              <div className="text-center">
                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{subject.hoursStudied}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Hours</p>
                              </div>
                              <div className="text-center border-x border-gray-50 dark:border-gray-900">
                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{subject.topicsCompleted}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Attempts</p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{subject.rating}/5</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Rating</p>
                              </div>
                            </div>

                            {/* 🚨 TRIAGE BADGE AT BOTTOM OF CARD */}
                            <div className="mt-auto pt-2">
                              <UnitTriageBadge subject={subject} />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="outline-none">
              <Card className="rounded-xl border-0 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
                      <Award className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold tracking-tight">Learning Journey</CardTitle>
                      <CardDescription className="text-xs italic">A history of your academic breakthroughs</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="relative border-l-2 border-dashed border-gray-200 dark:border-gray-800 ml-4 space-y-12">
                    <div className="relative pl-8">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 bg-blue-500 rounded-full ring-4 ring-blue-100 dark:ring-blue-900/30 shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-600 text-[10px] font-bold">LATEST ACTIVITY</Badge>
                          <span className="text-[10px] font-bold text-gray-400">Just Now</span>
                        </div>
                        <p className="text-base font-bold text-gray-900 dark:text-white">Completed Unit Assessment</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-md">
                          Your performance has been synced to the cloud. You've earned new stars for this session!
                        </p>
                      </div>
                    </div>
                    <div className="relative pl-8 opacity-40">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 bg-gray-300 dark:bg-gray-700 rounded-full" />
                      <p className="text-sm font-bold text-gray-400 italic">Previous activity details will appear as you study...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TermsButton />
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

// Optimized SimulationAndTriviaSummary component with caching
function SimulationAndTriviaSummary({ user }) {
  const [profile, setProfile] = useState(null);
  const [streak, setStreak] = useState(0);
  const [simSummary, setSimSummary] = useState(null);
  const [triviaSummary, setTriviaSummary] = useState(null);
  const [targetInput, setTargetInput] = useState(50);
  const [savingTarget, setSavingTarget] = useState(false);
  const [isBelowTarget, setIsBelowTarget] = useState(false);
  const [simLow, setSimLow] = useState(false);
  const [triviaLow, setTriviaLow] = useState(false);

  const isMounted = useRef(true);
  const isFetching = useRef(false);
  const lastFetchTime = useRef(0);

  useEffect(() => {
    isMounted.current = true;
    const storedSim = localStorage.getItem("simSummary");
    const storedTrivia = localStorage.getItem("triviaSummary");
    if (storedSim) setSimSummary(JSON.parse(storedSim));
    if (storedTrivia) setTriviaSummary(JSON.parse(storedTrivia));

    loadProfile();

    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (profile && isMounted.current) {
      fetchSummary();
      calculateStreak();
    }
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("target_score", targetInput);
  }, [targetInput]);

  async function loadProfile() {
    if (!user) {
      setProfile({ name: "Guest", avatar_url: null, target_score: 50 });
      setTargetInput(50);
      return;
    }

    const cacheKey = `profile_summary_${user.id}`;
    if (profileCache.has(cacheKey)) {
      const cached = profileCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        setProfile(cached.data);
        setTargetInput(cached.data.target_score ?? 50);
        return;
      }
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, avatar_url, target_score")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        setProfile({ name: "Guest", avatar_url: null, target_score: 50 });
        setTargetInput(50);
        return;
      }

      setProfile(data);
      setTargetInput(data.target_score ?? 50);
      profileCache.set(cacheKey, { data, timestamp: Date.now() });
    } catch (err) {
      console.error("Error loading profile:", err);
      setProfile({ name: "Guest", avatar_url: null, target_score: 50 });
      setTargetInput(50);
    }
  }

  async function saveTarget() {
    if (!profile || !user) return;
    setSavingTarget(true);
    playSound("tap", false);

    const { error } = await supabase
      .from("profiles")
      .update({ target_score: targetInput })
      .eq("user_id", user.id);

    if (!error && isMounted.current) {
      setProfile({ ...profile, target_score: targetInput });
      const cacheKey = `profile_summary_${user.id}`;
      profileCache.delete(cacheKey);

      const popup = document.createElement("div");
      popup.className = `fixed inset-0 flex items-center justify-center bg-black/20 dark:bg-black/30 z-50`;
      const inner = document.createElement("div");
      inner.innerHTML = `<strong>New target saved: ${targetInput}%!</strong><br />Advancing nursing education and student success.`;
      inner.className = `px-6 py-4 rounded-xl shadow-lg text-center bg-white dark:bg-gray-800 text-lg font-bold zoom-popup`;
      popup.appendChild(inner);
      document.body.appendChild(popup);
      setTimeout(() => popup.remove(), 3500);
    }
    setSavingTarget(false);
  }

  async function calculateStreak() {
    if (!user) return;

    const cacheKey = `streak_${user.id}`;
    if (streakCache.has(cacheKey)) {
      const cached = streakCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) {
        setStreak(cached.data);
        return;
      }
    }

    const today = new Date();
    const day = today.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const { data: sim } = await supabase
      .from("simulation_results")
      .select("submitted_at")
      .eq("user_id", user.id);

    const { data: trivia } = await supabase
      .from("daily_trivia_results")
      .select("created_at")
      .eq("user_id", user.id);

    const allDates = [...(sim || []), ...(trivia || [])]
      .map((x) => new Date(x.submitted_at || x.created_at))
      .map(d => d.toDateString())
      .filter(dStr => new Date(dStr) >= monday);

    const uniqueDays = new Set(allDates);
    const streakCount = uniqueDays.size;

    setStreak(streakCount);
    streakCache.set(cacheKey, { data: streakCount, timestamp: Date.now() });
  }

  async function fetchSummary() {
    if (!user || isFetching.current) return;
    isFetching.current = true;

    const now = Date.now();
    if (now - lastFetchTime.current < 30000) {
      isFetching.current = false;
      return;
    }
    lastFetchTime.current = now;

    try {
      const { data: sim, error: simError } = await supabase
        .from("simulation_results")
        .select("score, total_questions")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(50);

      if (simError) throw simError;

      if (sim?.length > 0 && isMounted.current) {
        const scores = sim.map((r) => Math.round((r.score / r.total_questions) * 100));
        const summary = {
          attempts: sim.length,
          best: Math.max(...scores),
          worst: Math.min(...scores),
          average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          latest: scores[0],
        };
        setSimSummary(summary);
        localStorage.setItem("simSummary", JSON.stringify(summary));
      }

      const { data: trivia } = await supabase
        .from("daily_trivia_results")
        .select("score")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (trivia?.length > 0 && isMounted.current) {
        const TOTAL_TRIVIA_QUESTIONS = 15;
        const scores = trivia.map((t) => Math.round((t.score / TOTAL_TRIVIA_QUESTIONS) * 100));
        const summary = {
          attempts: trivia.length,
          best: Math.max(...scores),
          worst: Math.min(...scores),
          average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          latest: scores[0],
        };
        setTriviaSummary(summary);
        localStorage.setItem("triviaSummary", JSON.stringify(summary));
      } else if (isMounted.current) {
        setTriviaSummary("empty");
      }
    } catch (err) {
      console.error("Error fetching summary:", err);
    } finally {
      isFetching.current = false;
    }
  }

  const getMessage = (summary, belowTarget) => {
    if (!summary || summary === "empty") return { text: "", warning: false };
    const { latest, average } = summary;
    const target = profile?.target_score ?? 50;

    if (belowTarget)
      return {
        text: `Heads up! Your latest score (${latest}%) is below your target of ${target}%. Don't be discouraged every attempt is a chance to learn and improve. Take a moment to review the questions you missed, focus on your weak areas, and try again. You've got this! Keep pushing and you'll reach your goal.`,
        warning: true,
      };
    if (latest > average)
      return {
        text: `Nice job! Your latest score (${latest}%) is above your average (${average}%). 🎉 You're improving steadily and on the right track toward your target of ${target}%. Keep this momentum going! 💪`,
        warning: false
      };
    return {
      text: `Keep going! Your latest score (${latest}%) is a step in your learning journey. Focus, review, and aim for your target of ${target}%. Every attempt gets you closer — you're capable of reaching it! 🌟`,
      warning: false
    };
  };

  const ProgressRing = ({ value }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const safeValue = typeof value === "number" && !isNaN(value) ? value : 0;
    const offset = circumference - (safeValue / 100) * circumference;

    return (
      <div className="flex justify-center mb-3">
        <svg width="120" height="120">
          <circle stroke="#e5e7eb" fill="transparent" strokeWidth="10" r={radius} cx="60" cy="60" />
          <circle
            stroke={isBelowTarget ? "#ef4444" : "#3b82f6"}
            fill="transparent"
            strokeWidth="10"
            r={radius}
            cx="60"
            cy="60"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
          <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" className="text-xl font-bold" style={{ fill: "currentColor" }}>
            {safeValue}%
          </text>
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-2 items-stretch">
        <div className="flex-1 flex items-center gap-2 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="relative">
            <img
              src={profile?.avatar_url || "/UsersAvatar.jpg"}
              alt="avatar"
              className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-500/20 p-0.5"
              loading="lazy"
            />
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-950 rounded-full"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              {profile?.name ? `Hi, ${profile.name.split(' ')[0]}!` : "Welcome back!"}
            </h1>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Ready for today's challenge?</p>
          </div>
        </div>

        <div className="flex-[1.5] flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-blue-600 dark:bg-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-none">
          <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl border border-white/10">
            <Target className="w-5 h-5 text-blue-100" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Daily Goal</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={targetInput}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setTargetInput(val > 100 ? 100 : val < 1 ? 1 : val);
                  }}
                  className="w-12 bg-transparent border-b border-white/40 focus:border-white outline-none text-sm font-bold text-center"
                />
                <span className="text-xs font-bold">%</span>
                <button
                  onClick={saveTarget}
                  disabled={savingTarget}
                  className="ml-1 p-1 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition active:scale-90"
                >
                  {savingTarget ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-2xl font-bold">{streak}</span>
                <Flame className="w-6 h-6 text-orange-400 fill-orange-400 animate-bounce" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-tight opacity-80">Day Streak</p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-white/20" />
            <p className="hidden sm:block max-w-[140px] text-[10px] leading-tight opacity-90 font-medium">
              Don't break the chain! Complete 1 test today.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <Card className="rounded-xl border-0 shadow-xl shadow-gray-200/50 dark:shadow-none bg-white dark:bg-gray-800 overflow-hidden group">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <Award className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold tracking-tight">Mock Simulations</CardTitle>
                <CardDescription className="text-xs">Full-length NCK/NCLEX Exams</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {!simSummary || simSummary === "empty" ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-900 rounded-full mx-auto flex items-center justify-center">
                  <Search className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400 font-medium italic">No simulation data yet.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-center transform group-hover:scale-105 transition-transform duration-500">
                  <ProgressRing value={simSummary.latest} />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <StatPill label="Best" value={`${simSummary.best}%`} color="text-green-600" />
                  <StatPill label="Worst" value={`${simSummary.worst}%`} color="text-red-500" />
                  <StatPill label="Avg" value={`${simSummary.average}%`} color="text-blue-600" />
                  <StatPill label="Tries" value={simSummary.attempts} color="text-gray-900 dark:text-white" />
                </div>
                <div className={`p-4 rounded-2xl text-center text-xs font-bold leading-relaxed border
                  ${getMessage(simSummary, simLow).warning
                    ? "bg-red-50 border-red-100 text-red-600 dark:bg-red-900/10 dark:border-red-900/30"
                    : "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/10 dark:border-blue-900/30"}`}
                >
                  {getMessage(simSummary, simLow).text}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 shadow-xl shadow-gray-200/50 dark:shadow-none bg-white dark:bg-gray-800 overflow-hidden group">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-2xl">
                <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Daily Trivia</CardTitle>
                <CardDescription className="text-xs">Quick concept check tests</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {!triviaSummary || triviaSummary === "empty" ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-900 rounded-full mx-auto flex items-center justify-center">
                  <Search className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400 font-medium italic">No trivia attempts yet.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-center transform group-hover:scale-105 transition-transform duration-500">
                  <ProgressRing value={triviaSummary.latest} />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <StatPill label="Best" value={`${triviaSummary.best}%`} color="text-green-600" />
                  <StatPill label="Worst" value={`${triviaSummary.worst}%`} color="text-red-500" />
                  <StatPill label="Avg" value={`${triviaSummary.average}%`} color="text-blue-600" />
                  <StatPill label="Tries" value={triviaSummary.attempts} color="text-gray-900 dark:text-white" />
                </div>
                <div className={`p-4 rounded-2xl text-center text-xs font-bold border
                  ${getMessage(triviaSummary, triviaLow).warning
                    ? "bg-red-50 border-red-100 text-red-600 dark:bg-red-900/10 dark:border-red-900/30"
                    : "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-900/10 dark:border-amber-900/30"}`}
                >
                  {getMessage(triviaSummary, triviaLow).text}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const streakCache = new Map();

function StatPill({ label, value, color }: { label: string, value: string | number, color: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
      <span className="block text-[9px] uppercase font-bold text-gray-400 tracking-tighter">{label}</span>
      <span className={`text-xs font-bold ${color}`}>{value}</span>
    </div>
  );
}
function StatCard({ icon, value, label, color, bgColor }: any) {
  return (
    <Card className="border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-300 rounded-[1.5rem] overflow-hidden">
      <CardContent className="p-4 sm:p-5 flex flex-col items-center text-center">
        <div className={`p-3 rounded-2xl ${bgColor} ${color} mb-3`}>
          {icon}
        </div>
        <h4 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-none">
          {value}
        </h4>
        <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-tight mt-2">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}