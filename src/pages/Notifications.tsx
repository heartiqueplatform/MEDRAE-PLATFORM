"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom"; // or next/navigation
import React from 'react';
import {
  Bell, CheckCheck, Clock, CreditCard, BookOpen,
  MessageSquare, Calendar, AlertCircle, Trophy,
  ChevronRight, Home, ShoppingBag, PlayCircle, Trash2,
  Activity,
  FileText
} from 'lucide-react';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import FriendlyProgressCard from "@/components/FriendlyProgressCard";

export function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await fetchNotifications(user.id);
      }
    };
    initialize();
  }, []);

  // ✅ Realtime subscription - Updated to rely on RLS
  // (RLS handles showing private + public automatically)
  useEffect(() => {
    if (!userId) return;

    // Listen to ALL changes in notifications table.
    // Supabase RLS will automatically filter out private messages that don't belong to you.
    const channel = supabase
      .channel('global-activity')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log("New notification received live:", payload.new);
          // Directly add the new notification to the top of the list
          setNotifications(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchNotifications = async (uid: string) => {
    setLoading(true);

    // We use a cleaner approach to fetch both types
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      // This ensures it grabs rows specifically for YOU or rows meant for EVERYONE
      .or(`user_id.eq.${uid},user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      console.error("Fetch error:", error);
    } else {
      console.log("Notifications received:", data); // Add this to debug in console
      setNotifications(data || []);
    }
    setLoading(false);
  };

  const deleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    await supabase.from("notifications")
      .update({ is_read: true })
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq("is_read", false);
    fetchNotifications(userId);
  };

  // PRO STYLING MAP
  const getNotificationStyles = (type: string) => {
    const config = {
      payment: { icon: <CreditCard />, color: "text-amber-600", bg: "bg-amber-100", label: "Billing" },
      quiz: { icon: <Trophy />, color: "text-emerald-600", bg: "bg-emerald-100", label: "Question Bank" },
      housing: { icon: <Home />, color: "text-purple-600", bg: "bg-purple-100", label: "Survival Hub" },
      market: { icon: <ShoppingBag />, color: "text-rose-600", bg: "bg-rose-100", label: "Market" },
      video: { icon: <PlayCircle />, color: "text-indigo-600", bg: "bg-indigo-100", label: "MedTube" },

      // NEW TYPES
      flashcard: { icon: <BookOpen className="w-4 h-4" />, color: "text-orange-600", bg: "bg-orange-100", label: "Flashcards" },
      case: { icon: <Activity className="w-4 h-4" />, color: "text-cyan-600", bg: "bg-cyan-100", label: "Clinical Case" },
      paper: { icon: <FileText className="w-4 h-4" />, color: "text-blue-600", bg: "bg-blue-100", label: "Exam Paper" },

      system: { icon: <Bell />, color: "text-slate-600", bg: "bg-slate-100", label: "System" },
    };
    return config[type] || config.system;
  };
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background pb-20">
      <div className="max-w-2xl mx-auto pt-8 px-4">

        {/* Header Area */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Activity</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Live Updates</p>
            </div>
          </div>
          {notifications.some(n => !n.is_read) && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="rounded-full bg-white dark:bg-muted/30 text-[10px] font-bold uppercase tracking-wider"
            >
              <CheckCheck className="mr-2 h-3 w-3" />
              Clear Unread
            </Button>
          )}
        </div>

        {loading && notifications.length === 0 ? (
          <div className="py-20 text-center">
            <div className="animate-spin mb-4 flex justify-center">
              <BookOpen className="text-blue-600" size={32} />
            </div>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Syncing Feed...</p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((n) => {
              const style = getNotificationStyles(n.type);
              return (
                <div key={n.id} className="relative group">
                  <Card
                    onClick={() => markAsRead(n.id, n.link_url)}
                    className={`overflow-hidden transition-all duration-300 cursor-pointer border-0 shadow-sm hover:shadow-md ${n.is_read ? 'bg-white/60 dark:bg-slate-900/40 opacity-70' : 'bg-white dark:bg-muted/30 ring-1 ring-blue-500/10'
                      }`}
                  >
                    <CardContent className="p-0">
                      <div className="flex p-4 gap-2">
                        {/* Left Side: Icon */}
                        <div className={`mt-1 h-10 w-10 shrink-0 rounded-2xl ${style.bg} ${style.color} flex items-center justify-center border ${style.border}`}>
                          {style.icon}
                        </div>

                        {/* Middle: Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${style.color}`}>
                              {style.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(n.created_at).toLocaleDateString() === new Date().toLocaleDateString() ? 'Today' : 'Earlier'}
                            </span>
                          </div>
                          <h3 className={`text-sm font-bold truncate mb-0.5 ${n.is_read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                            {n.title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                            {n.message}
                          </p>

                          <div className="flex items-center gap-1 mt-2">
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                              <Clock size={12} />
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {!n.is_read && (
                              <div className="h-1.5 w-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
                            )}
                          </div>
                        </div>

                        {/* Right Side: Action */}
                        <div className="flex flex-col justify-between items-end shrink-0">
                          <button
                            onClick={(e) => deleteNotification(e, n.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                          <ChevronRight size={16} className="text-slate-300" />
                        </div>
                      </div>

                      {/* Interaction Bar */}
                      {!n.is_read && (
                        <div className="h-1 w-full bg-gradient-to-r from-blue-600/20 via-blue-600 to-blue-600/20" />
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State - CINEMATIC VERSION */
          <div className="py-24 px-6 text-center">
            <div className="relative inline-block mb-2">
              <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
              <div className="relative h-20 w-20 rounded-full bg-white dark:bg-muted/30 border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-xl">
                <Bell className="text-slate-300" size={32} />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Clear Skies</h3>
            <p className="text-slate-500 text-sm mt-2 max-w-[240px] mx-auto">
              No new updates at the moment. We'll let you know when the community buzzes.
            </p>
          </div>
        )}

        {/* Progress Section - Enhanced integration */}
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="h-1 w-8 bg-primary rounded-full" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Your Learning Journey</h2>
          </div>
          <div className="transform transition-transform hover:scale-[1.01]">
            <FriendlyProgressCard userTheme={userTheme} name={name} />
          </div>
        </div>
      </div>
    </div>
  );
}