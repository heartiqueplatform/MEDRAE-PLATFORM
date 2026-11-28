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

/* ── TUTOR EXAMS — clipboard w/ tick ───────────────────────── */
const IconTutorExams = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 4.25H7.5A2.25 2.25 0 0 0 5.25 6.5v14A2.25 2.25 0 0 0 7.5 22.75h11A2.25 2.25 0 0 0 20.75 20.5v-14A2.25 2.25 0 0 0 18.5 4.25H17" stroke="currentColor" strokeWidth={SW(active)} strokeLinecap="round" strokeLinejoin="round" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
        <rect x="9" y="2.75" width="8" height="4" rx="1.25" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
        <path d="m10 14.5 2.25 2.25L16.5 12.5" stroke={active ? ACTIVE_DETAIL : "currentColor"} strokeWidth={active ? 1.8 : SW(false)} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/* ── CPD (staff) — award medal ─────────────────────────────── */
const IconCpd = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="13" cy="10" r="5.75" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
        <path d="M8.75 14.75 8 22.25l5-2.75 5 2.75-.75-7.5" stroke="currentColor" strokeWidth={SW(active)} strokeLinecap="round" strokeLinejoin="round" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
    </svg>
);

/* ── ANALYTICS (tutor) — bar chart ─────────────────────────── */
const IconAnalytics = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="5.25" y="12" width="4" height="7.5" rx="1.25" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
        <rect x="11" y="7.5" width="4" height="12" rx="1.25" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
        <rect x="16.75" y="4.25" width="4" height="15.25" rx="1.25" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
    </svg>
);

/* ── CATALOG (staff) — open book ───────────────────────────── */
const IconCatalog = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.25 5.5A2.25 2.25 0 0 1 6.5 3.25H19A2.25 2.25 0 0 1 21.25 5.5v15A2.25 2.25 0 0 1 19 22.75H6.5A2.25 2.25 0 0 1 4.25 20.5V5.5Z" stroke="currentColor" strokeWidth={SW(active)} strokeLinejoin="round" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
        <path d="M8.5 3.25v19.5" stroke={active ? ACTIVE_DETAIL : "currentColor"} strokeWidth={active ? 1.7 : SW(false)} strokeLinecap="round" />
        <path d="M12 9.5h5.5" stroke={active ? ACTIVE_DETAIL : "currentColor"} strokeWidth={active ? 1.7 : SW(false)} strokeLinecap="round" />
        <path d="M12 13h5.5" stroke={active ? ACTIVE_DETAIL : "currentColor"} strokeWidth={active ? 1.7 : SW(false)} strokeLinecap="round" />
    </svg>
);

/* ── CLASSES (tutor) — video camera ────────────────────────── */
const IconClasses = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3.25" y="7.5" width="14" height="11" rx="2.5" stroke="currentColor" strokeWidth={SW(active)} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
        <path d="M17.25 12l5.5-3.25v8.5L17.25 14z" stroke="currentColor" strokeWidth={SW(active)} strokeLinejoin="round" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
    </svg>
);

/* ── CERTIFICATES (staff) — trophy ─────────────────────────── */
const IconCertificates = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* cup body */}
        <path
            d="M8 4.25h10v4.5a5 5 0 0 1-10 0v-4.5Z"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
            fillOpacity={active ? 0.22 : 0}
        />
        {/* left handle */}
        <path
            d="M8 5.75H5.75A2.25 2.25 0 0 0 3.5 8v.75a3.25 3.25 0 0 0 3.25 3.25H8"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
        {/* right handle */}
        <path
            d="M18 5.75h2.25A2.25 2.25 0 0 1 22.5 8v.75a3.25 3.25 0 0 1-3.25 3.25H18"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
        {/* stem */}
        <path
            d="M13 13.75v4"
            stroke="currentColor"
            strokeWidth={SW(active)}
            strokeLinecap="round"
        />
        {/* base */}
        <path
            d="M9 21.75h8"
            stroke={active ? ACTIVE_DETAIL : "currentColor"}
            strokeWidth={active ? 1.8 : SW(false)}
            strokeLinecap="round"
        />
        <path
            d="M10.25 21.75c0-2 1-4 2.75-4s2.75 2 2.75 4"
            stroke={active ? ACTIVE_DETAIL : "currentColor"}
            strokeWidth={active ? 1.8 : SW(false)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
        {/* star inside the cup */}
        <path
            d="m13 6.75.7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6L10.7 8.45l1.6-.2.7-1.5Z"
            fill={active ? ACTIVE_DETAIL : "currentColor"}
            stroke="none"
        />
    </svg>
);

const IconNeldes = ({ active }: { active: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* outer card */}
        <rect
            x="3.5"
            y="2.5"
            width="19"
            height="21"
            rx="4"
            stroke="currentColor"
            strokeWidth={SW(active)}
            fill={active ? "currentColor" : "none"}
            fillOpacity={active ? 0.18 : 0}
        />
        {/* scroll/feed lines (inside the card, right side) */}
        <path d="M15.5 8.5h4" stroke={active ? "#ffffff" : "currentColor"} strokeWidth={active ? 1.9 : 1.7} strokeLinecap="round" opacity={active ? 0.9 : 0.6} />
        <path d="M15.5 13h4" stroke={active ? "#ffffff" : "currentColor"} strokeWidth={active ? 1.9 : 1.7} strokeLinecap="round" opacity={active ? 0.9 : 0.6} />
        <path d="M15.5 17.5h2.5" stroke={active ? "#ffffff" : "currentColor"} strokeWidth={active ? 1.9 : 1.7} strokeLinecap="round" opacity={active ? 0.9 : 0.6} />
        {/* play triangle (left-center) */}
        <path d="M8.5 9v8l5.5-4z" fill={active ? "#ffffff" : "currentColor"} />
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
   PRIMARY NAV ITEM — elevated center tile (Medspite)
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

    const tileBg = isActive
        ? (isDark ? "#1d4ed8" : "#2563eb")
        : (isDark ? "#1e293b" : "#e2e8f0");

    const iconColor = isActive
        ? "#ffffff"
        : (isDark ? "#93c5fd" : "#2563eb");

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
                className="-mt-4 w-[46px] h-[46px] rounded-xl flex items-center justify-center"
                style={{
                    background: tileBg,
                    transition: "background 200ms ease, transform 160ms",
                    transform: pressed ? "translateY(1px)" : "translateY(0)",
                    boxShadow: "none",
                }}
            >
                <span style={{ color: iconColor }}>
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
    const isTutor = role === "tutor";
    const isStaff = role === "staff";

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
            if (localStorage.getItem(NELDES_HINT_SEEN_KEY) === "true") {
                setShowNeldesHint(false);
                return;
            }
            let signupTs = Number(localStorage.getItem(NELDES_HINT_SIGNUP_KEY) || 0);
            if (!signupTs) {
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
    const drawerReadyRef = useRef(drawerReady);
    useEffect(() => { drawerReadyRef.current = drawerReady; }, [drawerReady]);

    const openDrawer = useCallback(() => {
        superFastTap("success");
        dismissHint();
        if (!drawerReadyRef.current) {
            import("@/components/MobileDrawer")
                .then(() => setDrawerReady(true))
                .finally(() => {
                    requestAnimationFrame(() => setIsDrawerOpen(true));
                });
            return;
        }
        requestAnimationFrame(() => setIsDrawerOpen(true));
    }, [dismissHint]);

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

    /* ── LONG-PRESS-TO-OPEN DRAWER ─────────────────────────────── */
    const holdTimer = useRef<NodeJS.Timeout | null>(null);
    const holdStartY = useRef<number | null>(null);
    const holdActive = useRef(false);

    useEffect(() => {
        const HOLD_MS = 600;
        const MOVE_CANCEL = 12;

        const clearHold = () => {
            if (holdTimer.current) {
                clearTimeout(holdTimer.current);
                holdTimer.current = null;
            }
            holdActive.current = false;
            holdStartY.current = null;
        };
        const onTouchStart = (e: TouchEvent) => {
            if (window.innerWidth >= 768) return;
            const target = e.target as HTMLElement | null;
            if (!target) return;

            const onHandle = !!target.closest('[data-drawer-handle]');
            const onNavButton = !!target.closest('[data-footer-bar] button');

            if (onNavButton && !onHandle) return;
            if (!onHandle && !target.closest('[data-footer-bar]')) return;

            const touch = e.touches[0];
            holdStartY.current = touch.clientY;
            holdActive.current = true;

            clearHold();
            holdTimer.current = setTimeout(() => {
                if (!holdActive.current) return;
                holdActive.current = false;
                superFastTap("success");
                openDrawer();
            }, HOLD_MS);
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!holdActive.current || holdStartY.current === null) return;
            const dy = Math.abs(e.touches[0].clientY - holdStartY.current);
            if (dy > MOVE_CANCEL) {
                clearHold();
            }
        };

        const onTouchEnd = () => {
            clearHold();
        };

        document.addEventListener("touchstart", onTouchStart, { passive: true });
        document.addEventListener("touchmove", onTouchMove, { passive: true });
        document.addEventListener("touchend", onTouchEnd, { passive: true });
        document.addEventListener("touchcancel", onTouchEnd, { passive: true });

        return () => {
            clearHold();
            document.removeEventListener("touchstart", onTouchStart);
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
            document.removeEventListener("touchcancel", onTouchEnd);
        };
    }, [openDrawer]);

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
                    {/* DRAWER CHEVRON — tap to open menu */}
                    <button
                        onClick={openDrawer}
                        onPointerDown={(e) => {
                            e.currentTarget.style.transform = "translateX(-50%) scale(0.82)";
                        }}
                        onPointerUp={(e) => {
                            e.currentTarget.style.transform = "translateX(-50%) scale(1)";
                        }}
                        onPointerLeave={(e) => {
                            e.currentTarget.style.transform = "translateX(-50%) scale(1)";
                        }}
                        data-drawer-handle
                        aria-label="Open menu"
                        className={`fixed left-1/2 z-[101] md:hidden
    flex items-center justify-center w-14 h-8
    transition-all duration-300 ease-out
    ${isVisible ? 'opacity-100' : 'translate-y-full opacity-0'}`}
                        style={{
                            bottom: `${footerHeight + 8}px`,
                            touchAction: "manipulation",
                            transform: "translateX(-50%) scale(1)",
                            transition: "transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease-out",
                            WebkitTapHighlightColor: "transparent",
                            background: "transparent",
                            border: "none",
                            padding: 0,
                        }}
                    >
                        <svg
                            width="26"
                            height="13"
                            viewBox="0 0 26 13"
                            fill="none"
                            className="chevron-svg"
                        >
                            <path
                                d="M3 10L13 3L23 10"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>

                    <style>{`
  .chevron-svg {
    color: #60a5fa;
    animation:
      chevronPulse 1.8s cubic-bezier(0.34, 1.56, 0.64, 1) infinite,
      chevronColorCycle 4s linear infinite;
  }

  @keyframes chevronPulse {
    0%, 100% { transform: translateY(0) scale(1); }
    50%      { transform: translateY(-2px) scale(1.06); }
  }

  @keyframes chevronColorCycle {
    0%   { color: #60a5fa; }
    33%  { color: #a78bfa; }
    66%  { color: #22d3ee; }
    100% { color: #60a5fa; }
  }

  @media (prefers-reduced-motion: reduce) {
    .chevron-svg { animation: none; }
  }
`}</style>
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
                        {/* Slot 1 — Home (all roles) */}
                        <NavItem
                            icon={IconHome}
                            label="Home"
                            isActive={isActive(`/dashboard/${role}`)}
                            onPress={(e) => handleNavigate(e, `/dashboard/${role}`)}
                            isDark={theme === 'dark'}
                        />

                        {/* Slot 2 — Feed (student) / Exams (tutor) / CPD (staff) */}
                        {isStudent && (
                            <NavItem
                                icon={IconFeed}
                                label="Feed"
                                isActive={isActive("/feed")}
                                onPress={(e) => handleNavigate(e, "/feed")}
                                isDark={theme === 'dark'}
                            />
                        )}
                        {isTutor && (
                            <NavItem
                                icon={IconTutorExams}
                                label="Exams"
                                isActive={isActive("/tutor/exams")}
                                onPress={(e) => handleNavigate(e, "/tutor/exams")}
                                isDark={theme === 'dark'}
                            />
                        )}
                        {isStaff && (
                            <NavItem
                                icon={IconCpd}
                                label="CPD"
                                isActive={isActive("/cpd")}
                                onPress={(e) => handleNavigate(e, "/cpd")}
                                isDark={theme === 'dark'}
                            />
                        )}

                        {/* Slot 3 — MEDSPITE (center, elevated, primary — all roles) */}
                        <PrimaryNavItem
                            icon={IconNeldes}
                            label=" Medspite"
                            isActive={isActive("/neldes")}
                            onPress={(e) => handleNavigate(e, "/neldes")}
                            isDark={theme === 'dark'}
                            hintVisible={showNeldesHint}
                            onLongPress={revealHint}
                        />

                        {/* Slot 4 — Quizzes +badge (student) / Analytics (tutor) / Catalog (staff) */}
                        {isStudent && (
                            <NavItem
                                icon={IconQuizzes}
                                label="Quizzes"
                                isActive={isActive("/Medrae-quizzes")}
                                onPress={(e) => handleNavigate(e, "/Medrae-quizzes")}
                                isDark={theme === 'dark'}
                                badge={isStudent && mistakeCount > 0 ? mistakeCount : undefined}
                            />
                        )}
                        {isTutor && (
                            <NavItem
                                icon={IconAnalytics}
                                label="Analytics"
                                isActive={isActive("/analytics")}
                                onPress={(e) => handleNavigate(e, "/analytics")}
                                isDark={theme === 'dark'}
                            />
                        )}
                        {isStaff && (
                            <NavItem
                                icon={IconCatalog}
                                label="Catalog"
                                isActive={isActive("/cpd/catalog")}
                                onPress={(e) => handleNavigate(e, "/cpd/catalog")}
                                isDark={theme === 'dark'}
                            />
                        )}

                        {/* Slot 5 — Listen (student) / Classes (tutor) / Certs (staff) */}
                        {isStudent && (
                            <NavItem
                                icon={IconHeadphones}
                                label="Listen"
                                isActive={isActive("/listen")}
                                onPress={(e) => handleNavigate(e, "/listen")}
                                isDark={theme === 'dark'}
                            />
                        )}
                        {isTutor && (
                            <NavItem
                                icon={IconClasses}
                                label="Classes"
                                isActive={isActive("/my-classes")}
                                onPress={(e) => handleNavigate(e, "/my-classes")}
                                isDark={theme === 'dark'}
                            />
                        )}
                        {isStaff && (
                            <NavItem
                                icon={IconCertificates}
                                label="Certs"
                                isActive={isActive("/cpd/certificates")}
                                onPress={(e) => handleNavigate(e, "/cpd/certificates")}
                                isDark={theme === 'dark'}
                            />
                        )}
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