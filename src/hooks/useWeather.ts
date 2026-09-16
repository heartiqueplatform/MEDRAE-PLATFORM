"use client";
import { useEffect, useState } from "react";

export type WeatherAdvice = {
    tempC: number;
    feelsLikeC: number;
    humidity: number;
    uvIndex: number;
    code: number;
    condition: string;
    icon: "sun" | "cloud" | "rain" | "snow" | "storm" | "fog";
    advice: string;
    tone: "warm" | "cool" | "neutral" | "alert";
    location: string | null;
    isNight: boolean;
};

// WMO weather codes → label + icon
function decodeCode(code: number): { condition: string; icon: WeatherAdvice["icon"] } {
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

    // ============================================
    // NURSING / CLINICAL ADVISORY ENGINE
    // Priority: heat stress → cold stress → UV → respiratory → falls risk → hydration
    // ============================================
    function buildAdvice(input: {
        tempC: number;
        feelsLikeC: number;
        humidity: number;
        uvIndex: number;
        icon: WeatherAdvice["icon"];
        hour: number;
    }): { advice: string; tone: WeatherAdvice["tone"] } {
        const { tempC, feelsLikeC, humidity, uvIndex, icon, hour } = input;
        const night = hour >= 21 || hour < 5;
        const early = hour >= 5 && hour < 7;

        // ── EXTREME HEAT ──
        if (feelsLikeC >= 38) {
            return {
                advice: "Extreme heat — hydrate q30min, watch for heat exhaustion in patients on diuretics.",
                tone: "alert",
            };
        }
        if (feelsLikeC >= 32) {
            return {
                advice: "High heat — push fluids, monitor elderly & cardiac patients for dehydration.",
                tone: "alert",
            };
        }
        if (feelsLikeC >= 28 && humidity >= 70) {
            return {
                advice: "Hot & humid — increased heat stress risk, dress light, stay hydrated.",
                tone: "alert",
            };
        }

        // ── EXTREME COLD ──
        if (feelsLikeC <= 0) {
            return {
                advice: "Freezing — cover extremities, risk of hypothermia in frail patients.",
                tone: "warm",
            };
        }
        if (feelsLikeC <= 8) {
            return {
                advice: "Cold — layer up, mind icy surfaces on the way in.",
                tone: "warm",
            };
        }
        if (feelsLikeC <= 14 && humidity >= 80) {
            return {
                advice: "Cold & damp — respiratory flare risk, keep warm between wards.",
                tone: "warm",
            };
        }

        // ── UV (daytime only) ──
        if (!night && uvIndex >= 8) {
            return {
                advice: "Very high UV — SPF 50, hat, sunglasses; sun exposure adds fatigue.",
                tone: "alert",
            };
        }
        if (!night && uvIndex >= 6) {
            return {
                advice: "High UV — sunscreen advised, seek shade between commutes.",
                tone: "cool",
            };
        }

        // ── RESPIRATORY / AIR ──
        if (icon === "fog") {
            return {
                advice: "Foggy — low visibility, caution driving to shift.",
                tone: "cool",
            };
        }
        if (icon === "storm") {
            return {
                advice: "Stormy — expect ED surge; stay safe commuting.",
                tone: "alert",
            };
        }
        if (icon === "snow") {
            return {
                advice: "Snow — falls risk elevated, tread carefully outdoors.",
                tone: "warm",
            };
        }
        if (icon === "rain") {
            return {
                advice: "Rainy — slippery floors, extra caution for at-risk patients.",
                tone: "cool",
            };
        }

        // ── LOW HUMIDITY (dry air, common in AC wards) ──
        if (humidity <= 30 && tempC >= 18) {
            return {
                advice: "Dry air — sip water often, watch for dry mucous membranes.",
                tone: "cool",
            };
        }

        // ── COMFORTABLE WINDOWS ──
        if (feelsLikeC >= 18 && feelsLikeC <= 24 && humidity < 70) {
            if (early) {
                return {
                    advice: "Mild — a good morning for shift handover outdoors.",
                    tone: "neutral",
                };
            }
            if (night) {
                return {
                    advice: "Comfortable night — light layer for late rounds.",
                    tone: "neutral",
                };
            }
            return {
                advice: "Comfortable — ideal shift weather, stay hydrated.",
                tone: "neutral",
            };
        }

        // ── FALLBACK ──
        if (icon === "cloud" && night) {
            return { advice: "Cool evening — a light layer helps.", tone: "cool" };
        }
        return {
            advice: "Steady conditions — good day to be on your feet.",
            tone: "neutral",
        };
    }

    // Reverse geocode — city name only, no key needed
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

    export function useWeather() {
        const [data, setData] = useState<WeatherAdvice | null>(null);
        const [status, setStatus] = useState<"idle" | "loading" | "ready" | "denied" | "error">("idle");

        useEffect(() => {
            if (typeof window === "undefined") return;
            if (!("geolocation" in navigator)) {
                setStatus("error");
                return;
            }

            // Session cache — avoids re-prompt & re-fetch
            const CACHE_KEY = "weatherAdvice_v3";
            const cached = sessionStorage.getItem(CACHE_KEY);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached) as WeatherAdvice;
                    // Refresh advice if hour changed (so greeting stays correct)
                    const { advice, tone } = buildAdvice({
                        tempC: parsed.tempC,
                        feelsLikeC: parsed.feelsLikeC,
                        humidity: parsed.humidity,
                        uvIndex: parsed.uvIndex,
                        icon: parsed.icon,
                        hour: new Date().getHours(),
                    });
                    setData({ ...parsed, advice, tone });
                    setStatus("ready");
                    return;
                } catch {
                    /* ignore corrupt cache */
                }
            }

            let cancelled = false;
            setStatus("loading");

            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    try {
                        const { latitude, longitude } = pos.coords;

                        // Fetch weather + location in parallel
                        const [weatherRes, location] = await Promise.all([
                            fetch(
                                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
                                `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,uv_index` +
                                `&timezone=auto`
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

                        const { advice, tone } = buildAdvice({
                            tempC,
                            feelsLikeC,
                            humidity,
                            uvIndex,
                            icon,
                            hour: new Date().getHours(),
                        });

                        const payload: WeatherAdvice = {
                            tempC,
                            feelsLikeC,
                            humidity,
                            uvIndex,
                            code,
                            condition,
                            icon,
                            advice,
                            tone,
                            location,
                            isNight: new Date().getHours() >= 21 || new Date().getHours() < 5,
                        };

                        setData(payload);
                        setStatus("ready");
                        try {
                            sessionStorage.setItem("weatherAdvice", JSON.stringify(payload));
                            sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
                        } catch {
                            /* quota errors */
                        }
                    } catch {
                        if (!cancelled) setStatus("error");
                    }
                },
                () => {
                    if (!cancelled) setStatus("denied");
                },
                { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
            );

            return () => {
                cancelled = true;
            };
        }, []);

        return { data, status };
    }