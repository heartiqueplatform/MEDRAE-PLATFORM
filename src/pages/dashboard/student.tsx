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
    ]);
    // ✅ Save merged dashboard state to localStorage
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
  <div className="space-y-6">

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

    <input
      type="file"
      accept="image/*"
      onChange={(e) => setDailyImage(e.target.files ? e.target.files[0] : null)}
      className="text-gray-900 dark:text-white"
    />

    <Button onClick={handlePostClick} className="w-full mt-2" disabled={uploading}>
      {uploading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Uploading...
        </>
      ) : (
        "Post"
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
      <Button className="w-full">
        Open WhatsApp Channel
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
