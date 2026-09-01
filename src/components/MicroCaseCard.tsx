"use client";
import { GlobalLoader } from "@/components/GlobalLoader";
import {
    ThumbsUp, Bookmark, Flag, Eye, Heart, BookmarkIcon, ClipboardCheck,
    HelpCircle, CheckCircle2, Lightbulb, Stethoscope, Hash, X, AlertCircle
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
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";

interface MicroCaseCardType {
    id: string;
    title?: string;
    scenario: string;
    question: string;
    answer: string;
    explanation?: string;
    related_unit?: string;
    difficulty?: string;
    tags?: string;
    views_count: number;
    likes_count: number;
    saves_count: number;
    reports_count: number;
}

// Optimized: ONLY cache the text that doesn't change (counts removed!)
interface CachedCard {
    id: string;
    title?: string;
    scenario: string;
    question: string;
    answer: string;
    explanation?: string;
    related_unit?: string;
    difficulty?: string;
    tags?: string;
    // Counts removed from here!
}

const CACHE_KEY = "micro_case_cards_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const useMobileDetect = () => {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    return isMobile;
};

// IMPROVED: Fetches Live Count and User Status at the exact same time
async function fetchFreshCardStats(userId: string, cardId: string) {
    // 1. Get the actual numbers from the cards table
    // 2. Get the user's specific like/save/report status
    const [cardReq, savedReq, likedReq, reportedReq] = await Promise.all([
        supabase.from("micro_case_cards").select("views_count, likes_count, saves_count, reports_count").eq("id", cardId).single(),
        supabase.from("micro_case_card_saved_reports").select("card_id").eq("user_id", userId).eq("card_id", cardId).maybeSingle(),
        supabase.from("micro_case_card_likes").select("card_id").eq("user_id", userId).eq("card_id", cardId).maybeSingle(),
        supabase.from("micro_case_card_reports").select("reason").eq("user_id", userId).eq("card_id", cardId).maybeSingle()
    ]);

    return {
        liveCounts: cardReq.data,
        isSaved: !!savedReq.data,
        isLiked: !!likedReq.data,
        isReported: !!reportedReq.data,
        reportReason: reportedReq.data?.reason || null
    };
}

function getCachedMicroCaseCards(): CachedCard[] | null {
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

function saveMicroCaseCards(cards: CachedCard[]): void {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: cards,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error("Failed to save cache:", error);
    }
}

function getRandomCard(cards: CachedCard[]): CachedCard | null {
    if (!cards.length) return null;
    const randomIndex = Math.floor(Math.random() * cards.length);
    return cards[randomIndex];
}

const REPORT_REASONS = [
    "Inappropriate or offensive content",
    "Medical misinformation",
    "Spam or promotional",
    "Copyright violation",
    "Duplicates another case",
    "Other (please specify)"
];

export function MicroCaseCard({ cardId }: { cardId?: string }) {
    const [card, setCard] = useState<MicroCaseCardType | null>(null);
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
    const cardRef = useRef<MicroCaseCardType | null>(null);
    const isMounted = useRef(true);
    const isMobile = useMobileDetect();

    useEffect(() => {
        cardRef.current = card;
    }, [card]);

    // Update count with error handling
    const updateCount = useCallback(async (cardId: string, action: 'like' | 'save' | 'unlike' | 'unsave') => {
        let rpcFunction = '';
        switch (action) {
            case 'like': rpcFunction = 'increment_likes'; break;
            case 'unlike': rpcFunction = 'decrement_likes'; break;
            case 'save': rpcFunction = 'increment_saves'; break;
            case 'unsave': rpcFunction = 'decrement_saves'; break;
        }

        if (rpcFunction) {
            const { error } = await supabase.rpc(rpcFunction, { card_id_param: cardId });
            if (error) {
                console.error(`Failed to ${action}:`, error);
                throw new Error(`Failed to ${action}`);
            }
        }
    }, []);

    // FIXED: Handle interactions with synchronized state updates
    const handleInteraction = async (type: "save" | "like" | "report", finalReason?: string) => {
        if (!card || !user) return;
        if (tapSound && !isMobile) tapSound.play().catch(() => { });

        if (type === "report" && !reported && !finalReason) {
            setShowReportDialog(true);
            return;
        }

        // Handle LIKE - Update both highlight and count together
        if (type === "like") {
            const newLikedStatus = !liked;

            // Prevent negative count
            if (!newLikedStatus && card.likes_count <= 0) {
                console.warn("Cannot unlike: count is already 0");
                return;
            }

            // UPDATE BOTH AT ONCE - Optimistic UI
            setLiked(newLikedStatus);
            setCard(prev => prev ? {
                ...prev,
                likes_count: Math.max(0, prev.likes_count + (newLikedStatus ? 1 : -1))
            } : prev);

            // Update Database
            try {
                if (newLikedStatus) {
                    await updateCount(card.id, 'like');
                    const { error } = await supabase.from("micro_case_card_likes").upsert({ user_id: user.id, card_id: card.id });
                    if (error) throw error;
                } else {
                    await updateCount(card.id, 'unlike');
                    const { error } = await supabase.from("micro_case_card_likes").delete().match({ user_id: user.id, card_id: card.id });
                    if (error) throw error;
                }
            } catch (error) {
                // Revert on error
                console.error("Like interaction failed:", error);
                setLiked(!newLikedStatus);
                setCard(prev => prev ? {
                    ...prev,
                    likes_count: Math.max(0, prev.likes_count + (newLikedStatus ? -1 : 1))
                } : prev);
            }
            return;
        }

        // Handle SAVE - Update both highlight and count together
        if (type === "save") {
            const newSavedStatus = !saved;

            // Prevent negative count
            if (!newSavedStatus && card.saves_count <= 0) {
                console.warn("Cannot unsave: count is already 0");
                return;
            }

            // UPDATE BOTH AT ONCE - Optimistic UI
            setSaved(newSavedStatus);
            setCard(prev => prev ? {
                ...prev,
                saves_count: Math.max(0, prev.saves_count + (newSavedStatus ? 1 : -1))
            } : prev);

            // Update Database
            try {
                if (newSavedStatus) {
                    await updateCount(card.id, 'save');
                    const { error } = await supabase.from("micro_case_card_saved_reports").upsert({ user_id: user.id, card_id: card.id });
                    if (error) throw error;
                } else {
                    await updateCount(card.id, 'unsave');
                    const { error } = await supabase.from("micro_case_card_saved_reports").delete().match({ user_id: user.id, card_id: card.id });
                    if (error) throw error;
                }
            } catch (error) {
                // Revert on error
                console.error("Save interaction failed:", error);
                setSaved(!newSavedStatus);
                setCard(prev => prev ? {
                    ...prev,
                    saves_count: Math.max(0, prev.saves_count + (newSavedStatus ? -1 : 1))
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
                await supabase.from("micro_case_card_reports").upsert({
                    user_id: user.id,
                    card_id: card.id,
                    reason: finalReason
                });
                await supabase.rpc('increment_reports', { card_id_param: card.id });
            } catch (error) {
                console.error("Report interaction failed:", error);
                // Revert optimistic update
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
            .from("micro_case_card_reports")
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

    // FIXED: Load cards - Cache for text, fresh stats for counts and interactions
    useEffect(() => {
        if (!user) return;
        isMounted.current = true;

        const loadData = async () => {
            setLoading(true);
            let baseCard: any = null;

            // Try cache for TEXT content only
            const cachedCards = getCachedMicroCaseCards();
            if (cachedCards?.length) {
                baseCard = getRandomCard(cachedCards);
            }

            // If no cache, fetch text from DB (no counts)
            if (!baseCard) {
                const { data } = await supabase
                    .from("micro_case_cards")
                    .select("id, title, scenario, question, answer, explanation, related_unit, difficulty, tags")
                    .limit(20);

                if (data?.length) {
                    saveMicroCaseCards(data);
                    baseCard = getRandomCard(data);
                }
            }

            if (baseCard && isMounted.current) {
                // FETCH FRESH STATS IMMEDIATELY - counts and user status together
                const stats = await fetchFreshCardStats(user.id, baseCard.id);

                if (isMounted.current) {
                    setCard({
                        ...baseCard,
                        likes_count: stats.liveCounts?.likes_count ?? 0,
                        saves_count: stats.liveCounts?.saves_count ?? 0,
                        views_count: stats.liveCounts?.views_count ?? 0,
                        reports_count: stats.liveCounts?.reports_count ?? 0
                    });
                    setLiked(stats.isLiked);
                    setSaved(stats.isSaved);
                    setReported(stats.isReported);
                    setNoCard(false);
                }
            } else {
                setNoCard(true);
            }
            setLoading(false);
        };

        loadData();

        return () => {
            isMounted.current = false;
        };
    }, [user]);

    // Memoized loading skeleton
    const LoadingSkeleton = useMemo(() => (
        <Card className="mt-4 relative overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 rounded-xl shadow-sm animate-pulse">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-200 dark:bg-gray-800" />
            <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                        <div className="space-y-2">
                            <div className="h-2 w-20 bg-gray-100 dark:bg-gray-800 rounded-full" />
                            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        </div>
                    </div>
                    <div className="h-6 w-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                </div>
            </div>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6">
                <div className="p-4 sm:p-5 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/50 space-y-3">
                    <div className="h-3 w-full bg-gray-200 dark:bg-gray-800 rounded-full" />
                    <div className="h-3 w-[90%] bg-gray-200 dark:bg-gray-800 rounded-full" />
                    <div className="h-3 w-[70%] bg-gray-200 dark:bg-gray-800 rounded-full" />
                </div>
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800" />
                        <div className="h-3 w-[80%] bg-gray-100 dark:bg-gray-800 rounded-full mt-1.5" />
                    </div>
                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800" />
                        <div className="h-3 w-[40%] bg-gray-100 dark:bg-gray-800 rounded-full mt-1.5" />
                    </div>
                </div>
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="w-24 h-8 bg-gray-100 dark:bg-gray-800 rounded-full" />
                </div>
                <div className="flex items-center justify-center gap-2 py-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                        Loading Case...
                    </span>
                    <div className="flex gap-1">
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1 h-1 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce" />
                    </div>
                </div>
            </CardContent>
        </Card>
    ), []);

    if (loading) return LoadingSkeleton;
    if (noCard) {
        return (
            <Card className="mt-4 bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
                <CardContent className="py-8">
                    <p className="text-center text-red-500 font-semibold">No micro-case card found</p>
                </CardContent>
            </Card>
        );
    }
    if (!card) return null;

    return (
        <>
            <Card className="mt-4 relative overflow-hidden transition-all duration-300 border-0 bg-white dark:bg-gray-900/50 rounded-xl shadow-xl shadow-teal-500/5 group">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 z-20" />
                <div className="relative z-10">
                    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="p-2.5 bg-teal-500 text-white rounded-xl shadow-lg shadow-teal-500/20 flex-shrink-0">
                                    <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400 leading-none mb-1">
                                        Micro Case Study
                                    </h2>
                                    <CardTitle className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-gray-100 truncate">
                                        {card.title || "Clinical Scenario"}
                                    </CardTitle>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                {card.related_unit && (
                                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-none font-bold text-[10px] px-2 py-0.5 rounded-md">
                                        {card.related_unit}
                                    </Badge>
                                )}
                                {card.difficulty && (
                                    <Badge className={`text-[9px] uppercase font-black border-none px-2 py-0.5 rounded-md ${card.difficulty.toLowerCase() === 'hard' ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' :
                                        card.difficulty.toLowerCase() === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300' :
                                            'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300'
                                        }`}>
                                        {card.difficulty}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6">
                        <div className="group/item p-4 sm:p-5 bg-white/50 dark:bg-gray-800/30 rounded-2xl border border-slate-200 dark:border-slate-700/50 transition-all hover:bg-white/80 dark:hover:bg-gray-800/50">
                            <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                                <Eye className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">The Patient Situation</span>
                            </div>
                            <p className="text-sm sm:text-base leading-relaxed font-medium text-gray-800 dark:text-gray-200 italic">
                                "{card.scenario}"
                            </p>
                        </div>

                        <div className="p-4 sm:p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border-l-4 border-blue-500">
                            <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                                <HelpCircle className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Critical Question</span>
                            </div>
                            <p className="text-sm sm:text-md font-bold text-gray-900 dark:text-gray-100">
                                {card.question}
                            </p>
                        </div>

                        <div className="p-4 sm:p-5 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border-l-4 border-emerald-500">
                            <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Correct Response</span>
                            </div>
                            <p className="text-sm sm:text-md font-bold text-emerald-700 dark:text-emerald-400">
                                {card.answer}
                            </p>
                        </div>

                        {card.explanation && (
                            <div className="p-4 sm:p-5 bg-amber-50/30 dark:bg-amber-900/10 rounded-2xl border border-amber-200/50 dark:border-amber-800/30">
                                <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-500">
                                    <Lightbulb className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Clinical Rationale</span>
                                </div>
                                <p className="text-xs sm:text-sm leading-relaxed text-gray-600 dark:text-gray-400 font-medium">
                                    {card.explanation}
                                </p>
                            </div>
                        )}

                        {card.tags && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {card.tags.split(",").slice(0, 5).map((tag) => (
                                    <div key={tag} className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full uppercase tracking-tight">
                                        <Hash className="w-2.5 h-2.5" />
                                        {tag.trim()}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="pt-4 sm:pt-6 border-t border-gray-200/60 dark:border-gray-800/60 flex flex-col sm:flex-row items-center gap-4 sm:justify-between">
                            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center sm:justify-start">
                                <button
                                    onClick={() => handleInteraction("like")}
                                    className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full transition-all active:scale-95 border ${liked
                                        ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/30'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                    aria-label="Like"
                                >
                                    <ThumbsUp size={isMobile ? 18 : 20} fill={liked ? "currentColor" : "none"} />
                                </button>
                                <button
                                    onClick={() => handleInteraction("save")}
                                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl transition-all font-bold text-xs active:scale-95 ${saved
                                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                    aria-label="Save"
                                >
                                    <Bookmark size={14} fill={saved ? "currentColor" : "none"} />
                                    <span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
                                </button>
                                <button
                                    onClick={() => reported ? fetchAndViewReportReason() : handleInteraction("report")}
                                    title={reported ? "View Report Reason" : "Report Issue"}
                                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl transition-all font-bold text-xs active:scale-95 ${reported
                                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500'
                                        }`}
                                    aria-label="Report"
                                >
                                    <Flag size={14} fill={reported ? "currentColor" : "none"} />
                                    <span className="hidden sm:inline">{reported ? "View Report" : "Report"}</span>
                                </button>
                            </div>

                            <div className="flex items-center gap-3 sm:gap-4 bg-slate-100 dark:bg-gray-800/50 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-1.5 border-r border-slate-300 dark:border-slate-600 pr-2 sm:pr-3">
                                    <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500" />
                                    <span className="text-[10px] sm:text-xs font-black text-slate-600 dark:text-slate-300">{card.views_count}</span>
                                </div>
                                <div className="flex items-center gap-1.5 border-r border-slate-300 dark:border-slate-600 pr-2 sm:pr-3">
                                    <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500" />
                                    <span className="text-[10px] sm:text-xs font-black text-slate-600 dark:text-slate-300">{card.likes_count}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <BookmarkIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" />
                                    <span className="text-[10px] sm:text-xs font-black text-slate-600 dark:text-slate-300">{card.saves_count}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </div>
            </Card>

            {/* Report Dialog */}
            {showReportDialog && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowReportDialog(false)}>
                    <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-gray-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                                    <Flag className="w-5 h-5 text-rose-500" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Report Micro-Case</h3>
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
                                        {REPORT_REASONS.map((reason) => (
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
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Report Details</h3>
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