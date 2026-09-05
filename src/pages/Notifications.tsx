"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import React from 'react';
import {
  Bell, CheckCheck, Clock, CreditCard, BookOpen,
  ShoppingBag, PlayCircle, Trash2, Activity,
  FileText, ChevronRight, Home, Trophy, X, ExternalLink
} from 'lucide-react';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


const CACHE_KEY_PREFIX = "notifs_cache_";

export function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userTheme, setUserTheme] = useState<string>('light');
  const [name, setName] = useState<string>('');
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  // Helper to update state and cache simultaneously
  const updateBag = useCallback((data: any[], uid: string) => {
    const limitedData = data.slice(0, 10);
    setNotifications(limitedData);
    localStorage.setItem(`${CACHE_KEY_PREFIX}${uid}`, JSON.stringify(limitedData));
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student');
        setUserTheme(user.user_metadata?.theme || 'light');

        // 1. Load from Cache immediately
        const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${user.id}`);
        if (cached) {
          setNotifications(JSON.parse(cached));
          setLoading(false);
        }

        // 2. Fetch fresh data
        await fetchNotifications(user.id);
      }
    };
    initialize();
  }, []);



  // Lock body scroll when overlay is open
  useEffect(() => {
    if (selectedNotification) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedNotification]);

  const fetchNotifications = async (uid: string) => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`user_id.eq.${uid},user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      updateBag(data, uid);
    }
    setLoading(false);
  };

  const markAsRead = async (id: string, url?: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
    if (userId) updateBag(updated, userId);

    await supabase.from("notifications").update({ is_read: true }).eq("id", id);

    // Don't navigate, just mark as read
    // if (url) navigate(url); // Removed to prevent 404
  };

  const handleNotificationClick = (notification: any) => {
    setSelectedNotification(notification);
    // Mark as read when viewing
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  const deleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    // Close overlay if deleting the currently viewed notification
    if (selectedNotification?.id === id) {
      setSelectedNotification(null);
    }

    // First update UI optimistically
    const updated = notifications.filter(n => n.id !== id);
    if (userId) updateBag(updated, userId);

    // Then delete from Supabase with error handling
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
      payment: { icon: <CreditCard className="w-5 h-5 md:w-6 md:h-6" />, color: "text-amber-600", bg: "bg-amber-100", label: "Billing" },
      quiz: { icon: <Trophy className="w-5 h-5 md:w-6 md:h-6" />, color: "text-emerald-600", bg: "bg-emerald-100", label: "Question Bank" },
      housing: { icon: <Home className="w-5 h-5 md:w-6 md:h-6" />, color: "text-purple-600", bg: "bg-purple-100", label: "Survival Hub" },
      market: { icon: <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />, color: "text-rose-600", bg: "bg-rose-100", label: "Market" },
      video: { icon: <PlayCircle className="w-5 h-5 md:w-6 md:h-6" />, color: "text-indigo-600", bg: "bg-indigo-100", label: "MedTube" },
      flashcard: { icon: <BookOpen className="w-5 h-5 md:w-6 md:h-6" />, color: "text-orange-600", bg: "bg-orange-100", label: "Flashcards" },
      case: { icon: <Activity className="w-5 h-5 md:w-6 md:h-6" />, color: "text-cyan-600", bg: "bg-cyan-100", label: "Clinical Case" },
      paper: { icon: <FileText className="w-5 h-5 md:w-6 md:h-6" />, color: "text-blue-600", bg: "bg-blue-100", label: "Exam Paper" },
      system: { icon: <Bell className="w-5 h-5 md:w-6 md:h-6" />, color: "text-slate-600", bg: "bg-slate-100", label: "System" },
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

          {/* Header - full width on mobile */}
          <div className="flex items-center justify-between mb-3 md:mb-4 px-4 md:px-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Activity</h1>
              <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Latest 10 Updates</p>
              </div>
            </div>
            {notifications.some(n => !n.is_read) && (
              <Button variant="outline" size="sm" onClick={markAllAsRead} className="rounded-full text-[9px] md:text-[10px] font-bold uppercase h-8 md:h-9 px-3">
                <CheckCheck className="mr-1.5 md:mr-2 h-4 w-4 md:h-5 md:w-5" /> Clear Unread
              </Button>
            )}
          </div>

          {loading && notifications.length === 0 ? (
            <div className="py-16 md:py-20 text-center">
              <BookOpen className="text-blue-600 mx-auto animate-bounce" size={32} />
              <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] mt-3 md:mt-4">Syncing Feed...</p>
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-0 md:space-y-2">
              {notifications.map((n) => {
                const style = getNotificationStyles(n.type);
                return (
                  <Card
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`transition-all md:border-0 md:shadow-sm cursor-pointer rounded-none md:rounded-xl border-b border-slate-100 dark:border-slate-800 md:border-b-0 ${n.is_read ? 'opacity-60 bg-white/60 dark:bg-slate-900/40' : 'bg-white dark:bg-muted/30 hover:shadow-md'
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
                          className="text-slate-300 hover:text-rose-500 transition-colors p-1 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20"
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
          ) : (
            <div className="py-16 md:py-20 text-center">
              <Bell className="text-slate-200 mx-auto mb-3 md:mb-4" size={48} />
              <p className="text-slate-500 font-bold text-sm md:text-base">All caught up!</p>
            </div>
          )}
        </div>
      </div>

      {/* Full-screen Overlay for Notification Details */}
      {selectedNotification && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          onClick={() => setSelectedNotification(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />

          {/* Overlay Card - Full width on mobile, centered modal on desktop */}
          <div
            className="relative w-full md:max-w-lg md:w-full bg-white dark:bg-slate-900 md:rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar for mobile */}
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between p-4 md:p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-2xl ${getNotificationStyles(selectedNotification.type).bg} ${getNotificationStyles(selectedNotification.type).color} flex items-center justify-center`}>
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
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 md:p-6 max-h-[60vh] md:max-h-[70vh] overflow-y-auto">
              <div className="mb-4">
                <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedNotification.message}
                </p>
              </div>

              {/* Metadata */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock size={14} />
                  <span>{formatDate(selectedNotification.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex gap-3 p-4 md:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 md:rounded-b-2xl">
              <Button
                variant="outline"
                onClick={() => setSelectedNotification(null)}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={(e) => deleteNotification(e, selectedNotification.id)}
                className="flex-1"
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