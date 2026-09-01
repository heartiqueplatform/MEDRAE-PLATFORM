"use client";
import { GlobalLoader } from "@/components/GlobalLoader";
import {
    ThumbsUp, Bookmark, Eye, Heart, BookmarkIcon, ImageIcon,
    Brain, Flag, Hash, ExternalLink, Scale, Layers, Activity, X, AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient"
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

// Report reasons specific to flashcards
const FLASHCARD_REPORT_REASONS = [
    "Incorrect or misleading medical information",
    "Outdated clinical guidelines",
    "Spam or promotional content",
    "Copyright violation",
    "Duplicate flashcard",
    "Poor quality or confusing content",
    "Other (please specify)"
];

// Custom hook for mobile detection
const useMobileDetect = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
};

// Function to fetch LIVE stats from database (counts + interactions)
async function fetchFlashcardLiveStats(userId: string, cardId: string) {
    // 1. Fetch the actual card row to get FRESH counts
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

    // 2. Fetch user interactions
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

declare global {
    interface Window {
        _flashcardUpdateListener?: any;
    }
}

const CACHE_KEY = "flashcards_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Optimized: ONLY cache the text that doesn't change (counts removed!)
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
    // Counts removed from here!
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
    const randomIndex = Math.floor(Math.random() * cards.length);
    return cards[randomIndex];
}

// Optimized count update functions using RPC
const updateFlashcardCount = async (cardId: string, action: 'like' | 'unlike' | 'save' | 'unsave') => {
    let rpcFunction = '';
    switch (action) {
        case 'like': rpcFunction = 'increment_flashcard_likes'; break;
        case 'unlike': rpcFunction = 'decrement_flashcard_likes'; break;
        case 'save': rpcFunction = 'increment_flashcard_saves'; break;
        case 'unsave': rpcFunction = 'decrement_flashcard_saves'; break;
    }

    if (rpcFunction) {
        const { error } = await supabase.rpc(rpcFunction, { card_id_param: cardId });
        if (error) {
            console.error(`Failed to ${action}:`, error);
            throw error;
        }
    }
};

export function Flashcard({ cardId }: { cardId?: string }) {
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

    const tapSound = typeof Audio !== "undefined" ? new Audio("/sounds/tap0.mp3") : null;
    const session = useSession();
    const supabaseClient = useSupabaseClient();
    const user = session?.user || null;
    const cardRef = useRef<FlashcardType | null>(null);
    const isMounted = useRef(true);
    const isMobile = useMobileDetect();

    // Update ref
    useEffect(() => {
        cardRef.current = card;
    }, [card]);

    // FIXED: Handle interactions with synchronized state updates
    const handleInteraction = async (type: "save" | "like" | "report", finalReason?: string) => {
        if (!card || !user) return;
        if (tapSound && !isMobile) tapSound.play().catch(() => { });

        if (type === "report" && !reported && !finalReason) {
            setShowReportDialog(true);
            return;
        }

        // Handle SAVE - Update both highlight and count together
        if (type === "save") {
            const newStatus = !saved;

            // Prevent negative count
            if (!newStatus && card.saves_count <= 0) {
                console.warn("Cannot unsave: count is already 0");
                return;
            }

            // UPDATE BOTH: Highlight and Number together
            setSaved(newStatus);
            setCard(prev => prev ? {
                ...prev,
                saves_count: Math.max(0, prev.saves_count + (newStatus ? 1 : -1))
            } : null);

            try {
                if (newStatus) {
                    await updateFlashcardCount(card.id, 'save');
                    await supabase.from("flashcard_saves").upsert({ user_id: user.id, card_id: card.id });
                } else {
                    await updateFlashcardCount(card.id, 'unsave');
                    await supabase.from("flashcard_saves").delete().match({ user_id: user.id, card_id: card.id });
                }
            } catch (error) {
                console.error("Save interaction failed:", error);
                // Revert on error
                setSaved(!newStatus);
                setCard(prev => prev ? {
                    ...prev,
                    saves_count: Math.max(0, prev.saves_count + (newStatus ? -1 : 1))
                } : prev);
            }
            return;
        }

        // Handle LIKE - Update both highlight and count together
        if (type === "like") {
            const newStatus = !liked;

            // Prevent negative count
            if (!newStatus && card.likes_count <= 0) {
                console.warn("Cannot unlike: count is already 0");
                return;
            }

            // UPDATE BOTH: Highlight and Number together
            setLiked(newStatus);
            setCard(prev => prev ? {
                ...prev,
                likes_count: Math.max(0, prev.likes_count + (newStatus ? 1 : -1))
            } : prev);

            try {
                if (newStatus) {
                    await updateFlashcardCount(card.id, 'like');
                    await supabase.from("flashcard_likes").upsert({ user_id: user.id, card_id: card.id });
                } else {
                    await updateFlashcardCount(card.id, 'unlike');
                    await supabase.from("flashcard_likes").delete().match({ user_id: user.id, card_id: card.id });
                }
            } catch (error) {
                console.error("Like interaction failed:", error);
                // Revert on error
                setLiked(!newStatus);
                setCard(prev => prev ? {
                    ...prev,
                    likes_count: Math.max(0, prev.likes_count + (newStatus ? -1 : 1))
                } : prev);
            }
            return;
        }

        // Handle REPORT
        if (type === "report" && finalReason) {
            // Store previous state for rollback
            const previousReported = reported;
            const previousCard = { ...card };

            setReported(true);
            setCard(prev => prev ? {
                ...prev,
                reports_count: prev.reports_count + 1
            } : prev);

            try {
                await supabase.from("flashcard_reports").upsert({
                    user_id: user.id,
                    card_id: card.id,
                    reason: finalReason
                });
                await supabase.rpc('increment_flashcard_reports', { card_id_param: card.id });
            } catch (error) {
                console.error("Report failed:", error);
                // Revert on error
                setReported(previousReported);
                setCard(previousCard);
            }
        }
    };

    const submitReportWithReason = async () => {
        if (!reportReason.trim()) return;
        let finalReason = reportReason;
        if (customReasonText.trim()) {
            finalReason = `${reportReason}\n\nDetails: ${customReasonText.trim()}`;
        }
        setIsSubmittingReport(true);
        await handleInteraction("report", finalReason);
        setShowReportDialog(false);
        setReportReason("");
        setCustomReasonText("");
        setIsSubmittingReport(false);
    };

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

    // FIXED: Load flashcards - Cache for text, live stats for counts and interactions
    useEffect(() => {
        if (!user) return;
        isMounted.current = true;

        const loadFlashcards = async () => {
            setLoading(true);
            let baseCard: any = null;

            // Try cache for TEXT content only
            const cachedCards = getCachedFlashcards();
            if (cachedCards?.length) {
                baseCard = getRandomFlashcard(cachedCards);
            }

            // If no cache, fetch text from DB (no counts)
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
                // 1. ADD THIS LINE HERE:
                await supabase.rpc('increment_flashcard_views', { card_id_param: baseCard.id });

                // FETCH LIVE STATS AND USER STATUS IN ONE GO
                const liveData = await fetchFlashcardLiveStats(user.id, baseCard.id);

                if (isMounted.current) {
                    setCard({
                        ...baseCard,
                        is_active: true,
                        // Use numbers from DB, not from cache
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

        return () => {
            isMounted.current = false;
        };
    }, [user]);

    // Memoized loading skeleton - UPDATED to remove boxing
    const LoadingSkeleton = useMemo(() => (
        <div className="w-full h-full min-h-[400px] bg-white dark:bg-gray-900/50 rounded-xl shadow-sm animate-pulse">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-200 dark:bg-gray-800" />
            <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                        <div className="space-y-2">
                            <div className="h-2 w-24 bg-gray-100 dark:bg-gray-800 rounded-full" />
                            <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        </div>
                    </div>
                    <div className="h-6 w-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                </div>
            </div>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto min-h-0">
                <div className="space-y-3 py-2">
                    <div className="h-3.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full" />
                    <div className="h-3.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full" />
                    <div className="h-3.5 w-[85%] bg-gray-100 dark:bg-gray-800 rounded-full" />
                    <div className="h-3.5 w-[60%] bg-gray-100 dark:bg-gray-800 rounded-full" />
                </div>
                <div className="h-32 w-full bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-200 dark:bg-gray-800" />
                </div>
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="w-28 h-9 bg-gray-50 dark:bg-gray-900 rounded-full" />
                </div>
                <div className="flex items-center justify-center gap-2">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                        Loading Flashcard...
                    </span>
                    <div className="flex gap-1">
                        <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1 h-1 bg-pink-500 rounded-full animate-bounce" />
                    </div>
                </div>
            </div>
        </div>
    ), []);

    // HELPER TO STYLE HEADINGS INSIDE TEXT
    const renderStyledText = (rawText: string) => {
        const cleanText = rawText.replace(/\\n/g, '\n');
        const lines = cleanText.split('\n').filter(line => line.trim() !== '' || line.length > 0);

        return lines.map((line, index) => {
            const trimmedLine = line.trim();
            const lowerLine = trimmedLine.toLowerCase();

            if (lowerLine.startsWith('pathophysiology:') || lowerLine.startsWith('mechanism:')) {
                return (
                    <div key={index} className="mt-5 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-900/40 px-2.5 py-1 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
                            Pathophysiology
                        </span>
                        <p className="mt-2 text-sm sm:text-base text-gray-800 dark:text-gray-200 font-medium leading-relaxed italic border-l-2 border-indigo-200 dark:border-indigo-800 pl-3">
                            {trimmedLine.split(':')[1]?.trim()}
                        </p>
                    </div>
                );
            }

            if (lowerLine.startsWith('exam tip:') || lowerLine.startsWith('key point:')) {
                return (
                    <div key={index} className="my-5 p-4 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-900/20 dark:to-transparent border-l-4 border-amber-500 rounded-r-2xl shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">🔥</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">High-Yield Exam Tip</span>
                        </div>
                        <p className="text-sm sm:text-base text-amber-900 dark:text-amber-200 font-bold leading-relaxed">
                            {trimmedLine.split(':')[1]?.trim()}
                        </p>
                    </div>
                );
            }

            if (lowerLine.startsWith('clinical features:') || lowerLine.startsWith('symptoms:')) {
                return (
                    <div key={index} className="mt-5 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400 bg-rose-100/50 dark:bg-rose-900/40 px-2.5 py-1 rounded-md border border-rose-200/50 dark:border-rose-800/50">
                            Clinical Features
                        </span>
                        <p className="mt-2 text-sm sm:text-base text-gray-800 dark:text-gray-200 font-medium leading-relaxed pl-1">
                            {trimmedLine.split(':')[1]?.trim()}
                        </p>
                    </div>
                );
            }

            if (lowerLine.startsWith('management:') || lowerLine.startsWith('treatment:')) {
                return (
                    <div key={index} className="mt-5 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/40 px-2.5 py-1 rounded-md border border-emerald-200/50 dark:border-emerald-800/50">
                            Management Plan
                        </span>
                        <p className="mt-2 text-sm sm:text-base text-emerald-900 dark:text-emerald-100 font-bold leading-relaxed pl-1">
                            {trimmedLine.split(':')[1]?.trim()}
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
    };

    if (loading) return LoadingSkeleton;

    if (noCard) {
        return (
            <div className="w-full bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="py-8">
                    <p className="text-center text-red-500 font-semibold">No flashcard found</p>
                </div>
            </div>
        );
    }

    if (!card) return null;

    return (
        <>
            <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900/50 rounded-2xl shadow-2xl shadow-indigo-500/10 relative overflow-hidden transition-all duration-300">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 z-20" />
                <div className="relative z-10 flex flex-col h-full w-full overflow-hidden">
                    <div className="flex-none px-4 sm:px-6 pt-5 sm:pt-7 pb-3">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="p-2.5 sm:p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/30 flex-shrink-0">
                                    <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-400 leading-none mb-1.5">
                                        {card.type.replace("_", " ")} Flashcard
                                    </h2>
                                    {card.title && (
                                        <CardTitle className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-gray-100 line-clamp-1">
                                            {card.title}
                                        </CardTitle>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                {card.difficulty && (
                                    <Badge className={`text-[9px] uppercase font-black border-none px-2 py-0.5 rounded-md ${card.difficulty.toLowerCase() === 'hard' ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' :
                                        card.difficulty.toLowerCase() === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300' :
                                            'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300'
                                        }`}>
                                        {card.difficulty}
                                    </Badge>
                                )}
                                <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-none font-bold text-[10px] px-2 py-0.5 rounded-lg">
                                    {card.related_unit || "General"}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 px-3 sm:px-4 py-2 space-y-4 hide-scrollbar">
                        <div className="relative p-3 sm:p-4 bg-white/40 dark:bg-gray-800/30 rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-sm backdrop-blur-sm">
                            <div className="space-y-1">
                                {renderStyledText(card.text)}
                            </div>
                        </div>

                        {card.image_url && (
                            <div className="group relative rounded-2xl overflow-hidden border-4 border-white dark:border-gray-800 shadow-xl bg-white/50 dark:bg-black/20">
                                <img
                                    src={card.image_url}
                                    alt="Study reference"
                                    className="w-full h-auto max-h-80 object-contain"
                                    loading="lazy"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-200/50 dark:border-amber-800/30">
                                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[8px] uppercase font-black text-amber-500/60">Exam Priority</p>
                                    <p className="text-[10px] sm:text-xs font-bold text-amber-700 dark:text-amber-300 truncate">
                                        {card.exam_relevance || 'Standard'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-200/50 dark:border-blue-800/30">
                                <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[8px] uppercase font-black text-blue-500/60">Reference</p>
                                    <p className="text-[10px] sm:text-xs font-bold text-blue-700 dark:text-blue-300 truncate">
                                        {card.source || 'Verified'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {card.tags && (
                            <div className="flex flex-wrap gap-2 pb-4">
                                {card.tags.split(",").slice(0, 5).map((tag) => (
                                    <span key={tag} className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 sm:px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/50 uppercase">
                                        <Hash className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                        {tag.trim()}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex-none px-4 sm:px-6 py-3 sm:py-4 bg-white/95 dark:bg-gray-900/80 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <button
                                    onClick={() => handleInteraction("save")}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all active:scale-90 border-2 ${saved
                                        ? 'bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/30'
                                        : 'bg-white dark:bg-gray-800/30 text-slate-400 border-slate-100 dark:border-slate-800 hover:border-amber-500 hover:text-amber-500 shadow-sm'
                                        }`}
                                    aria-label="Save"
                                >
                                    <Bookmark size={isMobile ? 18 : 20} fill={saved ? "currentColor" : "none"} />
                                </button>
                                <button
                                    onClick={() => handleInteraction("like")}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all active:scale-90 border-2 ${liked
                                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                                        : 'bg-white dark:bg-gray-800/30 text-slate-400 border-slate-100 dark:border-slate-800 hover:border-indigo-500 hover:text-indigo-500 shadow-sm'
                                        }`}
                                    aria-label="Like"
                                >
                                    <ThumbsUp size={isMobile ? 18 : 20} fill={liked ? "currentColor" : "none"} />
                                </button>
                                <button
                                    onClick={() => reported ? fetchAndViewReportReason() : handleInteraction("report")}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all active:scale-90 border-2 ${reported
                                        ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30'
                                        : 'bg-white dark:bg-gray-800/30 text-slate-400 border-slate-100 dark:border-slate-800 hover:border-rose-500 hover:text-rose-500 shadow-sm'
                                        }`}
                                    aria-label="Report"
                                >
                                    <Flag size={isMobile ? 18 : 20} fill={reported ? "currentColor" : "none"} />
                                </button>
                            </div>

                            <div className="flex items-center gap-3 sm:gap-4 bg-slate-100/80 dark:bg-gray-800/50 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-inner">
                                <div className="flex items-center gap-1.5 sm:gap-2 border-r border-slate-300 dark:border-slate-600 pr-2 sm:pr-4">
                                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                                    <span className="text-[10px] sm:text-xs font-black text-slate-700 dark:text-slate-200">{card.views_count}</span>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2 border-r border-slate-300 dark:border-slate-600 pr-2 sm:pr-4">
                                    <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-rose-500" />
                                    <span className="text-[10px] sm:text-xs font-black text-slate-700 dark:text-slate-200">{card.likes_count}</span>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <BookmarkIcon className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />
                                    <span className="text-[10px] sm:text-xs font-black text-slate-700 dark:text-slate-200">{card.saves_count}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Dialog */}
            {showReportDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowReportDialog(false)}>
                    <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-gray-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
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
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewReportReason({ show: false, reason: "" })}>
                    <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-gray-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
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

                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
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
}