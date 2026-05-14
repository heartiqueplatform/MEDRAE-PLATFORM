// components/Footer.tsx
"use client";

import { useEffect, useState } from "react";
import { Home, Heart, AlertCircle, TrendingUp, Menu, Newspaper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { MobileDrawer } from "@/components/MobileDrawer";
import { useAuth } from "@/context/AuthProvider";
export function Footer() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    // 🔔 Haptic feedback (mobile vibration)
    const vibrate = (duration = 50) => {
        if (navigator.vibrate) navigator.vibrate(duration);
    };

    const [mistakeCount, setMistakeCount] = useState<number>(0);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
        let mounted = true;
        let channel: any;

        const setupMistakesSubscription = async () => {
            // 1. Only proceed if user is logged in
            if (!user?.id) return;

            // 2. Initial Fetch
            const { count, error } = await supabase
                .from("user_mistakes")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("resolved", false);

            if (mounted && !error) setMistakeCount(count || 0);

            // 3. STRICT CHAINING: .channel -> .on -> .subscribe
            // Use a unique name including user.id and 'footer'
            channel = supabase
                .channel(`footer_mistakes_${user.id}`)
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "user_mistakes",
                        filter: `user_id=eq.${user.id}`,
                    },
                    async () => {
                        // Re-fetch when database changes
                        const { count: newCount } = await supabase
                            .from("user_mistakes")
                            .select("*", { count: "exact", head: true })
                            .eq("user_id", user.id)
                            .eq("resolved", false);

                        if (mounted) setMistakeCount(newCount || 0);
                    }
                )
                .subscribe();
        };

        setupMistakesSubscription();

        return () => {
            mounted = false;
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [user?.id]); // Only re-run if the User ID actually changes

    const items = [
        { icon: Heart, label: "Quizzes", url: "/Medrae-quizzes", iconTone: "practice" },
        { title: "Feed Page", url: "/feed", icon: Newspaper, iconTone: "content" },
        { icon: Home, label: "Home", url: "/dashboard/student", iconTone: "neutral" },
        { icon: AlertCircle, label: "Mistakes", url: "/my-mistakes", badge: mistakeCount > 0 ? mistakeCount : undefined, iconTone: "alert" },
        { title: "Progress", url: "/progress", icon: TrendingUp, iconTone: "progress" },
    ];

    const isActive = (url: string) => location.pathname === url;

    return (
        <>
            <div
                className={`fixed bottom-0 left-0 right-0 z-[2147483647] md:hidden transition-all duration-300
bg-white/80 dark:bg-gray-950/90 backdrop-blur-xl border-t border-gray-100 dark:border-gray-900
h-20 pb-4 flex justify-around items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]
${isDrawerOpen
                        ? "translate-y-[110%] opacity-0 pointer-events-none"
                        : "translate-y-0 opacity-100"}`}
            >
                {/* --- 1. MENU / DRAWER BUTTON --- */}
                <button
                    onClick={() => {
                        vibrate();
                        setIsDrawerOpen(prev => !prev);
                    }}
                    className="flex flex-col items-center justify-center flex-1 gap-1 group transition-all active:scale-90"
                >
                    <div
                        className={`
                flex items-center justify-center p-2 rounded-2xl transition-colors
                ${ICON_TONE_STYLES["system"].box.light}
                dark:${ICON_TONE_STYLES["system"].box.dark}
                ${isDrawerOpen ? "ring-2 ring-blue-500/20" : ""}
            `}
                    >
                        <Menu
                            className={`
                    h-6 w-6
                    ${ICON_TONE_STYLES["system"].icon.light}
                    dark:${ICON_TONE_STYLES["system"].icon.dark}
                `}
                        />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-tighter transition-colors
            ${isDrawerOpen ? "text-blue-600" : "text-gray-400 dark:text-gray-500"}`}>
                        Menu
                    </span>
                </button>

                {/* --- 2. DYNAMIC NAVIGATION ITEMS --- */}
                {items.map((item) => {
                    const active = isActive(item.url);
                    const tone = item.iconTone || "neutral";

                    return (
                        <button
                            key={item.url}
                            onClick={() => {
                                vibrate();
                                navigate(item.url);
                            }}
                            className="flex flex-col items-center justify-center flex-1 gap-1 relative group transition-all active:scale-90"
                        >
                            {/* Icon Container */}
                            <div
                                className={`
                        flex items-center justify-center p-2 rounded-2xl transition-all duration-300
                        ${active
                                        ? ICON_TONE_STYLES[tone].box.light + " dark:" + ICON_TONE_STYLES[tone].box.dark
                                        : "bg-transparent"}
                    `}
                            >
                                <item.icon
                                    className={`
                            h-6 w-6 transition-colors duration-300
                            ${active
                                            ? ICON_TONE_STYLES[tone].icon.light + " dark:" + ICON_TONE_STYLES[tone].icon.dark
                                            : "text-gray-400 dark:text-gray-500 group-hover:text-blue-500"}
                        `}
                                />

                                {/* Notification Badge (Pulse for Alerts) */}
                                {item.badge && (
                                    <span className={`absolute -top-1 right-2 min-w-[18px] h-[18px] px-1 text-[10px] font-bold flex items-center justify-center bg-red-500 text-white rounded-full border-2 border-white dark:border-gray-950 shadow-sm
                        ${tone === 'alert' ? 'animate-pulse' : ''}`}>
                                        {item.badge}
                                    </span>
                                )}
                            </div>

                            {/* Label */}
                            <span className={`text-[10px] font-bold uppercase tracking-tighter transition-colors duration-300
                    ${active ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                                {item.label || item.title}
                            </span>

                            {/* Active Indicator Dot */}
                            {active && (
                                <div className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
                            )}
                        </button>
                    );
                })}
            </div>
            {isDrawerOpen && (
                <div
                    className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm md:hidden"
                    onClick={() => setIsDrawerOpen(false)}
                />
            )}
            {/* Mobile Drawer */}
            <MobileDrawer
                userRole="student" // update dynamically if needed
                isOpen={isDrawerOpen}
                setIsOpen={setIsDrawerOpen}
            />
        </>
    );
}
