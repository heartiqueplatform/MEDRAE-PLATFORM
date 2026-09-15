"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import React from 'react';
import {
  Bell, CheckCheck, Clock, CreditCard, BookOpen,
  ShoppingBag, PlayCircle, Trash2, Activity,
  FileText, ChevronRight, Home, Trophy, X, ExternalLink,
  RefreshCw, Inbox
} from 'lucide-react';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const CACHE_KEY_PREFIX = "notifs_cache_";

/* ============================================================
   SKELETON — shown while first fetch is in flight
   ============================================================ */
function NotificationSkeleton() {
  return (
    <div className="space-y-2 px-4 md:px-0">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex gap-3 items-center p-3 md:p-4
              bg-white dark:bg-muted/30
              rounded-xl
              border-0"
        >
          <div className="h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-xl md:rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex justify-between items-center">
              <div className="h-2.5 w-16 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              <div className="h-2.5 w-10 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </div>
            <div className="h-3 w-3/4 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-2.5 w-1/2 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userTheme, setUserTheme] = useState<string>('light');
  const [name, setName] = useState<string>('');
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const updateBag = useCallback((data: any[], uid: string) => {
    const limitedData = data.slice(0, 10);
    setNotifications(limitedData);
    localStorage.setItem(`${CACHE_KEY_PREFIX}${uid}`, JSON.stringify(limitedData));
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setFetchState("loading");
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student');
        setUserTheme(user.user_metadata?.theme || 'light');

        const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${user.id}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setNotifications(parsed);
            if (parsed.length > 0) setFetchState("ready");
          } catch { /* ignore bad cache */ }
          setLoading(false);
        }

        await fetchNotifications(user.id);
      } else {
        setLoading(false);
        setFetchState("ready");
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    if (selectedNotification) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [selectedNotification]);

  const fetchNotifications = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${uid},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data) {
        updateBag(data, uid);
        setFetchState("ready");
      }
    } catch (err) {
      console.error("Fetch notifications failed:", err);
      setFetchState("error");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!userId) return;
    setFetchState("loading");
    await fetchNotifications(userId);
  };

  const markAsRead = async (id: string, url?: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
    if (userId) updateBag(updated, userId);
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const handleNotificationClick = (notification: any) => {
    setSelectedNotification(notification);
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  const deleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    if (selectedNotification?.id === id) {
      setSelectedNotification(null);
    }

    const updated = notifications.filter(n => n.id !== id);
    if (userId) updateBag(updated, userId);

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .select();

      if (error) {
        console.error("Delete error:", error);
        if (userId && notifications.length > 0) {
          updateBag(notifications, userId);
        }
      }
    } catch (err) {
      console.error("Delete failed:", err);
      if (userId && notifications.length > 0) {
        updateBag(notifications, userId);
      }
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    const updated = notifications.map(n => ({ ...n, is_read: true }));
    updateBag(updated, userId);

    await supabase.from("notifications")
      .update({ is_read: true })
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq("is_read", false);
  };

  const getNotificationStyles = (type: string) => {
    const config: any = {
      payment: { icon: <CreditCard className="w-5 h-5 md:w-6 md:h-6" />, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/20", label: "Billing" },
      quiz: { icon: <Trophy className="w-5 h-5 md:w-6 md:h-6" />, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/20", label: "Question Bank" },
      housing: { icon: <Home className="w-5 h-5 md:w-6 md:h-6" />, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/20", label: "Survival Hub" },
      market: { icon: <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />, color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/20", label: "Market" },
      video: { icon: <PlayCircle className="w-5 h-5 md:w-6 md:h-6" />, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/20", label: "MedTube" },
      flashcard: { icon: <BookOpen className="w-5 h-5 md:w-6 md:h-6" />, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/20", label: "Flashcards" },
      case: { icon: <Activity className="w-5 h-5 md:w-6 md:h-6" />, color: "text-cyan-600", bg: "bg-cyan-100 dark:bg-cyan-900/20", label: "Clinical Case" },
      paper: { icon: <FileText className="w-5 h-5 md:w-6 md:h-6" />, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/20", label: "Exam Paper" },
      system: { icon: <Bell className="w-5 h-5 md:w-6 md:h-6" />, color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800", label: "System" },
    };
    return config[type] || config.system;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50/50 dark:bg-background pb-16 md:pb-20">
        <div className="max-w-2xl mx-auto pt-4 md:pt-8 px-0 md:px-4">

          {/* Header */}
          <div className="flex items-center justify-between mb-3 md:mb-4 px-4 md:px-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Notifications</h1>
              <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Your Latest Notifications</p>
              </div>
            </div>
            {notifications.some(n => !n.is_read) && (
              <Button variant="outline" size="sm" onClick={markAllAsRead} className="rounded-full border-0 bg-slate-100 dark:bg-slate-800 text-[9px] md:text-[10px] font-bold uppercase h-8 md:h-9 px-3">
                <CheckCheck className="mr-1.5 md:mr-2 h-4 w-4 md:h-5 md:w-5" /> Clear Unread
              </Button>
            )}
          </div>

          {/* ------- STATE MACHINE ------- */}

          {/* 1. FIRST LOAD — skeleton shimmer */}
          {fetchState === "loading" && notifications.length === 0 && (
            <div className="px-4 md:px-0">
              <div className="flex items-center gap-2 mb-3 md:mb-4 text-xs text-slate-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="font-normal">Fetching notifications…</span>
              </div>
              <NotificationSkeleton />
            </div>
          )}

          {/* 2. ERROR — retry */}
          {fetchState === "error" && (
            <div className="px-4 md:px-0">
              <div className="rounded-2xl border-0 bg-white dark:bg-muted/30 p-8 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Couldn't load notifications
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Check your connection and try again. Your cached notifications are still visible below.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="mt-4 rounded-full border-0 bg-slate-100 dark:bg-slate-800 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* 3. LIST — has notifications */}
          {notifications.length > 0 && (
            <div className="space-y-2 px-4 md:px-0">
              {notifications.map((n) => {
                const style = getNotificationStyles(n.type);
                return (
                  <Card
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`transition-all cursor-pointer rounded-xl border-0 shadow-sm ${n.is_read
                      ? 'opacity-60 bg-white dark:bg-slate-900/40'
                      : 'bg-white dark:bg-muted/30 hover:shadow-md'
                      }`}
                  >
                    <CardContent className="p-3 md:p-4 flex gap-2 md:gap-3 items-center">
                      <div className={`h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-xl md:rounded-2xl ${style.bg} ${style.color} flex items-center justify-center`}>
                        {style.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5 md:mb-1">
                          <span className={`text-[9px] md:text-[10px] font-black uppercase ${style.color}`}>{style.label}</span>
                          <span className="text-[9px] md:text-[10px] text-slate-400">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h3 className="text-xs md:text-sm font-bold truncate text-slate-900 dark:text-white">{n.title}</h3>
                        <p className="text-[10px] md:text-xs text-slate-500 line-clamp-1">{n.message}</p>
                      </div>
                      <div className="flex flex-col justify-between items-end gap-2">
                        <button
                          onClick={(e) => deleteNotification(e, n.id)}
                          className="text-slate-300 hover:text-rose-500 transition-colors p-1 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 border-0"
                          title="Delete notification"
                        >
                          <Trash2 size={16} />
                        </button>
                        <ChevronRight size={16} className="text-slate-300" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* 4. EMPTY */}
          {fetchState === "ready" && notifications.length === 0 && (
            <div className="px-4 md:px-0">
              <div className="rounded-2xl border-0 bg-white dark:bg-muted/30 p-10 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Inbox className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-sm md:text-base font-semibold text-slate-900 dark:text-white">
                  You're all caught up
                </h3>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                  Notifications about your quizzes, simulations, billing, and account activity will appear here as they happen.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ============================================
          FULL-SCREEN OVERLAY — borderless, gradient
          ============================================ */}
      {selectedNotification && (
        <div
          className="fixed inset-0 z-[2147483647] flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={() => setSelectedNotification(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />

          {/* Sheet / Modal */}
          <div
            className="relative w-full md:max-w-lg md:w-full
              bg-white dark:bg-muted/30
              md:rounded-3xl
              shadow-2xl
              animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-4
              max-h-[92vh] md:max-h-[90vh]
              flex flex-col
              pb-[env(safe-area-inset-bottom)]
              border-0 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Soft gradient wash — same surface language as hero cards */}
            <div className="pointer-events-none absolute inset-0 z-0
              bg-gradient-to-br from-blue-50/40 via-transparent to-purple-50/30
              dark:from-blue-950/10 dark:via-transparent dark:to-purple-950/10" />

            {/* Drag handle */}
            <div className="relative z-10 md:hidden flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-start justify-between p-4 md:p-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-2xl ${getNotificationStyles(selectedNotification.type).bg} ${getNotificationStyles(selectedNotification.type).color} flex items-center justify-center border-0`}>
                  {getNotificationStyles(selectedNotification.type).icon}
                </div>
                <div>
                  <span className={`text-[10px] font-black uppercase ${getNotificationStyles(selectedNotification.type).color}`}>
                    {getNotificationStyles(selectedNotification.type).label}
                  </span>
                  <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedNotification.title}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 border-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Hairline separator without border */}
            <div className="relative z-10 h-px bg-slate-100 dark:bg-slate-800 shrink-0" />

            {/* Body */}
            <div className="relative z-10 p-4 md:p-6 overflow-y-auto flex-1 min-h-0">
              <div className="mb-4">
                <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedNotification.message}
                </p>
              </div>

              <div className="space-y-3 pt-4">
                <div className="h-px bg-slate-100 dark:bg-slate-800" />
                <div className="flex items-center gap-2 text-xs text-slate-500 pt-3">
                  <Clock size={14} />
                  <span>{formatDate(selectedNotification.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 flex gap-3 p-4 md:p-6 shrink-0
              bg-slate-50 dark:bg-slate-900/40
              md:rounded-b-3xl
              border-0">
              <Button
                variant="outline"
                onClick={() => setSelectedNotification(null)}
                className="flex-1 border-0 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={(e) => deleteNotification(e, selectedNotification.id)}
                className="flex-1 border-0"
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}