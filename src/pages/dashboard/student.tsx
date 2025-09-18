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
const [loading, setLoading] = useState(() => !cachedDashboard);


const loadDashboardData = async () => {
  
  if (!user?.id) return;

  setLoading(true); // Show spinner at the very start

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
  })
);

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
    toast({
      title: "Daily Status",
      description: "No posts yet!",
    });
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
  if (latestPostId && mergedPosts[0].id !== latestPostId) {
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
  if (user?.id) {
    // ✅ Try cached first
    const cached = localStorage.getItem("dashboardData");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.name) setName(parsed.name);
        if (parsed.studyProgress) setStudyProgress(parsed.studyProgress);
        if (parsed.quizCount) setQuizCount(parsed.quizCount);
        if (parsed.avgScore) setAvgScore(parsed.avgScore);
        if (parsed.studyStreak) setStudyStreak(parsed.studyStreak);
        if (parsed.bestStreak) setBestStreak(parsed.bestStreak);
        if (parsed.calendarEvents) setCalendarEvents(parsed.calendarEvents);
        if (parsed.dailyPosts) setDailyPosts(parsed.dailyPosts);
        if (parsed.unitCounts) setUnitCounts(parsed.unitCounts);

        // 🚀 Instantly show cached dashboard, no spinner
        setLoading(false);
      } catch (e) {
        console.error("Error parsing cached dashboard:", e);
      }
    }

    // 🔄 Then refresh in background
    loadDashboardData();
  }
}, [user]);



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
const [topStudents, setTopStudents] = useState<any[]>([]);
const [loadingTopStudents, setLoadingTopStudents] = useState(true); // ✅ new state

const fetchTopStudents = async () => {
  try {
    setLoadingTopStudents(true); // ✅ start loader

    // 1️⃣ Get all quiz results
    const { data: results, error: resultsError } = await supabase
      .from("quiz_results")
      .select("user_id, score, total_questions");

    if (resultsError) throw resultsError;
    if (!results) {
      setLoadingTopStudents(false);
      return;
    }

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

    setTopStudents(merged);
  } catch (err) {
    console.error("Error fetching top students:", err);
  } finally {
    setLoadingTopStudents(false); // ✅ stop loader always
  }
};


const fetchSimulationPapers = async () => {
  try {
    // 1️⃣ Fetch active simulation papers
    const { data: papers, error: paperError } = await supabase
      .from("simulation_papers")
      .select("id, title, description, course, block, is_free, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (paperError) throw paperError;
    if (!papers) return;

    const paperIds = papers.map((p) => p.id);

    // Fetch results for current user
const { data: results, error: resultsError } = await supabase
  .from("results")       // Replace with your table storing question results
  .select("paper_id, question_id, is_correct")  // adjust column names as needed
  .eq("user_id", user.id);

if (resultsError) {
  console.error("Error fetching results:", resultsError.message);
}

// Calculate percentage completed per paper
const progressMap: Record<string, number> = {};
papers.forEach(paper => {
  const paperResults = results?.filter(r => r.paper_id === paper.id) || [];
  // Suppose each paper has a fixed total_questions field
  const totalQuestions = paper.total_questions || 10; // default if missing
  const completed = paperResults.length;
  const percent = totalQuestions > 0 ? Math.round((completed / totalQuestions) * 100) : 0;
  progressMap[paper.id] = percent;
});

setSimulationProgress(progressMap);

    // 2️⃣ Fetch visits for these papers
    const { data: visits, error: visitError } = await supabase
      .from("simulation_visits")
      .select("paper_id")
      .in("paper_id", paperIds);

    if (visitError) throw visitError;

    // 3️⃣ Count visits per paper
    const visitCounts = visits?.reduce((acc: Record<string, number>, visit) => {
      acc[visit.paper_id] = (acc[visit.paper_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // 4️⃣ Merge visit counts into papers
    const papersWithVisits = papers.map((paper) => ({
      ...paper,
      visit_count: visitCounts[paper.id] || 0,
    }));

    setSimulationPapers(papersWithVisits);
  } catch (error: any) {
    console.error("Error fetching simulation papers:", error.message);
  }
};

  const fetchProfile = async () => {
    setLoading(true); // show spinner
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
    const { data: existing } = await supabase
      .from("login_activity")
      .select("*")
      .eq("user_id", user.id)
      .eq("login_date", today)
      .single();
    if (!existing) {
      const { data: lastLogin } = await supabase
        .from("login_activity")
        .select("*")
        .eq("user_id", user.id)
        .order("login_date", { ascending: false })
        .limit(1);
      let newStreak = 1;
      if (lastLogin && lastLogin.length > 0) {
        const lastDate = new Date(lastLogin[0].login_date);
        const diffDays = Math.floor(
          (new Date(today).getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) {
          newStreak = (lastLogin[0].streak || 0) + 1;
        }
      }
      await supabase.from("login_activity").insert({
        user_id: user.id,
        login_date: today,
        streak: newStreak,
      });
      setStudyStreak(newStreak);
      updateBestStreakIfNeeded(newStreak);
    } else {
      setStudyStreak(existing.streak);
      updateBestStreakIfNeeded(existing.streak);
    }
  };

  const updateBestStreakIfNeeded = async (current: number) => {
    const { data, error } = await supabase
      .from("login_activity")
      .select("streak")
      .eq("user_id", user.id);
    if (!error && data.length > 0) {
      const maxStreak = Math.max(...data.map((row) => row.streak || 0));
      if (current > maxStreak) {
        setBestStreak(current);
      } else {
        setBestStreak(maxStreak);
      }
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
    const { data, error } = await supabase
      .from("quiz_question_counts")
      .select("*");
    if (!error && data) {
      setUnitCounts(data);
    } else {
      console.error("Error fetching unit counts:", error);
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

    // Determine time of day
    let timeGreeting;
    if (hour >= 5 && hour < 12) {
      timeGreeting = "Good morning";
    } else if (hour >= 12 && hour < 17) {
      timeGreeting = "Good afternoon";
    } else if (hour >= 17 && hour < 21) {
      timeGreeting = "Good evening";
    } else {
      timeGreeting = "Hope your day is going well";
    }

    // Daily messages with slight adjustments for time of day
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
    let timeOfDay: "morning" | "afternoon" | "evening" | "night";

    if (hour >= 5 && hour < 12) timeOfDay = "morning";
    else if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
    else if (hour >= 17 && hour < 21) timeOfDay = "evening";
    else timeOfDay = "night";

    return `${timeGreeting}, ${name} 👋! ${dailyMessage[today][timeOfDay]}`;
  })() : "Loading..."}
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
      return nursingMessages[today] || "Keep pushing—you’re doing amazing! Every effort you make today brings you closer to your dream nursing career.";
    })()}
  </p>
</div>
{/* 🏆 Top Students Leaderboard */}
<Card className="rounded-2xl shadow-lg">
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
      <Trophy className="h-5 w-5 text-yellow-500" />
      Top Students
    </CardTitle>
    <CardDescription>
      Ranked by stars earned across all submitted quizzes. The leaderboard highlights 
      learners who consistently perform well, encouraging healthy competition.
    </CardDescription>

    {/* 🔽 Explanation Dropdown */}
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline">
        How winners are chosen?
      </summary>
      <div className="mt-2 space-y-3 text-gray-600 dark:text-gray-300">

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

        {/*  Tip + Button */}
        <p className="text-sm">
          Want to improve your ranking? Attempt more units and submit results on the quizzes page.
        </p>

        {/*  Go to Quizzes Button (React Router Link) */}
        <Button
          asChild
          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
        >
          <Link to="/heartique-quizzes">🏆 Go to Heartique Quizzes</Link>
        </Button>
      </div>
    </details>
  </CardHeader>

  <CardContent>
    <div className="flex gap-4 overflow-x-auto pb-2 h-56">
      {loadingTopStudents ? (
        //  Show loader while data is loading
        <div className="flex justify-center items-center w-full">
          <GlobalLoader message="Loading top students..." />
        </div>
      ) : topStudents.length > 0 ? (
        //  Render student cards
        topStudents.map((s, idx) => (
          <div
            key={s.userId}
            className="flex-shrink-0 w-40 p-3 rounded-xl border bg-white dark:bg-gray-800 shadow"
          >
            <img
              src={s.avatar_url || "/default-avatar.png"}
              alt={s.name}
              className="w-12 h-12 rounded-full mx-auto mb-2 object-cover"
            />
            <h3 className="text-center font-medium truncate">{s.name || "Unknown"}</h3>
            <p className="text-xs text-center text-gray-500 truncate">
              {s.institution || "Institution"}
            </p>
            <p className="text-xs text-center text-gray-400 truncate">
              {s.county || ""}
            </p>
            <div className="flex justify-center mt-2 text-yellow-400">
              {Array.from({ length: s.stars }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400" />
              ))}
            </div>
            {idx === 0 && (
              <p className="text-xs text-center text-green-500 mt-1 font-semibold">
                ⭐ Best Star
              </p>
            )}
          </div>
        ))
      ) : (
        // Empty state
        <p className="text-sm text-gray-500">No top students yet</p>
      )}
    </div>
  </CardContent>
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
<label
  htmlFor="dailyImageUpload"
  className="inline-flex items-center gap-2 cursor-pointer px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition"
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
      d="M21 15a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4h10a4 4 0 014 4v8z"
    />
  </svg>
  Attach Image
</label>

<Button 
  onClick={handlePostClick} 
  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg flex items-center gap-2 text-sm mt-2"
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
      )) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">No posts yet.</p>
      )}
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
   <Button
  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg flex items-center gap-2 text-sm"
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
   <Button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg flex items-center gap-2 text-sm">
  <MessageCircle className="w-4 h-4" />
  WhatsApp Channel
</Button>

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
   <Button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg flex items-center gap-2 text-sm">
  <MessageCircle className="w-4 h-4" />
  WhatsApp Group
</Button>

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
      <Button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg flex items-center gap-2 text-sm">
  <Send className="w-4 h-4" />
  Telegram Channel
</Button>

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
