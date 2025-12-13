"use client";

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

function saveToLocalStorage(data: any) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Error saving to localStorage:", e);
  }
}

function loadFromLocalStorage() {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
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

  useEffect(() => {
    const fetchProgress = async (showLoader = true) => {
      if (showLoader) setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User not found or auth error");
        if (showLoader) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("quiz_results")
        .select("unit, score, total_questions")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching quiz results:", error.message);
        if (showLoader) setLoading(false);
        return;
      }

      // --- Group results by unit (highest progress, count attempts) ---
      const grouped: Record<string, { highestProgress: number; count: number }> = {};
      data?.forEach((res) => {
        const key = res.unit || "Unknown";
        const percent = res.total_questions > 0 ? (res.score / res.total_questions) * 100 : 0;

        if (!grouped[key]) grouped[key] = { highestProgress: percent, count: 1 };
        else {
          grouped[key].highestProgress = Math.max(grouped[key].highestProgress, percent);
          grouped[key].count += 1;
        }
      });

      // --- Build unit stats ---
      const unitsWithStats = allUnits
        .filter((unit) => grouped[unit.title])
        .map((unit) => {
          const stats = grouped[unit.title];
          const progress = Math.round(stats.highestProgress);
          const hours = stats.count * 1.5;
          const rating = stats.count > 0 ? 5 : 0;

          return {
            id: unit.code,
            name: unit.title,
            progress,
            rating,
            hoursStudied: hours,
            topicsCompleted: stats.count,
            totalTopics: stats.count, // number of attempts as totalTopics
          };
        });

      const totalStars = unitsWithStats.reduce((acc, s) => acc + s.rating, 0);

      // --- Only update if data changed ---
      const cached = loadFromLocalStorage();
      if (!cached || !isEqualData(cached.subjects, unitsWithStats)) {
        setSubjects(unitsWithStats);
        setTotalStarsEarned(totalStars);
        saveToLocalStorage({ subjects: unitsWithStats, totalStarsEarned: totalStars });
      }

      if (showLoader) setLoading(false);
    };

    // --- Initial load with cached data ---
    const cached = loadFromLocalStorage();
    if (cached) {
      setSubjects(cached.subjects);
      setTotalStarsEarned(cached.totalStarsEarned);
      setLoading(false);
    } else {
      fetchProgress(true);
    }

    // --- Realtime subscription ---
    const channel = supabase
      .channel("quiz_results_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_results" },
        () => fetchProgress(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const overallStats = {
    totalHours: subjects.reduce((acc, s) => acc + s.hoursStudied, 0),
    totalStars: totalStarsEarned,
    totalProgress: subjects.length
      ? subjects.reduce((acc, s) => acc + s.progress, 0) / subjects.length
      : 0,
    completedTopics: subjects.reduce((acc, s) => acc + s.topicsCompleted, 0),
    totalTopics: subjects.reduce((acc, s) => acc + s.totalTopics, 0),
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
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
              <p className="ml-4 text-muted-foreground">Updating progress...</p>
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

  useEffect(() => {
    // Load from localStorage instantly
    const storedSim = localStorage.getItem("simSummary");
    const storedTrivia = localStorage.getItem("triviaSummary");
    if (storedSim) setSimSummary(JSON.parse(storedSim));
    if (storedTrivia) setTriviaSummary(JSON.parse(storedTrivia));

    // Background fetch
    fetchSummary();
    loadProfile();
    calculateStreak();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("name, avatar_url")
      .eq("user_id", user.id)
      .single();
    setProfile(data);
  }

  async function calculateStreak() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);

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
      .filter((d) => d >= monday);

    const uniqueDays = new Set(allDates.map((d) => d.toDateString()));
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

    // --- Simulation ---
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
      if (summary.latest < 50) simLow = true;
    } else {
      setSimSummary("empty");
      localStorage.removeItem("simSummary");
    }

    // --- Trivia ---
    const { data: trivia } = await supabase
      .from("daily_trivia_results")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    let triviaLow = false;
    if (trivia?.length > 0) {
      const TOTAL_TRIVIA_QUESTIONS = 15;

      const scores = trivia.map((t) =>
        Math.round((t.score / TOTAL_TRIVIA_QUESTIONS) * 100)
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
      if (summary.latest < 50) triviaLow = true;
    } else {
      setTriviaSummary("empty");
      localStorage.removeItem("triviaSummary");
    }

    // Play alert if any low score
    if (simLow || triviaLow) {
      playAlertOnce("Your latest score is below 50. Focus and try again!");
    }
  }

  const getMessage = (summary) => {
    if (!summary || summary === "empty") return { text: "", warning: false };
    const { latest, average } = summary;
    if (latest >= 85) return { text: " Outstanding! You're mastering these topics!", warning: false };
    if (latest >= 70) return { text: " Great work! You’re improving steadily.", warning: false };
    if (latest >= 50) return { text: " You're making progress. Keep practicing for even stronger results.", warning: false };
    if (latest > average) return { text: " Nice! Your latest score is above your average. You're on the right track.", warning: false };
    return { text: "Your latest score is below 50. Focus and try again!", warning: true };
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
        <img src={profile?.avatar_url || "/UsersAvatar.jpg"} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
        <div className="text-lg font-semibold">{profile?.name ? `Welcome back, ${profile.name}!` : "Welcome back!"}</div>
        <div className="ml-auto text-center">
          <div className="text-sm bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full font-semibold">
            🔥 {streak}-day streak
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            Active attempt days this week
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
    </div>
  );
}
