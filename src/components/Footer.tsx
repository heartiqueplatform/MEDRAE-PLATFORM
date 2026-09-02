"use client";

import { useEffect, useState, useRef, useCallback, useMemo, memo, Suspense, lazy, useTransition } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";
import { playSound } from "@/lib/soundManager";
import { useUserRole } from "@/context/UserRoleContext";

const MobileDrawer = lazy(() => import("@/components/MobileDrawer").then(module => ({ default: module.MobileDrawer })));

type IconTone = "neutral" | "practice" | "content" | "alert";

// ✅ PURE JS - NO dark: classes
const ICON_COLORS = {
    neutral: { light: "text-slate-600", dark: "text-slate-300" },
    practice: { light: "text-rose-600", dark: "text-rose-400" },
    content: { light: "text-indigo-600", dark: "text-indigo-400" },
    alert: { light: "text-amber-600", dark: "text-amber-400" },
};

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

// ✅ Home Button with Bump - Centered, using hospital.svg
const HomeButton = memo(({
    isActive,
    onPress,
    isDark
}: {
    isActive: boolean;
    onPress: (e: React.PointerEvent) => void;
    isDark: boolean;
}) => {
    const iconColorClass = isActive
        ? isDark ? "text-blue-400" : "text-blue-600"
        : isDark ? "text-gray-500" : "text-gray-400";

    return (
        <button
            onPointerDown={onPress}
            className="flex flex-col items-center justify-center flex-1 gap-1 relative group transition-all active:scale-90"
            style={{ touchAction: 'manipulation', transform: 'translateZ(0)', WebkitTapHighlightColor: 'transparent' }}
        >
            <div className="relative -mt-6">
                {/* ✅ Bump effect - rounded background */}
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200
                    ${isActive
                        ? isDark ? 'bg-blue-500/20 shadow-lg shadow-blue-500/30' : 'bg-blue-500/15 shadow-lg shadow-blue-500/20'
                        : isDark ? 'bg-slate-800/50' : 'bg-slate-100'
                    }`}
                >
                    <img
                        src="/hospital.svg"
                        alt="Home"
                        className={`h-[28px] w-[28px] transition-all duration-200 ${iconColorClass}`}
                        style={{
                            filter: isActive ? 'none' : (isDark ? 'brightness(0.5)' : 'brightness(0.4)'),
                            WebkitFilter: isActive ? 'none' : (isDark ? 'brightness(0.5)' : 'brightness(0.4)'),
                        }}
                    />
                </div>
            </div>
            <span className={`text-[10px] font-medium tracking-tight transition-colors duration-200 mt-0.5
                ${isActive ? "text-gray-900 dark:text-white" : isDark ? "text-gray-500" : "text-gray-400"}`}>
                Home
            </span>
            {isActive && (
                <div className="absolute -top-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
            )}
        </button>
    );
});

HomeButton.displayName = "HomeButton";

// Memoized Footer Item Component with SVG support
const FooterItem = memo(({
    item,
    isActive,
    tone,
    onPress,
    isDark,
    badge
}: {
    item: any;
    isActive: boolean;
    tone: IconTone;
    onPress: (e: React.PointerEvent) => void;
    isDark: boolean;
    badge?: number;
}) => {
    // ✅ Determine colors based on isDark prop
    let iconColor = isDark ? "text-gray-500" : "text-gray-400";
    let labelColor = isDark ? "text-gray-500" : "text-gray-400";

    if (isActive) {
        iconColor = isDark ? ICON_COLORS[tone].dark : ICON_COLORS[tone].light;
        labelColor = isDark ? "text-white" : "text-gray-900";
    }

    return (
        <button
            onPointerDown={onPress}
            className="flex flex-col items-center justify-center flex-1 gap-1 relative group transition-all active:scale-90"
            style={{ touchAction: 'manipulation', transform: 'translateZ(0)', WebkitTapHighlightColor: 'transparent' }}
        >
            <div className="relative">
                <img
                    src={item.icon}
                    alt={item.label}
                    className={`h-[24px] w-[24px] transition-all duration-200 will-change-transform ${iconColor}`}
                    style={{
                        filter: isActive ? 'none' : (isDark ? 'brightness(0.5)' : 'brightness(0.4)'),
                        WebkitFilter: isActive ? 'none' : (isDark ? 'brightness(0.5)' : 'brightness(0.4)'),
                    }}
                />
                {badge !== undefined && badge > 0 && (
                    <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
                        text-[9px] font-bold flex items-center justify-center
                        bg-red-500 text-white rounded-full
                        shadow-sm animate-pulse`}>
                        {badge > 99 ? '99+' : badge}
                    </span>
                )}
            </div>
            <span className={`text-[10px] font-medium tracking-tight transition-colors duration-200 ${labelColor}`}>
                {item.label || item.title}
            </span>
            {isActive && (
                <div className="absolute -top-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
            )}
        </button>
    );
});

FooterItem.displayName = "FooterItem";

// ✅ Memoized Menu Button Component - Using custom menu icon
const MenuButton = memo(({
    isDrawerOpen,
    onPress,
    isDark
}: {
    isDrawerOpen: boolean;
    onPress: (e: React.MouseEvent) => void;
    isDark: boolean;
}) => {
    // ✅ Determine colors based on isDark prop
    let iconColor = isDark ? "text-gray-500" : "text-gray-400";
    let labelColor = isDark ? "text-gray-500" : "text-gray-400";

    if (isDrawerOpen) {
        iconColor = "text-blue-600 dark:text-blue-400";
        labelColor = "text-blue-600 dark:text-blue-400";
    }

    return (
        <button
            onClick={onPress}
            className="flex flex-col items-center justify-center flex-1 gap-1 group transition-all active:scale-95"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        >
            <img
                src="/menu (2).png"
                alt="Menu"
                className={`h-[24px] w-[24px] transition-all duration-200 ${iconColor}`}
                style={{
                    filter: isDrawerOpen ? 'none' : (isDark ? 'brightness(0.5)' : 'brightness(0.4)'),
                    WebkitFilter: isDrawerOpen ? 'none' : (isDark ? 'brightness(0.5)' : 'brightness(0.4)'),
                }}
            />
            <span className={`text-[10px] font-medium transition-colors duration-200 ${labelColor}`}>
                Menu
            </span>
        </button>
    );
});
MenuButton.displayName = "MenuButton";

export function Footer() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { role } = useUserRole();

    const [mistakeCount, setMistakeCount] = useState<number>(0);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [safeAreaBottom, setSafeAreaBottom] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    // ✅ PRE-LOADED THEME
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

    // ✅ Fetch mistake count
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

    // ✅ Sync theme
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
                // Silent fallback
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

    const handleMenuPress = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        superFastTap("success");
        setIsDrawerOpen(true);
    }, []);

    // Prefetch Drawer
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

    // Safe area logic
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

    // Smart scroll detection
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
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

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('scroll', handleScrollStop, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('scroll', handleScrollStop);
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }
        };
    }, []);

    // ✅ 5 ITEMS with custom SVGs from public folder
    const items = useMemo(() => [
        {
            icon: "/graduation-cap.svg",
            label: "Quizzes",
            url: "/Medrae-quizzes",
            tone: "practice" as IconTone
        },
        {
            icon: "/scroll-paper.svg",
            label: "Feed",
            url: "/feed",
            tone: "content" as IconTone
        },
        // Home is rendered separately (bump) with hospital.svg
        {
            icon: "/crying.svg",
            label: "Mistakes",
            url: "/my-mistakes",
            tone: "alert" as IconTone,
            badge: mistakeCount > 0 ? mistakeCount : undefined
        },
    ], [mistakeCount]);

    const isActive = useCallback((url: string) => location.pathname === url, [location.pathname]);
    const footerHeight = 72 + safeAreaBottom;

    // ✅ PURE CSS - NO dark: classes
    const footerBgClass = theme === 'dark'
        ? 'bg-[#1a1a1a] border-t border-slate-800/50'
        : 'bg-white border-t border-slate-200/50';

    const footerShadow = theme === 'dark'
        ? 'shadow-[0_-4px_40px_rgba(0,0,0,0.7)]'
        : 'shadow-[0_-4px_30px_rgba(0,0,0,0.08)]';

    return (
        <>
            {/* ✅ EDGE-TO-EDGE FOOTER with 5 items */}
            <div
                className={`fixed bottom-0 left-0 right-0 z-[100] md:hidden
                    transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                    ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[100%] opacity-0'}
                    ${isDrawerOpen ? 'opacity-0 pointer-events-none' : ''}
                    ${footerBgClass} ${footerShadow}
                    flex justify-around items-start px-2 pt-2
                    select-none`}
                style={{
                    height: `${footerHeight}px`,
                    willChange: 'transform, opacity',
                    paddingBottom: `${6 + safeAreaBottom}px`,
                    WebkitBackfaceVisibility: 'hidden',
                    backfaceVisibility: 'hidden',
                }}
            >
                {/* ✅ ITEMS: Quizzes, Feed */}
                {items.slice(0, 2).map((item) => (
                    <FooterItem
                        key={item.url}
                        item={item}
                        isActive={isActive(item.url)}
                        tone={item.tone}
                        onPress={(e) => handleNavigate(e, item.url)}
                        isDark={theme === 'dark'}
                        badge={item.badge}
                    />
                ))}

                {/* ✅ HOME - Bumped center with hospital.svg */}
                <HomeButton
                    isActive={isActive(`/dashboard/${role}`)}
                    onPress={(e) => handleNavigate(e, `/dashboard/${role}`)}
                    isDark={theme === 'dark'}
                />

                {/* ✅ ITEMS: Mistakes */}
                {items.slice(2).map((item) => (
                    <FooterItem
                        key={item.url}
                        item={item}
                        isActive={isActive(item.url)}
                        tone={item.tone}
                        onPress={(e) => handleNavigate(e, item.url)}
                        isDark={theme === 'dark'}
                        badge={item.badge}
                    />
                ))}

                {/* ✅ MENU BUTTON LAST - Using custom menu icon */}
                <MenuButton
                    isDrawerOpen={isDrawerOpen}
                    onPress={handleMenuPress}
                    isDark={theme === 'dark'}
                />
            </div>

            <Suspense fallback={null}>
                <MobileDrawer userRole={role} isOpen={isDrawerOpen} setIsOpen={setIsDrawerOpen} />
            </Suspense>

            {/* ✅ Spacer for content */}
            <div className="md:hidden pointer-events-none" style={{ height: `${footerHeight + 8}px` }} />
        </>
    );
}