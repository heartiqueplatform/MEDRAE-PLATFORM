// ============================================================
// Neldes Scroll — empty / error / offline state.
// - kind="error"  → "Something went wrong" + Try again (online only)
// - kind="empty"  → Hero Lottie + category pills + create CTA
// - !isOnline     → OfflineLottie card (same look as UnitPics)
// Auto-retries on reconnect via justRecovered.
// ============================================================

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Plus, WifiOff } from "lucide-react";
import HeroLottie from "@/components/HeroLottie";
import OfflineLottie from "@/components/OfflineLottie";
import { useConnectivity } from "@/context/ConnectivityContext";
import { NELDES_COLORS } from "../config/constants";

interface EmptyFeedProps {
    kind: "empty" | "error";
    message: string;
    onRetry: () => void;
    onCreate?: () => void;   // shown only for kind="empty"
}

export function EmptyFeed({ kind, message, onRetry, onCreate }: EmptyFeedProps) {
    const { isOnline, state, justRecovered } = useConnectivity();

    // Offline = not online AND not currently checking.
    // While "checking" we show the last known state to avoid flashing.
    const offline = !isOnline && state !== "checking";

    // Auto-retry once the connection recovers
    useEffect(() => {
        if (justRecovered && isOnline) {
            onRetry();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [justRecovered, isOnline]);

    // ── OFFLINE: same visual language as UnitPics ────────────
    if (offline) {
        return (
            <div
                className="w-full h-full flex flex-col items-center justify-center px-8 text-center"
                style={{ backgroundColor: NELDES_COLORS.bg }}
            >
                {/* Lottie — same sizing idea as UnitPics */}
                <div className="w-[200px] h-[200px] mb-4">
                    <OfflineLottie />
                </div>

                <p
                    className="text-[15px] font-bold mb-1"
                    style={{ color: NELDES_COLORS.textPrimary }}
                >
                    You're offline
                </p>
                <p
                    className="text-[12px] mb-5 max-w-[260px] leading-snug"
                    style={{ color: NELDES_COLORS.textSecondary }}
                >
                    We'll load the feed automatically when you're back online.
                </p>

                <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 px-4 h-9 rounded-full active:scale-95 transition-transform"
                    style={{
                        backgroundColor: NELDES_COLORS.accent,
                        color: "#ffffff",
                        touchAction: "manipulation",
                    }}
                >
                    <WifiOff className="w-3.5 h-3.5" />
                    <span className="text-[13px] font-semibold">Retry now</span>
                </button>
            </div>
        );
    }

    // ── ERROR: real failure (only shown while online) ────────
    if (kind === "error") {
        return (
            <div
                className="w-full h-full flex flex-col items-center justify-center px-8 text-center"
                style={{ backgroundColor: NELDES_COLORS.bg }}
            >
                <div className="w-16 h-16 rounded-full bg-[#161b22] flex items-center justify-center mb-4">
                    <AlertCircle
                        className="w-8 h-8"
                        color={NELDES_COLORS.heart}
                        strokeWidth={1.8}
                    />
                </div>
                <p
                    className="text-[15px] font-semibold mb-1"
                    style={{ color: NELDES_COLORS.textPrimary }}
                >
                    Something went wrong
                </p>
                <p
                    className="text-[13px] mb-5 max-w-[260px]"
                    style={{ color: NELDES_COLORS.textSecondary }}
                >
                    {message}
                </p>
                <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 px-4 h-9 rounded-full active:scale-95 transition-transform"
                    style={{
                        backgroundColor: NELDES_COLORS.accent,
                        color: "#ffffff",
                        touchAction: "manipulation",
                    }}
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="text-[13px] font-semibold">Try again</span>
                </button>
            </div>
        );
    }

    // ── EMPTY: unchanged ─────────────────────────────────────
    return (
        <div
            className="w-full h-full flex flex-col items-center justify-center px-8 text-center"
            style={{ backgroundColor: NELDES_COLORS.bg }}
        >
            {/* Lottie */}
            <div className="w-[220px] h-[220px] mb-4">
                <HeroLottie />
            </div>

            <p
                className="text-[17px] font-bold mb-1.5"
                style={{ color: NELDES_COLORS.textPrimary }}
            >
                You've watched all posts
            </p>
            <p
                className="text-[13px] mb-4 max-w-[300px] leading-snug"
                style={{ color: NELDES_COLORS.textSecondary }}
            >
                {message ||
                    "You're all caught up. Check back later  or be the first to post a meme, share KMTC / NCK / MOH news, drop a job, or boost your course."}
            </p>

            {/* Category hint pills — shows new users what they can post */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mb-6">
                <CategoryPill label="Memes" color="#f43f5e" />
                <CategoryPill label="News" color="#3b82f6" />
                <CategoryPill label="Jobs" color="#10b981" />
                <CategoryPill label="Promo" color="#f59e0b" />
            </div>

            {onCreate ? (
                <button
                    onClick={onCreate}
                    className="inline-flex items-center gap-2 px-5 h-11 rounded-full active:scale-95 transition-transform"
                    style={{
                        backgroundColor: NELDES_COLORS.accent,
                        color: "#ffffff",
                        touchAction: "manipulation",
                    }}
                >
                    <Plus className="w-4 h-4" strokeWidth={2.6} />
                    <span className="text-[14px] font-bold">
                        Create first post
                    </span>
                </button>
            ) : (
                <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 px-4 h-9 rounded-full active:scale-95 transition-transform"
                    style={{
                        backgroundColor: NELDES_COLORS.accent,
                        color: "#ffffff",
                        touchAction: "manipulation",
                    }}
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="text-[13px] font-semibold">Refresh</span>
                </button>
            )}
        </div>
    );
}

/** Small colored pill showing what category exists in Neldes. */
function CategoryPill({ label, color }: { label: string; color: string }) {
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{
                backgroundColor: `${color}20`,
                color,
            }}
        >
            {label}
        </span>
    );
}