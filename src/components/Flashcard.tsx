"use client";
import {
    ThumbsUp, Bookmark, Eye, ImageIcon,
    Brain, Flag, Hash, Activity, X, AlertCircle, Sparkles,
    Stethoscope, Pill, Baby, HeartPulse, Leaf, ShieldCheck, Calculator
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    useEffect, useState, useRef, useCallback, useMemo, memo
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@supabase/auth-helpers-react";
import { getCardTheme, type CardTheme } from "@/lib/flashcardThemes";

// ============================================================
// TYPES
// ============================================================
interface FlashcardType {
    id: string;
    type: string;
    title?: string;
    text: string;
    related_unit?: string;
    difficulty?: string;
    tags?: string;
    image_url?: string;
    source?: string;
    exam_relevance?: string;
    views_count: number;
    likes_count: number;
    saves_count: number;
    reports_count: number;
    is_active: boolean;
    is_liked?: boolean;
    is_saved?: boolean;
    is_reported?: boolean;
    report_reason?: string | null;
}

const FLASHCARD_REPORT_REASONS = [
    "Incorrect or misleading medical information",
    "Outdated clinical guidelines",
    "Spam or promotional content",
    "Copyright violation",
    "Duplicate flashcard",
    "Poor quality or confusing content",
    "Other (please specify)",
];

const RPC_TIMEOUT_MS = 7000;

// ============================================================
// HELPERS
// ============================================================
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), ms)
        ),
    ]);
}

const useMobileDetect = () => {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);
    return isMobile;
};

// Detect dark mode via the `dark` class on <html>
const useDarkMode = () => {
    const [isDark, setIsDark] = useState(false);
    useEffect(() => {
        if (typeof window === "undefined") return;
        const check = () =>
            setIsDark(document.documentElement.classList.contains("dark"));
        check();
        const observer = new MutationObserver(check);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => observer.disconnect();
    }, []);
    return isDark;
};

function getUnitIcon(relatedUnit?: string | null) {
    const u = (relatedUnit || "").toLowerCase();
    if (u.includes("pharm") || u.includes("drug")) return Pill;
    if (u.includes("pediatric")) return Baby;
    if (u.includes("obstetric") || u.includes("maternal") || u.includes("newborn")) return HeartPulse;
    if (u.includes("psych")) return Brain;
    if (u.includes("endocrine")) return Activity;
    if (u.includes("respir")) return Leaf;
    if (u.includes("cardio")) return HeartPulse;
    if (u.includes("leader") || u.includes("delegat")) return ShieldCheck;
    if (u.includes("communit") || u.includes("kenya")) return Leaf;
    if (u.includes("calc") || u.includes("dosage")) return Calculator;
    if (u.includes("neurol")) return Brain;
    if (u.includes("renal") || u.includes("nephro") || u.includes("kidney")) return Activity;
    if (u.includes("emergency") || u.includes("trauma")) return ShieldCheck;
    if (u.includes("hematol") || u.includes("blood")) return Activity;
    if (u.includes("medical-surgical") || u.includes("med-surg") || u.includes("medsurg")) return Stethoscope;
    return Stethoscope;
}

// ============================================================
// DATA LAYER
// ============================================================
function normalizeCard(row: any): FlashcardType {
    return {
        id: row.id,
        type: row.type,
        title: row.title,
        text: row.text,
        related_unit: row.related_unit,
        difficulty: row.difficulty,
        tags: row.tags,
        image_url: row.image_url,
        source: row.source,
        exam_relevance: row.exam_relevance,
        views_count: Number(row.views_count ?? 0),
        likes_count: Number(row.likes_count ?? 0),
        saves_count: Number(row.saves_count ?? 0),
        reports_count: Number(row.reports_count ?? 0),
        is_active: true,
        is_liked: !!row.is_liked,
        is_saved: !!row.is_saved,
        is_reported: !!row.is_reported,
        report_reason: row.report_reason ?? null,
    };
}

async function pickFlashcard(userId: string): Promise<FlashcardType | null> {
    try {
        const { data, error } = await withTimeout(
            Promise.resolve(supabase.rpc("get_unseen_flashcard", { p_user_id: userId })),
            RPC_TIMEOUT_MS
        );
        if (!error && data && data.length > 0) return normalizeCard(data[0]);

        const { data: fallback, error: fbErr } = await withTimeout(
            Promise.resolve(supabase.rpc("get_random_flashcard")),
            RPC_TIMEOUT_MS
        );
        if (fbErr || !fallback || fallback.length === 0) return null;
        return normalizeCard(fallback[0]);
    } catch (err) {
        console.warn("[Flashcard] pick failed:", err);
        return null;
    }
}

function fireCounterRpc(rpcName: string, cardId: string): void {
    supabase.rpc(rpcName, { card_id_param: cardId }).then(({ error }) => {
        if (error) console.warn(`[Flashcard] ${rpcName} failed:`, error.message);
    });
}

// ============================================================
// SUBCOMPONENTS
// ============================================================
const FlashcardFooterNew = memo(function FlashcardFooterNew({
    views, likes, saves, saved, liked, reported, themePrimary,
    onSave, onLike, onReport,
}: {
    views: number;
    likes: number;
    saves: number;
    saved: boolean;
    liked: boolean;
    reported: boolean;
    themePrimary: string;
    onSave: () => void;
    onLike: () => void;
    onReport: () => void;
}) {
    const base =
        "flex items-center justify-center gap-1.5 " +
        "h-9 px-3 rounded-full " +
        "text-[11px] font-bold whitespace-nowrap " +
        "transition-transform active:scale-[0.97] " +
        "focus-visible:outline-none";

    const idleBg = "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200";

    return (
        <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-1.5">
                <button
                    onClick={onLike}
                    className={`${base} ${liked ? "" : idleBg}`}
                    style={
                        liked
                            ? { background: themePrimary, color: "#fff" }
                            : undefined
                    }
                    aria-label="Like"
                >
                    <ThumbsUp
                        size={14}
                        fill={liked ? "currentColor" : "none"}
                    />
                    <span className="tabular-nums">{likes}</span>
                </button>

                <button
                    onClick={onSave}
                    className={`${base} ${saved ? "" : idleBg}`}
                    style={
                        saved
                            ? { background: "#f59e0b", color: "#fff" }
                            : undefined
                    }
                    aria-label="Save"
                >
                    <Bookmark
                        size={14}
                        fill={saved ? "currentColor" : "none"}
                    />
                    <span className="tabular-nums">{saves}</span>
                </button>

                <button
                    onClick={onReport}
                    className={`${base} ${reported ? "" : idleBg}`}
                    style={
                        reported
                            ? { background: "#e11d48", color: "#fff" }
                            : undefined
                    }
                    aria-label="Report"
                >
                    <Flag
                        size={14}
                        fill={reported ? "currentColor" : "none"}
                    />
                </button>
            </div>

            <div
                className="flex items-center gap-1.5 px-3 h-9 rounded-full
                           bg-slate-100 dark:bg-white/[0.06]
                           text-slate-700 dark:text-slate-200"
            >
                <Eye className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold tabular-nums">
                    {views}
                </span>
            </div>
        </div>
    );
});

// ============================================================
// ROOT
// ============================================================
export const Flashcard = memo(function Flashcard({ cardId }: { cardId?: string }) {
    const [card, setCard] = useState<FlashcardType | null>(null);
    const [saved, setSaved] = useState(false);
    const [liked, setLiked] = useState(false);
    const [reported, setReported] = useState(false);
    const [loading, setLoading] = useState(true);
    const [noCard, setNoCard] = useState(false);
    const [showReportDialog, setShowReportDialog] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [customReasonText, setCustomReasonText] = useState("");
    const [viewReportReason, setViewReportReason] = useState<{ show: boolean; reason: string }>({ show: false, reason: "" });
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    const tapSound = useMemo(
        () => (typeof Audio !== "undefined" ? new Audio("/sounds/tap0.mp3") : null),
        []
    );
    const session = useSession();
    const user = session?.user || null;
    const isMounted = useRef(true);
    const isMobile = useMobileDetect();
    const isDark = useDarkMode();
    const viewedCardsRef = useRef<Set<string>>(new Set());
    const lastTapRef = useRef(0);

    const playTap = useCallback(() => {
        if (!tapSound || isMobile) return;
        const now = Date.now();
        if (now - lastTapRef.current < 120) return;
        lastTapRef.current = now;
        tapSound.currentTime = 0;
        tapSound.play().catch(() => { });
    }, [tapSound, isMobile]);

    // 🔥 THEME — drives every color below
    const theme = useMemo(() => getCardTheme(card?.related_unit), [card?.related_unit]);
    const UnitIcon = useMemo(() => getUnitIcon(card?.related_unit), [card?.related_unit]);

    // 🔥 Dark-mode aware tokens
    const paperBg = isDark ? theme.paperDark : theme.paper;
    const inkColor = isDark ? theme.inkDark : theme.ink;
    const chipBgColor = isDark ? theme.chipBgDark : theme.chipBg;
    const tipBgColor = isDark ? theme.tipBgDark : theme.tipBg;
    const tipTextColor = isDark ? theme.tipTextDark : theme.tipText;

    // ── Load card ──────────────────────────────────────────
    useEffect(() => {
        if (!user?.id) { setLoading(false); return; }
        isMounted.current = true;
        const load = async () => {
            setLoading(true);
            try {
                const picked = await pickFlashcard(user.id);
                if (!isMounted.current) return;
                if (!picked) { setNoCard(true); return; }
                setCard({ ...picked, views_count: picked.views_count + 1 });
                setLiked(!!picked.is_liked);
                setSaved(!!picked.is_saved);
                setReported(!!picked.is_reported);
                setNoCard(false);

                if (!viewedCardsRef.current.has(picked.id)) {
                    viewedCardsRef.current.add(picked.id);
                    supabase.from("flashcard_views").insert({ user_id: user.id, card_id: picked.id })
                        .then(({ error }) => {
                            if (error && error.code !== "23505") {
                                console.warn("[Flashcard] view row failed:", error.message);
                            }
                        });
                    fireCounterRpc("increment_flashcard_views", picked.id);
                }
            } catch (err) {
                console.error("[Flashcard] load failed:", err);
                if (isMounted.current) setNoCard(true);
            } finally {
                if (isMounted.current) setLoading(false);
            }
        };
        load();
        return () => { isMounted.current = false; };
    }, [user?.id, cardId]);

    // ── Save ───────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        if (!card || !user?.id) return;
        playTap();
        const newStatus = !saved;
        if (!newStatus && card.saves_count <= 0) return;
        const prevCard = card;
        setSaved(newStatus);
        setCard((prev) => prev ? { ...prev, saves_count: Math.max(0, prev.saves_count + (newStatus ? 1 : -1)) } : prev);
        try {
            if (newStatus) {
                const { error } = await supabase.from("flashcard_saves")
                    .upsert({ user_id: user.id, card_id: card.id }, { onConflict: "user_id,card_id" });
                if (error) throw error;
                fireCounterRpc("increment_flashcard_saves", card.id);
            } else {
                const { error } = await supabase.from("flashcard_saves")
                    .delete().match({ user_id: user.id, card_id: card.id });
                if (error) throw error;
                fireCounterRpc("decrement_flashcard_saves", card.id);
            }
        } catch (err) {
            console.warn("[Flashcard] save failed:", err);
            setSaved(!newStatus); setCard(prevCard);
        }
    }, [card, user?.id, saved, playTap]);

    // ── Like ───────────────────────────────────────────────
    const handleLike = useCallback(async () => {
        if (!card || !user?.id) return;
        playTap();
        const newStatus = !liked;
        if (!newStatus && card.likes_count <= 0) return;
        const prevCard = card;
        setLiked(newStatus);
        setCard((prev) => prev ? { ...prev, likes_count: Math.max(0, prev.likes_count + (newStatus ? 1 : -1)) } : prev);
        try {
            if (newStatus) {
                const { error } = await supabase.from("flashcard_likes")
                    .upsert({ user_id: user.id, card_id: card.id }, { onConflict: "user_id,card_id" });
                if (error) throw error;
                fireCounterRpc("increment_flashcard_likes", card.id);
            } else {
                const { error } = await supabase.from("flashcard_likes")
                    .delete().match({ user_id: user.id, card_id: card.id });
                if (error) throw error;
                fireCounterRpc("decrement_flashcard_likes", card.id);
            }
        } catch (err) {
            console.warn("[Flashcard] like failed:", err);
            setLiked(!newStatus); setCard(prevCard);
        }
    }, [card, user?.id, liked, playTap]);

    // ── Report ─────────────────────────────────────────────
    const submitReportWithReason = useCallback(async () => {
        if (!card || !user?.id || !reportReason.trim()) return;
        let finalReason = reportReason;
        if (customReasonText.trim()) finalReason = `${reportReason}\n\nDetails: ${customReasonText.trim()}`;
        setIsSubmittingReport(true);
        const prevCard = card;
        const prevReported = reported;
        setReported(true);
        setCard((prev) => prev ? { ...prev, reports_count: prev.reports_count + 1 } : prev);
        try {
            const { error } = await supabase.from("flashcard_reports")
                .upsert({ user_id: user.id, card_id: card.id, reason: finalReason }, { onConflict: "user_id,card_id" });
            if (error) throw error;
            fireCounterRpc("increment_flashcard_reports", card.id);
        } catch (err) {
            console.warn("[Flashcard] report failed:", err);
            setReported(prevReported); setCard(prevCard);
        } finally {
            setShowReportDialog(false); setReportReason(""); setCustomReasonText(""); setIsSubmittingReport(false);
        }
    }, [card, user?.id, reportReason, customReasonText, reported]);

    const fetchAndViewReportReason = useCallback(async () => {
        if (!user || !card) return;
        const { data, error } = await supabase.from("flashcard_reports")
            .select("reason").eq("user_id", user.id).eq("card_id", card.id).maybeSingle();
        if (!error && data?.reason) setViewReportReason({ show: true, reason: data.reason });
        else setViewReportReason({ show: true, reason: "No reason provided" });
    }, [user, card]);

    // ── Skeleton — neutral, no theme color ─────────────────
    const LoadingSkeleton = useMemo(
        () => (
            <div className="w-full min-h-[400px] rounded-none overflow-hidden shadow-lg bg-card border border-border animate-pulse">
                <div className="h-1.5 w-full bg-muted" />
                <div className="pt-5 pb-3">
                    <div className="flex items-center gap-3 mb-3 px-4">
                        <div className="w-10 h-10 rounded-xl bg-muted" />
                        <div className="space-y-2">
                            <div className="h-2 w-24 rounded-full bg-muted" />
                            <div className="h-4 w-40 rounded-full bg-muted" />
                        </div>
                    </div>
                    <div className="flex gap-2 px-4">
                        <div className="h-4 w-14 rounded-md bg-muted" />
                        <div className="h-4 w-20 rounded-md bg-muted" />
                    </div>
                </div>
                <div className="mx-3 mb-3 rounded-xl bg-muted/50 p-4">
                    <div className="space-y-3">
                        <div className="h-3.5 w-full rounded bg-muted-foreground/20" />
                        <div className="h-3.5 w-full rounded bg-muted-foreground/20" />
                        <div className="h-3.5 w-[85%] rounded bg-muted-foreground/20" />
                        <div className="h-3.5 w-[60%] rounded bg-muted-foreground/20" />
                        <div className="h-32 w-full rounded-lg bg-muted-foreground/10 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mx-3 mb-3">
                    <div className="h-12 rounded-lg bg-muted" />
                    <div className="h-12 rounded-lg bg-muted" />
                </div>
                <div className="flex items-center justify-between gap-4 px-4 py-4">
                    <div className="flex gap-2">
                        <div className="w-11 h-11 rounded-full bg-muted" />
                        <div className="w-11 h-11 rounded-full bg-muted" />
                        <div className="w-11 h-11 rounded-full bg-muted" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-6 w-14 rounded-full bg-muted" />
                        <div className="h-6 w-14 rounded-full bg-muted" />
                        <div className="h-6 w-14 rounded-full bg-muted" />
                    </div>
                </div>
            </div>
        ),
        []
    );

    // ── Rich text — every color comes from `theme` ─────────
    const renderStyledText = useCallback((rawText: string) => {
        const cleanText = rawText.replace(/\\n/g, "\n");
        const lines = cleanText.split("\n").filter((line) => line.trim() !== "" || line.length > 0);

        const chip = (label: string) => (
            <span
                className="text-[10px]   uppercase tracking-[0.2em] px-2.5 py-1 rounded-md"
                style={{ background: chipBgColor, color: isDark ? theme.accent : theme.primary }}
            >
                {label}
            </span>
        );

        return lines.map((line, index) => {
            const trimmedLine = line.trim();
            const lowerLine = trimmedLine.toLowerCase();

            if (lowerLine.startsWith("pathophysiology:") || lowerLine.startsWith("mechanism:")) {
                return (
                    <div key={index} className="mt-5 mb-2">
                        {chip("Pathophysiology")}
                        <p className="mt-2 text-sm sm:text-base font-medium leading-relaxed italic border-l-2 pl-3"
                            style={{ color: inkColor, borderColor: theme.accent }}>
                            {trimmedLine.split(":")[1]?.trim()}
                        </p>
                    </div>
                );
            }

            if (lowerLine.startsWith("exam tip:") || lowerLine.startsWith("key point:") || lowerLine.startsWith("nck loves this:")) {
                return (
                    <div key={index}
                        className="my-5 p-4 border-l-4 rounded-r-lg"
                        style={{ background: tipBgColor, borderColor: theme.tipBorder }}>
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4" style={{ color: theme.tipBorder }} />
                            <span className="text-[10px]   uppercase tracking-widest"
                                style={{ color: tipTextColor }}>
                                {lowerLine.startsWith("nck loves this:") ? "NCK Loves This" : "High-Yield Exam Tip"}
                            </span>
                        </div>
                        <p className="text-sm sm:text-base font-bold leading-relaxed" style={{ color: tipTextColor }}>
                            {trimmedLine.split(":")[1]?.trim()}
                        </p>
                    </div>
                );
            }

            if (lowerLine.startsWith("clinical features:") || lowerLine.startsWith("symptoms:")) {
                return (
                    <div key={index} className="mt-5 mb-2">
                        {chip("Clinical Features")}
                        <p className="mt-2 text-sm sm:text-base font-medium leading-relaxed pl-1" style={{ color: inkColor }}>
                            {trimmedLine.split(":")[1]?.trim()}
                        </p>
                    </div>
                );
            }

            if (lowerLine.startsWith("management:") || lowerLine.startsWith("treatment:")) {
                return (
                    <div key={index} className="mt-5 mb-2">
                        {chip("Management Plan")}
                        <p className="mt-2 text-sm sm:text-base font-bold leading-relaxed pl-1" style={{ color: inkColor }}>
                            {trimmedLine.split(":")[1]?.trim()}
                        </p>
                    </div>
                );
            }

            if (lowerLine.startsWith("nck trick:")) {
                return (
                    <div key={index} className="my-3 p-3 rounded-lg border border-dashed"
                        style={{ background: chipBgColor, borderColor: theme.accent }}>
                        <span className="text-[9px]   uppercase tracking-widest"
                            style={{ color: isDark ? theme.accent : theme.primary }}>
                            NCK Trick
                        </span>
                        <p className="mt-1 text-sm font-medium leading-relaxed" style={{ color: inkColor }}>
                            {trimmedLine.replace(/^nck trick:/i, "").trim()}
                        </p>
                    </div>
                );
            }

            if (trimmedLine.length === 0) return <div key={index} className="h-2" />;

            return (
                <p key={index} className="text-sm sm:text-base leading-relaxed font-medium mb-3 last:mb-0"
                    style={{ color: inkColor }}>
                    {trimmedLine}
                </p>
            );
        });
    }, [theme, isDark, inkColor, chipBgColor, tipBgColor, tipTextColor]);

    const tags = useMemo(() => card?.tags?.split(",").slice(0, 5) ?? [], [card?.tags]);

    // ── Early returns ──────────────────────────────────────
    if (loading) return LoadingSkeleton;

    if (noCard || !card) {
        return (
            <div className="w-full py-10 rounded-none bg-muted border border-border">
                <p className="text-center text-muted-foreground font-semibold">
                    {noCard ? "You've reviewed every flashcard — more coming soon!" : "No flashcard available"}
                </p>
            </div>
        );
    }

    return (
        <>
            {/* 🔥 Shell — per-unit gradient */}
            <article
                className="w-full relative rounded-none overflow-hidden
                           bg-white dark:bg-[#161b22]
                           shadow-sm"
            >
                {/* Header */}
                <header className="pt-4 pb-3 px-4 border-b border-slate-100 dark:border-white/[0.04]">
                    <div className="flex items-start gap-3">
                        {/* Unit icon chip — carries the color identity */}
                        <div
                            className="p-2 rounded-xl flex-shrink-0"
                            style={{
                                background: `${theme.primary}1a`,
                                color: theme.primary,
                            }}
                        >
                            <UnitIcon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider
                                          text-slate-500 dark:text-slate-400 leading-none mb-1">
                                {card.related_unit || theme.name} ·{" "}
                                {card.type.replace(/_/g, " ")}
                            </p>
                            {card.title && (
                                <h3 className="text-base sm:text-lg font-bold
                                               text-slate-900 dark:text-white leading-snug">
                                    {card.title}
                                </h3>
                            )}
                        </div>
                    </div>

                    {/* Difficulty + unit badges */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {card.difficulty && (
                            <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full
                                    ${card.difficulty.toLowerCase() === "hard"
                                        ? "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"
                                        : card.difficulty.toLowerCase() === "medium"
                                            ? "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
                                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
                                    }`}
                            >
                                {card.difficulty}
                            </span>
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full
                                         bg-slate-100 text-slate-600
                                         dark:bg-white/[0.06] dark:text-slate-300">
                            {card.related_unit || "General"}
                        </span>
                    </div>
                </header>

                {/* Body — flat inner panel, no paper, no spine */}
                <div className="px-4 py-4">
                    <div className="space-y-1">{renderStyledText(card.text)}</div>

                    {card.image_url && (
                        <div className="mt-4 rounded-xl overflow-hidden border border-slate-100 dark:border-white/[0.04]">
                            <img
                                src={card.image_url}
                                alt="Study reference"
                                className="w-full h-auto max-h-80 object-contain bg-slate-50 dark:bg-[#0d1117]"
                                loading="lazy"
                                decoding="async"
                            />
                        </div>
                    )}
                </div>

                {/* Meta row — 2 columns, neutral, no dark cells */}
                <div className="grid grid-cols-2 gap-2 mx-4 mb-3">
                    <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Activity className="w-3 h-3 text-slate-400" />
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Exam priority
                            </p>
                        </div>
                        <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                            {card.exam_relevance || "Standard"}
                        </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                            <ImageIcon className="w-3 h-3 text-slate-400" />
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Reference
                            </p>
                        </div>
                        <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                            {card.source || "Verified"}
                        </p>
                    </div>
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                        {tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-1
                                           text-[10px] font-bold uppercase tracking-wider
                                           px-2 py-0.5 rounded-full
                                           bg-slate-100 text-slate-600
                                           dark:bg-white/[0.06] dark:text-slate-300"
                            >
                                <Hash className="w-2.5 h-2.5" />
                                {tag.trim()}
                            </span>
                        ))}
                    </div>
                )}

                {/* Footer — flat, no scrim, no colored pills */}
                <footer className="px-4 py-3 border-t border-slate-100 dark:border-white/[0.04]">
                    <FlashcardFooterNew
                        views={card.views_count}
                        likes={card.likes_count}
                        saves={card.saves_count}
                        saved={saved}
                        liked={liked}
                        reported={reported}
                        themePrimary={theme.primary}
                        onSave={handleSave}
                        onLike={handleLike}
                        onReport={() =>
                            reported
                                ? fetchAndViewReportReason()
                                : setShowReportDialog(true)
                        }
                    />
                </footer>
            </article>

            {/* Report Dialog */}
            {showReportDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowReportDialog(false)}>
                    <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg" style={{ background: `${theme.primary}22` }}>
                                    <Flag className="w-5 h-5" style={{ color: theme.primary }} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Report Flashcard</h3>
                            </div>
                            <button onClick={() => { setShowReportDialog(false); setCustomReasonText(""); setReportReason(""); }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Select a reason and optionally add details:
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Reason for reporting *
                                </label>
                                <Select value={reportReason} onValueChange={setReportReason}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="Select a reason..." /></SelectTrigger>
                                    <SelectContent>
                                        {FLASHCARD_REPORT_REASONS.map((reason) => (
                                            <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Additional details (Optional)
                                </label>
                                <textarea value={customReasonText} onChange={(e) => setCustomReasonText(e.target.value)}
                                    placeholder="Please provide more context about your report..."
                                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:border-transparent resize-none"
                                    style={{ outlineColor: theme.primary }}
                                    rows={4} />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Your feedback helps us improve content quality.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 mt-6">
                            <Button variant="outline" className="flex-1 order-2 sm:order-1"
                                onClick={() => { setShowReportDialog(false); setCustomReasonText(""); setReportReason(""); }}>
                                Cancel
                            </Button>
                            <Button onClick={submitReportWithReason}
                                disabled={!reportReason.trim() || isSubmittingReport}
                                className="flex-1 text-white order-1 sm:order-2"
                                style={{ background: theme.primary }}>
                                {isSubmittingReport ? "Submitting..." : "Submit Report"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Report Dialog */}
            {viewReportReason.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setViewReportReason({ show: false, reason: "" })}>
                    <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg" style={{ background: `${theme.primary}22` }}>
                                    <AlertCircle className="w-5 h-5" style={{ color: theme.primary }} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Your Report</h3>
                            </div>
                            <button onClick={() => setViewReportReason({ show: false, reason: "" })}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                            <p className="text-gray-700 dark:text-gray-300 font-medium whitespace-pre-wrap">
                                {viewReportReason.reason}
                            </p>
                        </div>
                        <Button onClick={() => setViewReportReason({ show: false, reason: "" })}
                            className="w-full mt-6 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                            Close
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
});

export default Flashcard;