// SettingsSheet.tsx - Full-screen native-like settings overlay
// Matches app-wide palette: gray-50/white (light) + #0d1117/#161b22/#21262d (dark)

import { ConnectTelegram } from "@/components/ConnectTelegram";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, RefreshCcw, Share2, Flame, Volume2, VolumeX, VolumeOff, Volume, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { playSound, isSoundMuted, toggleSoundMute } from "@/lib/soundManager";
import { useToast } from "@/components/ui/use-toast";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { HardResetButton } from "@/components/HardResetButton";
interface SettingsSheetProps {
    open: boolean;
    onClose: () => void;
    isDarkMode: boolean;
    onToggleDarkMode: () => void;
    isPremium: boolean;
    isOnline: boolean;
    streak: number;
    notificationCount: number;
}

/* ---------- shared row primitives ---------- */

const rowBase =
    "w-full min-h-[52px] flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-[#21262d]";

const iconTile =
    "flex items-center justify-center h-9 w-9 shrink-0 rounded-lg";

const labelStack = "flex flex-col min-w-0 flex-1";

const primaryLabel =
    "text-sm font-semibold text-gray-800 dark:text-gray-200 truncate";

const secondaryLabel =
    "text-[10px] font-medium truncate";

/* ----------------------------------------- */
/* ---------- Official Telegram logo (inline SVG) ---------- */
function TelegramLogo({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 240 240" className={className} aria-hidden="true">
            <defs>
                <linearGradient id="tgGradSettings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2AABEE" />
                    <stop offset="100%" stopColor="#229ED9" />
                </linearGradient>
            </defs>
            <circle cx="120" cy="120" r="120" fill="url(#tgGradSettings)" />
            <path
                fill="#FFFFFF"
                d="M54.3 118.3l139.1-53.6c6.5-2.4 12.2 1.6 10.1 11.5l-23.7 111.6c-1.8 8.1-6.6 10.1-13.4 6.3l-37-27.3-17.8 17.2c-2 2-3.6 3.6-7.4 3.6l2.7-37.7 68.7-62c3-2.7-.7-4.2-4.6-1.6l-84.9 53.5-36.6-11.4c-7.9-2.5-8.1-7.9 1.8-11.1z"
            />
        </svg>
    );
}
const StreakWidget = ({ streak, isOnline }: { streak: number; isOnline: boolean }) => {
    if (streak === 0 || !isOnline) return null;
    return (
        <div className="px-4 py-3 mb-3 rounded-2xl bg-orange-50 dark:bg-orange-950/20">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-[#21262d] shadow-sm shrink-0">
                    <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-tight text-orange-600 dark:text-orange-400">
                        Daily Streak
                    </span>
                    <span className="text-sm font-bold text-gray-800 dark:text-orange-100 truncate">
                        {streak} Day{streak !== 1 ? "s" : ""}
                    </span>
                </div>
            </div>
        </div>
    );
};

export function SettingsSheet({
    open,
    onClose,
    isDarkMode,
    onToggleDarkMode,
    isPremium,
    isOnline,
    streak,
}: SettingsSheetProps) {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [rotating, setRotating] = useState(false);
    const [isMuted, setIsMuted] = useState(isSoundMuted);
    const [mounted, setMounted] = useState(false);
    const [showTelegram, setShowTelegram] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.body.classList.add("settings-open");
        return () => {
            document.body.style.overflow = prev;
            document.body.classList.remove("settings-open");
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === "medrae_sound_muted") {
                setIsMuted(e.newValue ? JSON.parse(e.newValue) : false);
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const handleReload = useCallback(() => {
        setRotating(true);
        setTimeout(() => window.location.reload(), 300);
    }, []);

    const handleShare = useCallback(() => {
        const shareMessage = `Medrae – The Professional Medical Education & Career Network\n\nJoin us: https://medrae.vercel.app`;
        if (navigator.share) {
            navigator.share({ title: "Medrae Network", text: shareMessage, url: "https://medrae.vercel.app" }).catch(() => { });
        } else {
            navigator.clipboard.writeText(shareMessage);
            toast({ title: "Copied!", description: "Medrae info copied to clipboard!" });
        }
    }, [toast]);

    const handleMuteToggle = useCallback(() => {
        const newMuteState = toggleSoundMute();
        setIsMuted(newMuteState);
        if (!newMuteState) playSound("click", false, 0.2);
        toast({
            title: newMuteState ? "Sound Muted" : "Sound Unmuted",
            description: newMuteState
                ? "All notification sounds are now disabled"
                : "You will now hear notification sounds",
            duration: 2000,
        });
    }, [toast]);

    // ✅ Close sheet first, then route to dedicated page
    const goToPage = useCallback((path: string) => {
        onClose();
        // Small defer so the close animation/scroll-unlock runs before navigation
        setTimeout(() => navigate(path), 0);
    }, [navigate, onClose]);

    if (!mounted || !open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[999999] flex items-stretch sm:items-start sm:justify-end"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Panel — outer wrapper handles position + animation, inner handles scroll */}
            <div
                className="
                    relative z-10 flex flex-col
                    w-full h-[100dvh] max-h-[100dvh]
                    animate-in slide-in-from-bottom duration-300
                    sm:mt-16 sm:mr-2 sm:mb-4 sm:h-auto sm:max-h-[80vh]
                    sm:w-80 sm:max-w-[420px]
                "
            >
                <div
                    className="
                        custom-scrollbar
                        flex-1 min-h-0
                        w-full
                        overflow-y-auto overscroll-contain
                        bg-gray-50 dark:bg-[#0d1117]
                        pt-[max(1.25rem,env(safe-area-inset-top))]
                        pb-[max(6rem,env(safe-area-inset-bottom))]
                        px-4
                        sm:pt-4 sm:pb-4 sm:px-3
                        sm:rounded-2xl
                        sm:shadow-2xl
                        sm:bg-white dark:sm:bg-[#161b22]
                    "
                >
                    {/* Mobile header */}
                    <div className="flex items-center justify-between mb-3 sm:hidden">
                        <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">Settings</h3>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-[#21262d]"
                            aria-label="Close settings"
                        >
                            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </Button>
                    </div>

                    {/* ===== Premium / Get Verified ===== */}
                    {!isPremium && (
                        <button
                            onClick={() => goToPage("/subscription")}
                            className="w-full mb-3 min-h-[64px] flex items-center gap-3 px-4 py-3 rounded-2xl
                                bg-gradient-to-r from-amber-50 to-yellow-50
                                dark:from-amber-950/40 dark:to-yellow-950/40
                                active:scale-[0.98] transition-transform text-left"
                        >
                            <span className="relative inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-full
                                bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-600
                                shadow-[0_0_0_1px_rgba(255,255,255,0.5)_inset,0_1px_3px_rgba(0,0,0,0.15)]">
                                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white">
                                    <path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="3"
                                        strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                            <span className="flex-1 min-w-0">
                                <span className="block text-sm font-bold text-amber-900 dark:text-amber-100 truncate">
                                    Get Verified
                                </span>
                                <span className="block text-[10px] text-amber-700/80 dark:text-amber-300/70 font-medium truncate">
                                    Unlock the golden badge on your profile
                                </span>
                            </span>
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 shrink-0">
                                Upgrade →
                            </span>
                        </button>
                    )}

                    {isPremium && (
                        <div className="mb-3 min-h-[64px] flex items-center gap-3 px-4 py-3 rounded-2xl
                            bg-gradient-to-r from-amber-50 to-yellow-50
                            dark:from-amber-950/40 dark:to-yellow-950/40">
                            <VerifiedBadge isPremium={true} size="lg" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-amber-900 dark:text-amber-100 truncate">
                                    Verified Premium Member
                                </p>
                                <p className="text-[10px] text-amber-700/80 dark:text-amber-300/70 font-medium truncate">
                                    Your account is officially recognized
                                </p>
                            </div>
                        </div>
                    )}

                    <StreakWidget streak={streak} isOnline={isOnline} />

                    {/* ===== Sound Control ===== */}
                    <div className="mb-3">
                        <div
                            className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl transition-all duration-300 ${isMuted
                                ? "bg-red-50 dark:bg-red-950/20"
                                : "bg-emerald-50 dark:bg-emerald-950/20"
                                }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`flex items-center justify-center h-10 w-10 shrink-0 rounded-xl bg-white dark:bg-[#21262d] ${isMuted ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                                    }`}>
                                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 truncate">
                                        {isMuted
                                            ? (<><VolumeOff className="w-4 h-4 text-red-500 shrink-0" />Sound Muted</>)
                                            : (<><Volume className="w-4 h-4 text-emerald-500 shrink-0" />Sound Enabled</>)}
                                    </span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                        {isMuted ? "All notifications are silent" : "You'll hear notification sounds"}
                                    </span>
                                </div>
                            </div>
                            <Button
                                onClick={handleMuteToggle}
                                variant={isMuted ? "destructive" : "default"}
                                size="sm"
                                className={`rounded-xl px-5 h-10 text-xs font-bold transition-all shadow-sm hover:shadow-md w-full sm:w-auto shrink-0 ${isMuted
                                    ? "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white"
                                    : "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                                    }`}
                            >
                                {isMuted
                                    ? (<><Volume className="w-4 h-4 mr-2" />Unmute</>)
                                    : (<><VolumeOff className="w-4 h-4 mr-2" />Mute</>)}
                            </Button>
                        </div>
                    </div>

                    {/* ===== Group 1: Sharing + Theme ===== */}
                    <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#161b22] sm:bg-transparent dark:sm:bg-transparent">
                        <button onClick={handleShare} className={rowBase}>
                            <div className={`${iconTile} bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400`}>
                                <Share2 className="w-4 h-4" />
                            </div>
                            <span className={primaryLabel}>Invite Colleagues</span>
                        </button>
                        <button onClick={() => setShowTelegram(true)} className={rowBase}>
                            <div className={`${iconTile} bg-gradient-to-br from-[#2AABEE] to-[#229ED9] shadow-sm`}>
                                <TelegramLogo className="w-4 h-4" />
                            </div>
                            <div className={labelStack}>
                                <span className={primaryLabel}>Connect Telegram</span>
                                <span className={`${secondaryLabel} text-[#229ED9]/80 dark:text-[#2AABEE]/70`}>
                                    Practice & progress in Telegram
                                </span>
                            </div>
                        </button>
                        <button onClick={() => goToPage("/share")} className={rowBase}>
                            <div className={`${iconTile} bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400`}>
                                <Share2 className="w-4 h-4" />
                            </div>
                            <div className={labelStack}>
                                <span className={primaryLabel}>Invite a Friend</span>
                                <span className={`${secondaryLabel} text-emerald-600/70 dark:text-emerald-400/60`}>
                                    Share with friends
                                </span>
                            </div>
                            <Badge className="ml-auto h-5 px-2 shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 text-[9px] font-bold text-white border-0 rounded-full">
                                Quick
                            </Badge>
                        </button>

                        <button onClick={onToggleDarkMode} className={`${rowBase} justify-between`}>
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`${iconTile} ${isDarkMode
                                    ? "bg-amber-900/30 text-amber-400"
                                    : "bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-gray-400"
                                    }`}>
                                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                </div>
                                <span className={primaryLabel}>
                                    {isDarkMode ? "Light Mode" : "Dark Mode"}
                                </span>
                            </div>
                            <div className="w-8 h-4 shrink-0 bg-gray-200 dark:bg-[#30363d] rounded-full relative">
                                <div className={`absolute top-1 w-2 h-2 rounded-full transition-all duration-200 ${isDarkMode ? "right-1 bg-amber-400" : "left-1 bg-gray-400"
                                    }`} />
                            </div>
                        </button>
                    </div>

                    <div className="my-3 h-px bg-gray-200 dark:bg-[#21262d]" />

                    {/* ===== Group 2: System actions ===== */}
                    <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#161b22] sm:bg-transparent dark:sm:bg-transparent">
                        <button onClick={handleReload} className={rowBase}>
                            <div className={`${iconTile} bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 ${rotating ? "animate-spin" : ""}`}>
                                <RefreshCcw className="w-4 h-4" />
                            </div>
                            <div className={labelStack}>
                                <span className={primaryLabel}>System Update</span>
                                <span className={`${secondaryLabel} text-emerald-600/70 dark:text-emerald-400/60`}>
                                    Refresh platform content
                                </span>
                            </div>
                        </button>
                        <HardResetButton asRow keepLoggedIn label="Clear Caches" />
                        <HardResetButton asRow label="Hard Reset" />
                    </div>
                </div>
            </div>
            <ConnectTelegram open={showTelegram} onClose={() => setShowTelegram(false)} />
        </div>,

        document.body
    );
}