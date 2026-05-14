"use client";

import { Link } from "react-router-dom";
import {
    Brain,
    Star,
    ListChecks,
    Settings,
    Bell,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { playSound } from "@/lib/soundManager";

const actions = [
    { href: "/ai-assistant", label: "AI Assistant", icon: Brain, bgLight: "bg-purple-500", bgDark: "bg-purple-600" },
    { href: "/subscription", label: "Premium", icon: Star, bgLight: "bg-yellow-400", bgDark: "bg-yellow-500" },
    { href: "/resources", label: "Resources", icon: ListChecks, bgLight: "bg-blue-500", bgDark: "bg-blue-600" },
    { href: "/settings", label: "Settings", icon: Settings, bgLight: "bg-gray-500", bgDark: "bg-gray-600" },
    { href: "/announcements", label: "Announcements", icon: Bell, bgLight: "bg-pink-500", bgDark: "bg-pink-600" },
];

export default function FloatingQuickActions() {
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [open, setOpen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const storedTheme = (localStorage.getItem("theme") as "light" | "dark") || "light";
        setTheme(storedTheme);
        const muted = localStorage.getItem("isMuted") === "true";
        setIsMuted(muted);
    }, []);

    function feedback() {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(40);
        if (!isMuted) playSound("tap", false);
    }

    // Close when clicking outside
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
            className={`fixed top-1/3 right-0 z-50 flex items-center transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-[calc(100%-12px)]"
                }`}
        >
            {/* THE "HANDLE" BUTTON (Stuck to the edge) */}
            <button
                onClick={() => {
                    feedback();
                    setOpen(!open);
                }}
                className="flex items-center justify-center h-24 w-8 bg-gray-500 dark:bg-gray-900 border-2 text-white dark:text-white rounded-l-xl shadow-2xl border-y border-l border-white/20"
            >
                {open ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>

            {/* THE MENU PANEL */}
            <div className="bg-white dark:bg-gray-900  backdrop-blur-md p-3 rounded-l-2xl shadow-[-10px_0_30px_rgba(0,0,0,0.2)] border-l border-white/10 flex flex-col gap-3">
                {actions.map((action) => {
                    const Icon = action.icon;
                    const bgClass = theme === "dark" ? action.bgDark : action.bgLight;

                    return (
                        <Link
                            key={action.href}
                            to={action.href}
                            onClick={() => {
                                feedback();
                                setOpen(false);
                            }}
                            className="group relative flex items-center justify-center"
                        >
                            {/* Label that appears on hover */}
                            <span className="absolute right-full mr-4 px-2 py-1 rounded bg-slate-800 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                {action.label}
                            </span>

                            <div className={`${bgClass} h-10 w-10 rounded-lg flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 active:scale-95`}>
                                <Icon size={18} />
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}