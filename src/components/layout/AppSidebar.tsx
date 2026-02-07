"use client";

import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";


import {
  Brain,
  Heart,
  Calendar,
  ChevronDown,
  FileText,
  Home,
  MessageCircle,
  MessageSquare,
  Play,
  Settings,
  Star,
  TrendingUp,
  Users,
  Video,
  CreditCard,
  Bell,
  MessageSquareX,
  BookOpen,
  GraduationCap,
  Briefcase,
  CalendarDays,
  PenTool,
  Network,
  AlertCircle,
  Newspaper

} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  toggleSidebar
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";

interface AppSidebarProps {
  userRole: 'student' | 'tutor' | 'staff';
}

export function AppSidebar({ userRole }: AppSidebarProps) {
  const { state, setState, toggleSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  const [openGroups, setOpenGroups] = useState<string[]>(['main', 'learning']);

  const [unreadAnnouncements, setUnreadAnnouncements] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const [totalQuestions, setTotalQuestions] = useState<number | null>(null);
  const [totalSimulationPapers, setTotalSimulationPapers] = useState<number | null>(null);
  const [totalNotes, setTotalNotes] = useState<number | null>(null);
  const [totalVideos, setTotalVideos] = useState<number | null>(null);
  const [totalStars, setTotalStars] = useState<number>(0);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // ✅ At the top of your AppSidebar component
  const [mistakeCount, setMistakeCount] = useState(0);
  // 🎨 Semantic icon tone system
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
    {
      box: { light: string; dark: string };
      icon: { light: string; dark: string };
    }
  > = {
    neutral: {
      box: { light: "bg-slate-100", dark: "bg-slate-800" },
      icon: { light: "text-slate-700", dark: "text-slate-200" },
    },
    ai: {
      box: { light: "bg-purple-200", dark: "bg-purple-800" },
      icon: { light: "text-purple-700", dark: "text-purple-300" },
    },
    learning: {
      box: { light: "bg-blue-200", dark: "bg-blue-800" },
      icon: { light: "text-blue-700", dark: "text-blue-300" },
    },
    progress: {
      box: { light: "bg-emerald-200", dark: "bg-emerald-800" },
      icon: { light: "text-emerald-700", dark: "text-emerald-300" },
    },
    practice: {
      box: { light: "bg-rose-200", dark: "bg-rose-800" },
      icon: { light: "text-rose-700", dark: "text-rose-300" },
    },
    alert: {
      box: { light: "bg-amber-200", dark: "bg-amber-800" },
      icon: { light: "text-amber-700", dark: "text-amber-300" },
    },
    communication: {
      box: { light: "bg-cyan-200", dark: "bg-cyan-800" },
      icon: { light: "text-cyan-700", dark: "text-cyan-300" },
    },
    media: {
      box: { light: "bg-violet-200", dark: "bg-violet-800" },
      icon: { light: "text-violet-700", dark: "text-violet-300" },
    },
    finance: {
      box: { light: "bg-emerald-200", dark: "bg-emerald-800" },
      icon: { light: "text-emerald-700", dark: "text-emerald-300" },
    },
    system: {
      box: { light: "bg-gray-200", dark: "bg-gray-700" },
      icon: { light: "text-gray-700", dark: "text-gray-300" },
    },
    people: {
      box: { light: "bg-indigo-200", dark: "bg-indigo-800" },
      icon: { light: "text-indigo-700", dark: "text-indigo-300" },
    },
    content: {
      box: { light: "bg-indigo-200", dark: "bg-indigo-800" },
      icon: { light: "text-indigo-700", dark: "text-indigo-300" },
    },
  };

  // ✅ Sync with localStorage and update in real-time
  useEffect(() => {
    const fetchCount = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Initial fetch
      const { count, error } = await supabase
        .from("user_mistakes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("resolved", false);

      if (!error) setMistakeCount(count || 0);

      // Subscribe to changes for this user
      const subscription = supabase
        .channel(`user_mistakes_real_time_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_mistakes",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Refetch count whenever a row is inserted, updated, or deleted
            supabase
              .from("user_mistakes")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("resolved", false)
              .then(({ count }) => setMistakeCount(count || 0));
          }
        )
        .subscribe();

      return () => supabase.removeChannel(subscription);
    };

    fetchCount();
  }, []);


  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Pages that already exist in the mobile footer
  const footerRoutes = [
    `/dashboard/${userRole}`,
    "/Medrae-quizzes",
    "/my-mistakes",
    "/progress",
  ];

  // Footer is mounted only on mobile
  const isFooterMounted = windowWidth < 768;


  const isCollapsed = state === 'collapsed' || (windowWidth >= 1024 && state === 'collapsed');

  const handleCollapse = () => {
    // Collapse sidebar on mobile
    if (windowWidth < 1024) toggleSidebar();
  };

  const toggleGroup = (group: string) => {
    setOpenGroups(prev =>
      prev.includes(group)
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };
  const formatNumber = (num: number | null) => {
    if (!num) return "0";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(0) + "k";
    return num.toString();
  };

  const isActive = (path: string) => location.pathname === path;
  const getNavClass = (path: string) => {
    return isActive(path)
      ? "bg-primary/10 text-primary border-r-2 border-primary font-medium"
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";
  };
  const mainItems = [
    { title: "My Dashboard", url: `/dashboard/${userRole}`, icon: Home, iconTone: "neutral" },
    { title: "Feed Page", url: "/feed", icon: Newspaper, iconTone: "content" },
    { title: "My Mistakes", url: "/my-mistakes", icon: AlertCircle, iconTone: "alert", badge: mistakeCount > 0 ? mistakeCount : undefined },
    { title: "AI Study Assistant", url: "/ai-assistant", icon: Brain, iconTone: "ai", badge: "New" },
    { title: "Forum", url: "/forum", icon: MessageSquare, iconTone: "communication" },
  ];


  const visibleMainItems = isFooterMounted ? mainItems.filter(item => !footerRoutes.includes(item.url)) : mainItems;

  const learningItems = [
    { title: "Assessment Tracker", url: "/calendar", icon: Calendar, iconTone: "learning", badge: `${totalEvents}E` },
    { title: "Study Progress", url: "/progress", icon: TrendingUp, iconTone: "progress", badge: `${totalStars}★` },
    { title: "Quizzes Bank", url: "/Medrae-quizzes", icon: Heart, iconTone: "practice", badge: totalQuestions !== null ? `${formatNumber(totalQuestions)}` : "Loading..." },
    { title: "Proctorium Lite", url: "/simulation/candidate", icon: Play, iconTone: "practice", badge: totalSimulationPapers !== null ? `${formatNumber(totalSimulationPapers)} ` : "Loading..." },
    { title: "Assessment Notes", url: "/assessment-notes", icon: BookOpen, iconTone: "learning" },
    { title: "Resources Bank", url: "/resources", icon: FileText, iconTone: "content", badge: totalNotes !== null ? `${formatNumber(totalNotes)}` : "Loading..." },
  ];


  const visibleLearningItems = isFooterMounted ? learningItems.filter(item => !footerRoutes.includes(item.url)) : learningItems;

  const mediaItems = [
    { title: "MedTube", url: "/medtube", icon: Play, iconTone: "media", badge: totalVideos !== null ? `${formatNumber(totalVideos)} Videos` : "Loading..." },
  ];

  const otherItems = [
    { title: "Announcements", url: "/announcements", icon: Bell, iconTone: "alert" },
    { title: "Feedback Box", url: "/feedback", icon: MessageSquareX, iconTone: "communication" },
    { title: "Settings", url: "/settings", icon: Settings, iconTone: "system" },
    { title: "Subscription", url: "/subscription", icon: CreditCard, iconTone: "finance" },
  ];

  const tutorItems = userRole === "tutor" ? [
    { title: "Student Analytics", url: "/analytics", icon: Users, iconTone: "people" },
    { title: "Create Content", url: "/create", icon: BookOpen, iconTone: "content" },
    { title: "Earnings", url: "/earnings", icon: Star, iconTone: "finance" },
  ] : [];

  const staffItems = userRole === "staff" ? [
    { title: "Knowledge Feed", url: "/knowledge", icon: Network, iconTone: "content" },
    { title: "Post Videos", url: "/post-videos", icon: Video, iconTone: "media" },
    { title: "Events & Seminars", url: "/events", icon: CalendarDays, iconTone: "learning" },
    { title: "Job Board", url: "/jobs", icon: Briefcase, iconTone: "people" },
    { title: "Write Articles", url: "/articles", icon: PenTool, iconTone: "content" },
  ] : [];


  // Fetch unread messages and listen for live updates
  // ----- UNREAD MESSAGES & ANNOUNCEMENTS -----



  // ----- TOTAL QUESTIONS -----
  useEffect(() => {
    const fetchTotalQuestions = async () => {
      const stored = localStorage.getItem("totalQuestions");
      if (stored) setTotalQuestions(parseInt(stored));

      const { count, error } = await supabase
        .from("quiz_questions")
        .select("*", { count: "exact", head: true });

      if (!error) {
        setTotalQuestions(count || 0);
        localStorage.setItem("totalQuestions", String(count || 0));
      }
    };
    fetchTotalQuestions();
  }, []);

  // ----- TOTAL SIMULATION PAPERS -----
  useEffect(() => {
    const fetchTotalSimulationPapers = async () => {
      const stored = localStorage.getItem("totalSimulationPapers");
      if (stored) setTotalSimulationPapers(parseInt(stored));

      const { count, error } = await supabase
        .from("simulation_papers")
        .select("*", { count: "exact", head: true });

      if (!error) {
        setTotalSimulationPapers(count || 0);
        localStorage.setItem("totalSimulationPapers", String(count || 0));
      }
    };
    fetchTotalSimulationPapers();
  }, []);

  // ----- TOTAL NOTES -----
  useEffect(() => {
    const fetchTotalNotes = async () => {
      const stored = localStorage.getItem("totalNotes");
      if (stored) setTotalNotes(parseInt(stored));

      const { count, error } = await supabase
        .from("notes")
        .select("*", { count: "exact", head: true });

      if (!error) {
        setTotalNotes(count || 0);
        localStorage.setItem("totalNotes", String(count || 0));
      }
    };
    fetchTotalNotes();
  }, []);

  // ----- TOTAL VIDEOS -----
  useEffect(() => {
    const fetchTotalVideos = async () => {
      const stored = localStorage.getItem("totalVideos");
      if (stored) setTotalVideos(parseInt(stored));

      const { count, error } = await supabase
        .from("medtube_videos")
        .select("*", { count: "exact", head: true });

      if (!error) {
        setTotalVideos(count || 0);
        localStorage.setItem("totalVideos", String(count || 0));
      }
    };
    fetchTotalVideos();
  }, []);
  // ----- TOTAL EVENTS -----
  useEffect(() => {
    const fetchTotalEvents = async () => {
      const stored = localStorage.getItem("totalEvents");
      if (stored) setTotalEvents(parseInt(stored));

      const { count, error } = await supabase
        .from("calendar_events") // 👈 replace with your actual table name
        .select("*", { count: "exact", head: true });

      if (!error) {
        setTotalEvents(count || 0);
        localStorage.setItem("totalEvents", String(count || 0));
      }
    };

    fetchTotalEvents();
  }, []);

  // ----- TOTAL STARS -----
  useEffect(() => {
    let isMounted = true; // avoid state updates if unmounted

    // 1️⃣ Load cached stars immediately
    const cached = localStorage.getItem("study_progress_cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.totalStarsEarned !== undefined) setTotalStars(parsed.totalStarsEarned);
      } catch (e) {
        console.error("Error reading cached stars for sidebar:", e);
      }
    }

    // 2️⃣ Function to fetch latest stars from Supabase
    const fetchStars = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User not found or auth error in sidebar");
        return;
      }

      const { data, error } = await supabase
        .from("quiz_results")
        .select("unit, score, total_questions")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching quiz results for sidebar:", error.message);
        return;
      }

      // Group results by unit
      const grouped: Record<string, { count: number }> = {};
      data?.forEach((res) => {
        const key = res.unit || "Unknown";
        if (!grouped[key]) grouped[key] = { count: 1 };
        else grouped[key].count += 1;
      });

      // Only include units whose latest attempt > 0
      const unitsToInclude = Object.keys(grouped).filter((unitName) => {
        const attempts = data?.filter((r) => r.unit === unitName) || [];
        const latestAttempt = attempts[attempts.length - 1]; // assume last is latest
        return latestAttempt?.score && latestAttempt.score > 0;
      });

      const totalStars = unitsToInclude.length * 5;

      if (isMounted) setTotalStars(totalStars);

      // Update localStorage cache for other components
      try {
        const cached = JSON.parse(localStorage.getItem("study_progress_cache") || "{}");
        localStorage.setItem(
          "study_progress_cache",
          JSON.stringify({ ...cached, totalStarsEarned: totalStars, userId: user.id })
        );
      } catch (e) {
        console.error("Error saving sidebar stars to cache:", e);
      }
    };

    fetchStars(); // initial fetch

    // 3️⃣ Realtime subscription for updates
    const channel = supabase
      .channel("quiz_results_changes_sidebar")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_results" },
        fetchStars
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);



  // Reset unread count when clicking Chat Room
  const handleChatClick = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user) return;

    // You need to know which message(s) to mark as read
    // For example, fetch the first unread message delivered to this user
    const { data: messagesData, error: fetchError } = await supabase
      .from('messages')
      .select('id')
      .contains('delivered_to', [user.id])
      .not('read_by', 'cs', [user.id])
      .limit(1);

    if (fetchError || !messagesData || messagesData.length === 0) {
      setUnreadCount(0);
      return;
    }

    const messageId = messagesData[0].id;

    // Call the RPC function to safely append the user ID
    const { error: rpcError } = await supabase.rpc('append_to_read_by', {
      message_id: messageId,
      user_id: user.id
    });

    if (rpcError) console.error('Error updating read_by via RPC:', rpcError);

    setUnreadCount(0);
  };



  return (
    <Sidebar
      className={`fixed top-0 left-0 h-full z-50 bg-background shadow-lg transition-transform duration-300
    ${isCollapsed ? "-translate-x-full" : "translate-x-0"} w-64 overflow-y-auto`}
    >
      <div className="p-4">

        <div className="flex items-center gap-3">
          {/* Icon with gradient */}
          <div className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center">
            <img
              src="/pwa-192x192.jpeg"
              alt="Logo"
              className="h-full w-full object-cover"
            />
          </div>


          {/* Text info */}
          {!isCollapsed && (
            <div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100 relative inline-block">
                MEDRAE
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Kenya Nursing Network Platform (MKN)
              </p>
            </div>

          )}
        </div>
      </div>

      <SidebarContent className="px-2 overflow-y-auto custom-scrollbar">
        {/* Main Navigation */}
        <SidebarGroup>
          <Collapsible open={openGroups.includes('main')} onOpenChange={() => toggleGroup('main')}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="group/label hover:bg-muted/50 rounded-md p-2 cursor-pointer">
                Main
                {!isCollapsed && (
                  <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/label:rotate-180" />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleMainItems.map((item) => (

                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <button
                          className={getNavClass(item.url)}
                          onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(50);
                            handleCollapse();
                            if (item.title === "Chat Room") handleChatClick();
                            navigate(item.url);
                          }}
                        >
                          {/* 1️⃣ Icon container - now separate and resizable */}
                          <div
                            className={`
    flex-shrink-0 mr-2 p-1.5 rounded-md
    ${ICON_TONE_STYLES[item.iconTone || "neutral"].box.light}
    dark:${ICON_TONE_STYLES[item.iconTone || "neutral"].box.dark}
  `}
                          >
                            <item.icon
                              className={`
      ${isCollapsed ? "h-6 w-6" : "h-5 w-5"}
      ${ICON_TONE_STYLES[item.iconTone || "neutral"].icon.light}
      dark:${ICON_TONE_STYLES[item.iconTone || "neutral"].icon.dark}
    `}
                            />
                          </div>



                          {/* 2️⃣ Text and badge container */}
                          {!isCollapsed && (
                            <div className="flex items-center justify-between w-full">
                              {/* Text */}
                              <span>{item.title}</span>

                              {/* Badge */}
                              {item.title === "Chat Room" && unreadCount > 0 && (
                                <Badge variant="secondary" className="ml-auto h-5 text-xs">
                                  {unreadCount}
                                </Badge>
                              )}
                              {item.title !== "Chat Room" && item.badge && (
                                <Badge variant="secondary" className="ml-auto h-5 text-xs">
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
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>


        {/* Learning Section */}
        <SidebarGroup>
          <Collapsible open={openGroups.includes('learning')} onOpenChange={() => toggleGroup('learning')}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="group/label hover:bg-muted/50 rounded-md p-2 cursor-pointer">
                Learning
                {!isCollapsed && (
                  <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/label:rotate-180" />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleLearningItems.map((item) => (

                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <button
                          className={getNavClass(item.url)}
                          onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(50);
                            handleCollapse();
                            navigate(item.url);
                          }}
                        >
                          {/* 1️⃣ Icon container */}
                          <div
                            className={`
    flex-shrink-0 mr-2 p-1.5 rounded-md
    ${ICON_TONE_STYLES[item.iconTone || "neutral"].box.light}
    dark:${ICON_TONE_STYLES[item.iconTone || "neutral"].box.dark}
  `}
                          >
                            <item.icon
                              className={`
      ${isCollapsed ? "h-6 w-6" : "h-5 w-5"}
      ${ICON_TONE_STYLES[item.iconTone || "neutral"].icon.light}
      dark:${ICON_TONE_STYLES[item.iconTone || "neutral"].icon.dark}
    `}
                            />
                          </div>


                          {/* 2️⃣ Text + Badge container */}
                          {!isCollapsed && (
                            <div className="flex items-center justify-between w-full">
                              {/* Text */}
                              <span>{item.title}</span>

                              {/* Badge */}
                              {item.badge && (
                                <Badge variant="secondary" className="ml-auto h-5 text-xs">
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
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Media Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="group/label hover:bg-muted/50 rounded-md p-2 cursor-pointer">
            Media
            {!isCollapsed && (
              <ChevronDown className="ml-auto h-4 w-4" />
            )}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {mediaItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <button
                      className={getNavClass(item.url)}
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(50);
                        handleCollapse();
                        navigate(item.url);
                      }}
                    >
                      {/* 1️⃣ Icon container */}
                      <div
                        className={`
    flex-shrink-0 mr-2 p-1.5 rounded-md
    ${ICON_TONE_STYLES[item.iconTone || "neutral"].box.light}
    dark:${ICON_TONE_STYLES[item.iconTone || "neutral"].box.dark}
  `}
                      >
                        <item.icon
                          className={`
      ${isCollapsed ? "h-6 w-6" : "h-5 w-5"}
      ${ICON_TONE_STYLES[item.iconTone || "neutral"].icon.light}
      dark:${ICON_TONE_STYLES[item.iconTone || "neutral"].icon.dark}
    `}
                        />
                      </div>


                      {/* 2️⃣ Text + Badge container */}
                      {!isCollapsed && (
                        <div className="flex items-center justify-between w-full">
                          {/* Text */}
                          <span>{item.title}</span>

                          {/* Badge */}
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto h-5 text-xs">
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


        {/* Tutor Section */}
        {tutorItems.length > 0 && (
          <SidebarGroup>
            <Collapsible open={openGroups.includes('tutor')} onOpenChange={() => toggleGroup('tutor')}>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="group/label hover:bg-muted/50 rounded-md p-2 cursor-pointer">
                  Tutor Tools
                  {!isCollapsed && (
                    <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/label:rotate-180" />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {tutorItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <button
                            className={getNavClass(item.url)}
                            onClick={() => {
                              if (navigator.vibrate) navigator.vibrate(50);
                              handleCollapse();
                              navigate(item.url);
                            }}
                          >
                            {/* 1️⃣ Icon container */}
                            <div
                              className={`
    flex-shrink-0 mr-2 p-1.5 rounded-md
    ${ICON_TONE_STYLES[item.iconTone || "neutral"].box.light}
    dark:${ICON_TONE_STYLES[item.iconTone || "neutral"].box.dark}
  `}
                            >
                              <item.icon
                                className={`
      ${isCollapsed ? "h-6 w-6" : "h-5 w-5"}
      ${ICON_TONE_STYLES[item.iconTone || "neutral"].icon.light}
      dark:${ICON_TONE_STYLES[item.iconTone || "neutral"].icon.dark}
    `}
                              />
                            </div>



                            {/* 2️⃣ Text container */}
                            {!isCollapsed && (
                              <span>{item.title}</span>
                            )}
                          </button>


                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Staff Section */}
        {staffItems.length > 0 && (
          <SidebarGroup>
            <Collapsible open={openGroups.includes('staff')} onOpenChange={() => toggleGroup('staff')}>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="group/label hover:bg-muted/50 rounded-md p-2 cursor-pointer">
                  Staff Tools
                  {!isCollapsed && (
                    <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/label:rotate-180" />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {staffItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <button
                            className={getNavClass(item.url)}
                            onClick={() => {
                              if (navigator.vibrate) navigator.vibrate(50);
                              handleCollapse();
                              navigate(item.url);
                            }}
                          >
                            {/* Icon container */}
                            <div
                              className={`
    flex-shrink-0 mr-2 p-1.5 rounded-md
    ${ICON_TONE_STYLES[item.iconTone || "neutral"].box.light}
    dark:${ICON_TONE_STYLES[item.iconTone || "neutral"].box.dark}
  `}
                            >
                              <item.icon
                                className={`
      ${isCollapsed ? "h-6 w-6" : "h-5 w-5"}
      ${ICON_TONE_STYLES[item.iconTone || "neutral"].icon.light}
      dark:${ICON_TONE_STYLES[item.iconTone || "neutral"].icon.dark}
    `}
                              />
                            </div>



                            {/* Text container */}
                            {!isCollapsed && <span>{item.title}</span>}
                          </button>

                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Other Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {otherItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <button
                      className={getNavClass(item.url)}
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(50);

                        handleCollapse();

                        if (item.title === "Announcements") {
                          (async () => {
                            setUnreadAnnouncements(0);
                            const { data } = await supabase
                              .from("announcements")
                              .select("id")
                              .eq("is_published", true);
                            if (data)
                              localStorage.setItem(
                                "readAnnouncements",
                                JSON.stringify(data.map(d => d.id))
                              );
                          })();
                        }

                        navigate(item.url);
                      }}
                    >
                      {/* Icon container */}
                      <div
                        className={`
    flex-shrink-0 mr-2 p-1.5 rounded-md
    ${ICON_TONE_STYLES[item.iconTone || "neutral"].box.light}
    dark:${ICON_TONE_STYLES[item.iconTone || "neutral"].box.dark}
  `}
                      >
                        <item.icon
                          className={`
      ${isCollapsed ? "h-6 w-6" : "h-5 w-5"}
      ${ICON_TONE_STYLES[item.iconTone || "neutral"].icon.light}
      dark:${ICON_TONE_STYLES[item.iconTone || "neutral"].icon.dark}
    `}
                        />
                      </div>



                      {/* Text and badge container */}
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
    </Sidebar>
  );
}
