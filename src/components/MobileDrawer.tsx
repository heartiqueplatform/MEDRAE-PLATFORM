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
    TrendingUp,
    Users,
    Video,
    CreditCard,
    Bell,
    MessageSquareX,
    BookOpen,
    CalendarDays,
    PenTool,
    Network,
    Newspaper,
    AlertCircle,
    Flame,
    LogOut,
    Crown,
    ChevronRight,
    GraduationCap,
    BarChart3,
    BookOpenCheck,
    MessageCircle,
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

/**
 * Facebook-style tone palette:
 * - Solid gradient circles
 * - White icons inside
 * - Compact size, soft colored shadow
 */
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

const NATIVE_EASE = [0.32, 0.72, 0, 1];
const PAGE_VARIANTS = {
    hidden: { y: "100%", opacity: 0.6, transition: { duration: 0.22, ease: "easeInOut" } },
    visible: { y: 0, opacity: 1, transition: { duration: 0.38, ease: NATIVE_EASE } }
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
        return { name: "", email: "", role: "", avatar_url: "", streak: 0 };
    } catch (e) {
        return { name: "", email: "", role: "", avatar_url: "", streak: 0 };
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
            } catch { return null; }
        }
        return null;
    } catch { return null; }
};

/* ---------------- Row Item (Facebook-style compact) ---------------- */
const DrawerRow = memo(({
    item,
    tone,
    onPress,
}: {
    item: DrawerItem & { iconTone?: IconTone };
    tone: IconTone;
    onPress: () => void;
}) => {
    const styles = ICON_TONE_STYLES[tone];
    return (
        <button
            onClick={onPress}
            className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left
                       transition-colors active:bg-slate-100/80 dark:active:bg-slate-800/60
                       hover:bg-slate-50 dark:hover:bg-slate-800/40"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        >
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${styles.box}
                             transition-transform group-active:scale-95`}>
                <item.icon className={`h-[18px] w-[18px] ${styles.icon}`} strokeWidth={2.3} />
            </div>
            <span className="flex-1 text-[13.5px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                {item.title}
            </span>
            <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
        </button>
    );
});
DrawerRow.displayName = "DrawerRow";

/* ---------------- Section ---------------- */
const DrawerSection = memo(({
    section,
    onNavigate,
    onClose,
}: {
    section: { label: string; items: any[] };
    onNavigate: (url: string) => void;
    onClose: () => void;
}) => {
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2 px-1 py-1">
                <div className="h-1 w-4 rounded-full bg-blue-500/70" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    {section.label}
                </h3>
            </div>
            <div className="space-y-0.5">
                {section.items.map((item: any) => (
                    <DrawerRow
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
    );
});
DrawerSection.displayName = "DrawerSection";

/* ---------------- Custom Icons ---------------- */
const QuizzesHeartIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
);

const PlayFilledIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M4 2v20l18-10L4 2z" />
    </svg>
);

const NursMartLogo = ({ className = "h-5 w-5" }: { className?: string }) => (
    <img src="/Nurvia_logo.png" alt="" className={`${className} object-contain`} />
);

/* ============================================================
   MAIN
   ============================================================ */
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

    useEffect(() => {
        setDrawerContext(isOpen);
    }, [isOpen, setDrawerContext]);

    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        try {
            const stored = localStorage.getItem('medrae_dark_mode');
            if (stored !== null) return stored === 'true';
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        } catch { return false; }
    });

    useEffect(() => {
        const handleThemeChanged = (e: Event) => {
            const detail = (e as CustomEvent<{ isDarkMode: boolean }>).detail;
            if (detail && typeof detail.isDarkMode === 'boolean') {
                setIsDarkMode(detail.isDarkMode);
                return;
            }
            try {
                const stored = localStorage.getItem('medrae_dark_mode');
                if (stored !== null) setIsDarkMode(stored === 'true');
            } catch { }
        };
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'medrae_dark_mode') setIsDarkMode(e.newValue === 'true');
        };
        window.addEventListener('theme-changed', handleThemeChanged as EventListener);
        window.addEventListener('storage', handleStorage);
        return () => {
            window.removeEventListener('theme-changed', handleThemeChanged as EventListener);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setContentReady(true), 60);
            return () => clearTimeout(timer);
        } else {
            setContentReady(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            const original = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = original; };
        }
    }, [isOpen]);

    const tapFeedback = useCallback((type: "light" | "success" | "warning" = "light") => {
        playSound("ui-tap");
        if (navigator.vibrate) {
            if (type === "success") navigator.vibrate([30, 40, 30]);
            else if (type === "warning") navigator.vibrate(100);
            else navigator.vibrate(35);
        }
    }, []);

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
                    avatar_url: profileData?.avatar_url || (profileData as any)?.avatar_path || "",
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
                            avatar_url: profileData?.avatar_url || (profileData as any)?.avatar_path || "",
                        });
                    }
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            }
        };

        const sharedCache = getProfileCache();
        let shouldFetch = true;
        if (sharedCache && sharedCache.name && sharedCache.name !== "Unknown User") shouldFetch = false;

        if (!shouldFetch) {
            const timer = setTimeout(() => { if (isSubscribed) fetchUserProfile(); }, 3000);
            return () => { isSubscribed = false; clearTimeout(timer); };
        } else {
            fetchUserProfile();
            return () => { isSubscribed = false; };
        }
    }, [user, userProfile]);

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
                if (Date.now() - timestamp < CACHE_EXPIRY) return cachedUrl;
            } catch { }
        }
        let finalUrl: string | undefined;
        if (url.startsWith('http')) finalUrl = url;
        else if (url.startsWith('/storage/') || url.includes('supabase')) {
            const { data } = supabase.storage.from('avatars').getPublicUrl(url);
            finalUrl = data.publicUrl;
        } else finalUrl = url;
        if (finalUrl && user?.id) {
            localStorage.setItem(cacheKey, JSON.stringify({ url: finalUrl, timestamp: Date.now() }));
        }
        return finalUrl;
    }, [user?.id]);

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
        { title: "Prep Quizzes", url: "/Medrae-quizzes", icon: QuizzesHeartIcon, iconTone: "practice" as IconTone },
        { title: "NCK Progress", url: "/progress", icon: TrendingUp, iconTone: "progress" as IconTone },
        { title: "Proctorium", url: "/simulation/candidate", icon: PlayFilledIcon, iconTone: "practice" as IconTone },
    ], []);

    const sections = useMemo(() => {
        const sectionsArray: { label: string; items: any[] }[] = [
            {
                label: "Main",
                items: [
                    { title: "Dashboard", url: `/dashboard/${userRole}`, icon: Home, iconTone: "neutral" as IconTone },
                    { title: "Nursing Compass", url: "/nursing", icon: BookOpenCheck, iconTone: "learning" as IconTone },
                    { title: "Feed", url: "/feed", icon: Newspaper, iconTone: "content" as IconTone },
                    { title: "Nurse Duel", url: "/challenge", icon: Swords, iconTone: "practice" as IconTone },
                    { title: "Mistakes", url: "/my-mistakes", icon: AlertCircle, iconTone: "alert" as IconTone },
                    { title: "Survival Hub", url: "/survival-hub", icon: Compass, iconTone: "learning" as IconTone },
                ],
            },
            { label: "NCK Exam Prep", items: nckExamPrepItems },
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
                    { title: "MedTube", url: "/medtube", icon: Play, iconTone: "media" as IconTone },
                ],
            },
            {
                label: "Other",
                items: [
                    { title: "NursMart", url: "/market", icon: NursMartLogo, iconTone: "neutral" as IconTone },
                    { title: "Announcements", url: "/announcements", icon: Bell, iconTone: "alert" as IconTone },
                    { title: "Help Center", url: "/help", icon: MessageCircle, iconTone: "communication" as IconTone },
                    { title: "Feedback", url: "/feedback", icon: MessageSquareX, iconTone: "communication" as IconTone },
                    { title: "Settings", url: "/settings", icon: Settings, iconTone: "system" as IconTone },
                    { title: "Subscription", url: "/subscription", icon: CreditCard, iconTone: "finance" as IconTone },
                    { title: "GroupPay", url: "/grouppay", icon: Users, iconTone: "practice" as IconTone },
                ],
            }
        );

        return sectionsArray;
    }, [userRole, nckExamPrepItems]);

    const avatarUrl = getAvatarUrl(userProfile.avatar_url);
    const initials = userProfile.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-md md:hidden"
                        />

                        {/* FULL-SCREEN PAGE */}
                        <motion.div
                            ref={drawerRef}
                            variants={PAGE_VARIANTS}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            className="fixed inset-0 z-[99999] md:hidden flex flex-col
                                       bg-white dark:bg-muted/30 backdrop-blur-xl"
                            style={{ willChange: "transform", backfaceVisibility: "hidden" }}
                        >
                            {/* Header */}
                            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100/70 dark:border-slate-800/60 flex-shrink-0">
                                <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700">
                                    <svg
                                        viewBox="0 0 192 192"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-full w-full"
                                        aria-label="MEDRAE Nursing Logo"
                                    >
                                        {/* White rounded background */}
                                        <rect x="0" y="0" width="192" height="192" rx="35" fill="#FFFFFF" />

                                        {/* Red Heart */}
                                        <path
                                            d="M96 169 C91 165 31 116 20 91 C8 64 23 38 48 32 C67 27 84 35 96 50 C108 35 125 27 144 32 C169 38 184 64 172 91 C161 116 101 165 96 169 Z"
                                            fill="#FF1F1F"
                                        />

                                        {/* Graduation Cap */}
                                        <path d="M44 82 L96 63 L150 82 L96 101 Z" fill="#FFFFFF" />

                                        {/* Cap lower body */}
                                        <path
                                            d="M62 88 V105 C62 111 77 119 96 122 C115 119 130 111 130 105 V88 L96 101 Z"
                                            fill="#FFFFFF"
                                        />

                                        {/* Red cap seam */}
                                        <path
                                            d="M62 91 V105 C62 111 77 119 96 122 C115 119 130 111 130 105 V91"
                                            fill="none"
                                            stroke="#FF1F1F"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                        />

                                        {/* Red cap string */}
                                        <path d="M96 82 V101" stroke="#FF1F1F" strokeWidth="2.5" />

                                        {/* Red button */}
                                        <circle cx="94" cy="82" r="3.5" fill="#FF1F1F" />

                                        {/* Tassel */}
                                        <path
                                            d="M94 82 C86 86 75 88 63 89"
                                            fill="none"
                                            stroke="#FF1F1F"
                                            strokeWidth="2"
                                        />

                                        {/* White tassel cord */}
                                        <path
                                            d="M63 89 C61 94 61 98 61 103"
                                            fill="none"
                                            stroke="#FFFFFF"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                        />

                                        {/* Tassel top */}
                                        <circle cx="61" cy="105" r="4" fill="#FFFFFF" />

                                        {/* Tassel */}
                                        <path d="M57 108 L65 108 L67 122 C63 124 59 124 55 122 Z" fill="#FFFFFF" />
                                    </svg>
                                </div>
                                <h2 className="flex-1 text-[15px] font-black tracking-tight">
                                    <span className="bg-gradient-to-r from-red-600 to-red-500 dark:from-red-500 dark:to-red-400 bg-clip-text text-transparent">MEDRAE </span>
                                    <span className="bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-400 bg-clip-text text-transparent">NURSING </span>
                                    <span className="text-slate-800 dark:text-white">HUB</span>
                                </h2>
                                <button
                                    onClick={() => { tapFeedback(); setIsOpen(false); }}
                                    aria-label="Close menu"
                                    className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300
                                               active:scale-90 transition-transform"
                                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                                >
                                    <X className="w-4.5 h-4.5" />
                                </button>
                            </div>

                            {/* SCROLLABLE CONTENT */}
                            <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-3.5 pb-10 pt-4">
                                {!contentReady ? (
                                    <div className="h-40 flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent animate-spin rounded-full" />
                                    </div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.25, ease: "easeOut" }}
                                        className="space-y-5"
                                    >
                                        {/* USER CARD */}
                                        <button
                                            onClick={() => handleNavigate("/profile")}
                                            className="w-full flex items-center gap-3 rounded-3xl p-3.5 text-left
                                                       bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50
                                                       dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/30
                                                       active:scale-[0.98] transition-transform"
                                            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                                        >
                                            <div className="relative flex-shrink-0">
                                                <Avatar className="h-12 w-12">
                                                    <AvatarImage src={profile?.avatar_url || avatarUrl || ""} className="object-cover" />
                                                    <AvatarFallback className="bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold">
                                                        {initials || "U"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900
                                                                  ${isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h3 className="font-bold text-[15px] text-slate-900 dark:text-white truncate">
                                                        {userProfile.name || "User"}
                                                    </h3>
                                                    {userProfile.role === "tutor" && (
                                                        <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                    {userProfile.email || user?.email || ""}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-1.5">
                                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 rounded-full
                                                        bg-white/80 dark:bg-slate-800/80 text-blue-700 dark:text-blue-300 border-0">
                                                        {userProfile.role || "Student"}
                                                    </Badge>
                                                    {userProfile.streak > 0 && isOnline && (
                                                        <Badge className={`text-[9px] px-1.5 py-0 h-4 rounded-full border-0 flex items-center gap-0.5
                                                            ${userProfile.streak <= 7 ? "bg-red-500 text-white" :
                                                                userProfile.streak <= 30 ? "bg-purple-600 text-white" :
                                                                    "bg-slate-800 dark:bg-slate-700 text-white"}`}>
                                                            <Flame className="h-2.5 w-2.5" />
                                                            {userProfile.streak}d
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                        </button>

                                        {/* SECTIONS */}
                                        <div className="space-y-4">
                                            {sections.map((section, idx) => section.items.length > 0 && (
                                                <DrawerSection
                                                    key={idx}
                                                    section={section}
                                                    onNavigate={handleNavigate}
                                                    onClose={() => setIsOpen(false)}
                                                />
                                            ))}
                                        </div>

                                        {/* LOGOUT */}
                                        <button
                                            onClick={() => setShowLogoutDialog(true)}
                                            disabled={isLoggingOut}
                                            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl transition-all
                                                       bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400
                                                       active:scale-[0.98] disabled:opacity-50"
                                            style={{ touchAction: 'manipulation' }}
                                        >
                                            {isLoggingOut ? (
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                                            ) : (
                                                <LogOut className="h-4 w-4" />
                                            )}
                                            <span className="text-[13px] font-semibold">
                                                {isLoggingOut ? "Signing out..." : "Sign out"}
                                            </span>
                                        </button>

                                        <div className="pt-2 text-center">
                                            <p className="text-[9px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">
                                                Version 2026.06 — Medrae Learning System
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Logout Dialog */}
            <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <AlertDialogContent className="bg-white dark:bg-muted/40 rounded-3xl border-0 shadow-2xl max-w-sm">
                    <AlertDialogHeader className="text-center space-y-3">
                        <div className="mx-auto w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <LogOut className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <AlertDialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                            Sign out of Medrae?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                            You'll need to sign in again to access your dashboard, quizzes, and progress.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex gap-2 mt-5">
                        <AlertDialogCancel
                            onClick={() => tapFeedback()}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700
                                       border-0 text-slate-700 dark:text-slate-300 rounded-2xl py-5 font-medium"
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => { tapFeedback("warning"); handleLogout(); }}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-2xl py-5 font-medium shadow-md"
                        >
                            Sign out
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}