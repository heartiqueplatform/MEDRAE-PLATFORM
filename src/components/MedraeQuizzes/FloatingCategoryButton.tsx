"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    BookOpen,
    GraduationCap,
    FileText,
    ClipboardCheck,
    Stethoscope,
    Sparkles,
    Globe,
    HelpCircle,
    X,
    TicketPercent,
} from "lucide-react";
import { playSound } from "@/lib/soundManager";
import { useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────
// Category type — MUST match the one in MedraeQuizzes.tsx
// ─────────────────────────────────────────────────────────
type CategoryType =
    | "all"
    | "paper1"
    | "paper2"
    | "practice"
    | "medical"
    | "fun"
    | "nclex"
    | "help";

// ─────────────────────────────────────────────────────────
// Categories — exactly like before
// ─────────────────────────────────────────────────────────
const CATEGORIES: {
    id: CategoryType;
    label: string;
    icon: React.ElementType;
    gradient: string;
    ring: string;
}[] = [
        { id: "all", label: "All Units", icon: BookOpen, gradient: "from-slate-500 to-slate-700", ring: "ring-slate-400" },
        { id: "paper1", label: "Paper 1", icon: GraduationCap, gradient: "from-amber-400 to-orange-600", ring: "ring-amber-400" },
        { id: "paper2", label: "Paper 2", icon: FileText, gradient: "from-blue-400 to-indigo-600", ring: "ring-blue-400" },
        { id: "practice", label: "Practice", icon: ClipboardCheck, gradient: "from-emerald-400 to-teal-600", ring: "ring-emerald-400" },
        { id: "medical", label: "Medical", icon: Stethoscope, gradient: "from-rose-400 to-pink-600", ring: "ring-rose-400" },
        { id: "fun", label: "Fun", icon: Sparkles, gradient: "from-sky-400 to-cyan-600", ring: "ring-sky-400" },
        { id: "nclex", label: "NCLEX", icon: Globe, gradient: "from-purple-400 to-fuchsia-600", ring: "ring-purple-400" },
        { id: "help", label: "Help", icon: HelpCircle, gradient: "from-yellow-400 to-amber-600", ring: "ring-yellow-400" },
    ];

// ⚠️ Change this if your Last Minute route is different
const LAST_MINUTE_ROUTE = "/last-minute";

interface Props {
    activeCategory: CategoryType;
    onSelect: (category: CategoryType) => void;
}

export function FloatingCategoryButton({ activeCategory, onSelect }: Props) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    const handleToggle = () => {
        playSound("tap");
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(15);
        }
        setOpen((v) => !v);
    };

    const handlePickCategory = (id: CategoryType) => {
        playSound("tap");
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(25);
        }
        onSelect(id);
        setOpen(false);
    };

    const handleAffordablePapers = () => {
        playSound("tap");
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(20);
        }
        setOpen(false);
        navigate(LAST_MINUTE_ROUTE);
    };

    return (
        <>
            {/* Dim backdrop — tap anywhere to close */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => setOpen(false)}
                        className="fixed inset-0 z-[60] bg-black/25 backdrop-blur-[2px]"
                        aria-hidden="true"
                    />
                )}
            </AnimatePresence>

            {/* Floating stack — phone-safe */}
            <div
                className="fixed right-4 z-[70] flex flex-col items-end gap-2.5 pointer-events-none"
                style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
            >
                <AnimatePresence>
                    {open && (
                        <>
                            {/* ─── 🎫 AFFORDABLE PAPERS (top of list) ─── */}
                            <motion.button
                                key="affordable-papers"
                                initial={{ opacity: 0, y: 16, scale: 0.7 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 12, scale: 0.7 }}
                                transition={{
                                    delay: 0,
                                    type: "spring",
                                    damping: 22,
                                    stiffness: 320,
                                }}
                                onClick={handleAffordablePapers}
                                className="flex items-center gap-2.5 pointer-events-auto"
                                aria-label="Affordable Papers"
                            >
                                <span className="px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap
                                    bg-white/95 dark:bg-gray-800/95 text-gray-700 dark:text-gray-100 shadow-sm">
                                    Affordable Papers
                                </span>
                                <span className="relative w-12 h-12 rounded-full flex items-center justify-center
                                    text-white bg-gradient-to-br from-amber-400 to-orange-600 shadow-md
                                    transition-transform duration-150 active:scale-90">
                                    <TicketPercent className="w-5 h-5" strokeWidth={2.25} />
                                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900" />
                                </span>
                            </motion.button>

                            {/* ─── CATEGORY LIST (same as before) ─── */}
                            {CATEGORIES.map((cat, index) => {
                                const Icon = cat.icon;
                                const isActive = activeCategory === cat.id;

                                return (
                                    <motion.button
                                        key={cat.id}
                                        initial={{ opacity: 0, y: 16, scale: 0.7 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 12, scale: 0.7 }}
                                        transition={{
                                            delay: (index + 1) * 0.03,
                                            type: "spring",
                                            damping: 22,
                                            stiffness: 320,
                                        }}
                                        onClick={() => handlePickCategory(cat.id)}
                                        className="flex items-center gap-2.5 pointer-events-auto"
                                        aria-label={`Filter by ${cat.label}`}
                                        aria-pressed={isActive}
                                    >
                                        {/* Label chip */}
                                        <span
                                            className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap
                                                backdrop-blur-md transition-colors
                                                ${isActive
                                                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                                    : "bg-white/95 dark:bg-gray-800/95 text-gray-700 dark:text-gray-100 shadow-sm"
                                                }`}
                                        >
                                            {cat.label}
                                        </span>

                                        {/* Icon circle */}
                                        <span
                                            className={`relative w-12 h-12 rounded-full flex items-center justify-center
                                                text-white bg-gradient-to-br ${cat.gradient}
                                                shadow-md transition-transform duration-150 active:scale-90
                                                ${isActive ? `ring-2 ${cat.ring} ring-offset-2 ring-offset-background` : ""}`}
                                        >
                                            <Icon className="w-5 h-5" strokeWidth={2.25} />
                                            {isActive && (
                                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-gray-900 dark:border-white" />
                                            )}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </>
                    )}
                </AnimatePresence>

                {/* ─── MAIN FAB BUTTON ─── */}
                <motion.button
                    onClick={handleToggle}
                    animate={{ rotate: open ? 45 : 0 }}
                    transition={{ type: "spring", damping: 18, stiffness: 300 }}
                    className="pointer-events-auto relative w-14 h-14 rounded-full
                        bg-gradient-to-br from-blue-500 to-indigo-600 text-white
                        flex items-center justify-center shadow-lg shadow-blue-600/30
                        active:scale-90 transition-transform touch-manipulation"
                    aria-label={open ? "Close menu" : "Open menu"}
                    aria-expanded={open}
                >
                    {open ? (
                        <X className="w-6 h-6" strokeWidth={2.5} />
                    ) : (
                        <Sparkles className="w-6 h-6" strokeWidth={2.5} />
                    )}

                    {!open && (
                        <motion.span
                            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                            className="absolute inset-0 rounded-full bg-blue-400/30 pointer-events-none"
                        />
                    )}
                </motion.button>
            </div>
        </>
    );
}