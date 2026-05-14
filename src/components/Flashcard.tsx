"use client";
import { GlobalLoader } from "@/components/GlobalLoader";
import {
    ThumbsUp, Bookmark, Eye, Heart, BookmarkIcon, ImageIcon,
    Brain, Flag, Hash, ExternalLink, Scale, Layers, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
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
}

export function Flashcard({ cardId }: { cardId?: string }) {
    const [card, setCard] = useState<FlashcardType | null>(null);


    const [saved, setSaved] = useState(false);
    const [liked, setLiked] = useState(false);
    const [reported, setReported] = useState(false);

    const [loading, setLoading] = useState(true);
    const [noCard, setNoCard] = useState(false);
    // Batch fetching
    const [cardsBatch, setCardsBatch] = useState<FlashcardType[]>([]); // holds fetched cards
    const [batchIndex, setBatchIndex] = useState(0); // which batch we are on
    const BATCH_SIZE = 25; // number of cards per fetch
    const [counts, setCounts] = useState({
        views: 0,
        likes: 0,
        saves: 0,
        reports: 0,
    });

    const tapSound = typeof Audio !== "undefined" ? new Audio("/sounds/tap0.mp3") : null;

    // Fetch user once

    const session = useSession();          // gets the current session
    const supabaseClient = useSupabaseClient(); // gets supabase client
    const user = session?.user || null;    // current user from context

    useEffect(() => {
        if (!user || card) return;
        const subscription = supabase
            .channel('flashcards')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'flashcard_cards', filter: 'is_active=eq.true' },
                async (payload) => {
                    const updatedCard = payload.new as FlashcardType;

                    // Update the batch array
                    setCardsBatch((prev) => {
                        const exists = prev.some((c) => c.id === updatedCard.id);
                        const newBatch = exists
                            ? prev.map((c) => (c.id === updatedCard.id ? updatedCard : c))
                            : [...prev, updatedCard];

                        // Update localStorage
                        localStorage.setItem("flashcardsBatch", JSON.stringify(newBatch));
                        return newBatch;
                    });

                    // If the currently displayed card is this one, refresh counts and interactions
                    if (card && card.id === updatedCard.id) {
                        try {
                            const [views, likes, saves, reports] = await Promise.all([
                                supabase.from("flashcard_views").select("*", { count: "exact", head: true }).eq("card_id", updatedCard.id),
                                supabase.from("flashcard_likes").select("*", { count: "exact", head: true }).eq("card_id", updatedCard.id),
                                supabase.from("flashcard_saves").select("*", { count: "exact", head: true }).eq("card_id", updatedCard.id),
                                supabase.from("flashcard_reports").select("*", { count: "exact", head: true }).eq("card_id", updatedCard.id),
                            ]);

                            setCounts({
                                views: views.count || 0,
                                likes: likes.count || 0,
                                saves: saves.count || 0,
                                reports: reports.count || 0,
                            });

                            // Check user interactions
                            const [{ data: saveData }, { data: likeData }, { data: reportData }] = await Promise.all([
                                supabase.from("flashcard_saves").select("id").eq("user_id", user.id).eq("card_id", updatedCard.id).maybeSingle(),
                                supabase.from("flashcard_likes").select("id").eq("user_id", user.id).eq("card_id", updatedCard.id).maybeSingle(),
                                supabase.from("flashcard_reports").select("id").eq("user_id", user.id).eq("card_id", updatedCard.id).maybeSingle(),
                            ]);

                            setSaved(!!saveData);
                            setLiked(!!likeData);
                            setReported(!!reportData);

                        } catch (err) {
                            console.error("Error updating counts from subscription:", err);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user, card]);
    useEffect(() => {
        if (!user || card) return;
        const loadFlashcard = async () => {
            setLoading(true);
            try {
                // Call RPC that ensures unseen card for this user
                const { data, error } = await supabase
                    .rpc('get_random_flashcard', { p_user_id: user.id });

                if (error) throw error;

                if (!data) {
                    setNoCard(true);
                    setCard(null);
                    return;
                }

                setCard(data);
                setNoCard(false);

                // Fetch counts
                const [views, likes, saves, reports] = await Promise.all([
                    supabase.from("flashcard_views").select("*", { count: "exact", head: true }).eq("card_id", data.id),
                    supabase.from("flashcard_likes").select("*", { count: "exact", head: true }).eq("card_id", data.id),
                    supabase.from("flashcard_saves").select("*", { count: "exact", head: true }).eq("card_id", data.id),
                    supabase.from("flashcard_reports").select("*", { count: "exact", head: true }).eq("card_id", data.id),
                ]);

                setCounts({
                    views: views.count || 0,
                    likes: likes.count || 0,
                    saves: saves.count || 0,
                    reports: reports.count || 0,
                });

                // Check user interactions
                const [{ data: saveData }, { data: likeData }, { data: reportData }] = await Promise.all([
                    supabase.from("flashcard_saves").select("id").eq("user_id", user.id).eq("card_id", data.id).maybeSingle(),
                    supabase.from("flashcard_likes").select("id").eq("user_id", user.id).eq("card_id", data.id).maybeSingle(),
                    supabase.from("flashcard_reports").select("id").eq("user_id", user.id).eq("card_id", data.id).maybeSingle(),
                ]);

                setSaved(!!saveData);
                setLiked(!!likeData);
                setReported(!!reportData);

            } catch (err) {
                console.error("Error fetching flashcard:", err);
                setNoCard(true);
            } finally {
                setLoading(false);
            }
        };

        loadFlashcard();
    }, [user, cardId]);
    const handleInteraction = async (type: "save" | "like" | "report") => {
        if (!card || !user) return;
        if (tapSound) tapSound.play();

        const tableMap = {
            save: "flashcard_saves",
            like: "flashcard_likes",
            report: "flashcard_reports",
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
                if (type === "report") payload.reason = "User flagged flashcard";
                await supabase.from(table).upsert(payload, { onConflict: "user_id,card_id" });
            } else {
                await supabase.from(table).delete().match({ user_id: user.id, card_id: card.id });
            }
        } catch (error) {
            console.error(`Error toggling ${type}:`, error);
            // Rollback on error
            if (type === "save") setSaved(isActive);
            if (type === "like") setLiked(isActive);
            if (type === "report") setReported(isActive);
            setCounts((prev) => ({ ...prev, [type + "s"]: prev[type + "s"] + (isActive ? 1 : -1) }));
        }
    };

    // HELPER TO STYLE HEADINGS INSIDE TEXT
    const renderStyledText = (rawText: string) => {
        // 1. CLEAN THE TEXT: This replaces the literal "\n" text with actual line breaks
        const cleanText = rawText.replace(/\\n/g, '\n');

        // 2. SPLIT into lines, then filter out any triple-empty gaps
        const lines = cleanText.split('\n').filter(line => line.trim() !== '' || line.length > 0);

        return lines.map((line, index) => {
            const trimmedLine = line.trim();
            const lowerLine = trimmedLine.toLowerCase();

            // --- PARSER FOR HEADINGS ---

            // A. PATHOPHYSIOLOGY (Indigo)
            if (lowerLine.startsWith('pathophysiology:') || lowerLine.startsWith('mechanism:')) {
                return (
                    <div key={index} className="mt-5 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-900/40 px-2.5 py-1 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
                            Pathophysiology
                        </span>
                        <p className="mt-2 text-[16px] text-gray-800 dark:text-gray-200 font-medium leading-relaxed italic border-l-2 border-indigo-200 dark:border-indigo-800 pl-3">
                            {trimmedLine.split(':')[1]?.trim()}
                        </p>
                    </div>
                );
            }

            // B. EXAM TIPS (Amber/Gold Highlight Box)
            if (lowerLine.startsWith('exam tip:') || lowerLine.startsWith('key point:')) {
                return (
                    <div key={index} className="my-5 p-4 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-900/20 dark:to-transparent border-l-4 border-amber-500 rounded-r-2xl shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">🔥</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">High-Yield Exam Tip</span>
                        </div>
                        <p className="text-[15px] text-amber-900 dark:text-amber-200 font-bold leading-relaxed">
                            {trimmedLine.split(':')[1]?.trim()}
                        </p>
                    </div>
                );
            }

            // C. CLINICAL FEATURES (Rose/Red)
            if (lowerLine.startsWith('clinical features:') || lowerLine.startsWith('symptoms:')) {
                return (
                    <div key={index} className="mt-5 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400 bg-rose-100/50 dark:bg-rose-900/40 px-2.5 py-1 rounded-md border border-rose-200/50 dark:border-rose-800/50">
                            Clinical Features
                        </span>
                        <p className="mt-2 text-[16px] text-gray-800 dark:text-gray-200 font-medium leading-relaxed pl-1">
                            {trimmedLine.split(':')[1]?.trim()}
                        </p>
                    </div>
                );
            }

            // D. MANAGEMENT/TREATMENT (Emerald/Green)
            if (lowerLine.startsWith('management:') || lowerLine.startsWith('treatment:')) {
                return (
                    <div key={index} className="mt-5 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/40 px-2.5 py-1 rounded-md border border-emerald-200/50 dark:border-emerald-800/50">
                            Management Plan
                        </span>
                        <p className="mt-2 text-[16px] text-emerald-900 dark:text-emerald-100 font-bold leading-relaxed pl-1">
                            {trimmedLine.split(':')[1]?.trim()}
                        </p>
                    </div>
                );
            }

            // E. DEFAULT BODY TEXT
            if (trimmedLine.length === 0) return <div key={index} className="h-2" />;

            return (
                <p key={index} className="text-[16px] leading-relaxed font-medium text-gray-800 dark:text-gray-200 mb-3 last:mb-0">
                    {trimmedLine}
                </p>
            );
        });
    };
    if (loading)
        return (
            <Card className="mt-4 relative overflow-hidden border-0 bg-white dark:bg-gray-950 rounded-xl shadow-sm animate-pulse">

                {/* Top Indigo Accent Bar (Matching the real Flashcard) */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-200 dark:bg-gray-800" />

                {/* Header Skeleton */}
                <div className="px-6 pt-6 pb-2">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            {/* Brain Icon Square Skeleton */}
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />

                            <div className="space-y-2">
                                {/* Flashcard Type Label */}
                                <div className="h-2 w-24 bg-gray-100 dark:bg-gray-800 rounded-full" />
                                {/* Title Line */}
                                <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded-full" />
                            </div>
                        </div>

                        {/* Unit Badge Skeleton */}
                        <div className="h-6 w-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                    </div>
                </div>

                <CardContent className="px-6 pb-6 space-y-6 flex-1 overflow-y-auto min-h-0">

                    {/* Main Content Skeleton (Ghost Text) */}
                    <div className="space-y-3 py-2">
                        <div className="h-3.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full" />
                        <div className="h-3.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full" />
                        <div className="h-3.5 w-[85%] bg-gray-100 dark:bg-gray-800 rounded-full" />
                        <div className="h-3.5 w-[60%] bg-gray-100 dark:bg-gray-800 rounded-full" />
                    </div>

                    {/* Optional Image Placeholder (Matches the frame) */}
                    <div className="h-32 w-full bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-200 dark:text-gray-800" />
                    </div>

                    {/* Interaction Footer Skeleton */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">

                        {/* Interaction Buttons Skeletons */}
                        <div className="flex gap-2">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
                        </div>

                        {/* Stats Pill Skeleton */}
                        <div className="w-28 h-9 bg-gray-50 dark:bg-gray-900 rounded-full" />
                    </div>

                    {/* Small Status Indicator */}
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                            Retrieving Knowledge Asset
                        </span>
                        <div className="flex gap-1">
                            <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1 h-1 bg-pink-500 rounded-full animate-bounce" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    if (noCard)
        return (
            <p className="text-center py-8 text-red-500 font-semibold">
                No flashcard found
            </p>
        );

    if (!card) return null;
    return (
        <Card className="mt-2 relative overflow-hidden transition-all duration-300 border-0 bg-transparent rounded-2xl shadow-2xl shadow-indigo-500/10 flex flex-col h-[700px] max-h-[70vh] -mt-4">

            {/* 1. BACKGROUND IMAGE LAYER */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/indexbackground5.jpg"
                    alt=""
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-white/90 dark:bg-slate-950/95 backdrop-blur-[3px]" />
            </div>

            {/* 2. TOP INDIGO ACCENT BAR */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 z-20" />

            {/* 3. MAIN FLEX WRAPPER (This manages the layout) */}
            <div className="relative z-10 flex flex-col h-full w-full overflow-hidden">

                {/* --- HEADER (STAYS AT TOP, NEVER SCROLLS) --- */}
                <div className="flex-none px-6 pt-7 pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/30">
                                <Brain className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-400 leading-none mb-1.5">
                                    {card.type.replace("_", " ")} Flashcard
                                </h2>
                                {card.title && (
                                    <CardTitle className="text-xl font-extrabold text-gray-900 dark:text-gray-100 line-clamp-1">
                                        {card.title}
                                    </CardTitle>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            {card.difficulty && (
                                <Badge className={`text-[9px] uppercase font-black border-none px-2 py-0.5 rounded-md ${card.difficulty.toLowerCase() === 'hard' ? 'bg-red-100 text-red-600' :
                                    card.difficulty.toLowerCase() === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
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

                {/* --- SCROLLABLE BODY (ONLY THIS AREA SCROLLS) --- */}
                {/* flex-1 and min-h-0 are the magic keys to stop the cutting */}
                <CardContent className="flex-1 overflow-y-auto min-h-0 px-6 py-2 space-y-4 custom-scrollbar">

                    {/* MAIN STUDY AREA */}
                    <div className="relative p-5 bg-white/40 dark:bg-slate-900/40 rounded-2xl border border-white/20 dark:border-slate-800/40 shadow-sm backdrop-blur-sm">
                        {/* THE NEW STYLED TEXT RENDERER */}
                        <div className="space-y-1">
                            {renderStyledText(card.text)}
                        </div>
                    </div>

                    {/* IMAGE SECTION */}
                    {card.image_url && (
                        <div className="group relative rounded-2xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl bg-white/50 dark:bg-black/20">
                            <img
                                src={card.image_url}
                                alt="Study reference"
                                className="w-full h-auto max-h-80 object-contain"
                            />
                        </div>
                    )}

                    {/* METADATA GRID (Importance & Source) */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-200/50 dark:border-amber-800/30">
                            <Activity className="w-4 h-4 text-amber-500" />
                            <div>
                                <p className="text-[8px] uppercase font-black text-amber-500/60">Exam Priority</p>
                                <p className="text-xs font-bold text-amber-700 dark:text-amber-300">{card.exam_relevance || 'Standard'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-200/50 dark:border-blue-800/30">
                            <ImageIcon className="w-4 h-4 text-blue-500" />
                            <div>
                                <p className="text-[8px] uppercase font-black text-blue-500/60">Reference</p>
                                <p className="text-xs font-bold text-blue-700 dark:text-blue-300 truncate w-24">{card.source || 'Verified'}</p>
                            </div>
                        </div>
                    </div>

                    {/* TAGS */}
                    {card.tags && (
                        <div className="flex flex-wrap gap-2 pb-4">
                            {card.tags.split(",").map((tag) => (
                                <span key={tag} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/50 uppercase">
                                    <Hash className="w-3 h-3" />
                                    {tag.trim()}
                                </span>
                            ))}
                        </div>
                    )}
                </CardContent>

                {/* --- STICKY FOOTER (LOCKED AT BOTTOM) --- */}
                <div className="flex-none px-6 py-1 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-5">

                        {/* Interaction Buttons (Perfect Circles) */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => handleInteraction("save")}
                                className={`w-12 h-12 flex items-center justify-center rounded-full transition-all active:scale-90 border-2 ${saved
                                    ? 'bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/30'
                                    : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800 hover:border-amber-500 hover:text-amber-500 shadow-sm'
                                    }`}
                            >
                                <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
                            </button>

                            <button
                                onClick={() => handleInteraction("like")}
                                className={`w-12 h-12 flex items-center justify-center rounded-full transition-all active:scale-90 border-2 ${liked
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                                    : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800 hover:border-indigo-500 hover:text-indigo-500 shadow-sm'
                                    }`}
                            >
                                <ThumbsUp size={20} fill={liked ? "currentColor" : "none"} />
                            </button>

                            <button
                                onClick={() => handleInteraction("report")}
                                className={`w-12 h-12 flex items-center justify-center rounded-full transition-all active:scale-90 border-2 ${reported
                                    ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30'
                                    : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800 hover:border-rose-500 hover:text-rose-500 shadow-sm'
                                    }`}
                            >
                                <Flag size={20} fill={reported ? "currentColor" : "none"} />
                            </button>
                        </div>

                        {/* Stats Pill */}
                        <div className="flex items-center gap-4 bg-slate-100/80 dark:bg-slate-800/80 px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-inner">
                            <div className="flex items-center gap-2 border-r border-slate-300 dark:border-slate-600 pr-4">
                                <Eye className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">{counts.views}</span>
                            </div>
                            <div className="flex items-center gap-2 border-r border-slate-300 dark:border-slate-600 pr-4">
                                <Heart className="w-4 h-4 text-rose-500" />
                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">{counts.likes}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <BookmarkIcon className="w-4 h-4 text-amber-500" />
                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">{counts.saves}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </Card>
    );
}