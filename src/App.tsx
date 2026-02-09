"use client";

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

// Pages
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

import { Announcements } from "./pages/Announcements";
import { Feedback } from "./pages/Feedback";
import { Settings } from "./pages/Settings";
import { Subscription } from "./pages/Subscription";
import { Notifications } from "./pages/Notifications";
import { Profile } from "./pages/Profile";
import { RedirectToRoleDashboard } from "./pages/RedirectToRoleDashboard";
import { useEffect, useState } from "react";
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

const queryClient = new QueryClient();

const getRole = (): "student" | "tutor" | "staff" => {
  return (localStorage.getItem("userRole") as "student" | "tutor" | "staff") || "student";
};
const AIWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const allowedPaths = [
    "/dashboard/student",
    "/dashboard/tutor",
    "/dashboard/staff",
    "/assessment-notes",
    "/medtube",
    "/resources",
    "/calendar",
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
  return <BottomBar userRole={getRole()} unreadCount={0} unreadAnnouncements={0} />;
};

const App = () => {
  const [loading, setLoading] = useState(!localStorage.getItem("splashShown"));
  const theme = (localStorage.getItem("theme") as "light" | "dark") || "light";
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
      ["trivia-finish", "/sounds/Trivia.mp3"]
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from("user_mistakes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("resolved", false);
      if (!error) updateBadge(count || 0);
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
    };

    fetchCount();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  if (loading) return <SplashScreen theme={theme} />; // pass theme to SplashScreen

  return (
    <SessionContextProvider supabaseClient={supabase}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <SidebarProvider>
            <MusicPlayerProvider>
              <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
                <AIWrapper>
                  <FirstTimeGuide />
                  <Routes>
                    {/* ------------------- Public Routes ------------------- */}
                    <Route path="/" element={<PublicOnlyRoute><Index /></PublicOnlyRoute>} />
                    <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                    <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
                    <Route path="/redirect" element={<RedirectToRoleDashboard />} />
                    <Route path="/reset-password" element={<ResetPassword />} />

                    {/* ------------------- Dashboard Redirect ------------------- */}
                    <Route path="/dashboard" element={<Navigate to={`/dashboard/${getRole()}`} replace />} />

                    {/* ------------------- Persistent Dashboard Layout ------------------- */}
                    <Route element={<PrivateRoute><DashboardLayout userRole={getRole()} /></PrivateRoute>}>
                      <Route path="/dashboard/student" element={<StudentDashboard />} />
                      <Route path="/dashboard/tutor" element={<TutorDashboard />} />
                      <Route path="/dashboard/staff" element={<StaffDashboard />} />

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
                    </Route>

                    {/* ------------------- Full-screen / Independent Pages ------------------- */}

                    <Route path="/simulation/:paper_id" element={<SimulationPage />} />

                    {/* ------------------- Catch-all ------------------- */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>

                  <BottomBarWrapper />
                </AIWrapper>
              </BrowserRouter>
            </MusicPlayerProvider>
          </SidebarProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </SessionContextProvider>
  );
};
export default App;
