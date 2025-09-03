import { useEffect, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { GlobalLoader } from "@/components/GlobalLoader"; // adjust path if needed
import { useName, useEmail, useTheme, useLanguage, useNotificationsEnabled } from "@/utils/storageManager";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: 'student' | 'tutor' | 'staff';
}

export function DashboardLayout({ children, userRole = 'student' }: DashboardLayoutProps) {
  const { profile, loading } = useUserProfile();
  const [name, setName] = useName();
const [email, setEmail] = useEmail();
const [theme, setTheme] = useTheme();
const [language, setLanguage] = useLanguage();
const [notifications, setNotifications] = useNotificationsEnabled();

  const authUser = useUser();
   
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  const [streak, setStreak] = useState<number>(0);

  // Apply dark mode class on mount
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // ✅ Fetch streak from Supabase (same as Header)
  useEffect(() => {
    if (authUser?.id) {
      fetchStreak();
    }
  }, [authUser]);

  const fetchStreak = async () => {
    const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd

    // Ensure today's login is recorded
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

    // Fetch latest streak
    const { data, error } = await supabase
      .from("login_activity")
      .select("streak")
      .eq("user_id", authUser.id)
      .order("login_date", { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setStreak(data.streak || 0);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle("dark", newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

if (loading) {
  return <GlobalLoader message="Loading profile..." />;
}


const user = profile
  ? {
      name: profile.name || "Unknown User",
      role: profile.role || (userRole === 'student' ? 'Nursing Student' : userRole === 'tutor' ? 'Clinical Tutor' : 'Staff Nurse'),
      avatar: profile.avatar_url || '/avatars/default.jpg',
    }
  : authUser
  ? {
      name: authUser.email || "Unknown User",
      role: userRole === 'student' ? 'Nursing Student' : userRole === 'tutor' ? 'Clinical Tutor' : 'Staff Nurse',
      avatar: '/avatars/default.jpg',
    }
  : {
      name: "Offline",
      role: "Offline",
      avatar: '/avatars/default.jpg',
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
            streak={streak} // ✅ now consistent with DB
          />

          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
