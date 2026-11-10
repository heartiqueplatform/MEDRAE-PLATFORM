"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Search,
  Flame,
  Target,
  Star,
  BookOpen,
  Clock,
  Award,
  RefreshCw,
  Check,
  Activity,
  ChevronLeft,
} from "lucide-react";
import { playSound } from "@/lib/soundManager";
import { motion, AnimatePresence } from "framer-motion";
import { TermsButton } from "@/components/ui/TermsButton";
import { useSession } from "@supabase/auth-helpers-react";
import { TriagePopup } from "@/components/progress/TriagePopup";
import { TRIAGE_LEVELS, getTriageCode } from "@/components/progress/triageConfig";

/* ------------------------------------------------------------------ */
/*  Cache                                                             */
/* ------------------------------------------------------------------ */

const progressCache = new Map();
const profileCache = new Map();
const streakCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

const MINUTES_PER_QUESTION = 1.0;
const LOCAL_STORAGE_KEY = "study_progress_cache_v3";
const TRIAGE_POPUP_KEY = "triage_popup_shown";

if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("study_progress_cache_v2");
    localStorage.removeItem("study_progress_cache");
  } catch { }
}

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
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (p: number | number[] = 15) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};

const tap = () => {
  playSound("ui-tap");
  vibrate(12);
};

/* ------------------------------------------------------------------ */
/*  Unit row — image avatar                                           */
/* ------------------------------------------------------------------ */

function UnitRow({ subject, onOpen }: { subject: any; onOpen: () => void }) {
  const unitTriage = getTriageCode(subject.progress, true);
  const barColor =
    unitTriage.code === "GREEN"
      ? "bg-emerald-600 dark:bg-emerald-400"
      : unitTriage.code === "YELLOW"
        ? "bg-amber-500 dark:bg-amber-400"
        : unitTriage.code === "RED"
          ? "bg-rose-600 dark:bg-rose-400"
          : "bg-slate-400 dark:bg-slate-500";

  const [imgError, setImgError] = useState(false);
  const initial = (subject.name || "?")
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <button
      onClick={() => {
        tap();
        onOpen();
      }}
      className="w-full flex items-center gap-3 p-3 text-left
                 active:bg-slate-50 dark:active:bg-white/[0.04]
                 transition-colors"
      style={{ touchAction: "manipulation" }}
    >
      <div className="h-16 w-16 rounded-full overflow-hidden shrink-0
                      bg-slate-100 dark:bg-white/[0.06]
                      flex items-center justify-center relative">
        {subject.imageUrl && !imgError ? (
          <img
            src={subject.imageUrl}
            alt={subject.name}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {initial}
          </span>
        )}
        <span
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full
                      ring-2 ring-white dark:ring-[#161b22] ${barColor}`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-bold text-slate-900 dark:text-white truncate flex-1">
            {subject.name}
          </h3>
          <span className="shrink-0 inline-flex items-center gap-0.5
                           text-[10px] font-bold tabular-nums
                           text-amber-600 dark:text-amber-400">
            <Star className="h-2.5 w-2.5 fill-current" />
            {subject.rating}
          </span>
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full overflow-hidden
                          bg-slate-100 dark:bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${subject.progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`h-full rounded-full ${barColor}`}
            />
          </div>
          <span className="shrink-0 text-[10px] font-bold tabular-nums
                           text-slate-600 dark:text-slate-300 w-7 text-right">
            {subject.progress}%
          </span>
        </div>

        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
          {subject.topicsCompleted} attempt{subject.topicsCompleted === 1 ? "" : "s"}
          <span className="mx-1 opacity-60">·</span>
          {subject.hoursStudied}h studied
          {subject.progress >= 80 && (
            <>
              <span className="mx-1 opacity-60">·</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                Mastered
              </span>
            </>
          )}
        </p>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Triage banner                                                     */
/* ------------------------------------------------------------------ */

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
  const solidBg =
    (triage.color || "").split(" ")[0]?.replace(/^text-/, "bg-") || "bg-slate-400";
  const solidText = (triage.color || "").split(" ")[0] || "text-slate-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-2xl p-4 ${triage.bgColor}`}
    >
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 rounded-2xl bg-white dark:bg-[#161b22]
                        flex flex-col items-center justify-center shrink-0">
          <span className={`text-[9px] font-bold uppercase tracking-wider ${solidText}`}>
            Code
          </span>
          <span className={`text-base font-bold leading-none mt-0.5 ${solidText}`}>
            {triage.code}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <h2 className={`text-sm font-bold tracking-tight ${solidText}`}>
              {triage.label}
            </h2>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Status
            </span>
          </div>

          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-2">
            {triage.description}
          </p>

          {hasData && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <Chip icon={<Activity className="h-2.5 w-2.5" />}>
                {overallProgress}%
              </Chip>
              <Chip icon={<Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />}>
                {totalStars}
              </Chip>
              <Chip icon={<BookOpen className="h-2.5 w-2.5" />}>{totalUnits}</Chip>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => {
          tap();
          navigate(triage.actionLink);
        }}
        className={`mt-3 w-full h-10 rounded-xl ${solidBg} text-white
                    text-[12px] font-bold
                    active:scale-[0.97] transition-transform`}
        style={{ touchAction: "manipulation" }}
      >
        {triage.actionText}
      </button>
    </motion.div>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1
                     bg-white/70 dark:bg-white/[0.08]
                     text-slate-700 dark:text-slate-200
                     text-[10px] font-bold
                     px-2 py-0.5 rounded-full tabular-nums">
      {icon}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats grid                                                        */
/* ------------------------------------------------------------------ */

function StatsGrid({
  triage,
  stats,
}: {
  triage: any;
  stats: {
    totalHours: number;
    totalStars: number;
    totalProgress: number;
  };
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className={`rounded-2xl p-3 ${triage.bgColor}`}>
        <p className={`text-[10px] font-bold uppercase tracking-wider ${triage.textColor}`}>
          Triage
        </p>
        <p className={`text-2xl font-bold leading-none mt-1 tabular-nums ${triage.textColor}`}>
          {triage.code}
        </p>
        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">
          {triage.label}
        </p>
      </div>

      <div className="rounded-2xl p-3 bg-blue-50 dark:bg-blue-400/10">
        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
          Progress
        </p>
        <p className="text-2xl font-bold leading-none mt-1 tabular-nums
                      text-slate-900 dark:text-white">
          {Math.round(stats.totalProgress)}
          <span className="text-sm font-bold text-slate-400 dark:text-slate-500">%</span>
        </p>
        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">
          Overall mastery
        </p>
      </div>

      <div className="rounded-2xl p-3 bg-violet-50 dark:bg-violet-400/10">
        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">
          Hours
        </p>
        <p className="text-2xl font-bold leading-none mt-1 tabular-nums
                      text-slate-900 dark:text-white">
          {stats.totalHours.toFixed(1)}
          <span className="text-sm font-bold text-slate-400 dark:text-slate-500">h</span>
        </p>
        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">
          Time invested
        </p>
      </div>

      <div className="rounded-2xl p-3 bg-amber-50 dark:bg-amber-400/10">
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          Stars
        </p>
        <p className="text-2xl font-bold leading-none mt-1 tabular-nums
                      text-slate-900 dark:text-white">
          {stats.totalStars}
        </p>
        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">
          Units earned
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Metric guide                                                      */
/* ------------------------------------------------------------------ */

function MetricGuide({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider
                      text-slate-500 dark:text-slate-400">
          Metric guide
        </p>
        <button
          onClick={() => {
            tap();
            onToggle();
          }}
          className="text-[10px] font-bold uppercase tracking-wider
                     bg-blue-50 dark:bg-blue-400/10
                     text-blue-700 dark:text-blue-400
                     px-2 py-1 rounded-full
                     active:scale-[0.97] transition-transform"
          style={{ touchAction: "manipulation" }}
        >
          {open ? "Close" : "How?"}
        </button>
      </div>

      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
        Track your journey through core nursing units. Activity is measured across
        three indicators.
      </p>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2 mt-1 border-t border-slate-100 dark:border-white/[0.04] space-y-2">
              <GuideRow
                chip="%"
                chipClass="bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400"
                label="Progress"
                body="Highest quiz score achieved per unit."
              />
              <GuideRow
                chip="★"
                chipClass="bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400"
                label="Stars"
                body="5 stars awarded per unit, scaled by best score."
              />
              <GuideRow
                chip="h"
                chipClass="bg-violet-50 dark:bg-violet-400/10 text-violet-700 dark:text-violet-400"
                label="Hours"
                body={`Estimated at ${MINUTES_PER_QUESTION} min per question answered.`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GuideRow({
  chip,
  chipClass,
  label,
  body,
}: {
  chip: string;
  chipClass: string;
  label: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className={`h-6 w-6 rounded-lg flex items-center justify-center
                       text-[11px] font-bold shrink-0 ${chipClass}`}>
        {chip}
      </div>
      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
        <strong className="text-slate-900 dark:text-white">{label}:</strong> {body}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

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
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    tap();
    navigate("/dashboard/student", { replace: true });
  }, [navigate]);
  const isMounted = useRef(true);
  const isFetchingProgress = useRef(false);
  const lastFetchTime = useRef(0);

  const fetchProgress = useCallback(
    async (showLoader = true) => {
      if (!user || isFetchingProgress.current) return;

      const now = Date.now();
      const cacheKey = `progress_v3_${user.id}`;

      if (progressCache.has(cacheKey)) {
        const cached = progressCache.get(cacheKey);
        if (now - cached.timestamp < CACHE_DURATION && isMounted.current) {
          setSubjects(cached.subjects || []);
          setTotalStarsEarned(cached.totalStarsEarned || 0);
          setUnitsWithStats(cached.subjects || []);
          setTotalTopicsInApp(cached.totalTopicsInApp || 0);
          setHasAnyData(cached.hasAnyData || false);
          if (showLoader) setLoading(false);
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
          timestamp: cached.timestamp,
        });
        if (showLoader) setLoading(false);
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
          .select("unit, id, image_url");

        if (quizError) throw quizError;

        // ✅ Build image lookup per unit (first quiz with an image wins)
        const unitImageMap = new Map<string, string>();
        (allQuizzes || []).forEach((q) => {
          const key = q.unit || "Unknown";
          if (q.image_url && !unitImageMap.has(key)) {
            unitImageMap.set(key, q.image_url);
          }
        });

        const totalTopicsInAppCount = allQuizzes?.length || 0;
        const hasData = data && data.length > 0;

        const grouped: Record<
          string,
          { highestProgress: number; attempts: number; totalQuestions: number }
        > = {};

        data?.forEach((res) => {
          const key = res.unit || "Unknown";
          const percent =
            res.total_questions > 0
              ? (res.score / res.total_questions) * 100
              : 0;
          const qCount = res.total_questions || 0;

          if (!grouped[key]) {
            grouped[key] = {
              highestProgress: percent,
              attempts: 1,
              totalQuestions: qCount,
            };
          } else {
            grouped[key].highestProgress = Math.max(
              grouped[key].highestProgress,
              percent
            );
            grouped[key].attempts += 1;
            grouped[key].totalQuestions += qCount;
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
            imageUrl: unitImageMap.get(unitName) || null,
            progress: Math.round(stats.highestProgress),
            hoursStudied: +(
              (stats.totalQuestions * MINUTES_PER_QUESTION) /
              60
            ).toFixed(1),
            topicsCompleted: stats.attempts,
            totalTopics:
              allQuizzes?.filter((q) => q.unit === unitName).length ||
              stats.attempts,
            rating,
          };
        });

        // Sort highest progress first
        computedUnits.sort((a, b) => b.progress - a.progress);

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
    },
    [user]
  );

  useEffect(() => {
    isMounted.current = true;
    fetchProgress(true);
    return () => {
      isMounted.current = false;
    };
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
        if (user && isMounted.current) fetchProgress(false);
      }, 500);
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [user, fetchProgress]);

  const overallStats = {
    totalHours: unitsWithStats.reduce((acc, s) => acc + s.hoursStudied, 0),
    totalStars: unitsWithStats.reduce((acc, s) => acc + s.rating, 0),
    totalProgress: unitsWithStats.length
      ? Math.round(
        unitsWithStats.reduce((acc, s) => acc + s.progress, 0) /
        unitsWithStats.length
      )
      : 0,
    completedTopics: unitsWithStats.reduce(
      (acc, s) => acc + s.topicsCompleted,
      0
    ),
    totalTopics: totalTopicsInApp,
  };

  const triage = getTriageCode(overallStats.totalProgress, hasAnyData);

  const handleClosePopup = () => {
    setShowTriagePopup(false);
    localStorage.setItem(TRIAGE_POPUP_KEY, "true");
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
      <AnimatePresence>
        {showTriagePopup && (
          <TriagePopup triage={triage} onClose={handleClosePopup} />
        )}
      </AnimatePresence>

      {/* ── Header ─────────────────────────────────────── */}
      <header className="shrink-0 flex items-center gap-2 px-2 h-14
                       bg-white dark:bg-[#0d1117]
                       border-b border-slate-200/70 dark:border-white/[0.06]
                       z-30 safe-top">
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="h-10 w-10 rounded-full flex items-center justify-center
                   text-slate-700 dark:text-slate-200
                   active:bg-slate-100 dark:active:bg-white/5"
          style={{ touchAction: "manipulation" }}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold leading-tight truncate
                       text-slate-900 dark:text-white">
            Study progress
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate tabular-nums">
            {subjects.length} unit{subjects.length === 1 ? "" : "s"} ·{" "}
            {overallStats.totalStars} star{overallStats.totalStars === 1 ? "" : "s"} ·{" "}
            {overallStats.totalHours.toFixed(1)}h
          </p>
        </div>
        {triage && (
          <span
            className={`shrink-0 inline-flex items-center gap-1
                      text-[10px] font-bold uppercase tracking-wider
                      px-2 py-1 rounded-full tabular-nums ${triage.bgColor} ${triage.textColor}`}
          >
            {triage.code}
          </span>
        )}
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <div className="w-full max-w-3xl mx-auto px-4 py-4 pb-24 safe-bottom space-y-3">
          <StatsGrid triage={triage} stats={overallStats} />

          <TriageBanner
            overallProgress={overallStats.totalProgress}
            hasData={hasAnyData}
            totalStars={overallStats.totalStars}
            totalUnits={unitsWithStats.length}
          />

          <MetricGuide
            open={showProgressDescription}
            onToggle={() => setShowProgressDescription((v) => !v)}
          />

          <SimulationAndTriviaSummary user={user} />

          {/* Units section */}
          <div className="flex items-center justify-between px-1 pt-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider
                            text-slate-500 dark:text-slate-400">
                By unit
              </p>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {subjects.length} tracked unit{subjects.length === 1 ? "" : "s"}
              </h2>
            </div>
            {totalTopicsInApp > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wider
                               bg-slate-100 dark:bg-white/[0.06]
                               text-slate-500 dark:text-slate-400
                               px-2 py-1 rounded-full tabular-nums">
                {totalTopicsInApp} total
              </span>
            )}
          </div>

          {/* Triage legend */}
          {subjects.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5
                            px-3 py-2 rounded-xl
                            bg-white dark:bg-[#161b22]">
              <span className="text-[9px] font-bold uppercase tracking-wider
                               text-slate-400 dark:text-slate-500">
                Key
              </span>
              {TRIAGE_LEVELS.map((level) => {
                const dotClass =
                  (level.color || "").split(" ")[0]?.replace(/^text-/, "bg-") ||
                  "bg-slate-400";
                return (
                  <div key={level.code} className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {level.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Units list */}
          <section className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">
            {subjects.length === 0 && loading ? (
              <UnitListSkeleton />
            ) : subjects.length === 0 ? (
              <EmptyUnits />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {subjects.map((subject) => (
                  <UnitRow
                    key={subject.id}
                    subject={subject}
                    onOpen={() =>
                      navigate(`/unit/${encodeURIComponent(subject.id)}`)
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <div className="pt-2 flex justify-center">
            <TermsButton />
          </div>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Placeholder sub-components                                        */
/* ------------------------------------------------------------------ */

function UnitListSkeleton() {
  return (
    <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
          <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-white/[0.06]" />
            <div className="h-1 w-full rounded bg-slate-100 dark:bg-white/[0.06]" />
            <div className="h-2 w-1/2 rounded bg-slate-100 dark:bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyUnits() {
  return (
    <div className="p-8 text-center space-y-3">
      <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-white/[0.06]
                      flex items-center justify-center mx-auto">
        <BookOpen className="h-5 w-5 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
        No units tracked yet
      </p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[260px] mx-auto leading-relaxed">
        Complete a quiz to start tracking your progress here.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Simulation + trivia summary                                      */
/* ------------------------------------------------------------------ */

function SimulationAndTriviaSummary({ user }: { user: any }) {
  const [profile, setProfile] = useState<any>(null);
  const [streak, setStreak] = useState(0);
  const [simSummary, setSimSummary] = useState<any>(null);
  const [triviaSummary, setTriviaSummary] = useState<any>(null);
  const [targetInput, setTargetInput] = useState(50);
  const [savingTarget, setSavingTarget] = useState(false);
  const [simLow] = useState(false);
  const [triviaLow] = useState(false);

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

    return () => {
      isMounted.current = false;
    };
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
    } catch {
      setProfile({ name: "Guest", avatar_url: null, target_score: 50 });
      setTargetInput(50);
    }
  }

  async function saveTarget() {
    if (!profile || !user) return;
    setSavingTarget(true);
    tap();
    const { error } = await supabase
      .from("profiles")
      .update({ target_score: targetInput })
      .eq("user_id", user.id);

    if (!error && isMounted.current) {
      setProfile({ ...profile, target_score: targetInput });
      profileCache.delete(`profile_summary_${user.id}`);
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
    const diff = day === 0 ? -6 : 1 - day;
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
      .map((d) => d.toDateString())
      .filter((dStr) => new Date(dStr) >= monday);

    const streakCount = new Set(allDates).size;
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
      const { data: sim } = await supabase
        .from("simulation_results")
        .select("score, total_questions")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(50);

      if (sim && sim.length > 0 && isMounted.current) {
        const scores = sim.map((r: any) =>
          Math.round((r.score / r.total_questions) * 100)
        );
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

      if (trivia && trivia.length > 0 && isMounted.current) {
        const TOTAL_TRIVIA = 15;
        const scores = trivia.map((t: any) =>
          Math.round((t.score / TOTAL_TRIVIA) * 100)
        );
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

  const getMessage = (summary: any, belowTarget: boolean) => {
    if (!summary || summary === "empty") return { text: "", warning: false };
    const { latest, average } = summary;
    const target = profile?.target_score ?? 50;

    if (belowTarget)
      return {
        text: `Heads up — latest score (${latest}%) is below your target of ${target}%. Review what you missed and try again. You've got this.`,
        warning: true,
      };
    if (latest > average)
      return {
        text: `Nice — latest score (${latest}%) beat your average (${average}%). You're on track toward ${target}%. Keep the momentum.`,
        warning: false,
      };
    return {
      text: `Keep going — latest score (${latest}%) is a step toward your ${target}% target. Every attempt gets you closer.`,
      warning: false,
    };
  };

  return (
    <div className="space-y-3">
      {/* Profile + streak row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <div className="flex items-center gap-3 p-3 rounded-2xl
                        bg-white dark:bg-[#161b22]">
          <div className="relative shrink-0">
            <img
              src={profile?.avatar_url || "/UsersAvatar.jpg"}
              alt="avatar"
              className="h-16 w-16 rounded-full object-cover
                         ring-2 ring-slate-200 dark:ring-white/[0.08]"
              loading="lazy"
            />
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full
                             bg-emerald-500 ring-2 ring-white dark:ring-[#161b22]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
              {profile?.name ? `Hi, ${profile.name.split(" ")[0]}` : "Welcome"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Ready for today's challenge?
            </p>
          </div>
        </div>

        <div className="rounded-2xl p-3 bg-blue-600 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Target className="h-4 w-4 shrink-0" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                  Daily goal
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={targetInput}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setTargetInput(v > 100 ? 100 : v < 1 ? 1 : v);
                    }}
                    className="w-10 bg-transparent border-b border-white/40
                               focus:border-white outline-none
                               text-sm font-bold text-center tabular-nums"
                  />
                  <span className="text-[11px] font-bold">%</span>
                  <button
                    onClick={saveTarget}
                    disabled={savingTarget}
                    className="h-6 w-6 rounded-md bg-white text-blue-600
                               flex items-center justify-center
                               active:scale-[0.92] transition-transform
                               disabled:opacity-60"
                    style={{ touchAction: "manipulation" }}
                  >
                    {savingTarget ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" strokeWidth={3} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="flex items-center justify-end gap-1">
                <span className="text-xl font-bold tabular-nums">{streak}</span>
                <Flame className="h-4 w-4 text-orange-300 fill-orange-300" />
              </div>
              <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                Day streak
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-2 md:grid-cols-2">
        <SummaryCard
          tone="blue"
          icon={<Award className="h-4 w-4" />}
          title="Mock simulations"
          subtitle="NCK / NCLEX exams"
          summary={simSummary}
          empty="No simulation data yet"
          emptyBody="Complete a full-length mock to see stats."
          getMessage={(s) => getMessage(s, simLow)}
        />
        <SummaryCard
          tone="amber"
          icon={<Star className="h-4 w-4 fill-current" />}
          title="Daily trivia"
          subtitle="Quick concept checks"
          summary={triviaSummary}
          empty="No trivia attempts yet"
          emptyBody="Try a 15-question trivia round to start."
          getMessage={(s) => getMessage(s, triviaLow)}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary card                                                      */
/* ------------------------------------------------------------------ */

function SummaryCard({
  tone,
  icon,
  title,
  subtitle,
  summary,
  empty,
  emptyBody,
  getMessage,
}: {
  tone: "blue" | "amber";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  summary: any;
  empty: string;
  emptyBody: string;
  getMessage: (s: any) => { text: string; warning: boolean };
}) {
  const tones = {
    blue: {
      chip: "bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400",
      ring: "stroke-blue-600 dark:stroke-blue-400",
      track: "stroke-slate-200 dark:stroke-white/[0.06]",
    },
    amber: {
      chip: "bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400",
      ring: "stroke-amber-500 dark:stroke-amber-400",
      track: "stroke-slate-200 dark:stroke-white/[0.06]",
    },
  } as const;
  const t = tones[tone];

  return (
    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${t.chip}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none mb-1">
            {subtitle}
          </p>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
            {title}
          </h3>
        </div>
      </div>

      {!summary || summary === "empty" ? (
        <div className="py-6 text-center">
          <div className="h-10 w-10 rounded-full mx-auto mb-2
                          bg-slate-100 dark:bg-white/[0.06]
                          flex items-center justify-center">
            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
            {empty}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-[220px] mx-auto leading-snug">
            {emptyBody}
          </p>
        </div>
      ) : (
        <>
          <div className="flex justify-center">
            <Ring
              value={summary.latest}
              ringClass={t.ring}
              trackClass={t.track}
            />
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <Mini label="Best" value={`${summary.best}%`} tone="emerald" />
            <Mini label="Worst" value={`${summary.worst}%`} tone="rose" />
            <Mini label="Avg" value={`${summary.average}%`} tone="blue" />
            <Mini label="Tries" value={summary.attempts} tone="neutral" />
          </div>

          <div
            className={`rounded-xl p-3 text-[11px] font-medium leading-relaxed
              ${getMessage(summary).warning
                ? "bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-300"
                : "bg-slate-50 dark:bg-[#0d1117] text-slate-600 dark:text-slate-400"
              }`}
          >
            {getMessage(summary).text}
          </div>
        </>
      )}
    </section>
  );
}

function Ring({
  value,
  ringClass,
  trackClass,
}: {
  value: number;
  ringClass: string;
  trackClass: string;
}) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const safeValue = typeof value === "number" && !isNaN(value) ? value : 0;
  const offset = circumference - (safeValue / 100) * circumference;

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle
        className={trackClass}
        fill="transparent"
        strokeWidth="10"
        r={radius}
        cx="60"
        cy="60"
      />
      <circle
        className={ringClass}
        fill="transparent"
        strokeWidth="10"
        r={radius}
        cx="60"
        cy="60"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text
        x="60"
        y="66"
        textAnchor="middle"
        fontSize="20"
        fontWeight="700"
        className="fill-slate-900 dark:fill-white"
      >
        {safeValue}%
      </text>
    </svg>
  );
}

function Mini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "emerald" | "rose" | "blue" | "neutral";
}) {
  const tones = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    rose: "text-rose-600 dark:text-rose-400",
    blue: "text-blue-600 dark:text-blue-400",
    neutral: "text-slate-900 dark:text-white",
  } as const;
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-2 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wider
                    text-slate-500 dark:text-slate-400 leading-none mb-1">
        {label}
      </p>
      <p className={`text-[11px] font-bold tabular-nums ${tones[tone]}`}>
        {value}
      </p>
    </div>
  );
}