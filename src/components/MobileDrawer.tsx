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
import { useSession } from "@supabase/auth-helpers-react";
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

    // --------------------------
    // Helper: set state + cache
    // --------------------------
    const setAndCache = (key: string, value: number, setter: (v: number) => void) => {
        setter(value);
        localStorage.setItem(key, String(value));
    };

    // Counts
    const [totalQuestions, setTotalQuestions] = useState<number | null>(null);
    const [totalSimulationPapers, setTotalSimulationPapers] = useState<number | null>(null);
    const [totalNotes, setTotalNotes] = useState<number | null>(null);
    const [totalVideos, setTotalVideos] = useState<number | null>(null);
    const [totalStars, setTotalStars] = useState<number>(0);
    const [totalEvents, setTotalEvents] = useState<number>(0);
    const [mistakeCount, setMistakeCount] = useState<number>(0);
    const [unreadAnnouncements, setUnreadAnnouncements] = useState<number>(0);
    const [userRoleState, setUserRoleState] = useState<"student" | "tutor" | null>(null);
    const session = useSession();       // ✅ get current session
    const user = session?.user || null; // ✅ current user
    const tapFeedback = () => {
        playSound("tap");
        if (navigator.vibrate) navigator.vibrate(50);
    };
    // Semantic icon tone system
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

    useEffect(() => {
        if (!user) return;

        const fetchUserRole = async () => {
            const { data: profile, error } = await supabase
                .from("profiles")
                .select("role")
                .eq("user_id", user.id)
                .single();
            if (!error && profile?.role) {
                setUserRoleState(profile.role.toLowerCase() === "tutor" ? "tutor" : "student");
            }
        };

        fetchUserRole();
    }, [user]); // ✅ dependency on user
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
    // Load cached counts instantly
    // --------------------------
    useEffect(() => {
        const cachedQuestions = localStorage.getItem("totalQuestions");
        if (cachedQuestions) setTotalQuestions(Number(cachedQuestions));

        const cachedSimPapers = localStorage.getItem("totalSimulationPapers");
        if (cachedSimPapers) setTotalSimulationPapers(Number(cachedSimPapers));

        const cachedNotes = localStorage.getItem("totalNotes");
        if (cachedNotes) setTotalNotes(Number(cachedNotes));

        const cachedVideos = localStorage.getItem("totalVideos");
        if (cachedVideos) setTotalVideos(Number(cachedVideos));

        const cachedStars = localStorage.getItem("totalStars");
        if (cachedStars) setTotalStars(Number(cachedStars));

        const cachedEvents = localStorage.getItem("totalEvents");
        if (cachedEvents) setTotalEvents(Number(cachedEvents));

        const cachedMistakes = localStorage.getItem("mistakeCount");
        if (cachedMistakes) setMistakeCount(Number(cachedMistakes));

        const cachedAnnouncements = localStorage.getItem("unreadAnnouncements");
        if (cachedAnnouncements) setUnreadAnnouncements(Number(cachedAnnouncements));
    }, []);

    // --------------------------
    // Fetch counts from Supabase & cache
    // --------------------------
    useEffect(() => {
        const fetchCounts = async () => {

            if (!user) return;

            // Mistakes
            const { count: mistakesCount } = await supabase
                .from("user_mistakes")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("resolved", false);
            setAndCache("mistakeCount", mistakesCount || 0, setMistakeCount);

            // Questions
            const { count: questionsCount } = await supabase
                .from("quiz_questions")
                .select("*", { count: "exact", head: true });
            setAndCache("totalQuestions", questionsCount || 0, setTotalQuestions);

            // Simulation Papers
            const { count: simCount } = await supabase
                .from("simulation_papers")
                .select("*", { count: "exact", head: true });
            setAndCache("totalSimulationPapers", simCount || 0, setTotalSimulationPapers);

            // Notes
            const { count: notesCount } = await supabase
                .from("notes")
                .select("*", { count: "exact", head: true });
            setAndCache("totalNotes", notesCount || 0, setTotalNotes);

            // Videos
            const { count: videosCount } = await supabase
                .from("medtube_videos")
                .select("*", { count: "exact", head: true });
            setAndCache("totalVideos", videosCount || 0, setTotalVideos);

            // Events
            const { count: eventsCount } = await supabase
                .from("calendar_events")
                .select("*", { count: "exact", head: true });
            setAndCache("totalEvents", eventsCount || 0, setTotalEvents);

            // Stars
            const { data: quizResults } = await supabase
                .from("quiz_results")
                .select("unit, score")
                .eq("user_id", user.id);
            const unitsWithScore = new Set(
                quizResults?.filter(r => r.score && r.score > 0).map(r => r.unit)
            );
            setAndCache("totalStars", unitsWithScore.size * 5, setTotalStars);

            // Announcements
            const { data: announcements } = await supabase
                .from("announcements")
                .select("id")
                .eq("is_published", true);
            const readIds = JSON.parse(localStorage.getItem("readAnnouncements") || "[]");
            setAndCache("unreadAnnouncements", (announcements?.length || 0) - readIds.length, setUnreadAnnouncements);
        };

        fetchCounts();
    }, [user]);

    // --------------------------
    // Listen for localStorage changes to update badges in real-time
    // --------------------------
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (!e.key) return;

            switch (e.key) {
                case "totalQuestions":
                    setTotalQuestions(Number(e.newValue));
                    break;
                case "totalSimulationPapers":
                    setTotalSimulationPapers(Number(e.newValue));
                    break;
                case "totalNotes":
                    setTotalNotes(Number(e.newValue));
                    break;
                case "totalVideos":
                    setTotalVideos(Number(e.newValue));
                    break;
                case "totalStars":
                    setTotalStars(Number(e.newValue));
                    break;
                case "totalEvents":
                    setTotalEvents(Number(e.newValue));
                    break;
                case "mistakeCount":
                    setMistakeCount(Number(e.newValue));
                    break;
                case "unreadAnnouncements":
                    setUnreadAnnouncements(Number(e.newValue));
                    break;
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
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
    const sections: { label: string; items: (DrawerItem & { badge?: string; iconTone?: IconTone; hasDot?: boolean })[] }[] = [
        {
            label: "Main",
            items: [
                { title: "Dashboard", url: `/dashboard/${userRole}`, icon: Home, iconTone: "neutral" },
                { title: "Feed", url: "/feed", icon: Newspaper, iconTone: "content", hasDot: true },
                { title: "AI Assistant", url: "/ai-assistant", icon: Brain, iconTone: "ai" },
                { title: "Forum", url: "/forum", icon: MessageSquare, iconTone: "communication" },
                { title: "Mistakes", url: "/my-mistakes", icon: AlertCircle, badge: mistakeCount > 0 ? formatNumber(mistakeCount) : undefined, iconTone: "alert" },
            ],
        },
        {
            label: "Learning",
            items: [
                { title: "Tracker", url: "/calendar", icon: Calendar, badge: formatNumber(totalEvents), iconTone: "progress" },
                { title: "Progress", url: "/progress", icon: TrendingUp, badge: `${totalStars}★`, iconTone: "progress" },
                { title: "Quizzes", url: "/Medrae-quizzes", icon: Heart, badge: formatNumber(totalQuestions), iconTone: "practice" },
                { title: "Proctorium", url: "/simulation/candidate", icon: Play, badge: formatNumber(totalSimulationPapers), iconTone: "practice" },
                { title: "A.Notes", url: "/assessment-notes", icon: BookOpen, iconTone: "content", hasDot: true },
                { title: "Resources", url: "/resources", icon: FileText, badge: formatNumber(totalNotes), iconTone: "content" },
            ],

        },
        {
            label: "Institutional Exams",
            items: (() => {
                const items: (DrawerItem & { iconTone?: IconTone })[] = [];

                if (userRoleState === "student") {
                    items.push(
                        {
                            title: "Candidate Exams",
                            url: "/exam/candidate",
                            icon: Briefcase,
                            iconTone: "practice",
                        },
                        {
                            title: "Exam Results",
                            url: "/exam/results",
                            icon: TrendingUp,
                            iconTone: "progress",
                        }
                    );
                }

                if (userRoleState === "tutor") {
                    items.push(
                        {
                            title: "Student Analytics",
                            url: "/analytics",
                            icon: Users,
                            iconTone: "people",
                        },
                        {
                            title: "Tutor Exams",
                            url: "/tutor/exams",
                            icon: Briefcase,
                            iconTone: "practice",
                        },
                        {
                            title: "Exam Results",
                            url: "/tutor/exams/:paper_id/results",
                            icon: TrendingUp,
                            iconTone: "progress",
                        }
                    );
                }

                return items;
            })(),
        },
        {
            label: "Media",
            items: [
                { title: "MedTube", url: "/medtube", icon: Play, badge: totalVideos ? `${formatNumber(totalVideos)}` : undefined, iconTone: "media" },
            ],
        },
        {
            label: "Other",
            items: [
                {
                    title: "NursMartt",
                    url: "/market",
                    icon: () => (
                        <img
                            src="/Nurvia_logo.png"
                            alt="Nurvia Logo"
                            className="h-6 w-6 object-contain bg-transparent"
                        />
                    ),
                },
                { title: "Announcements", url: "/announcements", icon: Bell, badge: unreadAnnouncements > 0 ? formatNumber(unreadAnnouncements) : undefined, iconTone: "alert" },
                { title: "Feedback", url: "/feedback", icon: MessageSquareX, iconTone: "communication" },
                { title: "Settings", url: "/settings", icon: Settings, iconTone: "system" },
                { title: "Subscription", url: "/subscription", icon: CreditCard, iconTone: "finance" },
            ],
        },
    ];


    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setIsOpen(false)} />}
            <div
                ref={drawerRef}
                className={`fixed bottom-0 left-0 w-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 shadow-xl transition-transform duration-300 rounded-t-xl z-40 md:hidden ${isOpen ? "translate-y-0" : "translate-y-full"}`}
                style={{ maxHeight: "75vh", bottom: "4rem" }}
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-white/20 bg-transparent z-10">
                    <div className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center">
                        <img
                            src="/pwa-192x192.jpeg"
                            alt="Logo"
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-white">
                            MEDRAE
                        </h2>
                        <p className="text-xs text-white/70">
                            Kenya Nursing Network Platform (MKN)
                        </p>
                    </div>
                </div>
                {/* Scrollable content */}
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar" style={{ maxHeight: "calc(70vh - 80px)" }}>
                    {sections.map(section => section.items.length > 0 && (
                        <div key={section.label}>
                            <h3 className="text-white/80 text-xs font-semibold mb-2 uppercase">{section.label}</h3>
                            <div className="flex flex-wrap justify-start gap-x-2 gap-y-2">
                                {section.items.map(item => (
                                    <div key={item.title} className="relative">
                                        <button
                                            className="relative flex flex-col items-center text-xs text-white w-16 h-18"
                                            onClick={() => {
                                                tapFeedback();
                                                navigate(item.url);
                                                setIsOpen(false);
                                            }}
                                        >
                                            {/* Icon with tone */}
                                            <div
                                                className={`
            flex items-center justify-center p-2 rounded-md
            ${ICON_TONE_STYLES[item.iconTone || "neutral"].box.light}
            dark:${ICON_TONE_STYLES[item.iconTone || "neutral"].box.dark}
        `}
                                            >
                                                <item.icon
                                                    className={`
                h-6 w-6
                ${ICON_TONE_STYLES[item.iconTone || "neutral"].icon.light}
                dark:${ICON_TONE_STYLES[item.iconTone || "neutral"].icon.dark}
            `}
                                                />
                                            </div>

                                            {/* Badge */}
                                            {item.badge && (
                                                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full -translate-x-1/2 -translate-y-3/4">
                                                    {item.badge}
                                                </span>
                                            )}

                                            {/* Small red dot */}
                                            {item.hasDot && (
                                                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full -translate-x-1/2 -translate-y-3/4" />
                                            )}

                                            {/* Title */}
                                            <span className="mt-1 text-white/90">{item.title}</span>
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
