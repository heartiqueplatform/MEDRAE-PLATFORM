"use client";

import { useEffect, useState, useRef, useCallback, memo, Suspense, lazy } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";
import { useUserRole } from "@/context/UserRoleContext";

const MobileDrawer = lazy(() => import("@/components/MobileDrawer").then(module => ({ default: module.MobileDrawer })));

const MISTAKE_COUNT_CACHE_KEY = "footer_mistake_count";

const superFastTap = (type: "light" | "success" | "warning" = "light") => {
    requestAnimationFrame(() => {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            if (type === "success") navigator.vibrate([30, 40, 30]);
            else if (type === "warning") navigator.vibrate(100);
            else navigator.vibrate(35);
        }
    });
};

/* ============================================================
   ICONS — v3
   • 26×26 viewBox padding preserved
   • strokeWidth: 1.9 inactive / 2.1 active
   • Active state → filled silhouette (no fillOpacity)
   • Round caps & joins throughout
   ============================================================ */

const SW = (active: boolean) => (active ? 2.1 : 1.9);

// ── HOME ────────────────────────────────────────────────────
const IconHome = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M3.5 11.2L11.72 3.4a1.9 1.9 0 0 1 2.56 0L22.5 11.2v9.3a1.5 1.5 0 0 1-1.5 1.5h-4.2a1 1 0 0 1-1-1v-3.6a3.3 3.3 0 0 0-6.6 0V21a1 1 0 0 1-1 1H5a1.5 1.5 0 0 1-1.5-1.5v-9.3Z"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
        />
    </svg>
);

// ── QUIZZES (heart → kept heart, cleaner geometry) ─────────
const IconQuizzes = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M13 21.8S4.4 16.6 4.4 10.9a4.9 4.9 0 0 1 8.6-3.1 4.9 4.9 0 0 1 8.6 3.1c0 5.7-8.6 10.9-8.6 10.9Z"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
        />
    </svg>
);

// ── FEED ────────────────────────────────────────────────────
const IconFeed = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect
            x="3.75"
            y="4.25"
            width="15.5"
            height="17.5"
            rx="2"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
        />
        <path
            d="M19.25 8.5h1.5A2.25 2.25 0 0 1 23 10.75v10.5a2.25 2.25 0 0 1-2.25 2.25"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
        {!active && (
            <>
                <path d="M7.5 9.25h8" stroke="currentColor" strokeWidth={SW(false)} strokeLinecap="round" />
                <path d="M7.5 13h8" stroke="currentColor" strokeWidth={SW(false)} strokeLinecap="round" />
                <path d="M7.5 16.75h5" stroke="currentColor" strokeWidth={SW(false)} strokeLinecap="round" />
            </>
        )}
        {active && (
            <>
                <path d="M7.5 9.25h8" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
                <path d="M7.5 13h8" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
                <path d="M7.5 16.75h5" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
            </>
        )}
    </svg>
);
// ── MISTAKES (broken heart — cleaned) ─────────────────────
const IconMistakes = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Left half of heart */}
        <path
            d="M13 21.5S4.2 16.1 4.2 10.3a4.9 4.9 0 0 1 8.8-3.05"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
        />
        {/* Right half of heart — offset slightly to create the "break" */}
        <path
            d="M13 21.5s8.8-5.4 8.8-11.2a4.9 4.9 0 0 0-8.8-3.05"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
            transform="translate(1.2 0)"
        />
        {/* The jagged break line down the middle */}
        <path
            d="m11.2 6.8 1.8 2.6-1.4 2.2 1.4 2.4-1.4 2.3 1.4 2.4"
            stroke={active ? "white" : "currentColor"}
            strokeWidth={active ? 1.6 : 1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={active ? 0.7 : 1}
            transform="translate(0.7 0)"
        />
    </svg>
);

// ── CPD (award/medal) ──────────────────────────────────────
const IconCpd = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle
            cx="13"
            cy="10"
            r="5.75"
            stroke="currentColor"
            strokeWidth={SW(active)}
            fill={active ? "currentColor" : "none"}
        />
        <path
            d="M8.75 14.75 8 22.25l5-2.75 5 2.75-.75-7.5"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
        />
    </svg>
);

// ── CATALOG (book) ──────────────────────────────────────────
const IconCatalog = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M4.25 5.5A2.25 2.25 0 0 1 6.5 3.25H19A2.25 2.25 0 0 1 21.25 5.5v15A2.25 2.25 0 0 1 19 22.75H6.5A2.25 2.25 0 0 1 4.25 20.5V5.5Z"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
        />
        <path d="M8.5 3.25v19.5" stroke={active ? "white" : "currentColor"} strokeWidth={active ? 1.6 : SW(false)} strokeLinecap="round" opacity={active ? 0.55 : 1} />
        {!active && (
            <>
                <path d="M12 9.5h5.5" stroke="currentColor" strokeWidth={SW(false)} strokeLinecap="round" />
                <path d="M12 13h5.5" stroke="currentColor" strokeWidth={SW(false)} strokeLinecap="round" />
            </>
        )}
    </svg>
);

// ── PROGRESS (bar chart) ───────────────────────────────────
const IconProgress = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M4.25 21.75h17.5"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
        />
        <rect x="6.5" y="13" width="3.5" height="7" rx="1.25" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} />
        <rect x="11.25" y="9" width="3.5" height="11" rx="1.25" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} />
        <rect x="16" y="5" width="3.5" height="15" rx="1.25" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} />
    </svg>
);

// ── MENU (three lines, weightier) ──────────────────────────
// ── MENU (three lines, weightier) ──────────────────────────
const IconMenu = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.5 7.5h17" stroke="currentColor" strokeWidth={active ? 2.3 : 2.1} strokeLinecap="round" />
        <path d="M4.5 13h17" stroke="currentColor" strokeWidth={active ? 2.3 : 2.1} strokeLinecap="round" />
        <path d="M4.5 18.5h17" stroke="currentColor" strokeWidth={active ? 2.3 : 2.1} strokeLinecap="round" />
    </svg>
);

// ── HEADPHONES (podcasts / listen) ─────────────────────────
const IconHeadphones = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M5 15.5v-2.5a8 8 0 0 1 16 0v2.5"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
        <rect
            x="3.5"
            y="14"
            width="5"
            height="7.5"
            rx="2"
            stroke="currentColor"
            strokeWidth={SW(active)}
            fill={active ? "currentColor" : "none"}
        />
        <rect
            x="17.5"
            y="14"
            width="5"
            height="7.5"
            rx="2"
            stroke="currentColor"
            strokeWidth={SW(active)}
            fill={active ? "currentColor" : "none"}
        />
    </svg>
);

// ── TUTOR EXAMS (clipboard check) ──────────────────────────
const IconTutorExams = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M9 4.25H7.5A2.25 2.25 0 0 0 5.25 6.5v14A2.25 2.25 0 0 0 7.5 22.75h11A2.25 2.25 0 0 0 20.75 20.5v-14A2.25 2.25 0 0 0 18.5 4.25H17"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
        />
        <rect
            x="9"
            y="2.75"
            width="8"
            height="4"
            rx="1.25"
            stroke="currentColor"
            strokeWidth={SW(active)}
            fill={active ? "currentColor" : "none"}
        />
        {!active && (
            <path d="m10 14.5 2.25 2.25L16.5 12.5" stroke="currentColor" strokeWidth={SW(false)} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {active && (
            <path d="m10 14.5 2.25 2.25L16.5 12.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
        )}
    </svg>
);

// ── EXAM RESULTS (document check) ──────────────────────────
const IconExamResults = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M6.5 3.25H15L21 9.25v12a1.5 1.5 0 0 1-1.5 1.5h-13a1.5 1.5 0 0 1-1.5-1.5v-16A1.5 1.5 0 0 1 6.5 3.25Z"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
        />
        <path
            d="M15 3.25v6h6"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {!active && (
            <>
                <path d="m9.5 14.5 2.25 2.25L16 12.5" stroke="currentColor" strokeWidth={SW(false)} strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.5 19.5h7" stroke="currentColor" strokeWidth={SW(false)} strokeLinecap="round" />
            </>
        )}
        {active && (
            <>
                <path d="m9.5 14.5 2.25 2.25L16 12.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
                <path d="M9.5 19.5h7" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
            </>
        )}
    </svg>
);

// ── ANALYTICS (bar chart with baseline) ────────────────────
const IconAnalytics = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="5.25" y="12" width="4" height="7.5" rx="1.25" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} />
        <rect x="11" y="7.5" width="4" height="12" rx="1.25" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} />
        <rect x="16.75" y="4.25" width="4" height="15.25" rx="1.25" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} />
    </svg>
);

/* ============================================================
   NAV ITEM — v3
   • No border on active tile
   • Gradient fill + soft shadow only
   • 44×44 tile, 26×26 icon
   ============================================================ */
const NavItem = memo(({
    icon: Icon,
    label,
    isActive,
    onPress,
    isDark,
    badge,
}: {
    icon: (props: { active: boolean }) => JSX.Element;
    label: string;
    isActive: boolean;
    onPress: (e: React.PointerEvent) => void;
    isDark: boolean;
    badge?: number;
}) => {
    const [pressed, setPressed] = useState(false);
    const [pending, setPending] = useState(false);

    // Light up the tile the instant the tap lands — even if the
    // route change takes 400ms. Clears once the route has settled.
    const showActive = isActive || pending;

    const labelColor = showActive
        ? (isDark ? "text-white" : "text-blue-600")
        : (isDark ? "text-gray-400" : "text-gray-500");

    const iconColor = showActive
        ? (isDark ? "text-white" : "text-blue-600")
        : (isDark ? "text-gray-400" : "text-gray-500");

    const handlePointerDown = (e: React.PointerEvent) => {
        setPressed(true);
        setPending(true);
        onPress(e);
        setTimeout(() => setPending(false), 500);
    };
    const clear = () => setPressed(false);

    // ── Active tile — clean gradient, NO border ──────────────
    const activeTileBg = isDark
        ? "linear-gradient(160deg, rgba(59,130,246,0.26) 0%, rgba(37,99,235,0.14) 100%)"
        : "linear-gradient(160deg, rgba(59,130,246,0.16) 0%, rgba(37,99,235,0.09) 100%)";

    const activeTileShadow = isDark
        ? "0 4px 14px rgba(59,130,246,0.22), inset 0 1px 0 rgba(255,255,255,0.06)"
        : "0 4px 14px rgba(59,130,246,0.16), inset 0 1px 0 rgba(255,255,255,0.75)";

    return (
        <button
            onPointerDown={handlePointerDown}
            onPointerUp={clear}
            onPointerLeave={clear}
            onPointerCancel={clear}
            className="flex flex-col items-center justify-center flex-1 h-full relative select-none"
            style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                transition: "transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                transform: pressed ? "scale(0.93)" : "scale(1)",
            }}
            aria-label={label}
        >
            {/* ── Press ripple ── */}
            <div
                className="absolute top-0.5 left-1/2 -translate-x-1/2 w-11 h-11 rounded-2xl pointer-events-none"
                style={{
                    background: isDark
                        ? "radial-gradient(circle, rgba(96,165,250,0.42) 0%, rgba(59,130,246,0.14) 50%, transparent 78%)"
                        : "radial-gradient(circle, rgba(59,130,246,0.30) 0%, rgba(59,130,246,0.10) 50%, transparent 78%)",
                    opacity: pressed ? 1 : 0,
                    transition: "opacity 220ms ease-out",
                }}
            />

            {/* ── Active tile — borderless ── */}
            <div
                className="absolute top-0.5 left-1/2 -translate-x-1/2 w-11 h-11 rounded-2xl pointer-events-none"
                style={{
                    background: activeTileBg,
                    boxShadow: isActive ? activeTileShadow : "none",
                    opacity: isActive ? 1 : 0,
                    transform: `translateX(-50%) scale(${isActive ? 1 : 0.82})`,
                    transition: "opacity 260ms ease-out, transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 260ms ease-out",
                }}
            />

            {/* ── Icon ── */}
            <div className="relative flex items-center justify-center w-[26px] h-[26px] z-10">
                <span
                    className={`transition-colors duration-200 ${iconColor}`}
                    style={{
                        filter: isActive
                            ? (isDark
                                ? "drop-shadow(0 1px 3px rgba(59,130,246,0.35))"
                                : "drop-shadow(0 1px 2px rgba(59,130,246,0.18))")
                            : "none",
                    }}
                >
                    <Icon active={isActive} />
                </span>

                {badge !== undefined && badge > 0 && (
                    <span
                        className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1
                            text-[9.5px] font-bold flex items-center justify-center
                            bg-red-500 text-white rounded-full leading-none
                            ring-2 ring-background"
                        style={{ boxShadow: "0 2px 6px rgba(239,68,68,0.35)" }}
                    >
                        {badge > 99 ? "99+" : badge}
                    </span>
                )}
            </div>

            {/* ── Label ── */}
            <span
                className={`leading-none mt-1.5 transition-all duration-200 z-10 tracking-tight text-[9.5px] xs:text-[10.5px] ${isActive ? "font-semibold" : "font-medium"
                    } ${labelColor}`}
            >
                {label}
            </span>
        </button>
    );
});
NavItem.displayName = "NavItem";

/* ============================================================
   FOOTER
   ============================================================ */
export function Footer() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { role } = useUserRole();

    const isStudent = role === "student";
    const isTutor = role === "tutor";
    const isStaff = role === "staff";

    const [mistakeCount, setMistakeCount] = useState<number>(0);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [safeAreaBottom, setSafeAreaBottom] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const scrollContainerRef = useRef<Element | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        try {
            // 1. Trust the <html> class — set by the bootstrap in index.html
            if (document.documentElement.classList.contains('dark')) return 'dark';
            if (document.documentElement.classList.contains('light')) return 'light';

            // 2. Fallback: canonical key
            const darkMode = localStorage.getItem('medrae_dark_mode');
            if (darkMode !== null) return darkMode === 'true' ? 'dark' : 'light';

            // 3. Fallback: OS preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
            return 'light';
        } catch (e) {
            return 'light';
        }
    });
    const isMounted = useRef(true);
    const prefetchDone = useRef(false);
    const lastScrollY = useRef(0);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const cached = localStorage.getItem(MISTAKE_COUNT_CACHE_KEY);
        if (cached) {
            try {
                const { count, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < 5 * 60 * 1000) setMistakeCount(count);
            } catch { }
        }
    }, []);

    const fetchMistakeCount = useCallback(async () => {
        if (!isStudent || !user?.id) return;
        try {
            const { count, error } = await supabase
                .from("user_mistakes")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("resolved", false);
            if (!error && isMounted.current) {
                setMistakeCount(count || 0);
                localStorage.setItem(MISTAKE_COUNT_CACHE_KEY, JSON.stringify({ count: count || 0, timestamp: Date.now() }));
            }
        } catch { }
    }, [user?.id, isStudent]);

    useEffect(() => { fetchMistakeCount(); }, [fetchMistakeCount]);

    useEffect(() => {
        const syncTheme = () => {
            try {
                const darkMode = localStorage.getItem('medrae_dark_mode');
                let newTheme: 'light' | 'dark';
                if (darkMode !== null) newTheme = darkMode === 'true' ? 'dark' : 'light';
                else newTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                if (newTheme !== theme) setTheme(newTheme);
            } catch { }
        };
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'medrae_dark_mode') setTheme(e.newValue === 'true' ? 'dark' : 'light');
        };
        const handleThemeChange = (e: CustomEvent) => {
            setTheme(e.detail?.isDarkMode ? 'dark' : 'light');
        };
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemChange = () => {
            if (localStorage.getItem('medrae_dark_mode') === null) {
                setTheme(mediaQuery.matches ? 'dark' : 'light');
            }
        };
        window.addEventListener('storage', handleStorage);
        window.addEventListener('theme-changed', handleThemeChange as EventListener);
        mediaQuery.addEventListener('change', handleSystemChange);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('theme-changed', handleThemeChange as EventListener);
            mediaQuery.removeEventListener('change', handleSystemChange);
        };
    }, [theme]);

    // ✅ Watch <html> class changes — bulletproof sync with index.html bootstrap
    useEffect(() => {
        const html = document.documentElement;
        const observer = new MutationObserver(() => {
            const isDark = html.classList.contains('dark');
            const next = isDark ? 'dark' : 'light';
            setTheme((prev) => (prev === next ? prev : next));
        });
        observer.observe(html, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const handleNavigate = useCallback((e: React.PointerEvent, url: string) => {
        e.preventDefault();
        navigate(url);
        superFastTap("light");
    }, [navigate]);

    const handleMenuPress = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDrawerOpen(true);
        superFastTap("success");
    }, []);

    // ✅ Podcasts — opens the MusicPlayer fullscreen overlay.
    //    Uses the global opener published by MusicPlayer. No route change,
    //    so audio keeps playing and the tab bar stays where it is.
    const handleOpenPodcasts = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        superFastTap("success");

        const opener = (window as any).__studifyOpen;
        if (typeof opener === "function") {
            opener("episodes");
        } else {
            requestAnimationFrame(() => {
                const retry = (window as any).__studifyOpen;
                if (typeof retry === "function") retry("episodes");
            });
        }
    }, []);

    useEffect(() => {
        if (prefetchDone.current) return;
        const prefetchDrawer = () => {
            import("@/components/MobileDrawer").catch(console.warn);
            prefetchDone.current = true;
        };
        if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(prefetchDrawer, { timeout: 2000 });
        } else {
            setTimeout(prefetchDrawer, 1000);
        }
    }, []);

    useEffect(() => {
        const updateSafeArea = () => {
            requestAnimationFrame(() => {
                const bottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)')) || 0;
                const fallback = window.innerHeight < window.screen.height - 20 ? 20 : 0;
                setSafeAreaBottom(Math.max(bottom, fallback));
            });
        };
        updateSafeArea();
        window.addEventListener('resize', updateSafeArea);
        return () => window.removeEventListener('resize', updateSafeArea);
    }, []);

    useEffect(() => {
        const findScrollContainer = () => {
            if (location.pathname === '/feed') {
                const feedContainer = document.querySelector('.p-0.max-w-2xl.mx-auto.space-y-2.h-\\[80vh\\].overflow-y-auto');
                if (feedContainer) return feedContainer;
                const pullToRefresh = document.querySelector('.react-simple-pull-to-refresh');
                if (pullToRefresh) {
                    const container = pullToRefresh.querySelector('.overflow-y-auto');
                    if (container) return container;
                }
            }
            const dashboardContainer = document.querySelector('[data-scroll-container]');
            if (dashboardContainer) return dashboardContainer;
            const containers = document.querySelectorAll('.overflow-auto, .overflow-y-auto');
            for (const el of containers) {
                if (el.scrollHeight > el.clientHeight + 10) return el;
            }
            return null;
        };

        const container = findScrollContainer();
        scrollContainerRef.current = container;

        const handleScroll = () => {
            let currentScrollY;
            if (container === document.documentElement || container === document.body || !container) {
                currentScrollY = window.scrollY || document.documentElement.scrollTop;
            } else {
                currentScrollY = container.scrollTop;
            }
            if (window.innerWidth >= 768) return;

            if (scrollTimeout.current) { clearTimeout(scrollTimeout.current); scrollTimeout.current = null; }

            if (currentScrollY > lastScrollY.current && currentScrollY > 50) setIsVisible(false);
            else if (currentScrollY < lastScrollY.current) setIsVisible(true);
            if (currentScrollY <= 10) setIsVisible(true);

            lastScrollY.current = currentScrollY;
        };

        const handleScrollStop = () => {
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
            scrollTimeout.current = setTimeout(() => {
                setIsVisible(true);
                scrollTimeout.current = null;
            }, 1500);
        };

        if (container === document.documentElement || container === document.body || !container) {
            window.addEventListener('scroll', handleScroll, { passive: true });
            window.addEventListener('scroll', handleScrollStop, { passive: true });
        } else {
            container.addEventListener('scroll', handleScroll, { passive: true });
            container.addEventListener('scroll', handleScrollStop, { passive: true });
        }

        return () => {
            if (container === document.documentElement || container === document.body || !container) {
                window.removeEventListener('scroll', handleScroll);
                window.removeEventListener('scroll', handleScrollStop);
            } else {
                container.removeEventListener('scroll', handleScroll);
                container.removeEventListener('scroll', handleScrollStop);
            }
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        };
    }, [location.pathname]);

    const isActive = useCallback((url: string) => location.pathname === url, [location.pathname]);

    const FOOTER_CONTENT_HEIGHT = 60;
    const footerHeight = FOOTER_CONTENT_HEIGHT + safeAreaBottom;

    const footerBgClass =
        'bg-background/95 backdrop-blur-xl border-0 ' +
        'before:content-[""] before:absolute before:top-0 before:left-0 before:right-0 before:h-px ' +
        'before:bg-gradient-to-r before:from-transparent ' +
        (theme === 'dark'
            ? 'before:via-white/8 before:to-transparent '
            : 'before:via-black/6 before:to-transparent');
    return (
        <>
            <div
                className={`fixed bottom-0 left-0 right-0 z-[100] md:hidden
                    transition-all duration-300 ease-out
                    ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
                    ${isDrawerOpen ? 'opacity-0 pointer-events-none' : ''}
                    ${footerBgClass}
                    flex justify-around items-center px-1
                    select-none`}
                style={{
                    height: `${footerHeight}px`,
                    willChange: 'transform, opacity',
                    paddingBottom: `${safeAreaBottom}px`,
                    WebkitBackfaceVisibility: 'hidden',
                    backfaceVisibility: 'hidden',
                }}
            >
                {/* ✅ Home — always first (far left) */}
                <NavItem icon={IconHome} label="Home" isActive={isActive(`/dashboard/${role}`)} onPress={(e) => handleNavigate(e, `/dashboard/${role}`)} isDark={theme === 'dark'} />

                {isStudent && (
                    <>
                        <NavItem icon={IconQuizzes} label="Quizzes" isActive={isActive("/Medrae-quizzes")} onPress={(e) => handleNavigate(e, "/Medrae-quizzes")} isDark={theme === 'dark'} />
                        <NavItem icon={IconFeed} label="Feed" isActive={isActive("/feed")} onPress={(e) => handleNavigate(e, "/feed")} isDark={theme === 'dark'} />
                    </>
                )}

                {isTutor && (
                    <>
                        <NavItem icon={IconTutorExams} label="Tutor Exams" isActive={isActive("/tutor/exams")} onPress={(e) => handleNavigate(e, "/tutor/exams")} isDark={theme === 'dark'} />
                        <NavItem icon={IconAnalytics} label="Analytics" isActive={isActive("/analytics")} onPress={(e) => handleNavigate(e, "/analytics")} isDark={theme === 'dark'} />
                    </>
                )}

                {isTutor && (
                    <NavItem icon={IconExamResults} label="Exam Results" isActive={isActive("/tutor/exams/:paper_id/results")} onPress={(e) => handleNavigate(e, "/tutor/exams/:paper_id/results")} isDark={theme === 'dark'} />
                )}

                {isStudent && (
                    <NavItem
                        icon={IconMistakes}
                        label="Mistakes"
                        isActive={isActive("/my-mistakes")}
                        onPress={(e) => handleNavigate(e, "/my-mistakes")}
                        isDark={theme === 'dark'}
                        badge={mistakeCount > 0 ? mistakeCount : undefined}
                    />
                )}

                {isStaff && (
                    <>
                        <NavItem icon={IconCpd} label="CPD" isActive={isActive("/cpd")} onPress={(e) => handleNavigate(e, "/cpd")} isDark={theme === 'dark'} />
                        <NavItem icon={IconCatalog} label="Catalog" isActive={isActive("/cpd/catalog")} onPress={(e) => handleNavigate(e, "/cpd/catalog")} isDark={theme === 'dark'} />
                        <NavItem icon={IconProgress} label="Progress" isActive={isActive("/cpd/progress")} onPress={(e) => handleNavigate(e, "/cpd/progress")} isDark={theme === 'dark'} />
                    </>
                )}

                {/* ✅ Listen — visible for every role */}
                <NavItem
                    icon={IconHeadphones}
                    label="Listen"
                    isActive={false}
                    onPress={handleOpenPodcasts}
                    isDark={theme === 'dark'}
                />

                {/* ✅ Menu — one only */}
                <NavItem
                    icon={IconMenu}
                    label="Menu"
                    isActive={isDrawerOpen}
                    onPress={handleMenuPress}
                    isDark={theme === 'dark'}
                />
            </div>

            <Suspense fallback={null}>
                <MobileDrawer userRole={role} isOpen={isDrawerOpen} setIsOpen={setIsDrawerOpen} />
            </Suspense>

            <div className="md:hidden pointer-events-none" style={{ height: `${footerHeight + 8}px` }} />
        </>
    );
}