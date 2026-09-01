"use client";

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Compass, Brain, Heart, Calendar, ChevronDown, FileText, Home,
  MessageCircle, MessageSquare, Play, Settings, Star, TrendingUp,
  Users, Video, CreditCard, Bell, MessageSquareX, BookOpen, GraduationCap,
  Briefcase, CalendarDays, PenTool, Network, AlertCircle, Newspaper,
  BarChart3, Swords, ShoppingBag, Share2,
  BookOpenCheck,
  Upload
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar, toggleSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
// IMPORT THE ROLE CONTEXT
import { useUserRole } from "@/context/UserRoleContext";

interface AppSidebarProps {
  userRole?: 'student' | 'tutor' | 'staff'; // Make it optional since we'll use context
}

type IconTone = "neutral" | "ai" | "learning" | "progress" | "practice" | "alert"
  | "communication" | "media" | "finance" | "system" | "people" | "content";

const ICON_TONE_STYLES: Record<IconTone, { box: string; icon: string }> = {
  neutral: {
    box: "bg-slate-100 dark:bg-slate-800",
    icon: "text-slate-700 dark:text-slate-200"
  },
  ai: {
    box: "bg-purple-200 dark:bg-purple-800/60",
    icon: "text-purple-700 dark:text-purple-300"
  },
  learning: {
    box: "bg-blue-200 dark:bg-blue-800/60",
    icon: "text-blue-700 dark:text-blue-300"
  },
  progress: {
    box: "bg-emerald-200 dark:bg-emerald-800/60",
    icon: "text-emerald-700 dark:text-emerald-300"
  },
  practice: {
    box: "bg-rose-200 dark:bg-rose-800/60",
    icon: "text-rose-700 dark:text-rose-300"
  },
  alert: {
    box: "bg-amber-200 dark:bg-amber-800/60",
    icon: "text-amber-700 dark:text-amber-300"
  },
  communication: {
    box: "bg-cyan-200 dark:bg-cyan-800/60",
    icon: "text-cyan-700 dark:text-cyan-300"
  },
  media: {
    box: "bg-violet-200 dark:bg-violet-800/60",
    icon: "text-violet-700 dark:text-violet-300"
  },
  finance: {
    box: "bg-emerald-200 dark:bg-emerald-800/60",
    icon: "text-emerald-700 dark:text-emerald-300"
  },
  system: {
    box: "bg-gray-200 dark:bg-gray-700",
    icon: "text-gray-700 dark:text-gray-300"
  },
  people: {
    box: "bg-indigo-200 dark:bg-indigo-800/60",
    icon: "text-indigo-700 dark:text-indigo-300"
  },
  content: {
    box: "bg-indigo-200 dark:bg-indigo-800/60",
    icon: "text-indigo-700 dark:text-indigo-300"
  },
};

// Cache keys with 1-hour duration (counts rarely change)
const CACHE_PREFIX = "sidebar_cache_";
const MISTAKE_COUNT_KEY = `${CACHE_PREFIX}mistake_count`;
const STARS_KEY = `${CACHE_PREFIX}stars`;
const COUNTS_KEY = `${CACHE_PREFIX}counts`;
const ANNOUNCEMENTS_KEY = `${CACHE_PREFIX}announcements`;

// Request deduplication
let fetchInProgress = false;
let lastFetchTime = 0;
// 12 hours in milliseconds = 12 * 60 * 60 * 1000 = 43,200,000
// Data stays "fresh" for 2 minutes, then updates in background
const CACHE_DURATION = 120000;
const MIN_FETCH_INTERVAL = 5000; // Prevent spamming (5 seconds)
// Cache helpers
const getCached = (key: string) => {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      return parsed.data; // Return the value directly
    }
  } catch (e) { }
  return null;
};

const setCached = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) { }
};

// Memoized Menu Item Component
const MenuItem = memo(({
  item,
  isActive,
  isCollapsed,
  tone,
  badge,
  onClick
}: {
  item: any;
  isActive: boolean;
  isCollapsed: boolean;
  tone: IconTone;
  badge?: string | number;
  onClick: () => void;
}) => {
  const styles = ICON_TONE_STYLES[tone];

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <button
          className={`w-full ${isActive ? "bg-primary/10 text-primary border-r-2 border-primary font-medium" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"} transition-colors duration-150`}
          onClick={onClick}
          style={{ touchAction: 'manipulation' }}
        >
          <div className={`flex-shrink-0 mr-2 p-1.5 rounded-md ${styles.box}`}>
            <item.icon className={`${isCollapsed ? "h-6 w-6" : "h-5 w-5"} ${styles.icon}`} />
          </div>
          {!isCollapsed && (
            <div className="flex items-center justify-between w-full">
              <span>{item.title}</span>
              {badge && (
                <Badge variant="secondary" className="ml-auto h-5 text-xs">
                  {badge}
                </Badge>
              )}
            </div>
          )}
        </button>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
});

MenuItem.displayName = "MenuItem";

// Memoized Section Component
const SidebarSection = memo(({
  label,
  items,
  openGroups,
  toggleGroup,
  isCollapsed,
  isActiveFn,
  onNavigate,
  groupId
}: {
  label: string;
  items: any[];
  openGroups: string[];
  toggleGroup: (id: string) => void;
  isCollapsed: boolean;
  isActiveFn: (url: string) => boolean;
  onNavigate: (url: string) => void;
  groupId: string;
}) => {
  if (items.length === 0) return null;

  return (
    <SidebarGroup>
      <Collapsible open={openGroups.includes(groupId)} onOpenChange={() => toggleGroup(groupId)}>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="group/label hover:bg-muted/50 rounded-md p-2 cursor-pointer">
            {label}
            {!isCollapsed && (
              <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/label:rotate-180" />
            )}
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <MenuItem
                  key={item.title}
                  item={item}
                  isActive={isActiveFn(item.url)}
                  isCollapsed={isCollapsed}
                  tone={item.iconTone || "neutral"}
                  badge={item.badge}
                  onClick={() => onNavigate(item.url)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
});

SidebarSection.displayName = "SidebarSection";

// Custom icons
const QuizzesHeartIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const HomeFilledIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 3l10 9h-3v9h-6v-6H11v6H5v-9H2l10-9z" />
  </svg>
);

const PlayFilledIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M4 2v20l18-10L4 2z" />
  </svg>
);

export function AppSidebar({ userRole: propUserRole }: AppSidebarProps) {
  // GET ROLE FROM CONTEXT
  const { role: contextRole } = useUserRole();

  // Use context role if available, otherwise fallback to prop
  const userRole = (contextRole || propUserRole || 'student') as 'student' | 'tutor' | 'staff';

  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  const [openGroups, setOpenGroups] = useState<string[]>(['main', 'learning', 'institutional', 'tutor', 'nck-exam-prep']);
  const [windowWidth, setWindowWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));

  // Cached state (initialized from localStorage)
  const [mistakeCount, setMistakeCount] = useState<number>(() => getCached(MISTAKE_COUNT_KEY) || 0);
  const [totalQuestions, setTotalQuestions] = useState<number>(() => getCached(COUNTS_KEY)?.totalQuestions || 0);
  const [totalSimulationPapers, setTotalSimulationPapers] = useState<number>(() => getCached(COUNTS_KEY)?.totalSimulationPapers || 0);
  const [totalNotes, setTotalNotes] = useState<number>(() => getCached(COUNTS_KEY)?.totalNotes || 0);
  const [totalVideos, setTotalVideos] = useState<number>(() => getCached(COUNTS_KEY)?.totalVideos || 0);
  const [totalStars, setTotalStars] = useState<number>(() => getCached(STARS_KEY) || 0);
  const [totalEvents, setTotalEvents] = useState<number>(() => getCached(COUNTS_KEY)?.totalEvents || 0);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState<number>(() => getCached(ANNOUNCEMENTS_KEY) || 0);

  const isMounted = useRef(true);
  const resizeDebounce = useRef<NodeJS.Timeout>();

  const isCollapsed = state === 'collapsed' || (windowWidth >= 1024 && state === 'collapsed');
  const isFooterMounted = windowWidth < 768;

  const footerRoutes = [`/dashboard/${userRole}`, "/Medrae-quizzes", "/my-mistakes", "/progress", "/assessments", "/assessments/history"];

  // Format number helper
  const formatNumber = useCallback((num: number): string => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(0) + "k";
    return num.toString();
  }, []);

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  const handleNavigate = useCallback((url: string) => {
    if (navigator.vibrate) navigator.vibrate(50);
    if (windowWidth < 1024) toggleSidebar();
    navigate(url);
  }, [navigate, toggleSidebar, windowWidth]);

  const toggleGroup = useCallback((group: string) => {
    setOpenGroups(prev => prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]);
  }, []);

  // ✅ OPTIMIZED: Batch fetch all counts in a SINGLE operation with head:true
  // ✅ FULLY OPTIMIZED fetchAllData function
  const fetchAllData = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;

    const now = Date.now();

    // 1. Show cached data immediately so UI is fast
    const cachedMistakes = getCached(MISTAKE_COUNT_KEY);
    const cachedCounts = getCached(COUNTS_KEY);
    const cachedStars = getCached(STARS_KEY);
    const cachedAnnouncements = getCached(ANNOUNCEMENTS_KEY);

    if (cachedMistakes !== null) setMistakeCount(cachedMistakes);
    if (cachedStars !== null) setTotalStars(cachedStars);
    if (cachedAnnouncements !== null) setUnreadAnnouncements(cachedAnnouncements);
    if (cachedCounts) {
      setTotalQuestions(cachedCounts.totalQuestions || 0);
      setTotalSimulationPapers(cachedCounts.totalSimulationPapers || 0);
      setTotalNotes(cachedCounts.totalNotes || 0);
      setTotalVideos(cachedCounts.totalVideos || 0);
      setTotalEvents(cachedCounts.totalEvents || 0);
    }

    // 2. Only skip the database call if we fetched very recently
    if (!forceRefresh && (now - lastFetchTime < MIN_FETCH_INTERVAL)) {
      return;
    }

    if (fetchInProgress) return;

    fetchInProgress = true;
    lastFetchTime = now;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        fetchInProgress = false;
        return;
      }

      // ✅ Fetch fresh counts from Supabase
      const [
        mistakesResult,
        questionsResult,
        simResult,
        notesResult,
        videosResult,
        eventsResult,
        quizResults,
        announcementsResult
      ] = await Promise.allSettled([
        supabase.from("user_mistakes").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("resolved", false),
        supabase.from("quiz_questions").select("*", { count: "exact", head: true }),
        supabase.from("simulation_papers").select("*", { count: "exact", head: true }),
        supabase.from("notes").select("*", { count: "exact", head: true }),
        supabase.from("medtube_videos").select("*", { count: "exact", head: true }),
        supabase.from("calendar_events").select("*", { count: "exact", head: true }),
        supabase.from("quiz_results").select("unit, score, total_questions", { head: false }).eq("user_id", user.id).limit(100),
        supabase.from("announcements").select("id", { count: "exact", head: true }).eq("is_published", true)
      ]);

      // Extract results
      const mistakesCount = mistakesResult.status === 'fulfilled' ? mistakesResult.value.count || 0 : 0;
      const questionsCount = questionsResult.status === 'fulfilled' ? questionsResult.value.count || 0 : 0;
      const simCount = simResult.status === 'fulfilled' ? simResult.value.count || 0 : 0;
      const notesCount = notesResult.status === 'fulfilled' ? notesResult.value.count || 0 : 0;
      const videosCount = videosResult.status === 'fulfilled' ? videosResult.value.count || 0 : 0;
      const eventsCount = eventsResult.status === 'fulfilled' ? eventsResult.value.count || 0 : 0;
      const announcementsCount = announcementsResult.status === 'fulfilled' ? announcementsResult.value.count || 0 : 0;

      let stars = 0;
      if (quizResults.status === 'fulfilled' && quizResults.value?.data) {
        // Group by unit and find the best percentage score per unit
        const unitBestScores: Record<string, number> = {};

        quizResults.value.data.forEach(r => {
          if (r?.score && r?.total_questions && r.score > 0 && r.total_questions > 0) {
            const percent = (r.score / r.total_questions) * 100;
            const unit = r.unit;

            if (!unitBestScores[unit] || percent > unitBestScores[unit]) {
              unitBestScores[unit] = percent;
            }
          }
        });

        // Award stars based on percentage thresholds
        stars = Object.values(unitBestScores).reduce((total, percent) => {
          if (percent >= 90) return total + 5;
          if (percent >= 75) return total + 4;
          if (percent >= 60) return total + 3;
          if (percent >= 45) return total + 2;
          if (percent >= 30) return total + 1;
          return total;
        }, 0);
      }

      const readIds = JSON.parse(localStorage.getItem("readAnnouncements") || "[]");
      const unread = Math.max(0, announcementsCount - readIds.length);

      const counts = {
        totalQuestions: questionsCount,
        totalSimulationPapers: simCount,
        totalNotes: notesCount,
        totalVideos: videosCount,
        totalEvents: eventsCount
      };

      if (isMounted.current) {
        setMistakeCount(mistakesCount);
        setTotalQuestions(counts.totalQuestions);
        setTotalSimulationPapers(counts.totalSimulationPapers);
        setTotalNotes(counts.totalNotes);
        setTotalVideos(counts.totalVideos);
        setTotalEvents(counts.totalEvents);
        setTotalStars(stars);
        setUnreadAnnouncements(unread);

        // Update Cache
        setCached(COUNTS_KEY, counts);
        setCached(MISTAKE_COUNT_KEY, mistakesCount);
        setCached(STARS_KEY, stars);
        setCached(ANNOUNCEMENTS_KEY, unread);
      }
    } catch (err) {
      console.error("Error fetching sidebar data:", err);
    } finally {
      fetchInProgress = false;
    }
  }, []);

  // Initial load and visibility refresh
  useEffect(() => {
    isMounted.current = true;

    // Always fetch fresh data on refresh
    fetchAllData(true);

    const handleVisibilityChange = () => {
      if (!document.hidden && isMounted.current) {
        fetchAllData(false); // Check if data is old when returning to tab
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      isMounted.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchAllData]);

  // Optimized resize handler
  useEffect(() => {
    const handleResize = () => {
      if (resizeDebounce.current) clearTimeout(resizeDebounce.current);
      resizeDebounce.current = setTimeout(() => {
        setWindowWidth(window.innerWidth);
      }, 150);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeDebounce.current) clearTimeout(resizeDebounce.current);
    };
  }, []);

  const handleAnnouncementsClick = useCallback(() => {
    setUnreadAnnouncements(0);
    // Update cache immediately
    setCached(ANNOUNCEMENTS_KEY, 0);
    handleNavigate("/announcements");
  }, [handleNavigate]);

  // 🔥 UPDATED: Memoized menu items with dynamic role from context
  const mainItems = useMemo(() => [
    { title: "My Dashboard", url: `/dashboard/${userRole}`, icon: (props: any) => <HomeFilledIcon {...props} />, iconTone: "neutral" as IconTone },
    { title: "Nursing Compass", url: "/nursing", icon: BookOpenCheck, iconTone: "learning" as IconTone },
    { title: "Feed Page", url: "/feed", icon: Newspaper, iconTone: "content" as IconTone },
    { title: "Nurse Duel (N.D)", url: "/challenge", icon: Swords, iconTone: "practice" as IconTone },
    { title: "My Mistakes", url: "/my-mistakes", icon: AlertCircle, iconTone: "alert" as IconTone, badge: mistakeCount > 0 ? mistakeCount : undefined },
    { title: "AI Study", url: "/ai-assistant", icon: Brain, iconTone: "ai" as IconTone },
    { title: "Survival Hub", url: "/survival-hub", icon: Compass, iconTone: "learning" as IconTone },
  ], [userRole, mistakeCount]);

  // 🔥 NEW: NCK Exam Prep Items - dedicated section for assessment/prep
  const nckExamPrepItems = useMemo(() => [

    {
      title: "Prep Quizzes Bank",
      url: "/Medrae-quizzes",
      icon: QuizzesHeartIcon,
      iconTone: "practice" as IconTone,
      badge: formatNumber(totalQuestions)
    },
    {
      title: "NCK Progress",
      url: "/progress",
      icon: TrendingUp,
      iconTone: "progress" as IconTone,
      badge: `${totalStars}★`
    },
    {
      title: "Proctorium Lite",
      url: "/simulation/candidate",
      icon: PlayFilledIcon,
      iconTone: "practice" as IconTone,
      badge: formatNumber(totalSimulationPapers)
    },
  ], [totalQuestions, totalStars, totalSimulationPapers, formatNumber]);

  // 🔥 UPDATED: Learning items - now excludes assessment/prep items
  const learningItems = useMemo(() => [
    { title: "Clinical Assessments", url: "/assessments", icon: Brain, iconTone: "practice" as IconTone, badge: "New" },
    { title: "Assessment History", url: "/assessments/history", icon: BarChart3, iconTone: "progress" as IconTone },
    { title: "Live Classes", url: "/live-classes", icon: Video, iconTone: "learning" as IconTone },
    { title: "My Classes", url: "/my-classes", icon: Calendar, iconTone: "learning" as IconTone },
    { title: "Create Class", url: "/live-classes/create", icon: Video, iconTone: "learning" as IconTone },
    { title: "Assessment Notes", url: "/assessment-notes", icon: BookOpen, iconTone: "learning" as IconTone },
    { title: "Resources Bank", url: "/resources", icon: FileText, iconTone: "content" as IconTone, badge: formatNumber(totalNotes) },
    { title: "Assessment Date", url: "/calendar", icon: Calendar, iconTone: "learning" as IconTone, badge: `${totalEvents}E` },
  ], [totalNotes, totalEvents, formatNumber]);

  // 🔥 UPDATED: Institutional exam items with dynamic role
  const institutionalExamItems = useMemo(() => {
    if (userRole === "student") {
      return [
        { title: "Candidate Exams", url: "/exam/candidate", icon: GraduationCap, iconTone: "learning" as IconTone },
        { title: "Exam Results", url: "/exam/results", icon: BarChart3, iconTone: "progress" as IconTone },
      ];
    }
    if (userRole === "tutor") {
      return [
        { title: "Tutor Exams", url: "/tutor/exams", icon: GraduationCap, iconTone: "learning" as IconTone },
        { title: "Exam Results", url: "/tutor/exams/:paper_id/results", icon: BarChart3, iconTone: "progress" as IconTone },
      ];
    }
    return [];
  }, [userRole]);

  const mediaItems = useMemo(() => [
    { title: "MedTube", url: "/medtube", icon: PlayFilledIcon, iconTone: "media" as IconTone, badge: totalVideos ? formatNumber(totalVideos) : undefined },
  ], [totalVideos, formatNumber]);

  // 🔥 UPDATED: Tutor items with dynamic role
  const tutorItems = useMemo(() => userRole === "tutor" ? [
    { title: "Student Analytics", url: "/analytics", icon: Users, iconTone: "people" as IconTone },
  ] : [], [userRole]);

  // 🔥 UPDATED: Staff items with dynamic role
  const staffItems = useMemo(() => userRole === "staff" ? [
    { title: "Events & Seminars", url: "/events", icon: CalendarDays, iconTone: "learning" as IconTone },
    { title: "Job Board", url: "/jobs", icon: Briefcase, iconTone: "people" as IconTone },
    { title: "Write Articles", url: "/articles", icon: PenTool, iconTone: "content" as IconTone },
  ] : [], [userRole]);

  const otherItems = useMemo(() => [
    { title: "NursMartt", url: "/market", icon: (props: any) => <img src="/Nurvia_logo.png" alt="Nurvia Logo" className={`${props.className} object-contain bg-transparent`} loading="lazy" />, iconTone: "neutral" as IconTone },
    { title: "Announcements", url: "/announcements", icon: Bell, iconTone: "alert" as IconTone, onClick: handleAnnouncementsClick },
    { title: "Help Center", url: "/help", icon: MessageCircle, iconTone: "communication" as IconTone },
    { title: "Feedback Box", url: "/feedback", icon: MessageSquareX, iconTone: "communication" as IconTone },
    { title: "Settings", url: "/settings", icon: Settings, iconTone: "system" as IconTone },
    { title: "Subscription", url: "/subscription", icon: CreditCard, iconTone: "finance" as IconTone },
    { title: "GroupPay", url: "/grouppay", icon: Users, iconTone: "practice" as IconTone, badge: "New" }, // ✅ ADDED

  ], [handleAnnouncementsClick]);

  const visibleMainItems = isFooterMounted ? mainItems.filter(item => !footerRoutes.includes(item.url)) : mainItems;
  const visibleLearningItems = isFooterMounted ? learningItems.filter(item => !footerRoutes.includes(item.url)) : learningItems;
  const visibleNckPrepItems = isFooterMounted ? nckExamPrepItems.filter(item => !footerRoutes.includes(item.url)) : nckExamPrepItems;

  return (
    <Sidebar className="fixed top-0 left-0 h-full z-50 bg-background shadow-lg transition-transform duration-300 w-64 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center">
            <img src="/pwa-192x192.jpeg" alt="Logo" className="h-full w-full object-cover" loading="lazy" />
          </div>
          {!isCollapsed && (
            <div>
              <div className="text-sm font-bold tracking-wide flex items-center gap-1">
                <span className="text-red-500">MEDRAE</span>
                <span className="text-gray-900 dark:text-white">NURSING</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Kenya Nursing Network Platform (KNN)</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent className="px-2 overflow-y-auto hide-scrollbar">
        {/* Main Section */}
        <SidebarSection
          label="Main"
          items={visibleMainItems}
          openGroups={openGroups}
          toggleGroup={toggleGroup}
          isCollapsed={isCollapsed}
          isActiveFn={isActive}
          onNavigate={handleNavigate}
          groupId="main"
        />

        {/* Institutional Exams Section */}
        <SidebarSection
          label="Institutional Exams"
          items={institutionalExamItems}
          openGroups={openGroups}
          toggleGroup={toggleGroup}
          isCollapsed={isCollapsed}
          isActiveFn={isActive}
          onNavigate={handleNavigate}
          groupId="institutional"
        />

        {/* 🆕 NCK Exam Prep Section */}
        <SidebarSection
          label="NCK Exam Prep"
          items={visibleNckPrepItems}
          openGroups={openGroups}
          toggleGroup={toggleGroup}
          isCollapsed={isCollapsed}
          isActiveFn={isActive}
          onNavigate={handleNavigate}
          groupId="nck-exam-prep"
        />

        {/* Tutor Tools Section */}
        {tutorItems.length > 0 && (
          <SidebarSection
            label="Tutor Tools"
            items={tutorItems}
            openGroups={openGroups}
            toggleGroup={toggleGroup}
            isCollapsed={isCollapsed}
            isActiveFn={isActive}
            onNavigate={handleNavigate}
            groupId="tutor"
          />
        )}

        {/* Learning Section - Updated (without prep items) */}
        <SidebarSection
          label="Learning"
          items={visibleLearningItems}
          openGroups={openGroups}
          toggleGroup={toggleGroup}
          isCollapsed={isCollapsed}
          isActiveFn={isActive}
          onNavigate={handleNavigate}
          groupId="learning"
        />

        {/* Media Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="group/label hover:bg-muted/50 rounded-md p-2">
            Media
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mediaItems.map((item) => (
                <MenuItem
                  key={item.title}
                  item={item}
                  isActive={isActive(item.url)}
                  isCollapsed={isCollapsed}
                  tone={item.iconTone || "neutral"}
                  badge={item.badge}
                  onClick={() => handleNavigate(item.url)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Staff Tools Section */}
        {staffItems.length > 0 && (
          <SidebarSection
            label="Staff Tools"
            items={staffItems}
            openGroups={openGroups}
            toggleGroup={toggleGroup}
            isCollapsed={isCollapsed}
            isActiveFn={isActive}
            onNavigate={handleNavigate}
            groupId="staff"
          />
        )}

        {/* Other Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {otherItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <button
                      className={`w-full ${isActive(item.url) ? "bg-primary/10 text-primary border-r-2 border-primary font-medium" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"} transition-colors duration-150`}
                      onClick={() => item.onClick ? item.onClick() : handleNavigate(item.url)}
                      style={{ touchAction: 'manipulation' }}
                    >
                      <div className={`flex-shrink-0 mr-2 p-1.5 rounded-md ${ICON_TONE_STYLES[item.iconTone || "neutral"].box}`}>
                        <item.icon className={`${isCollapsed ? "h-6 w-6" : "h-5 w-5"} ${ICON_TONE_STYLES[item.iconTone || "neutral"].icon}`} />
                      </div>
                      {!isCollapsed && (
                        <div className="flex items-center w-full">
                          <span>{item.title}</span>
                          {item.title === "Announcements" && unreadAnnouncements > 0 && (
                            <Badge variant="secondary" className="ml-auto h-5 text-xs">
                              {unreadAnnouncements}
                            </Badge>
                          )}
                        </div>
                      )}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto py-6 text-center select-none border-t border-slate-100 dark:border-slate-900/40">
        <p className="text-[6px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 opacity-60">
          MEDRAE • ALL RIGHTS RESERVED • CLINICAL INTEGRITY
        </p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <Link to="/privacy" className="text-[8px] font-bold text-slate-500 hover:text-blue-600 dark:text-slate-600 dark:hover:text-blue-400 transition-colors uppercase tracking-widest font-mono">
            Privacy
          </Link>
          <span className="h-1 w-1 rounded-full bg-slate-200 dark:bg-slate-800" />
          <Link to="/terms" className="text-[8px] font-bold text-slate-500 hover:text-blue-600 dark:text-slate-600 dark:hover:text-blue-400 transition-colors uppercase tracking-widest font-mono">
            Terms
          </Link>
        </div>
        <div className="mt-4 flex flex-col gap-0.5">
          <p className="text-[6px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-600 opacity-40 font-medium">
            STUDY PURPOSES ONLY
          </p>
          <p className="text-[5px] uppercase tracking-[0.1em] text-slate-300 dark:text-slate-700 font-bold">
            SYSTEM BUILD V2.4.0_STABLE
          </p>
        </div>
      </div>
    </Sidebar>
  );
}