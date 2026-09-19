"use client";
import { GlobalLoader } from "@/components/GlobalLoader";
import {
    ThumbsUp, Bookmark, Eye, Heart, BookmarkIcon, ImageIcon,
    Brain, Flag, Hash, Activity, X, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    useEffect, useState, useRef, useCallback, useMemo, memo
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

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
}

const FLASHCARD_REPORT_REASONS = [
    "Incorrect or misleading medical information",
    "Outdated clinical guidelines",
    "Spam or promotional content",
    "Copyright violation",
    "Duplicate flashcard",
    "Poor quality or confusing content",
    "Other (please specify)"
];

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

async function fetchFlashcardLiveStats(userId: string, cardId: string) {
    const { data: cardData } = await supabase
        .from("flashcard_cards")
        .select("views_count, likes_count, saves_count, reports_count")
        .eq("id", cardId)
        .single();

    if (!userId) {
        return {
            counts: cardData,
            interactions: { saved: false, liked: false, reported: false, reportReason: null }
        };
    }

    const [{ data: reports }, { data: saved }, { data: liked }] = await Promise.all([
        supabase.from("flashcard_reports").select("reason").eq("user_id", userId).eq("card_id", cardId).maybeSingle(),
        supabase.from("flashcard_saves").select("card_id").eq("user_id", userId).eq("card_id", cardId).maybeSingle(),
        supabase.from("flashcard_likes").select("card_id").eq("user_id", userId).eq("card_id", cardId).maybeSingle()
    ]);

    return {
        counts: cardData,
        interactions: {
            saved: !!saved,
            liked: !!liked,
            reported: !!reports,
            reportReason: reports?.reason || null
        }
    };
}

const CACHE_KEY = "flashcards_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000;

interface CachedFlashcard {
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
}

function getCachedFlashcards(): CachedFlashcard[] | null {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp >= CACHE_DURATION) return null;
        return parsed.data;
    } catch {
        return null;
    }
}

function saveFlashcards(cards: CachedFlashcard[]): void {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: cards,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error("Failed to save flashcards cache:", error);
    }
}

function getRandomFlashcard(cards: CachedFlashcard[]): CachedFlashcard | null {
    if (!cards || cards.length === 0) return null;
    return cards[Math.floor(Math.random() * cards.length)];
}

const updateFlashcardCount = async (cardId: string, action: "like" | "unlike" | "save" | "unsave") => {
    const map: Record<string, string> = {
        like: "increment_flashcard_likes",
        unlike: "decrement_flashcard_likes",
        save: "increment_flashcard_saves",
        unsave: "decrement_flashcard_saves"
    };
    const rpcFunction = map[action];
    if (!rpcFunction) return;
    const { error } = await supabase.rpc(rpcFunction, { card_id_param: cardId });
    if (error) {
        console.error(`Failed to ${action}:`, error);
        throw error;
    }
};

/* ------------------------------------------------------------------ */
/*  Sub-components (memoized)                                         */
/* ------------------------------------------------------------------ */

const FlashcardActions = memo(function FlashcardActions({
    saved, liked, reported, isMobile,
    onSave, onLike, onReport
}: {
    saved: boolean; liked: boolean; reported: boolean; isMobile: boolean;
    onSave: () => void; onLike: () => void; onReport: () => void;
}) {
    const base = "w-11 h-11 flex items-center justify-center rounded-full transition-all active:scale-90";
    return (
        <div className="flex items-center gap-2">
            <button
                onClick={onSave}
                className={`${base} ${saved ? "bg-amber-500 text-white" : "bg-white/15 text-blue-50 hover:bg-white/25"}`}
                aria-label="Save"
            >
                <Bookmark size={isMobile ? 18 : 20} fill={saved ? "currentColor" : "none"} />
            </button>
            <button
                onClick={onLike}
                className={`${base} ${liked ? "bg-indigo-500 text-white" : "bg-white/15 text-blue-50 hover:bg-white/25"}`}
                aria-label="Like"
            >
                <ThumbsUp size={isMobile ? 18 : 20} fill={liked ? "currentColor" : "none"} />
            </button>
            <button
                onClick={onReport}
                className={`${base} ${reported ? "bg-rose-500 text-white" : "bg-white/15 text-blue-50 hover:bg-white/25"}`}
                aria-label="Report"
            >
                <Flag size={isMobile ? 18 : 20} fill={reported ? "currentColor" : "none"} />
            </button>
        </div>
    );
});

const FlashcardStats = memo(function FlashcardStats({
    views, likes, saves
}: { views: number; likes: number; saves: number }) {
    return (
        <div className="flex items-center gap-4 text-blue-50">
            <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span className="text-xs font-bold tabular-nums">{views}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <Heart className="w-4 h-4" />
                <span className="text-xs font-bold tabular-nums">{likes}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <BookmarkIcon className="w-4 h-4" />
                <span className="text-xs font-bold tabular-nums">{saves}</span>
            </div>
        </div>
    );
});

/* ------------------------------------------------------------------ */
/*  Root component                                                    */
/* ------------------------------------------------------------------ */

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
    const supabaseClient = useSupabaseClient();
    const user = session?.user || null;
    const isMounted = useRef(true);
    const isMobile = useMobileDetect();

    const lastTapRef = useRef(0);
    const playTap = useCallback(() => {
        if (!tapSound || isMobile) return;
        const now = Date.now();
        if (now - lastTapRef.current < 120) return;
        lastTapRef.current = now;
        tapSound.currentTime = 0;
        tapSound.play().catch(() => { });
    }, [tapSound, isMobile]);

    /* ---------------- Interactions ---------------- */
    const handleInteraction = useCallback(
        async (type: "save" | "like" | "report", finalReason?: string) => {
            if (!card || !user) return;
            playTap();

            if (type === "report" && !reported && !finalReason) {
                setShowReportDialog(true);
                return;
            }

            if (type === "save") {
                const newStatus = !saved;
                if (!newStatus && card.saves_count <= 0) return;

                setSaved(newStatus);
                setCard(prev => prev ? {
                    ...prev,
                    saves_count: Math.max(0, prev.saves_count + (newStatus ? 1 : -1))
                } : null);

                try {
                    if (newStatus) {
                        await updateFlashcardCount(card.id, "save");
                        await supabase.from("flashcard_saves").upsert({ user_id: user.id, card_id: card.id });
                    } else {
                        await updateFlashcardCount(card.id, "unsave");
                        await supabase.from("flashcard_saves").delete().match({ user_id: user.id, card_id: card.id });
                    }
                } catch (error) {
                    console.error("Save interaction failed:", error);
                    setSaved(!newStatus);
                    setCard(prev => prev ? {
                        ...prev,
                        saves_count: Math.max(0, prev.saves_count + (newStatus ? -1 : 1))
                    } : prev);
                }
                return;
            }

            if (type === "like") {
                const newStatus = !liked;
                if (!newStatus && card.likes_count <= 0) return;

                setLiked(newStatus);
                setCard(prev => prev ? {
                    ...prev,
                    likes_count: Math.max(0, prev.likes_count + (newStatus ? 1 : -1))
                } : prev);

                try {
                    if (newStatus) {
                        await updateFlashcardCount(card.id, "like");
                        await supabase.from("flashcard_likes").upsert({ user_id: user.id, card_id: card.id });
                    } else {
                        await updateFlashcardCount(card.id, "unlike");
                        await supabase.from("flashcard_likes").delete().match({ user_id: user.id, card_id: card.id });
                    }
                } catch (error) {
                    console.error("Like interaction failed:", error);
                    setLiked(!newStatus);
                    setCard(prev => prev ? {
                        ...prev,
                        likes_count: Math.max(0, prev.likes_count + (newStatus ? -1 : 1))
                    } : prev);
                }
                return;
            }

            if (type === "report" && finalReason) {
                const previousReported = reported;
                const previousCard = { ...card };

                setReported(true);
                setCard(prev => prev ? { ...prev, reports_count: prev.reports_count + 1 } : prev);

                try {
                    await supabase.from("flashcard_reports").upsert({
                        user_id: user.id,
                        card_id: card.id,
                        reason: finalReason
                    });
                    await supabase.rpc("increment_flashcard_reports", { card_id_param: card.id });
                } catch (error) {
                    console.error("Report failed:", error);
                    setReported(previousReported);
                    setCard(previousCard);
                }
            }
        },
        [card, user, saved, liked, reported, playTap]
    );

    const submitReportWithReason = useCallback(async () => {
        if (!reportReason.trim()) return;
        let finalReason = reportReason;
        if (customReasonText.trim()) finalReason = `${reportReason}\n\nDetails: ${customReasonText.trim()}`;
        setIsSubmittingReport(true);
        await handleInteraction("report", finalReason);
        setShowReportDialog(false);
        setReportReason("");
        setCustomReasonText("");
        setIsSubmittingReport(false);
    }, [reportReason, customReasonText, handleInteraction]);

    const fetchAndViewReportReason = useCallback(async () => {
        if (!user || !card) return;
        const { data, error } = await supabase
            .from("flashcard_reports")
            .select("reason")
            .eq("user_id", user.id)
            .eq("card_id", card.id)
            .maybeSingle();
        if (!error && data?.reason) {
            setViewReportReason({ show: true, reason: data.reason });
        } else {
            setViewReportReason({ show: true, reason: "No reason provided" });
        }
    }, [user, card]);

    /* ---------------- Load data ---------------- */
    useEffect(() => {
        if (!user) return;
        isMounted.current = true;

        const loadFlashcards = async () => {
            setLoading(true);
            let baseCard: any = null;

            const cachedCards = getCachedFlashcards();
            if (cachedCards?.length) baseCard = getRandomFlashcard(cachedCards);

            if (!baseCard) {
                const { data } = await supabase
                    .from("flashcard_cards")
                    .select("id, type, title, text, related_unit, difficulty, tags, image_url, source, exam_relevance")
                    .eq("is_active", true)
                    .limit(20);

                if (data?.length) {
                    saveFlashcards(data);
                    baseCard = getRandomFlashcard(data);
                }
            }

            if (baseCard && isMounted.current) {
                await supabase.rpc("increment_flashcard_views", { card_id_param: baseCard.id });
                const liveData = await fetchFlashcardLiveStats(user.id, baseCard.id);

                if (isMounted.current) {
                    setCard({
                        ...baseCard,
                        is_active: true,
                        views_count: liveData.counts?.views_count ?? 0,
                        likes_count: liveData.counts?.likes_count ?? 0,
                        saves_count: liveData.counts?.saves_count ?? 0,
                        reports_count: liveData.counts?.reports_count ?? 0,
                    } as FlashcardType);

                    setSaved(liveData.interactions.saved);
                    setLiked(liveData.interactions.liked);
                    setReported(liveData.interactions.reported);
                    setNoCard(false);
                }
            } else {
                setNoCard(true);
            }
            setLoading(false);
        };

        loadFlashcards();
        return () => { isMounted.current = false; };
    }, [user]);

    /* ---------------- Skeleton (edge-to-edge) ---------------- */
    const LoadingSkeleton = useMemo(() => (
        <div className="w-full min-h-[400px] bg-blue-800 dark:bg-blue-900 animate-pulse">
            <div className="h-1 w-full bg-blue-950" />
            <div className="pt-5 pb-3">
                <div className="flex items-center gap-3 mb-3 px-4">
                    <div className="w-10 h-10 rounded-xl bg-muted/50" />
                    <div className="space-y-2">
                        <div className="h-2 w-24 rounded-full bg-muted/50" />
                        <div className="h-4 w-40 rounded-full bg-muted/50" />
                    </div>
                </div>
            </div>
            <div className="space-y-3">
                <div className="h-3.5 w-full bg-muted/50 rounded-none" />
                <div className="h-3.5 w-full bg-muted/50 rounded-none" />
                <div className="h-3.5 w-[85%] bg-muted/50 rounded-none" />
                <div className="h-3.5 w-[60%] bg-muted/50 rounded-none" />
                <div className="h-32 w-full bg-muted/50 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                </div>
            </div>
        </div>
    ), []);

    /* ---------------- Render helpers ---------------- */
    const renderStyledText = useCallback((rawText: string) => {
        const cleanText = rawText.replace(/\\n/g, "\n");
        const lines = cleanText.split("\n").filter(line => line.trim() !== "" || line.length > 0);

        return lines.map((line, index) => {
            const trimmedLine = line.trim();
            const lowerLine = trimmedLine.toLowerCase();

            if (lowerLine.startsWith("pathophysiology:") || lowerLine.startsWith("mechanism:")) {
                return (
                    <div key={index} className="mt-5 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-900/40 px-2.5 py-1 rounded-md">
                            Pathophysiology
                        </span>
                        <p className="mt-2 text-sm sm:text-base text-gray-800 dark:text-gray-200 font-medium leading-relaxed italic border-l-2 border-indigo-200 dark:border-indigo-800 pl-3">
                            {trimmedLine.split(":")[1]?.trim()}
                        </p>
                    </div>
                );
            }

            if (lowerLine.startsWith("exam tip:") || lowerLine.startsWith("key point:")) {
                return (
                    <div key={index} className="my-5 p-4 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-900/20 dark:to-transparent border-l-4 border-amber-500">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">🔥</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">High-Yield Exam Tip</span>
                        </div>
                        <p className="text-sm sm:text-base text-amber-900 dark:text-amber-200 font-bold leading-relaxed">
                            {trimmedLine.split(":")[1]?.trim()}
                        </p>
                    </div>
                );
            }

            if (lowerLine.startsWith("clinical features:") || lowerLine.startsWith("symptoms:")) {
                return (
                    <div key={index} className="mt-5 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400 bg-rose-100/50 dark:bg-rose-900/40 px-2.5 py-1 rounded-md">
                            Clinical Features
                        </span>
                        <p className="mt-2 text-sm sm:text-base text-gray-800 dark:text-gray-200 font-medium leading-relaxed pl-1">
                            {trimmedLine.split(":")[1]?.trim()}
                        </p>
                    </div>
                );
            }

            if (lowerLine.startsWith("management:") || lowerLine.startsWith("treatment:")) {
                return (
                    <div key={index} className="mt-5 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/40 px-2.5 py-1 rounded-md">
                            Management Plan
                        </span>
                        <p className="mt-2 text-sm sm:text-base text-emerald-900 dark:text-emerald-100 font-bold leading-relaxed pl-1">
                            {trimmedLine.split(":")[1]?.trim()}
                        </p>
                    </div>
                );
            }

            if (trimmedLine.length === 0) return <div key={index} className="h-2" />;

            return (
                <p key={index} className="text-sm sm:text-base leading-relaxed font-medium text-gray-800 dark:text-gray-200 mb-3 last:mb-0">
                    {trimmedLine}
                </p>
            );
        });
    }, []);

    const tags = useMemo(() => card?.tags?.split(",").slice(0, 5) ?? [], [card?.tags]);

    /* ---------------- Early returns ---------------- */
    if (loading) return LoadingSkeleton;

    if (noCard) {
        return (
            <div className="w-full py-10 bg-blue-800 dark:bg-blue-900">
                <p className="text-center text-blue-50 font-semibold">No flashcard found</p>
            </div>
        );
    }

    if (!card) return null;

    /* ---------------- Render (edge-to-edge) ---------------- */
    return (
        <>
            <article className="w-full bg-blue-800 dark:bg-blue-900 relative">
                <div className="h-1 w-full bg-blue-950" />

                {/* Header — full width, inner px only */}
                <header className="pt-5 pb-3">
                    <div className="flex items-start gap-3 px-4">
                        <div className="p-2.5 bg-white/15 text-white rounded-xl flex-shrink-0">
                            <Brain className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-100 leading-none mb-1.5">
                                {card.type.replace("_", " ")} Flashcard
                            </h2>
                            {card.title && (
                                <h3 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
                                    {card.title}
                                </h3>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3 px-4">
                        {card.difficulty && (
                            <span
                                className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md ${card.difficulty.toLowerCase() === "hard"
                                    ? "bg-red-500/30 text-red-100"
                                    : card.difficulty.toLowerCase() === "medium"
                                        ? "bg-amber-500/30 text-amber-100"
                                        : "bg-green-500/30 text-green-100"
                                    }`}
                            >
                                {card.difficulty}
                            </span>
                        )}
                        <span className="bg-white/15 text-blue-50 font-bold text-[10px] px-2 py-0.5 rounded-md">
                            {card.related_unit || "General"}
                        </span>
                    </div>
                </header>

                {/* Body — edge-to-edge sections */}
                <div className="space-y-4">
                    {/* Text block — full width, inner px only */}
                    <div className="px-4 py-3 bg-white/95 dark:bg-blue-950/60">
                        <div className="space-y-1">
                            {renderStyledText(card.text)}
                        </div>
                    </div>

                    {/* Image — full bleed */}
                    {card.image_url && (
                        <div className="w-full bg-white/10 overflow-hidden">
                            <img
                                src={card.image_url}
                                alt="Study reference"
                                className="w-full h-auto max-h-80 object-contain"
                                loading="lazy"
                                decoding="async"
                            />
                        </div>
                    )}

                    {/* Meta grid — edge-to-edge, gap only between cards */}
                    <div className="grid grid-cols-2 gap-px bg-white/10">
                        <div className="flex items-center gap-2 p-3 bg-blue-800 dark:bg-blue-900">
                            <Activity className="w-4 h-4 text-blue-100 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[8px] uppercase font-black text-blue-200">Exam Priority</p>
                                <p className="text-[11px] font-bold text-white truncate">
                                    {card.exam_relevance || "Standard"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-blue-800 dark:bg-blue-900">
                            <ImageIcon className="w-4 h-4 text-blue-100 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[8px] uppercase font-black text-blue-200">Reference</p>
                                <p className="text-[11px] font-bold text-white truncate">
                                    {card.source || "Verified"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tags — full width row */}
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 px-4">
                            {tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="flex items-center gap-1 text-[10px] font-bold text-blue-50 bg-white/15 px-2.5 py-1 rounded-full uppercase"
                                >
                                    <Hash className="w-2.5 h-2.5" />
                                    {tag.trim()}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer — full width, inner px only */}
                <footer className="py-4 mt-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
                        <FlashcardActions
                            saved={saved}
                            liked={liked}
                            reported={reported}
                            isMobile={isMobile}
                            onSave={() => handleInteraction("save")}
                            onLike={() => handleInteraction("like")}
                            onReport={() =>
                                reported ? fetchAndViewReportReason() : handleInteraction("report")
                            }
                        />
                        <FlashcardStats
                            views={card.views_count}
                            likes={card.likes_count}
                            saves={card.saves_count}
                        />
                    </div>
                </footer>
            </article>

            {/* Report Dialog */}
            {showReportDialog && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowReportDialog(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                                    <Flag className="w-5 h-5 text-rose-500" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Report Flashcard</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setShowReportDialog(false);
                                    setCustomReasonText("");
                                    setReportReason("");
                                }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
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
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a reason..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FLASHCARD_REPORT_REASONS.map((reason) => (
                                            <SelectItem key={reason} value={reason}>
                                                {reason}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Additional details (Optional)
                                </label>
                                <textarea
                                    value={customReasonText}
                                    onChange={(e) => setCustomReasonText(e.target.value)}
                                    placeholder="Please provide more context about your report..."
                                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                                    rows={4}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Your feedback helps us improve content quality.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 mt-6">
                            <Button
                                onClick={() => {
                                    setShowReportDialog(false);
                                    setCustomReasonText("");
                                    setReportReason("");
                                }}
                                variant="outline"
                                className="flex-1 order-2 sm:order-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={submitReportWithReason}
                                disabled={!reportReason.trim() || isSubmittingReport}
                                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white order-1 sm:order-2"
                            >
                                {isSubmittingReport ? "Submitting..." : "Submit Report"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Report Dialog */}
            {viewReportReason.show && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setViewReportReason({ show: false, reason: "" })}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                                    <AlertCircle className="w-5 h-5 text-rose-500" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Your Report</h3>
                            </div>
                            <button
                                onClick={() => setViewReportReason({ show: false, reason: "" })}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                            <p className="text-gray-700 dark:text-gray-300 font-medium whitespace-pre-wrap">
                                {viewReportReason.reason}
                            </p>
                        </div>

                        <Button
                            onClick={() => setViewReportReason({ show: false, reason: "" })}
                            className="w-full mt-6 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                            Close
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
});

export default Flashcard;