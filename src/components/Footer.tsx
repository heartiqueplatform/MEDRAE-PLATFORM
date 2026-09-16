"use client";

import { useEffect, useState, useRef, useCallback, useMemo, memo, Suspense, lazy, useTransition } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";
import { playSound } from "@/lib/soundManager";
import { useUserRole } from "@/context/UserRoleContext";

const MobileDrawer = lazy(() => import("@/components/MobileDrawer").then(module => ({ default: module.MobileDrawer })));

type IconTone = "neutral" | "practice" | "content" | "alert";

const MISTAKE_COUNT_CACHE_KEY = "footer_mistake_count";

const superFastTap = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        if (type === "success") {
            navigator.vibrate([30, 40, 30]);
        } else if (type === "warning") {
            navigator.vibrate(100);
        } else {
            navigator.vibrate(35);
        }
    }
};

/* ============================================================
   PROFESSIONAL SVG ICONS (Facebook / Instagram / WhatsApp style)
   Clean, uniform stroke width, 24x24 viewBox, no decorative bumps
   ============================================================ */
const IconHome = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M4 10.8L11.3 3.9C11.69 3.53 12.31 3.53 12.7 3.9L20 10.8V19.5C20 20.33 19.33 21 18.5 21H15.5C14.67 21 14 20.33 14 19.5V16C14 14.9 13.1 14 12 14C10.9 14 10 14.9 10 16V19.5C10 20.33 9.33 21 8.5 21H5.5C4.67 21 4 20.33 4 19.5V10.8Z"
            stroke="currentColor"
            strokeWidth={active ? 2.2 : 1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
            fillOpacity={active ? 0.15 : 0}
        />
    </svg>
);
const IconQuizzes = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M12 20.5C12 20.5 3.5 15.5 3.5 9.5C3.5 6.46 5.96 4 9 4C10.6 4 12 4.8 12 4.8C12 4.8 13.4 4 15 4C18.04 4 20.5 6.46 20.5 9.5C20.5 15.5 12 20.5 12 20.5Z"
            stroke="currentColor"
            strokeWidth={active ? 2.2 : 1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
            fillOpacity={active ? 0.18 : 0}
        />
    </svg>
);

const IconFeed = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect
            x="3" y="3" width="18" height="18" rx="3"
            stroke="currentColor"
            strokeWidth={active ? 2.2 : 1.8}
            fill={active ? "currentColor" : "none"}
            fillOpacity={active ? 0.15 : 0}
        />
        <line x1="7" y1="9" x2="17" y2="9" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
        <line x1="7" y1="13" x2="14" y2="13" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
        <line x1="7" y1="17" x2="11" y2="17" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
    </svg>
);

const IconMistakes = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Left half — stays upright */}
        <path
            d="M11.5 6.8
               L10 9.2 L11.5 11 L10 13 L11.5 15 L11.5 20.6
               C11.5 20.6 3.4 15.6 3.4 9.5
               C3.4 6.46 5.86 4 8.9 4
               C10 4 11 4.5 11.5 5.2"
            stroke="currentColor"
            strokeWidth={active ? 2.2 : 1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
            fillOpacity={active ? 0.18 : 0}
        />
        {/* Right half — rotated ~18° clockwise and shifted, like it's falling off */}
        <g transform="rotate(18 16 12) translate(1.2 0.6)">
            <path
                d="M12.5 5.2
                   C13 4.5 14 4 15.1 4
                   C18.14 4 20.6 6.46 20.6 9.5
                   C20.6 15.6 12.5 20.6 12.5 20.6
                   L12.5 15 L14 13 L12.5 11 L14 9.2 L12.5 6.8"
                stroke="currentColor"
                strokeWidth={active ? 2.2 : 1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={active ? "currentColor" : "none"}
                fillOpacity={active ? 0.18 : 0}
            />
        </g>
    </svg>
);

const IconMenu = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
        <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
        <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
    </svg>
);

/* ============================================================
   NAV ITEM — uniform, no bumps, Instagram-style
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

    /* ---------- Color system (WhatsApp-style contrast) ---------- */
    // Active: solid dark text on light, or solid white on dark
    // Inactive: mid-gray so it doesn't disappear, but clearly secondary
    const labelColor = isActive
        ? isDark ? "text-white" : "text-gray-900"
        : isDark ? "text-gray-400" : "text-gray-500";

    const iconColor = isActive
        ? isDark ? "text-white" : "text-blue-600"
        : isDark ? "text-gray-400" : "text-gray-500";

    /* ---------- Press handlers ---------- */
    const handlePointerDown = (e: React.PointerEvent) => {
        setPressed(true);
        onPress(e);
    };
    const handlePointerUp = () => setPressed(false);
    const handlePointerLeave = () => setPressed(false);
    const handlePointerCancel = () => setPressed(false);

    return (
        <button
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onPointerCancel={handlePointerCancel}
            className="
                flex flex-col items-center justify-center flex-1 h-full relative select-none
                transition-transform duration-150
            "
            style={{
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                transform: pressed ? 'scale(0.94)' : 'scale(1)',
            }}
        >
            {/* ---------- Blue glow behind tapped icon ---------- */}
            <div
                className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full pointer-events-none
                    transition-all duration-300 ease-out"
                style={{
                    background: 'radial-gradient(circle, rgba(59,130,246,0.45) 0%, rgba(59,130,246,0.15) 45%, transparent 75%)',
                    opacity: pressed ? 1 : 0,
                    transform: `translateX(-50%) scale(${pressed ? 1.35 : 1})`,
                }}
            />

            {/* Active underline glow (permanent, subtle) */}
            {isActive && (
                <div
                    className="absolute top-1 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full pointer-events-none
                        transition-opacity duration-300"
                    style={{
                        background: 'radial-gradient(circle, rgba(59,130,246,0.28) 0%, transparent 70%)',
                    }}
                />
            )}

            <div className="relative flex items-center justify-center w-6 h-6 z-10">
                <span className={`transition-colors duration-200 ${iconColor}`}>
                    <Icon active={isActive} />
                </span>
                {badge !== undefined && badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-[4px]
                        text-[9px] font-bold flex items-center justify-center
                        bg-red-500 text-white rounded-full leading-none
                        ring-2 ring-background">
                        {badge > 99 ? '99+' : badge}
                    </span>
                )}
            </div>
            <span className={`text-[10px] font-semibold leading-none mt-1 transition-colors duration-200 z-10 ${labelColor}`}>
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

    const [mistakeCount, setMistakeCount] = useState<number>(0);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [safeAreaBottom, setSafeAreaBottom] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const scrollContainerRef = useRef<Element | null>(null);

    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        try {
            const darkMode = localStorage.getItem('medrae_dark_mode');
            if (darkMode !== null) {
                return darkMode === 'true' ? 'dark' : 'light';
            }
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
            return 'light';
        } catch (e) {
            return 'light';
        }
    });

    const isMounted = useRef(true);
    const [isPending, startTransition] = useTransition();
    const prefetchDone = useRef(false);
    const lastScrollY = useRef(0);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const cached = localStorage.getItem(MISTAKE_COUNT_CACHE_KEY);
        if (cached) {
            try {
                const { count, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < 5 * 60 * 1000) setMistakeCount(count);
            } catch (e) { }
        }
    }, []);

    const fetchMistakeCount = useCallback(async () => {
        if (!user?.id) return;
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
        } catch (err) { }
    }, [user?.id]);

    useEffect(() => { fetchMistakeCount(); }, [fetchMistakeCount]);

    useEffect(() => {
        const syncTheme = () => {
            try {
                const darkMode = localStorage.getItem('medrae_dark_mode');
                let newTheme: 'light' | 'dark';

                if (darkMode !== null) {
                    newTheme = darkMode === 'true' ? 'dark' : 'light';
                } else {
                    newTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }

                if (newTheme !== theme) {
                    setTheme(newTheme);
                }
            } catch (e) {
            }
        };

        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'medrae_dark_mode') {
                const newTheme = e.newValue === 'true' ? 'dark' : 'light';
                setTheme(newTheme);
            }
        };

        const handleThemeChange = (e: CustomEvent) => {
            const newTheme = e.detail?.isDarkMode ? 'dark' : 'light';
            setTheme(newTheme);
        };

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemChange = () => {
            if (localStorage.getItem('medrae_dark_mode') === null) {
                const newTheme = mediaQuery.matches ? 'dark' : 'light';
                setTheme(newTheme);
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

    const handleNavigate = useCallback((e: React.PointerEvent, url: string) => {
        e.preventDefault();
        superFastTap("light");
        startTransition(() => {
            navigate(url);
        });
    }, [navigate]);

    const handleMenuPress = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        superFastTap("success");
        setIsDrawerOpen(true);
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
                if (el.scrollHeight > el.clientHeight + 10) {
                    return el;
                }
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

            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
                scrollTimeout.current = null;
            }

            if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
                setIsVisible(false);
            } else if (currentScrollY < lastScrollY.current) {
                setIsVisible(true);
            }

            if (currentScrollY <= 10) {
                setIsVisible(true);
            }

            lastScrollY.current = currentScrollY;
        };

        const handleScrollStop = () => {
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }
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

        const observer = new MutationObserver(() => {
            const currentContainer = findScrollContainer();
            if (currentContainer !== scrollContainerRef.current) {
                if (scrollContainerRef.current) {
                    const old = scrollContainerRef.current;
                    if (old === document.documentElement || old === document.body) {
                        window.removeEventListener('scroll', handleScroll);
                        window.removeEventListener('scroll', handleScrollStop);
                    } else {
                        old.removeEventListener('scroll', handleScroll);
                        old.removeEventListener('scroll', handleScrollStop);
                    }
                }

                if (currentContainer) {
                    scrollContainerRef.current = currentContainer;
                    if (currentContainer === document.documentElement || currentContainer === document.body) {
                        window.addEventListener('scroll', handleScroll, { passive: true });
                        window.addEventListener('scroll', handleScrollStop, { passive: true });
                    } else {
                        currentContainer.addEventListener('scroll', handleScroll, { passive: true });
                        currentContainer.addEventListener('scroll', handleScrollStop, { passive: true });
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        return () => {
            if (container === document.documentElement || container === document.body || !container) {
                window.removeEventListener('scroll', handleScroll);
                window.removeEventListener('scroll', handleScrollStop);
            } else {
                container.removeEventListener('scroll', handleScroll);
                container.removeEventListener('scroll', handleScrollStop);
            }
            observer.disconnect();
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }
        };
    }, [location.pathname]);

    const isActive = useCallback((url: string) => location.pathname === url, [location.pathname]);

    // Instagram/WhatsApp standard footer height: 49px content + safe area
    // We use 56px for comfortable touch targets (still standard)
    const FOOTER_CONTENT_HEIGHT = 56;
    const footerHeight = FOOTER_CONTENT_HEIGHT + safeAreaBottom;

    const footerBgClass = 'bg-background/95 backdrop-blur-xl border-0';

    const footerShadow = theme === 'dark'
        ? 'shadow-[0_-4px_30px_rgba(0,0,0,0.5)]'
        : 'shadow-[0_-4px_20px_rgba(0,0,0,0.06)]';

    return (
        <>
            <div
                className={`fixed bottom-0 left-0 right-0 z-[100] md:hidden
                    transition-all duration-300 ease-out
                    ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
                    ${isDrawerOpen ? 'opacity-0 pointer-events-none' : ''}
                    ${footerBgClass} ${footerShadow}
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
                <NavItem
                    icon={IconQuizzes}
                    label="Quizzes"
                    isActive={isActive("/Medrae-quizzes")}
                    onPress={(e) => handleNavigate(e, "/Medrae-quizzes")}
                    isDark={theme === 'dark'}
                />

                <NavItem
                    icon={IconFeed}
                    label="Feed"
                    isActive={isActive("/feed")}
                    onPress={(e) => handleNavigate(e, "/feed")}
                    isDark={theme === 'dark'}
                />

                <NavItem
                    icon={IconHome}
                    label="Home"
                    isActive={isActive(`/dashboard/${role}`)}
                    onPress={(e) => handleNavigate(e, `/dashboard/${role}`)}
                    isDark={theme === 'dark'}
                />

                <NavItem
                    icon={IconMistakes}
                    label="Mistakes"
                    isActive={isActive("/my-mistakes")}
                    onPress={(e) => handleNavigate(e, "/my-mistakes")}
                    isDark={theme === 'dark'}
                    badge={mistakeCount > 0 ? mistakeCount : undefined}
                />

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