import {
  Users, Crown, Newspaper, ChevronRight, Laptop, Lightbulb, ArrowRight, Layout,
  Brain, Calendar, MessageCircle, Target, TrendingUp,
  Star, Clock, BookOpen, Trophy, ListChecks,
  MapPin,
  School,
  X,
  Globe,
  ChevronUp,
  Camera,
  ChevronDown,
  User
} from "lucide-react";
import Cropper from "react-easy-crop";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import CardMarquee from '@/components/CardMarquee';
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle
} from "@/components/ui/card";
import GreetingsCard from "@/components/GreetingsCard";
import { Button } from "@/components/ui/button";
import { toast as sonnerToast } from "sonner";
import { DailyTriviaCard } from "@/components/TopStudentsPanel";
import CountdownFloating from "@/components/CountdownFloating";
import FloatingQuickActions from "@/components/FloatingQuickActions";
import { UnitBreakdown } from "@/components/UnitBreakdown";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Link, useNavigate } from 'react-router-dom';
import { Send, Trash2 } from "lucide-react";
import DailyImagesTrivia from "@/components/DailyImagesTrivia";
import FeedSeenTop10 from "@/components/FeedSeenTop10";
import Referral from "@/components/Referral";
import { UserProfileModal } from "@/components/UserProfileModal";
import TutorsList from "@/components/student/TutorsList";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import DailyStatus from "@/components/DailyStatus";
import { TermsButton } from "@/components/ui/TermsButton";
import Algorithm from "@/components/Algorithm/Algorithm";
import { TotalAttemptsCard } from "@/components/curriculum/TotalAttemptsCard";
import Stories from "@/components/stories/Stories";

const RankCelebrationOverlay = ({ rank, name, onClose, navigate }) => {
  const rankConfig = {
    1: {
      title: "TOP STUDENT!",
      subtitle: "You're 1 on the Leaderboard!",
      message: `Amazing work ${name}! You've reached the highest rank. Keep inspiring others with your dedication!`,
      gradient: "from-yellow-500 via-amber-500 to-yellow-500",
      icon: <Crown className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-400" />,
      bgGlow: "bg-yellow-500/20",
      confettiColors: ["#FFD700", "#FFA500", "#FFE44D"]
    },
    2: {
      title: "SILVER STAR!",
      subtitle: "You're Rank 2!",
      message: `Excellent progress ${name}! You're climbing fast. Just one more step to the top!`,
      gradient: "from-slate-400 via-gray-500 to-slate-400",
      icon: <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300" />,
      bgGlow: "bg-slate-400/20",
      confettiColors: ["#C0C0C0", "#E8E8E8", "#A9A9A9"]
    },
    3: {
      title: "BRONZE ACHIEVER!",
      subtitle: "You're Rank 3!",
      message: `Great job ${name}! You've made it to the podium. Keep pushing forward!`,
      gradient: "from-amber-700 via-orange-700 to-amber-700",
      icon: <Medal className="w-12 h-12 sm:w-16 sm:h-16 text-amber-600" />,
      bgGlow: "bg-amber-600/20",
      confettiColors: ["#CD7F32", "#D4A55A", "#B87333"]
    }
  };

  const config = rankConfig[rank];
  if (!config) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={onClose}
      style={{
        padding: '16px',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {typeof window !== 'undefined' && [...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
              y: -100,
              scale: Math.random() * 0.5 + 0.3,
            }}
            animate={{
              y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 100,
              rotate: 360,
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
            className="absolute w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full"
            style={{
              backgroundColor: config.confettiColors[Math.floor(Math.random() * config.confettiColors.length)],
              left: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: "spring", damping: 25 }}
        className="relative w-full max-w-[92%] sm:max-w-md"
        style={{ margin: 'auto' }}
      >
        <div className={`absolute -inset-2 sm:-inset-4 rounded-2xl sm:rounded-3xl ${config.bgGlow} blur-xl sm:blur-2xl animate-pulse`} />

        <div className={`relative bg-gradient-to-br ${config.gradient} rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/20`}>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6"
          >
            <div className="relative">
              <Star className="w-8 h-8 sm:w-12 sm:h-12 text-yellow-300 fill-yellow-300" />
              <Star className="absolute top-0 left-0 w-8 h-8 sm:w-12 sm:h-12 text-yellow-200 animate-ping opacity-50" />
            </div>
          </motion.div>

          <div className="text-center space-y-3 sm:space-y-4">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 1, repeatType: "reverse" }}
              className="flex justify-center"
            >
              {config.icon}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-0.5 sm:space-y-1"
            >
              <h2 className="text-xl sm:text-2xl font-black text-white px-2">
                {config.title}
              </h2>
              <p className="text-sm sm:text-lg font-bold text-white/90 px-2">
                {config.subtitle}
              </p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-white/90 text-xs sm:text-sm leading-relaxed px-1"
            >
              {config.message}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col gap-2 pt-2 sm:pt-3"
            >
              <Button
                onClick={onClose}
                className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 font-bold text-xs sm:text-sm py-2 px-3"
              >
                Continue Studying
              </Button>
              <Button
                onClick={() => {
                  onClose();
                  navigate("/Medrae-quizzes");
                }}
                className="w-full bg-white hover:bg-white/90 text-slate-900 font-bold text-xs sm:text-sm py-2 px-3"
              >
                Improve My Rank
                <ArrowRight className="w-3 h-3 ml-1.5" />
              </Button>
            </motion.div>
          </div>
        </div>

        <p className="text-center text-white/60 text-[10px] sm:text-xs mt-2 sm:mt-3">
          Tap anywhere to continue
        </p>
      </motion.div>
    </motion.div>
  );
};

// 🏆 Medal Icon component
const Medal = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L15 8.5L22 9.5L17 14L18.5 21L12 17.5L5.5 21L7 14L2 9.5L9 8.5L12 2Z" />
  </svg>
);

// ✅ Synchronous cache loader - runs BEFORE component renders
const getInitialCache = () => {
  if (typeof window === 'undefined') return {};

  try {
    const savedData = localStorage.getItem("dashboardData");
    if (savedData) {
      return JSON.parse(savedData);
    }
  } catch (e) { }

  // Fallback: load individual cache items
  const result: any = {};

  try {
    const cachedSims = localStorage.getItem("simulationPapers");
    if (cachedSims) result.simulationPapers = JSON.parse(cachedSims);
  } catch (e) { }

  try {
    const cachedLeaderboard = localStorage.getItem("leaderboard_fast");
    if (cachedLeaderboard) result.topStudents = JSON.parse(cachedLeaderboard);
  } catch (e) { }

  try {
    const cachedStreak = localStorage.getItem("streakData");
    if (cachedStreak) {
      const parsed = JSON.parse(cachedStreak);
      result.studyStreak = parsed.currentStreak || 0;
      result.bestStreak = parsed.bestStreak || 0;
    }
  } catch (e) { }

  try {
    const cachedQuizCount = localStorage.getItem("quizCount");
    if (cachedQuizCount) result.quizCount = JSON.parse(cachedQuizCount);
  } catch (e) { }

  try {
    const cachedProgress = localStorage.getItem("dashboard_study_progress");
    if (cachedProgress) result.studyProgress = JSON.parse(cachedProgress);
  } catch (e) { }

  try {
    const cachedProfile = localStorage.getItem("userProfile");
    if (cachedProfile) result.profileState = JSON.parse(cachedProfile);
  } catch (e) { }

  return result;
};

export default function StudentDashboard() {
  const navigate = useNavigate();
  const user = useUser();

  // ✅ INITIALIZE ALL STATE WITH CACHE - NO WHITE FLASH
  const initialCache = getInitialCache();

  // ===== STATE DECLARATIONS =====
  const [name, setName] = useState<string | null>(() => {
    if (initialCache.profileState?.name) {
      return initialCache.profileState.name.split(" ")[0];
    }
    return null;
  });

  const [studyProgress, setStudyProgress] = useState<number | null>(
    initialCache.studyProgress ?? null
  );

  const [quizCount, setQuizCount] = useState<number | null>(
    initialCache.quizCount ?? null
  );

  const [targetScore, setTargetScore] = useState<number>(() => {
    return initialCache.profileState?.target_score ?? 50;
  });

  const [isOpen, setIsOpen] = useState(false);

  const [studyStreak, setStudyStreak] = useState<number | null>(
    initialCache.studyStreak ?? null
  );

  const [bestStreak, setBestStreak] = useState<number | null>(
    initialCache.bestStreak ?? null
  );

  const [calendarEvents, setCalendarEvents] = useState<any[]>(
    initialCache.calendarEvents ?? []
  );

  const [dailyContent, setDailyContent] = useState("");
  const [feedsAttemptCount, setFeedsAttemptCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const [openProfileId, setOpenProfileId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showRankCelebration, setShowRankCelebration] = useState(false);
  const [newRank, setNewRank] = useState<number | null>(null);

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dashboardLoaded, setDashboardLoaded] = useState(true);
  const [previousRank, setPreviousRank] = useState(null);
  const [overlayOpen, setOverlayOpen] = useState(false);

  const [profileState, setProfileState] = useState<any | null>(
    initialCache.profileState ?? null
  );

  const [position, setPosition] = useState({ x: 24, y: 400 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // ===== REFS =====
  const leaderboardCacheRef = useRef({
    data: initialCache.topStudents ?? null,
    lastFetch: 0,
    isLoading: false
  });

  const isLoadingDashboard = useRef(false);
  const userRankPrevious = useRef<number | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJSIMEout>();

  // ===== STATE FOR SIMULATION PAPERS & TOP STUDENTS =====
  const [simulationPapers, setSimulationPapers] = useState<any[]>(
    initialCache.simulationPapers ?? []
  );
  const [simulationProgress, setSimulationProgress] = useState<Record<string, number>>({});
  const [cachedSimulationPapers, setCachedSimulationPapers] = useState<any[]>(
    initialCache.simulationPapers ?? []
  );

  const [topStudents, setTopStudents] = useState<any[]>(
    initialCache.topStudents ?? []
  );
  const [loadingTopStudents, setLoadingTopStudents] = useState(false);

  // ===== ALL FETCH FUNCTIONS =====
  const fetchFeedsAttemptCount = useCallback(async () => {
    if (!user?.id) return;
    const { count, error } = await supabase
      .from("quiz_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (!error && count !== null) {
      setFeedsAttemptCount(count);
    }
  }, [user?.id]);

  const fetchQuizCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("quiz_results")
        .select("unit, score")
        .eq("user_id", user.id);
      if (error) {
        console.error("Error fetching quiz results:", error.message);
        return;
      }
      if (!data) return;
      const grouped: Record<string, any[]> = {};
      data.forEach((res) => {
        const key = res.unit || "Unknown";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(res);
      });
      const validUnits = Object.keys(grouped).filter((unitName) => {
        const attempts = grouped[unitName];
        const latestAttempt = attempts[attempts.length - 1];
        return latestAttempt?.score && latestAttempt.score > 0;
      });
      setQuizCount(validUnits.length);
      localStorage.setItem("quizCount", JSON.stringify(validUnits.length));
    } catch (err) {
      console.error("Error fetching quiz count:", err);
    }
  }, [user?.id]);

  const fetchProgress = useCallback(async () => {
    if (!user?.id) return;
    const { data: results, error } = await supabase
      .from("quiz_results")
      .select("unit, score, total_questions")
      .eq("user_id", user.id);
    if (error || !results) {
      console.error("Failed to fetch progress");
      return;
    }
    if (results.length === 0) {
      setStudyProgress(0);
      localStorage.setItem("dashboard_study_progress", JSON.stringify(0));
      return;
    }
    const grouped: Record<string, number> = {};
    results.forEach((res) => {
      const unit = res.unit || "Unknown";
      const percent = res.total_questions > 0 ? (res.score / res.total_questions) * 100 : 0;
      grouped[unit] = grouped[unit] ? Math.max(grouped[unit], percent) : percent;
    });
    const unitProgressValues = Object.values(grouped);
    const overallProgress = unitProgressValues.length > 0
      ? Math.round(unitProgressValues.reduce((a, b) => a + b, 0) / unitProgressValues.length)
      : 0;
    setStudyProgress(overallProgress);
    localStorage.setItem("dashboard_study_progress", JSON.stringify(overallProgress));
  }, [user?.id]);

  const fetchCalendarEvents = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("calendar_events")
      .select("id, title, description, start_time, type, priority")
      .eq("user_id", user.id)
      .order("start_time", { ascending: true });
    if (!error && data) setCalendarEvents(data);
  }, [user?.id]);

  const updateBestStreakIfNeeded = useCallback(async (current: number) => {
    const { data, error } = await supabase
      .from("login_activity")
      .select("streak")
      .eq("user_id", user.id)
      .order("streak", { ascending: false })
      .limit(1);

    let historicalBest = 0;
    if (!error && data && data.length > 0) {
      historicalBest = data[0].streak || 0;
    }

    const finalBest = Math.max(current, historicalBest);
    setBestStreak(finalBest);
    localStorage.setItem(
      "streakData",
      JSON.stringify({
        currentStreak: current,
        bestStreak: finalBest,
      })
    );
  }, [user?.id]);

  const handleLoginAndStreak = useCallback(async () => {
    if (!user?.id) return;
    const deviceId = localStorage.getItem("device_id");
    await supabase.rpc('handle_user_heartbeat', {
      p_user_id: user.id,
      p_device_id: deviceId || ""
    });
    const { data, error } = await supabase
      .from("login_activity")
      .select("streak")
      .eq("user_id", user.id)
      .order("login_date", { ascending: false })
      .limit(1)
      .single();
    if (!error && data) {
      const newStreak = data.streak || 0;
      setStudyStreak(newStreak);
      updateBestStreakIfNeeded(newStreak);
    }
  }, [user?.id, updateBestStreakIfNeeded]);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!error && data) {
      if (data.name) setName(data.name.split(" ")[0]);

      // ✅ Use ?? so that if target_score is 0, it stays 0.
      // It only becomes 50 if the database value is null/undefined.
      setTargetScore(data.target_score ?? 50);

      setProfileState(data);
      localStorage.setItem("userProfile", JSON.stringify(data));
    }
  }, [user?.id]);

  const fetchSimulationPapers = useCallback(async () => {
    const CACHE_KEY = 'simulation_papers_v2';
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
      } catch (e) { }
    }

    try {
      const { data: papers, error: paperError } = await supabase
        .from("simulation_papers")
        .select("id, title, description, course, block, is_free, created_at, duration")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (paperError) throw paperError;
      if (!papers) return;

      const { data: results, error: resultsError } = await supabase
        .from("simulation_results")
        .select("paper_id, score, total_questions")
        .eq("user_id", user.id);
      if (resultsError) throw resultsError;

      const progressMap: Record<string, number> = {};
      const attemptCountMap: Record<string, number> = {};
      papers.forEach((paper) => {
        const paperResults = results?.filter((r) => r.paper_id === paper.id) || [];
        attemptCountMap[paper.id] = paperResults.length;
        if (paperResults.length > 0) {
          const highestScore = Math.max(...paperResults.map(r => r.score));
          const totalQuestions = paper.total_questions || 10;
          progressMap[paper.id] = Math.round((highestScore / totalQuestions) * 100);
        } else {
          progressMap[paper.id] = 0;
        }
      });

      setSimulationProgress(progressMap);
      const papersWithAttempts = papers.map((paper) => ({
        ...paper,
        attempt_count: attemptCountMap[paper.id] || 0,
      }));

      setSimulationPapers(papersWithAttempts);
      setCachedSimulationPapers(papersWithAttempts);
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: papersWithAttempts,
        timestamp: Date.now()
      }));
    } catch (error: any) {
      console.log("Simulation papers: Offline mode, keeping current list");
    }
  }, [user?.id]);

  const fetchTopStudents = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;

    const CACHE_KEY = "leaderboard_fast";

    if (forceRefresh) {
      setLoadingTopStudents(true);
    }

    // Try cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) {
          setTopStudents(parsed);
          setLoadingTopStudents(false);
          if (!forceRefresh) return;
        }
      }
    } catch (e) {
      console.log("Cache read error");
    }

    // Fetch from API
    try {
      const { data, error } = await supabase.rpc('get_leaderboard_v2');
      if (error) throw error;

      if (data && data.length > 0) {
        setTopStudents(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));

        try {
          const dashboardData = localStorage.getItem("dashboardData");
          if (dashboardData) {
            const parsed = JSON.parse(dashboardData);
            parsed.topStudents = data;
            localStorage.setItem("dashboardData", JSON.stringify(parsed));
          }
        } catch (e) { }

        const myIndex = data.findIndex(s => s.userid === user.id);
        const myRank = myIndex !== -1 ? myIndex + 1 : null;

        if (myRank && myRank <= 3 && myRank !== userRankPrevious.current) {
          setNewRank(myRank);
          setShowRankCelebration(true);
          userRankPrevious.current = myRank;
        }
      }
    } catch (err) {
      console.error("Leaderboard Error:", err);
    } finally {
      setLoadingTopStudents(false);
    }
  }, [user?.id]);

  // ✅ handleOpenDialog - OPENS INSTANTLY, LOADS DATA IN BACKGROUND
  const handleOpenDialog = useCallback(() => {
    if (!user?.id) return;

    // ✅ 1. OPEN DIALOG IMMEDIATELY - NO WAITING
    setOverlayOpen(true);

    // ✅ 2. If we already have data, we're done
    if (topStudents.length > 0) return;

    // ✅ 3. Try cache instantly
    try {
      const cached = localStorage.getItem("leaderboard_fast");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) {
          setTopStudents(parsed);
          return;
        }
      }
    } catch (e) { }

    // ✅ 4. No cache? Show skeleton and fetch
    setLoadingTopStudents(true);
    fetchTopStudents(true).finally(() => {
      setLoadingTopStudents(false);
    });
  }, [user?.id, topStudents, fetchTopStudents]);

  // ===== LOAD DASHBOARD DATA =====
  const loadDashboardData = useCallback(async () => {
    if (!user?.id || isLoadingDashboard.current) return;
    isLoadingDashboard.current = true;

    try {
      // 1. Run all fetches in parallel
      await Promise.allSettled([
        fetchProfile(),
        handleLoginAndStreak(),
        fetchCalendarEvents(),
        fetchTopStudents(),
        fetchProgress(),
        fetchSimulationPapers(),
        fetchQuizCount(),
        fetchFeedsAttemptCount()
      ]);

      // 2. Final sync to LocalStorage so the next refresh is instant
      const dashboardData = {
        name,
        studyProgress,
        quizCount,
        studyStreak,
        bestStreak,
        calendarEvents,
        topStudents,
        simulationPapers: cachedSimulationPapers,
        profileState
      };

      localStorage.setItem("dashboardData", JSON.stringify(dashboardData));
      localStorage.setItem("last_dashboard_fetch", Date.now().toString());

    } catch (err) {
      console.log("Working in offline mode - cached data displayed");
    } finally {
      isLoadingDashboard.current = false;
    }
  }, [
    user?.id, fetchProfile, handleLoginAndStreak, fetchCalendarEvents,
    fetchTopStudents, fetchProgress, fetchSimulationPapers,
    fetchQuizCount, fetchFeedsAttemptCount, name, studyProgress,
    quizCount, studyStreak, bestStreak, calendarEvents,
    topStudents, cachedSimulationPapers, profileState
  ]);
  // ===== EFFECTS =====
  useEffect(() => {
    if (!user?.id) return;
    loadDashboardData();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const intervalId = setInterval(() => {
      if (!document.hidden) {
        loadDashboardData();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user?.id, loadDashboardData]);

  useEffect(() => {
    if (!user?.id) return;
    if (topStudents.length === 0) {
      fetchTopStudents(true);
    }
  }, [user?.id, topStudents.length, fetchTopStudents]);

  useEffect(() => {
    if (!user?.id) return;

    const intervalId = setInterval(() => {
      if (!document.hidden) {
        fetchTopStudents(true);
      }
    }, 30 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user?.id, fetchTopStudents]);

  const handleSmoothNavigate = useCallback((url: string, scrollToTop = true) => {
    if (navigator.vibrate) navigator.vibrate(10);
    if (scrollToTop && dashboardRef.current) {
      dashboardRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
    setTimeout(() => {
      navigate(url);
    }, 50);
  }, [navigate]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500 text-white";
      case "medium":
        return "bg-yellow-500 text-black";
      case "low":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-400 text-white";
    }
  };

  // ✅ RENDER
  return (
    <div
      ref={dashboardRef}
      className="dashboard-no-select min-h-screen md:flex md:items-center md:justify-center bg-[var(--card-bg)] dark:bg-[var(--card-bg-dark)] w-full"
      style={{
        scrollBehavior: 'smooth',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <AnimatePresence>
        {showRankCelebration && newRank && (
          <RankCelebrationOverlay
            rank={newRank}
            name={profileState?.name?.split(' ')[0] || "Learner"}
            onClose={() => setShowRankCelebration(false)}
            navigate={navigate}
          />
        )}
      </AnimatePresence>
      <div className="w-full space-y-2 md:px-4 lg:px-6">
        <GreetingsCard />
        <Stories
          limit={4}
          title="Medrae Nursing Community Pulse"
          showViewAll={true}
          showCreateButton={true}
          onViewAll={() => navigate('/stories')}
          className="mt-1"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <CountdownFloating />
          <TotalAttemptsCard />
        </div>
        <DailyTriviaCard />
        <Algorithm />
        <Referral />




        {/* Top Students Leaderboard */}
        <Card className="relative overflow-hidden rounded-xl border-0 bg-white/50 dark:bg-muted/30 backdrop-blur-xl shadow-2xl mt-1">
          <CardMarquee
            studyProgress={studyProgress ?? 0}
            quizCount={quizCount ?? 0}
            targetScore={targetScore ?? 50} // Ensure fallback here
            studyStreak={studyStreak ?? 0}
            bestStreak={bestStreak ?? 0}
            onNavigate={handleSmoothNavigate}
          />
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-yellow-500/10 blur-[80px]" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]" />

          <CardHeader className="relative z-10 pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-yellow-500/10 dark:bg-yellow-500/20 rounded-2xl shadow-inner">
                  <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-500 animate-bounce" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[3px] font-bold text-slate-500 dark:text-yellow-500/80">Hall of Fame</p>
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Top Students</CardTitle>
                </div>
              </div>
            </div>

            <details className="group mt-4 bg-slate-100/50 dark:bg-white/[0.03] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden transition-all duration-300">
              <summary className="cursor-pointer list-none p-4 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                <span>How winners are chosen?</span>
                <span className="transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="px-5 pb-5 pt-2 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider">
                      <div className="h-1 w-3 bg-blue-500 rounded-full" /> 1. Star Calculation
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { r: "90%+", s: "⭐⭐⭐⭐⭐" },
                        { r: "75-89%", s: "⭐⭐⭐⭐" },
                        { r: "60-74%", s: "⭐⭐⭐" },
                        { r: "40-59%", s: "⭐⭐" },
                        { r: "1-39%", s: "⭐" },
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between p-2 bg-white/50 dark:bg-black/20 rounded-lg text-[10px]">
                          <span className="font-bold">{item.r}</span>
                          <span>{item.s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider">
                      <div className="h-1 w-3 bg-emerald-500 rounded-full" /> 2. Ranking Tie-Breakers
                    </h4>
                    <ul className="space-y-2 text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">01.</span> Total Stars Earned (Primary)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">02.</span> Average Quiz Scores (Secondary)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">03.</span> Units Attempted (Tie-breaker)
                      </li>
                    </ul>
                    <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest h-9 rounded-xl shadow-lg shadow-blue-500/20">
                      <Link to="/Medrae-quizzes">Improve My Rank</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </details>
          </CardHeader>

          <CardContent className="px-0 relative z-10">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 py-8 px-6">
              {topStudents.length > 0 ? (
                topStudents.map((s, idx) => {
                  const rankMeta = [
                    { label: "🥇 Gold", ring: "ring-yellow-400/50", glow: "shadow-yellow-500/20", bg: "from-yellow-500/20 via-yellow-500/5 to-transparent", text: "text-yellow-600 dark:text-yellow-400" },
                    { label: "🥈 Silver", ring: "ring-slate-300", glow: "shadow-slate-400/20", bg: "from-slate-400/20 via-slate-400/5 to-transparent", text: "text-slate-600 dark:text-slate-300" },
                    { label: "🥉 Bronze", ring: "ring-amber-600/50", glow: "shadow-amber-700/20", bg: "from-amber-700/20 via-amber-700/5 to-transparent", text: "text-amber-700 dark:text-amber-500" },
                    { label: `#${idx + 1}`, ring: "ring-slate-100", glow: "shadow-transparent", bg: "from-slate-100 dark:from-white/5 to-transparent", text: "text-slate-400" }
                  ][idx] || { label: `#${idx + 1}`, ring: "ring-transparent", glow: "", bg: "bg-transparent", text: "text-slate-400" };

                  return (
                    <div
                      key={s.userid}
                      onClick={() => setSelectedUserId(s.userid)}
                      className={`flex-shrink-0 w-44 snap-center relative group cursor-pointer transition-all duration-500 hover:-translate-y-2`}
                    >
                      <div className={`h-full p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-muted/30 shadow-xl ${rankMeta.glow} transition-all group-hover:border-blue-500/30 overflow-hidden relative`}>
                        <div className={`absolute top-0 inset-x-0 h-24 bg-gradient-to-b ${rankMeta.bg} opacity-50`} />
                        <div className="relative z-10 flex flex-col items-center text-center">
                          <div className={`relative mb-3`}>
                            <img
                              src={s.avatar_url || "/UsersAvatar.jpg"}
                              alt={s.name}
                              className={`w-16 h-16 rounded-full object-cover ring-4 ${rankMeta.ring} shadow-lg transition-transform duration-500 group-hover:scale-110`}
                              loading="lazy"
                            />
                            {idx < 3 && (
                              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-1 shadow-md border border-slate-100 dark:border-white/10">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              </div>
                            )}
                          </div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 w-full tracking-tight">
                            {s.name || "Unknown"}
                          </h3>
                          <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-1 uppercase tracking-tighter truncate w-full">
                            {s.institution || "Institution"}
                          </p>
                          <div className="flex justify-center mt-3 gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${i < s.stars ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200 dark:text-slate-800'}`}
                              />
                            ))}
                          </div>
                          <div className={`mt-5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${idx < 3 ? 'bg-slate-900 text-white border-transparent' : 'bg-transparent text-slate-400 border-slate-200 dark:border-white/10'}`}>
                            {rankMeta.label}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="w-full text-center py-10">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-[2px]">Competition Starting Soon...</p>
                </div>
              )}
            </div>
          </CardContent>
          <UserProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
        </Card>

        <TutorsList />
        <DailyImagesTrivia />
        <FeedSeenTop10 />

        {/* ✅ FLOATING LEADERBOARD INDICATOR - OPENS INSTANTLY */}
        <div className="fixed bottom-14 right-4 z-40">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(40);
              handleOpenDialog(); // ✅ Opens instantly!
            }}
            className="relative h-12 w-12 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-2xl flex items-center justify-center transition-all p-0 overflow-visible"
          >
            {topStudents.length > 0 ? (
              <>
                <span className="absolute -top-1 -right-1 flex h-3 w-3 z-10">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <div className="w-full h-full rounded-full overflow-hidden">
                  <img
                    src={topStudents[0].avatar_url || "/UsersAvatar.jpg"}
                    alt={topStudents[0].name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white dark:border-slate-900">
                  <Crown className="w-3.5 h-3.5 fill-current" />
                </div>
              </>
            ) : (
              <Trophy className="w-6 h-6 text-slate-400" />
            )}
          </motion.button>
        </div>

        {/* ✅ DIALOG - OPENS INSTANTLY WITH SKELETON */}
        <Dialog open={overlayOpen} onOpenChange={setOverlayOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden rounded-xl border-0 bg-white dark:bg-muted/100">
            <div className="relative">
              <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-blue-500/10 to-transparent dark:from-blue-500/5 pointer-events-none" />
              <div className="relative p-6">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
                    <Newspaper className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    Quizzes Bank Insights
                  </DialogTitle>
                </div>
                <div className="space-y-6">
                  <DialogDescription className="text-sm text-center text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    "Practice makes permanent. Engage with the community Quizzes Bank(Q.B) to climb the ranks."
                  </DialogDescription>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex flex-col items-center text-center">
                      <BookOpen className="w-4 h-4 text-slate-400 mb-2" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Your Feed Attempts</span>
                      <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{feedsAttemptCount}</p>
                    </div>

                    {/* ✅ Shows SKELETON while loading, DATA when ready */}
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 flex flex-col items-center text-center">
                      <Trophy className="w-4 h-4 text-amber-500 mb-2" />
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Current Leader</span>

                      {loadingTopStudents ? (
                        <div className="mt-2 flex flex-col items-center animate-pulse">
                          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded mt-1" />
                        </div>
                      ) : topStudents.length > 0 ? (
                        <div className="mt-2 flex flex-col items-center">
                          <img
                            src={topStudents[0].avatar_url || "/UsersAvatar.jpg"}
                            className="h-10 w-10 rounded-full border-2 border-white dark:border-slate-800 shadow-md object-cover"
                            alt="Leader"
                            loading="lazy"
                          />
                          <p className="text-xs font-bold text-slate-900 dark:text-white mt-1 truncate max-w-[80px]">
                            {topStudents[0].name.split(' ')[0]}
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
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-500/30">
                        <Crown className="w-3.5 h-3.5 fill-current" />
                        <span className="text-xs font-bold tracking-tight">Top Performer This Week</span>
                      </div>
                    </div>
                  ) : null}

                  <div className="pt-2">
                    <Button
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(50);
                        navigate("/Medrae-quizzes");
                        setOverlayOpen(false);
                      }}
                    >
                      Start Quizzing
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">
                      Complete Units to Climb the Leaderboard
                    </p>
                    <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">
                      Medrae Community Hub
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {calendarEvents.length > 0 && (
          <Card
            className="mt-6 cursor-pointer rounded-xl border-0 bg-white shadow-sm hover:shadow-md dark:bg-slate-900/50 transition-all group overflow-hidden"
            onClick={() => handleSmoothNavigate("/calendar")}
          >
            <div className="h-1.5 w-full bg-teal-500/80" />
            <div className="p-5 space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 bg-teal-50 dark:bg-teal-900/30 rounded-xl text-teal-600 dark:text-teal-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    Clinical Revision Schedule
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
                    Maintain your rhythm. Track and adjust your upcoming study timeline.
                  </p>
                </div>
              </div>
              <div className="space-y-2.5">
                {calendarEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 w-full hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {event.title}
                        </p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                          <span className="capitalize">{event.type || "Study Session"}</span>
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 shrink-0">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide",
                        getPriorityColor(event.priority)
                      )}>
                        {new Date(event.start_time).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        <DailyStatus />

        {/* --- SIMULATION PAPERS SECTION --- */}
        <section className="mt-1 space-y-2">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 px-2 sm:px-0">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                Proctorium Papers V1
                <span className="text-xs font-bold px-2 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full">
                  {cachedSimulationPapers.length} Available
                </span>
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                Simulations designed to mirror NCK exam conditions. Practice time management,
                reduce anxiety, and identify weak areas before the real exam.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 px-2 sm:px-0">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/10">
              <Laptop className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-amber-800 dark:text-amber-200/80 leading-relaxed">
                <span className="font-bold">Desktop Recommended:</span> For the smoothest DigiProctor experience, we suggest using a laptop or tablet.
              </p>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200/50 dark:border-blue-500/10">
              <Lightbulb className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-blue-800 dark:text-blue-200/80 leading-relaxed">
                <span className="font-bold">Pro Tip:</span> Treat this as the real exam—find a quiet space, set a timer, and avoid breaks to build true stamina.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 px-2 sm:px-0">
            {cachedSimulationPapers.length > 0 ? (
              cachedSimulationPapers.map((paper) => (
                <Card
                  key={paper.id}
                  className="group relative flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-slate-200 dark:border-white/10 bg-white dark:bg-muted/30 rounded-2xl"
                  onClick={() => handleSmoothNavigate(`/simulation/${paper.id}`)}
                >
                  <CardHeader className="p-5 pb-2">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <Badge variant={paper.is_free ? "default" : "secondary"} className={paper.is_free ? "bg-emerald-500 hover:bg-emerald-600" : "bg-blue-600 text-white"}>
                        {paper.is_free ? "Free" : "Premium"}
                      </Badge>
                      <div className="flex gap-1">
                        {paper.difficulty && (
                          <Badge variant="outline" className="capitalize text-[10px]">{paper.difficulty}</Badge>
                        )}
                        {new Date(paper.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                          <Badge className="bg-orange-500 text-[10px]">New</Badge>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-lg font-bold leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                      {paper.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <Layout className="w-3.5 h-3.5" />
                      <span className="line-clamp-1">{paper.course || "General Nursing"} • {paper.block || "Block I"}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-2 flex-1">
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                      {paper.description || "Comprehensive NCK-style simulation paper for self-assessment."}
                    </p>
                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {(() => {
                            const duration = Number(paper.duration) || 30;
                            return duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`;
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ListChecks className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {paper.attempt_count || 0} {paper.attempt_count === 1 ? 'Attempt' : 'Attempts'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completion</span>
                        <span className="text-[10px] font-bold text-blue-600">{simulationProgress[paper.id] || 0}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-1000"
                          style={{ width: `${simulationProgress[paper.id] || 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium italic">
                        Added {formatDistanceToNow(new Date(paper.created_at))} ago
                      </span>
                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        Start <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-10">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-[2px]">No simulation papers available</p>
              </div>
            )}
          </div>

          <div className="py-8 text-center">
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 italic">
              "Every simulation you complete brings you one step closer to exam success."
            </p>
          </div>
        </section>

        <UnitBreakdown nclexUnitCodes={[
          "HNX3-001", "HNX3-002", "HNX3-003", "HNX3-004",
          "HNX3-005", "HNX3-006", "HNX3-007", "HNX3-008"
        ]} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 w-full mt-2 px-2 sm:px-0">
          <Card className="overflow-hidden border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-sm transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <CardTitle className="text-lg font-bold">Share Medrae</CardTitle>
              </div>
              <CardDescription className="text-xs leading-relaxed mt-2">
                Invite colleagues to join Kenya's premier network for medical education and career growth.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                onClick={() => {
                  const shareMessage = `Medrae – The Professional Medical Education & Career Network\n\n• Structured modules\n• Expert-led lectures\n• NCK Exam Prep\n\nJoin today: https://medrae.vercel.app`;
                  if (navigator.share) {
                    navigator.share({ title: "Medrae Network", text: shareMessage, url: "https://medrae.vercel.app" });
                  } else {
                    navigator.clipboard.writeText(shareMessage);
                    alert("Link copied to clipboard!");
                  }
                }}
              >
                Spread the Word
              </Button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-sm transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg text-emerald-600">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                </div>
                <CardTitle className="text-lg font-bold">Official Channel</CardTitle>
              </div>
              <CardDescription className="text-xs mt-2">
                Instant updates on new study content and professional announcements.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="https://whatsapp.com/channel/0029VbBFzgAEawdkJKtRtF2H" target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl h-11 font-bold transition-all">
                  Join Channel
                </Button>
              </a>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-sm transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg text-emerald-600">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0a12 12 0 100 24 12 12 0 000-24zm0 22a10 10 0 110-20 10 10 0 010 20z" /></svg>
                </div>
                <CardTitle className="text-lg font-bold">Student Community</CardTitle>
              </div>
              <CardDescription className="text-xs mt-2">
                Connect with peers, share resources, and ask questions in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="https://chat.whatsapp.com/Lad2s4XXx1AA1TtThbMgWV" target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl h-11 font-bold transition-all">
                  Join WhatsApp Group
                </Button>
              </a>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-sm transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-100 dark:bg-sky-500/20 rounded-lg text-sky-600">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.28 8.13c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.13-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27a.55.55 0 01.01.16z" /></svg>
                </div>
                <CardTitle className="text-lg font-bold">Telegram Hub</CardTitle>
              </div>
              <CardDescription className="text-xs mt-2">
                Access the complete repository of nursing and medical scholarship materials.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <a href="https://t.me/heartiquenursingnexusscholar" target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button className="w-full bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20 rounded-xl h-11 font-bold transition-all">
                  Telegram
                </Button>
              </a>
              <a href="https://web.facebook.com/share/g/1AY4nC9Hcp/" target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl h-11 font-bold transition-all">
                  Facebook
                </Button>
              </a>
            </CardContent>
          </Card>
          <FloatingQuickActions />
        </div>

        <TermsButton />
      </div>
    </div>
  );
}