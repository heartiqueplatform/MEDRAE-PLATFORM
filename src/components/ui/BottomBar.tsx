"use client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Newspaper, Home, Brain, MessageSquare,
  Calendar, TrendingUp, Heart, Play, BookOpen, FileText,
  Video, Bell, Settings, CreditCard, Users, Star,
  Network, CalendarDays, Briefcase, PenTool, AlertCircle
} from "lucide-react";

interface BottomBarProps {
  userRole: 'student' | 'tutor' | 'staff';
  unreadCount: number;
  unreadAnnouncements: number;
  mistakeCount: number;
}
type IconTone =
  | "neutral"
  | "ai"
  | "learning"
  | "progress"
  | "practice"
  | "alert"
  | "communication"
  | "media"
  | "finance"
  | "system"
  | "people"
  | "content";

const ICON_TONE_STYLES: Record<
  IconTone,
  { box: { light: string; dark: string }; icon: { light: string; dark: string } }
> = {
  neutral: { box: { light: "bg-slate-100", dark: "bg-slate-800" }, icon: { light: "text-slate-700", dark: "text-slate-200" } },
  ai: { box: { light: "bg-purple-200", dark: "bg-purple-800" }, icon: { light: "text-purple-700", dark: "text-purple-300" } },
  learning: { box: { light: "bg-blue-200", dark: "bg-blue-800" }, icon: { light: "text-blue-700", dark: "text-blue-300" } },
  progress: { box: { light: "bg-emerald-200", dark: "bg-emerald-800" }, icon: { light: "text-emerald-700", dark: "text-emerald-300" } },
  practice: { box: { light: "bg-rose-200", dark: "bg-rose-800" }, icon: { light: "text-rose-700", dark: "text-rose-300" } },
  alert: { box: { light: "bg-amber-200", dark: "bg-amber-800" }, icon: { light: "text-amber-700", dark: "text-amber-300" } },
  communication: { box: { light: "bg-cyan-200", dark: "bg-cyan-800" }, icon: { light: "text-cyan-700", dark: "text-cyan-300" } },
  media: { box: { light: "bg-violet-200", dark: "bg-violet-800" }, icon: { light: "text-violet-700", dark: "text-violet-300" } },
  finance: { box: { light: "bg-emerald-200", dark: "bg-emerald-800" }, icon: { light: "text-emerald-700", dark: "text-emerald-300" } },
  system: { box: { light: "bg-gray-200", dark: "bg-gray-700" }, icon: { light: "text-gray-700", dark: "text-gray-300" } },
  people: { box: { light: "bg-indigo-200", dark: "bg-indigo-800" }, icon: { light: "text-indigo-700", dark: "text-indigo-300" } },
  content: { box: { light: "bg-indigo-200", dark: "bg-indigo-800" }, icon: { light: "text-indigo-700", dark: "text-indigo-300" } },
};

export function BottomBar({ userRole, unreadCount, unreadAnnouncements, mistakeCount }: BottomBarProps) {
  const { state } = useSidebar();
  const isSidebarOpen = state !== "collapsed";
  const location = useLocation();
  const allItems = [
    { title: "Feed", url: "/feed", icon: Newspaper, iconTone: "content" },
    { title: "AI Study Assistant", url: "/ai-assistant", icon: Brain, iconTone: "ai", badge: "New" },
    { title: "Forum", url: "/forum", icon: MessageSquare, iconTone: "communication" },
    { title: "Assessment Calendar", url: "/calendar", icon: Calendar, iconTone: "learning" },
    { title: "Study Progress", url: "/progress", icon: TrendingUp, iconTone: "progress" },
    { title: "Medrae Quizzes Bank", url: "/Medrae-quizzes", icon: Heart, iconTone: "practice" },
    { title: "NCK Simulation", url: "/simulation/candidate", icon: Play, iconTone: "practice" },
    { title: "Dashboard", url: `/dashboard/${userRole}`, icon: Home, iconTone: "neutral" },

    // Added My Mistakes here
    { title: "My Mistakes", url: "/my-mistakes", icon: AlertCircle, iconTone: "alert", badge: mistakeCount > 0 ? mistakeCount : undefined },

    { title: "Assessment Notes", url: "/assessment-notes", icon: BookOpen, iconTone: "learning" },
    { title: "Notes & Resources Bank", url: "/resources", icon: FileText, iconTone: "content" },
    { title: "MedTube", url: "/medtube", icon: Play, iconTone: "media" },

    ...(userRole === "tutor" ? [
      { title: "Student Analytics", url: "/analytics", icon: Users, iconTone: "people" },
      { title: "Create Content", url: "/create", icon: BookOpen, iconTone: "content" },
      { title: "Earnings", url: "/earnings", icon: Star, iconTone: "finance" },
    ] : []),
    ...(userRole === "staff" ? [
      { title: "Knowledge Feed", url: "/knowledge", icon: Network, iconTone: "content" },
      { title: "Post Videos", url: "/post-videos", icon: Video, iconTone: "media" },
      { title: "Events & Seminars", url: "/events", icon: CalendarDays, iconTone: "learning" },
      { title: "Job Board", url: "/jobs", icon: Briefcase, iconTone: "people" },
      { title: "Write Articles", url: "/articles", icon: PenTool, iconTone: "content" },
    ] : []),

    { title: "Announcements", url: "/announcements", icon: Bell, iconTone: "alert" },
    { title: "Settings", url: "/settings", icon: Settings, iconTone: "system" },
    { title: "Subscription", url: "/subscription", icon: CreditCard, iconTone: "finance" },
  ];

  const getNavClass = (path: string) =>
    location.pathname === path
      ? "text-primary"
      : "text-muted-foreground hover:text-foreground";

  return (
    <div className={`${isSidebarOpen ? 'hidden' : ''} fixed bottom-0 left-0 right-0 z-50`}>
      <div className="h-8 w-full relative group">
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-background shadow-t flex justify-around items-center border-t border-border transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          {allItems.map((item) => (
            <div key={item.title} className="relative flex flex-col items-center justify-center w-8 h-8">
              <Link
                to={item.url}
                className={`flex items-center justify-center w-full h-full ${getNavClass(item.url)}`}
              >
                <div
                  className={`
    flex-shrink-0 p-1.5 rounded-md
    ${ICON_TONE_STYLES[item.iconTone || "neutral"].box.light}
    dark:${ICON_TONE_STYLES[item.iconTone || "neutral"].box.dark}
  `}
                >
                  <item.icon
                    className={`
      h-5 w-5
      ${ICON_TONE_STYLES[item.iconTone || "neutral"].icon.light}
      dark:${ICON_TONE_STYLES[item.iconTone || "neutral"].icon.dark}
    `}
                  />
                </div>

                {/* Badges */}
                {(item.title === "Chat Room" && unreadCount > 0) && (
                  <Badge variant="secondary" className="absolute -top-1 -right-1 h-3 text-[10px]">{unreadCount}</Badge>
                )}
                {(item.title === "Announcements" && unreadAnnouncements > 0) && (
                  <Badge variant="secondary" className="absolute -top-1 -right-1 h-3 text-[10px]">{unreadAnnouncements}</Badge>
                )}
                {(item.title === "My Mistakes" && item.badge) && (
                  <Badge variant="secondary" className="absolute -top-1 -right-1 h-3 text-[10px]">{item.badge}</Badge>
                )}
              </Link>

              <span className="absolute bottom-full mb-2 px-2 py-1 rounded bg-black text-white text-[10px] opacity-0 translate-y-1 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-200 whitespace-nowrap pointer-events-none z-50">
                {item.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
