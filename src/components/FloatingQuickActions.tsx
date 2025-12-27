"use client";

import { Link } from "react-router-dom";
import {
    Brain,
    Star,
    BookOpen,
    ListChecks,
    Settings,
    Bell,
    ChevronDown
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { playSound } from "@/lib/soundManager";

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
    const [open, setOpen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const storedTheme = (localStorage.getItem("theme") as "light" | "dark") || "light";
        setTheme(storedTheme);

        const muted = localStorage.getItem("isMuted") === "true";
        setIsMuted(muted);

        // Auto open dropdown on page load
        setOpen(true);

        // Auto-close after 15 seconds (15000 ms)
        const initialTimer = setTimeout(() => {
            setOpen(false);
        }, 15000);

        // Cleanup
        return () => clearTimeout(initialTimer);
    }, []);


    /* 🔊 feedback */
    function feedback() {
        vibrateTap(40);
        if (!isMuted) {
            playSound("tap", false);
        }
    }

    /* ⏱️ LONG auto-close delay */
    function startAutoClose(delay = 4500) {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => {
            setOpen(false);
        }, delay);
    }

    /* ❌ outside click */
    useEffect(() => {
        function handleOutside(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    return (
        <div
            ref={wrapperRef}
            className="fixed top-16 right-2 sm:right-4 z-50 flex flex-col items-end gap-2"
        >
            {/* 🔽 DROPDOWN — ICONS PRESERVED */}
            {open && (
                <div
                    onMouseEnter={() => closeTimerRef.current && clearTimeout(closeTimerRef.current)}
                    onMouseLeave={() => startAutoClose(15000)} // resets to 15s

                    className="flex flex-col gap-4 mb-2 quick-actions-dropdown"

                >
                    {actions.map((action) => {
                        const Icon = action.icon;
                        const bgClass = theme === "dark" ? action.bgDark : action.bgLight;

                        return (
                            <div key={action.href} className="relative group quick-actions-item">

                                {/* Tooltip (unchanged) */}
                                <span
                                    className={`
                                        absolute right-full top-1/2 -translate-y-1/2
                                        bg-gray-700 text-white text-xs rounded px-2 py-1
                                        opacity-0 translate-x-[10px]
                                        group-hover:translate-x-0 group-hover:opacity-100
                                        transition-all duration-200 ease-out
                                        whitespace-nowrap hidden sm:block
                                    `}
                                >
                                    {action.label}
                                </span>

                                <Link
                                    to={action.href}
                                    onClick={() => {
                                        feedback();
                                        startAutoClose(300);
                                    }}
                                    className={`${bgClass}
                                        h-10 w-10 sm:h-12 sm:w-12
                                        rounded-full
                                        flex items-center justify-center
                                        text-white
                                        shadow-lg
                                        transition hover:scale-105 active:scale-95
                                    `}
                                >
                                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                                </Link>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 🔘 TOGGLE BUTTON */}
            <div className="flex flex-col items-center">
                <button
                    onClick={() => {
                        feedback();
                        setOpen((prev) => !prev);
                        startAutoClose();
                    }}
                    className="h-12 w-12 sm:h-14 sm:w-14
                   rounded-full
                   bg-gray-900/70 dark:bg-gray-100/70
                   text-white dark:text-black
                   flex items-center justify-center
                   shadow-lg
                   hover:scale-105
                   active:scale-95
                   transition"
                    aria-label="Quick actions"
                >
                    <ChevronDown
                        className={`h-5 w-5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    />
                </button>

                {/* Hint text */}
                {open && (
                    <span className="mt-1 text-xs text-gray-800 dark:text-gray-100 select-none">
                        Hide
                    </span>
                )}
            </div>

        </div>
    );
}
