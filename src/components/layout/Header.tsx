import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { useWindowWidth } from "@/hooks/useWindowWidth"; // <-- add this

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // add this
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Bell, Moon, Sun, User, Menu, RefreshCcw, MoreVertical, Swords, Share2, Flame, LayoutGrid, Settings2, Star, CogIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSidebar } from "@/components/ui/sidebar";
import { playSound } from "@/lib/soundManager";
import AllUsersPopover from "@/components/AllUsersPopover";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import OnlineStatusToast from "@/components/OnlineStatusToast";
import { useToast } from "@/components/ui/use-toast";

import { UserProfileModal } from "@/components/UserProfileModal";
interface HeaderProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  streak?: number; // optional
}

export function Header({
  user,
  isDarkMode,
  onToggleDarkMode,
  streak: propStreak = 0,
}: HeaderProps) {

  const { toast } = useToast();

  const streakSound = typeof Audio !== "undefined" ? new Audio("/sounds/Toast.mp3") : null;

  const navigate = useNavigate();
  const authUser = useUser();
  const { toggleSidebar } = useSidebar();
  // Get all users + online users
  const { users: allUsers, onlineUsers } = useOnlineUsers();
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const width = useWindowWidth(); // get the current window width
  const isCompact = width < 480;   // true if screen is narrow (you can adjust 480px)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [streak, setStreak] = useState(propStreak);
  const isOnline = useOnlineStatus();
  const [notificationCount, setNotificationCount] = useState(0);
  const [rotating, setRotating] = useState(false);
  const [totalUsers, setTotalUsers] = useState<number | null>(() => {
    const stored = localStorage.getItem("totalUsers");
    return stored ? parseInt(stored) : null;
  });


  const [previousOnline, setPreviousOnline] = useState<boolean | null>(null);

  useEffect(() => {
    if (authUser?.id) {
      fetchStreak();
      fetchNotifications();
      fetchTotalUsers();

    }
  }, [authUser]);

  // fetch unread notifications
  const fetchNotifications = async () => {
    if (!authUser?.id) return;

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", authUser.id)
      .eq("is_read", false);

    if (!error && typeof count === "number") {
      setNotificationCount(count);
    }
  };
  const fetchTotalUsers = async () => {
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (!error && typeof count === "number") {
      setTotalUsers(count);
      localStorage.setItem("totalUsers", count.toString()); // cache it
    }
  };

  // realtime notifications
  useEffect(() => {
    if (!authUser?.id) return;

    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${authUser.id}`,
        },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser?.id]);

  // streak fetcher
  const fetchStreak = async () => {
    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("login_activity")
      .select("*")
      .eq("user_id", authUser.id)
      .eq("login_date", today)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from("login_activity")
        .insert([{ user_id: authUser.id, login_date: today }]);
    }

    const { data, error } = await supabase
      .from("login_activity")
      .select("streak")
      .eq("user_id", authUser.id)
      .order("login_date", { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      const newStreak = data.streak || 0;

      //  Trigger confetti on milestones
      if (newStreak > streak && [1, 7, 15, 30, 50, 100, 150, 200].includes(newStreak)) {
        // 🎉 Confetti
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#e11d48", "#22c55e"],
        });
        // Play sound
        playSound("toast-sound");

        //  Toast message with more detailed description
        toast({
          title: `🔥 ${newStreak}-day streak!`,
          description: `Amazing! You've kept your streak going for ${newStreak} days. Keep up the dedication and momentum! 🎉`,
        });
      }



      setStreak(newStreak);
      const today = new Date().toISOString().split("T")[0];
      const lastPlayed = localStorage.getItem("streakSoundDate");

      if (lastPlayed !== today) {
        if (streakSound) streakSound.play().catch(() => { });
        localStorage.setItem("streakSoundDate", today);
      }


    }
  };

  // smart reload function: clears cache and reloads
  const handleReload = async () => {
    setRotating(true); // start rotation
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
    setTimeout(() => {
      window.location.reload();
    }, 300); // small delay to see rotation
  };


  return (
    <>
      <header className="h-14 sm:h-16 bg- border-0 flex items-center justify-between xl:justify-evenly px-3 sm:px-6 sticky top-0 z-40 backdrop-blur-sm bg-background text-sm sm:text-base">

        {/* App Logo and Name - Mobile Only */}
        {/* App Logo and Name - Mobile Only */}
        <div className="flex items-center gap-2 md:hidden shrink-0">
          <img
            src="/pwa-192x192.jpeg"
            alt="Medrae Logo"
            className="h-8 w-8 rounded-lg object-cover"
          />
          <div className="text-lg font-black tracking-widest flex items-center gap-2">
            {/* MEDRAE - RED 3D */}
            <span className="text-red-500 [text-shadow:0px_0px_0px_#7f1d1d,0px_0px_0px_#450a0a,3px_3px_2px_rgba(0,0,0,0.3)]">
              MEDRAE
            </span>

            {/* NURSING - BLACK 3D */}
            <span className="text-gray-900 dark:text-white [text-shadow:1px_1px_0px_#374151,1px_1px_0px_#111827,3px_3px_2px_rgba(0,0,0,0.3)]">
              NURSING
            </span>
          </div>
        </div>
        <OnlineStatusToast />

        <div className="flex items-center flex-1">

          {/* Desktop Sidebar Toggle */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex flex-col items-center justify-center px-3 py-1 rounded-md  active:scale-95 transition"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[11px] font-medium mt-0.5">Menu</span>
          </button>
          {/* Center scrolling text */}
          <div className="hidden md:flex md:justify-center md:max-w-[400px] overflow-hidden">
            <div className="whitespace-nowrap animate-marquee text-base font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-clip-text text-transparent">
              🌟 Advancing nursing education and student success.🌟
            </div>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <AllUsersPopover totalUsers={totalUsers} />


            <Popover open={showOnlineUsers} onOpenChange={setShowOnlineUsers}>
              <PopoverTrigger asChild>
                <div className="flex items-center shrink-0 cursor-pointer select-none">
                  <Badge
                    className="h-4 sm:h-5 px-1.5 sm:px-2 text-[9px] sm:text-[10px] bg-green-500 hover:bg-green-600 text-white border-none flex items-center gap-2 transition-all rounded-full shadow-sm shrink-0"
                  >
                    {/* Pulsing Dot */}
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                    </span>

                    {/* Number + Label */}
                    <span className="font-black leading-none flex items-center">
                      {onlineUsers.length}
                      <span className="hidden lg:inline ml-1 tracking-tighter">ONLINE</span>
                    </span>
                  </Badge>
                </div>
              </PopoverTrigger>

              {/* Popover content logic remains the same... */}


              <PopoverContent className="w-72 max-h-80 overflow-y-auto custom-scrollbar p-2 bg-card">
                <h4 className="font-semibold text-sm mb-2">Online Users</h4>
                {onlineUsers.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {onlineUsers
                      .sort((a, b) => (b.is_online ? 1 : 0) - (a.is_online ? 1 : 0)) // online first
                      .map((u, idx) => {
                        const name = u.name; // always exists
                        const username = u.username || "";
                        const role = u.role;
                        const subscription = u.subscription || "Free";
                        const institution = u.institution || "";
                        const course = u.course || "";
                        const specialization = u.specialization || "";
                        const avatarUrl = u.avatar_url || undefined;

                        return (
                          <li
                            key={u.user_id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded"
                            onClick={() => setSelectedUserId(u.user_id)}
                          >
                            {/* Avatar */}
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={avatarUrl} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {name.split(" ").map((n: string) => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>

                            {/* User info */}
                            <div className="flex-1 truncate text-sm">
                              <div className="font-medium">{name}</div>
                              <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
                                <div className="flex gap-1 items-center">
                                  {username && <span>@{username}</span>}
                                  <span>{role}</span>
                                </div>
                                {(institution || course || specialization) && (
                                  <div className="flex gap-1 items-center text-gray-400 truncate">
                                    {institution && <span>{institution}</span>}
                                    {course && <span>• {course}</span>}
                                    {specialization && <span>• {specialization}</span>}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Online dot */}
                            {u.is_online && (
                              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-xs">No one online</p>
                )}
              </PopoverContent>
            </Popover>
            {/* Challenge Icon */}

          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(50);
              navigate("/challenge");
            }}
            className="group relative h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center ml-1 rounded-full transition-all duration-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            title="Clinical Challenges"
          >
            <Star
              className="w-8 h-8 text-slate-500 dark:text-slate-400 transition-transform duration-500 group-hover:rotate-90 group-hover:text-primary"
              fill="currentColor"
            />
            {/* Active Challenge Indicator */}
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>

            {/* Hover Glow */}
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] dark:shadow-[0_0_20px_rgba(244,63,94,0.15)]" />
          </Button>

          <div className="ml-0 mr-3 sm:mr-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-full transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-800 group border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  {/* The Settings Gear - It rotates 90 degrees on hover */}
                  <CogIcon
                    className="w-8 h-8 text-slate-500 dark:text-slate-400 transition-transform duration-500 group-hover:rotate-90 group-hover:text-primary"
                  />

                  {/* Notification Indicator - Repositioned for the Gear icon */}
                  {notificationCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white dark:border-slate-950"></span>
                    </span>
                  )}

                  <span className="sr-only">Settings and Preferences</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 p-2 mt-2 rounded-xl border-0 bg-white dark:bg-muted/30 shadow-xl dark:shadow-2xl"
              >
                {/* Dynamic Streak Widget */}
                {streak > 0 && isOnline && (
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
                )}

                {/* Notifications - Theme Responsive */}
                <DropdownMenuItem
                  onClick={() => navigate("/notifications")}
                  className="flex items-center justify-between py-2.5 px-3 cursor-pointer rounded-lg transition-colors focus:bg-slate-100 dark:focus:bg-slate-800 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60">
                      <Bell className="w-4 h-4 fill-current" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notifications</span>
                  </div>
                  {notificationCount > 0 && (
                    <Badge className="h-5 min-w-[20px] rounded-full bg-red-500 hover:bg-red-500 text-[10px] font-bold text-white border-none">
                      {notificationCount}
                    </Badge>
                  )}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

                {/* Share - Theme Responsive */}
                <DropdownMenuItem
                  onClick={() => {
                    const shareMessage = `Medrae – The Professional Medical Education & Career Network\n\n• Clinical modules\n• Exam simulations\n• Expert-led lectures\n\nJoin us: https://medrae.vercel.app`;
                    if (navigator.share) {
                      navigator.share({ title: "Medrae Network", text: shareMessage, url: "https://medrae.vercel.app" }).catch(() => { });
                    } else {
                      navigator.clipboard.writeText(shareMessage);
                      alert("Medrae info copied to clipboard!");
                    }
                  }}
                  className="flex items-center gap-3 py-2.5 px-3 cursor-pointer rounded-lg focus:bg-slate-100 dark:focus:bg-slate-800 group"
                >
                  <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Invite Colleagues</span>
                </DropdownMenuItem>

                {/* Dark Mode Toggle - Dynamic UI */}
                <DropdownMenuItem
                  onClick={onToggleDarkMode}
                  className="flex items-center justify-between py-2.5 px-3 cursor-pointer rounded-lg focus:bg-slate-100 dark:focus:bg-slate-800 group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md transition-colors ${isDarkMode ? 'bg-amber-900/40 text-amber-400' : 'bg-slate-100 text-slate-600'}`}>
                      {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {isDarkMode ? "Light Mode" : "Dark Mode"}
                    </span>
                  </div>
                  <div className="w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded-full relative">
                    <div className={`absolute top-1 w-2 h-2 rounded-full transition-all duration-200 ${isDarkMode ? 'right-1 bg-amber-400' : 'left-1 bg-slate-400'}`} />
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

                {/* Update App - Specialized Loading State */}
                <DropdownMenuItem
                  onClick={handleReload}
                  className="flex items-center gap-3 py-2.5 px-3 cursor-pointer rounded-lg focus:bg-emerald-50 dark:focus:bg-emerald-950/30 group"
                >
                  <div className={`p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 ${rotating ? "animate-spin" : ""}`}>
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
          {/*  User Info */}
          <div
            className="flex items-center gap-1 cursor-pointer"
            onClick={() => navigate("/profile")}
          >
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium flex items-center gap-2 truncate max-w-[150px]">
                {user.name ? user.name.split(" ")[0] : (!isOnline ? "Offline" : "")}
                {streak > 0 && isOnline && (
                  <Badge
                    variant="secondary"
                    className={`text-xs ${streak <= 7
                      ? "bg-red-700 text-white"
                      : streak <= 30
                        ? "bg-purple-800 text-white"
                        : "bg-gray-900 text-white"
                      }`}
                  >
                    🔥 {streak} day{streak !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>


              <p className="text-xs text-muted-foreground">
                {user.role || (!isOnline ? "Offline" : "")}

              </p>
            </div>
            <div className="relative">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 mobile-profile-avatar rounded-full border-2 border-pink-300 shadow-sm">
                <AvatarImage
                  src={user.avatar && isOnline ? user.avatar : undefined}
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary text-primary-foreground flex items-center justify-center text-xs">
                  {isOnline
                    ? (user.name?.split(" ").map((n) => n[0]).join("") || <User className="h-4 w-4" />)
                    : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>

              {/* Online Status Dot at Top-Right */}
              <span
                className={`
      absolute top-0 right-0 w-4 h-4 rounded-full border-2 border-white
      ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"}
    `}
                title={isOnline ? "Online" : "Offline"}
              />
            </div>
          </div>
        </div>
      </header>
      {
        selectedUserId && (
          <UserProfileModal
            userId={selectedUserId}
            onClose={() => setSelectedUserId(null)}
          />
        )
      }

    </>
  );
}
