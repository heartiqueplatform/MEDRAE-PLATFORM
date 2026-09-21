/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { motion, AnimatePresence } from "framer-motion";

import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
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
    Sparkles,
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
import { getCachedPremium, resolveSubscription } from "@/lib/subscription";
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
    | "communication" | "media" | "finance" | "system" | "people" | "content"
    | "premium";
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
    premium: {
        box: "bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 shadow-md shadow-amber-500/40",
        icon: "text-white"
    },
};

const NATIVE_EASE = [0.32, 0.72, 0, 1];
const PAGE_VARIANTS = {
    hidden: { y: "100%", opacity: 0.6, transition: { duration: 0.18, ease: "easeInOut" } },
    visible: { y: 0, opacity: 1, transition: { duration: 0.26, ease: NATIVE_EASE } }
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

/* ---------------- Row Item ---------------- */
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
                       transition-colors
                       hover:bg-slate-100 active:bg-slate-200
                       dark:hover:bg-[#161b22] dark:active:bg-[#21262d]"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        >
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${styles.box}
                             transition-transform group-active:scale-95`}>
                <item.icon className={`h-[18px] w-[18px] ${styles.icon}`} strokeWidth={2.3} />
            </div>
            <span className="flex-1 text-[13.5px] font-semibold text-slate-700 dark:text-[#c9d1d9] truncate">
                {item.title}
            </span>
            <ChevronRight className="h-4 w-4 text-slate-300 dark:text-[#6e7681] flex-shrink-0" />
        </button>
    );
});
DrawerRow.displayName = "DrawerRow";

/* ---------------- Section ---------------- */
const DrawerSection = memo(({
    section,
    onNavigate,
}: {
    section: { label: string; items: any[] };
    onNavigate: (url: string) => void;
}) => {
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2 px-1 py-1">
                <div className="h-1 w-4 rounded-full bg-[#58a6ff]/70" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-[#6e7681]">
                    {section.label}
                </h3>
            </div>
            <div className="space-y-0.5">
                {section.items.map((item: any) => (
                    <DrawerRow
                        key={item.title}
                        item={item}
                        tone={item.iconTone || "neutral"}
                        onPress={() => onNavigate(item.url)}
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

    /* ---- Subscription state ---- */
    const session = useSession();
    const user = session?.user || null;

    /* ---- Subscription state ---- */
    // Seed from the shared cache so offline premium users see "My Plan"
    // on the very first render — no flash of "Upgrade".
    const [activePlan, setActivePlan] = useState<string | null>(() => {
        if (getCachedPremium(user?.id)) return "premium";
        return null;
    });

    useEffect(() => {
        setDrawerContext(isOpen);
    }, [isOpen, setDrawerContext]);

    /* ---- Load subscription when drawer opens ---- */
    /* ---- Subscription: cache-first, then background refresh ---- */
    useEffect(() => {
        if (!isOpen || !user?.id) return;      // ⬅️ added isOpen
        let cancelled = false;

        // 1. Synchronous seed from shared cache — offline-safe, no flicker.
        const cached = getCachedPremium(user.id);
        if (cached !== null && !cancelled) {
            setActivePlan(cached ? "premium" : null);
        }

        // 2. Background resolve (no-op offline or if cache is fresh).
        resolveSubscription(user.id)
            .then((snap) => {
                if (!cancelled) setActivePlan(snap.isPremium ? (snap.plan_type || "premium") : null);
            })
            .catch(() => {
                // resolveSubscription already falls back to cache internally,
                // so nothing to do here.
            });
        return () => { cancelled = true; };
    }, [isOpen, user?.id]);
    useEffect(() => {
        if (!isOpen || !user?.id) return;      // ⬅️ added isOpen
        const onOnline = () => {
            resolveSubscription(user.id, { force: true })
                .then((snap) => setActivePlan(snap.isPremium ? (snap.plan_type || "premium") : null))
                .catch(() => { });
        };
        window.addEventListener("online", onOnline);
        return () => window.removeEventListener("online", onOnline);
    }, [isOpen, user?.id]);
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
            setContentReady(true);
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
        // Defer so this NEVER blocks the click handler / navigation
        requestAnimationFrame(() => {
            if (navigator.vibrate) {
                if (type === "success") navigator.vibrate([30, 40, 30]);
                else if (type === "warning") navigator.vibrate(100);
                else navigator.vibrate(35);
            }
        });
    }, []);

    useEffect(() => {
        if (!isOpen || !user?.id) return;      // ⬅️ only fetch when drawer is OPEN
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
    }, [isOpen, user?.id]);   // removed `userProfile` → kills infinite loop

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
        // 1. Kick off navigation FIRST — this is what the user waits for
        navigate(url);
        // 2. Close drawer in parallel (AnimatePresence exit runs alongside)
        setIsOpen(false);
        // 3. Sound + haptics last — deferred so they never block the tap
        requestAnimationFrame(() => tapFeedback("light"));
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
                    { title: "Assessment Notes", url: "/assessment-notes", icon: BookOpen, iconTone: "content" as IconTone },
                    { title: "Resources", url: "/resources", icon: FileText, iconTone: "content" as IconTone },
                    { title: "Clinical Assessments", url: "/assessments", icon: Brain, iconTone: "practice" as IconTone },
                    { title: "My Classes", url: "/my-classes", icon: Calendar, iconTone: "learning" as IconTone },
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

    /* ---------------- Horizontal identity strip items ---------------- */
    const identityStrip = useMemo(() => {
        const base = [
            { title: "Home", url: `/dashboard/${userRole}`, icon: Home, iconTone: "neutral" as IconTone },
            { title: "Quizzes", url: "/Medrae-quizzes", icon: QuizzesHeartIcon, iconTone: "practice" as IconTone },
            { title: "Progress", url: "/progress", icon: TrendingUp, iconTone: "progress" as IconTone },
            { title: "Feed", url: "/feed", icon: Newspaper, iconTone: "content" as IconTone },
            { title: "Duel", url: "/challenge", icon: Swords, iconTone: "practice" as IconTone },
            { title: "MedTube", url: "/medtube", icon: Play, iconTone: "media" as IconTone },
            { title: "Classes", url: "/live-classes", icon: Video, iconTone: "learning" as IconTone },
            { title: "Market", url: "/market", icon: NursMartLogo, iconTone: "neutral" as IconTone },
        ];

        if (userRole === "student") {
            base.splice(4, 0,
                { title: "Exams", url: "/exam/candidate", icon: GraduationCap, iconTone: "learning" as IconTone },
                { title: "Results", url: "/exam/results", icon: BarChart3, iconTone: "progress" as IconTone },
            );
        } else if (userRole === "tutor") {
            base.splice(4, 0,
                { title: "Exams", url: "/tutor/exams", icon: GraduationCap, iconTone: "learning" as IconTone },
                { title: "Results", url: "/tutor/exams/:paper_id/results", icon: BarChart3, iconTone: "progress" as IconTone },
            );
        }

        if (activePlan) {
            base.push({
                title: "My Plan",
                url: "/subscription",
                icon: Crown,
                iconTone: "premium" as IconTone,
                highlight: "premium" as const,
            });
        } else {
            base.push({
                title: "Upgrade",
                url: "/subscription",
                icon: Sparkles,
                iconTone: "learning" as IconTone,
                highlight: "upgrade" as const,
            });
        }

        return base;
    }, [userRole, activePlan]);

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
                            className="fixed inset-0 z-[9999] bg-black/60 md:hidden"
                        />

                        {/* FULL-SCREEN PAGE — respects light/dark */}
                        <motion.div
                            ref={drawerRef}
                            variants={PAGE_VARIANTS}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            className="fixed inset-0 z-[99999] md:hidden flex flex-col
                                       bg-white dark:bg-[#0d1117]"
                            style={{ willChange: "transform", backfaceVisibility: "hidden" }}
                        >
                            {/* Header */}
                            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-[#21262d] flex-shrink-0 bg-white dark:bg-[#0d1117]">
                                <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 bg-white dark:bg-[#161b22] ring-1 ring-slate-200 dark:ring-[#30363d]">
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
                                <h2 className="flex-1 text-[15px] font-black tracking-tight">
                                    <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">MEDRAE </span>
                                    <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">NURSING </span>
                                    <span className="text-slate-900 dark:text-white">HUB</span>
                                </h2>
                                <button
                                    onClick={() => { tapFeedback(); setIsOpen(false); }}
                                    aria-label="Close menu"
                                    className="p-2.5 rounded-full bg-slate-100 dark:bg-[#21262d] text-slate-600 dark:text-[#c9d1d9]
                                               active:scale-90 transition-transform"
                                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                                >
                                    <X className="w-4.5 h-4.5" />
                                </button>
                            </div>

                            {/* SCROLLABLE CONTENT */}
                            <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-3.5 pb-10 pt-4 bg-white dark:bg-[#0d1117]">
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
                                            className="w-full flex items-center gap-3 rounded-xl p-3.5 text-left
                                                       bg-slate-50 dark:bg-[#161b22] border-0
                                                       active:scale-[0.98] transition-transform"
                                            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                                        >
                                            <div className="relative flex-shrink-0">
                                                <Avatar className="h-12 w-12">
                                                    <AvatarImage src={profile?.avatar_url || avatarUrl || ""} className="object-cover" />
                                                    <AvatarFallback className="bg-slate-200 dark:bg-[#21262d] text-blue-600 dark:text-[#58a6ff] font-bold">
                                                        {initials || "U"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-50 dark:border-[#161b22]
                                                                  ${isOnline ? "bg-green-500" : "bg-gray-500"}`} />
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h3 className="font-bold text-[15px] text-slate-900 dark:text-[#f0f6fc] truncate">
                                                        {userProfile.name || "User"}
                                                    </h3>
                                                    {userProfile.role === "tutor" && (
                                                        <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-[#8b949e] truncate mt-0.5">
                                                    {userProfile.email || user?.email || ""}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-1.5">
                                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 rounded-full
                                                        bg-slate-100 dark:bg-[#21262d] text-blue-700 dark:text-[#58a6ff] border-0">
                                                        {userProfile.role || "Student"}
                                                    </Badge>
                                                    {activePlan && (
                                                        <Badge className="text-[9px] px-1.5 py-0 h-4 rounded-full border-0 flex items-center gap-0.5
                                                            bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold">
                                                            <Crown className="h-2.5 w-2.5" />
                                                            {activePlan}
                                                        </Badge>
                                                    )}
                                                    {userProfile.streak > 0 && isOnline && (
                                                        <Badge className={`text-[9px] px-1.5 py-0 h-4 rounded-full border-0 flex items-center gap-0.5
                                                            ${userProfile.streak <= 7 ? "bg-red-500 text-white" :
                                                                userProfile.streak <= 30 ? "bg-purple-600 text-white" :
                                                                    "bg-slate-800 dark:bg-[#30363d] text-white"}`}>
                                                            <Flame className="h-2.5 w-2.5" />
                                                            {userProfile.streak}d
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-slate-400 dark:text-[#6e7681] flex-shrink-0" />
                                        </button>

                                        {/* HORIZONTAL IDENTITY STRIP */}
                                        <div className="-mx-3.5 px-3.5">
                                            <div className="flex items-center gap-2 px-1 pb-2">
                                                <div className="h-1 w-4 rounded-full bg-[#58a6ff]/70" />
                                                <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-[#6e7681]">
                                                    Quick Access
                                                </h3>
                                            </div>
                                            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar"
                                                style={{ touchAction: 'pan-x', WebkitOverflowScrolling: 'touch' }}
                                            >
                                                {identityStrip.map((item: any) => {
                                                    const styles = ICON_TONE_STYLES[item.iconTone as IconTone];
                                                    const isPremium = item.highlight === "premium";
                                                    const isUpgrade = item.highlight === "upgrade";

                                                    return (
                                                        <button
                                                            key={item.title}
                                                            onClick={() => handleNavigate(item.url)}
                                                            className={`flex-shrink-0 flex flex-col items-center gap-1.5 w-[72px]
                                                                       active:scale-95 transition-transform`}
                                                            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                                                        >
                                                            <div
                                                                className={`relative flex h-11 w-11 items-center justify-center rounded-2xl ${styles.box}
                                                                    ${isPremium ? "ring-2 ring-amber-300/60" : ""}
                                                                    ${isUpgrade ? "ring-2 ring-[#58a6ff]/50" : ""}`}
                                                            >
                                                                <item.icon className={`h-5 w-5 ${styles.icon}`} strokeWidth={2.3} />
                                                                {isPremium && (
                                                                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full
                                                                                     bg-gradient-to-br from-yellow-200 to-amber-400
                                                                                     shadow-sm shadow-amber-500/60" />
                                                                )}
                                                            </div>
                                                            <span
                                                                className={`text-[10px] font-bold truncate w-full text-center
                                                                    ${isPremium ? "text-amber-500 dark:text-amber-300" :
                                                                        isUpgrade ? "text-[#58a6ff]" :
                                                                            "text-slate-700 dark:text-[#c9d1d9]"}`}
                                                            >
                                                                {item.title}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* SECTIONS */}
                                        <div className="space-y-4">
                                            {sections.map((section, idx) => section.items.length > 0 && (
                                                <DrawerSection
                                                    key={idx}
                                                    section={section}
                                                    onNavigate={handleNavigate}
                                                />
                                            ))}
                                        </div>

                                        {/* LOGOUT */}
                                        <button
                                            onClick={() => setShowLogoutDialog(true)}
                                            disabled={isLoggingOut}
                                            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl transition-all
               bg-red-50 dark:bg-[#2d1418] text-red-600 dark:text-[#f85149]
               active:scale-[0.98] disabled:opacity-50"
                                            style={{ touchAction: 'manipulation' }}
                                        >
                                            {isLoggingOut ? (
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 dark:border-[#f85149] border-t-transparent" />
                                            ) : (
                                                <LogOut className="h-4 w-4" />
                                            )}
                                            <span className="text-[13px] font-semibold">
                                                {isLoggingOut ? "Signing out..." : "Sign out"}
                                            </span>
                                        </button>

                                        {/* FOOTER */}
                                        <div className="mt-2 pt-6 pb-2 text-center select-none border-t border-slate-200 dark:border-[#21262d]">

                                            <p className="text-[7px] font-black tracking-[0.2em] text-slate-400 dark:text-[#6e7681] opacity-80">
                                                Medrae Nursing All rights reserved
                                            </p>

                                            <div className="mt-4 flex items-center justify-center gap-2.5 flex-wrap">
                                                <a
                                                    href="https://medrae-nursing.vercel.app/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    aria-label="MEDRAE Nursing Website"
                                                    className="group flex h-8 w-8 items-center justify-center rounded-full overflow-hidden
                       bg-white dark:bg-[#161b22] ring-1 ring-slate-200 dark:ring-[#30363d]
                       transition-transform hover:scale-110 active:scale-95"
                                                >
                                                    <svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" className="h-full w-full" aria-hidden="true">
                                                        <rect x="0" y="0" width="192" height="192" rx="35" fill="#FFFFFF" />
                                                        <path d="M96 169 C91 165 31 116 20 91 C8 64 23 38 48 32 C67 27 84 35 96 50 C108 35 125 27 144 32 C169 38 184 64 172 91 C161 116 101 165 96 169 Z" fill="#FF1F1F" />
                                                        <path d="M44 82 L96 63 L150 82 L96 101 Z" fill="#FFFFFF" />
                                                        <path d="M62 88 V105 C62 111 77 119 96 122 C115 119 130 111 130 105 V88 L96 101 Z" fill="#FFFFFF" />
                                                        <path d="M62 91 V105 C62 111 77 119 96 122 C115 119 130 111 130 105 V91" fill="none" stroke="#FF1F1F" strokeWidth="3" strokeLinecap="round" />
                                                        <path d="M96 82 V101" stroke="#FF1F1F" strokeWidth="2.5" />
                                                        <circle cx="94" cy="82" r="3.5" fill="#FF1F1F" />
                                                        <path d="M94 82 C86 86 75 88 63 89" fill="none" stroke="#FF1F1F" strokeWidth="2" />
                                                        <path d="M63 89 C61 94 61 98 61 103" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
                                                        <circle cx="61" cy="105" r="4" fill="#FFFFFF" />
                                                        <path d="M57 108 L65 108 L67 122 C63 124 59 124 55 122 Z" fill="#FFFFFF" />
                                                    </svg>
                                                </a>

                                                <a href="https://wa.me/254704473503" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
                                                    className="group flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 transition-transform hover:scale-110 active:scale-95">
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
                                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                    </svg>
                                                </a>

                                                <a href="https://tiktok.com/@medraenursing" target="_blank" rel="noopener noreferrer" aria-label="TikTok"
                                                    className="group flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-950 transition-transform hover:scale-110 active:scale-95">
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
                                                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.66a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.09z" />
                                                    </svg>
                                                </a>

                                                <a href="https://instagram.com/medraenursing" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                                                    className="group flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-fuchsia-500 to-amber-400 transition-transform hover:scale-110 active:scale-95">
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
                                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                                                    </svg>
                                                </a>

                                                <a href="https://x.com/medraenursing" target="_blank" rel="noopener noreferrer" aria-label="X"
                                                    className="group flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-black transition-transform hover:scale-110 active:scale-95">
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-white">
                                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                                    </svg>
                                                </a>

                                                <a href="https://youtube.com/@medraenursing" target="_blank" rel="noopener noreferrer" aria-label="YouTube"
                                                    className="group flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 transition-transform hover:scale-110 active:scale-95">
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
                                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                                    </svg>
                                                </a>

                                                <a href="https://facebook.com/medraenursing" target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                                                    className="group flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 transition-transform hover:scale-110 active:scale-95">
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
                                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                                    </svg>
                                                </a>
                                            </div>

                                            <a
                                                href="https://instagram.com/medraenursing"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-3 inline-block text-[10px] font-bold text-slate-500 dark:text-[#8b949e]
                   hover:text-[#58a6ff] transition-colors tracking-wide"
                                            >
                                                @medraenursing
                                            </a>

                                            <div className="mt-2 flex items-center justify-center gap-3">
                                                <Link
                                                    to="/privacy"
                                                    onClick={() => setIsOpen(false)}
                                                    className="text-[8px] font-bold text-slate-500 dark:text-[#8b949e] hover:text-[#58a6ff] transition-colors tracking-widest"
                                                >
                                                    Privacy
                                                </Link>
                                                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-[#30363d]" />
                                                <Link
                                                    to="/terms"
                                                    onClick={() => setIsOpen(false)}
                                                    className="text-[8px] font-bold text-slate-500 dark:text-[#8b949e] hover:text-[#58a6ff] transition-colors tracking-widest"
                                                >
                                                    Terms
                                                </Link>
                                            </div>

                                            <div className="mt-3 text-center">
                                                <p className="text-[8px] font-bold text-slate-400 dark:text-[#484f58] tracking-widest">
                                                    Version 2026.06 Medrae Learning System
                                                </p>
                                            </div>
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
                <AlertDialogContent className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] rounded-3xl shadow-2xl max-w-sm">
                    <AlertDialogHeader className="text-center space-y-3">
                        <div className="mx-auto w-14 h-14 rounded-full bg-red-100 dark:bg-[#2d1418] flex items-center justify-center">
                            <LogOut className="w-6 h-6 text-red-600 dark:text-[#f85149]" />
                        </div>
                        <AlertDialogTitle className="text-xl font-bold text-slate-900 dark:text-[#f0f6fc]">
                            Sign out of Medrae?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600 dark:text-[#8b949e] text-sm leading-relaxed">
                            You'll need to sign in again to access your dashboard, quizzes, and progress.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex gap-2 mt-5">
                        <AlertDialogCancel
                            onClick={() => tapFeedback()}
                            className="flex-1 bg-slate-100 dark:bg-[#21262d] hover:bg-slate-200 dark:hover:bg-[#30363d]
                                       border-0 text-slate-700 dark:text-[#c9d1d9] rounded-2xl py-5 font-medium"
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