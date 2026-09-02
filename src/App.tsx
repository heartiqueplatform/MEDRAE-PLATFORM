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
// StudentAnalyticsPage - Keep as normal import for now
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
// After the existing imports, add these:
// In your App.tsx, replace the import section with this:

// After the existing imports, add these:
import {
  AssessmentHome,
  AssessmentQuestion,  // ← Changed from AssessmentChat
  AssessmentResults,
  AssessmentHistory
} from '@/pages/assessment';
import { Announcements } from "./pages/Announcements";
import { Feedback } from "./pages/Feedback";
import { Settings } from "./pages/Settings";
import { Subscription } from "./pages/Subscription";
import { Notifications } from "./pages/Notifications";
import { Profile } from "./pages/Profile";
import { RedirectToRoleDashboard } from "./pages/RedirectToRoleDashboard";
import { useEffect, useState, useRef, useCallback } from "react";
import { initSound, loadSound } from "@/lib/soundManager";

// SplashScreen import removed
import CandidateInfo from "@/pages/quiz-simulation/CandidateInfo";
import InstructionPage from "@/pages/quiz-simulation/InstructionPage";
import SimulationPage from "@/pages/quiz-simulation/SimulationPage";
import AIChatWidget from "@/components/AIChatWidget";
import FirstTimeGuide from "@/components/FirstTimeGuide";
import ResetPassword from "./pages/ResetPassword";
// Add these imports at the top with other imports
import GroupPayHome from './pages/grouppay/index';
import CreateGroupPage from './pages/grouppay/create';
import GroupDetailsPage from './pages/grouppay/[id]';
// Layout
import { DashboardLayout } from "./components/layout/DashboardLayout";
import HelpCenter from "./pages/HelpCenter";

// Role-based Dashboards
import StudentDashboard from "./pages/dashboard/student";
import TutorDashboard from "./pages/dashboard/tutor";
import StaffDashboard from "./pages/dashboard/staff";
import { toast } from "sonner";
import AddHousingPage from "./pages/survival-hub/AddHousing";
import ReviewsPage from "./pages/survival-hub/ReviewsPage";
import ExamCenters from "./pages/survival-hub/ExamCenters";
import AddPlacementPage from "./pages/survival-hub/AddPlacement";
import PlacementDetailPage from "./pages/survival-hub/PlacementDetail";
import ExamBuddiesPage from "./pages/survival-hub/ExamBuddiesPage";
import AuthCallback from "./pages/AuthCallback";
import FloatingStreakCandle from "./components/FloatingStreakCandle";
import { ProfileIncompleteChecker } from "./components/ProfileIncompleteChecker";
import LinkGenerator from "./pages/LinkGenerator";
import RedirectHandler from "./pages/RedirectHandler";
import { FloatingRefreshLoader } from "./components/FloatingRefreshLoader";
import { LiveClassesDashboard } from "./pages/live-classes/LiveClassesDashboard";
import { CreateClass } from "./pages/live-classes/CreateClass";
import { MyClasses } from "./pages/live-classes/MyClasses";
import { ClassDetails } from "./pages/live-classes/ClassDetails";
import { GlobalDuelManager } from "./components/duel/GlobalDuelManager";
import NursingQuiz from "./pages/nursing/NursingQuiz";
import NursingUnit from "./pages/nursing/NursingUnit";
import NursingModule from "./pages/nursing/NursingModule";
import NursingSemester from "./pages/nursing/NursingSemester";
import NursingHome from "./pages/nursing/NursingHome";
import TopicSearch from "./pages/nursing/TopicSearch";
import ProgressPage from "./pages/nursing/ProgressPage";
import { UserRoleProvider } from "./context/UserRoleContext";
import CookiePolicyPage from "./pages/CookiePolicyPage";

// ============================================
// CACHE CONFIGURATION
// ============================================
const PROFILE_CACHE_KEY = "app_user_profile_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000;

const getCachedProfile = () => {
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
    return null;
  } catch {
    return null;
  }
};

const setCachedProfile = (profile: any) => {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
      data: profile,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error("Failed to cache profile:", error);
  }
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      onError: (error: any) => {
        toast.error("Something went wrong", {
          description: error?.message || "Failed to fetch data. Please try again.",
        });
      },
    },
    mutations: {
      onError: (error: any) => {
        toast.error("Action failed", {
          description: error?.message || "Could not complete your request.",
        });
      },
    },
  },
});

const AIWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const allowedPaths = ["/assessment-notes", "/resources"];
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
      {/* {showChatWidget && <AIChatWidget isDarkTheme={isDarkTheme} />} */}
    </>
  );
};

const BottomBarWrapper = () => {
  const location = useLocation();
  const publicPaths = ["/", "/login", "/register"];

  // 🆕 HIDE on mobile (phones) - only show on tablet/desktop
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return null;
  }

  const showBottomBar = !publicPaths.includes(location.pathname);
  if (!showBottomBar) return null;
  return <BottomBar unreadCount={0} unreadAnnouncements={0} />;
};

const AppContent = () => {
  const { user } = useAuth();
  const [forceLogout, setForceLogout] = useState(false);
  const realtimeChannelRef = useRef<any>(null);
  const badgeChannelRef = useRef<any>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const [profile, setProfile] = useState<any>(() => {
    if (typeof window !== "undefined") {
      return getCachedProfile();
    }
    return null;
  });
  const theme = (localStorage.getItem("theme") as "light" | "dark") || "light";

  const fetchUserProfile = useCallback(async () => {
    if (!user) return;

    const cached = getCachedProfile();
    if (cached) {
      setProfile(cached);
      return;
    }

    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("user_id, name, username, role, avatar_url, institution")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && profileData) {
      setProfile(profileData);
      setCachedProfile(profileData);
    }
  }, [user]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
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
      ["alert-sound", "/sounds/Alert.mp3"],
      ["ui-tap", "/sounds/Uitap.mp3"]
    ];
    soundFiles.forEach(([name, src]) => {
      const audio = loadSound(name, src);
      if (audio) {
        audio.load();
      }
    });
    initSound();
  }, []);

  useEffect(() => {
    if (!user) return;

    const performHeartbeat = async () => {
      if (document.hidden) return;

      const deviceId = localStorage.getItem("device_id");

      await supabase.rpc('handle_user_heartbeat', {
        p_user_id: user.id,
        p_device_id: deviceId || ""
      });
    };

    performHeartbeat();

    const interval = setInterval(performHeartbeat, 600000);
    const handleVisibility = () => {
      if (!document.hidden) performHeartbeat();
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !("setAppBadge" in navigator)) return;

    const updateBadge = async () => {
      if (document.hidden) return;

      const { count } = await supabase
        .from("user_mistakes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("resolved", false);

      if (count > 0) {
        navigator.setAppBadge(count).catch(() => { });
      } else {
        navigator.clearAppBadge?.();
      }
    };

    updateBadge();

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) updateBadge();
    });

    return () => document.removeEventListener('visibilitychange', updateBadge);
  }, [user]);

  return (
    <>
      {forceLogout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 shadow-lg rounded-2xl p-6 text-center mx-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Session Ended</h2>
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

          <GlobalDuelManager />

          <TooltipProvider>
            <Toaster />
            <Sonner />
            <SidebarProvider>
              <MusicPlayerProvider>
                <UserRoleProvider>
                  <AIWrapper>
                    <FirstTimeGuide />
                    <RouteScrollManager />
                    <Routes>
                      <Route path="/go/:code" element={<RedirectHandler />} />

                      {/* Public Routes */}
                      <Route path="/" element={<PublicOnlyRoute><Index /></PublicOnlyRoute>} />
                      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
                      <Route path="/redirect" element={<RedirectToRoleDashboard />} />
                      <Route path="/reset-password" element={<ResetPassword />} />

                      <Route path="/dashboard" element={<RedirectToRoleDashboard />} />

                      {/* Persistent Dashboard Layout */}
                      <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
                        {/* Core dashboards */}
                        <Route path="/dashboard/student" element={<StudentDashboard />} />
                        <Route path="/dashboard/tutor" element={<TutorDashboard />} />
                        <Route path="/dashboard/staff" element={<StaffDashboard />} />

                        {/* Market pages */}
                        <Route path="/market" element={<MarketFeed user={user} profile={profile} />} />
                        {user && profile && (
                          <Route path="/market/create" element={<CreateListingPage user={user} profile={profile} />} />
                        )}
                        <Route path="/market/my-listings" element={<MyListings />} />
                        <Route path="/market/:id" element={<ListingDetail />} />
                        <Route path="/share" element={<LinkGenerator />} />

                        {/* Student Exam Flow */}
                        <Route path="/exam" element={<Navigate to="/exam/candidate" />} />
                        <Route path="/exam/candidate" element={<ExamCandidateInfo />} />
                        <Route path="/exam/instructions/:paper_id" element={<ExamInstructions />} />
                        <Route path="/exam/:paper_id/results" element={<StudentResultsPage />} />
                        <Route path="/exam/results" element={<ResultsListPage />} />
                        <Route path="/challenge" element={<ChallengePage />} />
                        <Route path="/live-classes/:id" element={<ClassDetails />} />
                        <Route path="/live-classes" element={<LiveClassesDashboard />} />
                        <Route path="/live-classes/create" element={<CreateClass />} />
                        <Route path="/my-classes" element={<MyClasses />} />

                        {/* Tutor Exam Control */}
                        <Route path="/tutor/exams" element={<TutorExamList />} />
                        <Route path="/tutor/exams/:paper_id" element={<TutorExamDetails />} />
                        <Route path="/tutor/exams/:paper_id/live" element={<TutorLiveMonitor />} />
                        <Route path="/tutor/exams/:paper_id/results" element={<TutorResultsPage />} />
                        <Route path="/help" element={<HelpCenter />} />

                        {/* Analytics */}
                        <Route path="/analytics" element={<StudentAnalyticsPage />} />

                        {/* Core features */}
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
                        <Route path="/Medrae-quizzes" element={<MedraeQuizzes />} />
                        <Route path="/feed" element={<Feed />} />

                        <Route path="/grouppay" element={<GroupPayHome />} />
                        <Route path="/grouppay/create" element={<CreateGroupPage />} />
                        <Route path="/grouppay/:id" element={<GroupDetailsPage />} />

                        {/* NURSING CURRICULUM ROUTES */}
                        <Route path="/nursing" element={<NursingHome />} />
                        <Route path="/nursing/:yearId" element={<NursingSemester />} />
                        <Route path="/nursing/:yearId/:semId" element={<NursingModule />} />
                        <Route path="/nursing/:yearId/:semId/:moduleId" element={<NursingUnit />} />
                        <Route path="/nursing/quiz/:topicId" element={<NursingQuiz />} />
                        <Route path="/nursing/search" element={<TopicSearch />} />
                        <Route path="/nursing/progress" element={<ProgressPage />} />

                        {/* Quiz Simulation */}
                        <Route path="/simulation/candidate" element={<CandidateInfo />} />
                        <Route path="/quiz-simulation/instructions" element={<InstructionPage />} />

                        {/* ASSESSMENT ROUTES */}
                        <Route path="/assessments">
                          <Route index element={<AssessmentHome />} />
                          <Route path="search" element={<AssessmentHome />} />
                          <Route path="history" element={<AssessmentHistory />} />
                          <Route path=":slug" element={<AssessmentQuestion />} />
                          <Route path=":slug/results/:attemptId" element={<AssessmentResults />} />
                        </Route>

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

                      {/* Full-screen / Independent Pages */}
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/cookies" element={<CookiePolicyPage />} />
                      <Route path="/simulation/:paper_id" element={<SimulationPage />} />
                      <Route path="/privacy" element={<PrivacyPolicyPage />} />
                      <Route path="/exam/access/:paper_id" element={<ExamAccessPage />} />
                      <Route path="/auth/callback" element={<AuthCallback />} />

                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    <FloatingStreakCandle />
                    <ProfileIncompleteChecker />

                    <BottomBarWrapper />

                  </AIWrapper>
                </UserRoleProvider>
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