import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

import { Bell, Moon, Sun, User, Menu, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSidebar } from "@/components/ui/sidebar";
import { playSound } from "@/lib/soundManager";

import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import OnlineStatusToast from "@/components/OnlineStatusToast";
import { useToast } from "@/components/ui/use-toast";
import { Share2 } from "lucide-react";

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

  const streakSound = typeof Audio !== "undefined" ? new Audio("/sounds/medrae.mp3") : null;

  const navigate = useNavigate();
  const authUser = useUser();
  const { toggleSidebar } = useSidebar();

  const [streak, setStreak] = useState(propStreak);
  const isOnline = useOnlineStatus();
  const [notificationCount, setNotificationCount] = useState(0);
  const [rotating, setRotating] = useState(false);
  const [totalUsers, setTotalUsers] = useState<number | null>(() => {
    const stored = localStorage.getItem("totalUsers");
    return stored ? parseInt(stored) : null;
  });


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
        playSound("medrae");

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
    <header className="h-14 sm:h-16 bg-card border-b border-border flex items-center justify-between xl:justify-evenly px-3 sm:px-6 sticky top-0 z-40 backdrop-blur-sm bg-card/95 text-sm sm:text-base">
      <OnlineStatusToast />

      <div className="flex items-center flex-1 justify-between">

        {/* Desktop Sidebar Toggle */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex flex-col items-center justify-center px-3 py-1 rounded-md  active:scale-95 transition"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[11px] font-medium mt-0.5">Menu</span>
        </button>
        <div className="flex items-center gap-3 order-1 lg:hidden">
          {/* Online Status */}
          <div className="flex flex-col items-start space-y-1">
            {isOnline ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-green-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-gray-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z"
                />
              </svg>
            )}
            <span
              className={`text-xs font-semibold ${isOnline ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}
            >
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>


          {/* Streak (mobile only) */}
          {streak > 0 && isOnline && (
            <div className="flex flex-col items-start space-y-1">
              <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                Streak 🔥 {streak} day{streak !== 1 ? "s" : ""}
              </span>
            </div>
          )}

        </div>
        {/* Center scrolling text */}
        <div className="hidden md:flex-1 md:flex md:justify-center order-2 overflow-hidden">
          <div className="whitespace-nowrap animate-marquee text-xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-clip-text text-transparent">
            🌟 Welcome to Medrae...Organized Learning. Confident Exams.🌟
          </div>
        </div>

      </div>

      <div className="flex items-center gap-2 xl:gap-6">
        <div className="hidden sm:flex flex-col items-center space-y-1">
          {isOnline ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-green-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z"
              />
            </svg>
          )}
          <span
            className={`text-xs font-semibold ${isOnline ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
          >
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>



        <div className="hidden md:block">
          <div className="flex items-center gap-1">
            {/* Archive SVG next to badge */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-8 h-8">
              <path stroke-linecap="round" stroke-linejoin="round" fill="#0caae9" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            <Badge className="h-5 px-2 text-xs bg-blue-500 text-white">
              {totalUsers ?? "-"}
            </Badge>
          </div>

        </div>

        {/*  Reload PWA */}
        <button
          onClick={handleReload}
          className="flex flex-col items-center space-y-1 p-2 rounded-full active:scale-95 transition"
        >
          {/* Spinner only when loading */}
          {rotating && (
            <svg
              className="animate-spin h-5 w-5 text-gray-800 dark:text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          )}

          {/* Label below */}
          <span className="text-xs font-semibold text-gray-800 dark:text-white">
            {rotating ? "Updating..." : "Update"}
          </span>
        </button>




        {/* Share App */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const shareMessage = `Medrae – The Professional Medical Education & Career Network

• Structured learning modules across clinical disciplines
• Evidence-based resources and expert-led video lectures
• Comprehensive notes and case studies for clinical excellence
• Exam simulations and certification pathways for professional growth

Advance your medical journey today: https://medrae.vercel.app`;

            if (navigator.share) {
              navigator
                .share({
                  title: "Medrae – Medical Education & Career Network",
                  text: shareMessage,
                  url: "https://medrae.vercel.app",
                })
                .catch((err) => console.log("Share cancelled:", err));
            } else {
              navigator.clipboard.writeText(shareMessage);
              alert("Medrae link and overview copied to clipboard!");
            }
          }}
        >
          <Share2 width={24} height={24} stroke="#3B82F6" />
        </Button>


        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => navigate("/notifications")}
        >
          <Bell
            width={24}
            height={24}
            stroke="none"
            fill={isDarkMode ? "#FBBF24" : "#FACC15"}
          />

          {notificationCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-destructive">
              {notificationCount}
            </Badge>
          )}
        </Button>

        {/* Dark Mode Toggle */}
        <Button variant="ghost" size="icon" onClick={onToggleDarkMode}>
          {isDarkMode ? <Sun width={24} height={24} stroke="#FBBF24" /> : <Moon width={24} height={24} stroke="none" fill="#071016" />}
        </Button>

        {/*  User Info */}
        <div
          className="flex items-center gap-3 cursor-pointer"
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
          <Avatar className="h-6 w-6 sm:h-8 sm:w-8 mobile-profile-avatar">
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
        </div>
      </div>
    </header>
  );
}
