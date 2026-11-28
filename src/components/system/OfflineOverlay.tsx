// src/components/system/OfflineOverlay.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { WifiOff, Wifi, Check } from "lucide-react";
import { useConnectivity } from "@/context/ConnectivityContext";
import { playSound } from "@/lib/soundManager";
import OfflineLottie from "@/components/OfflineLottie";

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = () => {

    vibrate(15);
};

const DISMISSED_KEY = "offline_overlay_dismissed";

export function OfflineOverlay() {
    const { isOnline } = useConnectivity();

    const [open, setOpen] = useState(false);
    const [showRecovered, setShowRecovered] = useState(false);
    const wasOfflineRef = useRef(false);

    useEffect(() => {
        if (!isOnline) {
            const dismissed =
                typeof sessionStorage !== "undefined" &&
                sessionStorage.getItem(DISMISSED_KEY) === "1";
            if (!dismissed) setOpen(true);
            wasOfflineRef.current = true;
        } else {
            setOpen(false);
            if (wasOfflineRef.current) {
                setShowRecovered(true);

                vibrate([10, 40, 10]);
                try { sessionStorage.removeItem(DISMISSED_KEY); } catch { /* silent */ }
                const t = setTimeout(() => setShowRecovered(false), 3000);
                wasOfflineRef.current = false;
                return () => clearTimeout(t);
            }
        }
    }, [isOnline]);

    const handleContinue = () => {
        tap();
        try { sessionStorage.setItem(DISMISSED_KEY, "1"); } catch { /* silent */ }
        setOpen(false);
    };

    // ── Small recovery pill (tiny, doesn't block) ──────────
    if (showRecovered && isOnline) {
        return (
            <div className="fixed top-3 inset-x-0 z-[9999] px-3 pointer-events-none flex justify-center">
                <div
                    className="pointer-events-auto rounded-2xl px-3 py-2
                               bg-emerald-50 dark:bg-emerald-400/10
                               flex items-center gap-2"
                    role="status"
                    aria-live="polite"
                >
                    <Wifi className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={2.2} />
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        Back online. Syncing now.
                    </span>
                </div>
            </div>
        );
    }

    if (!open) return null;

    // ── Full-bleed overlay — edge to edge ──────────────────
    return (
        <div
            className="fixed inset-0 z-[9999]
                       bg-white dark:bg-[#0d1117]
                       flex flex-col
                       animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="offline-title"
            aria-describedby="offline-desc"
        >
            {/* ── Scrollable body ────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <div
                    className="
                        min-h-full
                        flex flex-col items-center justify-center
                        px-5 sm:px-8 lg:px-12
                        py-8 sm:py-10
                        max-w-2xl mx-auto w-full
                    "
                >
                    {/* ── Lottie — big, responsive ─────────── */}
                    <div
                        className="
                            w-48 h-48
                            sm:w-60 sm:h-60
                            md:w-72 md:h-72
                            lg:w-80 lg:h-80
                            xl:w-[360px] xl:h-[360px]
                            shrink-0
                        "
                    >
                        <OfflineLottie />
                    </div>

                    {/* ── Text ─────────────────────────────── */}
                    <div className="mt-6 sm:mt-8 text-center space-y-2 max-w-md">
                        <h2
                            id="offline-title"
                            className="
                                text-2xl sm:text-3xl lg:text-4xl
                                font-bold tracking-tight
                                text-slate-900 dark:text-white
                            "
                        >
                            You're offline
                        </h2>
                        <p
                            id="offline-desc"
                            className="
                                text-sm sm:text-base
                                text-slate-500 dark:text-slate-400
                                leading-relaxed
                            "
                        >
                            No internet connection detected. You can still browse
                            what's already loaded. New content will sync once
                            you're back online.
                        </p>
                    </div>

                    {/* ── Feature list ─────────────────────── */}
                    <div
                        className="
                            mt-6 sm:mt-8
                            w-full max-w-sm
                            rounded-2xl
                            bg-slate-50 dark:bg-white/[0.03]
                            px-4 sm:px-5
                            py-3.5 sm:py-4
                            space-y-2.5
                        "
                    >
                        {[
                            "Cached lessons and notes stay available",
                            "Your progress is saved locally",
                            "Everything syncs automatically on reconnect",
                        ].map((line, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                                <Check
                                    className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                                    strokeWidth={2.4}
                                />
                                <span className="text-[13px] sm:text-sm text-slate-600 dark:text-slate-300 leading-snug">
                                    {line}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* ── Actions ──────────────────────────── */}
                    <div className="mt-6 sm:mt-8 w-full max-w-sm space-y-2.5">
                        <button
                            type="button"
                            onClick={handleContinue}
                            className="
                                w-full h-12 sm:h-13
                                rounded-2xl
                                bg-violet-600 text-white
                                text-sm sm:text-base font-bold
                                active:scale-[0.97] transition-transform
                                flex items-center justify-center gap-1.5
                                focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60
                            "
                            style={{ touchAction: "manipulation" }}
                        >
                            Continue offline
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                tap();
                                window.location.reload();
                            }}
                            className="
                                w-full h-11
                                rounded-2xl
                                bg-slate-100 dark:bg-white/[0.06]
                                text-slate-700 dark:text-slate-300
                                text-xs sm:text-[13px] font-semibold
                                active:scale-[0.97] transition-transform
                                flex items-center justify-center gap-1.5
                                focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40
                            "
                            style={{ touchAction: "manipulation" }}
                        >
                            <Wifi className="h-3.5 w-3.5" strokeWidth={2.4} />
                            Retry connection
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}