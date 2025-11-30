"use client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { useSidebar } from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Newspaper, Home, Brain, MessageCircle, MessageSquare,
  Calendar, TrendingUp, Heart, Play, BookOpen, FileText,
  Video, Bell, Settings, CreditCard, Users, Star,
  Network, CalendarDays, Briefcase, PenTool
} from "lucide-react";

interface BottomBarProps {
  userRole: 'student' | 'tutor' | 'staff';
  unreadCount: number;
  unreadAnnouncements: number;
}

export function BottomBar({ userRole, unreadCount, unreadAnnouncements }: BottomBarProps) {
  const { state } = useSidebar();
  const isSidebarOpen = state !== "collapsed";
  const location = useLocation();

  const allItems = [
    { title: "Feed", url: "/feed", icon: Newspaper },
   
    { title: "AI Study Assistant", url: "/ai-assistant", icon: Brain },
    { title: "Chat Room", url: "/chat", icon: MessageCircle },
    { title: "Forum", url: "/forum", icon: MessageSquare },
    { title: "Assessment Calendar", url: "/calendar", icon: Calendar },
    { title: "Study Progress", url: "/progress", icon: TrendingUp },
    { title: "Medrae Quizzes Bank", url: "/Medrae-quizzes", icon: Heart },
    { title: "NCK Simulation", url: "/simulation/candidate", icon: Play },
     { title: "Dashboard", url: `/dashboard/${userRole}`, icon: Home },
    { title: "Assessment Notes", url: "/assessment-notes", icon: BookOpen },
    { title: "Notes & Resources Bank", url: "/resources", icon: FileText },
    { title: "MedTube", url: "/medtube", icon: Play },
    { title: "Reels", url: "/reels", icon: Video },
    ...(userRole === "tutor" ? [
      { title: "Student Analytics", url: "/analytics", icon: Users },
      { title: "Create Content", url: "/create", icon: BookOpen },
      { title: "Earnings", url: "/earnings", icon: Star },
    ] : []),
    ...(userRole === "staff" ? [
      { title: "Knowledge Feed", url: "/knowledge", icon: Network },
      { title: "Post Videos", url: "/post-videos", icon: Video },
      { title: "Events & Seminars", url: "/events", icon: CalendarDays },
      { title: "Job Board", url: "/jobs", icon: Briefcase },
      { title: "Write Articles", url: "/articles", icon: PenTool },
    ] : []),
    { title: "Announcements", url: "/announcements", icon: Bell },
    { title: "Settings", url: "/settings", icon: Settings },
    { title: "Subscription", url: "/subscription", icon: CreditCard },
  ];

  const getNavClass = (path: string) =>
    location.pathname === path
      ? "text-primary"
      : "text-muted-foreground hover:text-foreground";



return (
  <div className={`${isSidebarOpen ? 'hidden' : ''} fixed bottom-0 left-0 right-0 h-12 bg-background shadow-t flex justify-around items-center z-50 border-t border-border overflow-visible`}>
    {allItems.map((item) => (
      <div key={item.title} className="group relative flex flex-col items-center justify-center w-10 h-10">
        <Link
          to={item.url}
          className={`flex items-center justify-center w-full h-full ${getNavClass(item.url)}`}
        >
          <item.icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
          {(item.title === "Chat Room" && unreadCount > 0) && (
            <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 text-xs">{unreadCount}</Badge>
          )}
          {(item.title === "Announcements" && unreadAnnouncements > 0) && (
            <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 text-xs">{unreadAnnouncements}</Badge>
          )}
        </Link>

        {/* Brain-map popup label */}
        <span className="absolute bottom-full mb-2 px-2 py-1 rounded bg-black text-white text-xs opacity-0 translate-y-1 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-200 whitespace-nowrap pointer-events-none z-50">
          {item.title}
        </span>
      </div>
    ))}
  </div>
);

}
