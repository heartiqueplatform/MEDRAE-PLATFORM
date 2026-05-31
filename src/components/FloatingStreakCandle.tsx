"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { motion, AnimatePresence } from "framer-motion";
import Draggable from "react-draggable";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoginActivity {
    login_date: string;
    streak: number;
}

interface ChartPoint {
    day: string;
    date: Date;
    streak: number;
    isToday: boolean;
    dayOfWeek: string;
}

// ─── Quotes ───────────────────────────────────────────────────────────────────

const QUOTES = [
    "Per aspera ad astra.",
    "Knowledge is the candle that lights the world.",
    "A little progress each day adds up to big results.",
    "The flame of curiosity never dies.",
    "Consistency is the mother of mastery.",
];

// ─── Candle SVG (Smaller, with plate stand) ───────────────────────────────────

function CandleSVG({ lit, waxDrips }: { lit: boolean; waxDrips: Array<{ left: number; height: number; delay: number }> }) {
    return (
        <svg width="80" height="120" viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
            <defs>
                <linearGradient id="candleBody" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#d4d4d4" />
                    <stop offset="15%" stopColor="#f0f0f0" />
                    <stop offset="35%" stopColor="#ffffff" />
                    <stop offset="65%" stopColor="#ffffff" />
                    <stop offset="85%" stopColor="#f0f0f0" />
                    <stop offset="100%" stopColor="#d4d4d4" />
                </linearGradient>

                <radialGradient id="waxPool" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fafafa" />
                    <stop offset="60%" stopColor="#f0f0f0" />
                    <stop offset="100%" stopColor="#e0e0e0" />
                </radialGradient>

                <linearGradient id="plateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4a84a" />
                    <stop offset="30%" stopColor="#c49030" />
                    <stop offset="70%" stopColor="#a07828" />
                    <stop offset="100%" stopColor="#8a6818" />
                </linearGradient>

                <linearGradient id="plateRim" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e8c060" />
                    <stop offset="100%" stopColor="#b89030" />
                </linearGradient>

                <radialGradient id="flameOuter" cx="50%" cy="70%" r="60%">
                    <stop offset="0%" stopColor="#fff5e0" stopOpacity="1" />
                    <stop offset="30%" stopColor="#ffcc33" stopOpacity="0.95" />
                    <stop offset="70%" stopColor="#ff6600" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#ff3300" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="flameInner" cx="50%" cy="65%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="50%" stopColor="#ffee88" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#ffaa00" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="emberGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ff4400" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#ff4400" stopOpacity="0" />
                </radialGradient>

                <clipPath id="candleClip">
                    <rect x="28" y="42" width="24" height="55" rx="2" />
                </clipPath>
            </defs>

            {/* Plate Stand */}
            <ellipse cx="40" cy="112" rx="32" ry="6" fill="url(#plateGrad)" />
            <ellipse cx="40" cy="110" rx="32" ry="5" fill="url(#plateRim)" />
            <ellipse cx="40" cy="109" rx="28" ry="4" fill="#c49030" opacity="0.5" />
            <ellipse cx="40" cy="110" rx="20" ry="3" fill="#8a6818" opacity="0.3" />

            {/* Candle body */}
            <rect x="28" y="42" width="24" height="65" rx="2" fill="url(#candleBody)" />
            <line x1="40" y1="42" x2="40" y2="107" stroke="#e8e8e8" strokeWidth="0.5" opacity="0.5" />

            {/* Wax drips */}
            <g clipPath="url(#candleClip)">
                {waxDrips.map((drip, i) => (
                    <motion.rect
                        key={i}
                        x={drip.left}
                        y="42"
                        width="3"
                        height={drip.height}
                        fill="#f5f5f5"
                        rx="1.5"
                        animate={{ scaleY: [0.85, 1.02, 0.85] }}
                        transition={{ repeat: Infinity, duration: 3.5, delay: drip.delay, ease: "easeInOut" }}
                        style={{ transformOrigin: `${drip.left + 1.5}px 42px` }}
                    />
                ))}
            </g>

            <rect x="28" y="42" width="24" height="2.5" rx="1" fill="#ffffff" opacity="0.7" />
            <ellipse cx="40" cy="43" rx="11" ry="4" fill="url(#waxPool)" opacity="0.8" />
            <ellipse cx="40" cy="43" rx="7" ry="2.5" fill="#fafafa" opacity="0.5" />

            {/* Wick */}
            <line x1="40" y1="43" x2="40" y2="35" stroke="#2a1a08" strokeWidth="1.5" strokeLinecap="round" />

            {lit && (
                <>
                    <circle cx="40" cy="34.5" r="2.5" fill="url(#emberGlow)">
                        <animate attributeName="r" values="1.5;3;1.5" dur="0.8s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="40" cy="34.5" r="1.2" fill="#ff6600">
                        <animate attributeName="opacity" values="0.7;1;0.7" dur="0.5s" repeatCount="indefinite" />
                    </circle>
                </>
            )}

            {/* Flame */}
            {lit && (
                <motion.g
                    animate={{
                        scaleX: [1, 0.95, 1.02, 0.97, 1],
                        scaleY: [1, 1.05, 1.02, 1.07, 1],
                    }}
                    transition={{ repeat: Infinity, duration: 0.2, ease: "easeInOut" }}
                    style={{ transformOrigin: "40px 35px" }}
                >
                    <path
                        d="M40 18 C38 23.5, 35 28, 34.5 32 C34 36, 36.5 38.5, 40 38.5 C43.5 38.5, 46 36, 45.5 32 C45 28, 42 23.5, 40 18Z"
                        fill="url(#flameOuter)"
                    />
                    <path
                        d="M40 23.5 C39 27, 37 30, 36.5 33 C36 35.5, 37.5 37.5, 40 37.5 C42.5 37.5, 44 35.5, 43.5 33 C43 30, 41 27, 40 23.5Z"
                        fill="url(#flameInner)"
                    />
                    <ellipse cx="40" cy="33.5" rx="2" ry="4.5" fill="#ffffff" opacity="0.7">
                        <animate attributeName="ry" values="4;5.5;4" dur="0.15s" repeatCount="indefinite" />
                    </ellipse>
                </motion.g>
            )}
        </svg>
    );
}

// ─── Smoke ────────────────────────────────────────────────────────────────────

function Smoke({ visible }: { visible: boolean }) {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: "absolute",
                        bottom: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0,
                        pointerEvents: "none",
                        zIndex: 20,
                    }}
                >
                    {[0, 0.4, 0.8].map((delay, i) => (
                        <motion.div
                            key={i}
                            style={{
                                width: 6 - i * 1.5,
                                height: 6 - i * 1.5,
                                borderRadius: "50%",
                                background: "rgba(120,100,80,0.3)",
                                marginTop: -3,
                            }}
                            animate={{
                                y: [0, -15, -30],
                                x: [0, 3, -2],
                                scale: [1, 1.4, 2],
                                opacity: [0.4, 0.15, 0],
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: 1.6,
                                delay,
                                ease: "easeIn",
                            }}
                        />
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─── Sparkle ──────────────────────────────────────────────────────────────────

function Sparkle({ x, y, char }: { x: number; y: number; char: string }) {
    return (
        <motion.span
            style={{
                position: "absolute",
                left: x,
                top: y,
                color: "rgba(255,180,50,0.9)",
                fontSize: 10 + Math.random() * 5,
                pointerEvents: "none",
                zIndex: 100,
                fontWeight: 500,
            }}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -40, scale: 0.3 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
        >
            {char}
        </motion.span>
    );
}

// ─── Smart Calendar Bar Chart Tooltip ─────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div
                style={{
                    background: "rgba(0,0,0,0.9)",
                    border: "1px solid rgba(255,180,50,0.4)",
                    borderRadius: 10,
                    padding: "8px 14px",
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}
            >
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#ffcc66" }}>
                    {data.dayOfWeek}, {label}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 700, color: "#ffffff" }}>
                    {payload[0].value} day streak
                </p>
                {data.isToday && (
                    <p style={{ margin: "4px 0 0", fontSize: 9, color: "#ffaa44", fontStyle: "italic" }}>
                        ✦ Today
                    </p>
                )}
            </div>
        );
    }
    return null;
};

// ─── Fullscreen Stats Overlay (Light/Dark adaptive) ─────────────────────────

function StatsOverlay({
    open,
    onClose,
    streak,
    chartData,
    longestStreak,
    totalDays,
    quoteIdx,
    isDarkMode,
}: {
    open: boolean;
    onClose: () => void;
    streak: number;
    chartData: ChartPoint[];
    longestStreak: number;
    totalDays: number;
    quoteIdx: number;
    isDarkMode: boolean;
}) {
    const theme = {
        background: isDarkMode
            ? "rgba(8, 6, 4, 0.96)"
            : "rgba(255, 255, 255, 0.96)",
        cardBg: isDarkMode
            ? "rgba(30,30,35,0.6)"
            : "rgba(245, 245, 245, 0.8)",
        cardBorder: isDarkMode
            ? "rgba(255,200,80,0.15)"
            : "rgba(200, 150, 50, 0.2)",
        textPrimary: isDarkMode ? "#ffffff" : "#1a1a1a",
        textSecondary: isDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
        textMuted: isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
        accent: "#ffcc66",
        chartGrid: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    };

    const getBarColor = (streak: number, isToday: boolean) => {
        if (isToday) return "#ffdd88";
        if (streak >= 7) return "#ffaa44";
        if (streak >= 3) return "#ffcc66";
        return "#e8c060";
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onClick={onClose}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 200,
                        background: theme.background,
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px",
                        cursor: "pointer",
                    }}
                >
                    <motion.div
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.2, 0.9, 0.4, 1] }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: "100%",
                            maxWidth: 420,
                            cursor: "default",
                        }}
                    >
                        {/* Header */}
                        <div style={{ textAlign: "center", marginBottom: 24 }}>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: theme.accent, margin: 0, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 500 }}>
                                Your Learning Flame
                            </p>
                            <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 48, fontWeight: 700, color: theme.textPrimary, margin: "6px 0 0", lineHeight: 1 }}>
                                {streak}
                                <span style={{ fontSize: 20, fontWeight: 400, color: theme.accent, marginLeft: 6 }}>days</span>
                            </h2>
                        </div>

                        {/* 4 Stat Cards */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
                            {[
                                { label: "Current", value: `${streak}`, unit: "days", color: theme.accent },
                                { label: "Longest", value: `${longestStreak}`, unit: "days", color: "#ffaa44" },
                                { label: "Total Days", value: `${totalDays}`, unit: "studied", color: "#ffaa44" },
                                { label: "This Week", value: `${Math.min(streak, 7)}`, unit: "of 7", color: theme.accent },
                            ].map((stat, i) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                                    style={{
                                        background: theme.cardBg,
                                        border: `1px solid ${theme.cardBorder}`,
                                        borderRadius: 14,
                                        padding: "12px 14px",
                                        textAlign: "center",
                                        backdropFilter: "blur(4px)",
                                    }}
                                >
                                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: theme.textSecondary, margin: "0 0 4px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                        {stat.label}
                                    </p>
                                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 700, color: stat.color, margin: 0, lineHeight: 1 }}>
                                        {stat.value}
                                        <span style={{ fontSize: 11, fontWeight: 400, color: theme.textMuted, marginLeft: 3 }}>{stat.unit}</span>
                                    </p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Smart Calendar Bar Chart */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35, duration: 0.4 }}
                            style={{
                                background: theme.cardBg,
                                border: `1px solid ${theme.cardBorder}`,
                                borderRadius: 14,
                                padding: "14px",
                                marginBottom: 20,
                                backdropFilter: "blur(4px)",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: theme.textSecondary, margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                    Last 14 Days
                                </p>
                                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: theme.accent, margin: 0, opacity: 0.7 }}>
                                    each bar = 1 day
                                </p>
                            </div>

                            <ResponsiveContainer width="100%" height={170}>
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 10, right: 4, left: -16, bottom: 5 }}
                                    barGap={2}
                                    barCategoryGap={4}
                                >
                                    <XAxis
                                        dataKey="day"
                                        tick={{ fill: theme.textMuted, fontSize: 9, fontFamily: "'Inter', sans-serif" }}
                                        axisLine={{ stroke: theme.chartGrid, strokeWidth: 1 }}
                                        tickLine={false}
                                        interval={1}
                                        tickFormatter={(value, index) => {
                                            const item = chartData[index];
                                            if (!item) return "";
                                            if (item.isToday) return "Today";
                                            if (index % 2 === 0) return item.day;
                                            return "";
                                        }}
                                    />
                                    <YAxis
                                        tick={{ fill: theme.textMuted, fontSize: 9, fontFamily: "'Inter', sans-serif" }}
                                        axisLine={{ stroke: theme.chartGrid, strokeWidth: 1 }}
                                        tickLine={false}
                                        width={25}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: theme.chartGrid, opacity: 0.3 }} />
                                    <ReferenceLine y={0} stroke={theme.chartGrid} strokeWidth={1} />
                                    <Bar
                                        dataKey="streak"
                                        radius={[3, 3, 0, 0]}
                                        barSize={16}
                                        animationDuration={800}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={getBarColor(entry.streak, entry.isToday)}
                                                stroke={entry.isToday ? "#ffdd88" : "none"}
                                                strokeWidth={entry.isToday ? 1 : 0}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>

                            {/* Calendar hint - day markers */}
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginTop: 8,
                                paddingTop: 6,
                                borderTop: `1px solid ${theme.chartGrid}`,
                            }}>
                                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                                    <span key={i} style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: 8,
                                        color: theme.textMuted,
                                        textAlign: "center",
                                        flex: 1,
                                        opacity: 0.6,
                                    }}>
                                        {day}
                                    </span>
                                ))}
                            </div>
                        </motion.div>

                        {/* Rotating Quote */}
                        <motion.p
                            key={quoteIdx}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: 12,
                                color: theme.textMuted,
                                textAlign: "center",
                                margin: 0,
                                fontStyle: "italic",
                                letterSpacing: "0.02em",
                                lineHeight: 1.5,
                            }}
                        >
                            "{QUOTES[quoteIdx % QUOTES.length]}"
                        </motion.p>

                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: theme.textMuted, textAlign: "center", marginTop: 16, letterSpacing: "0.05em", opacity: 0.5 }}>
                            tap anywhere to close
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StreakCandle() {
    const user = useUser();
    const [streak, setStreak] = useState(0);
    const [chartData, setChartData] = useState<ChartPoint[]>([]);
    const [longestStreak, setLongestStreak] = useState(0);
    const [totalDays, setTotalDays] = useState(0);
    const [lit, setLit] = useState(true);
    const [overlayOpen, setOverlayOpen] = useState(false);
    const [quoteIdx, setQuoteIdx] = useState(0);
    const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number; char: string }[]>([]);
    const [sparkleId, setSparkleId] = useState(0);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const nodeRef = useRef(null);

    // Load saved position from localStorage
    useEffect(() => {
        const savedPosition = localStorage.getItem("streakCandlePosition");
        if (savedPosition) {
            try {
                const pos = JSON.parse(savedPosition);
                setPosition(pos);
            } catch (e) {
                console.error("Failed to load position", e);
            }
        }
    }, []);

    // Save position when dragged
    const handleDragStop = (e: any, data: any) => {
        setIsDragging(false);
        const newPosition = { x: data.x, y: data.y };
        setPosition(newPosition);
        localStorage.setItem("streakCandlePosition", JSON.stringify(newPosition));
    };

    const handleDragStart = () => {
        setIsDragging(true);
    };

    // Detect dark/light mode
    useEffect(() => {
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark') ||
                (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
            setIsDarkMode(isDark);
        };

        checkDarkMode();
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', checkDarkMode);

        return () => {
            observer.disconnect();
            window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', checkDarkMode);
        };
    }, []);

    const waxDrips = [
        { left: 31, height: 16, delay: 0 },
        { left: 46, height: 14, delay: 1.2 },
        { left: 38, height: 10, delay: 2.4 },
    ];

    // Fetch streak + history with smart date processing
    useEffect(() => {
        if (!user?.id) return;

        const fetchData = async () => {
            const { data } = await supabase
                .from("login_activity")
                .select("login_date, streak")
                .eq("user_id", user.id)
                .order("login_date", { ascending: false })
                .limit(30);

            if (!data || data.length === 0) return;

            const current = data[0]?.streak ?? 0;
            setStreak(current);
            setLongestStreak(Math.max(...data.map((d: LoginActivity) => d.streak)));
            setTotalDays(data.length);

            // Process last 14 days with smart calendar data
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const last14 = [...data]
                .reverse()
                .slice(-14)
                .map((d: LoginActivity) => {
                    const date = new Date(d.login_date);
                    date.setHours(0, 0, 0, 0);
                    const isToday = date.getTime() === today.getTime();
                    const dayOfWeek = date.toLocaleDateString("en", { weekday: "short" });

                    return {
                        day: date.toLocaleDateString("en", { month: "short", day: "numeric" }),
                        date: date,
                        streak: d.streak,
                        isToday: isToday,
                        dayOfWeek: dayOfWeek,
                    };
                });

            setChartData(last14);
        };

        fetchData();
    }, [user?.id]);

    const spawnSparkles = useCallback((cx: number, cy: number) => {
        const chars = ["✦", "✧", "·", "★", "✺"];
        const newOnes = Array.from({ length: 6 }, (_, i) => ({
            id: sparkleId + i,
            x: cx + (Math.random() - 0.5) * 50,
            y: cy + (Math.random() - 0.5) * 35,
            char: chars[Math.floor(Math.random() * chars.length)],
        }));
        setSparkleId((p) => p + 6);
        setSparkles((prev) => [...prev, ...newOnes]);
        setTimeout(() => setSparkles((prev) => prev.filter((s) => !newOnes.find((n) => n.id === s.id))), 1000);
    }, [sparkleId]);

    const handleCandleTap = (e: React.MouseEvent | React.TouchEvent) => {
        // Don't open if we're dragging
        if (isDragging) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        spawnSparkles(cx, cy);
        setQuoteIdx((q) => (q + 1) % QUOTES.length);
        setOverlayOpen(true);
    };

    if (streak <= 0) return null;

    return (
        <>
            {/* Draggable Floating Candle */}
            <Draggable
                nodeRef={nodeRef}
                position={position}
                onStart={handleDragStart}
                onStop={handleDragStop}
                bounds="body"
                cancel=".no-drag"
            >
                <div
                    ref={nodeRef}
                    style={{
                        position: "fixed",
                        zIndex: 50,
                        cursor: isDragging ? "grabbing" : "grab",
                        userSelect: "none",
                        WebkitTapHighlightColor: "transparent",
                    }}
                >
                    <div
                        style={{ position: "absolute", inset: -25, pointerEvents: "none", zIndex: 5 }}
                    >
                        {sparkles.map((s) => (
                            <Sparkle key={s.id} x={s.x} y={s.y} char={s.char} />
                        ))}
                    </div>

                    <div
                        style={{ position: "relative", cursor: "pointer" }}
                        onClick={handleCandleTap}
                    >
                        <Smoke visible={!lit} />
                        <CandleSVG lit={lit} waxDrips={waxDrips} />
                    </div>

                    <div
                        style={{ textAlign: "center", marginTop: 4, cursor: "pointer" }}
                        onClick={handleCandleTap}
                    >
                        <div style={{
                            fontFamily: "'Inter', -apple-system, sans-serif",
                            fontSize: 18,
                            fontWeight: 700,
                            color: "#2a2a2a",
                            lineHeight: 1.2,
                        }}>
                            {streak}
                        </div>
                        <div style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: 8,
                            color: "#888888",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                        }}>
                            day streak
                        </div>
                    </div>
                </div>
            </Draggable>

            <StatsOverlay
                open={overlayOpen}
                onClose={() => setOverlayOpen(false)}
                streak={streak}
                chartData={chartData}
                longestStreak={longestStreak}
                totalDays={totalDays}
                quoteIdx={quoteIdx}
                isDarkMode={isDarkMode}
            />
        </>
    );
}