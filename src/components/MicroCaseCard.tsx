"use client";
import { GlobalLoader } from "@/components/GlobalLoader";
import {
    ThumbsUp, Bookmark, Flag, Eye, Heart, BookmarkIcon, ClipboardCheck,
    HelpCircle, CheckCircle2, Lightbulb, Stethoscope, Hash
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
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
}

export function MicroCaseCard({ cardId }: { cardId?: string }) {
    const [card, setCard] = useState<MicroCaseCardType | null>(null);
    const [saved, setSaved] = useState(false);
    const [liked, setLiked] = useState(false);
    const [reported, setReported] = useState(false);
    const [loading, setLoading] = useState(true);
    const [noCard, setNoCard] = useState(false);
    const [cardsBatch, setCardsBatch] = useState<MicroCaseCardType[]>([]);
    const [batchIndex, setBatchIndex] = useState(0);
    const BATCH_SIZE = 25;
    const [counts, setCounts] = useState({ views: 0, likes: 0, saves: 0, reports: 0 });

    const tapSound = typeof Audio !== "undefined" ? new Audio("/sounds/tap0.mp3") : null;

    const session = useSession();
    const supabaseClient = useSupabaseClient();
    const user = session?.user || null;
    const cardRef = useRef<MicroCaseCardType | null>(null);

    // Update the ref whenever the card state changes
    useEffect(() => {
        cardRef.current = card;
    }, [card]);
    useEffect(() => {
        if (!user) return;

        // updated
        supabase.removeAllChannels();

        const channel = supabase
            .channel(`cards_realtime_${user.id}_${Date.now()}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "micro_case_cards",
                },
                async (payload) => {
                    const updatedCard = payload.new as MicroCaseCardType;

                    // Update batch array + localStorage
                    setCardsBatch((prev) => {
                        const exists = prev.some((c) => c.id === updatedCard.id);
                        const newBatch = exists
                            ? prev.map((c) => (c.id === updatedCard.id ? updatedCard : c))
                            : [...prev, updatedCard];
                        localStorage.setItem("cardsBatch", JSON.stringify(newBatch));
                        return newBatch;
                    });

                    // If currently displayed card is this one, refresh counts
                    // We use 'cardRef' or a functional update if needed,
                    // but checking card?.id here is fine.
                    if (cardRef.current?.id === updatedCard.id) {
                        try {
                            const [views, likes, saves, reports] = await Promise.all([
                                supabase.from("micro_case_card_views").select("*", { count: "exact", head: true }).eq("card_id", updatedCard.id),
                                supabase.from("micro_case_card_likes").select("*", { count: "exact", head: true }).eq("card_id", updatedCard.id),
                                supabase.from("micro_case_card_saved_reports").select("*", { count: "exact", head: true }).eq("card_id", updatedCard.id),
                                supabase.from("micro_case_card_reports").select("*", { count: "exact", head: true }).eq("card_id", updatedCard.id),
                            ]);

                            setCounts({
                                views: views.count || 0,
                                likes: likes.count || 0,
                                saves: saves.count || 0,
                                reports: reports.count || 0,
                            });
                        } catch (err) {
                            console.error("Error updating counts:", err);
                        }
                    }
                }
            )
            .subscribe(); // <--- subscribe() must be the LAST call

        return () => {
            // 3. Proper Cleanup
            supabase.removeChannel(channel);
        };
    }, [user]); // Removed 'card' here. If you resubscribe every time 'card' changes, you will hit the error.
    useEffect(() => {
        if (!user || card) return;

        const loadMicroCaseCard = async () => {
            setLoading(true);
            try {
                // Call RPC that returns an unseen micro-case card
                const { data, error } = await supabase
                    .rpc('get_random_micro_case_card', { p_user_id: user.id });

                if (error) throw error;
                if (!data) {
                    setNoCard(true);
                    setCard(null);
                    return;
                }

                setCard(data);
                setNoCard(false);

                // Fetch counts for stats
                const [views, likes, saves, reports] = await Promise.all([
                    supabase.from("micro_case_card_views").select("*", { count: "exact", head: true }).eq("card_id", data.id),
                    supabase.from("micro_case_card_likes").select("*", { count: "exact", head: true }).eq("card_id", data.id),
                    supabase.from("micro_case_card_saved_reports").select("*", { count: "exact", head: true }).eq("card_id", data.id),
                    supabase.from("micro_case_card_reports").select("*", { count: "exact", head: true }).eq("card_id", data.id),
                ]);

                setCounts({
                    views: views.count || 0,
                    likes: likes.count || 0,
                    saves: saves.count || 0,
                    reports: reports.count || 0,
                });

                // Check if user already interacted
                const [{ data: saveData }, { data: likeData }, { data: reportData }] = await Promise.all([
                    supabase.from("micro_case_card_saved_reports").select("id").eq("user_id", user.id).eq("card_id", data.id).maybeSingle(),
                    supabase.from("micro_case_card_likes").select("id").eq("user_id", user.id).eq("card_id", data.id).maybeSingle(),
                    supabase.from("micro_case_card_reports").select("id").eq("user_id", user.id).eq("card_id", data.id).maybeSingle(),
                ]);

                setSaved(!!saveData);
                setLiked(!!likeData);
                setReported(!!reportData);

            } catch (err) {
                console.error("Error fetching micro-case card:", err);
                setNoCard(true);
            } finally {
                setLoading(false);
            }
        };

        loadMicroCaseCard();
    }, [user, cardId]);
    const handleInteraction = async (type: "save" | "like" | "report") => {
        if (!card || !user) return;
        if (tapSound) tapSound.play();

        const tableMap = {
            save: "micro_case_card_saved_reports",
            like: "micro_case_card_likes",
            report: "micro_case_card_reports",
        };
        const table = tableMap[type];
        const isActive = type === "save" ? saved : type === "like" ? liked : reported;

        // 1. Optimistic UI
        setCounts((prev) => ({ ...prev, [type + "s"]: prev[type + "s"] + (isActive ? -1 : 1) }));
        if (type === "save") setSaved(!isActive);
        if (type === "like") setLiked(!isActive);
        if (type === "report") setReported(!isActive);

        try {
            if (!isActive) {
                const payload: any = { user_id: user.id, card_id: card.id };
                if (type === "report") payload.reason = "User flagged case";

                const { error } = await supabase
                    .from(table)
                    .upsert(payload, { onConflict: "user_id,card_id" });

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from(table)
                    .delete()
                    .match({ user_id: user.id, card_id: card.id }); // Use .match for cleaner deletion

                if (error) throw error;
            }
        } catch (error: any) {
            // ROLLBACK
            if (type === "save") setSaved(isActive);
            if (type === "like") setLiked(isActive);
            if (type === "report") setReported(isActive);
            setCounts((prev) => ({ ...prev, [type + "s"]: prev[type + "s"] + (isActive ? 1 : -1) }));

            // Log the actual error to your browser console (F12) to see WHY it failed
            console.error(`Supabase Error (${type}):`, error.message || error);
        }
    };

    if (loading)
        return (
            <Card className="mt-4 relative overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-xl shadow-sm animate-pulse">

                {/* Top Accent Bar (Matches the real card) */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-200 dark:bg-gray-800" />

                {/* Header Skeleton */}
                <div className="px-6 pt-6 pb-2">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {/* Icon Circle Skeleton */}
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />

                            <div className="space-y-2">
                                {/* Label Skeleton */}
                                <div className="h-2 w-20 bg-gray-100 dark:bg-gray-800 rounded-full" />
                                {/* Title Skeleton */}
                                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-full" />
                            </div>
                        </div>

                        {/* Badge Skeleton */}
                        <div className="h-6 w-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                    </div>
                </div>

                <CardContent className="px-6 pb-6 space-y-6">

                    {/* Scenario Area Skeleton (Situation) */}
                    <div className="p-5 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/50 space-y-3">
                        <div className="h-3 w-full bg-gray-200 dark:bg-gray-800 rounded-full" />
                        <div className="h-3 w-[90%] bg-gray-200 dark:bg-gray-800 rounded-full" />
                        <div className="h-3 w-[70%] bg-gray-200 dark:bg-gray-800 rounded-full" />
                    </div>

                    {/* Question/Answer Skeletons */}
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

                    {/* Footer Interaction Skeleton */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">

                        {/* Buttons Skeletons */}
                        <div className="flex gap-2">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
                        </div>

                        {/* Stats Pill Skeleton */}
                        <div className="w-24 h-8 bg-gray-100 dark:bg-gray-800 rounded-full" />
                    </div>

                    {/* Analysis Indicator (The only "active" movement) */}
                    <div className="flex items-center justify-center gap-2 py-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                            Synthesizing Case Data
                        </span>
                        <div className="flex gap-1">
                            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1 h-1 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );

    if (noCard)
        return <p className="text-center py-8 text-red-500 font-semibold">No micro-case card found</p>;

    if (!card) return null;

    return (
        <Card className="mt-4 relative overflow-hidden transition-all duration-300 border-0 hover:border-teal-500/50 dark:bg-muted/30  rounded-xl shadow-xl shadow-teal-500/5 group">
            {/* Top Accent Bar */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 z-20" />

            {/* CONTENT WRAPPER (Z-10 ensures it stays above the image) */}
            <div className="relative z-10">
                {/* Header Section */}
                {/* Header Section */}
                <div className="px-6 pt-6 pb-2">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-teal-500 text-white rounded-xl shadow-lg shadow-teal-500/20">
                                <Stethoscope className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400 leading-none mb-1">
                                    Micro Case Study
                                </h2>
                                <CardTitle className="text-xl font-extrabold text-gray-900 dark:text-gray-100">
                                    {card.title || "Clinical Scenario"}
                                </CardTitle>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            {card.related_unit && (
                                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-none font-bold text-[10px] px-2 py-0.5 rounded-md">
                                    {card.related_unit}
                                </Badge>
                            )}
                            {card.difficulty && (
                                <Badge className={`text-[9px] uppercase font-black border-none px-2 py-0.5 rounded-md ${card.difficulty.toLowerCase() === 'hard' ? 'bg-red-100 text-red-600' :
                                    card.difficulty.toLowerCase() === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                                    }`}>
                                    {card.difficulty}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <CardContent className="px-6 pb-6 space-y-2">

                    {/* 1. THE SITUATION (SCENARIO) */}
                    <div className="group/item relative p-5 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all hover:bg-white/80">
                        <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                            <Eye className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">The Patient Situation</span>
                        </div>
                        <p className="text-[16px] leading-relaxed font-medium text-gray-800 dark:text-gray-200 italic">
                            "{card.scenario}"
                        </p>
                    </div>

                    {/* 2. THE CHALLENGE (QUESTION) */}
                    <div className="relative p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border-l-4 border-blue-500">
                        <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                            <HelpCircle className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Critical Question</span>
                        </div>
                        <p className="text-md font-bold text-gray-900 dark:text-gray-100">
                            {card.question}
                        </p>
                    </div>

                    {/* 3. THE KEY (ANSWER) */}
                    <div className="relative p-5 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border-l-4 border-emerald-500">
                        <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Correct Response</span>
                        </div>
                        <p className="text-md font-bold text-emerald-700 dark:text-emerald-400">
                            {card.answer}
                        </p>
                    </div>

                    {/* 4. THE LOGIC (EXPLANATION) */}
                    {card.explanation && (
                        <div className="p-5 bg-amber-50/30 dark:bg-amber-900/10 rounded-2xl border border-amber-200/50 dark:border-amber-800/30">
                            <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-500">
                                <Lightbulb className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Clinical Rationale</span>
                            </div>
                            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 font-medium">
                                {card.explanation}
                            </p>
                        </div>
                    )}

                    {/* TAGS (BETTER VISUALS) */}
                    {card.tags && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            {card.tags.split(",").map((tag) => (
                                <div key={tag} className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full uppercase tracking-tight">
                                    <Hash className="w-2.5 h-2.5" />
                                    {tag.trim()}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Interaction Footer (Stats & Buttons) */}
                    <div className="pt-6 border-t border-gray-200/60 dark:border-gray-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">

                        {/* Interaction Buttons */}
                        <div className="flex items-center gap-3">
                            {/* SAVE BUTTON */}

                            <button
                                onClick={() => handleInteraction("like")}
                                className={`w-11 h-11 flex items-center justify-center rounded-full transition-all active:scale-95 border ${liked
                                    ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/30'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-transparent hover:bg-gray-200'
                                    }`}
                            >
                                <ThumbsUp size={20} fill={liked ? "currentColor" : "none"} />
                            </button>
                            <button
                                onClick={() => handleInteraction("save")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-xs active:scale-95 ${saved
                                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200'
                                    }`}
                            >
                                <Bookmark size={14} fill={saved ? "currentColor" : "none"} />
                                {saved ? "Saved" : "Save"}
                            </button>

                            {/* LIKE BUTTON */}

                            {/* REPORT BUTTON (NOW TOGGLEABLE) */}
                            <button
                                onClick={() => handleInteraction("report")}
                                title={reported ? "Remove Report" : "Report Issue"}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-xs active:scale-95 ${reported
                                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-rose-50 hover:text-rose-500'
                                    }`}
                            >
                                <Flag size={14} fill={reported ? "currentColor" : "none"} />
                                {reported ? "Reported" : "Report"}
                            </button>

                        </div>

                        {/* Stats with Pill Design */}
                        <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800/50 px-5 py-2 rounded-full border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1.5 border-r border-slate-300 dark:border-slate-600 pr-3">
                                <Eye className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-xs font-black text-slate-600 dark:text-slate-300">{counts.views}</span>
                            </div>
                            <div className="flex items-center gap-1.5 border-r border-slate-300 dark:border-slate-600 pr-3">
                                <Heart className="w-3.5 h-3.5 text-rose-500" />
                                <span className="text-xs font-black text-slate-600 dark:text-slate-300">{counts.likes}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <BookmarkIcon className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-xs font-black text-slate-600 dark:text-slate-300">{counts.saves}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </div>
        </Card>
    );
}