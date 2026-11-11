"use client";

import { useEffect, useState, useRef, useCallback, memo, Suspense, lazy } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";
import { useUserRole } from "@/context/UserRoleContext";
import { useSmartNavigate } from "@/navigation/useSmartNavigate";
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
   ICONS
   ============================================================ */

const SW = (active: boolean) => (active ? 2.5 : 1.8);

const ACTIVE_DETAIL = "rgba(147,197,253,0.9)";

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
            fillOpacity={active ? 0.22 : 0}
        />
    </svg>
);

// ── QUIZZES — VERIFIED BADGE (shield + tick) ───────────────
// ── QUIZZES — META-STYLE VERIFIED CHECK ────────────────────
// ── QUIZZES — META-STYLE VERIFIED CHECK ────────────────────
// Mathematically rigid scalloped badge: 8 evenly-spaced arcs.
// Built on a 26×26 viewBox centered at (13, 13).
// Inner radius = 6, scallop bump radius = 2.1, outer tip = 8.1.
// Every point is ABSOLUTE and symmetric — no drift.
const IconQuizzes = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Scalloped 8-point badge — rigid geometry */}
        <path
            d="
                M13 4.9
                A2.1 2.1 0 0 1 18.72 6.12
                A2.1 2.1 0 0 1 21.88 10.28
                A2.1 2.1 0 0 1 21.1 16.72
                A2.1 2.1 0 0 1 16.88 19.88
                A2.1 2.1 0 0 1 9.12 19.88
                A2.1 2.1 0 0 1 4.9 16.72
                A2.1 2.1 0 0 1 4.12 10.28
                A2.1 2.1 0 0 1 7.28 6.12
                A2.1 2.1 0 0 1 13 4.9
                Z
            "
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill={active ? "currentColor" : "none"}
            fillOpacity={active ? 0.22 : 0}
        />
        {/* Checkmark tick — centered */}
        <path
            d="m9.5 13 2.5 2.5 4.75-5"
            stroke={active ? ACTIVE_DETAIL : "currentColor"}
            strokeWidth={active ? 2.2 : 2.0}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
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
            fillOpacity={active ? 0.22 : 0}
        />
        <path
            d="M19.25 8.5h1.5A2.25 2.25 0 0 1 23 10.75v10.5a2.25 2.25 0 0 1-2.25 2.25"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
        <path d="M7.5 9.25h8" stroke={active ? ACTIVE_DETAIL : "currentColor"} strokeWidth={active ? 1.8 : SW(false)} strokeLinecap="round" />
        <path d="M7.5 13h8" stroke={active ? ACTIVE_DETAIL : "currentColor"} strokeWidth={active ? 1.8 : SW(false)} strokeLinecap="round" />
        <path d="M7.5 16.75h5" stroke={active ? ACTIVE_DETAIL : "currentColor"} strokeWidth={active ? 1.8 : SW(false)} strokeLinecap="round" />
    </svg>
);

// ── MISTAKES ────────────────────────────────────────────────
const IconMistakes = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M13 21.5S4.2 16.1 4.2 10.3a4.9 4.9 0 0 1 8.8-3.05"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
            fillOpacity={active ? 0.22 : 0}
        />
        <path
            d="M13 21.5s8.8-5.4 8.8-11.2a4.9 4.9 0 0 0-8.8-3.05"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
            fillOpacity={active ? 0.22 : 0}
            transform="translate(1.2 0)"
        />
        <path
            d="m11.2 6.8 1.8 2.6-1.4 2.2 1.4 2.4-1.4 2.3 1.4 2.4"
            stroke={active ? ACTIVE_DETAIL : "currentColor"}
            strokeWidth={active ? 1.7 : 1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(0.7 0)"
        />
    </svg>
);

// ── CPD ─────────────────────────────────────────────────────
const IconCpd = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle
            cx="13"
            cy="10"
            r="5.75"
            stroke="currentColor"
            strokeWidth={SW(active)}
            fill={active ? "currentColor" : "none"}
            fillOpacity={active ? 0.22 : 0}
        />
        <path
            d="M8.75 14.75 8 22.25l5-2.75 5 2.75-.75-7.5"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
            fillOpacity={active ? 0.22 : 0}
        />
    </svg>
);

// ── CATALOG ─────────────────────────────────────────────────
const IconCatalog = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M4.25 5.5A2.25 2.25 0 0 1 6.5 3.25H19A2.25 2.25 0 0 1 21.25 5.5v15A2.25 2.25 0 0 1 19 22.75H6.5A2.25 2.25 0 0 1 4.25 20.5V5.5Z"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
            fillOpacity={active ? 0.22 : 0}
        />
        <path d="M8.5 3.25v19.5" stroke={active ? ACTIVE_DETAIL : "currentColor"} strokeWidth={active ? 1.7 : SW(false)} strokeLinecap="round" />
        <path d="M12 9.5h5.5" stroke={active ? ACTIVE_DETAIL : "currentColor"} strokeWidth={active ? 1.7 : SW(false)} strokeLinecap="round" />
        <path d="M12 13h5.5" stroke={active ? ACTIVE_DETAIL : "currentColor"} strokeWidth={active ? 1.7 : SW(false)} strokeLinecap="round" />
    </svg>
);

// ── PROGRESS ────────────────────────────────────────────────
const IconProgress = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.25 21.75h17.5" stroke="currentColor" strokeWidth={SW(active)} strokeLinecap="round" />
        <rect x="6.5" y="13" width="3.5" height="7" rx="1.25" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
        <rect x="11.25" y="9" width="3.5" height="11" rx="1.25" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
        <rect x="16" y="5" width="3.5" height="15" rx="1.25" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
    </svg>
);

// ── MENU ────────────────────────────────────────────────────
const IconMenu = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.5 7.5h17" stroke="currentColor" strokeWidth={active ? 2.6 : 2.2} strokeLinecap="round" />
        <path d="M4.5 13h17" stroke="currentColor" strokeWidth={active ? 2.6 : 2.2} strokeLinecap="round" />
        <path d="M4.5 18.5h17" stroke="currentColor" strokeWidth={active ? 2.6 : 2.2} strokeLinecap="round" />
    </svg>
);

// ── HEADPHONES ──────────────────────────────────────────────
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
            fillOpacity={active ? 0.22 : 0}
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
            fillOpacity={active ? 0.22 : 0}
        />
    </svg>
);

// ── TUTOR EXAMS ─────────────────────────────────────────────
const IconTutorExams = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M9 4.25H7.5A2.25 2.25 0 0 0 5.25 6.5v14A2.25 2.25 0 0 0 7.5 22.75h11A2.25 2.25 0 0 0 20.75 20.5v-14A2.25 2.25 0 0 0 18.5 4.25H17"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
            fillOpacity={active ? 0.22 : 0}
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
            fillOpacity={active ? 0.22 : 0}
        />
        <path d="m10 14.5 2.25 2.25L16.5 12.5" stroke={active ? ACTIVE_DETAIL : "currentColor"} strokeWidth={active ? 1.8 : SW(false)} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// ── EXAM RESULTS ────────────────────────────────────────────
const IconExamResults = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M6.5 3.25H15L21 9.25v12a1.5 1.5 0 0 1-1.5 1.5h-13a1.5 1.5 0 0 1-1.5-1.5v-16A1.5 1.5 0 0 1 6.5 3.25Z"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
            fillOpacity={active ? 0.22 : 0}
        />
        <path
            d="M15 3.25v6h6"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path d="m9.5 14.5 2.25 2.25L16 12.5" stroke={active ? ACTIVE_DETAIL : "currentColor"} strokeWidth={active ? 1.8 : SW(false)} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 19.5h7" stroke={active ? ACTIVE_DETAIL : "currentColor"} strokeWidth={active ? 1.8 : SW(false)} strokeLinecap="round" />
    </svg>
);

// ── ANALYTICS ───────────────────────────────────────────────
const IconAnalytics = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="5.25" y="12" width="4" height="7.5" rx="1.25" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
        <rect x="11" y="7.5" width="4" height="12" rx="1.25" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
        <rect x="16.75" y="4.25" width="4" height="15.25" rx="1.25" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
    </svg>
);

/* ============================================================
   NAV ITEM
   • Active = vivid blue + BOLD label + solid-ish pill
   • Inactive = muted grey + medium label
   • Icon stroke weight jumps 1.8 → 2.5
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

    const showActive = isActive || pending;

    // Active = vivid blue
    // Active = vivid blue. Inactive = PURE BLACK (light mode) / PURE WHITE (dark mode).
    const activeColor = isDark ? "#60a5fa" : "#2563eb"; // blue-400 / blue-600
    const inactiveColor = isDark ? "#ffffff" : "#000000";
    const iconColorStyle = showActive
        ? { color: activeColor }
        : { color: inactiveColor };

    // BOLD on active, medium on inactive — clear weight jump
    // Active label = bold blue. Inactive label = pure black (light) / pure white (dark).
    const labelColor = showActive
        ? (isDark ? "text-blue-400" : "text-blue-600")
        : (isDark ? "text-white" : "text-black");
    const handlePointerDown = (e: React.PointerEvent) => {
        setPressed(true);
        setPending(true);
        onPress(e);
        setTimeout(() => setPending(false), 500);
    };
    const clear = () => setPressed(false);

    // Visible active tile — this is the WhatsApp-style "pill"
    const activeTileBg = isDark
        ? "rgba(96,165,250,0.22)"
        : "rgba(37,99,235,0.16)";

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
            {/* Press ripple */}
            <div
                className="absolute top-0.5 left-1/2 -translate-x-1/2 w-11 h-11 rounded-2xl pointer-events-none"
                style={{
                    background: isDark
                        ? "radial-gradient(circle, rgba(96,165,250,0.35) 0%, rgba(59,130,246,0.12) 50%, transparent 78%)"
                        : "radial-gradient(circle, rgba(59,130,246,0.24) 0%, rgba(59,130,246,0.08) 50%, transparent 78%)",
                    opacity: pressed ? 1 : 0,
                    transition: "opacity 220ms ease-out",
                }}
            />

            {/* Active tile — solid-looking pill */}
            <div
                className="absolute top-0.5 left-1/2 -translate-x-1/2 w-11 h-11 rounded-2xl pointer-events-none"
                style={{
                    background: activeTileBg,
                    opacity: isActive ? 1 : 0,
                    transform: `translateX(-50%) scale(${isActive ? 1 : 0.82})`,
                    transition: "opacity 260ms ease-out, transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
            />

            {/* Icon */}
            <div className="relative flex items-center justify-center w-[26px] h-[26px] z-10">
                <span
                    className="transition-colors duration-200"
                    style={iconColorStyle}
                >
                    <Icon active={isActive} />
                </span>

                {badge !== undefined && badge > 0 && (
                    <span
                        className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1
                            text-[9.5px] font-bold flex items-center justify-center
                            bg-red-500 text-white rounded-full leading-none
                            ring-2 ring-background"
                    >
                        {badge > 99 ? "99+" : badge}
                    </span>
                )}
            </div>

            {/* Label — BOLD when active */}
            <span
                className={`leading-none mt-1.5 transition-all duration-200 z-10 tracking-tight text-[9.5px] xs:text-[10.5px] ${isActive ? "font-bold" : "font-medium"
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
    const [drawerReady, setDrawerReady] = useState(false);
    const [safeAreaBottom, setSafeAreaBottom] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [chatOpen, setChatOpen] = useState(false);
    const scrollContainerRef = useRef<Element | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        try {
            if (document.documentElement.classList.contains('dark')) return 'dark';
            if (document.documentElement.classList.contains('light')) return 'light';
            const darkMode = localStorage.getItem('medrae_dark_mode');
            if (darkMode !== null) return darkMode === 'true' ? 'dark' : 'light';
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

    useEffect(() => {
        const html = document.documentElement;
        let rafId: number | null = null;
        const observer = new MutationObserver(() => {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
                rafId = null;
                const next = findScrollContainer();
                if (next) attach(next);
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);
    useEffect(() => {
        const el = document.querySelector('[data-scroll-container]') ||
            Array.from(document.querySelectorAll('.overflow-auto, .overflow-y-auto'))
                .find(n => n.scrollHeight > n.clientHeight + 10);
        if (el) { /* attach(el) */ }
    }, [location.pathname]);
    const smartNav = useSmartNavigate();

    const handleNavigate = useCallback((e: React.PointerEvent, url: string) => {
        e.preventDefault();
        smartNav(e, url);
        superFastTap("light");
    }, [smartNav]);
    const handleMenuPress = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        superFastTap("success");

        if (!drawerReady) {
            import("@/components/MobileDrawer")
                .then(() => setDrawerReady(true))
                .finally(() => {
                    requestAnimationFrame(() => setIsDrawerOpen(true));
                });
            return;
        }

        requestAnimationFrame(() => {
            setIsDrawerOpen(true);
        });
    }, [drawerReady]);

    const handleOpenPodcasts = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        superFastTap("success");

        let attempts = 0;
        const MAX_ATTEMPTS = 15;

        const tryOpen = () => {
            const opener = (window as any).__studifyOpen;
            if (typeof opener === "function") {
                opener("episodes");
                return;
            }
            attempts++;
            if (attempts < MAX_ATTEMPTS) {
                setTimeout(tryOpen, 100);
            }
        };

        tryOpen();
    }, []);

    useEffect(() => {
        if (prefetchDone.current) return;

        const prefetch = () => {
            import("@/components/MobileDrawer")
                .then(() => setDrawerReady(true))
                .catch(() => { });
            prefetchDone.current = true;
        };

        const t = setTimeout(prefetch, 200);
        return () => clearTimeout(t);
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
        const onChatVisibility = (e: Event) => {
            const detail = (e as CustomEvent<{ open: boolean }>).detail;
            setChatOpen(!!detail?.open);
        };
        window.addEventListener("chat-overlay-visibility", onChatVisibility);
        return () => {
            window.removeEventListener("chat-overlay-visibility", onChatVisibility);
        };
    }, []);
    useEffect(() => {
        let container: Element | null = null;
        let detach: (() => void) | null = null;

        const findScrollContainer = () => {
            const el = document.querySelector('[data-scroll-container]');
            if (el) return el;
            const containers = document.querySelectorAll('.overflow-auto, .overflow-y-auto');
            for (const el of containers) {
                if (el.scrollHeight > el.clientHeight + 10) return el;
            }
            return null;
        };

        const attach = (next: Element | null) => {
            if (next === container) return;
            if (detach) { detach(); detach = null; }
            container = next;
            scrollContainerRef.current = container;

            if (!container) return;

            const handleScroll = () => {
                if (window.innerWidth >= 768) return;
                const y = container.scrollTop;

                if (scrollTimeout.current) {
                    clearTimeout(scrollTimeout.current);
                    scrollTimeout.current = null;
                }

                if (y > lastScrollY.current && y > 50) setIsVisible(false);
                else if (y < lastScrollY.current) setIsVisible(true);
                if (y <= 10) setIsVisible(true);

                lastScrollY.current = y;

                scrollTimeout.current = setTimeout(() => {
                    setIsVisible(true);
                    scrollTimeout.current = null;
                }, 1500);
            };

            container.addEventListener('scroll', handleScroll, { passive: true });
            detach = () => container.removeEventListener('scroll', handleScroll);
        };

        attach(findScrollContainer());

        const observer = new MutationObserver(() => {
            const next = findScrollContainer();
            if (next) {
                attach(next);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            if (detach) detach();
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        };
    }, []);

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
    const isOnMenuRoute = location.pathname === "/menu";

    return (
        <>
            {!chatOpen && !isOnMenuRoute && (
                <div
                    className={`fixed bottom-0 left-0 right-0 z-[100] md:hidden
                    transition-all duration-300 ease-out
                    ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
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
                    <NavItem icon={IconHome} label="Home" isActive={isActive(`/dashboard/${role}`)} onPress={(e) => handleNavigate(e, `/dashboard/${role}`)} isDark={theme === 'dark'} />

                    {isStudent && (
                        <NavItem icon={IconFeed} label="Feed" isActive={isActive("/feed")} onPress={(e) => handleNavigate(e, "/feed")} isDark={theme === 'dark'} />
                    )}
                    {isTutor && (
                        <NavItem icon={IconTutorExams} label="Tutor Exams" isActive={isActive("/tutor/exams")} onPress={(e) => handleNavigate(e, "/tutor/exams")} isDark={theme === 'dark'} />
                    )}
                    {isStaff && (
                        <NavItem icon={IconCpd} label="CPD" isActive={isActive("/cpd")} onPress={(e) => handleNavigate(e, "/cpd")} isDark={theme === 'dark'} />
                    )}

                    {isStudent && (
                        <NavItem icon={IconQuizzes} label="Quizzes" isActive={isActive("/Medrae-quizzes")} onPress={(e) => handleNavigate(e, "/Medrae-quizzes")} isDark={theme === 'dark'} />
                    )}
                    {isTutor && (
                        <NavItem icon={IconAnalytics} label="Analytics" isActive={isActive("/analytics")} onPress={(e) => handleNavigate(e, "/analytics")} isDark={theme === 'dark'} />
                    )}
                    {isStaff && (
                        <NavItem icon={IconCatalog} label="Catalog" isActive={isActive("/cpd/catalog")} onPress={(e) => handleNavigate(e, "/cpd/catalog")} isDark={theme === 'dark'} />
                    )}

                    <NavItem
                        icon={IconHeadphones}
                        label="Listen"
                        isActive={isActive("/listen")}
                        onPress={(e) => handleNavigate(e, "/listen")}
                        isDark={theme === 'dark'}
                    />

                    <NavItem
                        icon={IconMenu}
                        label="Menu"
                        isActive={isActive("/menu")}
                        onPress={(e) => handleNavigate(e, "/menu")}
                        isDark={theme === 'dark'}
                        badge={isStudent && mistakeCount > 0 ? mistakeCount : undefined}
                    />
                </div>
            )}


            <Suspense fallback={null}>
                {isDrawerOpen && (
                    <MobileDrawer userRole={role} isOpen={isDrawerOpen} setIsOpen={setIsDrawerOpen} />
                )}
            </Suspense>

            {!chatOpen && (
                <div className="md:hidden pointer-events-none" style={{ height: `${footerHeight + 8}px` }} />
            )}
        </>
    );
}