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

import { cn } from "@/lib/utils";

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
import CountdownFloating from "@/components/CountdownFloating";
import FloatingQuickActions from "@/components/FloatingQuickActions";
import ChallengeCard from "@/components/ChallengeCard";
import { UnitBreakdown } from "@/components/UnitBreakdown";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Link, useNavigate } from 'react-router-dom';
import { Send, Trash2 } from "lucide-react"; // make sure this import is at the top } from "lucide-react";
import DailyImagesTrivia from "@/components/DailyImagesTrivia";
import FeedSeenTop10 from "@/components/FeedSeenTop10";
import Referral from "@/components/Referral";

import { UserProfileModal } from "@/components/UserProfileModal";
import TutorsList from "@/components/student/TutorsList";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import LiveReactions from "@/components/LiveReactions";
import { TermsButton } from "@/components/ui/TermsButton";

export default function StudentDashboard() {
  const navigate = useNavigate(); // 👈 Add this line
  const user = useUser();
  const [name, setName] = useState<string | null>(null);
  const [studyProgress, setStudyProgress] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [targetScore, setTargetScore] = useState<number>(50);
  const [isOpen, setIsOpen] = useState(false);
  const [studyStreak, setStudyStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [dailyContent, setDailyContent] = useState("");
  const [feedsAttemptCount, setFeedsAttemptCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [openProfileId, setOpenProfileId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);


  // New state for daily post duration
  const [dailyDuration, setDailyDuration] = useState<"24h" | "1w" | "1m" | "3m">("24h");
  const [dailyImage, setDailyImage] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
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
  const [overlayOpen, setOverlayOpen] = useState(false);

  const cachedProfile = (() => {
    try {
      return JSON.parse(localStorage.getItem("userProfile") || "null");
    } catch {
      return null;
    }
  })();

  const [profileState, setProfileState] = useState<any | null>(cachedProfile);
  const [position, setPosition] = useState({ x: 24, y: 400 }); // initial bottom-left
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
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
    setLoading(!cachedDashboard); // only show spinner if no cache
    // Run fetches in parallel but catch errors individually
    const fetches = [
      fetchProfile().catch(console.error),
      fetchProgress().catch(console.error),
      handleLoginAndStreak().catch(console.error),
      fetchCalendarEvents().catch(console.error),
      fetchUnitCounts().catch(console.error),
      fetchDailyPosts().catch(console.error),
      fetchSimulationPapers().catch(console.error),
      fetchTopStudents().catch(console.error),
    ];
    await Promise.all(fetches);
    // Merge current state into cache for faster next render
    localStorage.setItem(
      "dashboardData",
      JSON.stringify({
        name, studyProgress, quizCount,
        studyStreak, bestStreak,
        calendarEvents, dailyPosts,
        unitCounts, simulationPapers, topStudents
      })
    );
    setDashboardLoaded(true);
    setLoading(false); // hide spinner once all done
  };;

  // Handle posting daily thought
  // 1. Updated handlePostDaily: Now uses Cloudinary for images
  const handlePostDaily = async () => {
    if (!user?.id) return null;

    let image_url = null;

    // 🟢 NEW CLOUDINARY LOGIC
    if (dailyImage) {
      try {
        image_url = await uploadToCloudinary(dailyImage);
      } catch (uploadError: any) {
        console.error("DEBUG [handlePostDaily]: Image upload failed:", uploadError.message);
        return null;
      }
    }

    console.log("DEBUG [Supabase]: Inserting record with URL:", image_url);
    // ✅ Simplified: Just select() without the profiles join to avoid the error
    const { data: post, error: insertError } = await supabase
      .from("daily_posts")
      .insert({
        user_id: user.id,
        content: dailyContent,
        image_url, // Now storing the Cloudinary secure_url
        duration: dailyDuration,
      })
      .select()
      .single();

    if (insertError) {
      console.error("DEBUG [Supabase]: DB Insert Error:", insertError.message);
      return null;
    }

    return post;
  };

  // 2. Updated handlePostClick: Manages UI state and calls the post function
  const handlePostClick = async () => {
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
      console.log("DEBUG [handlePostClick]: Starting post process...");

      const newPostFromDB = await handlePostDaily();

      if (newPostFromDB) {
        // ✅ PRESERVED LOGIC: Manually combine profile data for instant UI update
        const postWithProfile = {
          ...newPostFromDB,
          profiles: {
            username: profileState?.username || "You",
            name: profileState?.name || "You",
            avatar_url: profileState?.avatar_url || null,
            institution: profileState?.institution || "N/A",
            county: profileState?.county || "N/A",
          }
        };

        setDailyPosts((prev) => [postWithProfile, ...prev]);
        setLatestPostId(newPostFromDB.id);

        // Clear UI
        setDailyContent("");
        setDailyImage(null);
        setIsOpen(false);

        toast({
          title: "Success",
          description: "Your daily post was uploaded!",
        });
      } else {
        // If newPostFromDB is null, handlePostDaily already logged the error
        toast({
          title: "Upload failed",
          description: "Could not save your post. Please check your connection.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("DEBUG [handlePostClick]: Unexpected Error:", err);
      toast({
        title: "Error",
        description: "Something went wrong while posting.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // 3. Handle deleting a daily post (only owner)
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

    console.log("DEBUG [Delete]: Removing post ID:", postId);
    const { error } = await supabase
      .from("daily_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      console.error("DEBUG [Delete]: DB Error:", error.message);
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
  const fetchDailyPosts = async (useCache = true) => {
    if (!user?.id) return;

    // 1️⃣ Load cached posts instantly for smooth UI
    if (useCache) {
      const cached = localStorage.getItem("dailyPostsCache");
      if (cached) {
        try {
          setDailyPosts(JSON.parse(cached));
        } catch {
          console.warn("Failed to parse cached daily posts");
        }
      }
    }

    // 2️⃣ Determine duration filter
    let durationMs = 24 * 60 * 60 * 1000; // default 24h
    if (dailyDuration === "1w") durationMs = 7 * 24 * 60 * 60 * 1000;
    if (dailyDuration === "1m") durationMs = 30 * 24 * 60 * 60 * 1000;
    if (dailyDuration === "3m") durationMs = 90 * 24 * 60 * 60 * 1000;

    const since = new Date(Date.now() - durationMs).toISOString();

    try {
      // 3️⃣ Fetch posts from Supabase
      const { data: posts, error: postsError } = await supabase
        .from("valid_daily_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;
      if (!posts || posts.length === 0) {
        setDailyPosts([]);
        localStorage.setItem("dailyPostsCache", JSON.stringify([]));
        return;
      }

      // 4️⃣ Show placeholders while fetching profiles
      const tempPosts = posts.map(p => ({
        ...p,
        profiles: {
          username: "Loading...",
          name: "",
          avatar_url: "",
          institution: "N/A",
          county: "N/A",
        },
      }));
      setDailyPosts(tempPosts);

      // 5️⃣ Fetch user profiles
      const userIds = posts.map(p => p.user_id).filter(Boolean);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, username, name, institution, county, avatar_url")
        .in("user_id", userIds);

      if (profilesError) console.error("Error fetching profiles:", profilesError.message);

      // 6️⃣ Merge posts with actual profiles, fallback to Unknown
      const mergedPosts = posts.map(p => {
        const profile = profiles?.find(pr => pr.user_id === p.user_id);
        return {
          ...p,
          profiles: profile || {
            username: "Unknown",
            name: "Unknown",
            avatar_url: "",
            institution: "N/A",
            county: "N/A",
          },
        };
      });

      // 7️⃣ Update state & cache
      setDailyPosts(mergedPosts);
      localStorage.setItem("dailyPostsCache", JSON.stringify(mergedPosts));

      // 8️⃣ Preserve toast notifications
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

    } catch (err: any) {
      console.error("Error fetching daily posts:", err.message);
      // fallback: preserve old cache if exists
      const cached = localStorage.getItem("dailyPostsCache");
      if (cached) {
        try {
          setDailyPosts(JSON.parse(cached));
        } catch {
          setDailyPosts([]);
        }
      } else {
        setDailyPosts([]);
      }
    }
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

    // 1️⃣ Render cached dashboard immediately (no spinner)
    if (cachedDashboard) {
      try {
        const parsed = JSON.parse(cachedDashboard);
        parsed.name && setName(parsed.name);
        parsed.studyProgress !== undefined && setStudyProgress(parsed.studyProgress);
        parsed.quizCount !== undefined && setQuizCount(parsed.quizCount);
        parsed.studyStreak !== undefined && setStudyStreak(parsed.studyStreak);
        parsed.bestStreak !== undefined && setBestStreak(parsed.bestStreak);
        parsed.calendarEvents && setCalendarEvents(parsed.calendarEvents);
        parsed.dailyPosts && setDailyPosts(parsed.dailyPosts);
        parsed.unitCounts && setUnitCounts(parsed.unitCounts);
        parsed.topStudents && setTopStudents(parsed.topStudents);
        parsed.simulationPapers && setSimulationPapers(parsed.simulationPapers);
      } catch (e) {
        console.error("Error parsing cached dashboard:", e);
      }
    }

    // 2️⃣ Load dashboard data in background
    loadDashboardData().catch(err => console.error("Dashboard load error:", err));

    // 3️⃣ Mark dashboard loaded instantly
    setDashboardLoaded(true);

  }, [user]);;

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
  /// 🏆 Top Students State
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [loadingTopStudents, setLoadingTopStudents] = useState(true);
  const [previousTopRank, setPreviousTopRank] = useState<number | null>(null);

  const fetchTopStudents = async () => {
    if (!user?.id) return;

    try {
      setLoadingTopStudents(true);

      // 📅 Get start of current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // 1️⃣ Get quiz results for THIS MONTH only
      const { data: results, error: resultsError } = await supabase
        .from("quiz_results")
        .select("user_id, score, total_questions, submitted_at")
        .gte(" submitted_at", startOfMonth);

      if (resultsError) throw resultsError;
      if (!results || results.length === 0) {
        setTopStudents([]);
        return;
      }

      // 2️⃣ Calculate stars + stats for each user
      const userMap: Record<string, { total: number; count: number }> = {};

      results.forEach((r) => {
        if (!r.user_id || !r.total_questions) return;

        if (!userMap[r.user_id]) userMap[r.user_id] = { total: 0, count: 0 };

        userMap[r.user_id].total += (r.score / r.total_questions) * 100;
        userMap[r.user_id].count += 1;
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

      // 3️⃣ Sort leaderboard
      userStars.sort((a, b) => b.stars - a.stars || b.avg - a.avg || b.count - a.count);

      // 4️⃣ Fetch profiles
      const ids = userStars.map(u => u.userId);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, institution, county")
        .in("user_id", ids);

      if (profilesError) throw profilesError;

      // 5️⃣ Merge leaderboard + profile info
      const merged = userStars.map(u => ({
        ...u,
        ...profiles?.find(p => p.user_id === u.userId)
      }));

      setTopStudents(merged);

      // 6️⃣ Rank detection (keeps your exact toast messages)
      const currentIndex = merged.findIndex(s => s.userId === user.id);

      if (currentIndex !== -1) {
        const newRank = currentIndex + 1;
        const lastNotifiedRank = parseInt(localStorage.getItem(`lastRank_${user.id}`) || "0");

        if (newRank <= 3 && newRank !== lastNotifiedRank) {
          let title = "";
          let message = "";

          const profileName = merged[currentIndex]?.name || profileState?.name || "Learner";

          if (newRank === 1) {
            title = "🏆 Top Student!";
            message = `Wow ${profileName}! You are ranked #1 and leading the leaderboard! Keep doing more quizzes to maintain your crown! 👑🚀`;
          }
          else if (newRank === 2) {
            title = "🥈 Silver Star!";
            message = `Great job ${profileName}! You're ranked #2. Try a few more quizzes to reach the top! 🌟💪`;
          }
          else if (newRank === 3) {
            title = "🥉 Bronze Achiever!";
            message = `Nice work ${profileName}! You’re #3 on the leaderboard. Keep pushing, and you can move up! 🔥📚`;
          }

          if (navigator.vibrate) navigator.vibrate(200);

          sonnerToast.success(message, { title, duration: 6000, dismissible: true });

          localStorage.setItem(`lastRank_${user.id}`, String(newRank));
        }

        setPreviousTopRank(newRank);
      }

    } catch (err) {
      console.error("Error fetching top students:", err);
    } finally {
      setLoadingTopStudents(false);
    }
  };
  useEffect(() => {

    fetchTopStudents();

    const channel = supabase
      .channel("leaderboard-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quiz_results",
        },
        () => {
          fetchTopStudents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [user?.id]);

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
    if (!user?.id) return;
    if (!name) setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*") // ✅ Changed from "name, target_score" to "*" to get avatar, etc.
      .eq("user_id", user.id)
      .single();

    if (!error && data) {
      // Set individual states
      if (data.name) setName(data.name.split(" ")[0]);
      if (data.target_score !== null) setTargetScore(data.target_score);

      // ✅ CRITICAL: Update the global profile state so your Avatar shows up in the composer
      setProfileState(data);

      // Cache it for instant loading next time
      localStorage.setItem("userProfile", JSON.stringify(data));
    }

    setLoading(false);
  };

  const handleLoginAndStreak = async () => {
    if (!user?.id) return;
    const today = new Date().toISOString().split("T")[0];

    // ✅ 1. Load from localStorage for instant UI feedback
    const cached = JSON.parse(localStorage.getItem("streakData") || "{}");
    if (cached?.currentStreak !== undefined) {
      setStudyStreak(cached.currentStreak);
      setBestStreak(cached.bestStreak || 0);
    }

    // ✅ 2. Check/Record today's login in the database
    const { data: existing, error: existingError } = await supabase
      .from("login_activity")
      .select("*")
      .eq("user_id", user.id)
      .eq("login_date", today)
      .maybeSingle();

    if (!existing && !existingError) {
      // Record new login for today
      await supabase.from("login_activity").insert({
        user_id: user.id,
        login_date: today,
      });
    }

    // ✅ 3. Fetch the updated streak after recording today's visit
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

      // Update best streak state and database if needed
      updateBestStreakIfNeeded(newStreak);

      // ✅ 4. Update localStorage so the streak stays updated on next visit
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
  function QuickStatSkeleton() {
    return (
      <div
        className="
        relative overflow-hidden
        min-w-[220px]
        h-[260px]
        rounded-xl
        snap-start
        flex-shrink-0
        bg-gray-200 dark:bg-gray-800
        animate-pulse
      "
      >
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-4 w-28 bg-gray-300 dark:bg-gray-700 rounded" />
            <div className="h-4 w-4 bg-gray-300 dark:bg-gray-700 rounded-full" />
          </div>

          <div className="mt-10 space-y-3">
            <div className="h-8 w-20 bg-gray-300 dark:bg-gray-700 rounded" />
            <div className="h-2 w-full bg-gray-300 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-no-select min-h-screen md:flex md:items-center md:justify-center bg-[var(--card-bg)] dark:bg-[var(--card-bg-dark)] w-full  ">
      <div className="w-full space-y-2 md:max-w-3xl md:px-4">
        <GreetingsCard />

        <Referral />
        {/* Quick Stats */}
        <div
          className="
    flex gap-2 mt-2 rounded-xl overflow-x-auto  custom-scrollbar snap-x snap-mandatory
    w-full py-2 px-2
    scrollbar-hide
  "
        >

          {loadingStats ? (
            <>
              <QuickStatSkeleton />
              <QuickStatSkeleton />
              <QuickStatSkeleton />
              <QuickStatSkeleton />
              <QuickStatSkeleton />
            </>
          ) : (
            <>
              {/* --- STAT CARDS SECTION --- */}
              <div className="flex gap-4 overflow-x-auto custom-scrollbar  pb-3 snap-x px-2 scrollbar-hide">


                {/* Study Progress */}
                <Card className="relative overflow-hidden min-w-[240px] h-[280px] rounded-2xl border-white/10 bg-slate-900 shadow-2xl snap-start flex-shrink-0 group transition-all duration-500 hover:-translate-y-2">
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: "url('/indexbackground3.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black z-10" />

                  <div className="relative z-20 h-full p-5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] uppercase tracking-[2px] font-bold text-blue-400">Performance</p>
                      <TrendingUp className="h-5 w-5 text-white/70" />
                    </div>
                    <div>
                      <h3 className="text-white/70 text-xs font-medium italic">Study Progress</h3>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-4xl font-bold tracking-tighter text-white">{studyProgress}</span>
                        <span className="text-xl font-bold text-white/50">%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${studyProgress}%` }} />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Quizzes Completed */}
                <Card className="relative overflow-hidden min-w-[240px] h-[280px] rounded-2xl border-white/10 bg-slate-900 shadow-2xl snap-start flex-shrink-0 group transition-all duration-500 hover:-translate-y-2">
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: "url('/indexbackground6.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black z-10" />

                  <div className="relative z-20 h-full p-5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] uppercase tracking-[2px] font-bold text-emerald-400">Activity</p>
                      <Target className="h-5 w-5 text-white/70" />
                    </div>
                    <div>
                      <h3 className="text-white/70 text-xs font-medium italic">Quizzes Completed</h3>
                      <div className="text-4xl font-bold tracking-tighter text-white mt-1">{quizCount}</div>
                      <p className="text-[10px] text-emerald-400 font-bold mt-1 flex items-center gap-1">
                        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        +3 THIS WEEK
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Target Score */}
                <Card className="relative overflow-hidden min-w-[240px] h-[280px] rounded-2xl border-white/10 bg-slate-900 shadow-2xl snap-start flex-shrink-0 group transition-all duration-500 hover:-translate-y-2">
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: "url('/background05.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black z-10" />

                  <div className="relative z-20 h-full p-5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] uppercase tracking-[2px] font-bold text-purple-400">Objective</p>
                      <Target className="h-5 w-5 text-white/70" />
                    </div>
                    <div>
                      <h3 className="text-white/70 text-xs font-medium italic">My Target Score</h3>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-4xl font-bold tracking-tighter text-white">{targetScore}</span>
                        <span className="text-xl font-bold text-white/50">%</span>
                      </div>
                      <button
                        onClick={() => navigate("/progress")}
                        className="w-full mt-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-lg text-[10px] font-bold text-white uppercase tracking-widest transition-all"
                      >
                        Adjust Target
                      </button>
                    </div>
                  </div>
                </Card>

                {/* Current Streak */}
                <Card className="relative overflow-hidden min-w-[240px] h-[280px] rounded-2xl border-white/10 bg-slate-900 shadow-2xl snap-start flex-shrink-0 group transition-all duration-500 hover:-translate-y-2">
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: "url('/indexbackground5.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black z-10" />

                  <div className="relative z-20 h-full p-5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] uppercase tracking-[2px] font-bold text-orange-400">Consistency</p>
                      <Clock className="h-5 w-5 text-white/70" />
                    </div>
                    <div>
                      <h3 className="text-white/70 text-xs font-medium italic">Current Streak</h3>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-4xl font-bold tracking-tighter text-white">{studyStreak}</span>
                        <span className="text-sm font-bold text-white/50 uppercase">Days</span>
                      </div>
                      <p className="text-[10px] text-orange-400 font-bold mt-1 uppercase tracking-tight">Don't break the chain!</p>
                    </div>
                  </div>
                </Card>

                {/* Best Streak */}
                <Card className="relative overflow-hidden min-w-[240px] h-[280px] rounded-2xl border-white/10 bg-slate-900 shadow-2xl snap-start flex-shrink-0 group transition-all duration-500 hover:-translate-y-2">
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: "url('/indexbackground2.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black z-10" />

                  <div className="relative z-20 h-full p-5 flex flex-col justify-between border-2 border-yellow-500/20 rounded-2xl">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] uppercase tracking-[2px] font-bold text-yellow-500">Milestone</p>
                      <Trophy className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <h3 className="text-white/70 text-xs font-medium italic">Best Streak</h3>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-4xl font-bold tracking-tighter text-white text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600">
                          {bestStreak}
                        </span>
                        <span className="text-sm font-bold text-white/50 uppercase">Days</span>
                      </div>
                      <p className="text-[10px] text-yellow-500/80 font-bold mt-1 uppercase tracking-tight">All-time record</p>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
        <TutorsList />
        {/* 🏆 Top Students Leaderboard */}
        <Card className="relative overflow-hidden rounded-xl border-0 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl shadow-2xl mt-6">

          {/* Decorative Background Glows */}
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

            {/* Stylized Explanation Section */}
            <details className="group mt-4 bg-slate-100/50 dark:bg-white/[0.03] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden transition-all duration-300">
              <summary className="cursor-pointer list-none p-4 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                <span>How winners are chosen?</span>
                <span className="transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="px-5 pb-5 pt-2 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Rules Section */}
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

          {/* 🧑‍🎓 Leaderboard Podium Horizontal Scroll */}
          <CardContent className="px-0 relative z-10">
            <div className="flex gap-1 overflow-x-auto custom-scrollbar  py-8 px-6 snap-x no-scrollbar">
              {loadingTopStudents ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="flex-shrink-0 w-44 h-64 rounded-2xl bg-slate-200 dark:bg-white/5 animate-pulse border border-slate-300 dark:border-white/10" />
                ))
              ) : topStudents.length > 0 ? (
                topStudents.map((s, idx) => {
                  // Sophisticated Rank Styling
                  const rankMeta = [
                    { label: "🥇 Gold", ring: "ring-yellow-400/50", glow: "shadow-yellow-500/20", bg: "from-yellow-500/20 via-yellow-500/5 to-transparent", text: "text-yellow-600 dark:text-yellow-400" },
                    { label: "🥈 Silver", ring: "ring-slate-300", glow: "shadow-slate-400/20", bg: "from-slate-400/20 via-slate-400/5 to-transparent", text: "text-slate-600 dark:text-slate-300" },
                    { label: "🥉 Bronze", ring: "ring-amber-600/50", glow: "shadow-amber-700/20", bg: "from-amber-700/20 via-amber-700/5 to-transparent", text: "text-amber-700 dark:text-amber-500" },
                    { label: `#${idx + 1}`, ring: "ring-slate-100", glow: "shadow-transparent", bg: "from-slate-100 dark:from-white/5 to-transparent", text: "text-slate-400" }
                  ][idx] || { label: `#${idx + 1}`, ring: "ring-transparent", glow: "", bg: "bg-transparent", text: "text-slate-400" };

                  return (
                    <div
                      key={s.userId}
                      onClick={() => setSelectedUserId(s.userId)}
                      className={`flex-shrink-0 w-44 snap-center relative group cursor-pointer transition-all duration-500 hover:-translate-y-2`}
                    >
                      {/* Card Container */}
                      <div className={`h-full p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-xl ${rankMeta.glow} transition-all group-hover:border-blue-500/30 overflow-hidden relative`}>

                        {/* Visual Background Accent */}
                        <div className={`absolute top-0 inset-x-0 h-24 bg-gradient-to-b ${rankMeta.bg} opacity-50`} />

                        <div className="relative z-10 flex flex-col items-center text-center">
                          {/* Avatar with Rank Ring */}
                          <div className={`relative mb-3`}>
                            <img
                              src={s.avatar_url || "/UsersAvatar.jpg"}
                              alt={s.name}
                              className={`w-16 h-16 rounded-full object-cover ring-4 ${rankMeta.ring} shadow-lg transition-transform duration-500 group-hover:scale-110`}
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

                          {/* Stars Display */}
                          <div className="flex justify-center mt-3 gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${i < s.stars ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200 dark:text-slate-800'}`}
                              />
                            ))}
                          </div>

                          {/* Rank Badge */}
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
          <UserProfileModal
            userId={selectedUserId}
            onClose={() => setSelectedUserId(null)}
          />
        </Card>

        <CountdownFloating />
        <ChallengeCard />
        <DailyTriviaCard />

        <DailyImagesTrivia />

        <FeedSeenTop10 />



        {/* --- FLOATING LEADERBOARD INDICATOR --- */}
        <div className="fixed top-14 right-4 z-40">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(40);
              setOverlayOpen(true);
            }}
            className="relative h-12 w-12 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-2xl flex items-center justify-center transition-all"
          >
            {topStudents.length > 0 ? (
              <>
                {/* Ping animation to show activity */}
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>

                <div className="h-13 w-13 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                  <img
                    src={topStudents[0].avatar_url || "/UsersAvatar.jpg"}
                    alt={topStudents[0].name}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Mini Crown Badge */}
                <div className="absolute -bottom-2 -left-2 bg-amber-500 text-white p-1 rounded-lg shadow-lg border-2 border-white dark:border-slate-900">
                  <Crown className="w-3 h-3 fill-current" />
                </div>
              </>
            ) : (
              <Trophy className="w-6 h-6 text-slate-400" />
            )}
          </motion.button>
        </div>

        {/* --- FEED & LEADERBOARD DIALOG --- */}
        <Dialog open={overlayOpen} onOpenChange={setOverlayOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2rem] border-0 bg-white dark:bg-slate-950">
            <div className="relative">
              {/* Header Decorative background */}
              <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-blue-500/10 to-transparent dark:from-blue-500/5 pointer-events-none" />

              <div className="relative p-6">
                {/* Card Title */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
                    <Newspaper className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    Feed Insights
                  </DialogTitle>
                </div>

                <div className="space-y-6">
                  {/* Summary Text */}
                  <DialogDescription className="text-sm text-center text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    "Practice makes permanent. Engage with the community feed to climb the ranks."
                  </DialogDescription>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* User Stats Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex flex-col items-center text-center">
                      <BookOpen className="w-4 h-4 text-slate-400 mb-2" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Your Attempts</span>
                      {feedsAttemptCount === undefined ? (
                        <div className="h-6 w-12 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-1" />
                      ) : (
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{feedsAttemptCount}</p>
                      )}
                    </div>

                    {/* Top Student Card */}
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 flex flex-col items-center text-center">
                      <Trophy className="w-4 h-4 text-amber-500 mb-2" />
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Current Leader</span>

                      {topStudents.length > 0 ? (
                        <div className="mt-2 flex flex-col items-center">
                          <img
                            src={topStudents[0].avatar_url || "/UsersAvatar.jpg"}
                            className="h-10 w-10 rounded-full border-2 border-white dark:border-slate-800 shadow-md object-cover"
                            alt="Leader"
                          />
                          <p className="text-xs font-bold text-slate-900 dark:text-white mt-1 truncate max-w-[80px]">
                            {topStudents[0].name.split(' ')[0]}
                          </p>
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse mt-2" />
                      )}
                    </div>
                  </div>

                  {/* Leader Badge - Theme Oriented */}
                  {topStudents.length > 0 && (
                    <div className="flex items-center justify-center">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-500/30">
                        <Crown className="w-3.5 h-3.5 fill-current" />
                        <span className="text-xs font-bold tracking-tight">Top Performer This Week</span>
                      </div>
                    </div>
                  )}

                  {/* CTA Button */}
                  <div className="pt-2">
                    <Button
                      className="w-full h-12 bg-gray-200 dark:bg-gray-800 text-black dark:text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-grey-100 hover:scale-[1.02] active:scale-[0.98]"
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(50);
                        navigate("/feed");
                        setOverlayOpen(false);
                      }}
                    >
                      Visit Feed Page
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">
                      Medrae Community Hub
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>


        {/* Upcoming Redletter Dates / Revision Schedule Card */}
        {calendarEvents.length > 0 && (
          <Card
            className="mt-6 cursor-pointer rounded-xl border-0 bg-white shadow-sm hover:shadow-md dark:bg-slate-900/50 transition-all group overflow-hidden"
            onClick={() => navigate("/calendar")}
          >
            {/* Clinical accent top bar */}
            <div className="h-1.5 w-full bg-teal-500/80" />

            <div className="p-5 space-y-4">
              {/* Header Area styled like a Duty Station board */}
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

              {/* Events List styled like duty logs/shifts */}
              <div className="space-y-2.5">
                {calendarEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 w-full hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3 truncate">
                      {/* Clinical Status Indicator */}
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

                    {/* Date Tag */}
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


        {/* --- MEDRAE DAILY STATUS SECTION --- */}
        <Card className="lg:col-span-3 w-full border-0  bg-white dark:bg-slate-900 shadow-sm rounded-xl overflow-hidden mt-6">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-black tracking-tight dark:text-white">Community Pulse</CardTitle>
                <CardDescription className="text-xs font-medium dark:text-slate-400">
                  Share clinical insights, study wins, or daily nursing inspiration.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 sm:p-6 pt-0">
            <div className="space-y-6">

              {/* --- STATUS COMPOSER --- */}
              <div className="px-4 sm:px-0">
                <div
                  onClick={() => setIsOpen(!isOpen)}
                  className={`flex items-center justify-between p-4 cursor-pointer rounded-2xl border transition-all ${isOpen
                    ? "bg-slate-50 dark:bg-slate-900 border-0"
                    : "bg-white dark:bg-slate-800 border-0 hover:border-blue-500/30"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-500" />
                    </div>
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      {isOpen ? "Drafting your status..." : "What's happening today?"}
                    </span>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-blue-500" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>

                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 space-y-4">
                    <textarea
                      className="w-full min-h-[100px] p-0 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none text-sm resize-none"
                      placeholder="Educate, inspire, or grow together..."
                      value={dailyContent}
                      onChange={(e) => setDailyContent(e.target.value)}
                    />

                    {/* Composer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        {/* Visibility */}
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          <select
                            value={dailyDuration}
                            onChange={(e) => setDailyDuration(e.target.value)}
                            className="bg-transparent text-xs font-bold focus:outline-none dark:text-white"
                          >
                            <option value="24h">24H</option>
                            <option value="1w">1 Week</option>
                            <option value="1m">1 Month</option>
                          </select>
                        </div>

                        {/* Image Upload */}
                        <input
                          id="dailyImageUpload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            const reader = new FileReader();
                            reader.onload = () => {
                              setImageToCrop(reader.result as string);
                              setShowCropModal(true);
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="hidden"
                        />
                        <label
                          htmlFor="dailyImageUpload"
                          className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs font-bold dark:text-white">Photo</span>
                        </label>
                      </div>

                      <Button
                        onClick={handlePostClick}
                        disabled={uploading}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 px-6 font-bold text-xs h-9"
                      >
                        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-2" /> Post</>}
                      </Button>
                    </div>

                    {/* Preview Area */}
                    {dailyImage && (
                      <div className="relative mt-2 w-24 h-24 group">
                        <img src={URL.createObjectURL(dailyImage)} className="w-full h-full object-cover rounded-xl border border-white/20 shadow-md" alt="Preview" />
                        <button
                          onClick={() => setDailyImage(null)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
              {/* --- STATUS FEED --- */}
              <div className="space-y-4">
                {loading ? (
                  <div className="space-y-4 px-4 sm:px-0">
                    {[1, 2].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse" />)}
                  </div>
                ) : dailyPosts.length > 0 ? (
                  dailyPosts.map((post) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      /*
                         Removed gap-4 and flex. Added p-4 for text spacing.
                         The image will use negative margins to break out of this p-4 on mobile.
                      */
                      className="group relative bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-white/5 last:border-0 overflow-hidden"
                    >
                      <div className="flex flex-col">

                        {/* 1. HEADER: Avatar, Name, and Delete Button */}
                        <div className="flex items-center justify-between p-4 pb-2">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <button
                                onClick={() => setOpenProfileId(openProfileId === post.id ? null : post.id)}
                                className="block h-10 w-10 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm"
                              >
                                {post.profiles?.avatar_url ? (
                                  <img src={post.profiles.avatar_url} className="h-full w-full object-cover" alt="avatar" />
                                ) : (
                                  <div className="h-full w-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 text-xs">
                                    {post.profiles?.username?.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </button>

                              {/* Profile Tooltip (Now positioned relatively to the Header) */}
                              <AnimatePresence>
                                {openProfileId === post.id && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute left-0 top-full mt-2 z-50 w-56 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl"
                                  >
                                    <div className="space-y-2">
                                      <p className="font-black text-sm dark:text-white truncate">{post.profiles?.name}</p>
                                      <p className="text-[10px] font-bold text-blue-500 uppercase">@{post.profiles?.username}</p>
                                      <div className="pt-2 space-y-1.5">
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                                          <School className="w-3 h-3" /> {post.profiles?.institution || "Medical Student"}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                                          <MapPin className="w-3 h-3" /> {post.profiles?.county || "Kenya"}
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            <div className="flex flex-col">
                              <span className="text-sm font-black dark:text-white leading-tight">{post.profiles?.name}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>

                          {user?.id === post.user_id && (
                            <button
                              onClick={() => handleDeletePost(post.id, post.user_id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* 2. CONTENT: Text message */}
                        {post.content && (
                          <div className="px-4 pb-3">
                            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                              {post.content}
                            </p>
                          </div>
                        )}

                        {/* 3. IMAGE: EDGE-TO-EDGE ON MOBILE */}
                        {post.image_url && (
                          <div className="relative -mx-0 sm:rounded-xl overflow-hidden bg-slate-50 dark:bg-black/20 flex items-center justify-center border-y border-slate-100 dark:border-white/5">
                            <img
                              src={post.image_url}
                              className="w-full h-auto max-h-[70vh] object-contain cursor-zoom-in"
                              alt="status"
                              onClick={() => setFullscreenImage(post.image_url)}
                            />
                          </div>
                        )}

                        {/* 4. FOOTER: Expiry */}
                        <div className="p-4 flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-white/5 rounded-full">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                              Expires {new Date(post.expires_at).toLocaleDateString()}
                            </span>
                          </div>

                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <p className="text-sm font-medium text-slate-400">The pulse is quiet. Start the conversation.</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <AnimatePresence>
            {showCropModal && imageToCrop && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4"
              >
                <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-4 shadow-2xl">
                  <div className="relative h-80 w-full rounded-2xl overflow-hidden bg-black">
                    <Cropper
                      image={imageToCrop}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={(_, croppedPixels) =>
                        setCroppedAreaPixels(croppedPixels)
                      }
                    />
                  </div>

                  <div className="mt-4 space-y-4">
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full"
                    />

                    <div className="flex justify-end gap-3">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowCropModal(false);
                          setImageToCrop(null);
                        }}
                      >
                        Cancel
                      </Button>

                      <Button
                        onClick={async () => {
                          try {
                            if (imageToCrop && croppedAreaPixels) {
                              // 1. Generate the actual cropped File object
                              const croppedFile = await getCroppedImg(imageToCrop, croppedAreaPixels);

                              // 2. Set it to your dailyImage state (so it shows in preview and uploads)
                              setDailyImage(croppedFile);

                              // 3. Close the modal
                              setShowCropModal(false);
                              setImageToCrop(null);

                              sonnerToast.success("Image cropped successfully!");
                            }
                          } catch (e) {
                            console.error("Crop error:", e);
                            sonnerToast.error("Failed to crop image");
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Done Cropping
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Fullscreen Image Overlay */}
          <AnimatePresence>
            {fullscreenImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-950/95 z-[100] flex items-center justify-center p-4"
                onClick={() => setFullscreenImage(null)}
              >
                <img
                  src={fullscreenImage}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                  alt="fullscreen"
                />
                <button className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-8 h-8" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>


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

          {/* Alert Callouts */}
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

          {/* Grid Layout */}
          {(!cachedSimulationPapers.length && loading) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[280px] rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 px-2 sm:px-0">
              {cachedSimulationPapers.map((paper) => (
                <Card
                  key={paper.id}
                  className="group relative flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 rounded-2xl"
                  onClick={async () => {
                    navigate(`/simulation/${paper.id}`);
                    const { data: userData } = await supabase.auth.getUser();
                    await supabase.from("simulation_visits").insert({
                      paper_id: paper.id,
                      user_id: userData?.user?.id || null,
                    });
                  }}
                >
                  {/* Top Header Section */}
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

                    {/* Meta Stats Row */}
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
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{paper.visit_count} Attempts</span>
                      </div>
                    </div>

                    {/* Progress Bar Section */}
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
              ))}
            </div>
          )}

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

        {/* --- COMMUNITY & SHARE GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full mt-2 px-2 sm:px-0">

          {/* Share Medrae Card */}
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

          {/* WhatsApp Channel Card */}
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

          {/* WhatsApp Group Card */}
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

          {/* Telegram & Facebook - (Unified style) */}
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
        <LiveReactions />
      </div>

    </div >

  );
}

// 🚀 NEW: Cloudinary Upload Helper
// Using same credentials as your Feed logic
const uploadToCloudinary = async (file) => {
  const cloudName = "dpj5vprwf";
  const uploadPreset = "js1gxxdv";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  console.log("DEBUG: Starting Cloudinary upload for Daily Status..."); // Future Debug

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error("DEBUG: Cloudinary Error:", errorData); // Future Debug
    throw new Error(errorData.error.message);
  }

  const data = await response.json();
  console.log("DEBUG: Cloudinary Success! URL:", data.secure_url); // Future Debug
  return data.secure_url;
};
// Paste this at the very bottom of your file
const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<File> => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("No 2d context");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "cropped_image.jpg", { type: "image/jpeg" });
      resolve(file);
    }, "image/jpeg");
  });
};