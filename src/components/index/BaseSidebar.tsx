// src/components/index/BaseSidebar.tsx
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, UserPlus, ArrowRight, LogOut, Users, Menu, X } from "lucide-react";

export type SidebarAccent = "blue" | "emerald" | "violet";

export type ScrollSection = {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

export type GuideLink = {
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

const ACCENT_MAP: Record<
    SidebarAccent,
    { activeBg: string; activeText: string; ctaBg: string; ctaHover: string }
> = {
    blue: {
        activeBg: "bg-blue-50",
        activeText: "text-blue-700",
        ctaBg: "bg-blue-600",
        ctaHover: "hover:bg-blue-700",
    },
    emerald: {
        activeBg: "bg-emerald-50",
        activeText: "text-emerald-700",
        ctaBg: "bg-emerald-600",
        ctaHover: "hover:bg-emerald-700",
    },
    violet: {
        activeBg: "bg-violet-50",
        activeText: "text-violet-700",
        ctaBg: "bg-violet-600",
        ctaHover: "hover:bg-violet-700",
    },
};

function doScroll(id: string) {
    if (id === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
    }
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`[sidebar] no element #${id} on this page`);
        return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
        const top = el.getBoundingClientRect().top + window.pageYOffset - 20;
        window.scrollTo({ top, behavior: "smooth" });
    }, 60);
}

function handleExitSystem() {
    if ((window as any).electronAPI?.quitApp) {
        (window as any).electronAPI.quitApp();
    } else {
        if (confirm("Exit Medrae? You'll be signed out from this tab.")) {
            window.location.href = "about:blank";
        }
    }
}

/* ═══════════════════════════════════════════════════════════════
   DESKTOP SIDEBAR
   ═══════════════════════════════════════════════════════════════ */
export function BaseSidebarDesktop({
    accent,
    roleLabel,
    homeRoute,
    sections,
    guides,
    exploreLabel = "Explore",
    guidesLabel = "Revision Guides",
}: {
    accent: SidebarAccent;
    roleLabel: string;
    homeRoute: string;
    sections: readonly ScrollSection[];
    guides: readonly GuideLink[];
    exploreLabel?: string;
    guidesLabel?: string;
}) {
    const A = ACCENT_MAP[accent];
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(sections[0]?.id ?? "home");
    const hoverTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handler = () => {
            const y = window.scrollY + 120;
            let current = sections[0]?.id ?? "home";
            for (const s of sections) {
                const el = document.getElementById(s.id);
                if (el && el.offsetTop <= y) current = s.id;
            }
            setActive(current);
        };
        handler();
        window.addEventListener("scroll", handler, { passive: true });
        return () => window.removeEventListener("scroll", handler);
    }, [sections]);

    const onEnter = () => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(() => setOpen(true), 90);
    };
    const onLeave = () => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(() => setOpen(false), 220);
    };

    const handleClick = (id: string) => {
        doScroll(id);
        setTimeout(() => setOpen(false), 100);
    };

    return (
        <>
            {/* Invisible hover strip on the left edge */}
            <div
                onMouseEnter={onEnter}
                className="hidden lg:block fixed top-0 left-0 w-3 h-screen z-[9999]"
                aria-hidden
            />

            <aside
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
                className={`hidden lg:flex fixed top-0 left-0 bottom-0 z-50
                            flex-col bg-white shadow-none
                            transition-[width] duration-300 ease-out
                            ${open ? "w-64" : "w-16"}`}
            >
                {/* ═══════ BRAND ═══════
                    FIXED height (56px) in both states.
                    Icon sits in a fixed 48×48 slot at the same Y. */}
                <div className="shrink-0 h-14 flex items-center px-2">
                    <Link
                        to={homeRoute}
                        className="flex items-center w-full group"
                    >
                        <div className="shrink-0 w-12 h-12 flex items-center justify-center">
                            <img
                                src="/pwa-192x192.jpeg"
                                alt="Medrae"
                                className="h-9 w-9 rounded-xl shadow-sm group-hover:scale-105 transition-transform"
                            />
                        </div>
                        <div
                            className={`min-w-0 overflow-hidden whitespace-nowrap ml-2
                                        transition-opacity duration-200
                                        ${open ? "opacity-100" : "opacity-0"}`}
                        >
                            <p className="text-[14px] font-bold leading-tight">
                                <span className="text-red-600">MEDRAE</span>{" "}
                                <span className="text-slate-800">NURSING</span>
                            </p>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                {roleLabel}
                            </p>
                        </div>
                    </Link>
                </div>

                {/* ═══════ BODY ═══════ */}
                <div className="flex-1 overflow-y-auto no-scrollbar">

                    {/* ── EXPLORE SECTION ── */}
                    {/* Header row: ALWAYS h-7 (28px) — same in both states */}
                    <div className="h-7 flex items-center px-3 mt-1">
                        <p
                            className={`text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap
                                        transition-opacity duration-200
                                        ${open ? "opacity-100" : "opacity-0"}`}
                        >
                            {exploreLabel}
                        </p>
                    </div>

                    {/* Items list:
                        - Row height 48px in BOTH states (h-12 when closed, py-3 + 20px content when open = 44px → force with min-h-12)
                        - Gap 2px in BOTH states
                        - Padding-left: 8px when closed / 12px when open — horizontal only, doesn't affect Y
                    */}
                    <div className={`flex flex-col gap-0.5 ${open ? "px-3" : "px-2 items-center"}`}>
                        {sections.map((s) => {
                            const Icon = s.icon;
                            const isActive = active === s.id;
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => handleClick(s.id)}
                                    title={!open ? s.label : undefined}
                                    className={`flex items-center rounded-lg transition-colors min-h-12
                                                text-[13px] font-semibold
                                                ${open ? "w-full px-3" : "w-12 justify-center"}
                                                ${isActive
                                            ? `${A.activeBg} ${A.activeText}`
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <Icon className="shrink-0 w-5 h-5" strokeWidth={2.2} />
                                    <span
                                        className={`truncate flex-1 text-left overflow-hidden whitespace-nowrap ml-3
                                                    transition-opacity duration-200
                                                    ${open ? "opacity-100" : "opacity-0"}`}
                                    >
                                        {s.label}
                                    </span>
                                    {isActive && open && (
                                        <ChevronRight className="w-3 h-3 ml-2 shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── GUIDES SECTION ── */}
                    {/* Header: same h-7, mt-4 for separation */}
                    <div className="h-7 flex items-center px-3 mt-4">
                        <p
                            className={`text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap
                                        transition-opacity duration-200
                                        ${open ? "opacity-100" : "opacity-0"}`}
                        >
                            {guidesLabel}
                        </p>
                    </div>

                    <div className={`flex flex-col gap-0.5 ${open ? "px-3" : "px-2 items-center"}`}>
                        {guides.map((g) => {
                            const Icon = g.icon;
                            return (
                                <Link
                                    key={g.to}
                                    to={g.to}
                                    onClick={() => setOpen(false)}
                                    title={!open ? g.label : undefined}
                                    className={`flex items-center rounded-lg
                                                text-[12px] font-semibold min-h-12
                                                text-slate-600 hover:bg-slate-50 hover:text-slate-900
                                                transition-colors
                                                ${open ? "w-full px-3" : "w-12 justify-center"}`}
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <Icon className="shrink-0 w-5 h-5" strokeWidth={2.2} />
                                    <span
                                        className={`truncate flex-1 text-left overflow-hidden whitespace-nowrap ml-3
                                                    transition-opacity duration-200
                                                    ${open ? "opacity-100" : "opacity-0"}`}
                                    >
                                        {g.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* ═══════ FOOTER (AUTH) ═══════ */}
                {/* Every button is min-h-12 in BOTH states. Gap 2px in both. */}
                <div className="shrink-0 pb-3 px-2 flex flex-col gap-1.5 items-stretch">
                    {open ? (
                        <>
                            <button
                                onClick={() => window.location.assign("/login")}
                                className="w-full flex items-center justify-center gap-2 min-h-12
                                           px-3 rounded-xl text-slate-700 bg-slate-100
                                           hover:bg-slate-200 active:bg-slate-300
                                           text-[12px] font-bold transition-colors"
                                style={{ touchAction: "manipulation" }}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => window.location.assign("/register")}
                                className={`w-full flex items-center justify-center gap-2 min-h-12
                                           px-3 rounded-xl text-white
                                           text-[12px] font-bold transition-colors
                                           ${A.ctaBg} ${A.ctaHover}`}
                                style={{ touchAction: "manipulation" }}
                            >
                                <UserPlus className="w-4 h-4" />
                                Get Started
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleExitSystem}
                                className="w-full flex items-center justify-center gap-2 min-h-12
                                           px-3 rounded-xl text-slate-600 bg-slate-50
                                           hover:text-red-600 hover:bg-red-50
                                           text-[12px] font-bold transition-colors"
                                style={{ touchAction: "manipulation" }}
                            >
                                <LogOut className="w-4 h-4" />
                                Exit System
                            </button>
                            <Link
                                to="/"
                                onClick={() => {
                                    localStorage.removeItem("medrae.persona");
                                    sessionStorage.removeItem("medrae.seen_chooser");
                                }}
                                className="block text-center text-[11px] font-bold text-slate-500
                                           hover:text-slate-900 py-2 transition-colors"
                                style={{ touchAction: "manipulation" }}
                            >
                                ← Switch role
                            </Link>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => window.location.assign("/login")}
                                title="Sign In"
                                className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto
                                           text-slate-600 bg-slate-100 hover:bg-slate-200
                                           transition-colors"
                                style={{ touchAction: "manipulation" }}
                            >
                                <Users className="w-5 h-5" strokeWidth={2.2} />
                            </button>
                            <button
                                onClick={() => window.location.assign("/register")}
                                title="Get Started"
                                className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto
                                           text-white transition-colors ${A.ctaBg} ${A.ctaHover}`}
                                style={{ touchAction: "manipulation" }}
                            >
                                <UserPlus className="w-5 h-5" strokeWidth={2.2} />
                            </button>
                            <button
                                onClick={handleExitSystem}
                                title="Exit System"
                                className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto
                                           text-slate-600 bg-slate-50 hover:text-red-600 hover:bg-red-50
                                           transition-colors"
                                style={{ touchAction: "manipulation" }}
                            >
                                <LogOut className="w-5 h-5" strokeWidth={2.2} />
                            </button>
                        </>
                    )}
                </div>
            </aside>
        </>
    );
}

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

                <div className="flex-1 overflow-y-auto">
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