"use client";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { supabase } from "./lib/supabaseClient";
import { MedraeQuizzes } from "@/pages/MedraeQuizzes";
import Feed from "./pages/Feed";
import { BottomBar } from "@/components/ui/BottomBar";
import { SidebarProvider } from "@/components/ui/sidebar";

// Pages
import { Forum } from "./pages/Forum";
import AssessmentNotes from "./pages/AssessmentNotes";
import QuizPage from "./pages/QuizPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { AIAssistant } from "./pages/AIAssistant";
import { Chat } from "./pages/Chat";
import { Calendar } from "./pages/Calendar";
import { StudyProgress } from "./pages/Progress";
import { Resources } from "./pages/Resources";
import { MedTube } from "./pages/MedTube";
import { Reels } from "./pages/Reels";
import { Announcements } from "./pages/Announcements";
import { Feedback } from "./pages/Feedback";
import { Settings } from "./pages/Settings";
import { Subscription } from "./pages/Subscription";
import { Notifications } from "./pages/Notifications";
import { Profile } from "./pages/Profile";
import { QuizUnits } from "./pages/QuizUnits";
import { QuizTaking } from "./pages/QuizTaking";
import { RedirectToRoleDashboard } from "./pages/RedirectToRoleDashboard";
import { useEffect, useState } from "react";
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
  // 🚀 Redirect wrapper so logged-in users never see Index page
  const RootRedirect = () => {
    const navigate = useNavigate();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
      const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate("/redirect", { replace: true });
        }
        setChecking(false);
      };
      checkSession();
    }, []);

    if (checking) return null; // prevent flash

    return <Index />;
  };

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem("splashShown");
    if (alreadyShown) {
      setLoading(false);
      return;
    }
    sessionStorage.setItem("splashShown", "true");
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <SplashScreen />;

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
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/redirect" element={<RedirectToRoleDashboard />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* Redirect to role dashboard */}
                  <Route path="/dashboard" element={<Navigate to={`/dashboard/${getRole()}`} replace />} />

                  {/* Role Dashboards */}
                  <Route path="/dashboard/student" element={<DashboardLayout userRole="student"><StudentDashboard /></DashboardLayout>} />
                  <Route path="/dashboard/tutor" element={<DashboardLayout userRole="tutor"><TutorDashboard /></DashboardLayout>} />
                  <Route path="/dashboard/staff" element={<DashboardLayout userRole="staff"><StaffDashboard /></DashboardLayout>} />

                  {/* Authenticated Pages */}
                  <Route path="/ai-assistant" element={<DashboardLayout userRole={getRole()}><AIAssistant /></DashboardLayout>} />
                  <Route path="/chat" element={<DashboardLayout userRole={getRole()}><Chat /></DashboardLayout>} />
                  <Route path="/calendar" element={<DashboardLayout userRole={getRole()}><Calendar /></DashboardLayout>} />
                  <Route path="/progress" element={<DashboardLayout userRole={getRole()}><StudyProgress /></DashboardLayout>} />
                  <Route path="/resources" element={<DashboardLayout userRole={getRole()}><Resources /></DashboardLayout>} />
                  <Route path="/medtube" element={<DashboardLayout userRole={getRole()}><MedTube /></DashboardLayout>} />
                  <Route path="/reels" element={<DashboardLayout userRole={getRole()}><Reels /></DashboardLayout>} />
                  <Route path="/announcements" element={<DashboardLayout userRole={getRole()}><Announcements /></DashboardLayout>} />
                  <Route path="/feedback" element={<DashboardLayout userRole={getRole()}><Feedback /></DashboardLayout>} />
                  <Route path="/settings" element={<DashboardLayout userRole={getRole()}><Settings /></DashboardLayout>} />
                  <Route path="/subscription" element={<DashboardLayout userRole={getRole()}><Subscription /></DashboardLayout>} />
                  <Route path="/notifications" element={<DashboardLayout userRole={getRole()}><Notifications /></DashboardLayout>} />
                  <Route path="/profile" element={<DashboardLayout userRole={getRole()}><Profile /></DashboardLayout>} />
                  <Route path="/quiz-units/:subject" element={<DashboardLayout userRole={getRole()}><QuizUnits /></DashboardLayout>} />
                  <Route path="/quiz/:subject/:unitId/:paperId" element={<DashboardLayout userRole={getRole()}><QuizTaking /></DashboardLayout>} />
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
