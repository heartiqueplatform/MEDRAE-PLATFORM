// src/pages/survival-hub/SurvivalLayout.tsx
import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    MapPin,
    Home,
    Hospital,
    Briefcase,
    Users,
    ChevronLeft,
    Menu,
    X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/context/AuthProvider";
import { playSound } from "@/lib/soundManager";
import { useHomeRoute } from "@/hooks/useHomeRoute";

const tap = () => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
    }
};

type NavItem = {
    key: string;
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
    { key: "home", label: "Overview", href: "/survival-hub", icon: MapPin },
    {
        key: "exam-centers",
        label: "Exam centers",
        href: "/survival-hub/exam-centers",
        icon: MapPin,
    },
    {
        key: "housing",
        label: "Student housing",
        href: "/survival-hub/housing",
        icon: Home,
    },
    {
        key: "hospitals",
        label: "Nearby hospitals",
        href: "/survival-hub/hospitals",
        icon: Hospital,
    },
    {
        key: "placements",
        label: "Placements",
        href: "/survival-hub/placements",
        icon: Briefcase,
    },
    {
        key: "buddies",
        label: "Exam buddies",
        href: "/survival-hub/buddies",
        icon: Users,
    },
];

export default function SurvivalLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [edgeStart, setEdgeStart] = useState<{ x: number; y: number } | null>(null);
    const home = useHomeRoute();
    const isHubHome = location.pathname === "/survival-hub";

    const collapsed = !hovered;
    const asideWidth = collapsed ? 68 : 256;

    /* Close drawer on route change */
    useEffect(() => {
        setDrawerOpen(false);
    }, [location.pathname]);

    /* Escape closes drawer */
    useEffect(() => {
        if (!drawerOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setDrawerOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [drawerOpen]);

    /* Lock body scroll while drawer is open — keep during exit animation */
    useEffect(() => {
        if (!drawerOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            const t = setTimeout(() => {
                document.body.style.overflow = prev;
            }, 220);
            return () => clearTimeout(t);
        };
    }, [drawerOpen]);

    const goToDashboard = () => {
        tap();
        navigate(home, { replace: false });
    };

    const renderNav = (opts?: { compact?: boolean; onNavigate?: () => void }) => {
        const compact = !!opts?.compact;
        const onNavigate = opts?.onNavigate;

        return (
            <>
                {!compact && (
                    <p className="px-2 pt-1.5 pb-1.5
                                  text-[10px] font-bold uppercase tracking-wider
                                  text-slate-500 dark:text-slate-400">
                        Navigate
                    </p>
                )}

                {NAV.map((item) => {
                    const active =
                        item.href === "/survival-hub"
                            ? isHubHome
                            : location.pathname.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.key}
                            onClick={() => {
                                tap();
                                navigate(item.href);
                                onNavigate?.();
                            }}
                            className={`w-full flex items-center gap-2.5
                                        h-9 rounded-lg mb-0.5
                                        text-left text-[12px] font-bold
                                        active:scale-[0.98] transition-transform
                                        ${compact ? "justify-center px-0" : "px-2.5"}
                                        ${active
                                    ? "bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-white"
                                    : "text-slate-600 dark:text-slate-400"
                                }`}
                            style={{ touchAction: "manipulation" }}
                            title={compact ? item.label : undefined}
                            aria-label={compact ? item.label : undefined}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {!compact && <span className="truncate">{item.label}</span>}
                        </button>
                    );
                })}
            </>
        );
    };

    return (
        <div className="h-[100dvh] w-full flex bg-slate-50 dark:bg-[#0d1117] overflow-hidden">
            {/* ── Desktop sidebar — always collapsed, hover expands ───── */}
            {/* ── Desktop sidebar — never rendered below md ───── */}
            <div className="hidden md:flex shrink-0">
                <motion.aside
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    className="flex shrink-0 flex-col
                               bg-white dark:bg-[#0d1117]
                               border-r border-slate-200/70 dark:border-white/[0.06]
                               overflow-hidden relative z-20"
                    animate={{ width: asideWidth }}
                    transition={{ type: "spring", damping: 30, stiffness: 320 }}
                >
                    {/* Brand header — icon-only when collapsed */}
                    <div
                        className={`h-14 flex items-center shrink-0
                                border-b border-slate-200/70 dark:border-white/[0.06]
                                ${collapsed ? "justify-center px-0" : "px-3 gap-2.5"}`}
                    >
                        <div className="h-9 w-9 rounded-xl
                                    bg-slate-100 dark:bg-white/[0.06]
                                    flex items-center justify-center shrink-0">
                            <MapPin className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                        </div>
                        {!collapsed && (
                            <div className="min-w-0">
                                <p className="text-sm font-bold leading-tight truncate
                                          text-slate-900 dark:text-white">
                                    Survival Hub
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400
                                          leading-tight truncate">
                                    Student companion
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Nav */}
                    <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2">
                        {renderNav({ compact: collapsed })}
                    </nav>

                    {/* Footer — "Back to dashboard" */}
                    <div className="shrink-0 p-2
                                border-t border-slate-200/70 dark:border-white/[0.06]">
                        <button
                            onClick={goToDashboard}
                            title={collapsed ? "Back to dashboard" : undefined}
                            aria-label={collapsed ? "Back to dashboard" : undefined}
                            className={`w-full flex items-center gap-2
                                   h-9 rounded-lg
                                   text-[12px] font-bold
                                   text-slate-600 dark:text-slate-400
                                   active:scale-[0.98] transition-transform
                                   active:bg-slate-100 dark:active:bg-white/5
                                   ${collapsed ? "justify-center px-0" : "px-2.5"}`}
                            style={{ touchAction: "manipulation" }}
                        >
                            <ChevronLeft className="h-4 w-4 shrink-0" />
                            {!collapsed && <span>Back to dashboard</span>}
                        </button>
                    </div>
                </motion.aside>
            </div>

            {/* ── Content ─────────────────────────────────────── */}
            <div className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col">
                {/* Mobile top bar with hamburger + brand */}
                <header className="md:hidden shrink-0 flex items-center gap-2 px-2 h-14
                                   bg-white dark:bg-[#0d1117]
                                   border-b border-slate-200/70 dark:border-white/[0.06]
                                   z-30 safe-top">
                    <button
                        onClick={() => {
                            tap();
                            setDrawerOpen(true);
                        }}
                        aria-label="Open menu"
                        className="h-10 w-10 rounded-full flex items-center justify-center
                                   text-slate-700 dark:text-slate-200
                                   active:bg-slate-100 dark:active:bg-white/5"
                        style={{ touchAction: "manipulation" }}
                    >
                        <Menu className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider
                                      text-slate-500 dark:text-slate-400 leading-none mb-1">
                            Survival Hub
                        </p>
                        <h1 className="text-sm font-bold leading-tight truncate
                                       text-slate-900 dark:text-white">
                            Student companion
                        </h1>
                    </div>
                </header>

                <Outlet />
            </div>

            {/* ── Mobile left-edge swipe-to-open ───────────────── */}
            {!drawerOpen && (
                <div
                    className="md:hidden fixed left-0 top-0 bottom-0 w-4 z-[9998]"
                    style={{ touchAction: "pan-y" }}
                    onPointerDown={(e) => {
                        if (e.pointerType === "mouse") return;
                        setEdgeStart({ x: e.clientX, y: e.clientY });
                    }}
                    onPointerMove={(e) => {
                        if (!edgeStart) return;
                        const dx = e.clientX - edgeStart.x;
                        const dy = Math.abs(e.clientY - edgeStart.y);
                        if (dx > 60 && dx > dy * 1.5) {
                            tap();
                            setDrawerOpen(true);
                            setEdgeStart(null);
                        }
                    }}
                    onPointerUp={() => setEdgeStart(null)}
                    onPointerCancel={() => setEdgeStart(null)}
                    onPointerLeave={() => setEdgeStart(null)}
                />
            )}

            {/* ── Mobile drawer (animated) ────────────────────── */}
            <AnimatePresence>
                {drawerOpen && (
                    <motion.div
                        className="md:hidden fixed inset-0 z-[9999] flex"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                            onClick={() => {
                                tap();
                                setDrawerOpen(false);
                            }}
                            style={{ touchAction: "manipulation" }}
                        />

                        <motion.div
                            className="relative w-72 max-w-[85vw] h-full
                                       bg-white dark:bg-[#161b22]
                                       flex flex-col
                                       rounded-r-2xl
                                       shadow-xl
                                       pb-[env(safe-area-inset-bottom)]"
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 32, stiffness: 320 }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={{ left: 0.4, right: 0 }}
                            onDragEnd={(_, info) => {
                                if (info.offset.x < -80 || info.velocity.x < -400) {
                                    setDrawerOpen(false);
                                }
                            }}
                        >
                            <div className="shrink-0 flex items-center gap-2 px-2 h-14
                                            border-b border-slate-200/70 dark:border-white/[0.06]">
                                <button
                                    onClick={() => {
                                        tap();
                                        setDrawerOpen(false);
                                    }}
                                    aria-label="Close menu"
                                    className="h-10 w-10 rounded-full flex items-center justify-center
                                               text-slate-700 dark:text-slate-200
                                               active:bg-slate-100 dark:active:bg-white/5"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <X className="h-5 w-5" strokeWidth={2.5} />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider
                                                  text-slate-500 dark:text-slate-400 leading-none mb-1">
                                        Survival Hub
                                    </p>
                                    <h2 className="text-sm font-bold leading-tight truncate
                                                   text-slate-900 dark:text-white">
                                        Student companion
                                    </h2>
                                </div>
                            </div>

                            <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2">
                                {renderNav({ onNavigate: () => setDrawerOpen(false) })}
                            </nav>

                            <div className="shrink-0 p-2
                                            border-t border-slate-200/70 dark:border-white/[0.06]">
                                <button
                                    onClick={() => {
                                        setDrawerOpen(false);
                                        goToDashboard();
                                    }}
                                    className="w-full flex items-center gap-2
                                               h-10 px-2.5 rounded-lg
                                               text-[12px] font-bold
                                               text-slate-600 dark:text-slate-400
                                               active:scale-[0.98] transition-transform
                                               active:bg-slate-100 dark:active:bg-white/5"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <ChevronLeft className="h-4 w-4 shrink-0" />
                                    <span>Back to dashboard</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}