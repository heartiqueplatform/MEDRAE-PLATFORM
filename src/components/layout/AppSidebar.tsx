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
import { useUserRole } from "@/context/UserRoleContext";

interface AppSidebarProps {
  userRole?: 'student' | 'tutor' | 'staff';
}

type IconTone = "neutral" | "ai" | "learning" | "progress" | "practice" | "alert"
  | "communication" | "media" | "finance" | "system" | "people" | "content";

const ICON_TONE_STYLES: Record<IconTone, { box: string; icon: string }> = {
  neutral: {
    box: "bg-gradient-to-br from-slate-500 to-slate-700 shadow-sm shadow-slate-500/30",
    icon: "text-white"
  },
  ai: {
    box: "bg-gradient-to-br from-purple-500 to-purple-700 shadow-sm shadow-purple-500/30",
    icon: "text-white"
  },
  learning: {
    box: "bg-gradient-to-br from-blue-500 to-blue-700 shadow-sm shadow-blue-500/30",
    icon: "text-white"
  },
  progress: {
    box: "bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-sm shadow-emerald-500/30",
    icon: "text-white"
  },
  practice: {
    box: "bg-gradient-to-br from-rose-500 to-rose-700 shadow-sm shadow-rose-500/30",
    icon: "text-white"
  },
  alert: {
    box: "bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm shadow-amber-500/30",
    icon: "text-white"
  },
  communication: {
    box: "bg-gradient-to-br from-cyan-500 to-cyan-700 shadow-sm shadow-cyan-500/30",
    icon: "text-white"
  },
  media: {
    box: "bg-gradient-to-br from-violet-500 to-violet-700 shadow-sm shadow-violet-500/30",
    icon: "text-white"
  },
  finance: {
    box: "bg-gradient-to-br from-teal-500 to-teal-700 shadow-sm shadow-teal-500/30",
    icon: "text-white"
  },
  system: {
    box: "bg-gradient-to-br from-gray-500 to-gray-700 shadow-sm shadow-gray-500/30",
    icon: "text-white"
  },
  people: {
    box: "bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-sm shadow-indigo-500/30",
    icon: "text-white"
  },
  content: {
    box: "bg-gradient-to-br from-fuchsia-500 to-fuchsia-700 shadow-sm shadow-fuchsia-500/30",
    icon: "text-white"
  },
};

// Cache keys
const CACHE_PREFIX = "sidebar_cache_";
const MISTAKE_COUNT_KEY = `${CACHE_PREFIX}mistake_count`;
const STARS_KEY = `${CACHE_PREFIX}stars`;
const COUNTS_KEY = `${CACHE_PREFIX}counts`;
const ANNOUNCEMENTS_KEY = `${CACHE_PREFIX}announcements`;

let fetchInProgress = false;
let lastFetchTime = 0;
const CACHE_DURATION = 120000;
const MIN_FETCH_INTERVAL = 5000;

const getCached = (key: string) => {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      return parsed.data;
    }
  } catch (e) { }
  return null;
};

const setCached = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) { }
};

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
          className={`group w-full my-0.5 rounded-lg px-2 py-2 flex items-center gap-2.5
            ${isActive
              ? "bg-primary/10 text-primary font-semibold"
              : "hover:bg-muted/60 text-foreground/85 hover:text-foreground"
            } transition-all duration-150`}
          onClick={onClick}
          style={{ touchAction: 'manipulation' }}
        >
          <div
            className={`flex-shrink-0 flex items-center justify-center rounded-full
              ${isCollapsed ? "h-10 w-10" : "h-8 w-8"}
              ${styles.box} transition-transform duration-150 group-hover:scale-105`}
          >
            <item.icon
              className={`${isCollapsed ? "h-5 w-5" : "h-4 w-4"} ${styles.icon}`}
              strokeWidth={2.4}
            />
          </div>

          {!isCollapsed && (
            <div className="flex items-center justify-between w-full min-w-0">
              <span className="text-[14px] font-medium tracking-tight truncate">
                {item.title}
              </span>
              {badge !== undefined && badge !== null && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-[20px] px-1.5 text-[10px] font-bold rounded-full bg-primary/15 text-primary"
                >
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
    <SidebarGroup className="py-0.5">
      <Collapsible open={openGroups.includes(groupId)} onOpenChange={() => toggleGroup(groupId)}>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel
            className="group/label flex items-center gap-2 rounded-md px-3 py-1.5 mx-1
              text-[10px] font-bold uppercase tracking-[0.12em]
              text-muted-foreground/70 hover:text-foreground
              hover:bg-muted/50 cursor-pointer transition-colors"
          >
            {label}
            {!isCollapsed && (
              <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]/label:rotate-180" />
            )}
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0">
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
const QuizzesHeartIcon = ({ className = "h-5 w-5", ...props }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const HomeFilledIcon = ({ className = "h-6 w-6", ...props }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
    <path d="M12 3l10 9h-3v9h-6v-6H11v6H5v-9H2l10-9z" />
  </svg>
);

const PlayFilledIcon = ({ className = "h-5 w-5", ...props }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
    <path d="M4 2v20l18-10L4 2z" />
  </svg>
);

export function AppSidebar({ userRole: propUserRole }: AppSidebarProps) {
  const { role: contextRole } = useUserRole();
  const userRole = (contextRole || propUserRole || 'student') as 'student' | 'tutor' | 'staff';

  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  const [openGroups, setOpenGroups] = useState<string[]>(['main', 'learning', 'institutional', 'tutor', 'nck-exam-prep']);
  const [windowWidth, setWindowWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));

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

  // ✅ Role flags — single source of truth used everywhere below
  const isStudent = userRole === 'student';
  const isTutor = userRole === 'tutor';
  const isStaff = userRole === 'staff';

  const isCollapsed = state === 'collapsed' || (windowWidth >= 1024 && state === 'collapsed');
  const isFooterMounted = windowWidth < 768;

  const footerRoutes = [`/dashboard/${userRole}`, "/Medrae-quizzes", "/my-mistakes", "/progress", "/assessments", "/assessments/history"];

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

  const fetchAllData = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;

    const now = Date.now();

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

      const mistakesCount = mistakesResult.status === 'fulfilled' ? mistakesResult.value.count || 0 : 0;
      const questionsCount = questionsResult.status === 'fulfilled' ? questionsResult.value.count || 0 : 0;
      const simCount = simResult.status === 'fulfilled' ? simResult.value.count || 0 : 0;
      const notesCount = notesResult.status === 'fulfilled' ? notesResult.value.count || 0 : 0;
      const videosCount = videosResult.status === 'fulfilled' ? videosResult.value.count || 0 : 0;
      const eventsCount = eventsResult.status === 'fulfilled' ? eventsResult.value.count || 0 : 0;
      const announcementsCount = announcementsResult.status === 'fulfilled' ? announcementsResult.value.count || 0 : 0;

      let stars = 0;
      if (quizResults.status === 'fulfilled' && quizResults.value?.data) {
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

  useEffect(() => {
    isMounted.current = true;
    fetchAllData(true);

    const handleVisibilityChange = () => {
      if (!document.hidden && isMounted.current) {
        fetchAllData(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      isMounted.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchAllData]);

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
    setCached(ANNOUNCEMENTS_KEY, 0);
    handleNavigate("/announcements");
  }, [handleNavigate]);

  // ✅ MAIN — student-only items hidden for tutor & staff
  const mainItems = useMemo(() => {
    const base = [
      { title: "My Dashboard", url: `/dashboard/${userRole}`, icon: (props: any) => <HomeFilledIcon {...props} />, iconTone: "neutral" as IconTone },
    ];

    if (isStudent) {
      base.push(
        { title: "Nursing Compass", url: "/nursing", icon: BookOpenCheck, iconTone: "learning" as IconTone },
        { title: "Feed Page", url: "/feed", icon: Newspaper, iconTone: "content" as IconTone },
        { title: "Nurse Duel (N.D)", url: "/challenge", icon: Swords, iconTone: "practice" as IconTone },
        { title: "Mistakes", url: "/my-mistakes", icon: AlertCircle, iconTone: "alert" as IconTone, badge: mistakeCount > 0 ? mistakeCount : undefined },
      );
    }

    // Survival Hub is shared across every role
    base.push(
      { title: "Survival Hub", url: "/survival-hub", icon: Compass, iconTone: "learning" as IconTone },
    );

    return base;
  }, [userRole, mistakeCount, isStudent]);

  // ✅ NCK EXAM PREP — students only
  const nckExamPrepItems = useMemo(() => {
    if (!isStudent) return [];
    return [
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
    ];
  }, [isStudent, totalQuestions, totalStars, totalSimulationPapers, formatNumber]);

  // ✅ LEARNING — Clinical Assessments hidden for tutor & staff
  const learningItems = useMemo(() => {
    const base = [
      { title: "Assessment Notes", url: "/assessment-notes", icon: BookOpen, iconTone: "learning" as IconTone },
      { title: "Resources Bank", url: "/resources", icon: FileText, iconTone: "content" as IconTone, badge: formatNumber(totalNotes) },
    ];

    if (isStudent) {
      base.push({
        title: "Clinical Assessments",
        url: "/assessments",
        icon: Brain,
        iconTone: "practice" as IconTone,
        badge: "New"
      });
    }

    base.push({ title: "My Classes", url: "/my-classes", icon: Calendar, iconTone: "learning" as IconTone });

    return base;
  }, [isStudent, totalNotes, totalEvents, formatNumber]);

  // ✅ INSTITUTIONAL EXAMS
  // Student → student pages. Tutor → tutor pages. Staff → none (CPD coming).
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
    return []; // staff — nothing yet
  }, [userRole]);

  const mediaItems = useMemo(() => [
    { title: "MedTube", url: "/medtube", icon: PlayFilledIcon, iconTone: "media" as IconTone, badge: totalVideos ? formatNumber(totalVideos) : undefined },
  ], [totalVideos, formatNumber]);

  const tutorItems = useMemo(() => userRole === "tutor" ? [
    { title: "Student Analytics", url: "/analytics", icon: Users, iconTone: "people" as IconTone },
  ] : [], [userRole]);

  // ✅ STAFF TOOLS — placeholder until CPD tables/route exist
  const staffItems = useMemo(() => {
    if (userRole !== "staff") return [];
    // ─────────────── STAFF CPD PLACEHOLDER ───────────────
    // When you build CPD, drop items here, e.g.:
    //
    // return [
    //   { title: "My CPD", url: "/cpd", icon: BookOpenCheck, iconTone: "learning" as IconTone },
    //   { title: "CPD Certificates", url: "/cpd/certificates", icon: GraduationCap, iconTone: "progress" as IconTone },
    // ];
    // ─────────────────────────────────────────────────────
    return [];
  }, [userRole]);

  // ✅ MORE — Help Center removed entirely, GroupPay student-only
  const otherItems = useMemo(() => {
    const base = [
      { title: "NursMartt", url: "/market", icon: (props: any) => <img src="/Nurvia_logo.png" alt="Nurvia Logo" className={`${props.className} object-contain bg-transparent`} loading="lazy" />, iconTone: "neutral" as IconTone },
      { title: "Announcements", url: "/announcements", icon: Bell, iconTone: "alert" as IconTone, onClick: handleAnnouncementsClick },
      // Help Center — students only (new one for tutors/staff coming soon)
      ...(isStudent
        ? [{ title: "Help Center", url: "/help", icon: MessageCircle, iconTone: "communication" as IconTone }]
        : []),
      { title: "Feedback Box", url: "/feedback", icon: MessageSquareX, iconTone: "communication" as IconTone },
      { title: "Settings", url: "/settings", icon: Settings, iconTone: "system" as IconTone },
      { title: "Subscription", url: "/subscription", icon: CreditCard, iconTone: "finance" as IconTone },
    ];

    if (isStudent) {
      base.push({
        title: "GroupPay",
        url: "/grouppay",
        icon: Users,
        iconTone: "practice" as IconTone,
        badge: "New",
      });
    }

    return base;
  }, [handleAnnouncementsClick, isStudent]);

  const visibleMainItems = isFooterMounted ? mainItems.filter(item => !footerRoutes.includes(item.url)) : mainItems;
  const visibleLearningItems = isFooterMounted ? learningItems.filter(item => !footerRoutes.includes(item.url)) : learningItems;
  const visibleNckPrepItems = isFooterMounted ? nckExamPrepItems.filter(item => !footerRoutes.includes(item.url)) : nckExamPrepItems;

  return (
    <Sidebar className="fixed top-0 left-0 h-full z-[999] bg-background border-0 shadow-none transition-transform duration-300 w-[380px] overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full overflow-hidden flex items-center justify-center ring-0 ring-primary/20 shadow-none">
            <svg
              viewBox="0 0 192 192"
              xmlns="http://www.w3.org/2000/svg"
              className="h-full w-full"
              aria-label="MEDRAE Nursing Logo"
            >
              <rect x="0" y="0" width="192" height="192" rx="35" fill="#FFFFFF" />
              <path
                d="M96 169 C91 165 31 116 20 91 C8 64 23 38 48 32 C67 27 84 35 96 50 C108 35 125 27 144 32 C169 38 184 64 172 91 C161 116 101 165 96 169 Z"
                fill="#FF1F1F"
              />
              <path d="M44 82 L96 63 L150 82 L96 101 Z" fill="#FFFFFF" />
              <path
                d="M62 88 V105 C62 111 77 119 96 122 C115 119 130 111 130 105 V88 L96 101 Z"
                fill="#FFFFFF"
              />
              <path
                d="M62 91 V105 C62 111 77 119 96 122 C115 119 130 111 130 105 V91"
                fill="none"
                stroke="#FF1F1F"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path d="M96 82 V101" stroke="#FF1F1F" strokeWidth="2.5" />
              <circle cx="94" cy="82" r="3.5" fill="#FF1F1F" />
              <path
                d="M94 82 C86 86 75 88 63 89"
                fill="none"
                stroke="#FF1F1F"
                strokeWidth="2"
              />
              <path
                d="M63 89 C61 94 61 98 61 103"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="61" cy="105" r="4" fill="#FFFFFF" />
              <path d="M57 108 L65 108 L67 122 C63 124 59 124 55 122 Z" fill="#FFFFFF" />
            </svg>
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="text-[14px] font-extrabold tracking-tight flex items-center gap-1">
                <span className="text-red-500">MEDRAE</span>
                <span className="text-gray-900 dark:text-white">NURSING</span>
                <span className="text-[10px] font-bold text-red-500/80 dark:text-red-400/80 ml-0.5">
                  2.0
                </span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate">
                Kenya Nursing Network (KNN)
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mx-4 h-px bg-border/60" />

      <SidebarContent className="px-2 pt-1.5 pb-3 overflow-y-auto hide-scrollbar">
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

        <SidebarGroup className="py-0.5">
          <SidebarGroupLabel
            className="flex items-center gap-2 rounded-md px-3 py-1.5 mx-1
              text-[10px] font-bold uppercase tracking-[0.12em]
              text-muted-foreground/70"
          >
            Media
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0">
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

        <SidebarGroup className="py-0.5">
          <SidebarGroupLabel
            className="flex items-center gap-2 rounded-md px-3 py-1.5 mx-1
              text-[10px] font-bold uppercase tracking-[0.12em]
              text-muted-foreground/70"
          >
            More
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0">
              {otherItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <button
                      className={`group w-full my-0.5 rounded-lg px-2 py-2 flex items-center gap-2.5
                        ${isActive(item.url)
                          ? "bg-primary/10 text-primary font-semibold"
                          : "hover:bg-muted/60 text-foreground/85 hover:text-foreground"
                        } transition-all duration-150`}
                      onClick={() => item.onClick ? item.onClick() : handleNavigate(item.url)}
                      style={{ touchAction: 'manipulation' }}
                    >
                      <div
                        className={`flex-shrink-0 flex items-center justify-center rounded-full
                          ${isCollapsed ? "h-10 w-10" : "h-8 w-8"}
                          ${ICON_TONE_STYLES[item.iconTone || "neutral"].box}
                          transition-transform duration-150 group-hover:scale-105`}
                      >
                        <item.icon
                          className={`${isCollapsed ? "h-5 w-5" : "h-4 w-4"} ${ICON_TONE_STYLES[item.iconTone || "neutral"].icon}`}
                          strokeWidth={2.4}
                        />
                      </div>
                      {!isCollapsed && (
                        <div className="flex items-center w-full min-w-0">
                          <span className="text-[14px] font-medium tracking-tight truncate">
                            {item.title}
                          </span>
                          {item.title === "Announcements" && unreadAnnouncements > 0 && (
                            <Badge
                              variant="secondary"
                              className="ml-2 h-[20px] px-1.5 text-[10px] font-bold rounded-full bg-primary/15 text-primary"
                            >
                              {unreadAnnouncements}
                            </Badge>
                          )}
                          {item.badge && item.title !== "Announcements" && (
                            <Badge
                              variant="secondary"
                              className="ml-2 h-[20px] px-1.5 text-[10px] font-bold rounded-full bg-primary/15 text-primary"
                            >
                              {item.badge}
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

      {/* Footer */}
      <div className="mt-auto py-5 px-4 text-center select-none border-0">

        <p className="text-[7px] font-black tracking-[0.2em] text-slate-400 dark:text-slate-500 opacity-60">
          Medrae Nursing All right reserved
        </p>

        <div className="mt-4 flex items-center justify-center gap-2.5 flex-wrap">
          <a
            href="https://medrae-nursing.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="MEDRAE Nursing Website"
            className="group flex h-8 w-8 items-center justify-center rounded-full
                 overflow-hidden
                 bg-white dark:bg-slate-900
                 ring-1 ring-slate-200 dark:ring-slate-700
                 shadow-none
                 transition-transform hover:scale-110 active:scale-95"
          >
            <svg
              viewBox="0 0 192 192"
              xmlns="http://www.w3.org/2000/svg"
              className="h-full w-full"
              aria-hidden="true"
            >
              <rect x="0" y="0" width="192" height="192" rx="35" fill="#FFFFFF" />
              <path
                d="M96 169 C91 165 31 116 20 91 C8 64 23 38 48 32 C67 27 84 35 96 50 C108 35 125 27 144 32 C169 38 184 64 172 91 C161 116 101 165 96 169 Z"
                fill="#FF1F1F"
              />
              <path d="M44 82 L96 63 L150 82 L96 101 Z" fill="#FFFFFF" />
              <path
                d="M62 88 V105 C62 111 77 119 96 122 C115 119 130 111 130 105 V88 L96 101 Z"
                fill="#FFFFFF"
              />
              <path
                d="M62 91 V105 C62 111 77 119 96 122 C115 119 130 111 130 105 V91"
                fill="none"
                stroke="#FF1F1F"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path d="M96 82 V101" stroke="#FF1F1F" strokeWidth="2.5" />
              <circle cx="94" cy="82" r="3.5" fill="#FF1F1F" />
              <path
                d="M94 82 C86 86 75 88 63 89"
                fill="none"
                stroke="#FF1F1F"
                strokeWidth="2"
              />
              <path
                d="M63 89 C61 94 61 98 61 103"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="61" cy="105" r="4" fill="#FFFFFF" />
              <path d="M57 108 L65 108 L67 122 C63 124 59 124 55 122 Z" fill="#FFFFFF" />
            </svg>
          </a>

          <a
            href="https://wa.me/254704473503"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp 0704473503"
            className="group flex h-8 w-8 items-center justify-center rounded-full
           bg-gradient-to-br from-green-500 to-green-600
           shadow-none
           transition-transform hover:scale-110 active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
          </a>

          <a
            href="https://tiktok.com/@medraenursing"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok @medraenursing"
            className="group flex h-8 w-8 items-center justify-center rounded-full
           bg-gradient-to-br from-slate-800 to-slate-950
           shadow-none
           transition-transform hover:scale-110 active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.66a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.09z" />
            </svg>
          </a>

          <a
            href="https://instagram.com/medraenursing"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram @medraenursing"
            className="group flex h-8 w-8 items-center justify-center rounded-full
           bg-gradient-to-br from-pink-500 via-fuchsia-500 to-amber-400
           shadow-none
           transition-transform hover:scale-110 active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
            </svg>
          </a>

          <a
            href="https://x.com/medraenursing"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X @medraenursing"
            className="group flex h-8 w-8 items-center justify-center rounded-full
           bg-gradient-to-br from-slate-700 to-black
           shadow-none
           transition-transform hover:scale-110 active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-white">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>

          <a
            href="https://youtube.com/@medraenursing"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube @medraenursing"
            className="group flex h-8 w-8 items-center justify-center rounded-full
           bg-gradient-to-br from-red-500 to-red-700
           shadow-none
           transition-transform hover:scale-110 active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </a>

          <a
            href="https://facebook.com/medraenursing"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook @medraenursing"
            className="group flex h-8 w-8 items-center justify-center rounded-full
           bg-gradient-to-br from-blue-500 to-blue-700
           shadow-none
           transition-transform hover:scale-110 active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
        </div>

        <a
          href="https://instagram.com/medraenursing"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-[10px] font-bold text-slate-500 dark:text-slate-400
         hover:text-blue-600 dark:hover:text-blue-400 transition-colors tracking-wide"
        >
          @medraenursing
        </a>

        <div className="mt-0 flex items-center justify-center gap-3">
          <Link to="/privacy" className="text-[8px] font-bold text-slate-500 hover:text-blue-600 dark:text-slate-600 dark:hover:text-blue-400 transition-colors tracking-widest">
            Privacy
          </Link>
          <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <Link to="/terms" className="text-[8px] font-bold text-slate-500 hover:text-blue-600 dark:text-slate-600 dark:hover:text-blue-400 transition-colors tracking-widest">
            Terms
          </Link>
        </div>

      </div>
    </Sidebar>
  );
}