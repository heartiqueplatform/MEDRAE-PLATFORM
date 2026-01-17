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
            <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
              <AIWrapper>
                <FirstTimeGuide />
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<PublicOnlyRoute><Index /></PublicOnlyRoute>} />
                  <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                  <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
                  <Route path="/redirect" element={<RedirectToRoleDashboard />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/dashboard" element={<Navigate to={`/dashboard/${getRole()}`} replace />} />
                  <Route path="/dashboard/student" element={<PrivateRoute><DashboardLayout userRole="student"><StudentDashboard /></DashboardLayout></PrivateRoute>} />
                  <Route path="/dashboard/tutor" element={<PrivateRoute><DashboardLayout userRole="tutor"><TutorDashboard /></DashboardLayout></PrivateRoute>} />
                  <Route path="/dashboard/staff" element={<PrivateRoute><DashboardLayout userRole="staff"><StaffDashboard /></DashboardLayout></PrivateRoute>} />
                  <Route path="/my-mistakes" element={<DashboardLayout userRole={getRole()}><MyMistakes /></DashboardLayout>} />
                  <Route path="/ai-assistant" element={<DashboardLayout userRole={getRole()}><AIAssistant /></DashboardLayout>} />
                  <Route path="/calendar" element={<DashboardLayout userRole={getRole()}><Calendar /></DashboardLayout>} />
                  <Route path="/progress" element={<DashboardLayout userRole={getRole()}><StudyProgress /></DashboardLayout>} />
                  <Route path="/resources" element={<DashboardLayout userRole={getRole()}><Resources /></DashboardLayout>} />
                  <Route path="/medtube" element={<DashboardLayout userRole={getRole()}><MedTube /></DashboardLayout>} />
                  <Route path="/announcements" element={<DashboardLayout userRole={getRole()}><Announcements /></DashboardLayout>} />
                  <Route path="/feedback" element={<DashboardLayout userRole={getRole()}><Feedback /></DashboardLayout>} />
                  <Route path="/settings" element={<DashboardLayout userRole={getRole()}><Settings /></DashboardLayout>} />
                  <Route path="/subscription" element={<DashboardLayout userRole={getRole()}><Subscription /></DashboardLayout>} />
                  <Route path="/notifications" element={<DashboardLayout userRole={getRole()}><Notifications /></DashboardLayout>} />
                  <Route path="/profile" element={<DashboardLayout userRole={getRole()}><Profile /></DashboardLayout>} />
                  <Route path="/quiz" element={<DashboardLayout userRole={getRole()}><QuizPage /></DashboardLayout>} />
                  <Route path="/assessment-notes" element={<DashboardLayout userRole={getRole()}><AssessmentNotes /></DashboardLayout>} />
                  <Route path="/simulation/candidate" element={<DashboardLayout userRole={getRole()}><CandidateInfo /></DashboardLayout>} />
                  <Route path="/quiz-simulation/instructions" element={<DashboardLayout userRole={getRole()}><InstructionPage /></DashboardLayout>} />
                  <Route path="/forum" element={<DashboardLayout userRole={getRole()}><Forum /></DashboardLayout>} />
                  <Route path="/simulation/:paper_id" element={<SimulationPage />} />
                  <Route path="/Medrae-quizzes" element={<DashboardLayout userRole={getRole()}><MedraeQuizzes /></DashboardLayout>} />
                  <Route path="/feed" element={<DashboardLayout userRole={getRole()}><Feed /></DashboardLayout>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <BottomBarWrapper />
              </AIWrapper>
            </BrowserRouter>
          </SidebarProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </SessionContextProvider>
  );
};
export default App;
