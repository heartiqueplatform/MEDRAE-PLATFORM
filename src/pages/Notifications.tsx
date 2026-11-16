// pages/Notifications.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Clock,
  CreditCard,
  BookOpen,
  ShoppingBag,
  PlayCircle,
  Trash2,
  Activity,
  FileText,
  ChevronRight,
  Home,
  Trophy,
  RefreshCw,
  Inbox,
  ChevronLeft,
} from "lucide-react";
import { useUser } from "@supabase/auth-helpers-react";
import { toast } from "sonner";

import { CenteredModal } from "@/components/ui/CenteredModal";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import { tap, tapSuccess, tapError } from "@/lib/tutor/tap";
import { useNotificationCount } from "@/lib/notifications/useNotificationCount";
import {
  fetchNotificationsPage,
  markNotificationRead,
  markAllRead,
  deleteNotification as apiDeleteNotification,
  type NotificationRow,
} from "@/lib/notifications/api";

const CACHE_PREFIX = "notifs_page_";

// ---------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------
function NotificationSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex gap-3 items-center p-3 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse"
        >
          <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex justify-between items-center">
              <div className="h-2.5 w-16 rounded bg-slate-200 dark:bg-white/[0.06]" />
              <div className="h-2.5 w-10 rounded bg-slate-200 dark:bg-white/[0.06]" />
            </div>
            <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-white/[0.06]" />
            <div className="h-2.5 w-1/2 rounded bg-slate-200 dark:bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------
// Type styles
// ---------------------------------------------------------------
const TYPE_STYLES: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string; label: string }
> = {
  payment: {
    icon: <CreditCard className="h-4 w-4" strokeWidth={2.5} />,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    label: "Billing",
  },
  quiz: {
    icon: <Trophy className="h-4 w-4" strokeWidth={2.5} />,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    label: "Quizzes",
  },
  housing: {
    icon: <Home className="h-4 w-4" strokeWidth={2.5} />,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    label: "Housing",
  },
  market: {
    icon: <ShoppingBag className="h-4 w-4" strokeWidth={2.5} />,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    label: "Market",
  },
  video: {
    icon: <PlayCircle className="h-4 w-4" strokeWidth={2.5} />,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-500/10",
    label: "MedTube",
  },
  flashcard: {
    icon: <BookOpen className="h-4 w-4" strokeWidth={2.5} />,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
    label: "Flashcards",
  },
  case: {
    icon: <Activity className="h-4 w-4" strokeWidth={2.5} />,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
    label: "Clinical Case",
  },
  paper: {
    icon: <FileText className="h-4 w-4" strokeWidth={2.5} />,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    label: "Exam Paper",
  },
  system: {
    icon: <Bell className="h-4 w-4" strokeWidth={2.5} />,
    color: "text-slate-600 dark:text-slate-300",
    bg: "bg-slate-500/10",
    label: "System",
  },
};

function typeStyle(t: string) {
  return TYPE_STYLES[t] ?? TYPE_STYLES.system;
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------
export function Notifications() {
  const navigate = useNavigate();
  const user = useUser();
  const home = useHomeRoute();
  const userId = user?.id ?? null;

  const { refresh: refreshBadge } = useNotificationCount();

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchState, setFetchState] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [selected, setSelected] = useState<NotificationRow | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const mounted = useRef(true);
  // Guards against out-of-order fetch responses overwriting a newer one.
  const fetchSeq = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleBack = useCallback(() => {
    tap();
    navigate(home, { replace: true });
  }, [navigate, home]);

  const cacheRead = useCallback(() => {
    if (!userId) return [] as NotificationRow[];
    try {
      const raw = localStorage.getItem(`${CACHE_PREFIX}${userId}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as NotificationRow[]) : [];
    } catch {
      return [];
    }
  }, [userId]);

  const cacheWrite = useCallback(
    (rows: NotificationRow[]) => {
      if (!userId) return;
      try {
        localStorage.setItem(
          `${CACHE_PREFIX}${userId}`,
          JSON.stringify(rows.slice(0, 30))
        );
      } catch {
        /* ignore */
      }
    },
    [userId]
  );

  const fetchFeed = useCallback(async () => {
    if (!userId) return;
    const seq = ++fetchSeq.current;
    setFetchState("loading");
    try {
      const rows = await fetchNotificationsPage(userId);
      if (!mounted.current || seq !== fetchSeq.current) return;
      setNotifications(rows);
      cacheWrite(rows);
      setFetchState("ready");
    } catch {
      if (!mounted.current || seq !== fetchSeq.current) return;
      setFetchState("error");
    } finally {
      if (mounted.current && seq === fetchSeq.current) setLoading(false);
    }
  }, [userId, cacheWrite]);

  // Seed from cache, then fetch
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setFetchState("ready");
      return;
    }
    const cached = cacheRead();
    if (cached.length > 0) {
      setNotifications(cached);
      setLoading(false);
      setFetchState("ready");
    }
    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // -----------------------------------------------------------
  // Actions
  // -----------------------------------------------------------
  const bumpBusy = (id: string, on: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const markOne = async (id: string) => {
    const prev = notifications;
    const next = prev.map((n) => (n.id === id ? { ...n, is_read: true } : n));
    setNotifications(next);
    cacheWrite(next);
    bumpBusy(id, true);
    try {
      await markNotificationRead(id);
      tapSuccess();
      refreshBadge();
    } catch (e: any) {
      tapError();
      setNotifications(prev);
      cacheWrite(prev);
      toast.error(e?.message || "Failed to mark as read");
    } finally {
      bumpBusy(id, false);
    }
  };

  const markAll = async () => {
    if (!userId) return;
    const prev = notifications;
    const next = prev.map((n) => ({ ...n, is_read: true }));
    setNotifications(next);
    cacheWrite(next);
    try {
      await markAllRead(userId);
      tapSuccess();
      toast.success("All marked as read");
      refreshBadge();
    } catch (e: any) {
      tapError();
      setNotifications(prev);
      cacheWrite(prev);
      toast.error(e?.message || "Failed to mark all");
    }
  };

  const removeOne = async (id: string) => {
    const prev = notifications;
    const next = prev.filter((n) => n.id !== id);
    setNotifications(next);
    cacheWrite(next);
    if (selected?.id === id) setSelected(null);
    bumpBusy(id, true);
    try {
      await apiDeleteNotification(id);
      tapSuccess();
      refreshBadge();
    } catch (e: any) {
      tapError();
      setNotifications(prev);
      cacheWrite(prev);
      toast.error(e?.message || "Failed to delete");
    } finally {
      bumpBusy(id, false);
    }
  };

  const handleClick = (n: NotificationRow) => {
    tap();
    setSelected(n);
    if (!n.is_read) markOne(n.id);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------
  return (
    <>
      <div className="fixed inset-0 flex flex-col bg-transparent">
        {/* Header */}
        <header className="shrink-0 bg-transparent backdrop-blur-xl border-b border-slate-200/70 dark:border-white/[0.06] z-30">
          <div className="flex items-center gap-2 px-2 h-14">
            <button
              onClick={handleBack}
              className="h-10 w-10 rounded-full flex items-center justify-center active:bg-slate-100 dark:active:bg-white/5 text-slate-900 dark:text-white"
              style={{ touchAction: "manipulation" }}
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">
                Notifications
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : notifications.length > 0
                    ? "All caught up"
                    : "Nothing yet"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => {
                  tap();
                  markAll();
                }}
                className="h-8 px-2.5 rounded-full bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 active:scale-[0.97] shrink-0"
                style={{ touchAction: "manipulation" }}
              >
                <CheckCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                Mark all
              </button>
            )}
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <div className="max-w-2xl mx-auto px-4 py-3 pb-24 space-y-2">
            {fetchState === "loading" && notifications.length === 0 && (
              <NotificationSkeleton />
            )}

            {fetchState === "error" && (
              <div className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center">
                <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-rose-500/10 flex items-center justify-center">
                  <RefreshCw
                    className="h-5 w-5 text-rose-500"
                    strokeWidth={2.5}
                  />
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Couldn't load notifications
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Check your connection and try again
                </p>
                <button
                  onClick={() => {
                    tap();
                    fetchFeed();
                  }}
                  className="mt-3 h-9 px-4 rounded-xl bg-violet-600 text-white text-xs font-bold active:scale-[0.97] inline-flex items-center gap-1.5"
                  style={{ touchAction: "manipulation" }}
                >
                  <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Retry
                </button>
              </div>
            )}

            {notifications.length > 0 && (
              <div className="space-y-2">
                {notifications.map((n) => {
                  const style = typeStyle(n.type);
                  const isBusy = busyIds.has(n.id);
                  return (
                    <div
                      key={n.id}
                      className={`rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden ${n.is_read ? "opacity-70" : ""
                        }`}
                    >
                      <button
                        onClick={() => handleClick(n)}
                        className="w-full flex items-center gap-3 p-3 text-left active:opacity-80"
                        style={{ touchAction: "manipulation" }}
                      >
                        <div
                          className={`h-10 w-10 shrink-0 rounded-full ${style.bg} ${style.color} flex items-center justify-center`}
                        >
                          {style.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider ${style.color}`}
                            >
                              {style.label}
                            </span>
                            {!n.is_read && (
                              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                            )}
                            <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                              {new Date(n.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                            {n.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {n.message}
                          </p>
                        </div>
                        <ChevronRight
                          className="h-4 w-4 text-slate-400 shrink-0"
                          strokeWidth={2.5}
                        />
                      </button>
                      <div className="border-t border-slate-100 dark:border-white/[0.04] grid grid-cols-2">
                        <button
                          onClick={() => markOne(n.id)}
                          disabled={n.is_read || isBusy}
                          className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 active:bg-slate-50 dark:active:bg-white/[0.03] disabled:opacity-40"
                          style={{ touchAction: "manipulation" }}
                        >
                          <CheckCheck
                            className="h-3.5 w-3.5"
                            strokeWidth={2.5}
                          />
                          {n.is_read ? "Read" : "Mark read"}
                        </button>
                        <button
                          onClick={() => removeOne(n.id)}
                          disabled={isBusy}
                          className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 active:bg-rose-500/5 disabled:opacity-50"
                          style={{ touchAction: "manipulation" }}
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {fetchState === "ready" && notifications.length === 0 && (
              <div className="rounded-2xl bg-white dark:bg-[#161b22] p-8 text-center">
                <div className="h-14 w-14 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center">
                  <Inbox className="h-6 w-6 text-slate-400" strokeWidth={2} />
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  You're all caught up
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  Notifications about quizzes, billing, and account activity
                  will appear here.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Detail modal */}
      <CenteredModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        maxWidthClass="max-w-md"
        maxHeight="90vh"
      >
        {selected &&
          (() => {
            const style = typeStyle(selected.type);
            const isBusy = busyIds.has(selected.id);
            return (
              <div className="px-4 pb-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${style.bg} ${style.color}`}
                  >
                    {style.icon}
                    {style.label}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {selected.message}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
                  <span>
                    {new Date(selected.created_at).toLocaleString([], {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      tap();
                      setSelected(null);
                    }}
                    className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-[12px] font-bold active:scale-[0.97]"
                    style={{ touchAction: "manipulation" }}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => removeOne(selected.id)}
                    disabled={isBusy}
                    className="flex-1 h-10 rounded-xl bg-rose-500 text-white text-[12px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] disabled:opacity-50"
                    style={{ touchAction: "manipulation" }}
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })()}
      </CenteredModal>
    </>
  );
}