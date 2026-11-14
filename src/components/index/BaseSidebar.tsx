// src/components/index/BaseSidebar.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UserPlus, ArrowRight, LogOut, Menu, X } from "lucide-react";
import {
    ACCENT_MAP,
    doScroll,
    handleExitSystem,
    type SidebarAccent,
    type ScrollSection,
    type GuideLink,
} from "./navShared";

// Re-export so existing imports from "./BaseSidebar" still work
export type { SidebarAccent, ScrollSection, GuideLink };

/* ═══════════════════════════════════════════════════════════════
   MOBILE TRIGGER
   ═══════════════════════════════════════════════════════════════ */
export function BaseSidebarMobileTrigger({ onOpen }: { onOpen: () => void }) {
    return (
        <button
            onClick={onOpen}
            className="lg:hidden fixed top-3 left-3 z-[9999]
                 flex items-center gap-2 h-11 pl-2 pr-3 rounded-xl
                 bg-white/95 backdrop-blur-md shadow-lg
                 active:scale-95 transition-transform"
            style={{ touchAction: "manipulation" }}
            aria-label="Open menu"
        >
            <img src="/pwa-192x192.jpeg" alt="" className="h-7 w-7 rounded-lg" />
            <Menu className="w-5 h-5 text-slate-700" />
        </button>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MOBILE DRAWER
   ═══════════════════════════════════════════════════════════════ */
export function BaseSidebarDrawer({
    open, onClose, accent, roleLabel, homeRoute, sections, guides,
    exploreLabel = "Explore",
    guidesLabel = "Revision Guides",
}: {
    open: boolean;
    onClose: () => void;
    accent: SidebarAccent;
    roleLabel: string;
    homeRoute: string;
    sections: readonly ScrollSection[];
    guides: readonly GuideLink[];
    exploreLabel?: string;
    guidesLabel?: string;
}) {
    const A = ACCENT_MAP[accent];
    const [visible, setVisible] = useState(open);
    useEffect(() => {
        if (open) setVisible(true);
        else {
            const t = setTimeout(() => setVisible(false), 300);
            return () => clearTimeout(t);
        }
    }, [open]);

    if (!visible) return null;

    const handleClick = (id: string) => {
        onClose();
        setTimeout(() => doScroll(id), 150);
    };

    return (
        <div className="fixed inset-0 z-[10000] lg:hidden">
            <div
                onClick={onClose}
                className={`absolute inset-0 bg-black/50 backdrop-blur-sm
                    transition-opacity duration-300
                    ${open ? "opacity-100" : "opacity-0"}`}
            />

            <aside
                className={`relative w-[280px] max-w-[85vw] h-full
                    bg-white shadow-2xl flex flex-col
                    transition-transform duration-300 ease-out
                    ${open ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="shrink-0 flex items-center justify-between px-4 py-3.5">
                    <Link to={homeRoute} className="flex items-center gap-2">
                        <img src="/pwa-192x192.jpeg" alt="" className="h-8 w-8 rounded-lg" />
                        <div>
                            <p className="text-[13px] font-bold leading-tight">
                                <span className="text-red-600">MEDRAE</span>{" "}
                                <span className="text-slate-800">NURSING</span>
                            </p>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                {roleLabel}
                            </p>
                        </div>
                    </Link>
                    <button
                        onClick={onClose}
                        className="h-9 w-9 rounded-lg flex items-center justify-center
                       text-slate-500 active:bg-slate-100"
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    <div className="p-3">
                        <p className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                            {exploreLabel}
                        </p>
                        <div className="space-y-0.5">
                            {sections.map((s) => {
                                const Icon = s.icon;
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => handleClick(s.id)}
                                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl
                               text-[13px] font-semibold text-slate-700
                               active:bg-slate-100 transition-colors"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <span className="w-8 h-8 rounded-lg flex items-center justify-center
                                     bg-slate-100 text-slate-600">
                                            <Icon className="w-4 h-4" strokeWidth={2.2} />
                                        </span>
                                        <span className="truncate">{s.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-3 mt-2">
                        <p className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                            {guidesLabel}
                        </p>
                        <div className="space-y-0.5">
                            {guides.map((g) => {
                                const Icon = g.icon;
                                return (
                                    <Link
                                        key={g.to}
                                        to={g.to}
                                        onClick={onClose}
                                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl
                               text-[12px] font-semibold text-slate-700
                               active:bg-slate-100 transition-colors"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <span className="w-8 h-8 rounded-lg flex items-center justify-center
                                     bg-slate-100 text-slate-600">
                                            <Icon className="w-4 h-4" strokeWidth={2.2} />
                                        </span>
                                        <span className="truncate">{g.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="shrink-0 p-3 space-y-2">
                    <button
                        onClick={() => { onClose(); window.location.assign("/login"); }}
                        className="w-full flex items-center justify-center gap-2
                       px-3 py-3 rounded-xl text-slate-700 bg-slate-100
                       active:bg-slate-200 text-[12px] font-bold"
                        style={{ touchAction: "manipulation" }}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => { onClose(); window.location.assign("/register"); }}
                        className={`w-full flex items-center justify-center gap-2
                       px-3 py-3 rounded-xl text-white text-[12px] font-bold
                       ${A.ctaBg}`}
                        style={{ touchAction: "manipulation" }}
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        Get Started
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => { onClose(); handleExitSystem(); }}
                        className="w-full flex items-center justify-center gap-2
                       px-3 py-3 rounded-xl text-slate-600 bg-slate-50
                       active:bg-red-50 active:text-red-600 text-[12px] font-bold"
                        style={{ touchAction: "manipulation" }}
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Exit System
                    </button>
                    <Link
                        to="/"
                        onClick={() => {
                            onClose();
                            localStorage.removeItem("medrae.persona");
                            sessionStorage.removeItem("medrae.seen_chooser");
                        }}
                        className="block text-center text-[11px] font-bold text-slate-500
                       active:text-slate-900 py-2"
                        style={{ touchAction: "manipulation" }}
                    >
                        ← Switch role
                    </Link>
                </div>
            </aside>
        </div>
    );
}