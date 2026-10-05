"use client";

import { useState, useCallback, memo, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
    Copy,
    Share2,
    Users,
    MessageSquare,
    CheckCircle,
    Heart,
    Sparkles,
    FileText,
    Gift,
    Clock,
    Trophy,
    Crown,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { useSession } from "@supabase/auth-helpers-react";
import {
    getMyReferralCode,
    getMyReferralStats,
    buildReferralLink,
    buildWhatsAppMessage,
    type ReferralStats,
} from "@/lib/referrals";

// ─────────────────────────────────────────────────────────────
// QR Code display — unchanged
// ─────────────────────────────────────────────────────────────
const QRCodeDisplay = memo(({ value, qrRef }: { value: string; qrRef?: React.RefObject<HTMLDivElement> }) => (
    <div
        ref={qrRef}
        className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 mb-6 shadow-inner transition-colors duration-200"
    >
        <QRCodeSVG
            value={value}
            size={200}
            level="H"
            className="rounded-lg w-full h-auto"
            bgColor="#ffffff"
            fgColor="#1e293b"
        />
    </div>
));

QRCodeDisplay.displayName = "QRCodeDisplay";

// ─────────────────────────────────────────────────────────────
// Loading skeleton (shown while we fetch the user's code)
// ─────────────────────────────────────────────────────────────
const LoadingState = () => (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="mt-4 text-sm font-bold text-slate-400">Loading your invite...</p>
    </div>
);

// ─────────────────────────────────────────────────────────────
// Error state (rare — only if the user somehow has no code)
// ─────────────────────────────────────────────────────────────
const ErrorState = () => (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-rose-600 dark:text-rose-400" />
        </div>
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">
            Couldn't load your invite code
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xs">
            Please refresh the page. If this keeps happening, contact support.
        </p>
    </div>
);

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export default function LinkGenerator() {
    const session = useSession();
    const [shortCode, setShortCode] = useState<string | null>(null);
    const [stats, setStats] = useState<ReferralStats>({
        invites: 0,
        pending: 0,
        daysEarned: 0,
    });
    const [loading, setLoading] = useState(true);
    const [isCopied, setIsCopied] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const qrRef = useRef<HTMLDivElement>(null);

    // ─── Load the user's referral code + stats ───
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
            setLoading(false);
        })();

        return () => { cancelled = true; };
    }, [session?.user?.id]);

    // ─── Derived ───
    const fullRedirectUrl = shortCode
        ? buildReferralLink(shortCode)
        : "";

    const productionUrl = typeof window !== "undefined"
        ? window.location.origin
        : "https://medrae.vercel.app";

    // ─── Share handler (native share on mobile, fallback to copy) ───
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
                toast.success("Link copied! Send it to your friend.");
                setTimeout(() => setIsCopied(false), 2000);
            }
        } catch (err) {
            if ((err as Error).name !== "AbortError") {
                console.error("Error sharing:", err);
                toast.error("Couldn't share. Try copying the link manually.");
            }
        }
    }, [fullRedirectUrl, shortCode]);

    // ─── Copy link ───
    const handleCopy = useCallback(async () => {
        if (!fullRedirectUrl) return;
        try {
            await navigator.clipboard.writeText(fullRedirectUrl);
            setIsCopied(true);
            toast.success("Link copied to clipboard!");
            setTimeout(() => setIsCopied(false), 2000);
        } catch {
            toast.error("Failed to copy. Please try again.");
        }
    }, [fullRedirectUrl]);

    // ─── SVG → canvas (for PDF export) ───
    const convertSvgToCanvas = useCallback(async (svgElement: SVGElement): Promise<HTMLCanvasElement> => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const svgString = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx?.drawImage(img, 0, 0, img.width, img.height);
                URL.revokeObjectURL(url);
                resolve(canvas);
            };
            img.onerror = reject;
            img.src = url;
        });
    }, []);

    // ─── Download QR as PDF ───
    const handleDownloadPDF = useCallback(async () => {
        if (!qrRef.current || !shortCode) return;

        setIsDownloading(true);

        try {
            const svgElement = qrRef.current.querySelector("svg");
            if (!svgElement) {
                toast.error("QR code not found");
                return;
            }

            const canvas = await convertSvgToCanvas(svgElement);
            const qrImageData = canvas.toDataURL("image/png");

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // Title
            pdf.setFontSize(24);
            pdf.setTextColor(37, 99, 235);
            pdf.text("MEDRAE NURSING", pageWidth / 2, 30, { align: "center" });

            pdf.setFontSize(14);
            pdf.setTextColor(100, 116, 139);
            pdf.text("Join the No.1 Nursing Network in Kenya", pageWidth / 2, 45, { align: "center" });

            // QR code
            const qrSize = 80;
            const qrX = (pageWidth - qrSize) / 2;
            const qrY = 65;
            pdf.addImage(qrImageData, "PNG", qrX, qrY, qrSize, qrSize);

            // Code
            pdf.setFontSize(18);
            pdf.setTextColor(37, 99, 235);
            pdf.text(shortCode, pageWidth / 2, qrY + qrSize + 15, { align: "center" });

            // Instructions
            pdf.setFontSize(11);
            pdf.setTextColor(71, 85, 105);
            pdf.text("Scan this QR code or enter the code above", pageWidth / 2, qrY + qrSize + 30, { align: "center" });
            pdf.text("to get 1 day of Premium free!", pageWidth / 2, qrY + qrSize + 40, { align: "center" });

            // Footer
            pdf.setFontSize(9);
            pdf.setTextColor(148, 163, 184);
            pdf.text("Medrae Nursing • Empowering Kenyan Nurses", pageWidth / 2, pageHeight - 20, { align: "center" });
            pdf.text(productionUrl, pageWidth / 2, pageHeight - 12, { align: "center" });

            pdf.save(`Medrae_Invite_${shortCode}.pdf`);
            toast.success("PDF downloaded successfully!");
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error("Failed to generate PDF. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    }, [shortCode, productionUrl, convertSvgToCanvas]);

    // ─── Loading / error states ───
    if (loading) return <LoadingState />;
    if (!shortCode) return <ErrorState />;

    // ─── Main render ───
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ─── Header ─── */}
            <div className="text-center space-y-3 max-w-md mx-auto">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mb-4 shadow-lg">
                    <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    Invite a Nurse
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-[300px] mx-auto leading-relaxed">
                    Share your personal link. When a friend signs up, you get <strong className="text-blue-600 dark:text-blue-400">2 days Premium</strong> — they get <strong className="text-emerald-600 dark:text-emerald-400">1 day</strong>.
                </p>
            </div>

            {/* ─── Rewards explainer ─── */}
            <div className="mt-5 w-full max-w-md bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 rounded-2xl p-4 border border-violet-200 dark:border-violet-900/50">
                <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <p className="text-xs font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">
                        What You Both Get
                    </p>
                </div>

                <div className="space-y-2">
                    {/* You */}
                    <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-900/40 rounded-xl p-2.5">
                        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
                            <Trophy size={15} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-violet-900 dark:text-violet-200">
                                You get 2 days
                            </p>
                            <p className="text-[10px] text-violet-600 dark:text-violet-400 leading-tight">
                                Every real signup stacks onto your premium
                            </p>
                        </div>
                    </div>

                    {/* Friend */}
                    <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-900/40 rounded-xl p-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                            <Crown size={15} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                They get 1 day
                            </p>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 leading-tight">
                                A free taste of Premium when they join
                            </p>
                        </div>
                    </div>

                    {/* How it works */}
                    <div className="pt-1 flex items-start gap-2">
                        <Clock className="w-3 h-3 text-violet-500 dark:text-violet-400 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-violet-600 dark:text-violet-400 leading-relaxed">
                            Rewards only unlock when they <strong>actually create an account</strong>. Clicks don't count.
                        </p>
                    </div>
                </div>

                {/* Your stats — only if > 0 */}
                {stats.invites > 0 && (
                    <div className="mt-3 pt-3 border-t border-violet-200 dark:border-violet-900/50 flex items-center justify-center gap-3 text-[11px] font-black text-violet-700 dark:text-violet-300">
                        <span>👥 {stats.invites} joined</span>
                        <span>·</span>
                        <span>🎁 {stats.daysEarned} days earned</span>
                    </div>
                )}
            </div>

            {/* ─── QR Code ─── */}
            <div className="relative group mt-6">
                <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 rounded-[3rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />

                <div className="relative bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 text-center transition-colors duration-200">
                    <QRCodeDisplay value={fullRedirectUrl} qrRef={qrRef} />

                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                            Your Personal Code
                        </p>
                        <div className="flex items-center justify-center gap-2">
                            <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 tracking-widest uppercase font-mono">
                                {shortCode}
                            </p>
                            <button
                                onClick={handleCopy}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-90"
                                title="Copy link"
                            >
                                {isCopied ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4 text-slate-400" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Actions ─── */}
            <div className="w-full max-w-xs space-y-3 mt-8">
                <div className="flex gap-3">
                    <Button
                        onClick={handleShare}
                        className="flex-1 h-12 sm:h-14 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all duration-200"
                        style={{ touchAction: "manipulation" }}
                    >
                        <Share2 className="h-5 w-5" />
                        Share
                    </Button>

                    <Button
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="flex-1 h-12 sm:h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:scale-100"
                        style={{ touchAction: "manipulation" }}
                    >
                        {isDownloading ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                            <FileText className="h-5 w-5" />
                        )}
                        PDF
                    </Button>
                </div>

                <a
                    href={`https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(shortCode))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-12 sm:h-14 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all duration-200"
                    style={{ touchAction: "manipulation" }}
                >
                    <MessageSquare className="h-5 w-5" />
                    Send via WhatsApp
                </a>
            </div>

            {/* ─── Community proof ─── */}
            <div className="pt-8 flex flex-col items-center gap-3">
                <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                        <img
                            key={i}
                            src={`https://i.pravatar.cc/100?img=${i + 20}`}
                            className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"
                            alt="Community member"
                            loading="lazy"
                        />
                    ))}
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        +2k
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        Growing the Kenyan Nursing Tribe
                    </p>
                    <Sparkles className="h-3 w-3 text-amber-500" />
                </div>
            </div>

            {/* ─── Hint ─── */}
            <p className="mt-6 text-center text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Download QR as PDF to print or share physically
            </p>

            <p className="mt-4 text-center text-[9px] font-mono text-slate-400 dark:text-slate-600 uppercase tracking-wider">
                Medrae Nursing Network • Empowering Kenyan Nurses
            </p>
        </div>
    );
}