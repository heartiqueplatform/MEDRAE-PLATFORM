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

// ✅ Wrapper to show AI widget only on specific pages
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
  const showChatWidget = allowedPaths.some((path) => location.pathname.startsWith(path));
  return (
    <>
      {children}
      {showChatWidget && <AIChatWidget />}
    </>
  );
};

// ✅ BottomBar Wrapper
const BottomBarWrapper = () => {
  const location = useLocation();
  const publicPaths = ["/", "/login", "/register"];
  const showBottomBar = !publicPaths.includes(location.pathname);
  if (!showBottomBar) return null;
  return <BottomBar userRole={getRole()} unreadCount={0} unreadAnnouncements={0} />;
};

const App = () => {
  initSound();
  loadSound("tap-correct", "/sounds/tap1.mp3");
  loadSound("tap-wrong", "/sounds/tap2.mp3");
  loadSound("tap", "/sounds/tap0.mp3");
  loadSound("start", "/sounds/start.mp3");
  loadSound("medrae", "/sounds/medrae.mp3");
  loadSound("medrae-study", "/sounds/MedraeStudy.mp3");
  loadSound("medrae-voice", "/sounds/MedraeVoice.mp3");
  loadSound("notification", "/sounds/notification.mp3");

  // ✅ Trivia finish sound
  loadSound("trivia-finish", "/sounds/Trivia.mp3");


  // Splash state for first-time visitors
  const [loading, setLoading] = useState(!localStorage.getItem("splashShown"));
  const theme = (localStorage.getItem("theme") as "light" | "dark") || "light";

  useEffect(() => {
    if (!loading) return;

    const timer = setTimeout(() => {
      setLoading(false);
      localStorage.setItem("splashShown", "true"); // mark splash as shown
    }, 2000); // 2 seconds duration

    return () => clearTimeout(timer);
  }, [loading]);

  // App badge real-time logic
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

                  {/* Redirect to role dashboard */}
                  <Route path="/dashboard" element={<Navigate to={`/dashboard/${getRole()}`} replace />} />

                  {/* Role Dashboards */}
                  <Route path="/dashboard/student" element={<PrivateRoute><DashboardLayout userRole="student"><StudentDashboard /></DashboardLayout></PrivateRoute>} />
                  <Route path="/dashboard/tutor" element={<PrivateRoute><DashboardLayout userRole="tutor"><TutorDashboard /></DashboardLayout></PrivateRoute>} />
                  <Route path="/dashboard/staff" element={<PrivateRoute><DashboardLayout userRole="staff"><StaffDashboard /></DashboardLayout></PrivateRoute>} />

                  <Route path="/my-mistakes" element={<DashboardLayout userRole={getRole()}><MyMistakes /></DashboardLayout>} />

                  {/* Authenticated Pages */}
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

                  {/* Catch-all 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>

                {/* BottomBar */}
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
