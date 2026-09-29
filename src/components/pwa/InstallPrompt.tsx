"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
    X,
    Download,
    Share,
    Plus,
    Smartphone,
    MoreVertical,
    Sparkles,
    WifiOff,
    Rocket,
    Home,
} from "lucide-react";

/* ============================================================
   SMART PWA INSTALL PROMPT — production
   ------------------------------------------------------------
   Behaviour:
   - SHOWS ON EVERY FRESH PAGE LOAD for users who haven't installed.
   - Never shows if already installed (standalone / installed flag).
   - Never shows during exam / simulation / quiz / challenge / assessment.
   - Dismissal is per-page-load only (refresh brings it back),
     but a "Not now" button sets a soft 24h cooldown so users
     aren't harassed mid-session across tabs.
   - Android/Chrome: uses native beforeinstallprompt for 1-tap install.
   - iOS Safari:     shows step-by-step Share → Add to Home Screen guide.
   - Desktop:        shows install-here button + real scannable QR.
   ============================================================ */

const STORAGE_KEYS = {
    installed: "pwa_installed_flag",
    softDismissUntil: "pwa_install_soft_dismiss_until",   // 🆕 24h soft cooldown
    hardDismissUntil: "pwa_install_dismissed_until",      // still used by some CTAs
};

// 🆕 Tunable knobs — everything is fast now.
const CONFIG = {
    initialDelayMs: 400,          // 🆕 was 8000 — show almost immediately
    softDismissHours: 24,         // 🆕 how long "Not now" hides it
    hardDismissDays: 7,           // used by desktop "Maybe later" & similar
};

/** 🔗 Same link used on the LinkGenerator page — keeps codes in sync. */
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

// 🆕 Simplified: only checks "installed?" and "did user say not now recently?"
function canShowPrompt(): boolean {
    try {
        if (isStandalone()) return false;
        if (localStorage.getItem(STORAGE_KEYS.installed) === "1") return false;
        if (isInCriticalFlow()) return false;

        // Soft 24h cooldown after tapping "Not now"
        const softUntil = localStorage.getItem(STORAGE_KEYS.softDismissUntil);
        if (softUntil && Date.now() < parseInt(softUntil, 10)) return false;

        // Legacy hard-dismiss (desktop "Maybe later") still respected
        const hardUntil = localStorage.getItem(STORAGE_KEYS.hardDismissUntil);
        if (hardUntil && Date.now() < parseInt(hardUntil, 10)) return false;

        return true;
    } catch {
        return false;
    }
}

/* ---------- UI Sub-components ---------- */

const BenefitPill = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[12px] font-medium text-slate-600 dark:bg-[#161b22] dark:text-[#8b949e]">
        <span className="text-emerald-600 dark:text-[#3fb950]">{icon}</span>
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
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-xs font-bold shadow-sm dark:from-[#238636] dark:to-[#2ea043]">
            {n}
        </div>
        <div className="flex-1 pt-0.5 text-[13px] leading-relaxed text-slate-700 dark:text-[#c9d1d9]">
            {children}
        </div>
        {icon && <div className="pt-0.5 text-slate-400 dark:text-[#6e7681]">{icon}</div>}
    </div>
);

/* ---------- Main Component ---------- */

export default function InstallPrompt() {
    const [open, setOpen] = useState(false);
    const [platform, setPlatform] = useState<Platform>("other");
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [installing, setInstalling] = useState(false);

    // Capture the native install prompt (Chrome / Edge / Android)
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

    // Mark installed permanently
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

    // 🆕 Show immediately on mount if eligible
    useEffect(() => {
        setPlatform(detectPlatform());

        const tryShow = () => {
            if (canShowPrompt()) setOpen(true);
        };

        const t = setTimeout(tryShow, CONFIG.initialDelayMs);

        const onFocus = () => {
            if (!open && canShowPrompt()) tryShow();
        };
        window.addEventListener("focus", onFocus);

        return () => {
            clearTimeout(t);
            window.removeEventListener("focus", onFocus);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 🆕 Soft dismiss (used by the X / backdrop / "Not now")
    // Hides for `softDismissHours` — refresh still respects the cooldown,
    // so it doesn't spam, but a genuine new day brings it back.
    const softDismiss = useCallback(() => {
        try {
            localStorage.setItem(
                STORAGE_KEYS.softDismissUntil,
                String(Date.now() + CONFIG.softDismissHours * 60 * 60 * 1000)
            );
        } catch { }
        setOpen(false);
    }, []);

    // Hard dismiss — longer cooldown, used by explicit "Maybe later"
    const hardDismiss = useCallback((days = CONFIG.hardDismissDays) => {
        try {
            localStorage.setItem(
                STORAGE_KEYS.hardDismissUntil,
                String(Date.now() + days * 24 * 60 * 60 * 1000)
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
                    hardDismiss();
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
    }, [deferredPrompt, platform, hardDismiss]);

    // Lock body scroll while sheet is open (Instagram-style)
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    // Close on Escape — soft dismiss so it doesn't come back this session
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") softDismiss();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, softDismiss]);

    if (!open) return null;

    const showNativeButton = !!deferredPrompt;

    return (
        <>
            {/* Dark-mode styles matching LogoutDialog's GitHub-dark theme */}
            <style>{`
        @keyframes medrae-install-gradient-shift {
          0%   { background-position:   0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position:   0% 50%; }
        }
        .medrae-install-hero {
          background-size: 200% 200%;
          animation: medrae-install-gradient-shift 8s ease infinite;
        }
        @keyframes medrae-sheet-slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .medrae-install-sheet-mobile {
          animation: medrae-sheet-slide-up 340ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes medrae-sheet-fade-in {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        .medrae-install-card-desktop {
          animation: medrae-sheet-fade-in 300ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .dark .medrae-install-dialog {
          background-color: #0d1117 !important;
          border: none !important;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6) !important;
        }
        .dark .medrae-install-body { background-color: #0d1117 !important; color: #e6edf3 !important; }
        .dark .medrae-install-title { color: #e6edf3 !important; }
        .dark .medrae-install-desc { color: #8b949e !important; }
        .dark .medrae-install-close {
          background-color: #21262d !important; color: #8b949e !important;
        }
        .dark .medrae-install-close:hover { background-color: #30363d !important; color: #e6edf3 !important; }
        .dark .medrae-install-secondary {
          background-color: #21262d !important; color: #e6edf3 !important; border: none !important;
        }
        .dark .medrae-install-secondary:hover { background-color: #30363d !important; }
        .dark .medrae-install-card {
          background-color: #161b22 !important; border: none !important;
        }
        .dark .medrae-install-card-inner {
          background-color: #0d1117 !important; border: none !important;
        }
        .dark .medrae-install-divider { background-color: #21262d !important; }
        .dark .medrae-install-note {
          background-color: rgba(210, 153, 34, 0.12) !important; color: #d29922 !important;
        }
        .dark .medrae-install-whisper { color: #484f58 !important; }
        .dark .medrae-install-grabber { background-color: #30363d !important; }
        .dark .medrae-install-qr {
          background-color: #0d1117 !important; border-color: #21262d !important;
        }
      `}</style>

            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200"
                onClick={softDismiss}
                aria-hidden="true"
            />

            {/* SHEET */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="install-title"
                className="
                  fixed z-[9999] inset-x-0 bottom-0
                  sm:inset-0 sm:my-auto sm:h-fit sm:mx-auto sm:w-full sm:max-w-md
                  sm:px-4
                "
            >
                <div
                    className="
                      medrae-install-dialog
                      medrae-install-sheet-mobile sm:medrae-install-card-desktop
                      relative w-full
                      rounded-t-3xl sm:rounded-3xl
                      bg-white shadow-2xl dark:bg-[#0d1117]
                      overflow-hidden
                      max-h-[92vh] flex flex-col
                    "
                >
                    <div className="sm:hidden pt-3 pb-1 flex justify-center flex-shrink-0">
                        <span className="medrae-install-grabber h-1.5 w-10 rounded-full bg-slate-300 dark:bg-[#30363d]" />
                    </div>

                    <button
                        onClick={softDismiss}
                        aria-label="Close"
                        className="medrae-install-close absolute right-3 top-3 sm:top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-[#21262d] dark:text-[#8b949e] dark:hover:bg-[#30363d]"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="overflow-y-auto custom-scrollbar overscroll-contain">
                        {/* HERO */}
                        <div className="medrae-install-hero relative h-36 w-full overflow-hidden bg-gradient-to-br from-rose-200 via-amber-100 via-emerald-100 to-sky-200 dark:from-[#1f2937] dark:via-[#111827] dark:via-[#0d1117] dark:to-[#1e1b4b]">
                            <div className="absolute -top-10 -left-10 h-28 w-28 rounded-full bg-rose-300/50 blur-2xl animate-pulse dark:bg-rose-500/10" />
                            <div className="absolute -bottom-12 -right-8 h-32 w-32 rounded-full bg-emerald-300/50 blur-2xl animate-pulse [animation-delay:600ms] dark:bg-emerald-500/10" />
                            <div className="absolute top-3 right-8 h-14 w-14 rounded-full bg-amber-200/60 blur-xl animate-pulse [animation-delay:1200ms] dark:bg-amber-500/10" />
                            <div className="absolute bottom-4 left-10 h-16 w-16 rounded-full bg-sky-200/50 blur-xl animate-pulse [animation-delay:1800ms] dark:bg-sky-500/10" />

                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white/85 shadow-lg backdrop-blur-sm dark:bg-[#161b22]/90 dark:shadow-black/40">
                                    <span className="absolute inset-0 rounded-3xl bg-emerald-300/30 animate-ping [animation-duration:2.4s] dark:bg-[#3fb950]/15" />
                                    <img
                                        src="/pwa-192x192.png"
                                        alt="Medrae"
                                        className="relative h-14 w-14 select-none rounded-2xl object-contain pointer-events-none"
                                        draggable={false}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = "none";
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-bold text-emerald-700 backdrop-blur-sm dark:bg-[#21262d]/80 dark:text-[#3fb950]">
                                <Sparkles className="h-3 w-3" />
                                PWA
                            </div>
                        </div>

                        {/* BODY */}
                        <div className="medrae-install-body px-5 pb-6 pt-4">
                            <div className="space-y-1.5 text-center">
                                <h2
                                    id="install-title"
                                    className="medrae-install-title text-lg font-bold text-slate-900 dark:text-[#e6edf3]"
                                >
                                    Install Medrae Nursing
                                </h2>
                                <p className="medrae-install-desc text-[13px] leading-relaxed text-slate-500 dark:text-[#8b949e]">
                                    Faster, offline-ready, and one tap from your home screen.
                                </p>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <BenefitPill icon={<WifiOff className="h-3.5 w-3.5" />} label="Works offline" />
                                <BenefitPill icon={<Rocket className="h-3.5 w-3.5" />} label="Faster loads" />
                                <BenefitPill icon={<Home className="h-3.5 w-3.5" />} label="Home icon" />
                                <BenefitPill icon={<Smartphone className="h-3.5 w-3.5" />} label="Study on the go" />
                            </div>

                            <div className="medrae-install-divider my-4 h-px bg-slate-200 dark:bg-[#21262d]" />

                            {/* iOS */}
                            {platform === "ios" && (
                                <div className="space-y-3">
                                    <p className="mb-1 text-sm font-semibold text-slate-900 dark:text-[#e6edf3]">
                                        To install on iPhone / iPad:
                                    </p>
                                    <Step n={1} icon={<Share className="h-4 w-4" />}>
                                        Tap the <strong>Share</strong> button in Safari.
                                    </Step>
                                    <Step n={2} icon={<Plus className="h-4 w-4" />}>
                                        Scroll and tap <strong>Add to Home Screen</strong>.
                                    </Step>
                                    <Step n={3}>
                                        Tap <strong>Add</strong> in the top-right. Done! 🎉
                                    </Step>

                                    <div className="medrae-install-note mt-3 rounded-xl bg-amber-50 p-3 text-[12px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                        ⚠️ Must be done in <strong>Safari</strong>. Chrome on iOS can't
                                        install PWAs.
                                    </div>

                                    <button
                                        onClick={softDismiss}
                                        className="medrae-install-secondary mt-3 w-full rounded-2xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-[#21262d] dark:text-[#e6edf3] dark:hover:bg-[#30363d]"
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
                                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition active:scale-[0.98] disabled:opacity-60 dark:from-[#238636] dark:to-[#2ea043] dark:shadow-black/40"
                                    >
                                        <Download className="h-4 w-4" />
                                        {installing ? "Installing…" : "Install Medrae"}
                                    </button>
                                    <p className="text-center text-[12px] text-slate-500 dark:text-[#8b949e]">
                                        One tap. Works offline instantly.
                                    </p>
                                </div>
                            )}

                            {/* Android without native prompt */}
                            {platform === "android" && !showNativeButton && (
                                <div className="space-y-3">
                                    <p className="mb-1 text-sm font-semibold text-slate-900 dark:text-[#e6edf3]">
                                        To install on Android:
                                    </p>
                                    <Step n={1} icon={<MoreVertical className="h-4 w-4" />}>
                                        Tap the <strong>⋮ menu</strong> in Chrome.
                                    </Step>
                                    <Step n={2}>
                                        Tap <strong>Install app</strong> or{" "}
                                        <strong>Add to Home screen</strong>.
                                    </Step>
                                    <Step n={3}>Confirm. Done! 🎉</Step>

                                    <button
                                        onClick={softDismiss}
                                        className="medrae-install-secondary mt-3 w-full rounded-2xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-[#21262d] dark:text-[#e6edf3] dark:hover:bg-[#30363d]"
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
                                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition active:scale-[0.98] disabled:opacity-60 dark:from-[#238636] dark:to-[#2ea043] dark:shadow-black/40"
                                        >
                                            <Download className="h-4 w-4" />
                                            {installing ? "Installing…" : "Install on this computer"}
                                        </button>
                                    )}

                                    <div className="medrae-install-card rounded-2xl bg-slate-50 p-4 dark:bg-[#161b22]">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm dark:bg-[#0d1117] dark:text-[#3fb950]">
                                                <Smartphone className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-[#e6edf3]">
                                                    Get it on your phone
                                                </p>
                                                <p className="mt-0.5 text-[12px] text-slate-600 dark:text-[#8b949e]">
                                                    Scan this QR with your phone camera to open
                                                    Medrae there and install in one tap.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-col items-center gap-3">
                                            <div className="medrae-install-qr rounded-2xl border border-slate-100 bg-white p-3 dark:border-[#21262d] dark:bg-[#0d1117]">
                                                <QRCodeSVG
                                                    value={REDIRECT_URL}
                                                    size={168}
                                                    level="H"
                                                    bgColor="#ffffff"
                                                    fgColor="#0d1117"
                                                    className="rounded-lg"
                                                />
                                            </div>

                                            <div className="text-center">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-[#6e7681]">
                                                    Quick Access Code
                                                </p>
                                                <p className="mt-0.5 text-base font-black tracking-[0.15em] text-emerald-600 dark:text-[#3fb950] font-mono">
                                                    {SHORT_CODE}
                                                </p>
                                                <p className="mt-1 text-[10px] text-slate-400 dark:text-[#6e7681]">
                                                    Or open{" "}
                                                    <span className="font-semibold">
                                                        {PRODUCTION_URL.replace("https://", "")}
                                                    </span>{" "}
                                                    on your phone
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {!showNativeButton && (
                                        <p className="text-center text-[12px] text-slate-500 dark:text-[#8b949e]">
                                            Or use your browser menu → <strong>Install Medrae</strong>.
                                        </p>
                                    )}

                                    <button
                                        onClick={() => hardDismiss(7)}
                                        className="medrae-install-secondary mt-1 w-full rounded-2xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-[#21262d] dark:text-[#e6edf3] dark:hover:bg-[#30363d]"
                                    >
                                        Maybe later
                                    </button>
                                </div>
                            )}

                            {/* Other */}
                            {platform === "other" && (
                                <div className="space-y-3">
                                    <p className="text-sm text-slate-700 dark:text-[#c9d1d9]">
                                        Open your browser menu and choose{" "}
                                        <strong>Install app</strong> or{" "}
                                        <strong>Add to Home Screen</strong>.
                                    </p>
                                    <button
                                        onClick={() => hardDismiss(7)}
                                        className="medrae-install-secondary w-full rounded-2xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-[#21262d] dark:text-[#e6edf3] dark:hover:bg-[#30363d]"
                                    >
                                        Got it
                                    </button>
                                </div>
                            )}

                            <p className="medrae-install-whisper mt-4 text-center text-[10px] text-slate-400/70 dark:text-[#484f58]">
                                Made with care · Medrae
                            </p>
                        </div>
                    </div>

                    <div className="h-[env(safe-area-inset-bottom)] flex-shrink-0" />
                </div>
            </div>
        </>
    );
}