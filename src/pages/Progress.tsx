"use client";
import { GlobalLoader } from "@/components/GlobalLoader";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
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
} from "lucide-react";
import { playSound } from "@/lib/soundManager";
import { motion, AnimatePresence } from "framer-motion";
import { allUnits } from "@/constants/units";
import { TermsButton } from "@/components/ui/TermsButton";
import { useSession } from "@supabase/auth-helpers-react";
// --- Local Storage Helpers ---
const LOCAL_STORAGE_KEY = "study_progress_cache";
function saveToLocalStorage(userId: string, data: any) {
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ userId, ...data })
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
    return parsed.userId === userId ? parsed : null;
  } catch (e) {
    console.error("Error reading from localStorage:", e);
    return null;
  }
}

// --- Deep comparison helper ---
function isEqualData(a: any[], b: any[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function StudyProgress() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStarsEarned, setTotalStarsEarned] = useState(0);
  const [unitsWithStats, setUnitsWithStats] = useState<any[]>([]);
  const [totalTopicsInApp, setTotalTopicsInApp] = useState(0);
  const [showProgressDescription, setShowProgressDescription] = useState(false);
  const session = useSession();           // ✅ get session
  const user = session?.user || null;     // ✅ current user
  useEffect(() => {
    const fetchProgress = async (showLoader = true) => {
      if (showLoader) setLoading(true);

      // 1️⃣ Get current user


      if (!user) {
        console.error("User not found");
        if (showLoader) setLoading(false);
        return;
      }

      // 2️⃣ Load cached progress first
      const cached = loadFromLocalStorage(user.id);
      if (cached) {
        setSubjects(cached.subjects || []);
        setTotalStarsEarned(cached.totalStarsEarned || 0);
        setUnitsWithStats(cached.subjects || []);
      }

      // 3️⃣ Fetch quiz results
      const { data, error } = await supabase
        .from("quiz_results")
        .select("unit, score, total_questions")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching quiz results:", error.message);
        if (showLoader) setLoading(false);
        return;
      }

      // 4️⃣ Fetch all quizzes to know total topics
      const { data: allQuizzes, error: quizError } = await supabase
        .from("quizzes")
        .select("unit, id");

      if (quizError) {
        console.error("Error fetching quizzes:", quizError.message);
        if (showLoader) setLoading(false);
        return;
      }

      const totalTopicsInApp = allQuizzes?.length || 0;

      // 5️⃣ Group results by unit, only include units whose latest attempt > 0
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

      // 6️⃣ Filter units: only include if latest attempt > 0
      const unitsToInclude = Object.keys(grouped).filter((unitName) => {
        // Find all attempts for this unit
        const attempts = data?.filter((r) => r.unit === unitName) || [];
        const latestAttempt = attempts[attempts.length - 1]; // assume last is latest
        return latestAttempt?.score && latestAttempt.score > 0;
      });

      const computedUnits = unitsToInclude.map((unitName) => {
        const stats = grouped[unitName];
        return {
          id: unitName,
          name: unitName,
          progress: Math.round(stats.highestProgress),
          hoursStudied: stats.attempts * 1.5,
          topicsCompleted: stats.attempts,
          totalTopics: allQuizzes.filter((q) => q.unit === unitName).length || stats.attempts,
          rating: stats.attempts > 0 ? 5 : 0,
        };
      });

      // 7️⃣ Compute overall stats
      const totalStars = computedUnits.reduce((acc, s) => acc + s.rating, 0);

      // 8️⃣ Only update state if data changed
      // Compute new full state
      const newState = {
        subjects: computedUnits,
        totalStarsEarned: totalStars,
        totalTopicsInApp: totalTopicsInApp,
      };

      // Compare with current state
      const hasChanged =
        !isEqualData(computedUnits, unitsWithStats) ||
        totalStarsEarned !== totalStars ||
        totalTopicsInApp !== totalTopicsInApp;

      if (hasChanged) {
        setUnitsWithStats(computedUnits);
        setSubjects(computedUnits);
        setTotalStarsEarned(totalStars);
        setTotalTopicsInApp(totalTopicsInApp);

        saveToLocalStorage(user.id, newState);
      }

      if (showLoader) setLoading(false);
    };

    // Initial load (uses cached data immediately)
    fetchProgress(true);

    // Realtime subscription to automatically update progress
    const channel = supabase
      .channel("quiz_results_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_results" },
        () => fetchProgress(false) // background update
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  return (
    <div className="min-h-screen w-full flex mt-0 flex-col items-center ">
      <div className="w-full max-w-3xl space-y-2 px-0 sm:px-6 pt-4 sm:pt-8">
        {/* MAIN HEADER CARD */}
        <Card className="relative overflow-hidden shadow-xl shadow-blue-500/5 transition-all rounded-none sm:rounded-xl border-0 bg-white dark:bg-muted/30">
          {/* Visual Accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-2xl">
                <Heart className="h-7 w-7 text-red-500 animate-pulse" fill="currentColor" />
              </div>
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Study <span className="text-blue-600">Progress</span>
                </CardTitle>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
                  Real-time Learning Analytics
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-2">
            {/* Metric Explanation Section */}
            <div className="bg-gray-50/80 dark:bg-gray-900/50 rounded-3xl p-5 border-0">
              <motion.div layout>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Metric Guide</h3>
                  <button
                    onClick={() => setShowProgressDescription(!showProgressDescription)}
                    className="text-[10px] font-bold text-blue-600 hover:underline px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg"
                  >
                    {showProgressDescription ? "Close Info" : "How is this calculated?"}
                  </button>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs">%</div>
                          <p className="text-[11px] text-gray-500 leading-snug"><strong>Progress:</strong> Highest quiz score achieved per unit.</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg flex items-center justify-center text-yellow-600 font-bold text-xs">★</div>
                          <p className="text-[11px] text-gray-500 leading-snug"><strong>Stars:</strong> 5 Stars awarded for every unit attempted.</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">H</div>
                          <p className="text-[11px] text-gray-500 leading-snug"><strong>Hours:</strong> Calculated as 1.5hrs per unique attempt.</p>
                        </div>
                      </div>
                      <p className="mt-4 text-[10px] italic text-gray-400 border-l-2 border-blue-500 pl-3">
                        Submit your quizzes in the App to sync results here automatically.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* OVERALL STATS GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2">
              {/* Progress Card */}
              <StatCard
                icon={<TrendingUp className="w-5 h-5" />}
                value={`${Math.round(overallStats.totalProgress)}%`}
                label="Overall Progress"
                color="text-blue-600"
                bgColor="bg-blue-50 dark:bg-blue-900/20"
              />
              {/* Hours Card */}
              <StatCard
                icon={<Clock className="w-5 h-5" />}
                value={overallStats.totalHours}
                label="Hours Studied"
                color="text-indigo-600"
                bgColor="bg-indigo-50 dark:bg-indigo-900/20"
              />
              {/* Topics Card */}
              <StatCard
                icon={<BookOpen className="w-5 h-5" />}
                value={`${overallStats.completedTopics}/${overallStats.totalTopics}`}
                label="Topics Done"
                color="text-emerald-600"
                bgColor="bg-emerald-50 dark:bg-emerald-900/20"
              />
              {/* Stars Card */}
              <StatCard
                icon={<Star className="w-5 h-5" />}
                value={`${overallStats.totalStars}`}
                label="Stars Earned"
                color="text-amber-500"
                bgColor="bg-amber-50 dark:bg-amber-900/20"
              />
            </div>
          </CardContent>

          {/* --- NEW SUMMARY CARDS (Simulation + Trivia) --- */}
          <SimulationAndTriviaSummary user={user} />
          <Tabs defaultValue="subjects" className="space-y-2">
            {/* --- TAB NAVIGATION --- */}
            <div className="flex justify-center">
              <TabsList className="bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl h-12 inline-flex border-0">
                <TabsTrigger
                  value="subjects"
                  className="rounded-xl px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all"
                >
                  By Unit
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  className="rounded-xl px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all"
                >
                  Timeline View
                </TabsTrigger>
              </TabsList>
            </div>

            {/* --- BY UNIT CONTENT --- */}
            <TabsContent value="subjects" className="space-y-2 outline-none">
              {subjects.length === 0 && loading ? (
                <div className="flex flex-col justify-center items-center py-20 space-y-4">
                  <GlobalLoader />
                  <p className="text-sm font-medium text-gray-400 animate-pulse">Analysing your data...</p>
                </div>
              ) : (
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full px-0">
                  {subjects.map((subject) => (
                    <Card
                      key={subject.id}
                      className="group relative overflow-hidden border-2 border-gray-100 dark:border-gray-900 hover:border-blue-500/50 bg-white dark:bg-gray-800 rounded-[2rem] transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/5"
                    >
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

                      <CardContent className="space-y-6">
                        {/* Progress Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tighter">
                            <span className="text-gray-400">Total Mastery</span>
                            <span className="text-blue-600">{subject.progress}%</span>
                          </div>
                          <div className="relative h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${subject.progress}%` }}
                              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                            />
                          </div>
                        </div>

                        {/* Stats Grid */}
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* --- TIMELINE CONTENT --- */}
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
                    {/* Latest Event Node */}
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

                    {/* Placeholder for future nodes */}
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

    </div >

  );
}
// ⭐ Summary item (needed by both cards)
function SummaryItem({ label, value }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

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

  // 🔹 Load saved targetInput from localStorage on mount
  useEffect(() => {
    // Load stored summaries
    const storedSim = localStorage.getItem("simSummary");
    const storedTrivia = localStorage.getItem("triviaSummary");
    if (storedSim) setSimSummary(JSON.parse(storedSim));
    if (storedTrivia) setTriviaSummary(JSON.parse(storedTrivia));

    // Load profile first, then fetch summaries
    loadProfile();
  }, []);

  useEffect(() => {
    // Only fetch summary & streak after profile is loaded
    if (profile) {
      fetchSummary();
      calculateStreak();
    }
  }, [profile]);


  // 🔹 Persist targetInput to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("target_score", targetInput);
  }, [targetInput]);
  async function loadProfile() {
    try {
      if (!user) {
        console.error("No session user found");
        setProfile({ name: "Guest", avatar_url: null, target_score: 50 });
        setTargetInput(50);
        return;
      }

      // Remove themeColor from select
      const { data, error } = await supabase
        .from("profiles")
        .select("name, avatar_url, target_score") // themeColor removed
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        console.error("Profile not found or query error:", error);
        setProfile({ name: "Guest", avatar_url: null, target_score: 50 });
        setTargetInput(50);
        return;
      }
      setProfile(data);
      setTargetInput(data.target_score ?? 50);

    } catch (err) {
      console.error("Unexpected error loading profile:", err);
      setProfile({ name: "Guest", avatar_url: null, target_score: 50 });
      setTargetInput(50);
    }
  }
  async function saveTarget() {
    if (!profile) return;
    setSavingTarget(true);
    // 🔊 Play sound immediately on user click
    playSound("tap", false);
    if (!user) {
      console.error("No session user found");
      setSavingTarget(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ target_score: targetInput })
      .eq("user_id", user.id);

    if (error) {
      console.error("Error updating target:", error);
      setSavingTarget(false);
      return;
    }

    setProfile({ ...profile, target_score: targetInput });
    localStorage.setItem("target_score", targetInput);

    // Show popup
    const popup = document.createElement("div");
    popup.className = `
      fixed inset-0 flex items-center justify-center
      bg-black/20 dark:bg-black/30 z-50
      `;

    const inner = document.createElement("div");
    inner.innerHTML = `
      <strong>New target saved: ${targetInput}%!</strong><br />
    Advancing nursing education and student success.
      `;
    inner.className = `
      px-6 py-4 rounded-xl shadow-lg text-center
      bg-white dark:bg-gray-800 text-lg font-bold zoom-popup
      `;

    popup.appendChild(inner);
    document.body.appendChild(popup);

    setTimeout(() => popup.remove(), 3500);

    setSavingTarget(false);
  }

  async function calculateStreak() {

    if (!user) return;

    const today = new Date();
    const day = today.getDay();
    const diff = (day === 0 ? -6 : 1 - day); // Sunday = -6, Monday = 0, etc
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
    setStreak(uniqueDays.size);
  }


  async function fetchSummary() {

    if (!user) return;

    const todayKey = `alertShown-${new Date().toDateString()}`;
    const playAlertOnce = (message: string) => {
      if (!localStorage.getItem(todayKey)) {
        playSound("start"); // uses the preloaded tap2.mp3 sound
        alert(message);
        localStorage.setItem(todayKey, "true");
      }
    };

    const { data: sim, error: simError } = await supabase
      .from("simulation_results")
      .select("*")            // ✅ fix typo: .se → .select("*")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false });

    if (simError) {
      console.error("Error fetching simulation results:", simError);
      return;
    }
    let simLow = false;
    if (sim?.length > 0) {
      const scores = sim.map((r) => Math.round((r.score / r.total_questions) * 100));
      const summary = {
        attempts: sim.length,
        best: Math.max(...scores),
        worst: Math.min(...scores),
        average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        latest: scores[0],
      };
      // Compare new summary with current state
      if (JSON.stringify(summary) !== JSON.stringify(simSummary)) {
        setSimSummary(summary);
        localStorage.setItem("simSummary", JSON.stringify(summary));
      }

      if (JSON.stringify(summary) !== JSON.stringify(triviaSummary)) {
        setTriviaSummary(summary);
        localStorage.setItem("triviaSummary", JSON.stringify(summary));
      }
    }

    const { data: trivia } = await supabase
      .from("daily_trivia_results")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    let triviaLow = false;
    if (trivia?.length > 0) {
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
      if (summary.latest < (profile?.target_score ?? 50)) triviaLow = true;
    } else {
      setTriviaSummary("empty");
      localStorage.removeItem("triviaSummary");
    }

    // inside fetchSummary()
    // inside fetchSummary()
    const targetScore = profile?.target_score ?? Number(localStorage.getItem("target_score")) ?? 50;
    setSimLow(simLow);       // for simulation card
    setTriviaLow(triviaLow); // for trivia card
    setIsBelowTarget(simLow || triviaLow); // for overall
    if (simLow || triviaLow) {
      playAlertOnce(
        ` Your latest score is below your target of ${targetScore}%.
Take a moment to review your mistakes and try again improvement comes fast when you stay consistent. `
      );
    }

  }

  const getMessage = (summary, belowTarget) => {
    if (!summary || summary === "empty") return { text: "", warning: false };
    const { latest, average } = summary;

    if (belowTarget)
      return {
        text: `Heads up! Your latest score (${latest}%) is below your target of ${profile?.target_score ?? 50}%. Don't be discouraged every attempt is a chance to learn and improve. Take a moment to review the questions you missed, focus on your weak areas, and try again. You’ve got this! Keep pushing and you’ll reach your goal.`,
        warning: true,
      };
    if (latest > average)
      return {
        text: `Nice job! Your latest score (${latest}%) is above your average (${average}%). 🎉 You're improving steadily and on the right track toward your target of ${profile?.target_score ?? 50}%. Keep this momentum going! 💪`,
        warning: false
      };

    return {
      text: `Keep going! Your latest score (${latest}%) is a step in your learning journey. Focus, review, and aim for your target of ${profile?.target_score ?? 50}%. Every attempt gets you closer you're capable of reaching it! 🌟`,
      warning: false
    };
  };
  const ProgressRing = ({ value }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;

    // ✅ Ensure value is a valid number
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
            strokeDashoffset={offset} // ✅ safe numeric value
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />

          <text
            x="50%"
            y="52%"
            dominantBaseline="middle"
            textAnchor="middle"
            className="text-xl font-bold"
            style={{ fill: "currentColor" }}
          >
            {safeValue}%
          </text>
        </svg>
      </div>
    );
  };
  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      {/* --- SECTION 1: GREETING & GOALS --- */}
      <div className="flex flex-col lg:flex-row gap-2 items-stretch">
        {/* Welcome Profile Card */}
        <div className="flex-1 flex items-center gap-2 p-4 rounded-[2rem] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="relative">
            <img
              src={profile?.avatar_url || "/UsersAvatar.jpg"}
              alt="avatar"
              className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-500/20 p-0.5"
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
        {/* Goals & Streak Card */}
        <div className="flex-[1.5] flex flex-wrap items-center justify-between gap-4 p-4 rounded-[2rem] bg-blue-600 dark:bg-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-none">

          {/* Target Setting Area */}
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

          {/* Streak Area */}
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

      {/* --- SECTION 2: PERFORMANCE CARDS --- */}
      <div className="grid gap-2 md:grid-cols-2 ">
        {/* SIMULATION SUMMARY */}
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

        {/* TRIVIA SUMMARY */}
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
/* --- UTILITY COMPONENT FOR STAT PILLS --- */
function StatPill({ label, value, color }: { label: string, value: string | number, color: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
      <span className="block text-[9px] uppercase font-bold text-gray-400 tracking-tighter">{label}</span>
      <span className={`text-xs font-bold ${color}`}>{value}</span>
    </div>
  );
}
// Reusable Sub-component for Stats to keep code clean
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