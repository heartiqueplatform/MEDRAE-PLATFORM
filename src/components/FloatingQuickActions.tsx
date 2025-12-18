"use client";
import { Link } from "react-router-dom";
import { Brain, Star, BookOpen, ListChecks, Settings, Bell } from "lucide-react";
import { useEffect, useState } from "react";

const actions = [
    { href: "/ai-assistant", label: "AI Assistant", icon: Brain, bgLight: "bg-purple-500 hover:bg-purple-600", bgDark: "bg-purple-600 hover:bg-purple-700" },
    { href: "/subscription", label: "Premium", icon: Star, bgLight: "bg-yellow-400 hover:bg-yellow-500", bgDark: "bg-yellow-500 hover:bg-yellow-600" },
    { href: "/resources", label: "Resources", icon: ListChecks, bgLight: "bg-blue-500 hover:bg-blue-600", bgDark: "bg-blue-600 hover:bg-blue-700" },
    { href: "/settings", label: "Settings", icon: Settings, bgLight: "bg-gray-500 hover:bg-gray-600", bgDark: "bg-gray-600 hover:bg-gray-700" },
    { href: "/announcements", label: "Announcements", icon: Bell, bgLight: "bg-pink-500 hover:bg-pink-600", bgDark: "bg-pink-600 hover:bg-pink-700" },
];

function vibrateTap(duration = 40) {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(duration);
    }
}

export default function FloatingQuickActions() {
    const [theme, setTheme] = useState<"light" | "dark">("light");
    // Safe vibration helper (works only on supported phones)

    useEffect(() => {
        const storedTheme = (localStorage.getItem("theme") as "light" | "dark") || "light";
        setTheme(storedTheme);
    }, []);

    return (
        <div className="fixed top-16 right-2 sm:right-4 z-50 flex flex-col gap-4">
            {actions.map((action) => {
                const Icon = action.icon;
                const bgClass = theme === "dark" ? action.bgDark : action.bgLight;

                return (
                    <div key={action.href} className="relative group">
                        {/* Tooltip for small screens */}
                        <span
                            className={`
    absolute right-full top-1/2 -translate-y-1/2
    bg-gray-700 text-white text-xs rounded px-2 py-1
    opacity-0 translate-x-[10px] group-hover:translate-x-0 group-hover:opacity-100
    transition-all duration-200 ease-out whitespace-nowrap hidden sm:block
  `}
                        >
                            {action.label}
                        </span>

                        <Link
                            to={action.href}
                            onClick={() => vibrateTap(40)}
                            className={`${bgClass} h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white shadow-lg transition hover:scale-105 active:scale-95`}
                        >

                            <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Link>
                    </div>
                );
            })}
        </div>
    );
}
