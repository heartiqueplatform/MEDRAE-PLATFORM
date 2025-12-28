"use client";
import { useLocation } from "react-router-dom";

import { useEffect, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/lib/supabaseClient";
import { GlobalLoader } from "@/components/GlobalLoader";
import { useNavigate } from "react-router-dom";
import { useUser, useSessionContext } from "@supabase/auth-helpers-react";
import { BottomBar } from "@/components/ui/BottomBar";
import { Footer } from "@/components/Footer";
interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: "student" | "tutor" | "staff";
}

export function DashboardLayout({ children, userRole = "student" }: DashboardLayoutProps) {
  const { profile, loading } = useUserProfile();
  const authUser = useUser();
  const navigate = useNavigate();
  const { isLoading } = useSessionContext();
  const location = useLocation();
  const isForum = location.pathname === "/forum";

  // ------------------------------
  // Auth redirect
  // ------------------------------
  useEffect(() => {
    if (!isLoading && !authUser) {
      navigate("/login", { replace: true });
    }
  }, [authUser, isLoading, navigate]);

  // ------------------------------
  // Local storage profile cache
  // ------------------------------
  const [cachedProfile, setCachedProfile] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("userProfile");
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });

  const [streak, setStreak] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return Number(localStorage.getItem("userStreak")) || 0;
    }
    return 0;
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  // ------------------------------
  // Sync profile to localStorage
  // ------------------------------
  useEffect(() => {
    if (profile) {
      localStorage.setItem("userProfile", JSON.stringify(profile));
      setCachedProfile(profile);
    }
  }, [profile]);

  // ------------------------------
  // Theme toggle handler
  // ------------------------------
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle("dark", newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  // ------------------------------
  // Streak Fetch
  // ------------------------------
  useEffect(() => {
    if (authUser?.id) fetchStreak();
  }, [authUser]);

  const fetchStreak = async () => {
    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("login_activity")
      .select("*")
      .eq("user_id", authUser.id)
      .eq("login_date", today)
      .maybeSingle();

    if (!existing) {
      await supabase.from("login_activity").insert([{ user_id: authUser.id, login_date: today }]);
    }

    const { data, error } = await supabase
      .from("login_activity")
      .select("streak")
      .eq("user_id", authUser.id)
      .order("login_date", { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setStreak(data.streak || 0);
      localStorage.setItem("userStreak", String(data.streak || 0));
    }
  };

  if (!cachedProfile && loading) {
    return <GlobalLoader message="Loading profile..." />;
  }

  // Fallback user data
  const userData = cachedProfile || profile;
  const user = userData
    ? {
      name: userData.name || "Unknown User",
      role:
        userData.role ||
        (userRole === "student"
          ? "Nursing Student"
          : userRole === "tutor"
            ? "Clinical Tutor"
            : "Staff Nurse"),
      avatar: userData.avatar_url || "/avatars/default.jpg",
    }
    : authUser
      ? {
        name: authUser.email || "Unknown User",
        role:
          userRole === "student"
            ? "Nursing Student"
            : userRole === "tutor"
              ? "Clinical Tutor"
              : "Staff Nurse",
        avatar: "/avatars/default.jpg",
      }
      : { name: "Offline", role: "Offline", avatar: "/avatars/default.jpg" };

  // ------------------------------
  // FIX: Wrap content in inner component
  // so useSidebar() is inside provider
  // ------------------------------
  return (
    <SidebarProvider>
      <DashboardContent
        user={user}
        userRole={userRole}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        streak={streak}
        isForum={isForum}   // ✅ pass it here
      >
        {children}
      </DashboardContent>
    </SidebarProvider>

  );
}

// -------------------------------------------------------------
// THIS COMPONENT CAN NOW SAFELY USE useSidebar()
// -------------------------------------------------------------
import { useSidebar } from "@/components/ui/sidebar";

function DashboardContent({ user, userRole, streak, isDarkMode, toggleDarkMode, children, isForum }: any) {
  const { isSidebarOpen, toggleSidebar } = useSidebar();


  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">


      <AppSidebar userRole={userRole} className="flex-shrink-0 w-64 md:w-72" />

      <div className="flex flex-col flex-1 overflow-hidden rounded-2xl">


        <Header user={user} isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} streak={streak} />

        <main
          className={`
    flex-1 box-border
    px-0
    py-4
    ${!isForum ? "pb-14" : ""}
    overflow-auto
custom-scrollbar
  `}
        >
          {children}

          {/* Footer spacer — only on non-forum pages */}
          {!isForum && <div className="h-20 shrink-0" />}
        </main>


        {!isSidebarOpen && (
          <BottomBar
            userRole={userRole}
            unreadCount={0}
            unreadAnnouncements={0}
          />

        )}
        <Footer mistakeCount={0} />
      </div>
    </div>
  );
}
