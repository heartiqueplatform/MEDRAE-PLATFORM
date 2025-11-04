import {
  Brain, Calendar, MessageCircle, Target, TrendingUp,
  Star, Clock, BookOpen, Trophy, ListChecks
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Link, useNavigate } from 'react-router-dom';
import { Send } from "lucide-react";
import { GlobalLoader } from "@/components/GlobalLoader";
export default function StudentDashboard() {
   const navigate = useNavigate(); // 👈 Add this line
  const user = useUser();
  const [name, setName] = useState<string | null>(null);
  const [studyProgress, setStudyProgress] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [studyStreak, setStudyStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [dailyContent, setDailyContent] = useState("");
  const [feedsAttemptCount, setFeedsAttemptCount] = useState(0);


// New state for daily post duration
const [dailyDuration, setDailyDuration] = useState<"24h" | "1w" | "1m" | "3m">("24h");
const [dailyImage, setDailyImage] = useState<File | null>(null);

const [dailyPosts, setDailyPosts] = useState<any[]>([]);
const [uploading, setUploading] = useState(false);
const { toast } = useToast();
const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
// Track the latest post ID
const [latestPostId, setLatestPostId] = useState<string | null>(null);
// Global loading state for spinner
// ✅ Smarter loading: skip spinner if we already have cached data
const cachedDashboard = localStorage.getItem("dashboardData");
const [loading, setLoading] = useState(!cachedDashboard); // Only show spinner if no cached data
const [dashboardLoaded, setDashboardLoaded] = useState(false); // track first load



const fetchFeedsAttemptCount = async () => {
  if (!user?.id) return;

  // ✅ Query the same table/view that Feeds page uses
  const { count, error } = await supabase
    .from("quiz_attempts") // Replace with the exact table Feeds uses if different
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!error && count !== null) {
    setFeedsAttemptCount(count);
  } else {
    console.error("Error fetching feeds attempt count:", error?.message);
  }
};

const loadDashboardData = async () => {
  
  if (!user?.id) return;

// Only show spinner if no cached data or first time loading
if (!cachedDashboard) setLoading(true); // Only show spinner if no cached data




  try {
    // Run all fetches in parallel
    await Promise.all([
  fetchProfile(),
  fetchProgress(),
  fetchQuizzes(),
  handleLoginAndStreak(),
  fetchCalendarEvents(),
  fetchUnitCounts(),
  fetchDailyPosts(),
  fetchSimulationPapers(), // 👈 add this
 fetchTopStudents(), // 👈 fetch global leaderboard

]);


    // Save merged dashboard state to localStorage
// Save merged dashboard state to localStorage
localStorage.setItem(
  "dashboardData",
  JSON.stringify({
    name,
    studyProgress,
    quizCount,
    avgScore,
    studyStreak,
    bestStreak,
    calendarEvents,
    dailyPosts,
    unitCounts,
    simulationPapers, // ✅ preserve simulation papers
    topStudents,      // ✅ preserve leaderboard
  })
);

// ✅ Mark dashboard as loaded
localStorage.setItem("dashboardDataLoaded", "true");
setDashboardLoaded(true);
setLoading(false); // hide spinner only after first full load

  } catch (err) {
    console.error("Error loading dashboard data:", err);
  } finally {
    setLoading(false); // Hide spinner when all data is loaded
  }
};

// Handle posting daily thought
const handlePostDaily = async () => {
  if (!user?.id) return; // Only logged-in users can post

  let image_url = null;
  if (dailyImage) {
    const { data, error } = await supabase
      .storage
      .from("statuspics")
      .upload(`${user.id}/${Date.now()}_${dailyImage.name}`, dailyImage);

    if (error) {
      console.error("Error uploading image:", error.message);
    }

    if (data) {
      const { data: urlData, error: urlError } = await supabase
        .storage
        .from("statuspics")
        .getPublicUrl(data.path);

      if (urlError) {
        console.error("Error getting public URL:", urlError.message);
      } else {
        image_url = urlData.publicUrl;
      }
    }
  }

const { data: post, error: insertError } = await supabase
  .from("daily_posts")
  .insert({
    user_id: user.id,      // Keep track of who posted
    content: dailyContent,
    image_url,
    duration: dailyDuration, // NEW: Save duration
  })
  .select()
  .single();


  if (insertError) {
    console.error("Error posting daily content:", insertError.message);
    return;
  }

  if (post) {
    setDailyPosts([post, ...dailyPosts]);
    setDailyContent("");
    setDailyImage(null);
    setLatestPostId(post.id); // Update latest post
  }
};

const handlePostClick = async () => {
  // ✅ Prevent empty posts
  if (!dailyContent.trim() && !dailyImage) {
    toast({
      title: "Cannot post empty content",
      description: "Please write something or attach an image before posting.",
      variant: "destructive",
    });
    return;
  }

  try {
    setUploading(true);
    await handlePostDaily();
    toast({
      title: "Success",
      description: "Your daily post was uploaded!",
    });
  } catch (err) {
    toast({
      title: "Error",
      description: "Something went wrong while posting.",
      variant: "destructive",
    });
  } finally {
    setUploading(false);
  }
};

// Handle deleting a daily post (only owner)
const handleDeletePost = async (postId: string, postUserId: string) => {
  if (user?.id !== postUserId) {
    toast({
      title: "Permission denied",
      description: "You can only delete your own posts",
      variant: "destructive",
    });
    return;
  }

  if (!confirm("Are you sure you want to delete this post?")) return;

  const { error } = await supabase
    .from("daily_posts")
    .delete()
    .eq("id", postId);

  if (error) {
    console.error("Error deleting post:", error.message);
    toast({
      title: "Error",
      description: "Could not delete the post.",
      variant: "destructive",
    });
    return;
  }

  setDailyPosts((prev) => prev.filter((post) => post.id !== postId));

  toast({
    title: "Deleted",
    description: "Your post was successfully deleted.",
  });
};

// Fetch daily posts (last 24 hours) - public for all users
const fetchDailyPosts = async () => {
 let durationMs = 24 * 60 * 60 * 1000; // default 24h
if (dailyDuration === "1w") durationMs = 7 * 24 * 60 * 60 * 1000;
if (dailyDuration === "1m") durationMs = 30 * 24 * 60 * 60 * 1000;
if (dailyDuration === "3m") durationMs = 90 * 24 * 60 * 60 * 1000;

const since = new Date(Date.now() - durationMs).toISOString();

  // Fetch all posts regardless of user
const { data: posts, error: postsError } = await supabase
  .from("valid_daily_posts") // 👈 query the view instead of the table
  .select("*")
  .order("created_at", { ascending: false });


  if (postsError) {
    console.error("Error fetching daily posts:", postsError.message);
    return;
  }

  if (!posts || posts.length === 0) {
    setDailyPosts([]);
    // 🚫 No toast for empty posts
    return;
}

  // Fetch profiles for all user_ids in posts
  const userIds = posts.map((p) => p.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, username, name, institution, county, avatar_url")
    .in("user_id", userIds);

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError.message);
    return;
  }

  // Merge posts with their profile
  const mergedPosts = posts.map((p) => ({
    ...p,
    profiles: profiles?.find((pr) => pr.user_id === p.user_id) || null,
  }));

  setDailyPosts(mergedPosts);

  // Notifications
if (latestPostId && mergedPosts[0]?.id && mergedPosts[0].id !== latestPostId) {

    toast({
      title: "New Daily Status!",
      description: "A new daily post is available. Scroll down to view it.",
    });
  } else if (!latestPostId) {
    toast({
      title: "Daily Status",
      description: "You're caught up today, nothing new!",
    });
  }

  setLatestPostId(mergedPosts[0].id);
};

// Initial fetch
// Load all dashboard data on page open
useEffect(() => {
  if (!user?.id) return;

  // ✅ Show cached dashboard first (no spinner)
  if (cachedDashboard) {
    try {
      const parsed = JSON.parse(cachedDashboard);
      if (parsed.name) setName(parsed.name);
      if (parsed.studyProgress) setStudyProgress(parsed.studyProgress);
      if (parsed.quizCount) setQuizCount(parsed.quizCount);
      if (parsed.avgScore) setAvgScore(parsed.avgScore);
      if (parsed.studyStreak) setStudyStreak(parsed.studyStreak);
      if (parsed.bestStreak) setBestStreak(parsed.bestStreak);
      if (parsed.calendarEvents) setCalendarEvents(parsed.calendarEvents);
      if (parsed.dailyPosts) setDailyPosts(parsed.dailyPosts);
      if (parsed.unitCounts) setUnitCounts(parsed.unitCounts);

    } catch (e) {
      console.error("Error parsing cached dashboard:", e);
    }
  }

  // 🔄 Refresh in background silently
  loadDashboardData();
  setDashboardLoaded(true); // we now have something to render instantly

}, [user]);

// Load initial count from localStorage
useEffect(() => {
const loadCount = () => {
  if (!user?.id) return;
  const count = parseInt(localStorage.getItem(`feed_count_${user.id}`)) || 0;
  setFeedsAttemptCount(count);
};

  loadCount();

  // ✅ Listen for updates if Feeds updates count in another tab
  const handleStorage = (e: StorageEvent) => {
    if (e.key?.startsWith("feed_count_")) {
      setFeedsAttemptCount(parseInt(e.newValue || "0"));
    }
  };
  window.addEventListener("storage", handleStorage);

  return () => window.removeEventListener("storage", handleStorage);
}, []);
// Auto-refresh every 60s
useEffect(() => {
  const interval = setInterval(() => {
    fetchDailyPosts();
  }, 60000);
  return () => clearInterval(interval);
}, [latestPostId]);

  // New: unit question counts from view
  const [unitCounts, setUnitCounts] = useState<any[]>([]);
  
  const [simulationPapers, setSimulationPapers] = useState<any[]>([]);
  const [simulationProgress, setSimulationProgress] = useState<Record<string, number>>({});
/// 🏆 Top students state
const [topStudents, setTopStudents] = useState<any[]>(() => {
  // ✅ initialize from localStorage to avoid initial loader flash
  const cached = localStorage.getItem("topStudents");
  return cached ? JSON.parse(cached) : [];
});

const [loadingTopStudents, setLoadingTopStudents] = useState(() => {
  // ✅ show loader only if no cached data
  const cached = localStorage.getItem("topStudents");
  return cached ? false : true;
});

const fetchTopStudents = async () => {
  try {
    // ✅ show loader only if we have no cached leaderboard
    setLoadingTopStudents(!topStudents.length);

    // 1️⃣ Get all quiz results
    const { data: results, error: resultsError } = await supabase
      .from("quiz_results")
      .select("user_id, score, total_questions");

    if (resultsError) throw resultsError;
    if (!results) return;

    // 2️⃣ Calculate stars + stats for each user
    const userMap: Record<string, { total: number; count: number }> = {};
    results.forEach((r) => {
      if (!userMap[r.user_id]) userMap[r.user_id] = { total: 0, count: 0 };
      if (r.total_questions > 0) {
        userMap[r.user_id].total += (r.score / r.total_questions) * 100;
        userMap[r.user_id].count += 1;
      }
    });

    const userStars = Object.entries(userMap).map(([userId, stats]) => {
      const avg = stats.count > 0 ? stats.total / stats.count : 0;
      let stars = 0;
      if (avg >= 90) stars = 5;
      else if (avg >= 75) stars = 4;
      else if (avg >= 60) stars = 3;
      else if (avg >= 40) stars = 2;
      else if (avg > 0) stars = 1;
      return { userId, stars, avg, count: stats.count };
    });

    // 3️⃣ Sort: stars → avg → count
    userStars.sort((a, b) => {
      if (b.stars !== a.stars) return b.stars - a.stars; // stars first
      if (b.avg !== a.avg) return b.avg - a.avg;         // then average %
      return b.count - a.count;                          // finally quizzes count
    });

    // 4️⃣ Fetch matching profiles
    const ids = userStars.map((u) => u.userId);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url, institution, county")
      .in("user_id", ids);

    if (profilesError) throw profilesError;

    // 5️⃣ Merge stars + stats with profile
    const merged = userStars.map((u) => {
      const profile = profiles?.find((p) => p.user_id === u.userId);
      return { ...u, ...profile };
    });

    // ✅ Only update state if there is a difference to prevent unnecessary re-renders
    const currentIds = topStudents.map((s) => s.userId).join(",");
    const newIds = merged.map((s) => s.userId).join(",");
    if (currentIds !== newIds) {
      setTopStudents(merged);
      localStorage.setItem("topStudents", JSON.stringify(merged)); // ✅ cache for future visits
    }
  } catch (err) {
    console.error("Error fetching top students:", err);
  } finally {
    setLoadingTopStudents(false); // ✅ stop loader always
  }
};


const fetchSimulationPapers = async () => {
  try {
    // 1️⃣ Fetch cached simulation papers first
    const cachedPapers = localStorage.getItem("simulationPapers");
    if (cachedPapers) {
      setSimulationPapers(JSON.parse(cachedPapers));
    }

    // 2️⃣ Fetch active simulation papers from Supabase
    const { data: papers, error: paperError } = await supabase
      .from("simulation_papers")
      .select("id, title, description, course, block, is_free, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (paperError) throw paperError;
    if (!papers) return;

    const paperIds = papers.map((p) => p.id);

    // 3️⃣ Fetch results for current user
    const { data: results } = await supabase
      .from("results")
      .select("paper_id, question_id, is_correct")
      .eq("user_id", user.id);

    // 4️⃣ Calculate percentage completed per paper
    const progressMap: Record<string, number> = {};
    papers.forEach((paper) => {
      const paperResults = results?.filter((r) => r.paper_id === paper.id) || [];
      const totalQuestions = paper.total_questions || 10; // fallback
      const percent = totalQuestions > 0 ? Math.round((paperResults.length / totalQuestions) * 100) : 0;
      progressMap[paper.id] = percent;
    });
    setSimulationProgress(progressMap);

    // 5️⃣ Fetch visits for these papers
    const { data: visits } = await supabase
      .from("simulation_visits")
      .select("paper_id")
      .in("paper_id", paperIds);

    const visitCounts = visits?.reduce((acc: Record<string, number>, visit) => {
      acc[visit.paper_id] = (acc[visit.paper_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const papersWithVisits = papers.map((paper) => ({
      ...paper,
      visit_count: visitCounts[paper.id] || 0,
    }));

    // 6️⃣ Only update state and cache if content has changed
    const cachedIds = cachedPapers ? JSON.parse(cachedPapers).map((p: any) => p.id).join(",") : "";
    const newIds = papersWithVisits.map((p) => p.id).join(",");
    if (cachedIds !== newIds) {
      setSimulationPapers(papersWithVisits);
      localStorage.setItem("simulationPapers", JSON.stringify(papersWithVisits));
    }
  } catch (error: any) {
    console.error("Error fetching simulation papers:", error.message);
  }
};

  const fetchProfile = async () => {
   if (!name) setLoading(true); // show spinner only if name not yet loaded
    const { data, error } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", user.id)
      .single();
    if (!error && data?.name) {
      setName(data.name.split(" ")[0]);
    }
    setLoading(false); // hide spinner
  };
const handleLoginAndStreak = async () => {
  const today = new Date().toISOString().split("T")[0];

  // ✅ First load from localStorage (instant UI)
  const cached = JSON.parse(localStorage.getItem("streakData") || "{}");
  if (cached?.currentStreak !== undefined) {
    setStudyStreak(cached.currentStreak);
    setBestStreak(cached.bestStreak || 0);
  }

  // ✅ Check if today's login exists in DB
  const { data: existing, error: existingError } = await supabase
    .from("login_activity")
    .select("*")
    .eq("user_id", user.id)
    .eq("login_date", today)
    .maybeSingle();

  if (!existing && !existingError) {
    await supabase.from("login_activity").insert({
      user_id: user.id,
      login_date: today,
    });
  }

  // ✅ Always fetch the latest streak from DB
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

    // ✅ Save to localStorage for instant access next time
    localStorage.setItem(
      "streakData",
      JSON.stringify({
        currentStreak: newStreak,
        bestStreak: Math.max(newStreak, cached.bestStreak || 0),
      })
    );
  }
};

const updateBestStreakIfNeeded = async (current: number) => {
  const { data, error } = await supabase
    .from("login_activity")
    .select("streak")
    .eq("user_id", user.id)
    .order("streak", { ascending: false })
    .limit(1)
    .single();

  if (!error && data) {
    const maxStreak = data.streak || 0;
    const best = current > maxStreak ? current : maxStreak;
    setBestStreak(best);

    // ✅ Update cached best streak silently
    const cached = JSON.parse(localStorage.getItem("streakData") || "{}");
    localStorage.setItem(
      "streakData",
      JSON.stringify({
        currentStreak: cached.currentStreak || current,
        bestStreak: best,
      })
    );
  } else {
    setBestStreak(current);
  }
};

const fetchProgress = async () => {
  const { data, error } = await supabase
    .from("progress")
    .select("percentage_complete")
    .eq("user_id", user.id);

  if (!error && data && data.length > 0) {
    const avg =
      data.reduce((sum, item) => sum + (item.percentage_complete || 0), 0) /
      data.length;
    setStudyProgress(Math.round(avg));
  } else {
    // fallback: calculate from quiz_results
    const { data: quizData, error: quizError } = await supabase
      .from("quiz_results")
      .select("score, total_questions")
      .eq("user_id", user.id);

    if (!quizError && quizData && quizData.length > 0) {
      const overall =
        quizData.reduce(
          (sum, item) =>
            sum + (item.total_questions > 0 ? (item.score / item.total_questions) * 100 : 0),
          0
        ) / quizData.length;

      setStudyProgress(Math.round(overall));
    } else {
      setStudyProgress(0);
    }
  }
};


  const fetchQuizzes = async () => {
    const { data, error } = await supabase
      .from("quiz_attempts")
      .select("score, submitted_at")
      .eq("user_id", user.id);
    if (!error && data.length > 0) {
      const scores = data.map((q) => q.score || 0);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      setQuizCount(data.length);
      setAvgScore(Math.round(avg));
      const submittedDates = data.map((q) => q.submitted_at);
      calculateStreak(submittedDates);
    }
  };

  const calculateStreak = (submittedDates: string[]) => {
    let streak = 0;
    let currentDate = new Date();
    const formatted = submittedDates.map((dateStr) =>
      new Date(dateStr).toISOString().split("T")[0]
    );
    while (formatted.includes(currentDate.toISOString().split("T")[0])) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }
    setStudyStreak(streak);
    updateBestStreakIfNeeded(streak);
  };

  const fetchCalendarEvents = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("calendar_events")
      .select("id, title, description, start_time, type, priority")
      .eq("user_id", user.id)
      .order("start_time", { ascending: true });
    if (!error && data) setCalendarEvents(data);
    else console.error("Error fetching calendar events:", error);
  };

 const fetchUnitCounts = async () => {
  try {
    // 1️⃣ Load cached unit counts first
    const cachedUnits = localStorage.getItem("unitCounts");
    if (cachedUnits) setUnitCounts(JSON.parse(cachedUnits));

    // 2️⃣ Fetch from Supabase
    const { data, error } = await supabase.from("quiz_question_counts").select("*");
    if (error) throw error;
    if (!data) return;

    // 3️⃣ Only update state and cache if different
    const cachedIds = cachedUnits ? JSON.parse(cachedUnits).map((u: any) => u.unit_id).join(",") : "";
    const newIds = data.map((u) => u.unit_id).join(",");
    if (cachedIds !== newIds) {
      setUnitCounts(data);
      localStorage.setItem("unitCounts", JSON.stringify(data));
    }
  } catch (err) {
    console.error("Error fetching unit counts:", err);
  }
};


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

return (
<div className="space-y-6 min-h-screen md:min-h-auto bg-gray-100 dark:bg-gray-900">

    {/* Welcome Section */}
<div className="bg-gradient-to-r from-blue-800 via-blue-900 to-black rounded-xl p-6 text-white">
  <h1 className="text-2xl md:text-3xl font-bold mb-2">
    {name ? (() => {
      const now = new Date();
      const hour = now.getHours();

      // ✅ Determine time of day correctly around midnight
      let timeGreeting: string;
      if (hour >= 5 && hour < 12) timeGreeting = "Good morning";
      else if (hour >= 12 && hour < 17) timeGreeting = "Good afternoon";
      else if (hour >= 17 && hour < 21) timeGreeting = "Good evening";
      else timeGreeting = "Good night";

      // Daily messages (preserve all guides)
      const dailyMessage: { [key: string]: { morning: string; afternoon: string; evening: string; night: string } } = {
        Sunday: {
          morning: `Welcome to a new week of professional growth. Reflect on your achievements and prepare for a week full of learning and skill development.`,
          afternoon: `Keep building momentum today. Take time to consolidate your learning and plan for the week ahead.`,
          evening: `Wrap up your Sunday with reflection and preparation. Celebrate small wins and set goals for a productive week.`,
          night: `Hope your Sunday winds down peacefully. Take a moment to rest and recharge for the week ahead.`
        },
        Monday: {
          morning: `Welcome to the start of a productive week. Review your notes and practice essential skills with focus and confidence.`,
          afternoon: `Keep pushing forward and apply what you've learned so far. Every effort counts towards mastery.`,
          evening: `Reflect on what you accomplished today and plan your next steps. Your dedication sets the tone for a successful week.`,
          night: `Hope your Monday winds down smoothly. Rest well and prepare for continued growth tomorrow.`
        },
        Tuesday: {
          morning: `Welcome to another day of advancement. Stay curious and continue building your clinical expertise.`,
          afternoon: `Keep progressing and challenging yourself. Every step brings you closer to mastery.`,
          evening: `Review today's achievements and consider areas for improvement. Growth is built daily.`,
          night: `Hope your Tuesday concludes positively. Rest and recharge to continue your learning journey.`
        },
        Wednesday: {
          morning: `Welcome to midweek. Celebrate your progress so far and stay motivated for the remainder of the week.`,
          afternoon: `Continue applying your skills and reflect on your learning. Midweek is perfect for focus and refinement.`,
          evening: `Wrap up your Wednesday with reflection and planning. Your consistent effort is impressive.`,
          night: `Hope your Wednesday evening is relaxing. Recharge and prepare for the rest of the week.`
        },
        Thursday: {
          morning: `Welcome to a new day of professional growth. Embrace every learning opportunity and refine your skills.`,
          afternoon: `Keep applying knowledge in practice. Small consistent steps lead to mastery.`,
          evening: `Reflect on what you learned today and celebrate progress made.`,
          night: `Hope your Thursday winds down well. Rest and get ready to finish the week strong.`
        },
        Friday: {
          morning: `Welcome to the final stretch of the week. Focus on consolidating knowledge and practicing skills.`,
          afternoon: `Keep moving forward and apply lessons learned this week.`,
          evening: `Reflect on the week’s accomplishments and plan for next week’s growth.`,
          night: `Hope your Friday evening is peaceful. Take time to rest and recharge for the weekend.`
        },
        Saturday: {
          morning: `Welcome to a day for reflection and skill refinement. Review your progress and deepen your understanding.`,
          afternoon: `Continue exploring new concepts and applying knowledge practically.`,
          evening: `Wrap up Saturday with reflection and acknowledge your achievements.`,
          night: `Hope your Saturday concludes positively. Rest well and prepare for the week ahead.`
        }
      };

      const today = now.toLocaleDateString('en-US', { weekday: 'long' });

      // ✅ Determine time of day key
      let timeOfDay: "morning" | "afternoon" | "evening" | "night";
      if (hour >= 5 && hour < 12) timeOfDay = "morning";
      else if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
      else if (hour >= 17 && hour < 21) timeOfDay = "evening";
      else timeOfDay = "night";

      // ✅ Build the welcome message
      const welcomeMessage = `${timeGreeting}, ${name} 👋! ${dailyMessage[today][timeOfDay]}`;

      // ✅ Cache in localStorage for instant load next time
      localStorage.setItem("welcomeMessage", welcomeMessage);

      return welcomeMessage;
    })() : localStorage.getItem("welcomeMessage") || "Loading..."}
    {loading && (
      <span className="ml-3 inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300 rounded-lg animate-pulse">
        Updating…
      </span>
    )}
  </h1>

  <p className="text-white/90">
    {(() => {
      const nursingMessages = {
        Sunday: " Sunday reset: Rest up, future nurse! Take today to recharge, reflect on your progress, and plan for the week ahead. Your patients will appreciate your energy and dedication tomorrow!",
        Monday: " Motivated Monday! A fresh week to sharpen your nursing skills, tackle challenging concepts, and set new goals. Remember, every step today brings you closer to becoming the nurse you aspire to be.",
        Tuesday: "Triage Tuesday! Keep organizing your notes, practicing procedures, and building your knowledge. Focus on consistency and small victories—they add up to big success in your nursing journey.",
        Wednesday: " Wellness Wednesday! Halfway through the week—keep your energy high and your mind sharp. Take a moment to celebrate your wins so far, and remember that persistence is key to mastery.",
        Thursday: " Thriving Thursday! Your dedication to learning and improving as a nurse is inspiring. Push through, review what you’ve learned, and keep challenging yourself—you’re making amazing progress!",
        Friday: "Fantastic Friday! End the week strong by consolidating your knowledge, practicing skills, and reflecting on your achievements. Celebrate your growth and get ready to recharge for an even better week ahead.",
        Saturday: " Study Saturday! Use today to review, practice, and deepen your understanding. Whether it’s theory or hands-on skills, every effort counts. Your future patients and colleagues will thank you for your commitment."
      };
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

      // ✅ Cache nursing message too
      const message = nursingMessages[today] || "Keep pushing—you’re doing amazing! Every effort you make today brings you closer to your dream nursing career.";
      localStorage.setItem("nursingMessage", message);

      return message;
    })()}
  </p>
</div>


{/* 🏆 Top Students Leaderboard */}
<Card className="rounded-2xl shadow-lg w-full max-w-full overflow-hidden">
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
      <Trophy className="h-5 w-5 text-yellow-500" />
      Top Students
    </CardTitle>
    <CardDescription>
      Ranked by stars earned across all submitted quizzes. The leaderboard highlights 
      learners who consistently perform well, encouraging healthy competition.
    </CardDescription>

    {/* 🔽 Explanation Dropdown (scrolls internally) */}
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline">
        How winners are chosen?
      </summary>
      <div className="mt-2 max-h-44 overflow-y-auto pr-2 space-y-3 text-gray-600 dark:text-gray-300 custom-scrollbar">
        {/* ⭐ How stars are calculated */}
        <div>
          <h4 className="font-semibold">1. How stars are calculated</h4>
          <ul className="list-disc ml-5 mt-1 space-y-1">
            <li>90%+ average → ⭐⭐⭐⭐⭐</li>
            <li>75–89% → ⭐⭐⭐⭐</li>
            <li>60–74% → ⭐⭐⭐</li>
            <li>40–59% → ⭐⭐</li>
            <li>1–39% → ⭐</li>
          </ul>
          <p className="mt-1 text-xs italic">
            Stars come from the average quiz performance across all attempts.
          </p>
        </div>

        {/* Ranking rules */}
        <div>
          <h4 className="font-semibold">2. Ranking rules</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Students are ranked by <strong>total stars earned</strong>.</li>
            <li>If stars are equal → compare <strong>average quiz scores</strong>.</li>
            <li>If still tied → the student with <strong>more quizzes attempted</strong> wins.</li>
          </ul>
          <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-1">
            This ensures there is always one clear winner at the top.
          </p>
        </div>

        {/* Tip + Button */}
        <p className="text-sm">
          Want to improve your ranking? Attempt more units and submit results on the quizzes page.
        </p>

        <Button
          asChild
          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
        >
          <Link to="/heartique-quizzes">Go to Heartique Quizzes</Link>
        </Button>
      </div>
    </details>
  </CardHeader>

  {/* 🧑‍🎓 Leaderboard Section (scrolls internally) */}
  <CardContent>
    <div className="relative w-full h-60 sm:h-64 md:h-56 lg:h-60">
      <div className="absolute inset-0 overflow-x-auto overflow-y-auto flex gap-4 p-2 custom-scrollbar">
        {loadingTopStudents ? (
          <div className="flex justify-center items-center w-full">
            <GlobalLoader message="Loading top students..." />
          </div>
        ) : topStudents.length > 0 ? (
          topStudents.map((s, idx) => {
            const rankColor =
              idx === 0
                ? "from-yellow-400 to-yellow-200"
                : idx === 1
                ? "from-gray-400 to-gray-200"
                : idx === 2
                ? "from-amber-600 to-amber-300"
                : "from-gray-100 to-gray-50";

            return (
              <div
                key={s.userId}
                className={`flex-shrink-0 w-36 sm:w-40 p-3 rounded-xl border shadow bg-gradient-to-br ${rankColor} dark:from-gray-800 dark:to-gray-900`}
              >
                <div className="flex flex-col items-center text-center">
                  <img
                    src={s.avatar_url || "/default-avatar.png"}
                    alt={s.name}
                    className="w-12 h-12 rounded-full mb-2 object-cover border border-white shadow"
                  />

                  {/* 🧠 Name (wraps to 2 lines max) */}
                  <h3
                    className="font-medium text-sm sm:text-base text-gray-900 dark:text-white max-w-[8rem] line-clamp-2"
                    title={s.name}
                  >
                    {s.name || "Unknown"}
                  </h3>

                  {/* 🏫 Institution (also wraps to 2 lines) */}
                  <p
                    className="text-xs text-gray-700 dark:text-gray-300 max-w-[8rem] line-clamp-2"
                    title={s.institution}
                  >
                    {s.institution || "Institution"}
                  </p>

                  {/* 🌍 County (1 line max, short anyway) */}
                  <p
                    className="text-xs text-gray-500 max-w-[8rem] truncate"
                    title={s.county}
                  >
                    {s.county || ""}
                  </p>

                  {/* ⭐ Stars */}
                  <div className="flex justify-center mt-2 text-yellow-500">
                    {Array.from({ length: s.stars }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400" />
                    ))}
                  </div>

                  {/* 🥇 Medal Label */}
                  {idx < 3 && (
                    <p className="text-xs mt-2 font-semibold text-white bg-black/50 px-2 py-1 rounded-full whitespace-nowrap">
                      {idx === 0 ? "🥇 Gold" : idx === 1 ? "🥈 Silver" : "🥉 Bronze"}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-500">No top students yet</p>
        )}
      </div>
    </div>
  </CardContent>
</Card>

<Card
  className="relative cursor-pointer hover:shadow-lg transition-shadow col-span-1 md:col-span-2"
  onClick={() => {
    if (navigator.vibrate) navigator.vibrate(50);
    navigate("/feed");
  }}
  style={{
    backgroundColor: "var(--card-bg)",
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
>
  {/* Overlay */}
  <div className="absolute inset-0 bg-white/10 dark:bg-gray-800/30 z-10 rounded-2xl"></div>

  <div className="relative z-20 p-4 flex flex-col justify-between h-full">
    {/* Card Heading */}
    <div className="mb-2">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
        Feed & Leaderboard
      </h2>
    </div>

    <CardHeader className="flex items-center justify-between pb-2">
      <Brain className="h-5 w-5 text-gray-700 dark:text-white/80" />
    </CardHeader>

    <CardContent className="flex flex-col gap-3 text-xs md:text-sm">
      <p className="text-gray-700 dark:text-white/90">
        Scroll through random questions endlessly. Use your free time productively by attempting questions continuously.
        The more questions you attempt, the higher your chances of becoming the top student and leading the leaderboard.
      </p>

      {/* Stats Row */}
      <div className="flex flex-col md:flex-row justify-start items-center md:items-start gap-6">
        {/* Questions Attempted */}
        <div className="flex flex-col items-center md:items-start">
          <p className="text-xs text-gray-500 dark:text-white/70">
            Questions Attempted
          </p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {feedsAttemptCount}
          </p>
        </div>

        {/* Leader Student */}
        {topStudents.length > 0 && (
          <div
            className="flex flex-col items-center cursor-pointer w-24 md:w-24 mt-2 md:mt-0"
            onClick={(e) => {
              e.stopPropagation();
              if (navigator.vibrate) navigator.vibrate(50);
              navigate("/feed");
            }}
          >
            <p className="text-xs text-gray-500 dark:text-white/70 text-center">
              Leader Student
            </p>
            <img
              src={topStudents[0].avatar_url || "/default-avatar.png"}
              alt={topStudents[0].name}
              className="w-12 h-12 rounded-full mt-1 object-cover border-2 border-gray-300/30 dark:border-white/30 shadow-sm"
            />
            <p className="text-xs mt-1 truncate text-center text-gray-700 dark:text-white/90 font-medium">
              {topStudents[0].name}
            </p>

            {/* 🧮 Questions Answered Count */}
            {topStudents[0].answeredCount !== undefined && (
              <p className="text-[11px] mt-1 px-2 py-1 rounded-md text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/30 font-semibold shadow-sm text-center">
                {topStudents[0].answeredCount} answered
              </p>
            )}
          </div>
        )}
      </div>

      {/* Centered Button */}
      <div className="flex justify-center mt-3">
        <Button
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-sm font-medium w-full sm:w-3/4 md:w-1/2"
          onClick={(e) => {
            e.stopPropagation();
            if (navigator.vibrate) navigator.vibrate(50);
            navigate("/feed");
          }}
        >
          Go to Feeds
        </Button>
      </div>
    </CardContent>
  </div>
</Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card
  className="relative overflow-hidden rounded-2xl shadow-lg"
  style={{
    backgroundImage: "url('/background06.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
>
  {/* Dark overlay for readability */}
  <div className="absolute inset-0 bg-black/50" />

  {/* Content above overlay */}
  <div className="relative z-10">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-white">
        Study Progress
      </CardTitle>
      <TrendingUp className="h-4 w-4 text-white" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-white">{studyProgress}%</div>
      <Progress value={studyProgress} className="mt-2" />
    </CardContent>
  </div>
</Card>

    <Card
  className="relative overflow-hidden rounded-2xl shadow-lg"
  style={{
    backgroundImage: "url('/background07.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
>
  {/* Dark overlay for readability */}
  <div className="absolute inset-0 bg-black/50" />

  {/* Content above overlay */}
  <div className="relative z-10">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-white">
        Quizzes Completed
      </CardTitle>
      <Target className="h-4 w-4 text-white" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-white">{quizCount}</div>
      <p className="text-xs text-white/80">+3 this week</p>
    </CardContent>
  </div>
</Card>


      <Card className="relative cursor-pointer hover:shadow-lg transition-shadow">
  {/* Background Image */}
  <div
    className="absolute inset-0"
    style={{
      backgroundImage: "url('/background05.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      zIndex: 0,
    }}
  />
  {/* Dark Overlay */}
  <div className="absolute inset-0 bg-black/50 z-10 rounded-lg"></div>

  {/* Card Content */}
  <div className="relative z-20 p-4">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-white">Average Score</CardTitle>
      <Star className="h-4 w-4 text-white/80" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-white">{avgScore}%</div>
      <p className="text-xs text-white/80">+5% from last month</p>
    </CardContent>
  </div>
</Card>

<Card
  className="relative overflow-hidden rounded-2xl shadow-lg"
  style={{
    backgroundImage: "url('/background08.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
>
  {/* Dark overlay for readability */}
  <div className="absolute inset-0 bg-black/50" />

  {/* Content above overlay */}
  <div className="relative z-10">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-white">
        Current Streak
      </CardTitle>
      <Clock className="h-4 w-4 text-white" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-white">{studyStreak} days</div>
      <p className="text-xs text-white/80">Keep it up!</p>
    </CardContent>
  </div>
</Card>

<Card
  className="relative overflow-hidden rounded-2xl shadow-lg"
  style={{
    backgroundImage: "url('/background09.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
>
  {/* Dark overlay for readability */}
  <div className="absolute inset-0 bg-black/50" />

  {/* Content above overlay */}
  <div className="relative z-10">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-white">
        Best Streak
      </CardTitle>
      <Trophy className="h-4 w-4 text-yellow-500" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-white">{bestStreak} days</div>
      <p className="text-xs text-white/80">All-time record</p>
    </CardContent>
  </div>
</Card>

      </div>
 
<Card className="lg:col-span-3 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
  <CardHeader>
    <CardTitle className="text-gray-900 dark:text-white">Heartique Daily Status💖 </CardTitle>
    <CardDescription className="text-gray-700 dark:text-gray-300">
  This section is a space for nursing and medical professionals to share insights, reflections, and practical experiences. Contributions should be educational, thought-provoking, and meaningful, helping yourself and peers grow in knowledge and professional awareness. By sharing responsibly, you inspire others, spark discussions, and build a supportive learning community.
</CardDescription>

  </CardHeader>

  <CardContent className="space-y-4">
    <textarea
      className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="Write today's thought..."
      value={dailyContent}
      onChange={(e) => setDailyContent(e.target.value)}
    />

    <div className="flex items-center gap-2 mt-2">
      <label className="text-gray-900 dark:text-white text-sm">Visible for:</label>
      <select
        value={dailyDuration}
        onChange={(e) => setDailyDuration(e.target.value as any)}
        className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm p-1 rounded"
      >
        <option value="24h">24 Hours</option>
        <option value="1w">1 Week</option>
        <option value="1m">1 Month</option>
        <option value="3m">3 Months</option>
      </select>
    </div>

{/* Hidden file input */}
<input
  id="dailyImageUpload"
  type="file"
  accept="image/*"
  onChange={(e) => setDailyImage(e.target.files ? e.target.files[0] : null)}
  className="hidden"
/>

{/* Styled attach button */}
<div className="flex flex-col items-center w-full md:flex-row md:justify-center md:space-x-4 gap-2">
  <label
    htmlFor="dailyImageUpload"
    className="flex items-center justify-center gap-2 cursor-pointer bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition w-full h-12 rounded-lg"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4 text-red-500"
      fill="currentColor"
      viewBox="0 0 24 24"
      stroke="none"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 
               4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 
               14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 
               6.86-8.55 11.54L12 21.35z" />
    </svg>
    Attach Image
  </label>

  <Button 
    onClick={handlePostClick} 
    className="bg-blue-600 hover:bg-blue-700 text-white text-sm w-full h-12 flex items-center justify-center gap-2 rounded-lg"
    disabled={uploading}
  >
    {uploading ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Uploading...
      </>
    ) : (
      <>
        <Send className="w-4 h-4" />
        Post
      </>
    )}
  </Button>
</div>
    {/* Display recent daily posts */}
    <div className="space-y-3 mt-4">
      {dailyPosts.length > 0 ? dailyPosts.map((post) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        >
          <div className="flex flex-col md:flex-row gap-4 items-start">
            {/* User Info */}
            <div className="flex-shrink-0 flex flex-col items-center md:items-start gap-2">
              {post.profiles?.avatar_url ? (
                <img
                  src={post.profiles.avatar_url}
                  alt={post.profiles.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-500 flex items-center justify-center text-gray-900 dark:text-white">
                  {post.profiles?.username?.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{post.profiles?.full_name}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">@{post.profiles?.username}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{post.profiles?.institution}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{post.profiles?.county}</p>
            </div>

            {/* Post Content & Image */}
            <div className="flex-1 flex flex-col gap-2">
              {post.content && <p className="text-gray-900 dark:text-white">{post.content}</p>}
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt="daily"
                  className="rounded w-full max-h-96 object-contain bg-gray-100 dark:bg-black cursor-pointer"
                  onClick={() => setFullscreenImage(post.image_url)}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>

            {/* Delete Button */}
            {user?.id === post.user_id && (
              <Button
                variant="destructive"
                size="sm"
                className="ml-auto md:ml-0 mt-2 md:mt-0"
                onClick={() => handleDeletePost(post.id, post.user_id)}
              >
                Delete
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })} • 
            Expires on {new Date(post.expires_at).toLocaleString()}
          </p>
        </motion.div>
      )) : null}
    </div>
  </CardContent>

  {/* Fullscreen modal */}
  {fullscreenImage && (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={() => setFullscreenImage(null)}
    >
      <img
        src={fullscreenImage}
        alt="fullscreen"
        className="max-w-full max-h-full object-contain rounded"
      />
    </div>
  )}
</Card>

{/* Share App Card */}
<Card className="rounded-2xl shadow-md border bg-white dark:bg-gray-900">
  <CardHeader>
    <CardTitle className="text-lg font-semibold">Share This App</CardTitle>
    <CardDescription>
      Help your friends and colleagues discover Heartique by sharing this app.
    </CardDescription>
  </CardHeader>
<CardContent>
  <div className="flex flex-col md:flex-row md:justify-center md:space-x-4 gap-2">
    <Button
      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex-1 md:flex-none md:w-64 flex items-center justify-center gap-2 text-sm"
      onClick={() => {
        const shareMessage =
`Heartique Nursing Nexus Scholar – Your Nursing Learning Companion

• Ordered questions by unit for structured study
• High-quality media & videos chosen to simplify complex topics
• Full course units Notes arranged in blocks and sems for easy navigation
• NCK simulation practice designed to train you like a pro

Start your journey today: https://heartique-platform.vercel.app`;

        if (navigator.share) {
          navigator
            .share({
              title: "Heartique Scholar",
              text: shareMessage,
              url: "https://heartique-platform.vercel.app",
            })
            .catch(err => console.log("Share cancelled:", err));
        } else {
          navigator.clipboard.writeText(shareMessage);
          alert("App link and description copied to clipboard!");
        }
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 12v.01M12 4v.01M20 12v.01M12 20v.01M16 8l5 4-5 4M8 8l-5 4 5 4"
        />
      </svg>
      Share
    </Button>
  </div>
</CardContent>
</Card>

{/* WhatsApp Channel Card */}
<Card className="shadow-md">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <MessageCircle className="w-5 h-5 text-primary" />
      Join Our WhatsApp Channel
    </CardTitle>
    <CardDescription>
      Stay updated with important announcements and new study content.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <a
      href="https://whatsapp.com/channel/0029VbBFzgAEawdkJKtRtF2H"
      target="_blank"
      rel="noopener noreferrer"
    >
<div className="flex justify-center">
  <Button className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex-1 md:flex-none md:w-64 flex items-center justify-center gap-2 text-sm">
    <MessageCircle className="w-4 h-4" />
    WhatsApp Channel
  </Button>
</div>


    </a>
  </CardContent>
</Card>
{/* WhatsApp Group Card */}
<Card className="shadow-md">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <MessageCircle className="w-5 h-5 text-green-600" />
      Join Our WhatsApp Group
    </CardTitle>
    <CardDescription>
      Connect with fellow nursing and medical students.  
      Share insights, ask questions, and stay updated with study materials.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <a
      href="https://chat.whatsapp.com/Lad2s4XXx1AA1TtThbMgWV"
      target="_blank"
      rel="noopener noreferrer"
    >
   <div className="flex justify-center">
  <Button className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex-1 md:flex-none md:w-64 flex items-center justify-center gap-2 text-sm">
    <MessageCircle className="w-4 h-4" />
    WhatsApp Group
  </Button>
</div>


    </a>
  </CardContent>
</Card>

 {/* Simulation Papers Section */} 
<Card className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
  <CardHeader>
    <CardTitle className="text-gray-900 dark:text-white">
      Self Test Simulation Papers V1  
      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
        ({simulationPapers.length} Papers)
      </span>
    </CardTitle>
    <CardDescription className="text-gray-700 dark:text-gray-300">
      Prepare smarter with simulation papers designed to mirror real exam conditions.  
      Practicing here helps you build confidence, improve time management, reduce anxiety, and sharpen focus.  
      Students who regularly use simulations perform better by identifying weak areas early and training their mind to stay calm under pressure.
    </CardDescription>

    {/* Show total available papers below description */}
    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
      {simulationPapers.length} simulation papers available — start practicing today!
    </p>

    {/* Warning for users */}
    <div className="mt-2 p-3 rounded-lg bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm font-semibold">
     For the best experience and smoothest interaction, we recommend using a desktop or laptop. While some phones can run the simulation, using a larger device ensures optimal comfort and engagement.
    </div>

    {/* Extra Tip Box */}
    <div className="mt-2 p-3 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs italic">
      Tip: Treat each simulation as if it’s the real exam  no distractions, no breaks.
    </div>
  </CardHeader>

  <CardContent>
    {loading ? (
      <div className="flex items-center justify-center h-24">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {simulationPapers.length > 0 ? (
          simulationPapers.map((paper) => (
            <Card
              key={paper.id}
              className="flex flex-col justify-between cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
              onClick={async () => {
                // Navigate to simulation page
                navigate(`/simulation/${paper.id}`);
                
                // Track visit in Supabase
                const { data: userData } = await supabase.auth.getUser();
                await supabase.from("simulation_visits").insert({
                  paper_id: paper.id,
                  user_id: userData?.user?.id || null,
                });
              }}
            >
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white text-lg line-clamp-2">
                  {paper.title}
                  {/* Highlight new papers */}
                  {new Date(paper.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                    <Badge className="ml-2" variant="outline">New</Badge>
                  )}
                  {/* Difficulty level */}
                  {paper.difficulty && (
                    <Badge className="ml-2" variant="secondary">
                      {paper.difficulty}
                    </Badge>
                  )}
                </CardTitle>
                {paper.course && (
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                    {paper.course} {paper.block ? ` - ${paper.block}` : ""}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="flex flex-col flex-1 justify-between">
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                  {paper.description || "No description available."}
                </p>

                {/* Estimated duration */}
                <p className="text-xs text-gray-500 mt-1">
                  ⏱ Estimated time:{" "}
                  {(() => {
                    const duration = Number(paper.duration) || 30;
                    if (duration < 60) return `${duration}m`;
                    if (duration % 60 === 0) return `${duration / 60}h`;
                    return `${Math.floor(duration / 60)}h ${duration % 60}m`;
                  })()}
                </p>

               {/* Visits count */}
<p className="text-xs text-gray-500 mt-1">
  {paper.visit_count} visits
</p>


                {/* Progress bar */}
                <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
  className="h-2 bg-blue-500"
  style={{ width: `${simulationProgress[paper.id] || 0}%` }}
/>

                </div>

                <div className="mt-3 flex items-center justify-between">
                  <Badge variant={paper.is_free ? "default" : "secondary"}>
                    {paper.is_free ? "Free" : "Premium"}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(paper.created_at))} ago
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-gray-600 dark:text-gray-400">
            No simulation papers available yet.
          </p>
        )}
      </div>
    )}

    {/* Motivational CTA */}
    <p className="mt-6 text-center text-sm font-medium text-blue-600 dark:text-blue-400">
      Every simulation you complete brings you one step closer to exam success!
    </p>
  </CardContent>
</Card>



{/* Telegram Channel Card */}
<Card className="shadow-md">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Send className="w-5 h-5 text-blue-600" />
      Join Our Telegram Channel
    </CardTitle>
    <CardDescription>
       Stay updated with the latest resources, study tips, and announcements.  
      Be part of our growing community of nursing and medical scholars.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <a
      href="https://t.me/heartiquenursingnexusscholar"
      target="_blank"
      rel="noopener noreferrer"
    >
   <div className="flex justify-center">
  <Button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex-1 md:flex-none md:w-64 flex items-center justify-center gap-2 text-sm">
    <Send className="w-4 h-4" />
    Telegram Channel
  </Button>
</div>


    </a>
  </CardContent>
</Card>

      {/* New Unit Question Counts Section */}
      <Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <div>
      <CardTitle>HEARTIQUE QUIZZES APP UNIT BREAKDOWN</CardTitle>
      <CardDescription>
        All units and their available question counts. Click the tab to start practicing instantly.
      </CardDescription>
    </div>
    <Button
  asChild
  className="bg-blue-500 hover:bg-green-500 text-white transition-all transform hover:scale-105 shadow-md hover:shadow-lg"
>
  <Link to="/heartique-quizzes">Go to Quizzes</Link>
</Button>

  </CardHeader>
  <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {unitCounts.length > 0 ? (
      unitCounts.map((unit) => (
       <div
  key={unit.unit_code}
  className="p-4 border rounded-lg flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
  onClick={() => navigate('/heartique-quizzes')}
>

          <div>
            <p className="text-sm font-medium">{unit.unit}</p>
            <p className="text-xs text-muted-foreground">{unit.unit_code}</p>
          </div>
          <Badge>{unit.count} Qs</Badge>
        </div>
      ))
    ) : (
      <p className="text-sm text-muted-foreground">No unit data available.</p>
    )}
  </CardContent>
</Card>


      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
       
        {/* Right - Actions & Assessments */}
        <div className="flex flex-col md:flex-row w-full h-auto gap-6">



<Card
  className="w-full md:w-1/2 h-full cursor-pointer hover:shadow-lg transition-shadow"
  style={{
    backgroundImage: "url('/background04.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
>
  <CardHeader>
    <CardTitle className="text-white">Quick Actions</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
  <Button
  className="w-full justify-start"
  variant="outline"
  asChild
>
  <Link to="/ai-assistant">
    <Brain className="mr-2 h-4 w-4" />
    Ask AI Assistant
  </Link>
</Button>

  </CardContent>
</Card>

<Card
  className="w-full md:w-1/2 h-full cursor-pointer hover:shadow-lg transition-shadow"

  style={{
    backgroundImage: "url('/background05.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
>
  <CardHeader>
    <CardTitle className="text-white">UPCOMING REDLETTER DATES</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    {calendarEvents.length > 0 ? (
      calendarEvents.map((event) => (
        <div
          key={event.id}
          className="flex items-center justify-between p-2 rounded bg-muted/30"
        >
          <div>
            <p className="text-sm font-medium text-white">{event.title}</p>
            <p className="text-xs text-white/80">{event.type}</p>
          </div>
          <Badge className={getPriorityColor(event.priority)}>
            {new Date(event.start_time).toLocaleDateString()}
          </Badge>
        </div>
      ))
    ) : (
      <p className="text-sm text-white/70">No upcoming assessments.</p>
    )}
  </CardContent>
</Card>

<Card
  className="w-full md:w-1/2 h-full cursor-pointer hover:shadow-lg transition-shadow"

  style={{
    backgroundImage: "url('/background03.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
>
  <CardHeader>
    <CardTitle className="text-white">Go Premium / Subscription</CardTitle>
  </CardHeader>
  <CardContent className="flex items-center justify-center">
<Button
  asChild
  className="w-full bg-purple-500 hover:bg-purple-600 text-white"
>
  <Link to="/subscription">
    <Star className="mr-2 h-4 w-4" />
    Subscribe Now
  </Link>
</Button>

  </CardContent>
</Card>

<Card
className="w-full md:w-1/2 h-full cursor-pointer hover:shadow-lg transition-shadow"

  style={{
    backgroundImage: "url('/background02.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
>
  <CardHeader>
    <CardTitle className="text-white">Candidate Simulation</CardTitle>
  </CardHeader>
  <CardContent className="flex items-center justify-center">
    <Button
  asChild
  className="w-full bg-green-500 hover:bg-green-600 text-white"
>
  <Link to="/simulation/candidate">
    <BookOpen className="mr-2 h-4 w-4" />
    Go to Simulation
  </Link>
</Button>

  </CardContent>
</Card>

<Card
  className="w-full md:w-1/2 h-full cursor-pointer hover:shadow-lg transition-shadow"
  style={{
    backgroundImage: "url('/background1.jpeg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
>
  <CardHeader>
    <CardTitle>Resources</CardTitle>
  </CardHeader>
  <CardContent className="flex items-center justify-center">
   <Button
  asChild
  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
>
  <Link to="/resources">
    <ListChecks className="mr-2 h-4 w-4" />
    Access Resources
  </Link>
</Button>

  </CardContent>
</Card>

        </div>

      </div>
    </div>
  );
}
