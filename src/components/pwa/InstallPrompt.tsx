"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
    Download,
    Share,
    Plus,
    Smartphone,
    MoreVertical,
    WifiOff,
    Rocket,
    Home,
} from "lucide-react";
import { CenteredModal } from "@/components/ui/CenteredModal";

/* ============================================================
   Smart PWA install prompt
   ------------------------------------------------------------
   SHOWS ONLY WHEN RELEVANT:
   - After the user has spent real time in the app (30s+)
   - Not on the first page they land on
   - Not during exam / simulation / quiz / challenge / assessment
   - Not if installed
   - Not within 3 days of "Not now"
   ============================================================ */

const STORAGE_KEYS = {
    installed: "pwa_installed_flag",
    dismissedUntil: "pwa_install_dismissed_until",
    sessionSeen: "pwa_install_session_seen",
};

const CONFIG = {
    /** Seconds of engaged time in the app before we consider prompting */
    minEngagedSeconds: 30,
    /** Days to hide after "Not now" */
    dismissDays: 3,
};

const SHORT_CODE = "MEDRAENURSING254";
const PRODUCTION_URL = "https://medrae.vercel.app";
const REDIRECT_URL = `${PRODUCTION_URL}/go/${SHORT_CODE}`;

type Platform = "ios" | "android" | "desktop" | "other";

function detectPlatform(): Platform {
    if (typeof navigator === "undefined") return "other";
    const ua = navigator.userAgent || "";
    const isIOS =
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
    if (isIOS) return "ios";
    if (/Android/i.test(ua)) return "android";
    if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) return "desktop";
    return "other";
}

function isStandalone(): boolean {
    if (typeof window === "undefined") return false;
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.startsWith("android-app://")
    );
}

function isInCriticalFlow(): boolean {
    if (typeof window === "undefined") return false;
    const p = window.location.pathname;
    return (
        p.includes("/exam") ||
        p.includes("/simulation") ||
        p.includes("/quiz") ||
        p.includes("/challenge") ||
        p.includes("/assessment")
    );
}

function canShowPrompt(): boolean {
    try {
        if (isStandalone()) return false;
        if (localStorage.getItem(STORAGE_KEYS.installed) === "1") return false;
        if (isInCriticalFlow()) return false;

        const until = localStorage.getItem(STORAGE_KEYS.dismissedUntil);
        if (until && Date.now() < parseInt(until, 10)) return false;

        // Only once per browser session — prevents nagging on every route
        if (sessionStorage.getItem(STORAGE_KEYS.sessionSeen) === "1") return false;

        return true;
    } catch {
        return false;
    }
}

/* ------------------------------------------------------------------ */
/*  Small pieces                                                      */
/* ------------------------------------------------------------------ */

const BenefitPill = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-[#0d1117] px-3 py-2
                    text-[11px] font-bold text-slate-600 dark:text-slate-400">
        <span className="text-emerald-600 dark:text-emerald-400">{icon}</span>
        <span>{label}</span>
    </div>
);

const Step = ({
    n,
    icon,
    children,
}: {
    n: number;
    icon?: React.ReactNode;
    children: React.ReactNode;
}) => (
    <div className="flex items-start gap-3">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full
                        bg-blue-600 text-white text-[11px] font-bold">
            {n}
        </div>
        <div className="flex-1 pt-0.5 text-[12px] leading-relaxed text-slate-700 dark:text-slate-300">
            {children}
        </div>
        {icon && <div className="pt-0.5 text-slate-400 dark:text-slate-500">{icon}</div>}
    </div>
);

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

export default function InstallPrompt() {
    const [open, setOpen] = useState(false);
    const [platform, setPlatform] = useState<Platform>("other");
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [installing, setInstalling] = useState(false);

    /* ---- Capture native install prompt ---- */
    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            (window as any).__deferredInstallPrompt = e;
        };
        window.addEventListener("beforeinstallprompt", handler);
        const stashed = (window as any).__deferredInstallPrompt;
        if (stashed) setDeferredPrompt(stashed);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    /* ---- Mark installed permanently ---- */
    useEffect(() => {
        const handler = () => {
            try {
                localStorage.setItem(STORAGE_KEYS.installed, "1");
            } catch { }
            setOpen(false);
            toast.success("Medrae installed 🎉", {
                description: "You can now open it from your home screen.",
            });
        };
        window.addEventListener("appinstalled", handler);
        return () => window.removeEventListener("appinstalled", handler);
    }, []);

    /* ---- Show only after engaged time ---- */
    useEffect(() => {
        setPlatform(detectPlatform());

        // Track active time (tab-focused only)
        let activeMs = 0;
        let lastTick = Date.now();
        let intervalId: NodeJS.Timeout | null = null;

        const tryFire = () => {
            if (!canShowPrompt()) return;
            setOpen(true);
            try {
                sessionStorage.setItem(STORAGE_KEYS.sessionSeen, "1");
            } catch { }
            if (intervalId) clearInterval(intervalId);
        };

        const tick = () => {
            if (document.hidden) {
                lastTick = Date.now();
                return;
            }
            const now = Date.now();
            activeMs += now - lastTick;
            lastTick = now;

            if (activeMs >= CONFIG.minEngagedSeconds * 1000) {
                tryFire();
            }
        };

        intervalId = setInterval(tick, 2000);

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, []);

    /* ---- Dismiss (3-day cooldown) ---- */
    const dismiss = useCallback(() => {
        try {
            localStorage.setItem(
                STORAGE_KEYS.dismissedUntil,
                String(Date.now() + CONFIG.dismissDays * 24 * 60 * 60 * 1000)
            );
        } catch { }
        setOpen(false);
    }, []);

    const handleInstallClick = useCallback(async () => {
        if (deferredPrompt) {
            setInstalling(true);
            try {
                deferredPrompt.prompt();
                const choice = await deferredPrompt.userChoice;
                if (choice.outcome === "accepted") {
                    try {
                        localStorage.setItem(STORAGE_KEYS.installed, "1");
                    } catch { }
                    setOpen(false);
                } else {
                    dismiss();
                }
            } catch (err) {
                console.warn("Install prompt failed:", err);
                toast.error("Couldn't open install dialog", {
                    description: "Please use your browser menu → 'Install app'.",
                });
            } finally {
                setDeferredPrompt(null);
                setInstalling(false);
            }
            return;
        }

        if (platform === "ios") return;

        toast.info("Install Medrae", {
            description:
                "Open your browser menu (⋮ or ⋯) and choose 'Install Medrae' or 'Add to Home Screen'.",
            duration: 8000,
        });
    }, [deferredPrompt, platform, dismiss]);

    /* ---- Empty platform render (nothing to show) ---- */
    if (platform === "other") return null;

    const showNativeButton = !!deferredPrompt;

    return (
        <CenteredModal
            open={open}
            onClose={dismiss}
            title="Install Medrae"
            maxWidthClass="max-w-md"
            maxHeight="85vh"
        >
            <div className="px-4 pb-4 pt-1 space-y-4">
                {/* Subtitle */}
                <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-snug text-center">
                    Faster, offline-ready, one tap from your home screen.
                </p>

                {/* Benefit grid */}
                <div className="grid grid-cols-2 gap-2">
                    <BenefitPill icon={<WifiOff className="h-3.5 w-3.5" />} label="Works offline" />
                    <BenefitPill icon={<Rocket className="h-3.5 w-3.5" />} label="Faster loads" />
                    <BenefitPill icon={<Home className="h-3.5 w-3.5" />} label="Home icon" />
                    <BenefitPill icon={<Smartphone className="h-3.5 w-3.5" />} label="Study on the go" />
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-100 dark:bg-white/[0.04]" />

                {/* iOS */}
                {platform === "ios" && (
                    <div className="space-y-3">
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white">
                            To install on iPhone / iPad:
                        </p>
                        <Step n={1} icon={<Share className="h-3.5 w-3.5" />}>
                            Tap the <strong>Share</strong> button in Safari.
                        </Step>
                        <Step n={2} icon={<Plus className="h-3.5 w-3.5" />}>
                            Scroll and tap <strong>Add to Home Screen</strong>.
                        </Step>
                        <Step n={3}>Tap <strong>Add</strong>. Done! 🎉</Step>

                        <div className="rounded-xl bg-amber-50 dark:bg-amber-400/10 p-3
                                        text-[11px] font-bold text-amber-700 dark:text-amber-400">
                            ⚠️ Must be done in <strong>Safari</strong>. Chrome on iOS can't install PWAs.
                        </div>

                        <button
                            onClick={dismiss}
                            className="w-full h-10 rounded-xl
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-700 dark:text-slate-200 text-[13px] font-bold
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            I'll do it later
                        </button>
                    </div>
                )}

                {/* Android + native prompt */}
                {platform === "android" && showNativeButton && (
                    <div className="space-y-3">
                        <button
                            onClick={handleInstallClick}
                            disabled={installing}
                            className="w-full h-11 rounded-xl bg-blue-600 text-white text-[13px] font-bold
                                       flex items-center justify-center gap-1.5
                                       active:scale-[0.97] transition-transform disabled:opacity-60"
                            style={{ touchAction: "manipulation" }}
                        >
                            <Download className="h-4 w-4" />
                            {installing ? "Installing…" : "Install Medrae"}
                        </button>
                        <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
                            One tap. Works offline instantly.
                        </p>
                    </div>
                )}

                {/* Android without native prompt */}
                {platform === "android" && !showNativeButton && (
                    <div className="space-y-3">
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white">
                            To install on Android:
                        </p>
                        <Step n={1} icon={<MoreVertical className="h-3.5 w-3.5" />}>
                            Tap the <strong>⋮ menu</strong> in Chrome.
                        </Step>
                        <Step n={2}>
                            Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                        </Step>
                        <Step n={3}>Confirm. Done! 🎉</Step>

                        <button
                            onClick={dismiss}
                            className="w-full h-10 rounded-xl
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-700 dark:text-slate-200 text-[13px] font-bold
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            I'll do it later
                        </button>
                    </div>
                )}

                {/* Desktop */}
                {platform === "desktop" && (
                    <div className="space-y-3">
                        {showNativeButton && (
                            <button
                                onClick={handleInstallClick}
                                disabled={installing}
                                className="w-full h-11 rounded-xl bg-blue-600 text-white text-[13px] font-bold
                                           flex items-center justify-center gap-1.5
                                           active:scale-[0.97] transition-transform disabled:opacity-60"
                                style={{ touchAction: "manipulation" }}
                            >
                                <Download className="h-4 w-4" />
                                {installing ? "Installing…" : "Install on this computer"}
                            </button>
                        )}

                        <div className="rounded-2xl bg-slate-50 dark:bg-[#0d1117] p-3">
                            <div className="flex items-start gap-2.5">
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center
                                                rounded-xl bg-white dark:bg-[#161b22]
                                                text-emerald-600 dark:text-emerald-400">
                                    <Smartphone className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[12px] font-bold text-slate-900 dark:text-white">
                                        Get it on your phone
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                                        Scan with your phone camera to open Medrae there.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 flex flex-col items-center gap-2">
                                <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5">
                                    <QRCodeSVG
                                        value={REDIRECT_URL}
                                        size={140}
                                        level="H"
                                        bgColor="#ffffff"
                                        fgColor="#0d1117"
                                        className="rounded-lg"
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Code
                                    </p>
                                    <p className="text-sm font-bold tracking-[0.12em] text-emerald-600 dark:text-emerald-400 font-mono">
                                        {SHORT_CODE}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={dismiss}
                            className="w-full h-10 rounded-xl
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-700 dark:text-slate-200 text-[13px] font-bold
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            Maybe later
                        </button>
                    </div>
                )}
            </div>
        </CenteredModal>
    );
}