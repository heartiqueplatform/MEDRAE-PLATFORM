// src/components/index/BaseTopNav.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    MoreHorizontal, UserPlus, ArrowRight, LogOut, Users, Search,
} from "lucide-react";
import { NavMenu } from "./NavMenu";
import { ScrollNavItem, GuideNavItem } from "./NavItem";
import { SearchCommand } from "./SearchCommand";
import { useScrollSpy } from "../../hooks/useScrollSpy";
import {
    ACCENT_MAP, doScroll, handleExitSystem,
    type ScrollSection, type GuideLink, type SidebarAccent,
} from "./navShared";

export function BaseTopNav({
    accent,
    roleLabel,
    homeRoute,
    sections,
    guides,
    exploreLabel = "Explore",
    guidesLabel = "Guides",
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
    const active = useScrollSpy(sections);
    const activeSection = sections.find((s) => s.id === active);

    const [searchOpen, setSearchOpen] = useState(false);

    // ⌘K / Ctrl+K opens the palette
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    return (
        <>
            <header
                className="hidden lg:grid fixed top-0 inset-x-0 z-40 h-16
                 grid-cols-[1fr_auto_1fr] items-center gap-6 px-6
                 bg-white/85 backdrop-blur-md
                 border-b border-slate-200/70"
            >
                {/* ═══ LEFT: brand + role chip ═══ */}
                <div className="flex items-center gap-3 min-w-0">
                    <Link to={homeRoute} className="flex items-center gap-2.5 group shrink-0">
                        <img
                            src="/pwa-192x192.jpeg"
                            alt="Medrae"
                            className="h-8 w-8 rounded-xl shadow-sm group-hover:scale-105 transition-transform"
                        />
                        <div className="leading-tight">
                            <p className="text-[13px] font-bold">
                                <span className="text-red-600">MEDRAE</span>{" "}
                                <span className="text-slate-800">NURSING</span>
                            </p>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                {roleLabel}
                            </p>
                        </div>
                    </Link>

                    <span className={`hidden xl:inline-flex items-center gap-1.5
                          px-2.5 py-1 rounded-sm text-[10px] font-bold  tracking-wider
                          ${A.activeBg} ${A.activeText}`}>
                        <span className={` ${A.ctaBg}`} />
                        {roleLabel} Portal
                    </span>
                </div>

                {/* ═══ CENTER: nav menus ═══ */}
                <nav className="flex items-center gap-1 justify-self-center">
                    <NavMenu
                        label={exploreLabel}
                        activeLabel={
                            activeSection ? `${exploreLabel} · ${activeSection.label}` : undefined
                        }
                    >
                        <div className="flex flex-col gap-0.5">
                            {sections.map((s) => (
                                <ScrollNavItem
                                    key={s.id}
                                    section={s}
                                    active={active === s.id}
                                    accent={accent}
                                    onPick={(id) => doScroll(id)}
                                />
                            ))}
                        </div>
                    </NavMenu>

                    <NavMenu label={guidesLabel}>
                        <div className="flex flex-col gap-0.5">
                            {guides.map((g) => (
                                <GuideNavItem key={g.to} guide={g} />
                            ))}
                        </div>
                    </NavMenu>
                </nav>

                {/* ═══ RIGHT: search + auth + overflow ═══ */}
                <div className="flex items-center gap-2 justify-self-end">
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="hidden xl:flex items-center gap-2 h-9 px-3 mr-1 rounded-lg
                     text-slate-500 hover:text-slate-900 hover:bg-slate-100
                     transition-colors text-[12px] font-semibold"
                        aria-label="Search"
                    >
                        <Search className="w-4 h-4" strokeWidth={2.2} />
                        <span>Search</span>
                        <kbd className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200
                          text-[10px] font-bold text-slate-500 leading-none">⌘K</kbd>
                    </button>

                    <button
                        onClick={() => window.location.assign("/login")}
                        className="h-10 px-4 rounded-xl text-sm font-bold text-slate-700
                     hover:bg-slate-100 transition-colors
                     flex items-center gap-2"
                    >
                        <Users className="w-4 h-4" strokeWidth={2.2} />
                        Sign In
                    </button>

                    <button
                        onClick={() => window.location.assign("/register")}
                        className={`h-10 px-4 rounded-xl text-sm font-bold text-white
                      flex items-center gap-2 transition-colors
                      ${A.ctaBg} ${A.ctaHover}`}
                    >
                        <UserPlus className="w-4 h-4" strokeWidth={2.2} />
                        Get Started
                        <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
                    </button>

                    <NavMenu label="" icon={<MoreHorizontal className="w-5 h-5" strokeWidth={2.2} />}>
                        <div className="flex flex-col gap-0.5">
                            <button
                                onClick={handleExitSystem}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                         text-sm font-semibold text-slate-700
                         hover:bg-red-50 hover:text-red-600 transition-colors text-left"
                            >
                                <LogOut className="w-4 h-4" strokeWidth={2.2} />
                                Exit System
                            </button>
                            <Link
                                to="/"
                                onClick={() => {
                                    localStorage.removeItem("medrae.persona");
                                    sessionStorage.removeItem("medrae.seen_chooser");
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                         text-sm font-semibold text-slate-700
                         hover:bg-slate-100 transition-colors"
                            >
                                ← Switch role
                            </Link>
                        </div>
                    </NavMenu>
                </div>


            </header>
            <SearchCommand
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
                sections={sections}
                guides={guides}
                accent={accent}
            />
        </>
    );
}