// src/components/GreetingsCard.tsx
"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

// ============================================================
// 🖼️  HERO IMAGES  —  REPLACE THESE WITH YOUR SPLASH PIXELS
// ============================================================
// Paste your 4 hardcoded splash pixel URLs below.
// Each one shows based on the user's local time:
//
//   sunrise  →  05:00 – 11:59  (Morning)
//   sun      →  12:00 – 16:59  (Afternoon)
//   sunset   →  17:00 – 20:59  (Evening)
//   moon     →  21:00 – 04:59  (Night)
//
// Just swap the string after each key. Keep the quotes.
// Format: full URL, must end in .jpg / .png / .webp / .avif
// Recommended size: 1200×600 or larger (2:1 ratio).
// ============================================================

const TIME_IMAGES: Record<"sunrise" | "sun" | "sunset" | "moon", string> = {
    // Morning — bright, clinical, warm light
    sunrise: "https://images.pexels.com/photos/3985163/pexels-photo-3985163.jpeg?auto=compress&cs=tinysrgb&w=1200",

    // Afternoon — hospital / stethoscope / team
    sun: "https://images.pexels.com/photos/4270088/pexels-photo-4270088.jpeg?auto=compress&cs=tinysrgb&w=1200",

    // Evening — nurse portrait, golden hour
    sunset: "https://images.pexels.com/photos/5452201/pexels-photo-5452201.jpeg?auto=compress&cs=tinysrgb&w=1200",

    // Night — dark ward / night shift mood
    moon: "https://images.pexels.com/photos/305568/pexels-photo-305568.jpeg?auto=compress&cs=tinysrgb&w=1200",
};

// ============================================================
// DAILY TAGS — one smart nudge per day (no emojis)
// ============================================================
const DAILY_TAGS: string[] = [
    "Today, learn 20 new things",
    "Today, attempt 1 DigiProctor paper",
    "Today, review your weakest unit",
    "Today, do 1 clinical assessment",
    "Today, memorize 5 drug classes",
    "Today, watch 1 video on a hard topic",
    "Today, teach a peer 1 concept",
    "Today, revise 1 condition deeply",
    "Today, nail 30 NCK questions",
    "Today, read 1 page of notes aloud",
    "Today, master 3 new mnemonics",
    "Today, check in with your feelings",
    "Today, do 1 past paper timed",
    "Today, fix 1 weak area for good",
    "Today, rest 20 minutes, no guilt",
];

function getDailyTag(date: Date): string {
    // Same tag all day, rotates at midnight
    const dayIndex = Math.floor(
        new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000
    );
    return DAILY_TAGS[dayIndex % DAILY_TAGS.length];
}

// ============================================
// SHORT DAILY MOOD — fallback when weather is off
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
// TIME-OF-DAY THEMES
// ============================================
type TimeTheme = {
    greeting: string;
    label: string;
    icon: "sunrise" | "sun" | "sunset" | "moon";
    accent: string;
    chip: string;
};

function getTimeTheme(hour: number): TimeTheme {
    if (hour >= 5 && hour < 12) {
        return {
            greeting: "Good morning",
            label: "Morning",
            icon: "sunrise",
            accent: "from-amber-400 via-orange-400 to-rose-400",
            chip: "bg-amber-100/70 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
        };
    }
    if (hour >= 12 && hour < 17) {
        return {
            greeting: "Good afternoon",
            label: "Afternoon",
            icon: "sun",
            accent: "from-sky-400 via-blue-500 to-indigo-500",
            chip: "bg-sky-100/70 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
        };
    }
    if (hour >= 17 && hour < 21) {
        return {
            greeting: "Good evening",
            label: "Evening",
            icon: "sunset",
            accent: "from-rose-400 via-fuchsia-500 to-indigo-500",
            chip: "bg-rose-100/70 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
        };
    }
    return {
        greeting: "Good night",
        label: "Night",
        icon: "moon",
        accent: "from-indigo-500 via-violet-500 to-slate-700",
        chip: "bg-indigo-100/70 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
    };
}

// ============================================
// TIME ICONS
// ============================================
function TimeIcon({ kind, className = "" }: { kind: TimeTheme["icon"]; className?: string }) {
    const common = {
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.6,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
    };
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
// WEATHER TYPES + HELPERS
// ============================================
type WeatherIconKind = "sun" | "cloud" | "rain" | "snow" | "storm" | "fog";

type WeatherAdvice = {
    tempC: number;
    feelsLikeC: number;
    humidity: number;
    uvIndex: number;
    code: number;
    condition: string;
    icon: WeatherIconKind;
    advice: string;
    tone: "warm" | "cool" | "neutral" | "alert";
    location: string | null;
    isNight: boolean;
};

function decodeCode(code: number): { condition: string; icon: WeatherIconKind } {
    if (code === 0) return { condition: "Clear", icon: "sun" };
    if (code <= 2) return { condition: "Partly cloudy", icon: "cloud" };
    if (code === 3) return { condition: "Overcast", icon: "cloud" };
    if (code >= 45 && code <= 48) return { condition: "Fog", icon: "fog" };
    if (code >= 51 && code <= 67) return { condition: "Rain", icon: "rain" };
    if (code >= 71 && code <= 77) return { condition: "Snow", icon: "snow" };
    if (code >= 80 && code <= 82) return { condition: "Showers", icon: "rain" };
    if (code >= 85 && code <= 86) return { condition: "Snow showers", icon: "snow" };
    if (code >= 95) return { condition: "Thunderstorm", icon: "storm" };
    return { condition: "Clear skies", icon: "cloud" };
}

function buildAdvice(input: {
    tempC: number;
    feelsLikeC: number;
    humidity: number;
    uvIndex: number;
    icon: WeatherIconKind;
    hour: number;
}): { advice: string; tone: WeatherAdvice["tone"] } {
    const { tempC, feelsLikeC, humidity, uvIndex, icon, hour } = input;
    const night = hour >= 21 || hour < 5;
    const early = hour >= 5 && hour < 7;

    if (feelsLikeC >= 38) {
        return { advice: "Extreme heat. Hydrate every 30 minutes and watch for heat exhaustion.", tone: "alert" };
    }
    if (feelsLikeC >= 32) {
        return { advice: "High heat. Push fluids and monitor elderly and cardiac patients.", tone: "alert" };
    }
    if (feelsLikeC >= 28 && humidity >= 70) {
        return { advice: "Hot and humid. Heat stress risk up. Dress light and hydrate.", tone: "alert" };
    }
    if (feelsLikeC <= 0) {
        return { advice: "Freezing. Cover extremities and watch for hypothermia.", tone: "warm" };
    }
    if (feelsLikeC <= 8) {
        return { advice: "Cold out. Layer up and mind icy surfaces.", tone: "warm" };
    }
    if (feelsLikeC <= 14 && humidity >= 80) {
        return { advice: "Cold and damp. Respiratory flare risk up. Keep warm.", tone: "warm" };
    }
    if (!night && uvIndex >= 8) {
        return { advice: "Very high UV. SPF 50, hat, sunglasses.", tone: "alert" };
    }
    if (!night && uvIndex >= 6) {
        return { advice: "High UV. Sunscreen and shade between commutes.", tone: "cool" };
    }
    if (icon === "fog") return { advice: "Foggy. Low visibility. Take care driving.", tone: "cool" };
    if (icon === "storm") return { advice: "Stormy. Expect an ED surge. Stay safe.", tone: "alert" };
    if (icon === "snow") return { advice: "Snow. Falls risk up. Tread carefully outdoors.", tone: "warm" };
    if (icon === "rain") return { advice: "Rainy. Slippery floors. Extra caution.", tone: "cool" };
    if (humidity <= 30 && tempC >= 18) {
        return { advice: "Dry air. Sip water often. Watch dry mucous membranes.", tone: "cool" };
    }
    if (feelsLikeC >= 18 && feelsLikeC <= 24 && humidity < 70) {
        if (early) return { advice: "Mild and calm. Good morning for handover outdoors.", tone: "neutral" };
        if (night) return { advice: "Comfortable night. Light layer for late rounds.", tone: "neutral" };
        return { advice: "Comfortable out. Ideal shift weather. Stay hydrated.", tone: "neutral" };
    }
    if (icon === "cloud" && night) return { advice: "Cool evening. A light layer helps.", tone: "cool" };
    return { advice: "Steady conditions. Good day to be on your feet.", tone: "neutral" };
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
    try {
        const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        );
        const json = await res.json();
        return json?.city || json?.locality || json?.principalSubdivision || json?.countryName || null;
    } catch {
        return null;
    }
}

function WeatherIcon({ kind, className = "" }: { kind: WeatherIconKind; className?: string }) {
    const common = {
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.6,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
    };
    if (kind === "sun")
        return (
            <svg viewBox="0 0 24 24" className={className} {...common}>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
            </svg>
        );
    if (kind === "cloud")
        return (
            <svg viewBox="0 0 24 24" className={className} {...common}>
                <path d="M17 18a4 4 0 0 0 0-8 6 6 0 0 0-11.6 1.6A3.5 3.5 0 0 0 6 18Z" />
            </svg>
        );
    if (kind === "rain")
        return (
            <svg viewBox="0 0 24 24" className={className} {...common}>
                <path d="M17 15a4 4 0 0 0 0-8 6 6 0 0 0-11.6 1.6A3.5 3.5 0 0 0 6 15M8 18l-1 3M12 18l-1 3M16 18l-1 3" />
            </svg>
        );
    if (kind === "snow")
        return (
            <svg viewBox="0 0 24 24" className={className} {...common}>
                <path d="M17 15a4 4 0 0 0 0-8 6 6 0 0 0-11.6 1.6A3.5 3.5 0 0 0 6 15M8 18v.01M12 19v.01M16 18v.01" />
            </svg>
        );
    if (kind === "storm")
        return (
            <svg viewBox="0 0 24 24" className={className} {...common}>
                <path d="M17 14a4 4 0 0 0 0-8 6 6 0 0 0-11.6 1.6A3.5 3.5 0 0 0 6 14M13 12l-2 4h3l-1 4" />
            </svg>
        );
    return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
            <path d="M4 15h16M4 10h16M4 6h10M4 19h10" />
        </svg>
    );
}

// ============================================
// WEATHER HOOK
// ============================================
function useWeather() {
    const [data, setData] = useState<WeatherAdvice | null>(null);
    const [status, setStatus] = useState<"idle" | "loading" | "ready" | "denied" | "error">("idle");
    const [refreshTick, setRefreshTick] = useState(0);

    const refresh = useCallback(() => setRefreshTick((n) => n + 1), []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!("geolocation" in navigator)) {
            setStatus("error");
            return;
        }

        try {
            sessionStorage.removeItem("weatherAdvice");
            sessionStorage.removeItem("weatherAdvice_v3");
        } catch { /* ignore */ }

        let cancelled = false;
        setStatus("loading");

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const { latitude, longitude } = pos.coords;

                    const [weatherRes, location] = await Promise.all([
                        fetch(
                            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
                            `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,uv_index` +
                            `&timezone=auto`,
                            { cache: "no-store" }
                        ),
                        reverseGeocode(latitude, longitude),
                    ]);

                    const json = await weatherRes.json();
                    if (cancelled) return;

                    const tempC = Math.round(json?.current?.temperature_2m ?? 0);
                    const feelsLikeC = Math.round(json?.current?.apparent_temperature ?? tempC);
                    const humidity = Math.round(json?.current?.relative_humidity_2m ?? 0);
                    const uvIndex = Math.round(json?.current?.uv_index ?? 0);
                    const code = json?.current?.weather_code ?? 0;
                    const { condition, icon } = decodeCode(code);

                    const hour = new Date().getHours();
                    const { advice, tone } = buildAdvice({ tempC, feelsLikeC, humidity, uvIndex, icon, hour });

                    setData({
                        tempC, feelsLikeC, humidity, uvIndex, code,
                        condition, icon, advice, tone, location,
                        isNight: hour >= 21 || hour < 5,
                    });
                    setStatus("ready");
                } catch {
                    if (!cancelled) setStatus("error");
                }
            },
            () => { if (!cancelled) setStatus("denied"); },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
        );

        return () => { cancelled = true; };
    }, [refreshTick]);

    return { data, status, refresh };
}

// ============================================
// LIVE CLOCK — updates every 30s
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
// GREETINGS CARD — TOP: GREETING, BOTTOM: DETAILS
// ============================================
export default function GreetingsCard() {
    const user = useUser();
    const { data: weather, status: weatherStatus, refresh: refreshWeather } = useWeather();

    const [name, setName] = useState<string>(() => {
        if (typeof window === "undefined") return "Nurse";
        return localStorage.getItem("userName") || "Nurse";
    });

    const [imageFailed, setImageFailed] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const now = useClock();
    const theme = useMemo(() => getTimeTheme(now.getHours()), [now]);
    const heroImage = TIME_IMAGES[theme.icon];
    const dailyTag = useMemo(() => getDailyTag(now), [now.getDate()]);

    useEffect(() => {
        setImageFailed(false);
        setImageLoaded(false);
    }, [heroImage]);

    const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
    const dateLine = now.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    const clock = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const mood = DAILY_MOOD[weekday] || "";

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
            } catch { /* silent */ }
        };
        fetchName();
        return () => { cancelled = true; };
    }, [user?.id]);

    return (
        <section className="px-2 sm:px-0 pt-0 pb-0">
            <div
                className="
                relative overflow-hidden
                rounded-2xl
                h-[230px] md:h-[250px]
                bg-slate-900
                isolate
            "
            >
                {/* ---- LAYER 0: base fallback ---- */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />

                {/* ---- LAYER 1: hero image — SHARP ---- */}
                {!imageFailed && (
                    <img
                        src={heroImage}
                        alt=""
                        aria-hidden="true"
                        referrerPolicy="no-referrer"
                        className={`
                        absolute inset-0 w-full h-full object-cover
                        transition-opacity duration-700 ease-out
                        ${imageLoaded ? "opacity-100" : "opacity-0"}
                    `}
                        loading="eager"
                        decoding="async"
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageFailed(true)}
                    />
                )}

                {/* ---- LAYER 2: dark scrim so text is readable ---- */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

                {/* ---- LAYER 3: subtle theme accent (top-right glow) ---- */}
                <div
                    className={`
                    absolute -top-32 -right-24 w-72 h-72 rounded-full
                    bg-gradient-to-br ${theme.accent}
                    opacity-[0.15]
                    blur-3xl
                    pointer-events-none
                `}
                />

                {/* ---- LAYER 4: red brand line at top ---- */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#FF1F1F] to-transparent opacity-80" />

                {/* ---- LAYER 5: content ---- */}
                <div className="relative h-full flex flex-col justify-between p-4 md:p-5">

                    {/* TOP — GREETING + NAME */}
                    <div>
                        <h1 className="text-[24px] leading-tight md:text-[30px] font-semibold tracking-tight text-white drop-shadow-md">
                            {theme.greeting}, {name}
                        </h1>

                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="
                            inline-flex items-center
                            px-2.5 py-1 rounded-full
                            text-[11px] md:text-[12px] font-medium
                            bg-[#FF1F1F]/90 text-white
                            backdrop-blur-sm
                        ">
                                {dailyTag}
                            </span>
                        </div>
                    </div>

                    {/* BOTTOM — DAY, TIME, WEATHER */}
                    <div>
                        {/* Row 1 */}
                        <div className="flex items-center justify-between gap-3 text-[11px] md:text-xs font-medium text-white/80">
                            <div className="flex items-center gap-2">
                                <span className="uppercase tracking-[0.14em]">{weekday}</span>
                                <span className="w-1 h-1 rounded-full bg-white/40" />
                                <span>{dateLine}</span>
                            </div>

                            <div className="
                            flex items-center gap-1.5
                            px-2 py-0.5 md:px-2.5 md:py-1 rounded-full
                            text-[10px] md:text-[11px] font-medium
                            bg-white/15 text-white backdrop-blur-sm
                        ">
                                <TimeIcon kind={theme.icon} className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                <span>{theme.label}</span>
                                <span className="opacity-60">·</span>
                                <span className="tabular-nums">{clock}</span>
                            </div>
                        </div>

                        {/* Row 2 — weather */}
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                            {weatherStatus === "ready" && weather ? (
                                <>
                                    {weather.location && (
                                        <>
                                            <button
                                                onClick={refreshWeather}
                                                title="Tap to refresh location"
                                                className="
                                                text-[12px] md:text-sm font-medium
                                                text-white
                                                hover:text-white/80
                                                underline decoration-dotted underline-offset-2
                                                transition-colors
                                            "
                                            >
                                                {weather.location}
                                            </button>
                                            <span className="w-1 h-1 rounded-full bg-white/40" />
                                        </>
                                    )}

                                    <div className="flex items-center gap-1.5 text-white">
                                        <WeatherIcon kind={weather.icon} className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                        <span className="text-[12px] md:text-sm font-medium tabular-nums">
                                            {weather.tempC}°C
                                        </span>
                                        {Math.abs(weather.feelsLikeC - weather.tempC) >= 3 && (
                                            <span className="text-[11px] md:text-xs opacity-70 tabular-nums">
                                                (feels {weather.feelsLikeC}°)
                                            </span>
                                        )}
                                        <span className="text-[12px] md:text-sm opacity-80">
                                            {weather.condition}
                                        </span>
                                    </div>

                                    <span className="hidden sm:block w-1 h-1 rounded-full bg-white/40" />

                                    <span className="text-[12px] md:text-sm text-white/75">
                                        {weather.advice}
                                    </span>
                                </>
                            ) : (
                                <span className="text-[12px] md:text-sm font-normal text-white/70">
                                    {weatherStatus === "loading" ? "Checking conditions…" : mood}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ❌ NO shimmer sweep */}
                {/* ❌ NO blur on image */}
                {/* ❌ NO opacity wash on image */}
            </div>
        </section>
    );
}