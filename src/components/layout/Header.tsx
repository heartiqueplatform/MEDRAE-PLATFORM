import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

import { Bell, Moon, Sun, User, Menu, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSidebar } from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import OnlineStatusToast from "@/components/OnlineStatusToast";

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
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const authUser = useUser();
  const [streak, setStreak] = useState(propStreak);
  const isOnline = useOnlineStatus();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (authUser?.id) {
      fetchStreak();
      fetchNotifications();
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
      setStreak(data.streak || 0);
    }
  };

  // smart reload function: clears cache and reloads
  const handleReload = async () => {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
    window.location.reload();
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 backdrop-blur-sm bg-card/95">
      <OnlineStatusToast />

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden md:block">
          <h1 className="text-xl font-bold bg-gradient-medical bg-clip-text text-transparent">
            Heartique Nursing Nexus Scholar
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge
  className={`h-5 px-2 text-xs ${
    isOnline ? "bg-green-500 text-white" : "bg-red-500 text-white"
  }`}
>
  {isOnline ? "Online" : "Offline"}
</Badge>
        {/* 🔄 Reload PWA */}
        <Button variant="ghost" size="sm" onClick={handleReload}>
          <RefreshCcw className="h-5 w-5" />
        </Button>
        {/* 🌐 Online/Offline status */}

        {/* 🔔 Notifications */}
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          onClick={() => navigate("/notifications")}
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-destructive">
              {notificationCount}
            </Badge>
          )}
        </Button>

        {/* 🌙 Dark Mode Toggle */}
        <Button variant="ghost" size="sm" onClick={onToggleDarkMode}>
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* 👤 User Info */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate("/profile")}
        >
        <div className="hidden sm:block text-right">
  <p className="text-sm font-medium flex items-center gap-2">
    {user.name || (isOnline ? "Loading..." : "Offline")}
    {streak > 0 && isOnline && (
      <Badge variant="secondary" className="text-xs">
        🔥 {streak} day{streak !== 1 ? "s" : ""}
      </Badge>
    )}
  </p>
  <p className="text-xs text-muted-foreground">
    {user.role || (isOnline ? "Loading..." : "Offline")}
  </p>
</div>
<Avatar className="h-8 w-8">
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
