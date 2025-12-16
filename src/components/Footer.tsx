// components/Footer.tsx
"use client";

import { useEffect, useState } from "react";
import { Home, Heart, AlertCircle, TrendingUp, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { supabase } from "@/lib/supabaseClient";

export function Footer() {
    const navigate = useNavigate();
    const location = useLocation();
    const { toggleSidebar } = useSidebar();
    // 🔔 Haptic feedback (mobile vibration)
    const vibrate = (duration = 30) => {
        if (navigator.vibrate) navigator.vibrate(duration);
    };

    const [mistakeCount, setMistakeCount] = useState<number>(0);

    useEffect(() => {
        let subscription: any;

        const fetchCount = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Initial fetch
            const { count, error } = await supabase
                .from("user_mistakes")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("resolved", false);

            if (!error) setMistakeCount(count || 0);

            // Subscribe for real-time updates
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
    }, []);

    const items = [
        { icon: Heart, label: "Quizzes", url: "/Medrae-quizzes" },
        { icon: Home, label: "Dashboard", url: "/dashboard/student" },
        { icon: AlertCircle, label: "My Mistakes", url: "/my-mistakes", badge: mistakeCount > 0 ? mistakeCount : undefined },
        { title: "Study Progress", url: "/progress", icon: TrendingUp },
    ];


    const isActive = (url: string) => location.pathname === url;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-around items-center h-16 shadow-md z-50 md:hidden">

            {/* Menu button */}
            <button
                onClick={() => {
                    vibrate();      // 👈 added
                    toggleSidebar();
                }}
                className="flex flex-col items-center justify-center text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
            >
                <Menu className="h-6 w-6" />
                <span className="text-xs">Menu</span>
            </button>

            {items.map((item) => (
                <button
                    key={item.label}
                    onClick={() => {
                        vibrate();          // 👈 added
                        navigate(item.url);
                    }}

                    className={`flex flex-col items-center justify-center relative text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 ${isActive(item.url) ? "text-blue-500 dark:text-blue-400" : ""
                        }`}
                >
                    <item.icon className="h-6 w-6" />
                    <span className="text-xs">{item.label}</span>
                    {item.badge && (
                        <Badge className="absolute -top-1 -right-1 h-4 w-4 text-[10px]">{item.badge}</Badge>
                    )}
                </button>
            ))}
        </div>
    );
}
