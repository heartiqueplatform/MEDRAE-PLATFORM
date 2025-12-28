"use client";
import { playSound } from "@/lib/soundManager";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Brain,
    Heart,
    Calendar,
    FileText,
    Home,
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
    Briefcase,
    CalendarDays,
    PenTool,
    Network,
    Newspaper,
    AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface MobileDrawerProps {
    userRole: "student" | "tutor" | "staff";
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

interface DrawerItem {
    title: string;
    url: string;
    icon: any;
}

export function MobileDrawer({ userRole, isOpen, setIsOpen }: MobileDrawerProps) {
    const navigate = useNavigate();
    const drawerRef = useRef<HTMLDivElement>(null);

    // Counts
    const [totalQuestions, setTotalQuestions] = useState<number | null>(null);
    const [totalSimulationPapers, setTotalSimulationPapers] = useState<number | null>(null);
    const [totalNotes, setTotalNotes] = useState<number | null>(null);
    const [totalVideos, setTotalVideos] = useState<number | null>(null);
    const [totalStars, setTotalStars] = useState<number>(0);
    const [totalEvents, setTotalEvents] = useState<number>(0);
    const [mistakeCount, setMistakeCount] = useState<number>(0);
    const [unreadAnnouncements, setUnreadAnnouncements] = useState<number>(0);

    const tapFeedback = () => {
        playSound("tap");
        if (navigator.vibrate) navigator.vibrate(50);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        else document.removeEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, setIsOpen]);

    // --------------------------
    // Fetch all counts (like AppSidebar)
    // --------------------------

    useEffect(() => {
        const fetchCounts = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Mistakes
            const { count: mistakesCount } = await supabase
                .from("user_mistakes")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("resolved", false);
            setMistakeCount(mistakesCount || 0);

            // Questions
            const { count: questionsCount } = await supabase
                .from("quiz_questions")
                .select("*", { count: "exact", head: true });
            setTotalQuestions(questionsCount || 0);

            // Simulation Papers
            const { count: simCount } = await supabase
                .from("simulation_papers")
                .select("*", { count: "exact", head: true });
            setTotalSimulationPapers(simCount || 0);

            // Notes
            const { count: notesCount } = await supabase
                .from("notes")
                .select("*", { count: "exact", head: true });
            setTotalNotes(notesCount || 0);

            // Videos
            const { count: videosCount } = await supabase
                .from("medtube_videos")
                .select("*", { count: "exact", head: true });
            setTotalVideos(videosCount || 0);

            // Events
            const { count: eventsCount } = await supabase
                .from("calendar_events")
                .select("*", { count: "exact", head: true });
            setTotalEvents(eventsCount || 0);

            // Stars (simplified: 5 stars per unit with score > 0)
            const { data: quizResults } = await supabase
                .from("quiz_results")
                .select("unit, score")
                .eq("user_id", user.id);

            const unitsWithScore = new Set(
                quizResults?.filter(r => r.score && r.score > 0).map(r => r.unit)
            );
            setTotalStars(unitsWithScore.size * 5);

            // Announcements
            const { data: announcements } = await supabase
                .from("announcements")
                .select("id")
                .eq("is_published", true);
            const readIds = JSON.parse(localStorage.getItem("readAnnouncements") || "[]");
            setUnreadAnnouncements((announcements?.length || 0) - readIds.length);
        };
        fetchCounts();
    }, []);

    const formatNumber = (num: number | null) => {
        if (!num) return "0";
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
        if (num >= 1_000) return (num / 1_000).toFixed(0) + "k";
        return num.toString();
    };

    // --------------------------
    // Sections with badges
    // --------------------------
    const sections: { label: string; items: DrawerItem[] & { badge?: string }[] }[] = [
        {
            label: "Main",
            items: [
                { title: "Dashboard", url: `/dashboard/${userRole}`, icon: Home },
                { title: "Feed", url: "/feed", icon: Newspaper },
                { title: "AI Assistant", url: "/ai-assistant", icon: Brain },
                { title: "Forum", url: "/forum", icon: MessageSquare },
                { title: "Mistakes", url: "/my-mistakes", icon: AlertCircle, badge: mistakeCount > 0 ? formatNumber(mistakeCount) : undefined },
            ],
        },
        {
            label: "Learning",
            items: [
                { title: "Tracker", url: "/calendar", icon: Calendar, badge: formatNumber(totalEvents) },
                { title: "Progress", url: "/progress", icon: TrendingUp, badge: `${totalStars}★` },
                { title: "Quizzes", url: "/Medrae-quizzes", icon: Heart, badge: formatNumber(totalQuestions) },
                { title: "SimuProctor", url: "/simulation/candidate", icon: Play, badge: formatNumber(totalSimulationPapers) },
                { title: "A.Notes", url: "/assessment-notes", icon: BookOpen },
                { title: "Resources", url: "/resources", icon: FileText, badge: formatNumber(totalNotes) },
            ],
        },
        {
            label: "Media",
            items: [
                { title: "MedTube", url: "/medtube", icon: Play, badge: totalVideos ? `${formatNumber(totalVideos)}` : undefined },
            ],
        },
        {
            label: "Other",
            items: [
                { title: "Announcements", url: "/announcements", icon: Bell, badge: unreadAnnouncements > 0 ? formatNumber(unreadAnnouncements) : undefined },
                { title: "Feedback", url: "/feedback", icon: MessageSquareX },
                { title: "Settings", url: "/settings", icon: Settings },
                { title: "Subscription", url: "/subscription", icon: CreditCard },
            ],
        },
    ];

    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setIsOpen(false)} />}

            <div
                ref={drawerRef}
                className={`fixed bottom-0 left-0 w-full bg-background shadow-xl transition-transform duration-300 rounded-t-xl z-40 ${isOpen ? "translate-y-0" : "translate-y-full"
                    }`}
                style={{ maxHeight: "75vh", bottom: "4rem" }}
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-background z-10">
                    <div className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center">
                        <img
                            src="/pwa-192x192.jpeg"
                            alt="Logo"
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                            MEDRAE
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Kenya Nursing Network Platform (MKN)
                        </p>
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="p-4 space-y-6 overflow-y-auto custom-scrollbar" style={{ maxHeight: "calc(70vh - 80px)" }}>
                    {sections.map(section => section.items.length > 0 && (
                        <div key={section.label}>
                            <h3 className="text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2 uppercase">{section.label}</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {section.items.map(item => (
                                    <div key={item.title} className="relative">
                                        <button
                                            className="relative flex flex-col items-center justify-center text-xs text-gray-700 dark:text-gray-200"
                                            onClick={() => {
                                                tapFeedback();
                                                navigate(item.url);
                                                setIsOpen(false);
                                            }}
                                        >
                                            <item.icon className="h-5 w-5 mb-1" />

                                            {/* Fake dot for Assessment Notes */}
                                            {item.title === "A.Notes" && (
                                                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full -translate-x-1/2 -translate-y-3/4" />
                                            )}

                                            {item.badge && (
                                                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full -translate-x-1/2 -translate-y-3/4">
                                                    {item.badge}
                                                </span>
                                            )}

                                            <span>{item.title}</span>
                                        </button>


                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
