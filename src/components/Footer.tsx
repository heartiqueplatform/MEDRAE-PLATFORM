// components/Footer.tsx
"use client";

import { useEffect, useState } from "react";
import { Home, Heart, AlertCircle, TrendingUp, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { MobileDrawer } from "@/components/MobileDrawer";

export function Footer() {
    const navigate = useNavigate();
    const location = useLocation();
    // 🔔 Haptic feedback (mobile vibration)
    const vibrate = (duration = 50) => {
        if (navigator.vibrate) navigator.vibrate(duration);
    };

    const [mistakeCount, setMistakeCount] = useState<number>(0);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        let subscription: any;

        const fetchCount = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

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
    }, []);

    const items = [
        { icon: Heart, label: "Quizzes", url: "/Medrae-quizzes" },
        { icon: Home, label: "Home", url: "/dashboard/student" },
        { icon: AlertCircle, label: "Mistakes", url: "/my-mistakes", badge: mistakeCount > 0 ? mistakeCount : undefined },
        { title: "Progress", url: "/progress", icon: TrendingUp },
    ];

    const isActive = (url: string) => location.pathname === url;

    return (
        <>
            <div
                className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-around items-center h-16 shadow-md z-50 md:hidden
  ${isDrawerOpen ? "pointer-events-none" : ""}`}
            >

                {/* Menu button */}
                <button
                    onClick={() => {
                        vibrate();
                        setIsDrawerOpen(prev => !prev);

                    }}
                    className="flex flex-col items-center justify-center text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
                >
                    <Menu className="h-6 w-6" />
                    <span className="text-xs">Menu</span>
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
                        <item.icon className="h-6 w-6" />
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
