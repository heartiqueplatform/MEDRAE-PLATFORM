"use client";

import { useEffect, useState, useRef, useCallback, memo, Suspense, lazy } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";
import { useUserRole } from "@/context/UserRoleContext";
import { useSmartNavigate } from "@/navigation/useSmartNavigate";
const MobileDrawer = lazy(() => import("@/components/MobileDrawer").then(module => ({ default: module.MobileDrawer })));

const MISTAKE_COUNT_CACHE_KEY = "footer_mistake_count";
const NELDES_HINT_SEEN_KEY = "neldes_hint_seen_v1";
const NELDES_HINT_SIGNUP_KEY = "neldes_hint_signup_ts";
const HINT_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

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

const IconHome = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.5 11.2L11.72 3.4a1.9 1.9 0 0 1 2.56 0L22.5 11.2v9.3a1.5 1.5 0 0 1-1.5 1.5h-4.2a1 1 0 0 1-1-1v-3.6a3.3 3.3 0 0 0-6.6 0V21a1 1 0 0 1-1 1H5a1.5 1.5 0 0 1-1.5-1.5v-9.3Z" stroke="currentColor" strokeWidth={SW(active)} strokeLinecap="round" strokeLinejoin="round" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
    </svg>
);

const IconFeed = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3.75" y="4.25" width="15.5" height="17.5" rx="2" stroke="currentColor" strokeWidth={SW(active)} strokeLinejoin="round" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
        <path d="M19.25 8.5h1.5A2.25 2.25 0 0 1 23 10.75v10.5a2.25 2.25 0 0 1-2.25 2.25" stroke="currentColor" strokeWidth={SW(active)} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M7.5 9.25h8" stroke={active ? ACTIVE_DETAIL : "currentColor"} strokeWidth={active ? 1.8 : SW(false)} strokeLinecap="round" />
        <path d="M7.5 13h8" stroke={active ? ACTIVE_DETAIL : "currentColor"} strokeWidth={active ? 1.8 : SW(false)} strokeLinecap="round" />
        <path d="M7.5 16.75h5" stroke={active ? ACTIVE_DETAIL : "currentColor"} strokeWidth={active ? 1.8 : SW(false)} strokeLinecap="round" />
    </svg>
);

const IconQuizzes = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 4.9 A2.1 2.1 0 0 1 18.72 6.12 A2.1 2.1 0 0 1 21.88 10.28 A2.1 2.1 0 0 1 21.1 16.72 A2.1 2.1 0 0 1 16.88 19.88 A2.1 2.1 0 0 1 9.12 19.88 A2.1 2.1 0 0 1 4.9 16.72 A2.1 2.1 0 0 1 4.12 10.28 A2.1 2.1 0 0 1 7.28 6.12 A2.1 2.1 0 0 1 13 4.9 Z" stroke="currentColor" strokeWidth={SW(active)} strokeLinejoin="round" strokeLinecap="round" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
        <path d="m9.5 13 2.5 2.5 4.75-5" stroke={active ? ACTIVE_DETAIL : "currentColor"} strokeWidth={active ? 2.2 : 2.0} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
);

const IconHeadphones = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 15.5v-2.5a8 8 0 0 1 16 0v2.5" stroke="currentColor" strokeWidth={SW(active)} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="3.5" y="14" width="5" height="7.5" rx="2" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
        <rect x="17.5" y="14" width="5" height="7.5" rx="2" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
    </svg>
);

const IconNeldes = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="3.5" width="14" height="19" rx="3" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
        <path d="M11.5 9.75v6.5l5-3.25z" fill="currentColor" />
    </svg>
);

/* ============================================================
   NAV ITEM — standard
   ============================================================ */
const NavItem = memo(({ icon: Icon, label, isActive, onPress, isDark, badge, onLongPress }: {
    icon: (props: { active: boolean }) => JSX.Element;
    label: string;
    isActive: boolean;
    onPress: (e: React.PointerEvent) => void;
    isDark: boolean;
    badge?: number;
    onLongPress?: () => void;
}) => {
    const [pressed, setPressed] = useState(false);
    const [pending, setPending] = useState(false);
    const showActive = isActive || pending;
    const activeColor = isDark ? "#60a5fa" : "#2563eb";
    const inactiveColor = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
    const iconColorStyle = isActive ? { color: activeColor } : { color: inactiveColor };
    const labelColor = isActive
        ? (isDark ? "text-blue-400" : "text-blue-600")
        : (isDark ? "text-white/55" : "text-black/55");

    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const longPressFired = useRef(false);

    const handlePointerDown = (e: React.PointerEvent) => {
        setPressed(true);
        longPressFired.current = false;
        if (onLongPress) {
            longPressTimer.current = setTimeout(() => {
                longPressFired.current = true;
                onLongPress();
                superFastTap("warning");
            }, 500);
        }
        setPending(true);
        onPress(e);
        setTimeout(() => setPending(false), 500);
    };
    const clear = () => {
        setPressed(false);
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

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
            <div className="relative flex items-center justify-center w-[26px] h-[26px] z-10">
                <span className="transition-colors duration-200" style={iconColorStyle}>
                    <Icon active={showActive} />
                </span>
                {badge !== undefined && badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 text-[9.5px] font-bold flex items-center justify-center bg-red-500 text-white rounded-full leading-none ring-2 ring-background">
                        {badge > 99 ? "99+" : badge}
                    </span>
                )}
            </div>
            <span className={`leading-none mt-1.5 transition-all duration-200 z-10 tracking-tight text-[9.5px] xs:text-[10.5px] ${isActive ? "font-bold" : "font-medium"} ${labelColor}`}>
                {label}
            </span>
        </button>
    );
});
NavItem.displayName = "NavItem";

/* ============================================================
   PRIMARY NAV ITEM — elevated center tile (Neldes)
   ============================================================ */
const PrimaryNavItem = memo(({
    icon: Icon, label, isActive, onPress, isDark, hintVisible, onLongPress,
}: {
    icon: (props: { active: boolean }) => JSX.Element;
    label: string;
    isActive: boolean;
    onPress: (e: React.PointerEvent) => void;
    isDark: boolean;
    hintVisible?: boolean;
    onLongPress?: () => void;
}) => {
    const [pressed, setPressed] = useState(false);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    const handlePointerDown = (e: React.PointerEvent) => {
        setPressed(true);
        if (onLongPress) {
            longPressTimer.current = setTimeout(() => {
                onLongPress();
                superFastTap("warning");
            }, 500);
        }
        onPress(e);
    };
    const clear = () => {
        setPressed(false);
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const labelColor = isActive
        ? (isDark ? "text-blue-400" : "text-blue-600")
        : (isDark ? "text-white/70" : "text-black/70");

    return (
        <button
            onPointerDown={handlePointerDown}
            onPointerUp={clear}
            onPointerLeave={clear}
            onPointerCancel={clear}
            className="flex flex-col items-center justify-center h-full relative select-none px-2"
            style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                transition: "transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                transform: pressed ? "scale(0.92)" : "scale(1)",
            }}
            aria-label={label}
        >
            {/* HINT — pulsing tooltip above the tile for the first 3 days */}
            {hintVisible && (
                <div
                    className="absolute pointer-events-none"
                    style={{
                        bottom: "calc(100% + 6px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        animation: "neldesHintPulse 1.6s ease-in-out infinite",
                    }}
                >
                    <div
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                        style={{
                            backgroundColor: "#3b82f6",
                            color: "#ffffff",
                            boxShadow: "0 4px 14px rgba(59,130,246,0.5)",
                        }}
                    >
                        Try  Medspite ⬆
                    </div>
                    <div
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{
                            bottom: "-4px",
                            width: 0,
                            height: 0,
                            borderLeft: "5px solid transparent",
                            borderRight: "5px solid transparent",
                            borderTop: "5px solid #3b82f6",
                        }}
                    />
                </div>
            )}

            <div
                className="-mt-4 w-[46px] h-[46px] rounded-2xl flex items-center justify-center"
                style={{
                    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                    boxShadow: "0 6px 18px rgba(59,130,246,0.45)",
                    transition: "transform 160ms",
                    transform: pressed ? "translateY(1px)" : "translateY(0)",
                }}
            >
                <span className="text-white">
                    <Icon active={isActive} />
                </span>
            </div>
            <span className={`leading-none mt-1 transition-all duration-200 tracking-tight text-[9.5px] xs:text-[10.5px] ${isActive ? "font-bold" : "font-semibold"} ${labelColor}`}>
                {label}
            </span>

            <style>{`
                @keyframes neldesHintPulse {
                    0%, 100% { transform: translateX(-50%) translateY(0); opacity: 1; }
                    50% { transform: translateX(-50%) translateY(-3px); opacity: 0.85; }
                }
            `}</style>
        </button>
    );
});
PrimaryNavItem.displayName = "PrimaryNavItem";

/* ============================================================
   FOOTER
   ============================================================ */
export function Footer() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { role } = useUserRole();

    const isStudent = role === "student";

    const [mistakeCount, setMistakeCount] = useState<number>(0);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerReady, setDrawerReady] = useState(false);
    const [safeAreaBottom, setSafeAreaBottom] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [chatOpen, setChatOpen] = useState(false);
    const [showNeldesHint, setShowNeldesHint] = useState(false);
    const scrollContainerRef = useRef<Element | null>(null);

    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        try {
            if (document.documentElement.classList.contains('dark')) return 'dark';
            if (document.documentElement.classList.contains('light')) return 'light';
            const darkMode = localStorage.getItem('medrae_dark_mode');
            if (darkMode !== null) return darkMode === 'true' ? 'dark' : 'light';
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
            return 'light';
        } catch { return 'light'; }
    });

    const isMounted = useRef(true);
    const prefetchDone = useRef(false);
    const lastScrollY = useRef(0);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);


    /* ── 3-day hint decision ───────────────────────────────────── */
    useEffect(() => {
        if (!user?.id) return;
        try {
            // If user has already dismissed the hint — never show again
            if (localStorage.getItem(NELDES_HINT_SEEN_KEY) === "true") {
                setShowNeldesHint(false);
                return;
            }
            // Record signup timestamp on first sight
            let signupTs = Number(localStorage.getItem(NELDES_HINT_SIGNUP_KEY) || 0);
            if (!signupTs) {
                // Use account created_at if available, else now
                const created = (user as any).created_at
                    ? new Date((user as any).created_at).getTime()
                    : Date.now();
                signupTs = created;
                localStorage.setItem(NELDES_HINT_SIGNUP_KEY, String(signupTs));
            }
            const age = Date.now() - signupTs;
            setShowNeldesHint(age < HINT_DURATION_MS);
        } catch {
            setShowNeldesHint(false);
        }
    }, [user?.id]);

    const dismissHint = useCallback(() => {
        try { localStorage.setItem(NELDES_HINT_SEEN_KEY, "true"); } catch { }
        setShowNeldesHint(false);
    }, []);

    const revealHint = useCallback(() => {
        try { localStorage.removeItem(NELDES_HINT_SEEN_KEY); } catch { }
        setShowNeldesHint(true);
        setTimeout(() => setShowNeldesHint(false), 5000);
    }, []);

    /* ── Mistake count ─────────────────────────────────────────── */
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

    /* ── Theme listener ────────────────────────────────────────── */
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

    const smartNav = useSmartNavigate();

    const handleNavigate = useCallback((e: React.PointerEvent, url: string) => {
        e.preventDefault();
        smartNav(e, url);
        superFastTap("light");
    }, [smartNav]);

    /* ── Drawer open (tap chevron, swipe-up, or hint) ─────────── */
    const openDrawer = useCallback(() => {
        superFastTap("success");
        dismissHint();
        if (!drawerReady) {
            import("@/components/MobileDrawer")
                .then(() => setDrawerReady(true))
                .finally(() => {
                    requestAnimationFrame(() => setIsDrawerOpen(true));
                });
            return;
        }
        requestAnimationFrame(() => setIsDrawerOpen(true));
    }, [drawerReady, dismissHint]);

    useEffect(() => {
        if (prefetchDone.current) return;
        const prefetch = () => {
            import("@/components/MobileDrawer").then(() => setDrawerReady(true)).catch(() => { });
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
        return () => window.removeEventListener("chat-overlay-visibility", onChatVisibility);
    }, []);

    /* ── PULL-UP GESTURE (hold-to-arm, then swipe) ──────────────── */
    const [pullOffset, setPullOffset] = useState(0);
    const pullOffsetRef = useRef(0);                       // ← mirror for stable reads
    const holdTimer = useRef<NodeJS.Timeout | null>(null);
    const armedRef = useRef(false);
    const gestureStartY = useRef<number | null>(null);
    const gestureActive = useRef(false);

    useEffect(() => {
        pullOffsetRef.current = pullOffset;
    }, [pullOffset]);

    useEffect(() => {
        const HOLD_MS = 180;
        const ARM_DISTANCE = 8;
        const TRIGGER_DISTANCE = 80;
        const MAX_PEEK = 120;

        const clearHold = () => {
            if (holdTimer.current) {
                clearTimeout(holdTimer.current);
                holdTimer.current = null;
            }
        };

        const onTouchStart = (e: TouchEvent) => {
            if (window.innerWidth >= 768) return;
            const touch = e.touches[0];
            const target = e.target as HTMLElement | null;
            const onFooter = !!target?.closest?.('[data-footer-bar]');
            const fromBottom = window.innerHeight - touch.clientY;
            if (!onFooter && fromBottom > 140) return;

            gestureStartY.current = touch.clientY;
            gestureActive.current = true;
            armedRef.current = false;
            setPullOffset(0);
            pullOffsetRef.current = 0;

            clearHold();
            holdTimer.current = setTimeout(() => {
                armedRef.current = true;
                superFastTap("warning");
            }, HOLD_MS);
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!gestureActive.current || gestureStartY.current === null) return;
            const touch = e.touches[0];
            const dy = gestureStartY.current - touch.clientY;

            if (!armedRef.current) {
                if (Math.abs(dy) > ARM_DISTANCE) clearHold();
                return;
            }

            if (dy > 0) {
                if (e.cancelable) e.preventDefault();
                const clamped = Math.min(dy, MAX_PEEK);
                setPullOffset(clamped / TRIGGER_DISTANCE);
            }
        };

        const onTouchEnd = () => {
            clearHold();
            const wasArmed = armedRef.current;
            const progress = pullOffsetRef.current;          // ← read from ref
            gestureActive.current = false;
            armedRef.current = false;
            gestureStartY.current = null;
            setPullOffset(0);
            pullOffsetRef.current = 0;

            if (wasArmed && progress >= 1) {
                openDrawer();
            }
        };

        document.addEventListener("touchstart", onTouchStart, { passive: true });
        document.addEventListener("touchmove", onTouchMove, { passive: false });
        document.addEventListener("touchend", onTouchEnd, { passive: true });
        document.addEventListener("touchcancel", onTouchEnd, { passive: true });

        return () => {
            clearHold();
            document.removeEventListener("touchstart", onTouchStart);
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
            document.removeEventListener("touchcancel", onTouchEnd);
        };
    }, [openDrawer]);                                    // ← ONLY openDrawer
    /* ── Hide/show on scroll ───────────────────────────────────── */
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
            if (next) attach(next);
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

    return (
        <>
            {!chatOpen && (
                <>
                    {/* PULL-UP CHEVRON — above the tab bar */}
                    <button
                        onClick={openDrawer}
                        aria-label="Open menu"
                        className={`fixed left-1/2 -translate-x-1/2 z-[101] md:hidden
    flex items-center justify-center w-12 h-6
    transition-all duration-300 ease-out
    ${isVisible ? 'translate-y-0 opacity-100 animate-pulse' : 'translate-y-full opacity-0'}`}
                        style={{ bottom: `${footerHeight + 8}px`, touchAction: "manipulation" }}
                    >
                        <svg
                            width="20"
                            height="10"
                            viewBox="0 0 20 10"
                            fill="none"
                            style={{
                                filter: theme === 'dark'
                                    ? 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))'
                                    : 'drop-shadow(0 1px 2px rgba(255,255,255,0.9))',
                            }}
                        >
                            <path
                                d="M2 8L10 2L18 8"
                                stroke={theme === 'dark' ? '#ffffff' : '#000000'}
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                    {/* 3D PEEK — visible while the user drags up after arming */}
                    {pullOffset > 0 && (
                        <div
                            className="fixed left-1/2 -translate-x-1/2 z-[99] md:hidden pointer-events-none"
                            style={{
                                bottom: `${footerHeight + 8}px`,
                                width: "calc(100% - 32px)",
                                height: 160,
                                borderRadius: 24,
                                background:
                                    theme === "dark"
                                        ? "linear-gradient(180deg, #1f2937, #111827)"
                                        : "linear-gradient(180deg, #ffffff, #f3f4f6)",
                                boxShadow: "0 -8px 30px rgba(0,0,0,0.25)",
                                transform: `translateY(${(1 - Math.min(pullOffset, 1)) * 60}px)
                        scale(${0.85 + Math.min(pullOffset, 1) * 0.15})
                        rotateX(${(1 - Math.min(pullOffset, 1)) * -18}deg)`,
                                transformOrigin: "bottom center",
                                opacity: Math.min(pullOffset, 1) * 0.95,
                                transition: pullOffset === 0 ? "all 0.25s cubic-bezier(0.34,1.56,0.64,1)" : "none",
                                perspective: 800,
                            }}
                        />
                    )}
                    {/* TAB BAR */}
                    <div
                        data-footer-bar
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
                        {/* Slot 1 — Home */}
                        <NavItem
                            icon={IconHome}
                            label="Home"
                            isActive={isActive(`/dashboard/${role}`)}
                            onPress={(e) => handleNavigate(e, `/dashboard/${role}`)}
                            isDark={theme === 'dark'}
                        />

                        {/* Slot 2 — Feed */}
                        <NavItem
                            icon={IconFeed}
                            label="Feed"
                            isActive={isActive("/feed")}
                            onPress={(e) => handleNavigate(e, "/feed")}
                            isDark={theme === 'dark'}
                        />

                        {/* Slot 3 — NELDES (center, elevated, primary) */}
                        <PrimaryNavItem
                            icon={IconNeldes}
                            label=" Medspite"
                            isActive={isActive("/neldes")}
                            onPress={(e) => handleNavigate(e, "/neldes")}
                            isDark={theme === 'dark'}
                            hintVisible={showNeldesHint}
                            onLongPress={revealHint}
                        />

                        {/* Slot 4 — Quizzes (with mistake badge) */}
                        <NavItem
                            icon={IconQuizzes}
                            label="Quizzes"
                            isActive={isActive("/Medrae-quizzes")}
                            onPress={(e) => handleNavigate(e, "/Medrae-quizzes")}
                            isDark={theme === 'dark'}
                            badge={isStudent && mistakeCount > 0 ? mistakeCount : undefined}
                        />

                        {/* Slot 5 — Listen */}
                        <NavItem
                            icon={IconHeadphones}
                            label="Listen"
                            isActive={isActive("/listen")}
                            onPress={(e) => handleNavigate(e, "/listen")}
                            isDark={theme === 'dark'}
                        />
                    </div>
                </>
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