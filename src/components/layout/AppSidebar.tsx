"use client";

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

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
  Network
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
  useSidebar
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";

interface AppSidebarProps {
  userRole: 'student' | 'tutor' | 'staff';
}

export function AppSidebar({ userRole }: AppSidebarProps) {
  const { state, setState } = useSidebar();


  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<string[]>(['main', 'learning']);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState<number>(0);

  const [totalQuestions, setTotalQuestions] = useState<number | null>(null);
  const [totalSimulationPapers, setTotalSimulationPapers] = useState<number | null>(null);
const [totalNotes, setTotalNotes] = useState<number | null>(null);
const [totalVideos, setTotalVideos] = useState<number | null>(null);
const [totalStars, setTotalStars] = useState<number>(0);

  const isCollapsed = state === 'collapsed';
  
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
  { title: "Dashboard", url: `/dashboard/${userRole}`, icon: Home },
  { title: "AI Study Assistant", url: "/ai-assistant", icon: Brain, badge: "New" },
  { title: "Chat Room", url: "/chat", icon: MessageCircle },
  { title: "Forum", url: "/forum", icon: MessageSquare },
];


  const learningItems = [
    { title: "Assessment Calendar", url: "/calendar", icon: Calendar },
    {title: "Study Progress", url: "/progress", icon: TrendingUp, badge: `${totalStars}★` },
    { title: "Heartique Quizzes Bank", url: "/heartique-quizzes", icon: Heart, badge: totalQuestions !== null ? `${formatNumber(totalQuestions)} Questions` : "Loading..." },
    { title: "NCK Simulation", url: "/simulation/candidate", icon: Play, badge: totalSimulationPapers !== null ? `${formatNumber(totalSimulationPapers)} Papers` : "Loading..." },

    { title: "Assessment Notes", url: "/assessment-notes", icon: BookOpen },
    { title: "Notes & Resources Bank", url: "/resources", icon: FileText, badge: totalNotes !== null ? `${formatNumber(totalNotes)} Notes` : "Loading..." },

  ];

  const mediaItems = [
    { title: "MedTube", url: "/medtube", icon: Play, badge: totalVideos !== null ? `${formatNumber(totalVideos)} Videos` : "Loading..." },
    { title: "Reels", url: "/reels", icon: Video },
  ];

  const otherItems = [
    { title: "Announcements", url: "/announcements", icon: Bell },
    { title: "Feedback Box", url: "/feedback", icon: MessageSquareX },
    { title: "Settings", url: "/settings", icon: Settings },
    { title: "Subscription", url: "/subscription", icon: CreditCard },
  ];

  const tutorItems = userRole === 'tutor' ? [
    { title: "Student Analytics", url: "/analytics", icon: Users },
    { title: "Create Content", url: "/create", icon: BookOpen },
    { title: "Earnings", url: "/earnings", icon: Star },
  ] : [];

  const staffItems = userRole === 'staff' ? [
    { title: "Knowledge Feed", url: "/knowledge", icon: Network },
    { title: "Post Videos", url: "/post-videos", icon: Video },
    { title: "Events & Seminars", url: "/events", icon: CalendarDays },
    { title: "Job Board", url: "/jobs", icon: Briefcase },
    { title: "Write Articles", url: "/articles", icon: PenTool },
  ] : [];

  // Fetch unread messages and listen for live updates
 useEffect(() => {
  const fetchUnread = async () => {
    const user = supabase.auth.user();
    if (!user) return;

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    if (!error) setUnreadCount(count || 0);
  };

  const fetchUnreadAnnouncements = async () => {
    const stored = localStorage.getItem("readAnnouncements");
    const readIds: string[] = stored ? JSON.parse(stored) : [];

    let query = supabase
      .from("announcements")
      .select("*", { count: "exact" })
      .eq("is_published", true);

    if (readIds.length) query = query.not("id", "in", `(${readIds.join(",")})`);

    const { count, error } = await query;
    if (!error) setUnreadAnnouncements(count || 0);
  };

  fetchUnread();
  fetchUnreadAnnouncements();

  const messageSub = supabase
    .channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      if (payload.new.receiver_id === supabase.auth.user()?.id && !payload.new.is_read) {
        setUnreadCount(prev => prev + 1);
      }
    })
    .subscribe();

  const announcementSub = supabase
    .channel('public:announcements')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, payload => {
      const stored = localStorage.getItem("readAnnouncements");
      const readIds: string[] = stored ? JSON.parse(stored) : [];
      if (!readIds.includes(payload.new.id)) {
        setUnreadAnnouncements(prev => prev + 1);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(messageSub);
    supabase.removeChannel(announcementSub);
  };
}, []);


// ---- HERE add your totalQuestions hook ----
  

  useEffect(() => {
    const fetchTotalQuestions = async () => {
      const { count, error } = await supabase
        .from("quiz_questions")
        .select("*", { count: "exact", head: true });
      if (!error) setTotalQuestions(count || 0);
    };
    fetchTotalQuestions();
  }, []);
useEffect(() => {
  const fetchTotalSimulationPapers = async () => {
    const { count, error } = await supabase
      .from("simulation_papers")
      .select("*", { count: "exact", head: true });
    if (!error) setTotalSimulationPapers(count || 0);
  };
  fetchTotalSimulationPapers();
}, []);
useEffect(() => {
  const fetchTotalNotes = async () => {
    const { count, error } = await supabase
      .from("notes")
      .select("*", { count: "exact", head: true });
    if (!error) setTotalNotes(count || 0);
  };
  fetchTotalNotes();
}, []);
useEffect(() => {
  const fetchTotalVideos = async () => {
    const { count, error } = await supabase
      .from("medtube_videos")
      .select("*", { count: "exact", head: true });
    if (!error) setTotalVideos(count || 0);
  };
  fetchTotalVideos();
}, []);
useEffect(() => {
  const fetchTotalStars = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("quiz_results")
      .select("unit, score, total_questions")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching stars:", error.message);
      return;
    }

    // Group by unit: if user has attempted quiz → earn 5 stars
    const grouped: Record<string, { count: number }> = {};
    data?.forEach((res) => {
      const key = res.unit || "Unknown";
      if (!grouped[key]) grouped[key] = { count: 0 };
      grouped[key].count += 1;
    });

    const starsEarned = Object.values(grouped).reduce(
      (acc, u) => acc + (u.count > 0 ? 5 : 0),
      0
    );

    setTotalStars(starsEarned);
  };

  fetchTotalStars();
}, []);

  // Reset unread count when clicking Chat Room
  const handleChatClick = async () => {
    const user = supabase.auth.user();
    if (!user) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    setUnreadCount(0);
  };

  // Helper: collapse sidebar on mobile and close all groups
const handleCollapse = () => {
  if (window.innerWidth < 1024) {
    setState("collapsed");
    setOpenGroups([]); // closes all collapsible groups on mobile
  }
};


  return (
    <Sidebar className={`${isCollapsed ? "w-16" : "w-64"} transition-all duration-300`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-gradient-medical rounded-lg flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="font-bold text-lg bg-gradient-medical bg-clip-text text-transparent">
                Heartique Nursing Nexus
              </h2>
              <p className="text-xs text-muted-foreground">Scholar Platform</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent className="px-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-200 dark:scrollbar-track-gray-800">
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
          {mainItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <Link
                  to={item.url}
                  className={getNavClass(item.url)}
                  onClick={() => {
                    if (item.title === "Chat Room") handleChatClick();
                    handleCollapse();
                  }}
                >
                  <item.icon className="h-4 w-4" />
                  {!isCollapsed && (
                    <>
                      <span>{item.title}</span>
                      {item.title === "Chat Room" && unreadCount > 0 && (
                        <Badge variant="secondary" className="ml-auto h-5 text-xs">
                          {unreadCount}
                        </Badge>
                      )}
                      {item.badge && item.title !== "Chat Room" && (
                        <Badge variant="secondary" className="ml-auto h-5 text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
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
          {learningItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <Link
                  to={item.url}
                  className={getNavClass(item.url)}
                  onClick={handleCollapse}
                >
                  <item.icon className="h-4 w-4" />
                  {!isCollapsed && (
                    <>
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto h-5 text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
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
  <Collapsible open={openGroups.includes('media')} onOpenChange={() => toggleGroup('media')}>
    <CollapsibleTrigger asChild>
      <SidebarGroupLabel className="group/label hover:bg-muted/50 rounded-md p-2 cursor-pointer">
        Media
        {!isCollapsed && (
          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/label:rotate-180" />
        )}
      </SidebarGroupLabel>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <SidebarGroupContent>
        <SidebarMenu>
          {mediaItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <Link
                  to={item.url}
                  className={getNavClass(item.url)}
                  onClick={handleCollapse}
                >
                  <item.icon className="h-4 w-4" />
                  {!isCollapsed && (
                    <>
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto h-5 text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </CollapsibleContent>
  </Collapsible>
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
                  <Link
                    to={item.url}
                    className={getNavClass(item.url)}
                    onClick={handleCollapse}
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </Link>
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
                  <Link
                    to={item.url}
                    className={getNavClass(item.url)}
                    onClick={handleCollapse}
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </Link>
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
      <Link
        to={item.url}
        className={getNavClass(item.url)}
     onClick={() => {
  handleCollapse(); // synchronous — collapses immediately on mobile
  if (item.title === "Announcements") {
    (async () => {
      setUnreadAnnouncements(0);
      const { data } = await supabase
        .from("announcements")
        .select("id")
        .eq("is_published", true);
      if (data) localStorage.setItem(
        "readAnnouncements",
        JSON.stringify(data.map(d => d.id))
      );
    })();
  }
}}


      >
        <item.icon className="h-4 w-4" />
        {!isCollapsed && (
          <>
            <span>{item.title}</span>
            {item.title === "Announcements" && unreadAnnouncements > 0 && (
              <Badge variant="secondary" className="ml-auto h-5 text-xs">
                {unreadAnnouncements}
              </Badge>
            )}
          </>
        )}
      </Link>
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
