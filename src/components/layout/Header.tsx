// Header.tsx - SINGLE SOURCE OF TRUTH using shared profileCache
import { useEffect, useState, useCallback, useRef, memo, useMemo } from "react";
import { useWindowWidth } from "@/hooks/useWindowWidth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Bell, Moon, Sun, User, Menu, RefreshCcw, Share2, Flame, Volume2, VolumeX, VolumeOff, Volume } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSidebar } from "@/components/ui/sidebar";
import { playSound, isSoundMuted, toggleSoundMute } from "@/lib/soundManager";
import AllUsersPopover from "@/components/AllUsersPopover";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import OnlineStatusToast from "@/components/OnlineStatusToast";
import { useToast } from "@/components/ui/use-toast";
import { UserProfileModal } from "@/components/UserProfileModal";
// ✅ Import shared profile cache
import { getProfileCache, setProfileCache, clearProfileCache, PROFILE_CACHE_KEY } from "@/lib/profileCache";

// ✅ CACHE VERSION
const CACHE_VERSION = "v2";
const CACHE_DURATION = 30 * 60 * 1000;
const BACKGROUND_UPDATE_INTERVAL = 5 * 60 * 1000;

// ✅ Cache helpers with versioning
const getCached = (key: string) => {
  try {
    const cached = localStorage.getItem(`${CACHE_VERSION}_${key}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) return data;
    }
  } catch (e) { /* silent */ }
  return null;
};

const setCached = (key: string, data: any) => {
  try {
    localStorage.setItem(`${CACHE_VERSION}_${key}`, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) { /* silent */ }
};

// ✅ Clear old cache
const clearOldCache = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('v1_')) localStorage.removeItem(key);
    });
  } catch (e) { /* silent */ }
};
clearOldCache();

// ✅ PRE-LOAD FUNCTIONS - Runs synchronously before component mount
const preloadUserData = () => {
  try {
    // Check shared profile cache FIRST (most reliable)
    const cached = getProfileCache();
    if (cached && cached.name && cached.name !== "Unknown User") {
      return {
        name: cached.name,
        role: cached.role || "Student",
        avatar: cached.avatar_url || "/avatars/default.jpg",
      };
    }

    // Check legacy cache as fallback
    const cachedUser = localStorage.getItem('supabaseUser');
    if (cachedUser) {
      const parsed = JSON.parse(cachedUser);
      if (parsed.email) {
        return {
          name: parsed.email.split('@')[0] || "Nurse",
          role: "Student",
          avatar: "/avatars/default.jpg",
        };
      }
    }
  } catch (e) { /* silent */ }
  return { name: "Student", role: "Student", avatar: "/avatars/default.jpg" };
};

const preloadStreak = () => {
  try {
    const cached = getCached('user_streak');
    if (cached !== null && cached > 0) return cached;
    const legacy = localStorage.getItem('userStreak');
    if (legacy) {
      const val = parseInt(legacy, 10);
      if (val > 0) return val;
    }
  } catch (e) { /* silent */ }
  return 0;
};

const preloadNotificationCount = () => {
  return getCached('notification_count') || 0;
};

const preloadTotalUsers = () => {
  return getCached('total_users') || null;
};

// ✅ PRE-LOAD THEME - Runs synchronously before component mount
const preloadTheme = () => {
  try {
    // Check localStorage for theme preference
    const darkMode = localStorage.getItem('medrae_dark_mode');
    if (darkMode !== null) {
      return darkMode === 'true';
    }
    // Check system preference as fallback
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch (e) {
    return false;
  }
};

// ✅ MEMOIZED: Streak Widget
const StreakWidget = memo(({ streak, isOnline }: { streak: number; isOnline: boolean }) => {
  if (streak === 0 || !isOnline) return null;
  return (
    <div className="px-3 py-3 mb-2 rounded-lg border-0 bg-orange-50/50 dark:bg-orange-950/20">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-orange-900 shadow-sm border border-orange-100 dark:border-orange-800">
          <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-tight text-orange-600 dark:text-orange-400">Daily Streak</span>
          <span className="text-sm font-bold text-slate-900 dark:text-orange-100">{streak} Day{streak !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
});
StreakWidget.displayName = "StreakWidget";

interface HeaderProps {
  user: { name: string; role: string; avatar?: string };
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  streak?: number;
}

export function Header({ user: propUser, isDarkMode: propIsDarkMode, onToggleDarkMode, streak: propStreak = 0 }: HeaderProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const authUser = useUser();
  const { toggleSidebar } = useSidebar();
  const width = useWindowWidth();
  const isOnline = useOnlineStatus();

  const { onlineUsers, onlineCount, isLoading: onlineLoading, refetch } = useOnlineUsers();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [isMuted, setIsMuted] = useState(isSoundMuted);

  // ✅ NEW: State for settings dropdown open
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ✅ PRE-LOADED THEME - No flicker
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Use prop if provided, otherwise use preloaded theme
    return propIsDarkMode !== undefined ? propIsDarkMode : preloadTheme();
  });

  // ✅ Sync with prop changes
  useEffect(() => {
    if (propIsDarkMode !== undefined && propIsDarkMode !== isDarkMode) {
      setIsDarkMode(propIsDarkMode);
    }
  }, [propIsDarkMode]);

  // ============================================================
  // ✅ SINGLE SOURCE OF TRUTH: User Data from shared cache
  // ALWAYS shows cached data immediately - NO FLICKER
  // ============================================================

  const [user, setUser] = useState(() => {
    // 1. Check propUser first (from DashboardLayout - most reliable)
    if (propUser && propUser.name && propUser.name !== "Unknown User") {
      return propUser;
    }
    // 2. ALWAYS use pre-loaded data from cache (never shows fallback)
    return preloadUserData();
  });

  // ✅ SYNC: When propUser changes, update shared cache
  useEffect(() => {
    if (propUser && propUser.name && propUser.name !== "Unknown User") {
      const currentName = user?.name;
      const propName = propUser.name;

      if (propName !== currentName || propUser.role !== user?.role || propUser.avatar !== user?.avatar) {
        setUser(propUser);
        // ✅ Update shared cache (same as Profile page uses)
        setProfileCache({
          name: propUser.name,
          role: propUser.role,
          avatar_url: propUser.avatar,
        });
        setCached('user_profile', propUser);
      }
    }
  }, [propUser]);

  // ============================================================
  // ✅ Streak - ALWAYS shows cached data immediately
  // ============================================================
  const [streak, setStreak] = useState(() => {
    if (propStreak > 0) return propStreak;
    return preloadStreak();
  });

  // ✅ SYNC: Update streak when props change
  useEffect(() => {
    if (propStreak > 0 && propStreak !== streak) {
      setStreak(propStreak);
      setCached('user_streak', propStreak);
      localStorage.setItem('userStreak', String(propStreak));
    }
  }, [propStreak]);

  // ============================================================
  // ✅ Notifications & Total Users - ALWAYS shows cached data
  // ============================================================
  const [notificationCount, setNotificationCount] = useState(preloadNotificationCount);
  const [totalUsers, setTotalUsers] = useState<number | null>(preloadTotalUsers);

  // ✅ REFS
  const isMounted = useRef(true);
  const backgroundIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================
  // ✅ BACKGROUND UPDATES - Silently update in background
  // ============================================================

  const updateStreakInBackground = useCallback(async () => {
    if (!authUser?.id || !isOnline) return;

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
        if (newStreak !== streak) {
          setStreak(newStreak);
          setCached('user_streak', newStreak);
          localStorage.setItem('userStreak', String(newStreak));

          window.dispatchEvent(new CustomEvent('streak-updated', {
            detail: { streak: newStreak }
          }));
        }
      }
    } catch (err) {
      // Silent fail - keep cached data
    }
  }, [authUser?.id, isOnline, streak]);

  const updateTotalUsersInBackground = useCallback(async () => {
    if (!isOnline) return;

    try {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (!error && count && count !== totalUsers) {
        setTotalUsers(count);
        setCached('total_users', count);
      }
    } catch (err) {
      // Silent fail - keep cached data
    }
  }, [isOnline, totalUsers]);

  const updateNotificationsInBackground = useCallback(async () => {
    if (!authUser?.id || !isOnline) return;

    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", authUser.id)
        .eq("is_read", false);

      if (!error && count !== undefined && count !== notificationCount) {
        setNotificationCount(count);
        setCached('notification_count', count);
      }
    } catch (err) {
      // Silent fail - keep cached data
    }
  }, [authUser?.id, isOnline, notificationCount]);

  // ✅ UPDATED: Uses shared profileCache - SILENT background update
  const updateProfileInBackground = useCallback(async () => {
    if (!authUser?.id || !isOnline) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, role, avatar_url')
        .eq('user_id', authUser.id)
        .single();

      if (!error && data && isMounted.current) {
        const currentName = user?.name;
        const currentRole = user?.role;
        const currentAvatar = user?.avatar;

        const nameChanged = data.name && data.name !== currentName;
        const roleChanged = data.role && data.role !== currentRole;
        const avatarChanged = data.avatar_url && data.avatar_url !== currentAvatar;

        if (nameChanged || roleChanged || avatarChanged) {
          const updatedUser = {
            name: data.name || currentName || "Student",
            role: data.role || currentRole || "Student",
            avatar: data.avatar_url || currentAvatar || "/avatars/default.jpg",
          };

          setUser(updatedUser);
          // ✅ Update shared cache (same as Profile page)
          setProfileCache({
            name: data.name,
            role: data.role,
            avatar_url: data.avatar_url,
          });
          setCached('user_profile', updatedUser);

          // ✅ Dispatch event for other components to sync
          window.dispatchEvent(new CustomEvent('profile-updated', {
            detail: { profile: data }
          }));
        }
      }
    } catch (err) {
      // Silent fail - keep cached data
    }
  }, [authUser?.id, isOnline, user?.name, user?.role, user?.avatar]);

  // ✅ Start background updates - SILENT, no UI disruption
  useEffect(() => {
    if (!isOnline || !authUser?.id) return;

    // Initial background update after 3 seconds
    const initialTimeout = setTimeout(() => {
      if (isMounted.current) {
        updateStreakInBackground();
        updateTotalUsersInBackground();
        updateNotificationsInBackground();
        updateProfileInBackground();
      }
    }, 3000);

    backgroundIntervalRef.current = setInterval(() => {
      if (isMounted.current && isOnline) {
        updateStreakInBackground();
        updateTotalUsersInBackground();
        updateNotificationsInBackground();
        updateProfileInBackground();
      }
    }, BACKGROUND_UPDATE_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      if (backgroundIntervalRef.current) {
        clearInterval(backgroundIntervalRef.current);
      }
    };
  }, [isOnline, authUser?.id, updateStreakInBackground, updateTotalUsersInBackground, updateNotificationsInBackground, updateProfileInBackground]);

  // ============================================================
  // ✅ LAZY FETCH: When user opens settings (force update)
  // ============================================================
  const lazyFetchData = useCallback(async () => {
    if (!authUser?.id || !isMounted.current) return;
    if (!isOnline) return;

    await Promise.all([
      updateStreakInBackground(),
      updateTotalUsersInBackground(),
      updateNotificationsInBackground(),
      updateProfileInBackground(),
    ]);
  }, [authUser?.id, isOnline, updateStreakInBackground, updateTotalUsersInBackground, updateNotificationsInBackground, updateProfileInBackground]);

  // ============================================================
  // ✅ Online users popover - LAZY fetch
  // ============================================================
  const handleOnlinePopoverOpen = useCallback((open: boolean) => {
    setShowOnlineUsers(open);
    if (open && isOnline) {
      const lastFetch = localStorage.getItem('last_online_fetch');
      const now = Date.now();
      if (!lastFetch || (now - parseInt(lastFetch)) > 60000) {
        refetch?.();
        localStorage.setItem('last_online_fetch', String(now));
      }
    }
  }, [isOnline, refetch]);

  // ✅ UPDATED: Handle settings open/close with blur effect
  const handleSettingsOpen = useCallback((open: boolean) => {
    setIsSettingsOpen(open);

    // Toggle body blur when settings opens/closes
    if (open) {
      document.body.classList.add('settings-open');
      // Lazy fetch data when opening
      lazyFetchData();
    } else {
      document.body.classList.remove('settings-open');
    }
  }, [lazyFetchData]);

  // ✅ Cleanup blur on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('settings-open');
    };
  }, []);

  // ✅ Visibility change - refresh in background
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (document.hidden) return;
      if (!isMounted.current || !authUser?.id) return;

      if (visibilityTimeout) clearTimeout(visibilityTimeout);
      visibilityTimeout = setTimeout(() => {
        if (document.hasFocus() && isOnline) {
          updateStreakInBackground();
          updateTotalUsersInBackground();
          updateProfileInBackground();
        }
      }, 2000);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
    };
  }, [authUser?.id, isOnline, updateStreakInBackground, updateTotalUsersInBackground, updateProfileInBackground]);

  // ============================================================
  // ✅ Event listeners (passive)
  // ============================================================
  useEffect(() => {
    const handleStreakUpdate = (event: CustomEvent) => {
      const newStreak = event.detail?.streak;
      if (newStreak !== undefined && newStreak !== streak) {
        setStreak(newStreak);
        setCached('user_streak', newStreak);
        localStorage.setItem('userStreak', String(newStreak));
      }
    };

    const handleProfileUpdate = (event: CustomEvent) => {
      const profile = event.detail?.profile;
      if (profile) {
        const updatedUser = {
          name: profile.name || user?.name || "Student",
          role: profile.role || user?.role || "Student",
          avatar: profile.avatar_url || user?.avatar || "/avatars/default.jpg",
        };
        setUser(updatedUser);
        // ✅ Update shared cache
        setProfileCache({
          name: profile.name,
          role: profile.role,
          avatar_url: profile.avatar_url,
        });
      }
    };

    window.addEventListener('streak-updated', handleStreakUpdate as EventListener);
    window.addEventListener('profile-updated', handleProfileUpdate as EventListener);

    return () => {
      window.removeEventListener('streak-updated', handleStreakUpdate as EventListener);
      window.removeEventListener('profile-updated', handleProfileUpdate as EventListener);
    };
  }, [streak, user]);

  // ✅ Sound mute sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'medrae_sound_muted') {
        setIsMuted(e.newValue ? JSON.parse(e.newValue) : false);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ✅ Cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ============================================================
  // ✅ MEMOIZED: Handlers
  // ============================================================
  const handleReload = useCallback(() => {
    setRotating(true);
    setTimeout(() => window.location.reload(), 300);
  }, []);

  const handleShare = useCallback(() => {
    const shareMessage = `Medrae – The Professional Medical Education & Career Network\n\nJoin us: https://medrae.vercel.app`;
    if (navigator.share) {
      navigator.share({ title: "Medrae Network", text: shareMessage, url: "https://medrae.vercel.app" }).catch(() => { });
    } else {
      navigator.clipboard.writeText(shareMessage);
      toast({ title: "Copied!", description: "Medrae info copied to clipboard!" });
    }
  }, [toast]);

  const handleProfileClick = useCallback(() => {
    navigate("/profile");
  }, [navigate]);

  const handleNotificationsClick = useCallback(() => {
    navigate("/notifications");
  }, [navigate]);

  const handleMuteToggle = useCallback(() => {
    const newMuteState = toggleSoundMute();
    setIsMuted(newMuteState);

    if (!newMuteState) {
      playSound('click', false, 0.2);
    }

    toast({
      title: newMuteState ? "Sound Muted" : "Sound Unmuted",
      description: newMuteState
        ? "All notification sounds are now disabled"
        : "You will now hear notification sounds",
      duration: 2000,
    });
  }, [toast]);

  // ✅ Handle theme toggle - updates both local state and prop callback
  const handleToggleDarkMode = useCallback(() => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('medrae_dark_mode', String(newDarkMode));

    // Apply theme to document
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }

    // Call the prop callback if provided
    if (onToggleDarkMode) {
      onToggleDarkMode();
    }

    // Clear theme cache
    const themeCacheKey = 'theme_cache_v1';
    localStorage.removeItem(themeCacheKey);

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('theme-changed', {
      detail: { isDarkMode: newDarkMode }
    }));
  }, [isDarkMode, onToggleDarkMode]);

  const onlineBadgeText = useMemo(() => {
    const count = onlineUsers.length <= 1 ? 0 : onlineUsers.length - 1;
    return count;
  }, [onlineUsers.length]);

  const getUserInitials = useCallback((name: string) => {
    if (!name || name === "Unknown" || name === "Unknown User") {
      return <User className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }, []);

  const nckMessage = useMemo(() => {
    const month = new Date().getMonth() + 1;
    if (month >= 1 && month <= 4) return "May Series Ahead • Success Awaits💙 ";
    if (month >= 5 && month <= 7) return "August Series Ahead • Success Awaits💙 ";
    if (month >= 8 && month <= 10) return "November Series Ahead • Success Awaits💙 ";
    return "May Series Ahead • Success Awaits💙 ";
  }, []);

  // ============================================================
  //  RENDER - ALWAYS shows cached data immediately
  // No loading state needed - cache is always available
  // ============================================================

  // Determine theme classes based on isDarkMode state
  const themeClasses = isDarkMode
    ? 'bg-slate-900/95 dark:bg-slate-900/95 border-slate-700/30 shadow-[0_2px_20px_rgba(0,0,0,0.3)]'
    : 'bg-white/95 border-white/20 shadow-[0_2px_20px_rgba(0,0,0,0.08)]';
  return (
    <>
      {/* ✅ NEW: Global blur overlay when settings is open */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-[999999] backdrop-blur-sm bg-black/20 transition-all duration-300"
          onClick={() => {
            // Close settings when clicking outside
            setIsSettingsOpen(false);
            document.body.classList.remove('settings-open');
          }}
        />
      )}

      <header className={`
  sticky top-0 z-50 w-full h-16 sm:h-20
  ${themeClasses} backdrop-blur-xl
  border-b border-slate-200/20 dark:border-slate-700/30
  flex items-center justify-between xl:justify-evenly
  px-4 sm:px-8
  text-base sm:text-lg
  transition-all duration-300 ease-in-out
`}>
        {/* Mobile Logo */}
        <div className="flex items-center gap-2 md:hidden shrink-0">  {/* 👈 Increased gap from 1.5 to 2 */}
          <div className="text-xl sm:text-xl font-black tracking-tight leading-none">  {/* 👈 Increased text size */}
            <span className="text-red-500">Medrae</span>{' '}
            <span className="text-gray-900 dark:text-white">Nursing</span>
          </div>
        </div>
        <OnlineStatusToast />

        <div className="flex items-center flex-1">
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex flex-col items-center justify-center px-3 py-1 rounded-md active:scale-95 transition"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[11px] font-medium mt-0.5">Menu</span>
          </button>

          <div className="hidden xl:flex xl:justify-center xl:max-w-[500px]">
            <div className="text-center px-4 py-2">
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                {nckMessage}
              </p>
            </div>
          </div>

          {/* ACTION GROUP */}
          <div className="flex items-center ml-auto gap-2 sm:gap-4">

            {/* 1. Online Users Section */}
            <div className="hidden sm:flex items-center gap-1 sm:gap-2">
              <AllUsersPopover totalUsers={totalUsers} />

              <Popover open={showOnlineUsers} onOpenChange={handleOnlinePopoverOpen}>
                <PopoverTrigger asChild>
                  <div className="flex items-center shrink-0 cursor-pointer select-none">
                    <Badge className="h-5 sm:h-6 px-1.5 sm:px-2 text-[9px] sm:text-[10px] bg-green-500 hover:bg-green-600 text-white border-none flex items-center gap-1.5 transition-all rounded-full shadow-sm shrink-0">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                      </span>
                      <span className="font-black leading-none flex items-center">
                        {onlineBadgeText > 0 ? onlineBadgeText : ''}
                        <span className="hidden lg:inline ml-0.5 tracking-tighter">Online</span>
                      </span>
                    </Badge>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-72 max-h-96 overflow-y-auto custom-scrollbar p-2 bg-card">
                  <>
                    <h4 className="font-semibold text-sm mb-2">Online Users</h4>
                    {onlineLoading ? (
                      <div className="text-center py-4">
                        <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
                        <p className="text-xs text-gray-400 mt-2">Loading...</p>
                      </div>
                    ) : onlineUsers.length > 0 ? (
                      <ul className="space-y-2 text-sm">
                        {onlineUsers.map((u) => (
                          <li
                            key={u.user_id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded"
                            onClick={() => { setSelectedUserId(u.user_id); setShowOnlineUsers(false); }}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={u.avatar_url} loading="lazy" />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {u.name?.split(" ").map((n: string) => n[0]).join("") || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 truncate text-sm">
                              <div className="font-medium">{u.name}</div>
                              <div className="text-xs text-muted-foreground">{u.role}</div>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block flex-shrink-0 animate-pulse" />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-gray-500 text-xs">Medrae Nursing</p>
                        <p className="text-gray-400 text-[10px] mt-2">Invite friends to see them here!</p>
                      </div>
                    )}
                  </>
                </PopoverContent>
              </Popover>
            </div>

            {/* 2. ✅ CHALLENGE BUTTON - COMPLETELY REMOVED */}

            {/* 3. Refresh Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReload}
              className={`hidden md:flex h-9 w-9 sm:h-11 sm:w-11 rounded-full transition-all duration-300 hover:bg-transparent active:scale-95 shrink-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none border-0 ${rotating ? 'animate-spin' : ''}`}
              title="Refresh App"
              aria-label="Refresh"
            >
              <RefreshCcw className="w-7 h-7 sm:w-8 sm:h-8 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" />
            </Button>
            {/* 3. NOTIFICATIONS BUTTON - NEW! Beside Settings */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNotificationsClick}
              className="relative h-9 w-9 sm:h-11 sm:w-11 rounded-full transition-all duration-300 hover:bg-transparent active:scale-95 shrink-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none data-[state=open]:ring-0 data-[state=open]:outline-none border-0"
              aria-label="Notifications"
            >
              <Bell className="w-7 h-7 sm:w-8 sm:h-8 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white dark:border-slate-950"></span>
                </span>
              )}
            </Button>
            {/* 4. Settings Dropdown - NOW USING settings.png INSTEAD OF CogIcon */}
            <DropdownMenu onOpenChange={handleSettingsOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 sm:h-11 sm:w-11 rounded-full transition-all duration-300 hover:bg-transparent active:scale-95 shrink-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none data-[state=open]:ring-0 data-[state=open]:outline-none border-0 group"
                  aria-label="Settings"
                >
                  <img
                    src="/setting.png"
                    alt="Settings"
                    className="w-7 h-7 sm:w-8 sm:h-8 object-contain transition-transform duration-500 group-hover:rotate-90"
                  />
                  {notificationCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white dark:border-slate-950"></span>
                    </span>
                  )}
                  {isMuted && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 border-2 border-white dark:border-slate-950 animate-pulse">
                      <VolumeOff className="h-2 w-2 text-white" />
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                collisionPadding={10}
                className="w-[calc(100vw-20px)] sm:w-80 sm:max-w-[420px] p-4 mt-2 rounded-xl border-0 bg-white dark:bg-muted/100 z-[100]"
              >
                <StreakWidget streak={streak} isOnline={isOnline} />

                {/* Sound Control */}
                <div className="mb-4 px-1">
                  <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-xl transition-all duration-300 ${isMuted
                    ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border border-red-200 dark:border-red-800/50'
                    : 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200 dark:border-emerald-800/50'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl transition-all ${isMuted
                        ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
                        : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                        }`}>
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                          {isMuted ? (
                            <>
                              <VolumeOff className="w-4 h-4 text-red-500" />
                              Sound Muted
                            </>
                          ) : (
                            <>
                              <Volume className="w-4 h-4 text-emerald-500" />
                              Sound Enabled
                            </>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {isMuted ? "All notifications are silent" : "You'll hear notification sounds"}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={handleMuteToggle}
                      variant={isMuted ? "destructive" : "default"}
                      size="sm"
                      className={`rounded-full px-6 h-10 text-xs font-bold transition-all shadow-sm hover:shadow-md w-full sm:w-auto ${isMuted
                        ? 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white'
                        : 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white'
                        }`}
                    >
                      {isMuted ? (
                        <>
                          <Volume className="w-4 h-4 mr-2" />
                          Unmute
                        </>
                      ) : (
                        <>
                          <VolumeOff className="w-4 h-4 mr-2" />
                          Mute
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <DropdownMenuItem onClick={handleShare} className="flex items-center gap-3 py-3 px-3 cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:bg-slate-50 dark:focus:bg-slate-800/50">
                  <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Invite Colleagues</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate("/share")} className="flex items-center gap-3 py-3 px-3 cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:bg-slate-50 dark:focus:bg-slate-800/50">
                  <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Invite a Friend</span>
                    <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60 font-medium">Share with friends</span>
                  </div>
                  <Badge className="ml-auto h-5 px-2 bg-gradient-to-r from-blue-500 to-blue-600 text-[9px] font-bold text-white border-none rounded-full">Quick</Badge>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleToggleDarkMode} className="flex items-center justify-between py-3 px-3 cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:bg-slate-50 dark:focus:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-slate-100 text-slate-600'}`}>
                      {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {isDarkMode ? "Light Mode" : "Dark Mode"}
                    </span>
                  </div>
                  <div className="w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded-full relative">
                    <div className={`absolute top-1 w-2 h-2 rounded-full transition-all duration-200 ${isDarkMode ? 'right-1 bg-amber-400' : 'left-1 bg-slate-400'
                      }`} />
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

                <DropdownMenuItem onClick={handleReload} className="flex items-center gap-3 py-3 px-3 cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:bg-slate-50 dark:focus:bg-slate-800/50">
                  <div className={`p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 ${rotating ? "animate-spin" : ""}`}>
                    <RefreshCcw className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">System Update</span>
                    <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60 font-medium">Refresh platform content</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* User Info - ALWAYS shows cached data immediately */}
          <div className="flex items-center ml-4 sm:ml-6 gap-2 cursor-pointer active:scale-98 transition-transform" onClick={handleProfileClick}>
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium flex items-center gap-2 truncate max-w-[120px] sm:max-w-[150px]">
                {user?.name && user.name !== "Unknown" && user.name !== "Unknown User"
                  ? user.name.split(" ")[0]
                  : (isOnline ? "Student" : "Offline")}
                {streak > 0 && isOnline && (
                  <Badge variant="secondary" className={`text-[10px] sm:text-xs ${streak <= 7 ? "bg-red-700 text-white" :
                    streak <= 30 ? "bg-purple-800 text-white" :
                      "bg-gray-900 text-white"
                    }`}>
                    🔥 {streak}d
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {user?.role && user.role !== "Unknown" ? user.role : (isOnline ? "Student" : "Offline")}
              </p>
            </div>
            <div className="relative">
              <Avatar className="h-9 w-9 sm:h-12 sm:w-12 rounded-full border-2 border-pink-300 shadow-sm">
                <AvatarImage
                  src={user?.avatar && isOnline ? user.avatar : undefined}
                  className="object-cover"
                  loading="lazy"
                />
                <AvatarFallback className="bg-primary text-primary-foreground flex items-center justify-center text-[10px] sm:text-xs">
                  {isOnline ? (
                    user?.name && user.name !== "Unknown" && user.name !== "Unknown User"
                      ? getUserInitials(user.name)
                      : <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <span className={`absolute top-0 right-0 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-white ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"
                }`} title={isOnline ? "Online" : "Offline"} />
            </div>
          </div>
        </div>
      </header>

      {selectedUserId && <UserProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </>
  );
}