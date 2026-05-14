"use client";
import { motion, AnimatePresence } from "framer-motion";


import { playSound } from "@/lib/soundManager";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Brain,
    X,
    Compass,
    Swords,
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
            box: { light: "bg-slate-50", dark: "bg-slate-900/40" },
            icon: { light: "text-slate-600", dark: "text-slate-400" },
        },
        ai: {
            box: { light: "bg-purple-50", dark: "bg-purple-900/40" },
            icon: { light: "text-purple-600", dark: "text-purple-400" },
        },
        learning: {
            box: { light: "bg-blue-50", dark: "bg-blue-900/40" },
            icon: { light: "text-blue-600", dark: "text-blue-400" },
        },
        progress: {
            box: { light: "bg-emerald-50", dark: "bg-emerald-900/40" },
            icon: { light: "text-emerald-600", dark: "text-emerald-400" },
        },
        practice: {
            box: { light: "bg-rose-50", dark: "bg-rose-900/40" },
            icon: { light: "text-rose-600", dark: "text-rose-400" },
        },
        alert: {
            box: { light: "bg-amber-50", dark: "bg-amber-900/40" },
            icon: { light: "text-amber-600", dark: "text-amber-400" },
        },
        communication: {
            box: { light: "bg-cyan-50", dark: "bg-cyan-900/40" },
            icon: { light: "text-cyan-600", dark: "text-cyan-400" },
        },
        media: {
            box: { light: "bg-violet-50", dark: "bg-violet-900/40" },
            icon: { light: "text-violet-600", dark: "text-violet-400" },
        },
        finance: {
            box: { light: "bg-emerald-50", dark: "bg-emerald-900/40" },
            icon: { light: "text-emerald-600", dark: "text-emerald-400" },
        },
        system: {
            box: { light: "bg-slate-100", dark: "bg-slate-800" },
            icon: { light: "text-slate-500", dark: "text-slate-300" },
        },
        people: {
            box: { light: "bg-indigo-50", dark: "bg-indigo-900/40" },
            icon: { light: "text-indigo-600", dark: "text-indigo-400" },
        },
        content: {
            box: { light: "bg-indigo-50", dark: "bg-indigo-900/40" },
            icon: { light: "text-indigo-600", dark: "text-indigo-400" },
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
                { title: "Challenges", url: "/challenge", icon: Swords, iconTone: "practice" },
                { title: "AI Assistant", url: "/ai-assistant", icon: Brain, iconTone: "ai" },
                { title: "Forum", url: "/forum", icon: MessageSquare, iconTone: "communication" },
                { title: "Mistakes", url: "/my-mistakes", icon: AlertCircle, badge: mistakeCount > 0 ? formatNumber(mistakeCount) : undefined, iconTone: "alert" },
                {
                    title: "Survival Hub",
                    url: "/survival-hub",
                    icon: Compass,
                    iconTone: "learning",
                    badge: "New"
                },
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
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* 1. BLURRED BACKDROP */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50] md:hidden"
                    />

                    {/* 2. THE BOTTOM SHEET */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-[120] bg-white/95 dark:bg-gray-950/95 backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-gray-200 dark:border-gray-800 rounded-t-[2.5rem] md:hidden overflow-hidden"
                        style={{ maxHeight: "85vh" }}
                    >
                        {/* Drag Handle Indicator */}
                        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-4 mb-2" />

                        {/* DRAWER HEADER */}
                        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-900">
                            <div className="h-12 w-12 rounded-2xl overflow-hidden shadow-lg ring-2 ring-blue-500/10">
                                <img
                                    src="/pwa-192x192.jpeg"
                                    alt="Logo"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div className="flex-1">
                                <h2 className="font-bold text-lg text-gray-900 dark:text-white leading-none">
                                    MEDRAE <span className="text-blue-600">HUB</span>
                                </h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                    Nursing Excellence Network
                                </p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* SCROLLABLE CONTENT */}
                        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar max-h-[calc(85vh-100px)] pb-12">
                            {sections.map((section: any) => section.items.length > 0 && (
                                <div key={section.label} className="space-y-4">
                                    {/* Section Label */}
                                    <div className="flex items-center gap-2">
                                        <div className="h-1 w-4 bg-blue-500 rounded-full" />
                                        <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
                                            {section.label}
                                        </h3>
                                    </div>

                                    {/* Items Grid (4 columns) */}
                                    <div className="grid grid-cols-4 gap-x-2 gap-y-6">
                                        {section.items.map((item: any) => (
                                            <button
                                                key={item.title}
                                                className="group flex flex-col items-center gap-2 transition-all active:scale-90"
                                                onClick={() => {
                                                    tapFeedback();
                                                    navigate(item.url);
                                                    setIsOpen(false);
                                                }}
                                            >
                                                {/* Icon Wrapper */}
                                                <div className="relative">
                                                    <div className={`
                                                        w-14 h-14 flex items-center justify-center rounded-2xl transition-all shadow-sm
                                                        ${ICON_TONE_STYLES[item.iconTone || "neutral"].box.light}
                                                        dark:${ICON_TONE_STYLES[item.iconTone || "neutral"].box.dark}
                                                        group-hover:scale-110
                                                    `}>
                                                        <item.icon className={`
                                                            h-6 w-6
                                                            ${ICON_TONE_STYLES[item.iconTone || "neutral"].icon.light}
                                                            dark:${ICON_TONE_STYLES[item.iconTone || "neutral"].icon.dark}
                                                        `} />
                                                    </div>

                                                    {/* Badge / Notification Dot */}
                                                    {item.badge && (
                                                        <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1.5 items-center justify-center bg-red-500 text-[10px] font-bold text-white rounded-full border-2 border-white dark:border-gray-950 shadow-sm">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                    {item.hasDot && (
                                                        <span className="absolute top-0 right-0 h-3 w-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-950" />
                                                    )}
                                                </div>

                                                {/* Title */}
                                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">
                                                    {item.title}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Drawer Footer Info */}
                            <div className="pt-4 text-center">
                                <p className="text-[9px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-widest">
                                    Version 2026.04 • Medrae Learning System
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
