// components/MobileDrawer.tsx
"use client";
import { playSound } from "@/lib/soundManager";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Brain,
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
    Newspaper
} from "lucide-react";

interface MobileDrawerProps {
    userRole: "student" | "tutor" | "staff";
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

interface DrawerItem {
    title: string;
    url: string;
    icon: any;
}

export function MobileDrawer({ userRole, isOpen, setIsOpen }: MobileDrawerProps) {
    const navigate = useNavigate();
    const drawerRef = useRef<HTMLDivElement>(null);
    // Load sound once
    const tapFeedback = () => {
        playSound("tap"); // Play the tap sound using your sound manager
        if (navigator.vibrate) {
            navigator.vibrate(50); // Vibrate for 50ms on supported devices
        }
    };
    // Close drawer when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, setIsOpen]);

    // Sections
    const sections: { label: string; items: DrawerItem[] }[] = [
        {
            label: "Main",
            items: [
                { title: "Dashboard", url: `/dashboard/${userRole}`, icon: Home },
                { title: "Feed", url: "/feed", icon: Newspaper },
                { title: "AI Assistant", url: "/ai-assistant", icon: Brain },
                { title: "Forum", url: "/forum", icon: MessageSquare },
            ],
        },
        {
            label: "Learning",
            items: [
                { title: "Tracker", url: "/calendar", icon: Calendar },
                { title: "Progress", url: "/progress", icon: TrendingUp },
                { title: "Quizzes", url: "/Medrae-quizzes", icon: Heart },
                { title: "SimuProctor", url: "/simulation/candidate", icon: Play },
                { title: "Notes", url: "/assessment-notes", icon: BookOpen },
                { title: "Resources", url: "/resources", icon: FileText },
            ],
        },
        {
            label: "Media",
            items: [
                { title: "MedTube", url: "/medtube", icon: Play },
            ],
        },
        {
            label: "Tutor Tools",
            items: userRole === "tutor" ? [
                { title: "Analytics", url: "/analytics", icon: Users },
                { title: "Create Content", url: "/create", icon: BookOpen },
                { title: "Earnings", url: "/earnings", icon: Star },
            ] : [],
        },
        {
            label: "Staff Tools",
            items: userRole === "staff" ? [
                { title: "Knowledge", url: "/knowledge", icon: Network },
                { title: "Post Videos", url: "/post-videos", icon: Video },
                { title: "Events", url: "/events", icon: CalendarDays },
                { title: "Job Board", url: "/jobs", icon: Briefcase },
                { title: "Articles", url: "/articles", icon: PenTool },
            ] : [],
        },
        {
            label: "Other",
            items: [
                { title: "Announcements", url: "/announcements", icon: Bell },
                { title: "Feedback", url: "/feedback", icon: MessageSquareX },
                { title: "Settings", url: "/settings", icon: Settings },
                { title: "Subscription", url: "/subscription", icon: CreditCard },
            ],
        },
    ];

    return (
        <div
            ref={drawerRef}
            className={`fixed bottom-0 left-0 w-full bg-background shadow-xl transition-transform duration-300 rounded-t-xl z-40 ${isOpen ? "translate-y-0" : "translate-y-full"
                }`}
            style={{ maxHeight: "75vh", bottom: "4rem" }}

        >
            {/* App icon + name section (fixed, non-scrollable) */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-background z-10">
                <div className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center">
                    <img
                        src="/pwa-192x192.jpeg"
                        alt="Logo"
                        className="h-full w-full object-cover"
                    />
                </div>
                <div>
                    <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                        MEDRAE
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Kenya Nursing Network Platform (MKN)
                    </p>
                </div>
            </div>

            {/* Scrollable icons section */}
            <div className="p-4 space-y-6 overflow-y-auto custom-scrollbar" style={{ maxHeight: "calc(70vh - 80px)" }}>
                {sections.map(section => section.items.length > 0 && (
                    <div key={section.label}>
                        <h3 className="text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2 uppercase">{section.label}</h3>
                        <div className="grid grid-cols-3 gap-3">
                            {section.items.map(item => (
                                <button
                                    key={item.title}
                                    className="flex flex-col items-center justify-center text-xs text-gray-700 dark:text-gray-200"
                                    onClick={() => {
                                        tapFeedback();      // 🔊 Sound + vibration
                                        navigate(item.url); // Navigate
                                        setIsOpen(false);   // Close drawer
                                    }}
                                >
                                    <item.icon className="h-5 w-5 mb-1" />
                                    <span>{item.title}</span>
                                </button>


                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
