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
        let subscription: any;

        const fetchCount = async () => {
            if (!user?.id) return;

            const { count, error } = await supabase
                .from("user_mistakes")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("resolved", false);

            if (!error) setMistakeCount(count || 0);

            subscription = supabase
                .channel(`user_mistakes_footer_${user.id}`)
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "user_mistakes",
                        filter: `user_id=eq.${user.id}`,
                    },
                    async () => {
                        const { count } = await supabase
                            .from("user_mistakes")
                            .select("*", { count: "exact", head: true })
                            .eq("user_id", user.id)
                            .eq("resolved", false);
                        setMistakeCount(count || 0);
                    }
                )
                .subscribe();
        };

        fetchCount();

        return () => {
            if (subscription) supabase.removeChannel(subscription);
        };
    }, [user]);

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
                className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-0 flex justify-around items-center h-16 shadow-md z-50 md:hidden
  ${isDrawerOpen ? "pointer-events-none" : ""}`}
            >

                {/* Menu button */}
                <button
                    onClick={() => {
                        vibrate();
                        setIsDrawerOpen(prev => !prev);
                    }}
                    className="flex flex-col items-center justify-center relative text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
                >
                    <div
                        className={`
            flex items-center justify-center p-2 rounded-md
            ${ICON_TONE_STYLES["system"].box.light}
            dark:${ICON_TONE_STYLES["system"].box.dark}
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
                    <span className="mt-1 text-xs">Menu</span>
                </button>


                {items.map((item) => (
                    <button
                        key={item.url}
                        onClick={() => {
                            vibrate();
                            navigate(item.url);
                        }}
                        className={`flex flex-col items-center justify-center relative text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 ${isActive(item.url) ? "text-blue-500 dark:text-blue-400" : ""
                            }`}
                    >
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

                        <span className="text-xs">{item.label || item.title}</span>
                        {item.badge && (
                            <Badge className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-[10px] flex items-center justify-center bg-green-500 text-white">
                                {item.badge}
                            </Badge>
                        )}
                    </button>
                ))}
            </div>

            {/* Mobile Drawer */}
            <MobileDrawer
                userRole="student" // update dynamically if needed
                isOpen={isDrawerOpen}
                setIsOpen={setIsDrawerOpen}
            />
        </>
    );
}
