"use client";

import { useEffect, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/lib/supabaseClient";
import { GlobalLoader } from "@/components/GlobalLoader";
import { useNavigate } from "react-router-dom";
import { useUser, useSessionContext } from "@supabase/auth-helpers-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: "student" | "tutor" | "staff";
}

export function DashboardLayout({ children, userRole = "student" }: DashboardLayoutProps) {
  const { profile, loading } = useUserProfile();
  const authUser = useUser();
const navigate = useNavigate();

const { isLoading } = useSessionContext();

useEffect(() => {
  if (!isLoading && !authUser) {
    navigate("/login", { replace: true });
  }
}, [authUser, isLoading, navigate]);

  // ✅ Instant cached profile (if exists)
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

  // ✅ Sync profile into cache when fresh data arrives
  useEffect(() => {
    if (profile) {
      localStorage.setItem("userProfile", JSON.stringify(profile));
      setCachedProfile(profile);
    }
  }, [profile]);

  // ✅ Dark mode apply
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  // ✅ Fetch + cache streak
  useEffect(() => {
    if (authUser?.id) {
      fetchStreak();
    }
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
      await supabase.from("login_activity").insert([
        { user_id: authUser.id, login_date: today },
      ]);
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

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle("dark", newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  // 🚀 Smooth loader logic
  if (!cachedProfile && loading) {
    // Only show loader if no cache exists at all
    return <GlobalLoader message="Loading profile..." />;
  }

  // ✅ Prefer cached first, then profile
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
    : {
        name: "Offline",
        role: "Offline",
        avatar: "/avatars/default.jpg",
      };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar userRole={userRole} />

        <div className="flex-1 flex flex-col">
          <Header
            user={user}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
            streak={streak}
          />

          <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
