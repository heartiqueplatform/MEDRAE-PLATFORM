/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { motion, AnimatePresence } from "framer-motion";
import { playSound } from "@/lib/soundManager";
import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useDrawer } from "@/contexts/DrawerContext";
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
    AlertCircle,
    User,
    Flame,
    LogOut,
    Crown, Share2,
    ChevronRight,
    GraduationCap,
    BarChart3,
    BookOpenCheck,
    MessageCircle
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useProfileData } from "@/hooks/useProfileData";
import { useSession } from "@supabase/auth-helpers-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUserRole } from "@/context/UserRoleContext";
import { getProfileCache, setProfileCache, clearProfileCache } from "@/lib/profileCache";

interface MobileDrawerProps {
    userRole?: "student" | "tutor" | "staff";
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

interface DrawerItem {
    title: string;
    url: string;
    icon: any;
}

type IconTone =
    | "neutral" | "ai" | "learning" | "progress" | "practice" | "alert"
    | "communication" | "media" | "finance" | "system" | "people" | "content";

const ICON_TONE_STYLES: Record<IconTone, { box: { light: string; dark: string }; icon: { light: string; dark: string } }> = {
    neutral: { box: { light: "bg-slate-50", dark: "bg-slate-800/50" }, icon: { light: "text-slate-600", dark: "text-slate-300" } },
    ai: { box: { light: "bg-purple-50", dark: "bg-purple-900/40" }, icon: { light: "text-purple-600", dark: "text-purple-400" } },
    learning: { box: { light: "bg-blue-50", dark: "bg-blue-900/40" }, icon: { light: "text-blue-600", dark: "text-blue-400" } },
    progress: { box: { light: "bg-emerald-50", dark: "bg-emerald-900/40" }, icon: { light: "text-emerald-600", dark: "text-emerald-400" } },
    practice: { box: { light: "bg-rose-50", dark: "bg-rose-900/40" }, icon: { light: "text-rose-600", dark: "text-rose-400" } },
    alert: { box: { light: "bg-amber-50", dark: "bg-amber-900/40" }, icon: { light: "text-amber-600", dark: "text-amber-400" } },
    communication: { box: { light: "bg-cyan-50", dark: "bg-cyan-900/40" }, icon: { light: "text-cyan-600", dark: "text-cyan-400" } },
    media: { box: { light: "bg-violet-50", dark: "bg-violet-900/40" }, icon: { light: "text-violet-600", dark: "text-violet-400" } },
    finance: { box: { light: "bg-emerald-50", dark: "bg-emerald-900/40" }, icon: { light: "text-emerald-600", dark: "text-emerald-400" } },
    system: { box: { light: "bg-slate-100", dark: "bg-slate-800" }, icon: { light: "text-slate-500", dark: "text-slate-300" } },
    people: { box: { light: "bg-indigo-50", dark: "bg-indigo-900/40" }, icon: { light: "text-indigo-600", dark: "text-indigo-400" } },
    content: { box: { light: "bg-indigo-50", dark: "bg-indigo-900/40" }, icon: { light: "text-indigo-600", dark: "text-indigo-400" } },
};

const NATIVE_EASE = [0.32, 0.72, 0, 1];
const DRAWER_VARIANTS = {
    hidden: { y: "100%", transition: { duration: 0.25, ease: "easeInOut" } },
    visible: {
        y: 0,
        transition: { duration: 0.4, ease: NATIVE_EASE }
    }
};

const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

const preloadUserProfile = () => {
    try {
        const sharedCache = getProfileCache();
        if (sharedCache && sharedCache.name && sharedCache.name !== "Unknown User") {
            return {
                name: sharedCache.name,
                email: "",
                role: sharedCache.role || "Student",
                avatar_url: sharedCache.avatar_url || "",
                streak: Number(localStorage.getItem('userStreak')) || 0
            };
        }

        const cached = localStorage.getItem('userProfile');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (parsed.name && parsed.name !== "Unknown User") {
                    return {
                        name: parsed.name,
                        email: "",
                        role: parsed.role || "Student",
                        avatar_url: parsed.avatar_url || "",
                        streak: Number(localStorage.getItem('userStreak')) || 0
                    };
                }
            } catch (e) { /* silent */ }
        }

        return {
            name: "",
            email: "",
            role: "",
            avatar_url: "",
            streak: 0
        };
    } catch (e) {
        return {
            name: "",
            email: "",
            role: "",
            avatar_url: "",
            streak: 0
        };
    }
};

const preloadUserRole = (): "student" | "tutor" | null => {
    try {
        const sharedCache = getProfileCache();
        if (sharedCache?.role === "tutor") return "tutor";
        if (sharedCache?.role === "student") return "student";

        const cached = localStorage.getItem('userProfile');
        if (cached) {
            try {
                const { role } = JSON.parse(cached);
                return role === "tutor" ? "tutor" : role === "student" ? "student" : null;
            } catch (e) {
                return null;
            }
        }
        return null;
    } catch (e) {
        return null;
    }
};

const DrawerItemButton = memo(({
    item,
    tone,
    onPress,
}: {
    item: DrawerItem & { iconTone?: IconTone };
    tone: IconTone;
    onPress: () => void;
}) => (
    <button
        className="group flex flex-col items-center gap-1.5 transition-transform active:scale-95"
        onClick={onPress}
        style={{
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
        }}
    >
        <div className="relative">
            <div className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all shadow-sm
                ${ICON_TONE_STYLES[tone].box.light} dark:${ICON_TONE_STYLES[tone].box.dark}
                will-change-transform group-active:scale-90`}>
                <item.icon className={`h-6 w-6 ${ICON_TONE_STYLES[tone].icon.light} dark:${ICON_TONE_STYLES[tone].icon.dark}`} />
            </div>
        </div>
        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">
            {item.title}
        </span>
    </button>
));
DrawerItemButton.displayName = "DrawerItemButton";

const DrawerSection = memo(({
    section,
    onNavigate,
    onClose,
}: {
    section: { label: string; items: any[] };
    onNavigate: (url: string) => void;
    onClose: () => void;
}) => (
    <div className="space-y-3">
        <div className="flex items-center gap-2">
            <div className="h-1 w-4 bg-blue-500 rounded-full" />
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
                {section.label}
            </h3>
        </div>
        <div className="grid grid-cols-4 gap-x-2 gap-y-5">
            {section.items.map((item: any) => (
                <DrawerItemButton
                    key={item.title}
                    item={item}
                    tone={item.iconTone || "neutral"}
                    onPress={() => {
                        onNavigate(item.url);
                        onClose();
                    }}
                />
            ))}
        </div>
    </div>
));
DrawerSection.displayName = "DrawerSection";

const QuizzesHeartIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
);

const PlayFilledIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M4 2v20l18-10L4 2z" />
    </svg>
);

export function MobileDrawer({ userRole: propUserRole, isOpen, setIsOpen }: MobileDrawerProps) {
    const { setIsOpen: setDrawerContext } = useDrawer();
    const navigate = useNavigate();
    const drawerRef = useRef<HTMLDivElement>(null);
    const isOnline = useOnlineStatus();
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [contentReady, setContentReady] = useState(false);
    const isMounted = useRef(true);
    const profile = useProfileData();
    const { role: contextRole } = useUserRole();

    const userRole = (contextRole || propUserRole || preloadUserRole() || 'student') as 'student' | 'tutor' | 'staff';

    const [userProfile, setUserProfile] = useState(preloadUserProfile);
    const [userRoleState, setUserRoleState] = useState<"student" | "tutor" | null>(preloadUserRole);

    const session = useSession();
    const user = session?.user || null;

    // ✅ Track dark mode with proper state
    const [isDarkMode, setIsDarkMode] = useState(false);
    // 👈 Sync the drawer state with context
    useEffect(() => {
        setDrawerContext(isOpen);
    }, [isOpen, setDrawerContext]);
    // ✅ Initialize dark mode on mount
    useEffect(() => {
        const checkDarkMode = () => {
            try {
                const darkMode = localStorage.getItem('medrae_dark_mode');
                if (darkMode !== null) {
                    setIsDarkMode(darkMode === 'true');
                } else {
                    setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
                }
            } catch (e) {
                setIsDarkMode(false);
            }
        };
        checkDarkMode();
    }, []);

    // ✅ Listen for dark mode changes
    useEffect(() => {
        const handleDarkModeChange = () => {
            try {
                const darkMode = localStorage.getItem('medrae_dark_mode');
                if (darkMode !== null) {
                    setIsDarkMode(darkMode === 'true');
                }
            } catch (e) { }
        };

        window.addEventListener('storage', handleDarkModeChange);
        return () => window.removeEventListener('storage', handleDarkModeChange);
    }, []);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setContentReady(true), 50);
            return () => clearTimeout(timer);
        } else {
            setContentReady(false);
        }
    }, [isOpen]);

    const tapFeedback = useCallback((type: "light" | "success" | "warning" = "light") => {
        playSound("ui-tap");
        if (navigator.vibrate) {
            if (type === "success") {
                navigator.vibrate([30, 40, 30]);
            } else if (type === "warning") {
                navigator.vibrate(100);
            } else {
                navigator.vibrate(35);
            }
        }
    }, []);

    // ✅ Background profile fetch with dark mode support
    useEffect(() => {
        if (!user?.id) return;

        let isSubscribed = true;

        const fetchUserProfile = async () => {
            try {
                const { data: profileData, error: profileError } = await supabase
                    .from("profiles")
                    .select("name, role, avatar_url")
                    .eq("user_id", user.id)
                    .single();

                if (profileError) throw profileError;

                const { data: streakData } = await supabase
                    .from("login_activity")
                    .select("streak")
                    .eq("user_id", user.id)
                    .order("login_date", { ascending: false })
                    .limit(1)
                    .single();

                const newProfile = {
                    name: profileData?.name || user.email?.split('@')[0] || "User",
                    email: user.email || "",
                    role: profileData?.role || "Student",
                    avatar_url: profileData?.avatar_url || profileData?.avatar_path || "",
                    streak: streakData?.streak || 0
                };

                if (isSubscribed) {
                    const hasChanged =
                        userProfile.name !== newProfile.name ||
                        userProfile.email !== newProfile.email ||
                        userProfile.role !== newProfile.role ||
                        userProfile.avatar_url !== newProfile.avatar_url ||
                        userProfile.streak !== newProfile.streak;

                    if (hasChanged) {
                        setUserProfile(newProfile);
                        setUserRoleState(profileData?.role === "tutor" ? "tutor" : profileData?.role === "student" ? "student" : null);
                        setProfileCache({
                            name: profileData?.name || user.email?.split('@')[0] || "User",
                            role: profileData?.role || "Student",
                            avatar_url: profileData?.avatar_url || profileData?.avatar_path || "",
                        });
                    }
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            }
        };

        const sharedCache = getProfileCache();
        let shouldFetch = true;
        if (sharedCache && sharedCache.name && sharedCache.name !== "Unknown User") {
            shouldFetch = false;
        }

        if (!shouldFetch) {
            const timer = setTimeout(() => {
                if (isSubscribed) {
                    fetchUserProfile();
                }
            }, 3000);
            return () => {
                isSubscribed = false;
                clearTimeout(timer);
            };
        } else {
            fetchUserProfile();
            return () => {
                isSubscribed = false;
            };
        }
    }, [user, userProfile]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, setIsOpen]);

    const getAvatarUrl = useCallback((url: string | null | undefined): string | undefined => {
        if (!url) {
            const cached = getProfileCache();
            if (cached?.avatar_url) return cached.avatar_url;
            return undefined;
        }

        const cacheKey = `avatar_cache_${user?.id}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const { url: cachedUrl, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_EXPIRY) {
                    return cachedUrl;
                }
            } catch (e) { }
        }

        let finalUrl: string | undefined;
        if (url.startsWith('http')) {
            finalUrl = url;
        } else if (url.startsWith('/storage/') || url.includes('supabase')) {
            const { data } = supabase.storage.from('avatars').getPublicUrl(url);
            finalUrl = data.publicUrl;
        } else {
            finalUrl = url;
        }

        if (finalUrl && user?.id) {
            localStorage.setItem(cacheKey, JSON.stringify({ url: finalUrl, timestamp: Date.now() }));
        }

        return finalUrl;
    }, [user?.id]);
    // In your dark mode toggle component/function
    const toggleDarkMode = () => {
        const newMode = !isDarkMode;
        localStorage.setItem('medrae_dark_mode', String(newMode));

        // ✅ Dispatch custom event for same-tab listeners
        window.dispatchEvent(new CustomEvent('darkmodechange', {
            detail: { darkMode: newMode }
        }));

        setIsDarkMode(newMode);
    };

    // In MobileDrawer component
    useEffect(() => {
        const handleDarkModeChange = (event: CustomEvent) => {
            setIsDarkMode(event.detail.darkMode);
        };

        window.addEventListener('darkmodechange', handleDarkModeChange);
        return () => window.removeEventListener('darkmodechange', handleDarkModeChange);
    }, []);
    const handleNavigate = useCallback((url: string) => {
        tapFeedback("light");
        navigate(url);
        setIsOpen(false);
    }, [navigate, tapFeedback, setIsOpen]);

    const handleLogout = useCallback(async () => {
        setIsLoggingOut(true);
        tapFeedback();
        clearProfileCache();
        localStorage.removeItem(`avatar_cache_${user?.id}`);
        localStorage.removeItem("readAnnouncements");
        localStorage.removeItem("userProfile");

        await supabase.auth.signOut();
        navigate("/login");
        setIsOpen(false);
        setShowLogoutDialog(false);
        setIsLoggingOut(false);
    }, [navigate, tapFeedback, setIsOpen, user?.id]);

    const nckExamPrepItems = useMemo(() => [
        {
            title: "Prep Quizzes",
            url: "/Medrae-quizzes",
            icon: QuizzesHeartIcon,
            iconTone: "practice" as IconTone,
        },
        {
            title: "NCK Progress",
            url: "/progress",
            icon: TrendingUp,
            iconTone: "progress" as IconTone,
        },
        {
            title: "Proctorium",
            url: "/simulation/candidate",
            icon: PlayFilledIcon,
            iconTone: "practice" as IconTone,
        },
    ], []);

    const sections = useMemo(() => {
        const sectionsArray = [
            {
                label: "Main",
                items: [
                    { title: "Dashboard", url: `/dashboard/${userRole}`, icon: Home, iconTone: "neutral" as IconTone },
                    { title: "Nursing Compass", url: "/nursing", icon: BookOpenCheck, iconTone: "learning" as IconTone },
                    { title: "Feed", url: "/feed", icon: Newspaper, iconTone: "content" },
                    { title: "Nurse Duel (N.D)", url: "/challenge", icon: Swords, iconTone: "practice" },
                    { title: "AI Assistant", url: "/ai-assistant", icon: Brain, iconTone: "ai" },
                    { title: "Mistakes", url: "/my-mistakes", icon: AlertCircle, iconTone: "alert" },
                    { title: "Survival Hub", url: "/survival-hub", icon: Compass, iconTone: "learning" },
                ],
            },
            {
                label: "NCK Exam Prep",
                items: nckExamPrepItems,
            },
        ];

        if (userRole === "student") {
            sectionsArray.push({
                label: "Institutional Exams",
                items: [
                    { title: "Candidate Exams", url: "/exam/candidate", icon: GraduationCap, iconTone: "learning" as IconTone },
                    { title: "Exam Results", url: "/exam/results", icon: BarChart3, iconTone: "progress" as IconTone },
                ],
            });
        } else if (userRole === "tutor") {
            sectionsArray.push({
                label: "Institutional Exams",
                items: [
                    { title: "Tutor Exams", url: "/tutor/exams", icon: GraduationCap, iconTone: "learning" as IconTone },
                    { title: "Exam Results", url: "/tutor/exams/:paper_id/results", icon: BarChart3, iconTone: "progress" as IconTone },
                ],
            });
        }

        sectionsArray.push(
            {
                label: "Learning",
                items: [
                    { title: "Clinical Assessments", url: "/assessments", icon: Brain, iconTone: "practice" as IconTone },
                    { title: "Assessment History", url: "/assessments/history", icon: BarChart3, iconTone: "progress" as IconTone },
                    { title: "Tracker", url: "/calendar", icon: Calendar, iconTone: "progress" },
                    { title: "Live Classes", url: "/live-classes", icon: Video, iconTone: "learning" as IconTone },
                    { title: "My Classes", url: "/my-classes", icon: Calendar, iconTone: "learning" as IconTone },
                    { title: "Create Class", url: "/live-classes/create", icon: Video, iconTone: "learning" as IconTone },
                    { title: "Assessment Notes", url: "/assessment-notes", icon: BookOpen, iconTone: "content" as IconTone },
                    { title: "Resources", url: "/resources", icon: FileText, iconTone: "content" as IconTone },
                ],
            },
            {
                label: "Media",
                items: [
                    { title: "MedTube", url: "/medtube", icon: Play, iconTone: "media" },
                ],
            },
            {
                label: "Other",
                items: [
                    { title: "NursMartt", url: "/market", icon: () => <img src="/Nurvia_logo.png" alt="Logo" className="h-6 w-6 object-contain" />, iconTone: "neutral" },
                    { title: "Announcements", url: "/announcements", icon: Bell, iconTone: "alert" },
                    { title: "Help Center", url: "/help", icon: MessageCircle, iconTone: "communication" as IconTone },
                    { title: "Feedback", url: "/feedback", icon: MessageSquareX, iconTone: "communication" },
                    { title: "Settings", url: "/settings", icon: Settings, iconTone: "system" },
                    { title: "Subscription", url: "/subscription", icon: CreditCard, iconTone: "finance" },
                    { title: "GroupPay", url: "/grouppay", icon: Users, iconTone: "practice" as IconTone },
                ],
            }
        );

        return sectionsArray;
    }, [userRole, nckExamPrepItems]);

    const avatarUrl = getAvatarUrl(userProfile.avatar_url);
    const initials = userProfile.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    const hasProfileData = userProfile.name !== "" || userProfile.email !== "";

    // ✅ Theme-aware drawer background
    const drawerBgClass = isDarkMode ? 'bg-gray-950' : 'bg-white';

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop - Dark mode aware */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] md:hidden"
                        />

                        <motion.div
                            ref={drawerRef}
                            variants={DRAWER_VARIANTS}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            className={`fixed bottom-0 left-0 right-0 z-[99999] ${drawerBgClass} shadow-2xl rounded-t-[2.5rem] md:hidden overflow-hidden`}
                            style={{
                                maxHeight: "92vh",
                                willChange: "transform",
                                backfaceVisibility: "hidden",
                                transform: "translateZ(0)"
                            }}
                        >
                            {/* Pull Bar - Dark mode aware */}
                            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-4 mb-2" />

                            {/* Header - Dark mode aware */}
                            <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-800 h-[72px]">
                                <div className="h-10 w-10 rounded-xl overflow-hidden flex-shrink-0">
                                    <img src="/pwa-192x192.jpeg" alt="Logo" className="h-full w-full object-cover" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-base font-black tracking-tight">
                                        <span className="bg-gradient-to-r from-red-600 to-red-500 dark:from-red-500 dark:to-red-400 bg-clip-text text-transparent">MEDRAE </span>
                                        <span className="bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-400 bg-clip-text text-transparent">NURSING </span>
                                        <span className="text-gray-800 dark:text-white">HUB</span>
                                    </h2>
                                </div>
                                <button
                                    onClick={() => {
                                        tapFeedback();
                                        setIsOpen(false);
                                    }}
                                    className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* SCROLLABLE AREA */}
                            <div className="px-6 pb-12 overflow-y-auto custom-scrollbar" style={{ maxHeight: "calc(92vh - 72px)" }}>
                                {!contentReady ? (
                                    <div className="h-40 flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent animate-spin rounded-full" />
                                    </div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                        className="space-y-6 pt-4"
                                    >
                                        {/* User Profile Section - Dark mode aware */}
                                        <button
                                            onClick={() => handleNavigate("/profile")}
                                            className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all active:scale-98
                                                bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40
                                                border border-blue-100 dark:border-blue-900/50
                                                hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/60 dark:hover:to-indigo-900/60`}
                                            style={{ touchAction: 'manipulation' }}
                                        >
                                            <div className="relative flex-shrink-0">
                                                <Avatar>
                                                    <AvatarImage
                                                        src={profile?.avatar_url || avatarUrl || ""}
                                                        className="object-cover"
                                                    />
                                                    <AvatarFallback className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                                                        {initials || "U"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-bold text-base text-gray-900 dark:text-white truncate">
                                                        {userProfile.name || "User"}
                                                    </h3>
                                                    {userProfile.role === "tutor" && <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {userProfile.email || user?.email || ""}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                                        {userProfile.role || "Student"}
                                                    </Badge>
                                                    {userProfile.streak > 0 && isOnline && (
                                                        <Badge className={`text-[10px] px-1.5 py-0 h-4 flex items-center gap-0.5
                                                            ${userProfile.streak <= 7 ? "bg-red-600 text-white" :
                                                                userProfile.streak <= 30 ? "bg-purple-700 text-white" :
                                                                    "bg-gray-900 dark:bg-gray-700 text-white"}`}>
                                                            <Flame className="h-2.5 w-2.5" />
                                                            {userProfile.streak} day{userProfile.streak !== 1 ? "s" : ""}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                        </button>

                                        {/* Render Sections */}
                                        {sections.map((section, idx) => section.items.length > 0 && (
                                            <DrawerSection
                                                key={idx}
                                                section={section}
                                                onNavigate={handleNavigate}
                                                onClose={() => setIsOpen(false)}
                                            />
                                        ))}

                                        {/* Logout Button - Dark mode aware */}
                                        <button
                                            onClick={() => setShowLogoutDialog(true)}
                                            disabled={isLoggingOut}
                                            className={`w-full flex items-center justify-center gap-2 py-3 mt-4 rounded-xl transition-all active:scale-98 disabled:opacity-50
                                                bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50
                                                hover:bg-red-100 dark:hover:bg-red-900/50`}
                                            style={{ touchAction: 'manipulation' }}
                                        >
                                            {isLoggingOut ? (
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 dark:border-red-400 border-t-transparent" />
                                            ) : (
                                                <LogOut className="h-4 w-4 text-red-600 dark:text-red-400" />
                                            )}
                                            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                                {isLoggingOut ? "Logging out..." : "Logout"}
                                            </span>
                                        </button>

                                        <div className="pt-4 text-center">
                                            <p className="text-[9px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-widest">
                                                Version 2026.06 • Medrae Learning System
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Logout Dialog - Dark mode aware */}
            <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <AlertDialogContent className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800">
                    <AlertDialogHeader className="text-center space-y-3">
                        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-2">
                            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </div>
                        <AlertDialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                            Leaving so soon? 💔
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
                            You'll be signed out of your account, and any unsaved changes will be lost forever.
                            <span className="text-sm text-gray-500 dark:text-gray-500 block mt-2">
                                We'd really hate to see you go...
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex gap-3 mt-6">
                        <AlertDialogCancel onClick={() => tapFeedback()} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border-0 text-gray-700 dark:text-gray-300 rounded-xl py-6 transition-all active:scale-95 font-medium">
                            Stay Signed In
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                tapFeedback("warning");
                                handleLogout();
                            }}
                            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl py-6 transition-all active:scale-95 font-medium shadow-md"
                        >
                            Yes, Logout
                        </AlertDialogAction>
                    </AlertDialogFooter>
                    <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                        We'll be waiting for your return ✨
                    </p>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}