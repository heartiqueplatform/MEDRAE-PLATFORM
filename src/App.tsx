"use client";
import GlobalRealtimeListener from "@/components/GlobalRealtimeListener";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { supabase } from "./lib/supabaseClient";
import { MedraeQuizzes } from "@/pages/MedraeQuizzes";
import Feed from "./pages/Feed";
import { BottomBar } from "@/components/ui/BottomBar";
import { SidebarProvider } from "@/components/ui/sidebar";
import MyMistakes from "./pages/MyMistakes";
import PublicOnlyRoute from "@/auth/PublicOnlyRoute";
import PrivateRoute from "@/auth/PrivateRoute";
import { Footer } from "@/components/Footer";
import { MusicPlayerProvider } from "@/components/MusicPlayerProvider";
import { MusicPlayer } from "@/components/MusicPlayer";
import TermsPage from "./pages/TermsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import MarketFeed from "./pages/market";
import CreateListingPage from "./pages/market/create";
import MyListings from "./pages/market/my-listings";
import ListingDetail from "./pages/market/[id]";
// Pages
import ChallengePage from "./pages/challenge";
import { AuthProvider } from "@/context/AuthProvider";
import { useAuth } from "@/context/AuthProvider";
import { Forum } from "./pages/Forum";
import AssessmentNotes from "./pages/AssessmentNotes";
import QuizPage from "./pages/QuizPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { AIAssistant } from "./pages/AIAssistant";
import { Calendar } from "./pages/Calendar";
import { StudyProgress } from "./pages/Progress";
import { Resources } from "./pages/Resources";
import { MedTube } from "./pages/MedTube";
import StudentAnalyticsPage from "@/pages/analytics/StudentAnalyticsPage";

// Import your new pages
import SurvivalHubDashboard from './pages/survival-hub/index';

import HousingPage from './pages/survival-hub/Housing';
import HospitalsPage from './pages/survival-hub/Hospitals';
import PlacementsPage from './pages/survival-hub/Placements';
// STUDENT EXAM FLOW
import RouteScrollManager from "@/components/RouteScrollManager";
import ExamCandidateInfo from "./pages/exam/CandidateInfo";
import ExamInstructions from "./pages/exam/InstructionPage";
import ExamAccessPage from "./pages/exam/ExamAccessPage";
import StudentResultsPage from "@/pages/exam/StudentResultsPage";;
import ResultsListPage from "@/pages/exam/ResultsListPage";
// TUTOR EXAM CONTROL
import TutorExamList from "./pages/exam/tutor/ExamList";
import TutorExamDetails from "./pages/exam/tutor/ExamDetails";
import TutorLiveMonitor from "./pages/exam/tutor/LiveMonitor";
import TutorResultsPage from "./pages/exam/tutor/ResultsPage";

import { Announcements } from "./pages/Announcements";
import { Feedback } from "./pages/Feedback";
import { Settings } from "./pages/Settings";
import { Subscription } from "./pages/Subscription";
import { Notifications } from "./pages/Notifications";
import { Profile } from "./pages/Profile";
import { RedirectToRoleDashboard } from "./pages/RedirectToRoleDashboard";
import { useEffect, useState, useRef } from "react";
import { initSound, loadSound } from "@/lib/soundManager";

import SplashScreen from "./SplashScreen";
import CandidateInfo from "@/pages/quiz-simulation/CandidateInfo";
import InstructionPage from "@/pages/quiz-simulation/InstructionPage";
import SimulationPage from "@/pages/quiz-simulation/SimulationPage";
import AIChatWidget from "@/components/AIChatWidget";
import FirstTimeGuide from "@/components/FirstTimeGuide";
import ResetPassword from "./pages/ResetPassword";

// Layout
import { DashboardLayout } from "./components/layout/DashboardLayout";

// Role-based Dashboards
import StudentDashboard from "./pages/dashboard/student";
import TutorDashboard from "./pages/dashboard/tutor";
import StaffDashboard from "./pages/dashboard/staff";
import { toast } from "sonner"; // make sure Sonner is imported
import AddHousingPage from "./pages/survival-hub/AddHousing";
import ReviewsPage from "./pages/survival-hub/ReviewsPage";
import ExamCenters from "./pages/survival-hub/ExamCenters";
import AddPlacementPage from "./pages/survival-hub/AddPlacement";
import PlacementDetailPage from "./pages/survival-hub/PlacementDetail";
import ExamBuddiesPage from "./pages/survival-hub/ExamBuddiesPage";
import AuthCallback from "./pages/AuthCallback";
import FloatingStreakCandle from "./components/FloatingStreakCandle";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // retry once
      refetchOnWindowFocus: false,
      onError: (error: any) => {
        toast.error("Something went wrong", {
          description:
            error?.message || "Failed to fetch data. Please try again.",
        });
      },
    },
    mutations: {
      onError: (error: any) => {
        toast.error("Action failed", {
          description:
            error?.message || "Could not complete your request.",
        });
      },
    },
  },
});


const AIWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const allowedPaths = [
    "/assessment-notes",
    "/resources",
  ];
  const showChatWidget = allowedPaths.some((path) =>
    location.pathname.startsWith(path)
  );
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDarkTheme(media.matches);

    const listener = (e: MediaQueryListEvent) => setIsDarkTheme(e.matches);
    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, []);

  return (
    <>
      {children}
      {showChatWidget && <AIChatWidget isDarkTheme={isDarkTheme} />}
    </>
  );
};
const BottomBarWrapper = () => {
  const location = useLocation();
  const publicPaths = ["/", "/login", "/register"];
  const showBottomBar = !publicPaths.includes(location.pathname);
  if (!showBottomBar) return null;
  return <BottomBar unreadCount={0} unreadAnnouncements={0} />;
};

const AppContent = () => {
  const { user } = useAuth();
  const [forceLogout, setForceLogout] = useState(false);
  const realtimeChannelRef = useRef<any>(null); // updated
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(!localStorage.getItem("splashShown"));
  const theme = (localStorage.getItem("theme") as "light" | "dark") || "light";

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!error && profileData) {
        setProfile(profileData);
      }
    };
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    initSound();
    const soundFiles: [string, string][] = [
      ["tap-correct", "/sounds/tap1.mp3"],
      ["tap-wrong", "/sounds/tap2.mp3"],
      ["tap", "/sounds/tap0.mp3"],
      ["start", "/sounds/start.mp3"],
      ["medrae", "/sounds/medrae.mp3"],
      ["medrae-study", "/sounds/MedraeStudy.mp3"],
      ["medrae-voice", "/sounds/MedraeVoice.mp3"],
      ["notification", "/sounds/notification.mp3"],
      ["trivia-finish", "/sounds/Trivia.mp3"],
      ["toast-sound", "/sounds/Toast.mp3"],
      ["alert-sound", "/sounds/Alert.mp3"]

    ];
    soundFiles.forEach(([name, src]) => {
      const audio = loadSound(name, src);
      if (audio) {
        audio.play().catch(() => { });
        audio.pause();
        audio.currentTime = 0;
      }
    });
  }, []);

  useEffect(() => {
    const updateOnlineStatus = async () => {
      if (!user) return;


      // Mark user online immediately
      await supabase
        .from('profiles')
        .update({ is_online: true, last_seen: new Date() })
        .eq('user_id', user.id);

      // Heartbeat every 30 seconds to keep them online
      const interval = setInterval(async () => {
        await supabase
          .from('profiles')
          .update({ is_online: true, last_seen: new Date() })
          .eq('user_id', user.id);
      }, 30000);

      // Mark offline on tab close
      const handleBeforeUnload = async () => {
        await supabase
          .from('profiles')
          .update({ is_online: false, last_seen: new Date() })
          .eq('user_id', user.id);
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        clearInterval(interval);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    };

    updateOnlineStatus();
  }, [user]);

  useEffect(() => {
    const keepSessionAlive = async () => {
      try {
        if (!user) return;
        const deviceId = localStorage.getItem("device_id");


        if (!user || !deviceId) return;

        // Update last_active timestamp so the session stays alive
        await supabase
          .from("user_sessions")
          .update({ last_active: new Date() })
          .eq("user_id", user.id)
          .eq("device_id", deviceId);
      } catch (err) {
        console.error("Session keep-alive error:", err);
      }
    };

    // Initial update
    keepSessionAlive();

    // Periodically update last_active
    const interval = setInterval(keepSessionAlive, 30000); // every 30s

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
      localStorage.setItem("splashShown", "true");
    }, 2000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;
    let subscription: any;
    const updateBadge = (count: number) => {
      if (count > 0) {
        navigator.setAppBadge(count).catch(() => { });
      } else {
        navigator.clearAppBadge?.();
      }
    };

    const fetchCount = async () => {
      if (!user) return;


      const { count, error } = await supabase
        .from("user_mistakes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("resolved", false);
      if (!error) updateBadge(count || 0);
      if (realtimeChannelRef.current) {
        await supabase.removeChannel(realtimeChannelRef.current);
      }

      subscription = supabase
        .channel(`user_mistakes_real_time_${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_mistakes", filter: `user_id=eq.${user.id}` },
          async () => {
            const { count } = await supabase
              .from("user_mistakes")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("resolved", false);
            updateBadge(count || 0);
          }
        )
        .subscribe();

      realtimeChannelRef.current = subscription; // updated
    };

    fetchCount();

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [user]);

  if (loading) return <SplashScreen theme={theme} />; // pass theme to SplashScreen

  return (

    <>

      {forceLogout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">

          <div className="max-w-md w-full bg-white dark:bg-gray-900 shadow-lg rounded-2xl p-6 text-center mx-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Session Ended
            </h2>
            <p className="mt-3 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              For your security, we've recently upgraded our system. Your previous session has been ended.
              Please log in again to continue using your account safely.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors duration-200"
            >
              Log In Again
            </button>
            <p className="mt-3 text-gray-500 dark:text-gray-400 text-xs">
              If you did not log out, we recommend changing your password immediately to keep your account secure.
            </p>
            <p className="mt-2 text-gray-500 dark:text-gray-400 text-xs">
              ⚠️ Make sure to always use only one account. Multiple accounts may lead to being banned.
            </p>
          </div>
        </div>
      )}

      <SessionContextProvider supabaseClient={supabase}>

        <QueryClientProvider client={queryClient}>
          <GlobalRealtimeListener />
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <SidebarProvider>
              <MusicPlayerProvider>
                <AIWrapper>
                  <FirstTimeGuide />
                  <RouteScrollManager />
                  <Routes>
                    {/* ------------------- Public Routes ------------------- */}
                    <Route path="/" element={<PublicOnlyRoute><Index /></PublicOnlyRoute>} />
                    <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                    <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
                    <Route path="/redirect" element={<RedirectToRoleDashboard />} />
                    <Route path="/reset-password" element={<ResetPassword />} />

                    {/* ------------------- Dashboard Redirect ------------------- */}
                    <Route path="/dashboard" element={<RedirectToRoleDashboard />} />
                    {/* ------------------- Persistent Dashboard Layout ------------------- */}
                    <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
                      <Route path="/dashboard/student" element={<StudentDashboard />} />
                      <Route path="/dashboard/tutor" element={<TutorDashboard />} />
                      <Route path="/dashboard/staff" element={<StaffDashboard />} />

                      <Route path="/market" element={<MarketFeed user={user} profile={profile} />} />
                      {user && profile && (
                        <Route path="/market/create" element={<CreateListingPage user={user} profile={profile} />} />
                      )}
                      <Route path="/market/my-listings" element={<MyListings />} />
                      <Route path="/market/:id" element={<ListingDetail />} />

                      {/* ------------------- STUDENT EXAM FLOW ------------------- */}
                      <Route path="/exam" element={<Navigate to="/exam/candidate" />} />
                      <Route path="/exam/candidate" element={<ExamCandidateInfo />} />
                      <Route path="/exam/instructions/:paper_id" element={<ExamInstructions />} />
                      <Route path="/exam/:paper_id/results" element={<StudentResultsPage />} />
                      <Route path="/exam/results" element={<ResultsListPage />} />
                      <Route path="/challenge" element={<ChallengePage />} />
                      {/* ------------------- TUTOR EXAM CONTROL ------------------- */}
                      <Route path="/tutor/exams" element={<TutorExamList />} />
                      <Route path="/tutor/exams/:paper_id" element={<TutorExamDetails />} />
                      <Route path="/tutor/exams/:paper_id/live" element={<TutorLiveMonitor />} />
                      <Route path="/tutor/exams/:paper_id/results" element={<TutorResultsPage />} />
                      <Route path="/analytics" element={<StudentAnalyticsPage />} />

                      <Route path="/my-mistakes" element={<MyMistakes />} />
                      <Route path="/ai-assistant" element={<AIAssistant />} />
                      <Route path="/calendar" element={<Calendar />} />
                      <Route path="/progress" element={<StudyProgress />} />
                      <Route path="/resources" element={<Resources />} />
                      <Route path="/medtube" element={<MedTube />} />
                      <Route path="/announcements" element={<Announcements />} />
                      <Route path="/feedback" element={<Feedback />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/subscription" element={<Subscription />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/quiz" element={<QuizPage />} />
                      <Route path="/assessment-notes" element={<AssessmentNotes />} />
                      <Route path="/forum" element={<Forum />} />
                      <Route path="/Medrae-quizzes" element={<MedraeQuizzes />} />
                      <Route path="/feed" element={<Feed />} />
                      <Route path="/simulation/candidate" element={<CandidateInfo />} />
                      <Route path="/quiz-simulation/instructions" element={<InstructionPage />} />
                      {/* Survival Hub Module */}
                      <Route path="/survival-hub" element={<SurvivalHubDashboard />} />
                      <Route path="/survival-hub/exam-centers" element={<ExamCenters />} />
                      <Route path="/survival-hub/housing" element={<HousingPage />} />
                      <Route path="/survival-hub/hospitals" element={<HospitalsPage />} />
                      <Route path="/survival-hub/placements" element={<PlacementsPage />} />
                      <Route path="/survival-hub/add-housing" element={<AddHousingPage />} />
                      <Route path="/survival-hub/reviews/:targetId" element={<ReviewsPage />} />
                      <Route path="/survival-hub/add-placement" element={<AddPlacementPage />} />
                      <Route path="/survival-hub/placements/:id" element={<PlacementDetailPage />} />
                      <Route path="/survival-hub/buddies" element={<ExamBuddiesPage />} />

                    </Route>

                    {/* ------------------- Full-screen / Independent Pages ------------------- */}
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/simulation/:paper_id" element={<SimulationPage />} />
                    <Route path="/privacy" element={<PrivacyPolicyPage />} />
                    <Route path="/exam/access/:paper_id" element={<ExamAccessPage />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />

                    {/* ------------------- FULLSCREEN EXAM PAGE ------------------- */}

                    {/* ------------------- Catch-all ------------------- */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <FloatingStreakCandle />
                  <BottomBarWrapper />
                </AIWrapper>
              </MusicPlayerProvider>
            </SidebarProvider>
          </TooltipProvider>
        </QueryClientProvider>

      </SessionContextProvider>
    </>

  );
};
const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
