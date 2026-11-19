import {
  Crown, Newspaper, ChevronRight, ArrowRight, Star, Trophy, BookOpen,
} from "lucide-react";
import { CenteredModal } from "@/components/ui/CenteredModal";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Referral from "@/components/Referral";
import { TermsButton } from "@/components/ui/TermsButton";

import { DeferredMount } from "@/components/DeferredMount";
import StudentFilters, { type StudentFilter } from "@/components/student/StudentFilters";
import StudentSections from "@/components/student/StudentSections";
import StudentCommunityCards from "@/components/student/StudentCommunityCards";

/* ============================================================
   Rank Celebration Overlay (unchanged)
   ============================================================ */
const RankCelebrationOverlay = ({ rank, name, onClose, navigate }: any) => {
  const rankConfig: any = {
    1: {
      title: "TOP STUDENT!",
      subtitle: "You're 1 on the Leaderboard!",
      message: `Amazing work ${name}! You've reached the highest rank. Keep inspiring others with your dedication!`,
      gradient: "from-yellow-500 via-amber-500 to-yellow-500",
      icon: <Crown className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-400" />,
      confettiColors: ["#FFD700", "#FFA500", "#FFE44D"],
    },
    2: {
      title: "SILVER STAR!",
      subtitle: "You're Rank 2!",
      message: `Excellent progress ${name}! You're climbing fast. Just one more step to the top!`,
      gradient: "from-slate-400 via-gray-500 to-slate-400",
      icon: <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300" />,
      confettiColors: ["#C0C0C0", "#E8E8E8", "#A9A9A9"],
    },
    3: {
      title: "BRONZE ACHIEVER!",
      subtitle: "You're Rank 3!",
      message: `Great job ${name}! You've made it to the podium. Keep pushing forward!`,
      gradient: "from-amber-700 via-orange-700 to-amber-700",
      icon: <Medal className="w-12 h-12 sm:w-16 sm:h-16 text-amber-600" />,
      confettiColors: ["#CD7F32", "#D4A55A", "#B87333"],
    },
  };

  const config = rankConfig[rank];
  if (!config) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/80"
      onClick={onClose}
      style={{ padding: "16px", overflow: "auto", WebkitOverflowScrolling: "touch" }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full animate-confetti"
            style={{
              backgroundColor: config.confettiColors[i % config.confettiColors.length],
              left: `${(i * 8.33) % 100}%`,
              animationDelay: `${(i * 0.25) % 3}s`,
              animationDuration: `${3 + (i % 3)}s`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.25, ease: "easeOut" }}
        className="relative w-full max-w-[92%] sm:max-w-md"
        style={{ margin: "auto" }}
      >
        <div className={`relative bg-gradient-to-br ${config.gradient} rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-0`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, duration: 0.2, ease: "easeOut" }}
            className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6"
          >
            <Star className="w-8 h-8 sm:w-12 sm:h-12 text-yellow-300 fill-yellow-300" />
          </motion.div>

          <div className="text-center space-y-3 sm:space-y-4">
            <div className="flex justify-center">{config.icon}</div>
            <div className="space-y-0.5 sm:space-y-1">
              <h2 className="text-xl sm:text-2xl text-white px-2">{config.title}</h2>
              <p className="text-sm sm:text-lg font-bold text-white/90 px-2">{config.subtitle}</p>
            </div>
            <p className="text-white/90 text-xs sm:text-sm leading-relaxed px-1">{config.message}</p>
            <div className="flex flex-col gap-2 pt-2 sm:pt-3">
              <Button
                onClick={onClose}
                className="w-full bg-white/20 hover:bg-white/30 text-white border-0 font-bold text-xs sm:text-sm py-2 px-3"
              >
                Continue Studying
              </Button>
              <Button
                onClick={() => { onClose(); navigate("/Medrae-quizzes"); }}
                className="w-full bg-white hover:bg-white/90 text-slate-900 font-bold text-xs sm:text-sm py-2 px-3 border-0"
              >
                Improve My Rank <ArrowRight className="w-3 h-3 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
        <p className="text-center text-white/60 text-[10px] sm:text-xs mt-2 sm:mt-3">
          Tap anywhere to continue
        </p>
      </motion.div>
    </motion.div>
  );
};

const Medal = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L15 8.5L22 9.5L17 14L18.5 21L12 17.5L5.5 21L7 14L2 9.5L9 8.5L12 2Z" />
  </svg>
);

/* ============================================================
   Synchronous cache loader (unchanged)
   ============================================================ */
const getInitialCache = () => {
  if (typeof window === "undefined") return {};
  try {
    const savedData = localStorage.getItem("dashboardData");
    if (savedData) {
      const parsed = JSON.parse(savedData);
      try {
        const rawLeaderboard = localStorage.getItem("leaderboard_fast");
        if (rawLeaderboard) {
          const lb = JSON.parse(rawLeaderboard);
          const lbData = Array.isArray(lb) ? lb : lb?.data;
          if (Array.isArray(lbData)) parsed.topStudents = lbData;
        }
      } catch { }
      return parsed;
    }
  } catch { }

  const result: any = {};
  try {
    const cachedSims = localStorage.getItem("simulationPapers");
    if (cachedSims) result.simulationPapers = JSON.parse(cachedSims);
  } catch { }
  try {
    const raw = localStorage.getItem("leaderboard_fast");
    if (raw) {
      const parsed = JSON.parse(raw);
      const data = Array.isArray(parsed) ? parsed : parsed?.data;
      const ts = Array.isArray(parsed) ? 0 : (parsed?.ts ?? 0);
      if (Array.isArray(data) && Date.now() - ts < 60000) result.topStudents = data;
    }
  } catch { }
  try {
    const s = localStorage.getItem("streakData");
    if (s) { const p = JSON.parse(s); result.studyStreak = p.currentStreak || 0; result.bestStreak = p.bestStreak || 0; }
  } catch { }
  try { const q = localStorage.getItem("quizCount"); if (q) result.quizCount = JSON.parse(q); } catch { }
  try { const p = localStorage.getItem("dashboard_study_progress"); if (p) result.studyProgress = JSON.parse(p); } catch { }
  try { const r = localStorage.getItem("quick_duel_history_v2"); if (r) { const p = JSON.parse(r); if (p?.d) result.quickDuelHistory = p.d; } } catch { }
  try { const r = localStorage.getItem("quick_duel_players_v2"); if (r) { const p = JSON.parse(r); if (p?.d) result.quickDuelPlayers = p.d; } } catch { }
  try { const c = localStorage.getItem("userProfile"); if (c) result.profileState = JSON.parse(c); } catch { }
  return result;
};

const LEADERBOARD_KEY = "leaderboard_fast";
const readLeaderboardCache = (): { data: any[]; ts: number } | null => {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const data = Array.isArray(parsed) ? parsed : parsed?.data;
    const ts = Array.isArray(parsed) ? 0 : (parsed?.ts ?? 0);
    if (!Array.isArray(data)) return null;
    return { data, ts };
  } catch { return null; }
};
const writeLeaderboardCache = (data: any[]) => {
  try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify({ data, ts: Date.now() })); } catch { }
};

/* ============================================================
   StudentDashboard
   ============================================================ */
export default function StudentDashboard() {
  const navigate = useNavigate();
  const user = useUser();
  const initialCache = getInitialCache();

  // ─── Shared state ───
  const [name, setName] = useState<string | null>(() =>
    initialCache.profileState?.name?.split(" ")[0] ?? null
  );
  const [profileState, setProfileState] = useState<any | null>(initialCache.profileState ?? null);
  const [studyProgress, setStudyProgress] = useState<number | null>(initialCache.studyProgress ?? null);
  const [quizCount, setQuizCount] = useState<number | null>(initialCache.quizCount ?? null);
  const [studyStreak, setStudyStreak] = useState<number | null>(initialCache.studyStreak ?? null);
  const [bestStreak, setBestStreak] = useState<number | null>(initialCache.bestStreak ?? null);
  const [feedsAttemptCount, setFeedsAttemptCount] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showRankCelebration, setShowRankCelebration] = useState(false);
  const [newRank, setNewRank] = useState<number | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);

  const [simulationPapers, setSimulationPapers] = useState<any[]>(initialCache.simulationPapers ?? []);
  const [simulationProgress, setSimulationProgress] = useState<Record<string, number>>({});
  const [cachedSimulationPapers, setCachedSimulationPapers] = useState<any[]>(initialCache.simulationPapers ?? []);
  const [topStudents, setTopStudents] = useState<any[]>(initialCache.topStudents ?? []);
  const [loadingTopStudents, setLoadingTopStudents] = useState(
    () => !initialCache.topStudents || initialCache.topStudents.length === 0
  );
  const [leaderboardUpdatedAt, setLeaderboardUpdatedAt] = useState<number | null>(null);

  // ─── Filter ───
  const [activeFilter, setActiveFilter] = useState<string | null>("all");
  const handleFilterChange = useCallback((filter: StudentFilter) => {
    if (navigator.vibrate) navigator.vibrate(10);
    if (activeFilter === filter.id) {
      setActiveFilter("all");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setActiveFilter(filter.id);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }, [activeFilter]);

  // ─── Refs ───
  const isLoadingDashboard = useRef(false);
  const userRankPrevious = useRef<number | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // ─── Fetch functions (all unchanged) ───
  const fetchFeedsAttemptCount = useCallback(async () => {
    if (!user?.id) return;
    const { count, error } = await supabase
      .from("quiz_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (!error && count !== null) setFeedsAttemptCount(count);
  }, [user?.id]);

  const fetchQuizCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.from("quiz_results").select("unit, score").eq("user_id", user.id);
      if (error || !data) return;
      const grouped: Record<string, any[]> = {};
      data.forEach((res) => { const k = res.unit || "Unknown"; (grouped[k] ||= []).push(res); });
      const validUnits = Object.keys(grouped).filter((u) => {
        const a = grouped[u];
        const last = a[a.length - 1];
        return last?.score && last.score > 0;
      });
      setQuizCount(validUnits.length);
      localStorage.setItem("quizCount", JSON.stringify(validUnits.length));
    } catch (err) { console.error("Error fetching quiz count:", err); }
  }, [user?.id]);

  const fetchProgress = useCallback(async () => {
    if (!user?.id) return;
    const { data: results, error } = await supabase
      .from("quiz_results").select("unit, score, total_questions").eq("user_id", user.id);
    if (error || !results) return;
    if (results.length === 0) {
      setStudyProgress(0);
      localStorage.setItem("dashboard_study_progress", JSON.stringify(0));
      return;
    }
    const grouped: Record<string, number> = {};
    results.forEach((res) => {
      const unit = res.unit || "Unknown";
      const pct = res.total_questions > 0 ? (res.score / res.total_questions) * 100 : 0;
      grouped[unit] = grouped[unit] ? Math.max(grouped[unit], pct) : pct;
    });
    const vals = Object.values(grouped);
    const overall = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    setStudyProgress(overall);
    localStorage.setItem("dashboard_study_progress", JSON.stringify(overall));
  }, [user?.id]);

  const updateBestStreakIfNeeded = useCallback(async (current: number) => {
    const { data, error } = await supabase
      .from("login_activity").select("streak").eq("user_id", user.id)
      .order("streak", { ascending: false }).limit(1);
    let historicalBest = 0;
    if (!error && data && data.length > 0) historicalBest = data[0].streak || 0;
    const finalBest = Math.max(current, historicalBest);
    setBestStreak(finalBest);
    localStorage.setItem("streakData", JSON.stringify({ currentStreak: current, bestStreak: finalBest }));
  }, [user?.id]);

  const handleLoginAndStreak = useCallback(async () => {
    if (!user?.id) return;
    const deviceId = localStorage.getItem("device_id");
    await supabase.rpc("handle_user_heartbeat", { p_user_id: user.id, p_device_id: deviceId || "" });
    const { data, error } = await supabase
      .from("login_activity").select("streak").eq("user_id", user.id)
      .order("login_date", { ascending: false }).limit(1).single();
    if (!error && data) {
      const newStreak = data.streak || 0;
      setStudyStreak(newStreak);
      updateBestStreakIfNeeded(newStreak);
    }
  }, [user?.id, updateBestStreakIfNeeded]);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (!error && data) {
      if (data.name) setName(data.name.split(" ")[0]);
      setProfileState(data);
      localStorage.setItem("userProfile", JSON.stringify(data));
    }
  }, [user?.id]);

  const fetchSimulationPapers = useCallback(async () => {
    const CACHE_KEY = "simulation_papers_v3";
    const CACHE_DURATION = 15 * 60 * 1000;
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setSimulationPapers(data);
          setCachedSimulationPapers(data);
          return;
        }
      } catch { }
    }
    try {
      const { data: papers, error: paperError } = await supabase
        .from("simulation_papers")
        .select("id, title, description, course, block, is_free, created_at, duration, image_url")
        .eq("is_active", true).order("created_at", { ascending: false });
      if (paperError) throw paperError;
      if (!papers) return;
      const { data: results, error: resultsError } = await supabase
        .from("simulation_results").select("paper_id, score, total_questions").eq("user_id", user.id);
      if (resultsError) throw resultsError;
      const progressMap: Record<string, number> = {};
      const attemptCountMap: Record<string, number> = {};
      papers.forEach((paper) => {
        const pr = results?.filter((r) => r.paper_id === paper.id) || [];
        attemptCountMap[paper.id] = pr.length;
        if (pr.length > 0) {
          const highest = Math.max(...pr.map((r) => r.score));
          const total = paper.total_questions || 10;
          progressMap[paper.id] = Math.round((highest / total) * 100);
        } else {
          progressMap[paper.id] = 0;
        }
      });
      setSimulationProgress(progressMap);
      const withAttempts = papers.map((p) => ({ ...p, attempt_count: attemptCountMap[p.id] || 0 }));
      setSimulationPapers(withAttempts);
      setCachedSimulationPapers(withAttempts);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: withAttempts, timestamp: Date.now() }));
    } catch { console.log("Simulation papers: offline mode"); }
  }, [user?.id]);

  const fetchTopStudents = useCallback(async () => {
    if (!user?.id) return;
    const cached = readLeaderboardCache();
    if (cached && cached.data.length > 0) {
      setTopStudents(cached.data);
      setLeaderboardUpdatedAt(cached.ts);
    } else {
      setLoadingTopStudents(true);
    }
    try {
      const { data, error } = await supabase.rpc("get_leaderboard_v2");
      if (error) throw error;
      if (Array.isArray(data)) {
        setTopStudents(data);
        writeLeaderboardCache(data);
        setLeaderboardUpdatedAt(Date.now());
        try {
          const dd = localStorage.getItem("dashboardData");
          if (dd) { const p = JSON.parse(dd); p.topStudents = data; localStorage.setItem("dashboardData", JSON.stringify(p)); }
        } catch { }
        if (data.length > 0) {
          const myIdx = data.findIndex((s: any) => s.userid === user.id);
          const myRank = myIdx !== -1 ? myIdx + 1 : null;
          if (myRank && myRank <= 3 && myRank !== userRankPrevious.current) {
            setNewRank(myRank);
            setShowRankCelebration(true);
            userRankPrevious.current = myRank;
          }
        }
      }
    } catch (err) { console.error("Leaderboard Error:", err); }
    finally { setLoadingTopStudents(false); }
  }, [user?.id]);

  const handleOpenDialog = useCallback(() => {
    if (!user?.id) return;
    setOverlayOpen(true);
    fetchTopStudents();
  }, [user?.id, fetchTopStudents]);

  const loadDashboardData = useCallback(async () => {
    if (!user?.id || isLoadingDashboard.current) return;
    isLoadingDashboard.current = true;
    try {
      await Promise.allSettled([
        fetchProfile(), handleLoginAndStreak(), fetchProgress(),
        fetchSimulationPapers(), fetchQuizCount(), fetchFeedsAttemptCount(),
      ]);
      localStorage.setItem("dashboardData", JSON.stringify({
        name, studyProgress, quizCount, studyStreak, bestStreak, topStudents, profileState,
      }));
      localStorage.setItem("last_dashboard_fetch", Date.now().toString());
    } catch { console.log("Offline mode - cached data displayed"); }
    finally { isLoadingDashboard.current = false; }
  }, [user?.id, fetchProfile, handleLoginAndStreak, fetchProgress, fetchSimulationPapers, fetchQuizCount, fetchFeedsAttemptCount]);

  // ─── Effects ───
  useEffect(() => { if (user?.id) loadDashboardData(); }, [user?.id]);
  useEffect(() => {
    if (!user?.id) return;
    const id = setInterval(() => { if (!document.hidden) loadDashboardData(); }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [user?.id, loadDashboardData]);
  useEffect(() => {
    if (!user?.id) return;
    fetchTopStudents();
    const id = setInterval(() => { if (!document.hidden) fetchTopStudents(); }, 60 * 1000);
    const onFocus = () => { if (!document.hidden) fetchTopStudents(); };
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleSmoothNavigate = useCallback((url: string, scrollToTop = true) => {
    if (navigator.vibrate) navigator.vibrate(10);
    if (scrollToTop) window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => navigate(url), 50);
  }, [navigate]);

  // ─── Render ───
  return (
    <div
      ref={dashboardRef}
      className="dashboard-no-select min-h-screen md:flex md:items-center md:justify-center bg-[var(--card-bg)] dark:bg-[var(--card-bg-dark)] w-full"
      style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
    >
      <AnimatePresence>
        {showRankCelebration && newRank && (
          <RankCelebrationOverlay
            rank={newRank}
            name={profileState?.name?.split(" ")[0] || "Learner"}
            onClose={() => setShowRankCelebration(false)}
            navigate={navigate}
          />
        )}
      </AnimatePresence>

      <Referral />

      <div className="w-full space-y-2 md:px-4 lg:px-6">
        <StudentFilters activeId={activeFilter} onChange={handleFilterChange} />

        {/* ✅ ALL filterable sections including Proctorium now live inside StudentSections */}
        <StudentSections
          activeFilter={activeFilter}
          user={user}
          initialCache={initialCache}
          profileState={profileState}
          topStudents={topStudents}
          loadingTopStudents={loadingTopStudents}
          setSelectedUserId={setSelectedUserId}
          selectedUserId={selectedUserId}
          simulationPapers={cachedSimulationPapers}
          simulationProgress={simulationProgress}
          onOpenPaper={(id) => handleSmoothNavigate(`/simulation/${id}`)}
        />

        <StudentCommunityCards />

        <TermsButton />
      </div>

      {/* ─── Floating Leaderboard FAB ─── */}
      <div className={cn(
        "fixed z-30 right-4",
        "max-md:bottom-[calc(60px+env(safe-area-inset-bottom,0px)+32px)]",
        "md:bottom-8 md:right-5"
      )}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          onClick={() => { if (navigator.vibrate) navigator.vibrate(40); handleOpenDialog(); }}
          aria-label="Open leaderboard"
          className={cn(
            "group flex items-center justify-center rounded-full",
            "w-14 h-14 p-0 md:w-auto md:h-auto md:min-w-[110px] md:pl-3 md:pr-4 md:py-2.5",
            "gap-0 md:gap-2 bg-amber-500 hover:bg-amber-600 text-white",
            "ring-1 ring-amber-400/50 hover:ring-amber-400/70",
            "dark:bg-amber-500 dark:hover:bg-amber-600",
            "shadow-lg shadow-amber-500/30 dark:shadow-amber-900/40",
            "transition-colors duration-300 ease-out",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          )}
        >
          <span className="relative flex items-center justify-center rounded-full w-full h-full md:w-7 md:h-7 md:bg-white/15 text-white">
            {topStudents.length > 0 ? (
              <Crown className="w-6 h-6 md:w-4 md:h-4 text-white" strokeWidth={2.2} />
            ) : (
              <Trophy className="w-6 h-6 md:w-4 md:h-4 text-white/85" strokeWidth={2.2} />
            )}
          </span>
          <span className="hidden md:inline text-sm font-semibold text-white">Best</span>
        </motion.button>
      </div>

      {/* ─── Leaderboard Modal ─── */}
      <CenteredModal open={overlayOpen} onClose={() => setOverlayOpen(false)} maxWidthClass="max-w-md">
        <div className="px-5 pt-2 pb-8">
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
              <Newspaper className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Quizzes Bank Insights
            </h2>
          </div>

          <div className="space-y-5">
            <p className="text-sm text-center text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              "Practice makes permanent. Engage with the community Quizzes Bank(Q.B) to climb the ranks."
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex flex-col items-center text-center">
                <BookOpen className="w-4 h-4 text-slate-400 mb-2" />
                <span className="text-[10px] font-bold text-slate-500 tracking-wider">Your Feed Attempts</span>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{feedsAttemptCount}</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 flex flex-col items-center text-center">
                <Trophy className="w-4 h-4 text-amber-500 mb-2" />
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tracking-wider">Current Leader</span>
                {loadingTopStudents ? (
                  <div className="mt-2 flex flex-col items-center animate-pulse">
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded mt-1" />
                  </div>
                ) : topStudents.length > 0 ? (
                  <div className="mt-2 flex flex-col items-center">
                    <img
                      src={topStudents[0].avatar_url || "/UsersAvatar.jpg"}
                      className="h-10 w-10 rounded-full border-2 border-white dark:border-slate-800 object-cover"
                      alt="Leader"
                      loading="lazy"
                    />
                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-1 truncate max-w-[80px]">
                      {topStudents[0].name.split(" ")[0]}
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-col items-center">
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded mt-1" />
                  </div>
                )}
              </div>
            </div>

            {loadingTopStudents ? (
              <div className="flex items-center justify-center">
                <div className="h-8 w-40 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
              </div>
            ) : topStudents.length > 0 ? (
              <div className="flex items-center justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded-full">
                  <Crown className="w-3.5 h-3.5 fill-current" />
                  <span className="text-xs font-bold tracking-tight">Top Performer This Week</span>
                </div>
              </div>
            ) : null}

            {leaderboardUpdatedAt && (
              <p className="text-center text-[10px] text-slate-400 font-bold tracking-widest">
                Updated {formatDistanceToNow(leaderboardUpdatedAt)} ago
              </p>
            )}

            <div className="pt-1">
              <Button
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(50);
                  navigate("/Medrae-quizzes");
                  setOverlayOpen(false);
                }}
              >
                Start Quizzing <ChevronRight className="w-4 h-4" />
              </Button>
              <p className="text-center text-[10px] text-slate-400 font-bold tracking-widest mt-4">
                Complete Units to Climb the Leaderboard
              </p>
              <p className="text-center text-[10px] text-slate-400 font-bold tracking-widest mt-2">
                Medrae Community Hub
              </p>
            </div>
          </div>
        </div>
      </CenteredModal>
    </div>
  );
}