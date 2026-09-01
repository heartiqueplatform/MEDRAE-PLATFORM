"use client";
import { useLocation, useNavigate } from "react-router-dom";
import { MusicPlayerProvider } from "@/components/MusicPlayerProvider";
import { MusicPlayer } from "@/components/MusicPlayer";
import { Toaster } from "@/components/ui/toaster";
import { Outlet } from "react-router-dom";
import { MedicalDoodles } from "@/components/MedicalDoodles";
import { useEffect, useState, useRef, useCallback, memo, lazy, Suspense } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/lib/supabaseClient";
import { useUser, useSessionContext } from "@supabase/auth-helpers-react";
import { BottomBar } from "@/components/ui/BottomBar";
import { Footer } from "@/components/Footer";
import { useSidebar } from "@/components/ui/sidebar";
import { useUserRole } from "@/context/UserRoleContext";
// ✅ Import shared profile cache
import { getProfileCache, setProfileCache } from "@/lib/profileCache";
import { FloatingChatButton } from "../FloatingChatButton";

// ✅ Lazy load heavy components
const FloatingChat = lazy(() => import("@/components/FloatingChat"));

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: "student" | "tutor" | "staff";
}

// ✅ Cache keys with 24-hour duration
const STREAK_CACHE_KEY = "dashboard_streak_cache";
const STREAK_DATE_KEY = "dashboard_streak_date";
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Cache helpers
const getCachedStreak = (): { streak: number; date: string } | null => {
  try {
    const cachedStreak = localStorage.getItem(STREAK_CACHE_KEY);
    const cachedDate = localStorage.getItem(STREAK_DATE_KEY);
    if (cachedStreak && cachedDate) {
      const streak = JSON.parse(cachedStreak);
      const date = cachedDate;
      const today = new Date().toISOString().split("T")[0];
      if (date === today) {
        return { streak: streak.data, date };
      }
    }
  } catch (e) { }
  return null;
};

const setCachedStreak = (streak: number) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem(STREAK_CACHE_KEY, JSON.stringify({ data: streak, timestamp: Date.now() }));
    localStorage.setItem(STREAK_DATE_KEY, today);
  } catch (e) { }
};

let streakFetchInProgress = false;
let lastStreakFetchTime = 0;
const MIN_STREAK_FETCH_INTERVAL = 60 * 60 * 1000;

// -------------------------------------------------------------
// RightPanel Component
// -------------------------------------------------------------
const RightPanel = memo(({ userId }: { userId: string }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto hide-scrollbar space-y-4 w-[400px] -mt-2 p-0">
        <Suspense fallback={
          <div className="flex items-center justify-center p-4">
            <div className="animate-pulse text-gray-400">Loading chat...</div>
          </div>
        }>
          <FloatingChat currentUserId={userId} />
        </Suspense>
      </div>
    </div>
  );
});

RightPanel.displayName = "RightPanel";

// -------------------------------------------------------------
// DashboardContent Component
// -------------------------------------------------------------
const DashboardContent = memo(({ user, role, streak, isDarkMode, toggleDarkMode, children, isForum, userId }: any) => {
  const location = useLocation();
  const isFeed = location.pathname === "/feed";
  const disabledPages = ["/login", "/register", "/simulation/candidate", "/quiz-simulation/instructions"];
  const showMusic = !disabledPages.includes(location.pathname);
  const { isSidebarOpen } = useSidebar();

  // ✅ Track if loader was already hidden (prevents duplicate calls)
  const loaderHiddenRef = useRef(false);

  // ✅ THE ONLY PLACE THAT HIDES THE LOADER - INSTANTLY when Dashboard is ready
  useEffect(() => {
    // Only hide when:
    // 1. Not hidden yet
    // 2. User exists
    // 3. User has a valid name (not "Unknown User")
    if (!loaderHiddenRef.current && user && user.name && user.name !== "Unknown User") {
      // Mark as hidden immediately to prevent duplicate calls
      loaderHiddenRef.current = true;

      // 🚀 Hide instantly - NO DELAY!
      if (typeof (window as any).hideMedraeLoader === 'function') {
        (window as any).hideMedraeLoader();
      }
    }
  }, [user]);

  return (
    <div className="fixed inset-0 flex h-[100dvh] w-full overflow-hidden bg-background selection:bg-primary/30">
      <MedicalDoodles className="-z-10 pointer-events-none" />

      <div className="relative z-10 flex w-full h-full">
        <AppSidebar userRole={role} className="flex-shrink-0 w-64 md:w-72" />

        <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
          <Header user={user} isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} streak={streak} />

          <main
            data-scroll-container
            className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar outline-none"
          >
            <div className="flex flex-col min-h-full">
              <div className="flex-1 pt-4 px-0">
                <Outlet />
                {!isForum && !isFeed && <div className="h-4" />}
              </div>
              <Footer mistakeCount={0} />
              <div className="h-20 md:hidden shrink-0" />
            </div>
          </main>

          {!isSidebarOpen && (
            <div className="fixed bottom-0 left-0 right-0 z-50 md:relative bg-background/80 backdrop-blur-lg border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
              <BottomBar userRole={role} unreadCount={0} unreadAnnouncements={0} />
            </div>
          )}

          <Toaster />

          {showMusic && (
            <Suspense fallback={null}>
              <MusicPlayer />
            </Suspense>
          )}
        </div>
      </div>

      <FloatingChatButton userId={userId || user?.id} />
    </div>
  );
});

DashboardContent.displayName = "DashboardContent";

// -------------------------------------------------------------
// Main DashboardLayout Component - Uses shared profileCache
// -------------------------------------------------------------
export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const { role: contextRole, refreshRole } = useUserRole();
  const { profile, loading } = useUserProfile();
  const authUser = useUser();
  const navigate = useNavigate();
  const { isLoading } = useSessionContext();
  const location = useLocation();
  const isForum = location.pathname === "/forum";

  // ------------------------------
  // ⚡️ INSTANT DATA: Use shared profileCache immediately
  // ------------------------------

  // ✅ Get user from shared cache (same as Profile page)
  const cachedProfile = getProfileCache();

  // ✅ Instant role from localStorage
  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("last_known_role");
      return cached || "student";
    }
    return "student";
  });

  // ✅ Instant streak from 24-hour cache
  const [streak, setStreak] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const cached = getCachedStreak();
      if (cached !== null) return cached.streak;
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

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ------------------------------
  // ✅ SYNC: When profile updates, update shared cache
  // ------------------------------
  useEffect(() => {
    if (!authUser?.id) return;

    const userData = profile || cachedProfile;
    if (userData && userData.name && userData.name !== "Unknown User") {
      // ✅ Update shared cache (same as Profile page)
      setProfileCache({
        name: userData.name,
        role: userData.role || "Student",
        avatar_url: userData.avatar_url || "/avatars/default.jpg",
      });

      // Also update localStorage for backward compatibility
      localStorage.setItem('userProfile', JSON.stringify({
        name: userData.name,
        role: userData.role,
        avatar_url: userData.avatar_url,
      }));
    }
  }, [authUser?.id, profile, cachedProfile]);

  // ------------------------------
  // ⚡️ SILENT ROLE VERIFICATION (background - no UI delay)
  // ------------------------------
  useEffect(() => {
    const verifyRoleSilently = async () => {
      if (!authUser?.id) return;

      try {
        // Use cached role immediately
        const cachedRole = localStorage.getItem(`userRole_${authUser.id}`);
        if (cachedRole && cachedRole !== userRole) {
          setUserRole(cachedRole);
          localStorage.setItem("last_known_role", cachedRole);
        }

        // 🔄 Background check - doesn't block UI
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", authUser.id)
          .single();

        if (!error && profileData?.role && profileData.role !== userRole) {
          setUserRole(profileData.role);
          localStorage.setItem(`userRole_${authUser.id}`, profileData.role);
          localStorage.setItem("last_known_role", profileData.role);

          // ✅ Update shared cache with role
          const currentCache = getProfileCache();
          if (currentCache) {
            setProfileCache({
              ...currentCache,
              role: profileData.role,
            });
          }

          localStorage.setItem("userProfile", JSON.stringify({ ...cachedProfile, role: profileData.role }));
          await refreshRole();
        }
      } catch (error) {
        // Silent fail - use cached role
      }
    };

    verifyRoleSilently();
  }, [authUser?.id]);

  // ------------------------------
  // Theme Sync
  // ------------------------------
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  // ------------------------------
  // ⚡️ OPTIMIZED Streak - 24-hour cache
  // ------------------------------
  const fetchStreak = useCallback(async () => {
    if (!authUser?.id || !isMounted.current) return;

    const cached = getCachedStreak();
    if (cached !== null) return;

    const now = Date.now();
    if (now - lastStreakFetchTime < MIN_STREAK_FETCH_INTERVAL) return;
    if (streakFetchInProgress) return;

    streakFetchInProgress = true;
    lastStreakFetchTime = now;

    try {
      const today = new Date().toISOString().split("T")[0];

      const { data: existing } = await supabase
        .from("login_activity")
        .select("id")
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
        .maybeSingle();

      if (!error && data && isMounted.current) {
        const newStreak = data.streak || 0;
        setStreak(newStreak);
        localStorage.setItem("userStreak", String(newStreak));
        setCachedStreak(newStreak);
      }
    } catch (err) {
      console.error("Error fetching streak:", err);
    } finally {
      streakFetchInProgress = false;
    }
  }, [authUser?.id]);

  useEffect(() => {
    if (authUser?.id && isMounted.current) {
      const cached = getCachedStreak();
      if (cached === null) {
        fetchStreak();
      }
    }
  }, [authUser?.id, fetchStreak]);

  // Visibility change handler
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;
    const handleVisibilityChange = () => {
      if (!document.hidden && authUser?.id && isMounted.current) {
        const cached = getCachedStreak();
        if (cached === null) {
          if (visibilityTimeout) clearTimeout(visibilityTimeout);
          visibilityTimeout = setTimeout(() => {
            fetchStreak();
          }, 1000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
    };
  }, [authUser?.id, fetchStreak]);

  // ==============================================================
  // ✅ BUILD USER FROM SHARED CACHE (SAME AS PROFILE PAGE)
  // ==============================================================

  // Get cached user from localStorage (works offline!)
  const cachedUser = (() => {
    try {
      const stored = localStorage.getItem('supabaseUser');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  })();

  // ✅ BUILD USER OBJECT FROM SHARED CACHE FIRST
  const buildUser = () => {
    // 1. Try shared profile cache first (same as Profile page)
    const sharedCache = getProfileCache();
    if (sharedCache && sharedCache.name && sharedCache.name !== "Unknown User") {
      return {
        name: sharedCache.name,
        role: sharedCache.role || userRole || "Student",
        avatar: sharedCache.avatar_url || "/avatars/default.jpg",
        id: authUser?.id || cachedUser?.id || 'cached-user',
      };
    }

    // 2. Try profile from hook
    if (profile && profile.name && profile.name !== "Unknown User") {
      return {
        name: profile.name,
        role: profile.role || userRole || "Student",
        avatar: profile.avatar_url || "/avatars/default.jpg",
        id: authUser?.id || cachedUser?.id || 'cached-user',
      };
    }

    // 3. Try cached profile from localStorage
    if (cachedProfile && cachedProfile.name && cachedProfile.name !== "Unknown User") {
      return {
        name: cachedProfile.name,
        role: cachedProfile.role || userRole || "Student",
        avatar: cachedProfile.avatar_url || "/avatars/default.jpg",
        id: authUser?.id || cachedUser?.id || 'cached-user',
      };
    }

    // 4. Try supabaseUser as fallback
    if (cachedUser) {
      return {
        name: cachedUser.email?.split('@')[0] || "Nurse",
        role: userRole || "Student",
        avatar: "/avatars/default.jpg",
        id: cachedUser.id,
      };
    }

    return null;
  };

  const user = buildUser();

  // ✅ RULE 1: If we have ANY user data, SHOW DASHBOARD
  if (user) {
    return (
      <SidebarProvider>
        <MusicPlayerProvider>
          <DashboardContent
            user={user}
            role={userRole || "student"}
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
            streak={streak}
            isForum={isForum}
            userId={user.id}
          >
            {children}
          </DashboardContent>
        </MusicPlayerProvider>
      </SidebarProvider>
    );
  }

  // ✅ RULE 2: If NO user data exists, redirect
  if (!authUser && !cachedUser) {
    navigate("/login", { replace: true });
    return null;
  }

  // ✅ RULE 3: If still loading and no cached data, keep loader visible
  if (isLoading) {
    return null;
  }

  // Fallback redirect
  if (!authUser) {
    navigate("/login", { replace: true });
    return null;
  }

  // ✅ RULE 4: Fallback render
  const fallbackUser = {
    name: authUser?.email?.split('@')[0] || "Nurse",
    role: userRole || "Student",
    avatar: "/avatars/default.jpg",
    id: authUser?.id || 'unknown',
  };

  return (
    <SidebarProvider>
      <MusicPlayerProvider>
        <DashboardContent
          user={fallbackUser}
          role={userRole || "student"}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          streak={streak}
          isForum={isForum}
          userId={fallbackUser.id}
        >
          {children}
        </DashboardContent>
      </MusicPlayerProvider>
    </SidebarProvider>
  );
}