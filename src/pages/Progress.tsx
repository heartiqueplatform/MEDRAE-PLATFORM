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
  Star,
  BookOpen,
  Clock,
  Award,
} from "lucide-react";

import { allUnits } from "@/constants/units";

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
  useEffect(() => {
    const fetchProgress = async (showLoader = true) => {
      if (showLoader) setLoading(true);

      // 1️⃣ Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User not found or auth error");
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
      if (!isEqualData(computedUnits, unitsWithStats)) {
        setUnitsWithStats(computedUnits);
        setSubjects(computedUnits);
        setTotalStarsEarned(totalStars);
        setTotalTopicsInApp(totalTopicsInApp);

        // 9️⃣ Save updated data to localStorage
        saveToLocalStorage(user.id, {
          subjects: computedUnits,
          totalStarsEarned: totalStars,
        });
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent">
          Study Progress Tracker
        </h1>
        <p className="text-muted-foreground mt-2">
          This tracker measures your learning journey in three ways:
          <br />• <strong>Progress %</strong> = highest quiz score in the unit.
          <br />• <strong>Stars</strong> = 5 if at least one quiz attempted.
          <br />• <strong>Hours Studied</strong> = 1.5 × number of attempts.
          <br /><br />
          To earn scores and update your progress, you must complete and submit quizzes in the Medrae Quizzes App — your results will automatically update here.
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{Math.round(overallStats.totalProgress)}%</p>
                <p className="text-sm text-muted-foreground">Overall Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{overallStats.totalHours}</p>
                <p className="text-sm text-muted-foreground">Hours Studied</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{overallStats.completedTopics}/{overallStats.totalTopics}</p>
                <p className="text-sm text-muted-foreground">Topics Done</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Star className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{overallStats.totalStars}★</p>
                <p className="text-sm text-muted-foreground">Total Stars Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- NEW SUMMARY CARDS (Simulation + Trivia) --- */}
      <SimulationAndTriviaSummary />
      <Tabs defaultValue="subjects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subjects">By Unit</TabsTrigger>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects" className="space-y-4">
          {subjects.length === 0 && loading ? (
            <div className="flex justify-center items-center py-10">
              <GlobalLoader />
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
              {subjects.map((subject) => (
                <Card key={subject.id} className="transition-all hover:shadow-lg hover:scale-105 duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{subject.name}</CardTitle>
                        <CardDescription>
                          {subject.topicsCompleted} of {subject.totalTopics} completed Atempt
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-1">
                          {renderStars(subject.rating)}
                        </div>
                        <Badge variant="secondary">{subject.progress}% Complete</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>{subject.progress}%</span>
                      </div>
                      <Progress value={subject.progress} className="h-2 [&>div]:bg-blue-500" />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-semibold text-lg">{subject.hoursStudied}</p>
                        <p className="text-muted-foreground">Hours</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-lg">{subject.topicsCompleted}</p>
                        <p className="text-muted-foreground">Atempt</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-lg">{subject.rating}/5</p>
                        <p className="text-muted-foreground">Rating</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Learning Timeline
              </CardTitle>
              <CardDescription>Your progress over the past weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-l-2 border-primary pl-4">
                <div className="relative">
                  <div className="absolute -left-6 w-3 h-3 bg-primary rounded-full" />
                  <div className="space-y-1">
                    <p className="font-medium">Completed latest quiz</p>
                    <p className="text-sm text-muted-foreground">Recently • Updated</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Learning Timeline
              </CardTitle>
              <CardDescription>Your progress over the past weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-l-2 border-primary pl-4">
                <div className="relative">
                  <div className="absolute -left-6 w-3 h-3 bg-primary rounded-full" />
                  <div className="space-y-1">
                    <p className="font-medium">Completed latest quiz</p>
                    <p className="text-sm text-muted-foreground">Recently • Updated</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
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

function SimulationAndTriviaSummary() {
  const [profile, setProfile] = useState(null);
  const [streak, setStreak] = useState(0);
  const [simSummary, setSimSummary] = useState(null);
  const [triviaSummary, setTriviaSummary] = useState(null);
  const [targetInput, setTargetInput] = useState(50);
  const [savingTarget, setSavingTarget] = useState(false);

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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("No user found:", userError);
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      console.error("No authenticated user found or error:", userError);
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

    const popup = document.createElement("div");
    popup.innerHTML = `🔥 New target saved: ${targetInput}%`;
    popup.className =
      "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 px-6 py-3 rounded-xl shadow-lg text-lg font-bold animate-bounce";
    document.body.appendChild(popup);

    setTimeout(() => {
      popup.remove();
      setSavingTarget(false);
    }, 2000);
  }

  async function calculateStreak() {
    const { data: { user } } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const todayKey = `alertShown-${new Date().toDateString()}`;
    const playAlertOnce = (message) => {
      if (!localStorage.getItem(todayKey)) {
        const audio = new Audio("/tap2.mp3");
        audio.play();
        alert(message);
        localStorage.setItem(todayKey, "true");
      }
    };

    const { data: sim } = await supabase
      .from("simulation_results")
      .select("*")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false });

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
      setSimSummary(summary);
      localStorage.setItem("simSummary", JSON.stringify(summary));
      if (summary.latest < (profile?.target_score ?? 50)) simLow = true;
    } else {
      setSimSummary("empty");
      localStorage.removeItem("simSummary");
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

    if (simLow || triviaLow) {
      playAlertOnce(`Your latest score is below your target of ${profile?.target_score ?? 50}. Focus and try again!`);
    }
  }

  const getMessage = (summary) => {
    if (!summary || summary === "empty") return { text: "", warning: false };
    const { latest, average } = summary;
    const target = profile?.target_score ?? 50;
    if (latest >= 85) return { text: " Outstanding! You're mastering these topics!", warning: false };
    if (latest >= 70) return { text: " Great work! You’re improving steadily.", warning: false };
    if (latest >= target) return { text: " You're making progress. Keep practicing for even stronger results.", warning: false };
    if (latest > average) return { text: " Nice! Your latest score is above your average. You're on the right track.", warning: false };
    return { text: `Your latest score is below your target of ${target}. Focus and try again!`, warning: true };
  };

  const ProgressRing = ({ value }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;
    return (
      <div className="flex justify-center mb-4">
        <svg width="120" height="120">
          <circle stroke="#e5e7eb" fill="transparent" strokeWidth="10" r={radius} cx="60" cy="60" />
          <circle stroke="#3b82f6" fill="transparent" strokeWidth="10" r={radius} cx="60" cy="60"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }} />
          <text
            x="50%"
            y="52%"
            dominantBaseline="middle"
            textAnchor="middle"
            className="text-xl font-bold"
            style={{ fill: "currentColor" }}
          >
            {value}%
          </text>
        </svg>
      </div>
    );
  };

  return (
    <div>
      {/* GREETING HEADER */}
      <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/40 dark:bg-gray-800/60 backdrop-blur border border-gray-300/30 dark:border-gray-700/30 animate-fade-slide">
        <img
          src={profile?.avatar_url || "/UsersAvatar.jpg"}
          alt="avatar"
          className="w-12 h-12 rounded-full object-cover"
        />
        <div className="text-lg font-semibold">
          {profile?.name ? `Welcome back, ${profile.name}!` : "Welcome back!"}
        </div>
        <div className="ml-auto text-center">
          <div className="mt-2 flex items-center justify-center gap-2">
            <label className="text-sm">My Target:</label>
            <input
              type="number"
              min={1}
              max={100}
              value={targetInput}
              onChange={(e) => setTargetInput(Number(e.target.value))}
              className={`w-16 p-1 rounded border text-center text-sm ${localStorage.getItem("theme") === "dark"
                ? "border-gray-600 text-white bg-gray-800"
                : "border-gray-300 text-black bg-white"
                }`}
            />
            <button
              onClick={saveTarget}
              disabled={savingTarget}
              className={`px-3 py-1 rounded text-white ${localStorage.getItem("theme") === "dark"
                ? "bg-blue-700 hover:opacity-80"
                : "bg-blue-600 hover:opacity-80"
                } transition`}
            >
              {savingTarget ? "Saving..." : "Save"}
            </button>
          </div>

          {/* Streak */}
          <div className="text-sm bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full font-semibold mt-2">
            🔥 {streak}-day streak
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            Active attempt days this week
          </p>

          {/* Mobile-friendly streak tip */}
          <p className="text-[10px] sm:text-[11px] text-gray-600 dark:text-gray-300 mt-1 px-1">
            Keep your streak by attempting at least one simulation or trivia each day.
          </p>
        </div>
      </div>


      {/* CARD GRID */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* SIMULATION CARD */}
        <Card className="hover:shadow-lg hover:-translate-y-1 transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-blue-500" /> Simulation Paper Summary</CardTitle>
            <CardDescription>Your overall performance in full mock exams</CardDescription>
          </CardHeader>
          <CardContent>
            {!simSummary || simSummary === "empty" ? <p className="text-muted-foreground">No simulation papers done yet.</p> :
              <>
                <ProgressRing value={simSummary.latest} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <SummaryItem label="Best" value={`${simSummary.best}%`} />
                  <SummaryItem label="Worst" value={`${simSummary.worst}%`} />
                  <SummaryItem label="Average" value={`${simSummary.average}%`} />
                  <SummaryItem label="Attempts" value={simSummary.attempts} />
                </div>
                <p className={`mt-4 text-center text-sm font-medium ${getMessage(simSummary).warning ? "text-red-600" : "text-primary"}`}>
                  {getMessage(simSummary).text}
                </p>
              </>
            }
          </CardContent>
        </Card>

        {/* TRIVIA CARD */}
        <Card className="hover:shadow-lg hover:-translate-y-1 transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-yellow-500" /> Daily Short Test Summary</CardTitle>
            <CardDescription>Your performance in quick daily tests</CardDescription>
          </CardHeader>
          <CardContent>
            {!triviaSummary || triviaSummary === "empty" ? <p className="text-muted-foreground">No daily tests attempted yet.</p> :
              <>
                <ProgressRing value={triviaSummary.latest} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <SummaryItem label="Best" value={`${triviaSummary.best}%`} />
                  <SummaryItem label="Worst" value={`${triviaSummary.worst}%`} />
                  <SummaryItem label="Average" value={`${triviaSummary.average}%`} />
                  <SummaryItem label="Attempts" value={triviaSummary.attempts} />
                </div>
                <p className={`mt-4 text-center text-sm font-medium ${getMessage(triviaSummary).warning ? "text-red-600" : "text-primary"}`}>
                  {getMessage(triviaSummary).text}
                </p>
              </>
            }
          </CardContent>
        </Card>
      </div>
    </div >
  );
}
