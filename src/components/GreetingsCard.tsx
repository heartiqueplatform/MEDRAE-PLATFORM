// src/components/GreetingsCard.tsx
"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

// ============================================
// SHORT DAILY MOOD — one phrase per day (fallback)
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
    label: string;
    icon: "sunrise" | "sun" | "sunset" | "moon";
    accent: string;
    glow: string;
    chip: string;
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

// ============================================
// NURSING / CLINICAL ADVISORY ENGINE
// No em dashes. Periods and commas only.
// ============================================
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
        return {
            advice: "Extreme heat today. Hydrate every 30 minutes and watch for heat exhaustion in patients on diuretics.",
            tone: "alert",
        };
    }
    if (feelsLikeC >= 32) {
        return {
            advice: "High heat. Push fluids and monitor elderly and cardiac patients for dehydration.",
            tone: "alert",
        };
    }
    if (feelsLikeC >= 28 && humidity >= 70) {
        return {
            advice: "Hot and humid. Heat stress risk is up, so dress light and stay hydrated.",
            tone: "alert",
        };
    }

    if (feelsLikeC <= 0) {
        return {
            advice: "Freezing out. Cover extremities and watch for hypothermia in frail patients.",
            tone: "warm",
        };
    }
    if (feelsLikeC <= 8) {
        return {
            advice: "Cold out. Layer up and mind icy surfaces on the way in.",
            tone: "warm",
        };
    }
    if (feelsLikeC <= 14 && humidity >= 80) {
        return {
            advice: "Cold and damp. Respiratory flare risk is higher, so keep warm between wards.",
            tone: "warm",
        };
    }

    if (!night && uvIndex >= 8) {
        return {
            advice: "Very high UV today. SPF 50, a hat, and sunglasses help, since sun exposure adds fatigue.",
            tone: "alert",
        };
    }
    if (!night && uvIndex >= 6) {
        return {
            advice: "High UV. Sunscreen is advised and shade is your friend between commutes.",
            tone: "cool",
        };
    }

    if (icon === "fog") {
        return {
            advice: "Foggy out. Low visibility, so take care driving to shift.",
            tone: "cool",
        };
    }
    if (icon === "storm") {
        return {
            advice: "Stormy out. Expect an ED surge and stay safe on the commute.",
            tone: "alert",
        };
    }
    if (icon === "snow") {
        return {
            advice: "Snow today. Falls risk is elevated, so tread carefully outdoors.",
            tone: "warm",
        };
    }
    if (icon === "rain") {
        return {
            advice: "Rainy out. Slippery floors, so extra caution for at risk patients.",
            tone: "cool",
        };
    }

    if (humidity <= 30 && tempC >= 18) {
        return {
            advice: "Dry air today. Sip water often and watch for dry mucous membranes.",
            tone: "cool",
        };
    }

    if (feelsLikeC >= 18 && feelsLikeC <= 24 && humidity < 70) {
        if (early) {
            return {
                advice: "Mild and calm. A good morning for shift handover outdoors.",
                tone: "neutral",
            };
        }
        if (night) {
            return {
                advice: "Comfortable night. A light layer is enough for late rounds.",
                tone: "neutral",
            };
        }
        return {
            advice: "Comfortable out. Ideal shift weather, so stay hydrated.",
            tone: "neutral",
        };
    }

    if (icon === "cloud" && night) {
        return {
            advice: "Cool evening. A light layer helps.",
            tone: "cool",
        };
    }
    return {
        advice: "Steady conditions. A good day to be on your feet.",
        tone: "neutral",
    };
}

// ============================================
// REVERSE GEOCODE — city name only, no key needed
// ============================================
async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
    try {
        const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        );
        const json = await res.json();
        return (
            json?.city ||
            json?.locality ||
            json?.principalSubdivision ||
            json?.countryName ||
            null
        );
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
// WEATHER HOOK — inlined, no extra file needed
// ============================================
const WEATHER_CACHE_KEY = "weatherAdvice_v3";

function useWeather() {
    const [data, setData] = useState<WeatherAdvice | null>(null);
    const [status, setStatus] = useState<"idle" | "loading" | "ready" | "denied" | "error">("idle");
    const [refreshTick, setRefreshTick] = useState(0);

    // call this to force a fresh reading
    const refresh = useCallback(() => setRefreshTick((n) => n + 1), []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!("geolocation" in navigator)) {
            setStatus("error");
            return;
        }

        // Wipe any stale weather caches from previous versions
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
                            { cache: "no-store" }   // bypass browser HTTP cache too
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
                    const { advice, tone } = buildAdvice({
                        tempC, feelsLikeC, humidity, uvIndex, icon, hour,
                    });

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
            {
                enableHighAccuracy: true,   // force GPS/Wi-Fi, not IP
                maximumAge: 0,              // never accept a cached position
                timeout: 12000,             // wait up to 12s for a real fix
            }
        );

        return () => { cancelled = true; };
    }, [refreshTick]);  // re-runs every time you call refresh()

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
// TONE → COLOR MAP
// ============================================
const TONE_CLASSES: Record<WeatherAdvice["tone"], string> = {
    warm: "text-amber-700 dark:text-amber-300",
    cool: "text-sky-700 dark:text-sky-300",
    neutral: "text-slate-500 dark:text-slate-400",
    alert: "text-rose-700 dark:text-rose-300",
};

// ============================================
// GREETINGS CARD
// ============================================
export default function GreetingsCard() {
    const user = useUser();
    const { data: weather, status: weatherStatus, refresh: refreshWeather } = useWeather();

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

    // Fetch name once, only if not cached
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
                // Silent fail, fallback is "Nurse"
            }
        };
        fetchName();
        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    return (
        <section className="px-2 sm:px-0 pt-0 pb-0">
            <div
                className="relative overflow-hidden rounded-none md:rounded-xl
                border-0
                bg-white dark:bg-muted/30
                shadow-none"
            >
                {/* Accent bar reflects time of day */}
                <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${theme.accent}`} />

                {/* Soft ambient glow */}
                <div
                    className={`pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-gradient-to-br ${theme.glow} to-transparent blur-3xl`}
                />

                <div className="relative px-4 md:px-6 py-4 md:py-5">
                    {/* Row 1 — day + time chip */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[11px] md:text-xs font-medium text-slate-500 dark:text-slate-400">
                            <span className="uppercase tracking-[0.14em]">{weekday}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <span>{dateLine}</span>
                        </div>

                        <div
                            className={`flex items-center gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[10px] md:text-[11px] font-medium ${theme.chip}`}
                        >
                            <TimeIcon kind={theme.icon} className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            <span>{theme.label}</span>
                            <span className="opacity-60">·</span>
                            <span className="tabular-nums">{clock}</span>
                        </div>
                    </div>

                    {/* Row 2 — greeting */}
                    <h1
                        className="mt-3 md:mt-4 text-[22px] leading-tight md:text-3xl lg:text-[26px]
                        font-semibold tracking-tight text-slate-900 dark:text-white"
                    >
                        {theme.greeting},{" "}
                        <span className="relative inline-block">
                            <span className="relative z-10">{name}</span>
                            <span
                                className={`absolute left-0 -bottom-0.5 h-[3px] w-full rounded-full bg-gradient-to-r ${theme.accent} opacity-70`}
                            />
                        </span>
                    </h1>

                    {/* Row 3 — weather + clinical advice, falls back to daily mood */}
                    <div className="mt-2.5 md:mt-3 flex items-center gap-2.5 flex-wrap">
                        {weatherStatus === "ready" && weather ? (
                            <>
                                {/* Location */}
                                {weather.location && (
                                    <>
                                        <button
                                            onClick={refreshWeather}
                                            title="Tap to refresh location"
                                            className="text-[12px] md:text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline decoration-dotted underline-offset-2 transition-colors"
                                        >
                                            {weather.location}
                                        </button>
                                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                    </>
                                )}

                                {/* Temp + condition */}
                                <div className={`flex items-center gap-1.5 ${TONE_CLASSES[weather.tone]}`}>
                                    <WeatherIcon kind={weather.icon} className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                    <span className="text-[12px] md:text-sm font-medium tabular-nums">
                                        {weather.tempC}°C
                                    </span>
                                    {Math.abs(weather.feelsLikeC - weather.tempC) >= 3 && (
                                        <span className="text-[11px] md:text-xs opacity-60 tabular-nums">
                                            (feels {weather.feelsLikeC}°)
                                        </span>
                                    )}
                                    <span className="text-[12px] md:text-sm opacity-70">
                                        {weather.condition}
                                    </span>
                                </div>

                                <span className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />

                                {/* Nursing advice */}
                                <span
                                    className={`text-[12px] md:text-sm opacity-90 ${TONE_CLASSES[weather.tone]}`}
                                >
                                    {weather.advice}
                                </span>
                            </>
                        ) : (
                            <span className="text-[12px] md:text-sm font-normal text-slate-500 dark:text-slate-400">
                                {weatherStatus === "loading" ? "Checking conditions…" : mood}
                            </span>
                        )}
                        <span className="hidden sm:block flex-1 h-px bg-slate-200/70 dark:bg-slate-800/70" />
                    </div>
                </div>
            </div>
        </section>
    );
}