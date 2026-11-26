"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Copy,
    Users,
    CheckCircle,
    FileText,
    Gift,
    Clock,
    Trophy,
    Crown,
    ShieldAlert,
    ShieldCheck,
    Link2,
    TrendingUp,
    Info,
    AlertTriangle,
    Ban,
    CheckCircle2,
    ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import {
    getMyReferralCode,
    getMyReferralStats,
    buildReferralLink,
    buildWhatsAppMessage,
    type ReferralStats,
} from "@/lib/referrals";

// ── Extracted ──
import {
    QRCodeDisplay,
    ErrorState,
    StatBlock,
    HowItWorksRow,
    StackExample,
    RuleRow,
} from "@/components/referral/referral-ui";
import { generateReferralPDF } from "@/components/referral/referral-pdf";

// ─────────────────────────────────────────────────────────────
// Compact icon buttons (red + WhatsApp green, SVG-based)
// ─────────────────────────────────────────────────────────────
function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
    );
}

function ShareIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
    );
}

function CopyIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    );
}

function DownloadIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    );
}

// ─────────────────────────────────────────────────────────────
// Skeleton primitives
// ─────────────────────────────────────────────────────────────
function SkeletonLine({ width = "w-full", height = "h-3" }: { width?: string; height?: string }) {
    return (
        <div
            className={`${width} ${height} rounded-md bg-slate-200/80 dark:bg-slate-700/60 animate-pulse`}
        />
    );
}

function SkeletonCard({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4">
            {children}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Skeleton page — mirrors the real layout so there's no jump
// ─────────────────────────────────────────────────────────────
function ReferralSkeleton({ onBack }: { onBack: () => void }) {
    return (
        <div className="h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-[#0d1117] overflow-hidden">
            {/* Header (real) */}
            <header className="flex-shrink-0 w-full flex items-center gap-2 px-2 h-14 safe-top bg-white dark:bg-[#0d1117]">
                <button
                    onClick={onBack}
                    aria-label="Go back"
                    className="flex items-center justify-center h-10 w-10 rounded-full
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5
                               transition-colors"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate text-slate-900 dark:text-white">
                        Invite a Nurse
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        Share your link. Earn premium days.
                    </p>
                </div>
            </header>

            {/* Skeleton content — same structure as the real page */}
            <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden no-scrollbar overscroll-contain">
                <div className="w-full md:max-w-7xl md:mx-auto md:px-6 md:py-6 pb-24 safe-bottom">
                    {/* Intro skeleton */}
                    <div className="text-center space-y-2 max-w-md mx-auto w-full px-4 pt-4 md:max-w-2xl">
                        <div className="mx-auto">
                            <SkeletonLine width="w-3/4 mx-auto" height="h-6" />
                        </div>
                        <div className="mx-auto space-y-1.5">
                            <SkeletonLine width="w-full" height="h-3" />
                            <SkeletonLine width="w-5/6 mx-auto" height="h-3" />
                        </div>
                    </div>

                    {/* Two column skeleton */}
                    <div className="mt-5 grid grid-cols-1 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-4 md:gap-8 items-start px-4 md:px-0">
                        {/* LEFT */}
                        <div className="space-y-4">
                            {/* Stats row */}
                            <div className="grid grid-cols-3 gap-2">
                                {[0, 1, 2].map((i) => (
                                    <div
                                        key={i}
                                        className="bg-white dark:bg-slate-900 rounded-xl p-3 space-y-2"
                                    >
                                        <SkeletonLine width="w-8" height="h-8" />
                                        <SkeletonLine width="w-12" height="h-2" />
                                        <SkeletonLine width="w-8" height="h-4" />
                                    </div>
                                ))}
                            </div>

                            {/* QR card skeleton */}
                            <SkeletonCard>
                                <div className="flex items-center justify-center gap-2.5 mb-3">
                                    <div className="h-9 w-9 rounded-full bg-slate-200/80 dark:bg-slate-700/60 animate-pulse" />
                                    <div className="text-left space-y-1.5">
                                        <SkeletonLine width="w-24" height="h-3" />
                                        <SkeletonLine width="w-16" height="h-2" />
                                    </div>
                                </div>
                                <div className="mx-auto h-[196px] w-[196px] max-w-full rounded-xl bg-slate-200/80 dark:bg-slate-700/60 animate-pulse" />
                                <div className="mt-3 space-y-2">
                                    <SkeletonLine width="w-24 mx-auto" height="h-2" />
                                    <SkeletonLine width="w-32 mx-auto" height="h-6" />
                                </div>
                            </SkeletonCard>

                            {/* Action row skeleton */}
                            <SkeletonCard>
                                <div className="flex items-center justify-center gap-3">
                                    {[0, 1, 2, 3].map((i) => (
                                        <div key={i} className="flex flex-col items-center gap-1">
                                            <div className="h-11 w-11 rounded-full bg-slate-200/80 dark:bg-slate-700/60 animate-pulse" />
                                            <SkeletonLine width="w-10" height="h-2" />
                                        </div>
                                    ))}
                                </div>
                            </SkeletonCard>
                        </div>

                        {/* RIGHT */}
                        <div className="space-y-4">
                            {/* How it works skeleton */}
                            <SkeletonCard>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-4 w-4 rounded bg-slate-200/80 dark:bg-slate-700/60 animate-pulse" />
                                    <SkeletonLine width="w-40" height="h-4" />
                                </div>
                                <div className="space-y-3">
                                    {[0, 1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="h-7 w-7 rounded-full bg-slate-200/80 dark:bg-slate-700/60 animate-pulse flex-shrink-0" />
                                            <div className="flex-1 space-y-1.5">
                                                <SkeletonLine width="w-32" height="h-3" />
                                                <SkeletonLine width="w-full" height="h-2" />
                                                <SkeletonLine width="w-4/5" height="h-2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </SkeletonCard>

                            {/* Stack card skeleton */}
                            <SkeletonCard>
                                <SkeletonLine width="w-40" height="h-3" />
                                <div className="mt-2 space-y-1.5">
                                    <SkeletonLine width="w-full" height="h-2" />
                                    <SkeletonLine width="w-5/6" height="h-2" />
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    {[0, 1, 2].map((i) => (
                                        <div
                                            key={i}
                                            className="h-14 rounded-lg bg-slate-200/80 dark:bg-slate-700/60 animate-pulse"
                                        />
                                    ))}
                                </div>
                            </SkeletonCard>

                            {/* Rules card skeleton */}
                            <SkeletonCard>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-4 w-4 rounded bg-slate-200/80 dark:bg-slate-700/60 animate-pulse" />
                                    <SkeletonLine width="w-32" height="h-4" />
                                </div>
                                <div className="space-y-2.5">
                                    {[0, 1, 2].map((i) => (
                                        <div key={i} className="flex items-start gap-2">
                                            <div className="h-4 w-4 rounded bg-slate-200/80 dark:bg-slate-700/60 animate-pulse flex-shrink-0 mt-0.5" />
                                            <div className="flex-1 space-y-1.5">
                                                <SkeletonLine width="w-28" height="h-3" />
                                                <SkeletonLine width="w-full" height="h-2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </SkeletonCard>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .safe-top { padding-top: max(env(safe-area-inset-top), 0px); }
                .safe-bottom { padding-bottom: max(env(safe-area-inset-bottom), 0px); }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export default function LinkGenerator() {
    const session = useSession();
    const navigate = useNavigate();
    const [shortCode, setShortCode] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string>("");
    const [stats, setStats] = useState<ReferralStats>({
        invites: 0,
        pending: 0,
        daysEarned: 0,
    });
    const [loading, setLoading] = useState(true);
    const [isCopied, setIsCopied] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const qrRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    /* ── Header glass on scroll ── */
    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;
        const onScroll = () => setScrolled(el.scrollTop > 8);
        onScroll();
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, []);

    /* ── Load code + stats + profile ── */
    useEffect(() => {
        if (!session?.user?.id) return;
        let cancelled = false;
        (async () => {
            const [code, s] = await Promise.all([
                getMyReferralCode(session.user.id),
                getMyReferralStats(session.user.id),
            ]);
            if (cancelled) return;
            setShortCode(code);
            setStats(s);

            try {
                const { data: profileRow } = await supabase
                    .from("profiles")
                    .select("avatar_url, name, username")
                    .eq("user_id", session.user.id)
                    .single();
                if (!cancelled) {
                    setAvatarUrl(profileRow?.avatar_url ?? null);
                    setDisplayName(profileRow?.name || profileRow?.username || "");
                }
            } catch {
                // Non-fatal
            }

            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [session?.user?.id]);

    const fullRedirectUrl = shortCode ? buildReferralLink(shortCode) : "";
    const productionUrl =
        typeof window !== "undefined"
            ? window.location.origin
            : "https://medrae.vercel.app";

    const handleBack = useCallback(() => {
        if (navigator.vibrate) navigator.vibrate(10);
        navigate(-1);
    }, [navigate]);

    const handleShare = useCallback(async () => {
        if (!shortCode) return;
        const shareData = {
            title: "Join Medrae Nursing",
            text: buildWhatsAppMessage(shortCode),
            url: fullRedirectUrl,
        };
        try {
            if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                await navigator.share(shareData);
                toast.success("Shared successfully!");
            } else {
                await navigator.clipboard.writeText(fullRedirectUrl);
                setIsCopied(true);
                toast.success("Link copied. Send it to your friend.");
                setTimeout(() => setIsCopied(false), 2000);
            }
        } catch (err) {
            if ((err as Error).name !== "AbortError") {
                console.error("Error sharing:", err);
                toast.error("Couldn't share. Try copying the link manually.");
            }
        }
    }, [fullRedirectUrl, shortCode]);

    const handleCopy = useCallback(async () => {
        if (!fullRedirectUrl) return;
        try {
            await navigator.clipboard.writeText(fullRedirectUrl);
            setIsCopied(true);
            toast.success("Link copied to clipboard.");
            setTimeout(() => setIsCopied(false), 2000);
        } catch {
            toast.error("Failed to copy. Please try again.");
        }
    }, [fullRedirectUrl]);

    const handleDownloadPDF = useCallback(async () => {
        if (!qrRef.current || !shortCode) return;
        setIsDownloading(true);
        try {
            await generateReferralPDF({
                qrContainer: qrRef.current,
                shortCode,
                productionUrl,
            });
            toast.success("PDF poster downloaded. Print it and pin it up.");
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error("Failed to generate PDF. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    }, [shortCode, productionUrl]);

    if (loading) return <ReferralSkeleton onBack={handleBack} />;

    if (!shortCode) {
        return (
            <div className="h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-[#0d1117] overflow-hidden">
                <header className="flex-shrink-0 w-full flex items-center gap-2 px-2 h-14 safe-top bg-white dark:bg-[#0d1117]">
                    <button
                        onClick={handleBack}
                        aria-label="Go back"
                        className="flex items-center justify-center h-10 w-10 rounded-full
                                   text-slate-700 dark:text-slate-200
                                   active:bg-slate-100 dark:active:bg-white/5
                                   transition-colors"
                        style={{ touchAction: "manipulation" }}
                    >
                        <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate text-slate-900 dark:text-white">
                            Invite a Nurse
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            Share your link. Earn premium days.
                        </p>
                    </div>
                </header>
                <div className="flex-1 min-h-0 flex items-center justify-center">
                    <ErrorState onBack={handleBack} />
                </div>
            </div>
        );
    }

    return (
        <div className="h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-[#0d1117] overflow-hidden">
            {/* ─── FULL-SCREEN HEADER ─────────────────────── */}
            <header
                className={`
                    flex-shrink-0 w-full flex items-center gap-2 px-2 h-14
                    z-30 safe-top transition-colors duration-200
                    ${scrolled
                        ? "bg-white/90 dark:bg-[#0d1117]/90 backdrop-blur-xl"
                        : "bg-white dark:bg-[#0d1117]"
                    }
                `}
            >
                <button
                    onClick={handleBack}
                    aria-label="Go back"
                    className="flex items-center justify-center h-10 w-10 rounded-full
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5
                               transition-colors"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate
                                   text-slate-900 dark:text-white">
                        Invite a Nurse
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        Share your link. Earn premium days.
                    </p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1
                                 text-[10px] font-bold uppercase tracking-wider
                                 px-2 py-1 rounded-full
                                 bg-blue-50 dark:bg-blue-500/10
                                 text-blue-700 dark:text-blue-400">
                    +2 days each
                </span>
            </header>

            {/* ─── SCROLLING CONTENT ─────────────────────── */}
            <div
                ref={contentRef}
                className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden
                           no-scrollbar overscroll-contain
                           [-webkit-overflow-scrolling:touch]"
            >
                <div className="w-full md:max-w-7xl md:mx-auto md:px-6 md:py-6 pb-24 safe-bottom">
                    {/* ─── INTRO ─────────────────────────── */}
                    <div className="text-center space-y-2 max-w-md mx-auto w-full px-4 pt-4 md:max-w-2xl">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                            The more you invite, the more days you earn
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-[13px] md:text-sm leading-relaxed">
                            Invite a fellow nurse and you both win. You get{" "}
                            <strong className="text-blue-600 dark:text-blue-400">2 days Premium</strong>, they get{" "}
                            <strong className="text-emerald-600 dark:text-emerald-400">1 day free</strong>. Stack unlimited days, climb the leaderboard, and help your school win School Wars.
                        </p>
                    </div>

                    {/* ─── DESKTOP 2-COLUMN / MOBILE STACK ── */}
                    <div className="mt-5 grid grid-cols-1 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-4 md:gap-8 items-start px-4 md:px-0">
                        {/* ═══ LEFT: action side ═══ */}
                        <div className="space-y-4 md:sticky md:top-4 md:self-start">
                            {/* Stats row */}
                            <div className="grid grid-cols-3 gap-2">
                                <StatBlock icon={<Users className="w-4 h-4" />} label="Invites" value={stats.invites} tone="blue" />
                                <StatBlock icon={<Gift className="w-4 h-4" />} label="Days" value={stats.daysEarned} tone="emerald" />
                                <StatBlock icon={<Clock className="w-4 h-4" />} label="Pending" value={stats.pending} tone="amber" />
                            </div>

                            {/* QR + avatar + code */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 text-center">
                                {/* Avatar + name strip */}
                                <div className="flex items-center justify-center gap-2.5 mb-3">
                                    <Avatar className="h-9 w-9 ring-2 ring-blue-100 dark:ring-blue-500/20">
                                        <AvatarImage
                                            src={avatarUrl || "/placeholder.svg"}
                                            alt={displayName || "You"}
                                            className="object-cover"
                                        />
                                        <AvatarFallback className="text-xs font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                                            {(displayName || "U")[0].toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="text-left min-w-0">
                                        <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate max-w-[160px]">
                                            {displayName || "Your Invite"}
                                        </p>
                                        <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            Referral Link
                                        </p>
                                    </div>
                                </div>

                                <QRCodeDisplay value={fullRedirectUrl} qrRef={qrRef} />
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                                    Your Personal Code
                                </p>
                                <div className="flex items-center justify-center gap-2 mt-1">
                                    <p className="text-xl sm:text-2xl md:text-3xl font-mono font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase">
                                        {shortCode}
                                    </p>
                                    <button
                                        onClick={handleCopy}
                                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-90"
                                        title="Copy link"
                                        aria-label="Copy referral link"
                                    >
                                        {isCopied ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4 text-slate-400" />
                                        )}
                                    </button>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                        This is your <strong className="text-slate-700 dark:text-slate-200">unique link</strong>. Never share your account credentials.
                                    </p>
                                </div>
                            </div>

                            {/* ── COMPACT ACTION ROW ────────────── */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-3">
                                <div className="flex items-center justify-center gap-3">
                                    {/* WhatsApp */}
                                    <a
                                        href={`https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(shortCode))}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Send via WhatsApp"
                                        title="Send via WhatsApp"
                                        className="group flex flex-col items-center gap-1 min-w-0"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <span className="flex items-center justify-center h-11 w-11 rounded-full
                                                         bg-[#25D366] text-white shadow-sm
                                                         group-active:scale-90 transition-transform">
                                            <WhatsAppIcon className="w-5 h-5" />
                                        </span>
                                        <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                                            WhatsApp
                                        </span>
                                    </a>

                                    {/* Share */}
                                    <button
                                        onClick={handleShare}
                                        aria-label="Share link"
                                        title="Share"
                                        className="group flex flex-col items-center gap-1 min-w-0"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <span className="flex items-center justify-center h-11 w-11 rounded-full
                                                         bg-red-600 text-white shadow-sm
                                                         group-active:scale-90 transition-transform">
                                            <ShareIcon className="w-5 h-5" />
                                        </span>
                                        <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                                            Share
                                        </span>
                                    </button>

                                    {/* Copy */}
                                    <button
                                        onClick={handleCopy}
                                        aria-label="Copy link"
                                        title="Copy link"
                                        className="group flex flex-col items-center gap-1 min-w-0"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <span className="flex items-center justify-center h-11 w-11 rounded-full
                                                         bg-slate-800 dark:bg-slate-700 text-white shadow-sm
                                                         group-active:scale-90 transition-transform">
                                            {isCopied ? <CheckCircle className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
                                        </span>
                                        <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                                            {isCopied ? "Copied" : "Copy"}
                                        </span>
                                    </button>

                                    {/* Download */}
                                    <button
                                        onClick={handleDownloadPDF}
                                        disabled={isDownloading}
                                        aria-label="Download PDF poster"
                                        title="Download poster"
                                        className="group flex flex-col items-center gap-1 min-w-0 disabled:opacity-50"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <span className="flex items-center justify-center h-11 w-11 rounded-full
                                                         bg-emerald-600 text-white shadow-sm
                                                         group-active:scale-90 transition-transform">
                                            {isDownloading ? (
                                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            ) : (
                                                <DownloadIcon className="w-5 h-5" />
                                            )}
                                        </span>
                                        <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                                            {isDownloading ? "Saving..." : "Poster"}
                                        </span>
                                    </button>
                                </div>
                                <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                                    Tip: Download the poster and print it for your school notice board. The QR works straight off paper.
                                </p>
                            </div>
                        </div>

                        {/* ═══ RIGHT: info side ═══ */}
                        <div className="space-y-4">
                            {/* How it works */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                            How the referral program works
                                        </h2>
                                    </div>
                                </div>
                                <div className="p-4 space-y-3">
                                    <HowItWorksRow step="1" icon={<Link2 className="w-4 h-4" />} title="Share your link or post the PDF" body="Send your link on WhatsApp, or download the PDF poster and pin it on your school notice board. Only your unique link or QR counts." />
                                    <HowItWorksRow step="2" icon={<Users className="w-4 h-4" />} title="They sign up with it" body="When they open your link and create a real account, the system automatically links them to you." />
                                    <HowItWorksRow step="3" icon={<Crown className="w-4 h-4" />} title="They get 1 day Premium" body="Your friend receives 1 day of Premium access on signup. No payment needed." />
                                    <HowItWorksRow step="4" icon={<Trophy className="w-4 h-4" />} title="You get 2 days Premium" body="You receive 2 days of Premium for every confirmed signup. Days stack. No cap." />
                                </div>
                            </div>

                            {/* Stack examples */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                                        The more you invite, the more you earn
                                    </p>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                    No monthly cap. Every confirmed signup stacks onto your Premium balance. Some nurses have earned over <strong className="text-blue-600 dark:text-blue-400">180 days</strong> from referrals.
                                </p>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                    <StackExample invites={3} days={6} />
                                    <StackExample invites={10} days={20} />
                                    <StackExample invites={30} days={60} highlight />
                                </div>
                            </div>

                            {/* Print & Post */}
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                        Put it on your school notice board
                                    </p>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Tap <strong className="text-emerald-700 dark:text-emerald-300">Poster</strong> to download a print ready A4 PDF with your QR code and invite code. Print it at any cyber, pin it on your hostel, class, or clinical notice board, and let classmates scan straight from the paper.
                                </p>
                                <ul className="mt-2 space-y-1 text-[10px] text-slate-600 dark:text-slate-400">
                                    <li className="flex items-start gap-1.5">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                                        Print ready A4, works at any cyber or school printer
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                                        Includes your QR code and typed invite code (works without a camera)
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                                        Great for hostels, lecture halls, and clinical rotation groups
                                    </li>
                                </ul>
                            </div>

                            {/* Rules */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Rules & eligibility
                                        </h2>
                                    </div>
                                </div>
                                <div className="p-4 space-y-2.5">
                                    <RuleRow icon={<CheckCircle2 className="w-4 h-4" />} tone="emerald" title="Real nurses only" body="Only real, verifiable nursing students and practitioners qualify." />
                                    <RuleRow icon={<AlertTriangle className="w-4 h-4" />} tone="amber" title="One account per person" body="Each person can only be referred once. Duplicate accounts earn nothing." />
                                    <RuleRow icon={<Ban className="w-4 h-4" />} tone="rose" title="Fake accounts are suspended" body="Creating fake accounts, using bots, or manipulating the system may lead to suspension of your account and loss of all earned rewards, just like Facebook's fake account policy." />
                                    <RuleRow icon={<Ban className="w-4 h-4" />} tone="rose" title="Self referral is not allowed" body="You cannot refer yourself. Same device or same IP signups are reviewed." />
                                    <RuleRow icon={<ShieldCheck className="w-4 h-4" />} tone="blue" title="Rewards can be revoked" body="Fraudulent referrals are removed from your balance without notice." />
                                </div>
                            </div>

                            {/* Transparency */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4">
                                <div className="flex items-start gap-2">
                                    <ShieldCheck className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                        <strong className="text-slate-700 dark:text-slate-200">Our commitment:</strong> Every referral is reviewed within 24 hours. Genuine signups are credited automatically. Fraud is reversed. This keeps the program fair for thousands of real Kenyan nurses.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── COMMUNITY PROOF ─────────────────── */}
                    <div className="pt-6 flex flex-col items-center gap-2 px-4">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map((i) => (
                                <img
                                    key={i}
                                    src={`https://i.pravatar.cc/100?img=${i + 20}`}
                                    className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800"
                                    alt="Community member"
                                    loading="lazy"
                                />
                            ))}
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                +2k
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                Growing the Kenyan Nursing Tribe
                            </p>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-[9px] font-mono text-slate-400 dark:text-slate-600 uppercase tracking-wider px-4">
                        Medrae Nursing Network. Invite. Earn. Print. Post. Advance.
                    </p>
                    <div className="h-16" aria-hidden="true" />
                </div>
            </div>

            {/* ─── Local safe-area helpers ─── */}
            <style>{`
                .safe-top { padding-top: max(env(safe-area-inset-top), 0px); }
                .safe-bottom { padding-bottom: max(env(safe-area-inset-bottom), 0px); }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}