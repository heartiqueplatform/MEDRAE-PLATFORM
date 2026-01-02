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
import GreetingsCard from "@/components/GreetingsCard"; // adjust path if needed
import { Button } from "@/components/ui/button";
import { toast as sonnerToast } from "sonner"; // ✅ renamed
import { DailyTriviaCard } from "@/components/TopStudentsPanel";
import FriendlyProgressCard from "@/components/FriendlyProgressCard";
import FloatingQuickActions from "@/components/FloatingQuickActions";
import MistakeCard from "@/components/MistakeCard";
import { UnitBreakdown } from "@/components/UnitBreakdown";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Link, useNavigate } from 'react-router-dom';
import { Send, Trash2 } from "lucide-react"; // make sure this import is at the top } from "lucide-react";
import DailyImagesTrivia from "@/components/DailyImagesTrivia";
export default function StudentDashboard() {
  const navigate = useNavigate(); // 👈 Add this line
  const user = useUser();
  const [name, setName] = useState<string | null>(null);
  const [studyProgress, setStudyProgress] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [targetScore, setTargetScore] = useState<number>(50);

  const [studyStreak, setStudyStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [dailyContent, setDailyContent] = useState("");
  const [feedsAttemptCount, setFeedsAttemptCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [openProfileId, setOpenProfileId] = useState<string | null>(null);


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

  const [previousRank, setPreviousRank] = useState(null); // updated


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


  // Function to fetch quiz count following the "latest attempt > 0" rule
  const fetchQuizCount = async () => {
    if (!user?.id) return;

    try {
      // Fetch all quiz results for the user
      const { data, error } = await supabase
        .from("quiz_results")
        .select("unit, score")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching quiz results:", error.message);
        return;
      }

      if (!data) return;

      // Group by unit
      const grouped: Record<string, any[]> = {};
      data.forEach((res) => {
        const key = res.unit || "Unknown";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(res);
      });

      // Only count units whose latest attempt has score > 0
      const validUnits = Object.keys(grouped).filter((unitName) => {
        const attempts = grouped[unitName];
        const latestAttempt = attempts[attempts.length - 1]; // assume last = latest
        return latestAttempt?.score && latestAttempt.score > 0;
      });

      setQuizCount(validUnits.length);
    } catch (err) {
      console.error("Error fetching quiz count:", err);
    }
  };

  // Fetch quiz count when user changes
  useEffect(() => {
    if (user?.id) {
      setLoadingStats(true); // show loading
      fetchQuizCount().finally(() => setLoadingStats(false));
    }
  }, [user]);

  // Persist quiz count in localStorage
  useEffect(() => {
    if (quizCount !== undefined) {
      localStorage.setItem("quizCount", JSON.stringify(quizCount));
    }
  }, [quizCount]);

  const loadDashboardData = async () => {

    if (!user?.id) return;

    // Only show spinner if no cached data or first time loading
    if (!cachedDashboard) setLoading(true); // Only show spinner if no cached data




    try {
      // Run all fetches in parallel
      await Promise.all([
        fetchProfile(),
        fetchProgress(),
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

      // Save to backend
      const newPostId = await handlePostDaily(); // assume this returns the new post ID

      // Optimistically create the new post object
      const newPost = {
        id: newPostId || crypto.randomUUID(), // fallback ID if backend does not return yet
        content: dailyContent,
        image_url: dailyImage ? URL.createObjectURL(dailyImage) : null,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // adjust as needed
        user_id: user.id,
        profiles: {
          username: user.username,
          full_name: user.name,
          avatar_url: user.avatar,
          institution: user.institution || "N/A",
          county: user.county || "N/A",
        },
      };

      // ✅ Prepend to dailyPosts state so it appears instantly
      setDailyPosts((prev) => [newPost, ...prev]);

      // Clear input fields
      setDailyContent("");
      setDailyImage(null);

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
      console.error(err);
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


  useEffect(() => {
    if (
      studyProgress !== undefined &&
      quizCount !== undefined &&

      studyStreak !== undefined &&
      bestStreak !== undefined
    ) {
      setLoadingStats(false);
    }
  }, [studyProgress, quizCount, studyStreak, bestStreak]);

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
  // New: unit question counts from view
  const [unitCounts, setUnitCounts] = useState<any[]>([]);

  // Simulation papers state
  const [simulationPapers, setSimulationPapers] = useState<any[]>([]);
  const [simulationProgress, setSimulationProgress] = useState<Record<string, number>>({});

  // ✅ Cached simulation papers for instant UI render
  const [cachedSimulationPapers, setCachedSimulationPapers] = useState<any[]>(() => {
    const cached = localStorage.getItem("simulationPapers");
    return cached ? JSON.parse(cached) : [];
  });

  // ✅ Skeleton display control: only show skeleton if no cached papers
  const showSkeleton = loading && cachedSimulationPapers.length === 0;

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



      // ✅ Check and toast user's top rank once on first login
      if (user && topStudents.length > 0) {
        const currentIndex = topStudents.findIndex(s => s.userId === user.id);
        if (currentIndex !== -1) {
          const newRank = currentIndex + 1;

          // 🔹 Read last notified rank from localStorage
          const lastNotifiedRank = parseInt(localStorage.getItem(`lastRank_${user.id}`) || "0");

          // 🔹 Only show toast if user hasn't been notified for this rank yet
          if (newRank <= 3 && newRank !== lastNotifiedRank) {
            let title = "";
            let message = "";

            if (newRank === 1) {
              title = "🏆 Top Student!";
              message = `Wow ${user.user_metadata?.full_name || "Learner"}! You are ranked #1 and leading the leaderboard! Keep doing more quizzes to maintain your crown! 👑🚀`;
            } else if (newRank === 2) {
              title = "🥈 Silver Star!";
              message = `Great job ${user.user_metadata?.full_name || "Learner"}! You're ranked #2. Try a few more quizzes to reach the top! 🌟💪`;
            } else if (newRank === 3) {
              title = "🥉 Bronze Achiever!";
              message = `Nice work ${user.user_metadata?.full_name || "Learner"}! You’re #3 on the leaderboard. Keep pushing, and you can move up! 🔥📚`;
            }

            // gentle vibration
            if (navigator.vibrate) navigator.vibrate(200);

            // toast message
            sonnerToast.success(message, {
              title,
              duration: 6000,
              dismissible: true,
            });

            // 🔹 Save this rank to localStorage so we don't toast again
            localStorage.setItem(`lastRank_${user.id}`, String(newRank));
          }

          // always update previousRank for future changes
          setPreviousRank(newRank);
        }
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
        const parsed = JSON.parse(cachedPapers);
        setSimulationPapers(parsed);
        setCachedSimulationPapers(parsed); // update cached state too
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
      // 3️⃣ Fetch simulation results for current user
      const { data: results, error } = await supabase
        .from("simulation_results")
        .select("paper_id, score, total_questions")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching simulation results:", error);
        return;
      }

      // 4️⃣ Calculate percentage completed per paper
      const progressMap: Record<string, number> = {};

      papers.forEach((paper) => {
        // Filter results for this paper
        const paperResults = results?.filter((r) => r.paper_id === paper.id) || [];

        // If there are results, sum the scores and calculate percentage
        const totalScore = paperResults.reduce((acc, r) => acc + r.score, 0);
        const totalQuestions = paperResults.reduce((acc, r) => acc + r.total_questions, paper.total_questions || 10);

        const percent = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
        progressMap[paper.id] = percent;
      });

      // 5️⃣ Update state
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
        setCachedSimulationPapers(papersWithVisits); // update cached state for instant UI
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
      .select("name, target_score")

      .eq("user_id", user.id)
      .single();
    if (!error && data) {
      if (data.name) setName(data.name.split(" ")[0]);
      if (data.target_score !== null) setTargetScore(data.target_score);
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

  const STUDY_PROGRESS_KEY = "dashboard_study_progress";

  const fetchProgress = async () => {
    if (!user?.id) return;

    // 0️⃣ Load cached progress instantly (no waiting)
    try {
      const cached = localStorage.getItem(STUDY_PROGRESS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (typeof parsed === "number") {
          setStudyProgress(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to read cached progress");
    }

    // 1️⃣ Fetch user quiz results (background update)
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
      localStorage.setItem(STUDY_PROGRESS_KEY, JSON.stringify(0));
      return;
    }

    // 2️⃣ Group by unit & keep highest progress per unit
    const grouped: Record<string, number> = {};

    results.forEach((res) => {
      const unit = res.unit || "Unknown";
      const percent =
        res.total_questions > 0
          ? (res.score / res.total_questions) * 100
          : 0;

      grouped[unit] = grouped[unit]
        ? Math.max(grouped[unit], percent)
        : percent;
    });

    // 3️⃣ Average unit progress
    const unitProgressValues = Object.values(grouped);

    const overallProgress =
      unitProgressValues.length > 0
        ? Math.round(
          unitProgressValues.reduce((a, b) => a + b, 0) /
          unitProgressValues.length
        )
        : 0;

    // 4️⃣ Update state + cache (silent sync)
    setStudyProgress(overallProgress);

    try {
      localStorage.setItem(
        STUDY_PROGRESS_KEY,
        JSON.stringify(overallProgress)
      );
    } catch (e) {
      console.warn("Failed to cache progress");
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
    <div className="min-h-screen md:min-h-auto rounded-none bg-[var(--card-bg)] dark:bg-[var(--card-bg-dark)]">

      <GreetingsCard />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 w-full">

        {/* Study Progress */}
        <Card
          className="relative overflow-hidden rounded-none sm:rounded-md
 shadow-none"
          style={{
            backgroundImage: "url('/background06.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-black/60" /> {/* darker overlay for readability */}

          <div className="relative z-10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white">
                Study Progress
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-white" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-8 w-16 bg-white/40/30 rounded"></div>
                  <div className="h-2 bg-white/40/30 rounded w-full mt-1"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-white">{studyProgress}%</div>
                  <Progress value={studyProgress} className="mt-2" />
                </>
              )}
            </CardContent>
          </div>
        </Card>

        {/* Quizzes Completed */}
        <Card
          className="relative overflow-hidden rounded-none sm:rounded-md
 shadow-none"
          style={{
            backgroundImage: "url('/indexbackground7.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-black/60" />

          <div className="relative z-10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white">
                Quizzes Completed
              </CardTitle>
              <Target className="h-4 w-4 text-white" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-8 w-16 bg-white/40/30 rounded"></div>
                  <div className="h-2 w-12 bg-white/40/30 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-white">{quizCount}</div>
                  <p className="text-xs text-white/80 truncate">+3 this week</p>
                </>
              )}
            </CardContent>
          </div>
        </Card>

        <Card className="relative cursor-pointer overflow-hidden rounded-none sm:rounded-md shadow-none">
          {/* Background image */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url('/background05.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60 z-10 rounded-lg" />

          <div className="relative z-20 p-2 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white">My Target Score</CardTitle>
              <Target className="h-4 w-4 text-white/80" />
            </CardHeader>

            <CardContent className="flex flex-col gap-2">
              {loadingStats ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-8 w-16 bg-white/30 rounded"></div>
                  <div className="h-2 w-20 bg-white/30 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-white">{targetScore}%</div>
                  <p className="text-xs text-white/80 truncate">Your personal target</p>
                </>
              )}

              {/* Divider line */}
              <div className="border-t border-white/30 my-2 w-full" />

              {/* Small instruction, lighter and italic */}
              <p className="text-xs text-white/50 italic mb-1">
                Visit your progress page to adjust your target.
              </p>

              {/* Button aligned right */}
              <div className="flex justify-end">
                <button
                  onClick={() => navigate("/progress")}
                  className="px-3 py-1 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 rounded transition"
                >
                  Visit
                </button>
              </div>
            </CardContent>
          </div>
        </Card>


        {/* Current Streak */}
        <Card
          className="relative overflow-hidden rounded-none sm:rounded-md
 shadow-none"
          style={{
            backgroundImage: "url('/indexbackground5.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-black/60" />

          <div className="relative z-10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white">Current Streak</CardTitle>
              <Clock className="h-4 w-4 text-white" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-8 w-20 bg-white/40/30 rounded"></div>
                  <div className="h-2 w-16 bg-white/40/30 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-white">{studyStreak} days</div>
                  <p className="text-xs text-white/80 truncate">Keep it up!</p>
                </>
              )}
            </CardContent>
          </div>
        </Card>

        {/* Best Streak */}
        <Card
          className="relative overflow-hidden rounded-none sm:rounded-md
 shadow-none"
          style={{
            backgroundImage: "url('/indexbackground2.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-black/60" />

          <div className="relative z-10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white">Best Streak</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-8 w-20 bg-white/40/30 rounded"></div>
                  <div className="h-2 w-16 bg-white/40/30 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-white">{bestStreak} days</div>
                  <p className="text-xs text-white/80 truncate">All-time record</p>
                </>
              )}
            </CardContent>
          </div>
        </Card>

      </div>

      {/* 🏆 Top Students Leaderboard */}
      <Card className="rounded-none sm:rounded-md shadow-none w-full max-w-full overflow-hidden bg-white dark:bg-gray-900 border-0">
        <CardHeader className="p-2">

          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Students
          </CardTitle>
          <CardDescription>
            Ranked by stars earned across all submitted quizzes. The leaderboard highlights
            learners who consistently perform well, encouraging healthy competition.
          </CardDescription>

          {/* 🔽 Explanation Dropdown (scrolls internally) */}
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
                <Link to="/Medrae-quizzes">Go to Quizzes</Link>
              </Button>
            </div>
          </details>

        </CardHeader>

        {/* 🧑‍🎓 Leaderboard Section */}
        <CardContent>
          <div className="relative w-full h-60 sm:h-64 md:h-56 lg:h-60">
            <div className="absolute inset-0 overflow-x-auto overflow-y-auto flex gap-4 p-2 custom-scrollbar">
              {loadingTopStudents ? (
                <div className="flex gap-4 animate-pulse">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="flex-shrink-0 w-36 sm:w-40 p-3 rounded-md bg-gray-200 dark:bg-gray-700">

                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 mb-2"></div>
                        <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
                        <div className="h-3 w-20 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
                        <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        <div className="flex justify-center mt-2 gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-4 w-4 bg-yellow-300 dark:bg-yellow-500 rounded-full"></div>
                          ))}
                        </div>
                        <div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded-full mt-2"></div>
                      </div>
                    </div>
                  ))}
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
                      className={`flex-shrink-0 w-36 sm:w-40 p-3 rounded-xl bg-gradient-to-br ${rankColor} dark:from-gray-800 dark:to-gray-900`}

                    >
                      <div className="flex flex-col items-center text-center">
                        <img
                          src={s.avatar_url || "/UsersAvatar.jpg"}
                          alt={s.name}
                          className="w-12 h-12 rounded-full mb-2 object-cover border-none shadow-none"
                        />

                        <h3
                          className="font-medium text-sm sm:text-base text-gray-900 dark:text-white max-w-[8rem] line-clamp-2"
                          title={s.name}
                        >
                          {s.name || "Unknown"}
                        </h3>
                        <p
                          className="text-xs text-gray-700 dark:text-gray-300 max-w-[8rem] line-clamp-2"
                          title={s.institution}
                        >
                          {s.institution || "Institution"}
                        </p>
                        <p
                          className="text-xs text-gray-500 max-w-[8rem] truncate"
                          title={s.county}
                        >
                          {s.county || ""}
                        </p>
                        <div className="flex justify-center mt-2 text-yellow-500">
                          {Array.from({ length: s.stars }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400" />
                          ))}
                        </div>
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
      </Card >

      <Card
        className="relative cursor-pointer hover:shadow-none transition-shadow-none col-span-1 md:col-span-2 max-w-full rounded-none sm:rounded-md overflow-hidden shadow-none border-0 bg-white dark:bg-gray-900"
        onClick={() => {
          if (navigator.vibrate) navigator.vibrate(50);
          navigate("/feed");
        }}
        style={{
          backgroundColor: "inherit", // inherit from the bg-white / dark:bg-gray-900
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >

        {/* Overlay */}
        <div className="absolute inset-0 bg-white/10 dark:bg-gray-800/30 z-10 rounded-md sm:rounded-md"></div>

        <div className="relative z-20 p-2 flex flex-col justify-between h-full">
          {/* Card Heading */}
          <div className="mb-2 px-4 pt-4">

            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              Feed & Leaderboard
            </h2>
          </div>

          <CardHeader className="p- px-4 flex items-center justify-between pb-2">

            <Brain className="h-5 w-5 text-gray-700 dark:text-white/80" />
          </CardHeader>

          <CardContent className="flex flex-col gap-3 text-xs md:text-sm">
            <p className="text-gray-700 dark:text-white/90">
              Scroll through random questions endlessly. Use your free time productively by attempting questions continuously.
              The more questions you attempt, the higher your chances of becoming the top student and leading the leaderboard.
            </p>


            {/* Stats Row */}
            <div className="flex flex-col sm:flex-row justify-start items-start gap-6">

              {/* Questions Attempted */}
              <div className="flex flex-col items-start sm:items-start">

                <p className="text-xs text-gray-500 dark:text-white/70">Questions Attempted</p>
                {feedsAttemptCount === undefined ? (
                  <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                ) : (
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{feedsAttemptCount}</p>
                )}
              </div>

              {/* Leader Student */}
              {topStudents.length > 0 ? (
                <div
                  className="flex flex-col items-center cursor-pointer w-24 sm:w-24 mt-2 sm:mt-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (navigator.vibrate) navigator.vibrate(50);
                    navigate("/feed");
                  }}
                >
                  <p className="text-xs text-gray-500 dark:text-white/70 text-center truncate">Leader Student</p>
                  <img
                    src={topStudents[0].avatar_url || "/UsersAvatar.jpg"}
                    alt={topStudents[0].name}
                    className="w-12 h-12 rounded-full mt-1 object-cover border-2 border-gray-300/30 dark:border-white/30 shadow-none-none"
                  />
                  <p className="text-xs mt-1 truncate text-center text-gray-700 dark:text-white/90 font-medium">
                    {topStudents[0].name}
                  </p>
                  {topStudents[0].answeredCount !== undefined ? (
                    <p className="text-[11px] mt-1 px-2 py-1 rounded-md text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/30 font-semibold shadow-none-none text-center">
                      {topStudents[0].answeredCount} answered
                    </p>
                  ) : (
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mt-1"></div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center w-24 sm:w-24 mt-2 sm:mt-0 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 mb-1"></div>
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                  <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              )}
            </div>

            {topStudents.length > 0 && topStudents[0].answeredCount && (
              <div className="mt-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-center py-2 px-3 rounded-none sm:rounded-md
 font-semibold text-sm shadow-none-none truncate">
                Top student has attempted {topStudents[0].answeredCount} questions!
              </div>
            )}

            {/* Centered Button */}
            <div className="flex justify-start mt-3">

              <div
                className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-md cursor-pointer transition-all shadow-none-md"
                onClick={(e) => {
                  e.stopPropagation();
                  if (navigator.vibrate) navigator.vibrate(50);
                  navigate("/feed");
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h11l5 5v9a2 2 0 01-2 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 13H7m10-4H7m5 8H7" />
                </svg>
                <span className="text-sm font-medium">Feed Page</span>
              </div>


            </div>
          </CardContent>
        </div>
      </Card >
      <DailyTriviaCard />
      <DailyImagesTrivia />
      <FriendlyProgressCard userTheme={userTheme} name={name} />

      <MistakeCard />

      {/* Upcoming Redletter Dates / Revision Schedule Card */}
      <Card
        className="p-2 mt-4 cursor-pointer bg-transparent hover:bg-transparent transition-colors rounded-none"
        onClick={() => navigate("/calendar")}
      >

        <CardHeader className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-gray-900 dark:text-white" />
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Upcoming Revision Schedule
          </CardTitle>
        </CardHeader>
        <CardDescription className="text-sm text-gray-600 dark:text-gray-400 ml-[26px]">
          Stay on track! Visit your calendar to plan and adjust your study timeline.
        </CardDescription>
        <CardContent className="space-y-2 mt-2">
          {calendarEvents.length > 0 ? (
            <div className="space-y-2">
              {calendarEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex justify-between items-center p-2 rounded-md bg-white/10 dark:bg-gray-700/20 w-full"
                >
                  <div className="truncate">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {event.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                      {event.type}
                    </p>
                  </div>
                  <Badge className={getPriorityColor(event.priority)}>
                    {new Date(event.start_time).toLocaleDateString()}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You have no upcoming revisions. Visit your calendar to plan your schedule.
            </p>
          )}
        </CardContent>
      </Card>


      <Card className="lg:col-span-3 w-screen max-w-none bg-white dark:bg-gray-900 border-none rounded-none overflow-hidden -mx-4 sm:mx-0">

        <CardHeader className="p-2">

          <CardTitle className="text-gray-900 dark:text-white">Medrae Daily Status</CardTitle>
          <CardDescription className="text-gray-700 dark:text-gray-300">
            This section is a space for nursing and medical professionals to share insights, reflections, and practical experiences. Contributions should be educational, thought-provoking, and meaningful, helping yourself and peers grow in knowledge and professional awareness. By sharing responsibly, you inspire others, spark discussions, and build a supportive learning community.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-2">
          <div className="space-y-4 px-3 sm:px-4">

            {/* Daily Thought Textarea */}
            <textarea
              className="w-full p-3 rounded-none sm:rounded-md
    bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 border-0"
              placeholder="Write today's thought..."
              value={dailyContent}
              onChange={(e) => setDailyContent(e.target.value)}
            />


            {/* Visibility Selector */}
            <div className="flex flex-col sm:flex-row items-center gap-2 mt-2">
              <label className="text-gray-900 dark:text-white text-sm">Visible for:</label>
              <select
                value={dailyDuration}
                onChange={(e) => setDailyDuration(e.target.value as any)}
                className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm p-1 rounded-none sm:rounded-md
 w-full sm:w-40"
              >
                <option value="24h">24 Hours</option>
                <option value="1w">1 Week</option>
                <option value="1m">1 Month</option>
                <option value="3m">3 Months</option>
              </select>
            </div>

            {/* Image Upload */}
            <input
              id="dailyImageUpload"
              type="file"
              accept="image/*"
              onChange={(e) => setDailyImage(e.target.files ? e.target.files[0] : null)}
              className="hidden"
            />
            <div className="flex flex-col md:flex-row items-center justify-center gap-2 w-full">
              <label
                htmlFor="dailyImageUpload"
                className="flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer transition shadow-none-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16l4-4a3 3 0 014 0l6 6M3 7h18M3 3h18v18H3V3z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                  Choose Image
                </span>
              </label>

              {/* Send Button as rectangle tab */}
              <div
                onClick={handlePostClick}
                className={`flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer transition shadow-none-md
      ${uploading ? "bg-blue-600/50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"}`}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
                <span className="text-sm font-medium text-white">Send</span>
              </div>
            </div>

            {/* Daily Posts */}
            <div className="space-y-3 mt-4">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 rounded-none sm:rounded-md
 bg-gray-200 dark:bg-gray-700 animate-pulse h-24 w-full"></div>
                  ))}
                </div>
              ) : dailyPosts.length > 0 ? (
                dailyPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 border rounded-none sm:rounded-md
 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 w-full"
                  >
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      {/* User Info */}
                      {/* User Info */}
                      <div className="flex-shrink-0 flex flex-col items-center sm:items-start gap-2 w-24 relative">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenProfileId(openProfileId === post.id ? null : post.id)
                          }
                          className="flex flex-col items-center focus:outline-none"
                        >
                          {/* Avatar */}
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
                        </button>

                        {/* Tiny Tooltip Overlay */}
                        {openProfileId === post.id && (
                          <div className="absolute top-1/2 left-full ml-2 transform -translate-y-1/2 max-w-[220px] p-3 rounded-lg bg-white dark:bg-gray-900 shadow-lg text-left text-xs z-30 border border-gray-200 dark:border-gray-700">

                            <span className="font-semibold text-gray-900 dark:text-white block truncate">
                              {post.profiles?.full_name}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300 block truncate">
                              @{post.profiles?.username}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300 block truncate">
                              {post.profiles?.institution}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300 block truncate">
                              {post.profiles?.county}
                            </span>
                          </div>
                        )}
                      </div>


                      {/* Post Content & Image */}
                      <div className="flex-1 flex flex-col gap-2">
                        {post.content && <p className="text-gray-900 dark:text-white break-words">{post.content}</p>}

                        {post.image_url && (
                          <img
                            src={post.image_url}
                            alt="daily"
                            className="rounded-none sm:rounded-md
 w-full max-h-96 object-contain bg-gray-100 dark:bg-black cursor-pointer"
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
                          className="mt-2 sm:mt-0 p-2 flex items-center justify-center"
                          onClick={() => handleDeletePost(post.id, post.user_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })} •
                      Expires on {new Date(post.expires_at).toLocaleString()}
                    </p>
                  </motion.div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No posts yet.</p>
              )}
            </div>
          </div>
        </CardContent>

        {/* Fullscreen Modal */}
        {fullscreenImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
            onClick={() => setFullscreenImage(null)}
          >
            <img
              src={fullscreenImage}
              alt="fullscreen"
              className="max-w-full max-h-full object-contain rounded-none sm:rounded-md
"
            />
          </div>
        )}
      </Card>

      {/* Simulation Papers Section */}
      <Card className="w-full rounded-none sm:rounded-md shadow-none border-0 bg-white dark:bg-gray-900 p-2">
        <CardHeader className="p-2">
          <CardTitle className="text-gray-900 dark:text-white">
            Self Test SimuProctor Papers V1
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              ({cachedSimulationPapers.length} Papers)
            </span>
          </CardTitle>
          <CardDescription className="text-gray-700 dark:text-gray-300">
            Prepare smarter with simulation papers designed to mirror real exam conditions.
            Practicing here helps you build confidence, improve time management, reduce anxiety, and sharpen focus.
            Students who regularly use simulations perform better by identifying weak areas early and training their mind to stay calm under pressure.
          </CardDescription>

          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {cachedSimulationPapers.length} simulation papers available — start practicing today!
          </p>

          <div className="mt-2 p-0 rounded-none sm:rounded-md bg-white dark:bg-gray-900 text-red-800 dark:text-red-200 text-sm font-semibold shadow-none border-0">
            For the best experience and smoothest interaction, we recommend using a desktop or laptop. While some phones can run the simulation, using a larger device ensures optimal comfort and engagement.
          </div>

          <div className="mt-2 p-0 rounded-none sm:rounded-md bg-white dark:bg-gray-900 text-blue-800 dark:text-blue-200 text-xs italic shadow-none border-0">
            Tip: Treat each simulation as if it’s the real exam — no distractions, no breaks.
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {(!cachedSimulationPapers.length && loading) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[2px] w-full">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-none sm:rounded-md bg-white dark:bg-gray-900 animate-pulse p-4 shadow-none border-0"
                  style={{ minHeight: "250px" }}
                >
                  <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded-full w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded-full w-full mb-1"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded-full w-5/6 mb-1"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded-full w-2/3 mt-auto"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 w-full">
              {cachedSimulationPapers.length > 0 ? (
                cachedSimulationPapers.map((paper) => (
                  <Card
                    key={paper.id}
                    className="flex flex-col justify-between cursor-pointer hover:scale-105 transform transition-all rounded-none sm:rounded-md bg-white dark:bg-gray-900 shadow-none border border-gray-200 dark:border-gray-700"
                    onClick={async () => {
                      navigate(`/simulation/${paper.id}`);
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
                        {new Date(paper.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                          <Badge className="ml-2" variant="outline">New</Badge>
                        )}
                        {paper.difficulty && (
                          <Badge className="ml-2" variant="secondary">{paper.difficulty}</Badge>
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

                      <p className="text-xs text-gray-500 mt-1">
                        ⏱ Estimated time:{" "}
                        {(() => {
                          const duration = Number(paper.duration) || 30;
                          if (duration < 60) return `${duration}m`;
                          if (duration % 60 === 0) return `${duration / 60}h`;
                          return `${Math.floor(duration / 60)}h ${duration % 60}m`;
                        })()}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {paper.visit_count} visits
                      </p>

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

          <p className="mt-6 text-center text-sm font-medium text-blue-600 dark:text-blue-400">
            Every simulation you complete brings you one step closer to exam success!
          </p>
        </CardContent>
      </Card>

      <UnitBreakdown nclexUnitCodes={[
        "HNX3-001", "HNX3-002", "HNX3-003", "HNX3-004",
        "HNX3-005", "HNX3-006", "HNX3-007", "HNX3-008"
      ]} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 w-full">


        {/* Share App Card */}
        <Card className="rounded-none sm:rounded-md
 shadow-none-md border bg-white/40 dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Share Medrae</CardTitle>
            <CardDescription>
              Invite your colleagues and peers to join Medrae — the professional network for medical education, skills, and career growth.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col md:flex-row md:justify-center md:space-x-4 gap-2">
                <div className="bg-gray-200 dark:bg-gray-700 animate-pulse rounded-none sm:rounded-md
 h-10 w-full sm:w-64"></div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:justify-center md:space-x-4 gap-2">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-none sm:rounded-md
 flex items-center justify-center gap-1 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm w-full sm:w-64"
                  onClick={() => {
                    const shareMessage =
                      `Medrae – The Professional Medical Education & Career Network

• Structured modules across core clinical disciplines
• Expert-led lectures and verified medical resources
• Comprehensive study materials and case-based learning
• Certification pathways and professional development tools

Join the Medrae community today: https://medrae.vercel.app`;

                    if (navigator.share) {
                      navigator.share({
                        title: "Medrae – Medical Education & Career Network",
                        text: shareMessage,
                        url: "https://medrae.vercel.app",
                      }).catch(err => console.log("Share cancelled:", err));
                    } else {
                      navigator.clipboard.writeText(shareMessage);
                      alert("Medrae link and overview copied to clipboard!");
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12v.01M12 4v.01M20 12v.01M12 20v.01M16 8l5 4-5 4M8 8l-5 4 5 4" />
                  </svg>
                  Share
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Channel Card */}
        <Card className="rounded-none sm:rounded-md
 shadow-none-md border bg-white/40 dark:bg-gray-900">
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
            {loading ? (
              <div className="bg-gray-200 dark:bg-gray-700 animate-pulse rounded-none sm:rounded-md
 h-10 w-full sm:w-64 mx-auto"></div>
            ) : (
              <a href="https://whatsapp.com/channel/0029VbBFzgAEawdkJKtRtF2H" target="_blank" rel="noopener noreferrer">
                <div className="flex justify-center">
                  <Button className="bg-green-600 hover:bg-green-700 text-white rounded-none sm:rounded-md
 flex items-center justify-center gap-1 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm w-full sm:w-64">
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp Channel
                  </Button>
                </div>
              </a>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Group Card */}
        <Card className="rounded-none sm:rounded-md
 shadow-none-md border bg-white/40 dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              Join Our WhatsApp Group
            </CardTitle>
            <CardDescription>
              Connect with fellow nursing and medical students. Share insights, ask questions, and stay updated with study materials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="bg-gray-200 dark:bg-gray-700 animate-pulse rounded-none sm:rounded-md
 h-10 w-full sm:w-64 mx-auto"></div>
            ) : (
              <a href="https://chat.whatsapp.com/Lad2s4XXx1AA1TtThbMgWV" target="_blank" rel="noopener noreferrer">
                <div className="flex justify-center">
                  <Button className="bg-green-600 hover:bg-green-700 text-white rounded-none sm:rounded-md
 flex items-center justify-center gap-1 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm w-full sm:w-64">
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp Group
                  </Button>
                </div>
              </a>
            )}
          </CardContent>
        </Card>

        {/* Telegram Channel Card */}
        <Card className="rounded-none sm:rounded-md
 shadow-none-md border bg-white/40 dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Join Our Telegram Channel
            </CardTitle>
            <CardDescription>
              Stay updated with the latest resources, study tips, and announcements. Be part of our growing community of nursing and medical scholars.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="bg-gray-200 dark:bg-gray-700 animate-pulse rounded-none sm:rounded-md
 h-10 w-full sm:w-64 mx-auto"></div>
            ) : (
              <a href="https://t.me/heartiquenursingnexusscholar" target="_blank" rel="noopener noreferrer">
                <div className="flex justify-center">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-none sm:rounded-md
 flex items-center justify-center gap-1 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm w-full sm:w-64">
                    <Send className="w-4 h-4" />
                    Telegram Channel
                  </Button>
                </div>
              </a>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <FloatingQuickActions />

      </div>
    </div >
  );
}
