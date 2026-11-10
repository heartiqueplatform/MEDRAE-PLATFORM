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
import { useAuth } from "@/context/AuthProvider";
import { playSound } from "@/lib/soundManager";

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

    const isHubHome = location.pathname === "/survival-hub";

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

    /* Lock body scroll while drawer is open */
    useEffect(() => {
        if (!drawerOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [drawerOpen]);

    const goToDashboard = () => {
        tap();
        const role = user?.user_metadata?.role || user?.role;
        const path =
            role === "tutor"
                ? "/dashboard/tutor"
                : role === "staff"
                    ? "/dashboard/staff"
                    : "/dashboard/student";
        navigate(path, { replace: true });
    };

    const renderNav = (onNavigate?: () => void) => (
        <>
            <p className="px-2 pt-1.5 pb-1.5
                          text-[10px] font-bold uppercase tracking-wider
                          text-slate-500 dark:text-slate-400">
                Navigate
            </p>

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
                                    h-9 px-2.5 rounded-lg mb-0.5
                                    text-left text-[12px] font-bold
                                    active:scale-[0.98] transition-transform
                                    ${active
                                ? "bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-white"
                                : "text-slate-600 dark:text-slate-400"
                            }`}
                        style={{ touchAction: "manipulation" }}
                    >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                    </button>
                );
            })}
        </>
    );

    return (
        <div className="h-[100dvh] w-full flex bg-slate-50 dark:bg-[#0d1117] overflow-hidden">
            {/* ── Desktop sidebar ─────────────────────────────── */}
            <aside className="hidden md:flex shrink-0 w-64 flex-col
                              bg-white dark:bg-[#0d1117]
                              border-r border-slate-200/70 dark:border-white/[0.06]">
                <BrandHeader />
                <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2">
                    {renderNav()}
                </nav>
                <div className="shrink-0 p-2
                                border-t border-slate-200/70 dark:border-white/[0.06]">
                    <button
                        onClick={goToDashboard}
                        className="w-full flex items-center gap-2
                                   h-9 px-2.5 rounded-lg
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
            </aside>

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

            {/* ── Mobile drawer ───────────────────────────────── */}
            {drawerOpen && (
                <div className="md:hidden fixed inset-0 z-[9999] flex">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => {
                            tap();
                            setDrawerOpen(false);
                        }}
                        style={{ touchAction: "manipulation" }}
                    />

                    {/* Drawer panel */}
                    <div className="relative w-72 max-w-[85vw]
                                    bg-white dark:bg-[#161b22]
                                    flex flex-col
                                    shadow-sm
                                    pb-[env(safe-area-inset-bottom)]">
                        {/* Drawer header */}
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

                        {/* Drawer nav */}
                        <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2">
                            {renderNav(() => setDrawerOpen(false))}
                        </nav>

                        {/* Drawer footer */}
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
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Brand header (reused in both sidebar and mobile bar) ── */

function BrandHeader() {
    return (
        <div className="h-14 px-3 flex items-center gap-2.5 shrink-0
                        border-b border-slate-200/70 dark:border-white/[0.06]">
            <div className="h-9 w-9 rounded-xl
                            bg-slate-100 dark:bg-white/[0.06]
                            flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            </div>
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
        </div>
    );
}