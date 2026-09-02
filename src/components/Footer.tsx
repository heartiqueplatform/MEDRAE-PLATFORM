"use client";

import { useEffect, useState, useRef, useCallback, useMemo, memo, Suspense, lazy, useTransition } from "react";
import { Home, Heart, Newspaper, Menu } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";
import { playSound } from "@/lib/soundManager";
import { useUserRole } from "@/context/UserRoleContext";

const MobileDrawer = lazy(() => import("@/components/MobileDrawer").then(module => ({ default: module.MobileDrawer })));

type IconTone = "neutral" | "practice" | "content";

const ICON_TONE_STYLES: Record<IconTone, { icon: { light: string; dark: string } }> = {
    neutral: { icon: { light: "text-slate-600", dark: "text-slate-300" } },
    practice: { icon: { light: "text-rose-600", dark: "text-rose-400" } },
    content: { icon: { light: "text-indigo-600", dark: "text-indigo-400" } },
};

const MISTAKE_COUNT_CACHE_KEY = "footer_mistake_count";

// ✅ PRE-LOAD THEME - Runs synchronously before component mount
const preloadTheme = (): 'light' | 'dark' => {
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
};

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

// Memoized Footer Item Component - Bigger, WhatsApp-style
const FooterItem = memo(({
    item,
    isActive,
    tone,
    onPress
}: {
    item: any;
    isActive: boolean;
    tone: IconTone;
    onPress: (e: React.PointerEvent) => void;
}) => (
    <button
        onPointerDown={onPress}
        className="flex flex-col items-center justify-center flex-1 gap-1 relative group transition-all active:scale-90"
        style={{ touchAction: 'manipulation', transform: 'translateZ(0)', WebkitTapHighlightColor: 'transparent' }}
    >
        <div className="relative">
            <item.icon
                className={`h-[24px] w-[24px] transition-all duration-200 will-change-transform
                    ${isActive
                        ? ICON_TONE_STYLES[tone].icon.light + " dark:" + ICON_TONE_STYLES[tone].icon.dark
                        : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                    }`}
                strokeWidth={isActive ? 2.5 : 2}
            />
        </div>
        <span className={`text-[10px] font-medium tracking-tight transition-colors duration-200
            ${isActive ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
            {item.label || item.title}
        </span>
        {isActive && (
            <div className="absolute -top-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
        )}
    </button>
));

FooterItem.displayName = "FooterItem";

// Memoized Menu Button Component - WhatsApp-style
const MenuButton = memo(({
    isDrawerOpen,
    onPress
}: {
    isDrawerOpen: boolean;
    onPress: (e: React.MouseEvent) => void;
}) => (
    <button
        onClick={onPress}
        className="flex flex-col items-center justify-center flex-1 gap-1 group transition-all active:scale-95"
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
        <Menu
            className={`h-[24px] w-[24px] transition-all duration-200
                ${isDrawerOpen
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                }`}
            strokeWidth={isDrawerOpen ? 2.5 : 2}
        />
        <span className={`text-[10px] font-medium transition-colors duration-200
            ${isDrawerOpen ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`}>
            Menu
        </span>
    </button>
));
MenuButton.displayName = "MenuButton";

export function Footer() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { role } = useUserRole();

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [safeAreaBottom, setSafeAreaBottom] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    // ✅ PRE-LOADED THEME - No flicker
    const [theme, setTheme] = useState<'light' | 'dark'>(preloadTheme);

    const isMounted = useRef(true);
    const [isPending, startTransition] = useTransition();
    const prefetchDone = useRef(false);
    const lastScrollY = useRef(0);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
    const scrollContainerRef = useRef<Element | null>(null);

    // ✅ Listen for theme changes
    useEffect(() => {
        const handleThemeChange = (e: StorageEvent) => {
            if (e.key === 'medrae_dark_mode') {
                const newTheme = e.newValue === 'true' ? 'dark' : 'light';
                setTheme(newTheme);
            }
        };

        const handleCustomThemeChange = (e: CustomEvent) => {
            const newTheme = e.detail?.isDarkMode ? 'dark' : 'light';
            setTheme(newTheme);
        };

        window.addEventListener('storage', handleThemeChange);
        window.addEventListener('theme-changed', handleCustomThemeChange as EventListener);

        return () => {
            window.removeEventListener('storage', handleThemeChange);
            window.removeEventListener('theme-changed', handleCustomThemeChange as EventListener);
        };
    }, []);

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

        if (!container) {
            const handleWindowScroll = () => {
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

            window.addEventListener('scroll', handleWindowScroll, { passive: true });
            window.addEventListener('scroll', handleScrollStop, { passive: true });

            return () => {
                window.removeEventListener('scroll', handleWindowScroll);
                window.removeEventListener('scroll', handleScrollStop);
                if (scrollTimeout.current) {
                    clearTimeout(scrollTimeout.current);
                }
            };
        }

        const handleContainerScroll = () => {
            let currentScrollY;
            if (container === document.documentElement || container === document.body) {
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

        if (container === document.documentElement || container === document.body) {
            window.addEventListener('scroll', handleContainerScroll, { passive: true });
            window.addEventListener('scroll', handleScrollStop, { passive: true });
        } else {
            container.addEventListener('scroll', handleContainerScroll, { passive: true });
            container.addEventListener('scroll', handleScrollStop, { passive: true });
        }

        const observer = new MutationObserver(() => {
            const currentContainer = findScrollContainer();
            if (currentContainer !== scrollContainerRef.current) {
                if (scrollContainerRef.current) {
                    const old = scrollContainerRef.current;
                    if (old === document.documentElement || old === document.body) {
                        window.removeEventListener('scroll', handleContainerScroll);
                        window.removeEventListener('scroll', handleScrollStop);
                    } else {
                        old.removeEventListener('scroll', handleContainerScroll);
                        old.removeEventListener('scroll', handleScrollStop);
                    }
                }

                if (currentContainer) {
                    scrollContainerRef.current = currentContainer;
                    if (currentContainer === document.documentElement || currentContainer === document.body) {
                        window.addEventListener('scroll', handleContainerScroll, { passive: true });
                        window.addEventListener('scroll', handleScrollStop, { passive: true });
                    } else {
                        currentContainer.addEventListener('scroll', handleContainerScroll, { passive: true });
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
            if (container === document.documentElement || container === document.body) {
                window.removeEventListener('scroll', handleContainerScroll);
                window.removeEventListener('scroll', handleScrollStop);
            } else {
                container.removeEventListener('scroll', handleContainerScroll);
                container.removeEventListener('scroll', handleScrollStop);
            }
            observer.disconnect();
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }
        };
    }, [location.pathname]);

    // ✅ SIMPLIFIED ITEMS - Just 4 items like WhatsApp
    const items = useMemo(() => [
        { icon: Home, label: "Home", url: `/dashboard/${role}`, iconTone: "neutral" as IconTone },
        { icon: Heart, label: "Quizzes", url: "/Medrae-quizzes", iconTone: "practice" as IconTone },
        { icon: Newspaper, label: "Feed", url: "/feed", iconTone: "content" as IconTone },

    ], [role]);

    const isActive = useCallback((url: string) => location.pathname === url, [location.pathname]);
    const footerHeight = 64 + safeAreaBottom;

    // ✅ Determine footer background based on theme
    const footerBgClass = theme === 'dark'
        ? 'bg-[#1a1a1a] border-t border-slate-800/50'
        : 'bg-white border-t border-slate-200/50';

    return (
        <>
            {/* ✅ EDGE-TO-EDGE FOOTER - WhatsApp style */}
            {/* ✅ FOOTER ITEMS - Menu on the RIGHT side */}
            <div
                className={`fixed bottom-0 left-0 right-0 z-[100] md:hidden
        transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[100%] opacity-0'}
        ${isDrawerOpen ? 'opacity-0 pointer-events-none' : ''}
        ${footerBgClass}
        shadow-[0_-4px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_40px_rgba(0,0,0,0.5)]
        flex justify-around items-center px-4
        select-none`}
                style={{
                    height: `${footerHeight}px`,
                    willChange: 'transform, opacity',
                    paddingTop: '6px',
                    paddingBottom: `${6 + safeAreaBottom}px`,
                    WebkitBackfaceVisibility: 'hidden',
                    backfaceVisibility: 'hidden',
                }}
            >
                {/* ✅ ITEMS FIRST (left to right) */}
                {items.map((item) => (
                    <FooterItem
                        key={item.url}
                        item={item}
                        isActive={isActive(item.url)}
                        tone={item.iconTone}
                        onPress={(e) => handleNavigate(e, item.url)}
                    />
                ))}

                {/* ✅ MENU BUTTON LAST (right side) */}
                <MenuButton isDrawerOpen={isDrawerOpen} onPress={handleMenuPress} />
            </div>
            <Suspense fallback={null}>
                <MobileDrawer userRole={role} isOpen={isDrawerOpen} setIsOpen={setIsDrawerOpen} />
            </Suspense>

            {/* ✅ Spacer for content */}
            <div className="md:hidden pointer-events-none" style={{ height: `${footerHeight + 8}px` }} />
        </>
    );
}