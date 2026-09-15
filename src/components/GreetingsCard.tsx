// src/components/GreetingsCard.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

// ============================================
// SHORT DAILY MOOD — one phrase per day
// ============================================
const DAILY_MOOD: Record<string, string> = {
    Sunday: "Reset and reflect",
    Monday: "New week, new focus",
    Tuesday: "Stay sharp",
    Wednesday: "Halfway there",
    Thursday: "Keep pushing",
    Friday: "Finish strong",
    Saturday: "Study at your pace",
};

// ============================================
// TIME-OF-DAY THEMES — drives color + icon
// ============================================
type TimeTheme = {
    greeting: string;
    label: string;       // small caption
    icon: "sunrise" | "sun" | "sunset" | "moon";
    accent: string;      // tailwind gradient stops
    glow: string;        // soft background glow
    chip: string;        // pill bg + text
};

function getTimeTheme(hour: number): TimeTheme {
    if (hour >= 5 && hour < 12) {
        return {
            greeting: "Good morning",
            label: "Morning",
            icon: "sunrise",
            accent: "from-amber-400 via-orange-400 to-rose-400",
            glow: "from-amber-200/40 dark:from-amber-500/10",
            chip: "bg-amber-100/70 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
        };
    }
    if (hour >= 12 && hour < 17) {
        return {
            greeting: "Good afternoon",
            label: "Afternoon",
            icon: "sun",
            accent: "from-sky-400 via-blue-500 to-indigo-500",
            glow: "from-sky-200/40 dark:from-sky-500/10",
            chip: "bg-sky-100/70 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
        };
    }
    if (hour >= 17 && hour < 21) {
        return {
            greeting: "Good evening",
            label: "Evening",
            icon: "sunset",
            accent: "from-rose-400 via-fuchsia-500 to-indigo-500",
            glow: "from-rose-200/40 dark:from-rose-500/10",
            chip: "bg-rose-100/70 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
        };
    }
    return {
        greeting: "Good night",
        label: "Night",
        icon: "moon",
        accent: "from-indigo-500 via-violet-500 to-slate-700",
        glow: "from-indigo-200/40 dark:from-indigo-500/10",
        chip: "bg-indigo-100/70 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
    };
}

// ============================================
// ICONS — minimal inline SVGs, no deps
// ============================================
function TimeIcon({ kind, className = "" }: { kind: TimeTheme["icon"]; className?: string }) {
    const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    if (kind === "sunrise")
        return (
            <svg viewBox="0 0 24 24" className={className} {...common}>
                <path d="M12 3v3M4.2 10.2l2.1 2.1M17.7 12.3l2.1-2.1M2 18h20M5 18a7 7 0 0 1 14 0" />
            </svg>
        );
    if (kind === "sun")
        return (
            <svg viewBox="0 0 24 24" className={className} {...common}>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
            </svg>
        );
    if (kind === "sunset")
        return (
            <svg viewBox="0 0 24 24" className={className} {...common}>
                <path d="M12 21v-3M4.2 13.8l2.1-2.1M17.7 11.7l2.1 2.1M2 18h20M5 18a7 7 0 0 1 14 0" />
            </svg>
        );
    return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
    );
}

// ============================================
// LIVE CLOCK — updates every 30s, no re-render storm
// ============================================
function useClock() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(id);
    }, []);
    return now;
}

// ============================================
// GREETINGS CARD
// ============================================
export default function GreetingsCard() {
    const user = useUser();

    const [name, setName] = useState<string>(() => {
        if (typeof window === "undefined") return "Nurse";
        return localStorage.getItem("userName") || "Nurse";
    });

    const now = useClock();
    const theme = useMemo(() => getTimeTheme(now.getHours()), [now]);

    const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
    const dateLine = now.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    const clock = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const mood = DAILY_MOOD[weekday] || "";

    // Fetch name once — only if not cached
    useEffect(() => {
        if (!user?.id) return;
        if (typeof window === "undefined") return;
        if (localStorage.getItem("userName")) return;

        let cancelled = false;
        const fetchName = async () => {
            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("name")
                    .eq("user_id", user.id)
                    .single();

                if (!cancelled && !error && data?.name) {
                    const first = data.name.split(" ")[0];
                    setName(first);
                    localStorage.setItem("userName", first);
                }
            } catch {
                // Silent fail — fallback is "Nurse"
            }
        };
        fetchName();
        return () => { cancelled = true; };
    }, [user?.id]);

    return (
        <section className="px-2 sm:px-0 pt-1 pb-1">
            <div
                className="relative overflow-hidden rounded-none md:rounded-xl
        border-0
        bg-white dark:bg-muted/30
        shadow-none"
            >
                {/* Accent bar — reflects time of day */}
                <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${theme.accent}`} />

                {/* Soft ambient glow */}
                <div className={`pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-gradient-to-br ${theme.glow} to-transparent blur-3xl`} />

                <div className="relative px-4 md:px-6 py-4 md:py-5">
                    {/* Row 1 — day + time chip */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[11px] md:text-xs font-medium text-slate-500 dark:text-slate-400">
                            <span className="uppercase tracking-[0.14em]">{weekday}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <span>{dateLine}</span>
                        </div>

                        <div className={`flex items-center gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[10px] md:text-[11px] font-medium ${theme.chip}`}>
                            <TimeIcon kind={theme.icon} className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            <span>{theme.label}</span>
                            <span className="opacity-60">·</span>
                            <span className="tabular-nums">{clock}</span>
                        </div>
                    </div>

                    {/* Row 2 — greeting */}
                    <h1 className="mt-3 md:mt-4 text-[22px] leading-tight md:text-3xl lg:text-[26px]
                        font-semibold tracking-tight text-slate-900 dark:text-white">
                        {theme.greeting},{" "}
                        <span className="relative inline-block">
                            <span className="relative z-10">{name}</span>
                            <span className={`absolute left-0 -bottom-0.5 h-[3px] w-full rounded-full bg-gradient-to-r ${theme.accent} opacity-70`} />
                        </span>
                    </h1>

                    {/* Row 3 — mood + progress dots */}
                    {mood && (
                        <div className="mt-2.5 md:mt-3 flex items-center gap-2.5">
                            <span className="text-[12px] md:text-sm font-normal text-slate-500 dark:text-slate-400">
                                {mood}
                            </span>
                            <span className="hidden sm:block flex-1 h-px bg-slate-200/70 dark:bg-slate-800/70" />
                        </div>
                    )}
                </div>

                {/* Hairline bottom tint */}
                <div className={`h-px w-full bg-gradient-to-r ${theme.accent} opacity-25`} />
            </div>
        </section>
    );
}