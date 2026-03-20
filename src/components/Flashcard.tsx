"use client";
import { GlobalLoader } from "@/components/GlobalLoader";
import { ThumbsUp, Bookmark, Flag } from "lucide-react";
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

        // Determine current state for this type
        let isActive = false;
        if (type === "save") isActive = saved;
        if (type === "like") isActive = liked;
        if (type === "report") isActive = reported;

        // Optimistically update UI immediately
        setCounts((prev) => ({
            ...prev,
            [type + "s"]: prev[type + "s"] + (isActive ? -1 : 1),
        }));

        if (type === "save") setSaved(!isActive);
        if (type === "like") setLiked(!isActive);
        if (type === "report") setReported(!isActive);

        try {
            if (!isActive) {
                // Insert or upsert — avoids 409 conflicts
                await supabase
                    .from(table)
                    .upsert({ user_id: user.id, card_id: card.id }, { onConflict: ["user_id", "card_id"] });
            } else {
                // Undo: delete row
                await supabase
                    .from(table)
                    .delete()
                    .eq("user_id", user.id)
                    .eq("card_id", card.id);
            }
        } catch (error) {
            console.error("Supabase interaction error:", error);
            // Optional: rollback optimistic UI if needed
        }
    };
    if (loading)
        return (
            <Card className="mt-3 border-0 shadow-lg bg-gradient-to-r from-yellow-100 via-pink-100 to-purple-200 dark:from-purple-900 dark:via-pink-800 dark:to-indigo-800">


                {/* Static Heading */}
                <div className="px-4 py-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
                dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700 text-white font-semibold rounded-t-lg">
                    Flashcard Card
                </div>

                {/* Header */}
                <CardHeader className="flex flex-row justify-between py-1">
                    <CardTitle className="text-purple-700 dark:text-gray-100  text-lg">
                        FLASHCARD TYPE
                    </CardTitle>
                    <Badge className="bg-blue-500 text-white dark:bg-pink-700 dark:text-gray-100 text-lg">
                        UNIT
                    </Badge>
                </CardHeader>
                <CardContent className="space-y-3 py-2 px-2 animate-pulse">
                    {/* Big skeleton for main content */}
                    <div className="h-32 w-full bg-gray-300 dark:bg-gray-700 rounded-md relative flex items-center justify-center">

                        {/* Dots loader centered inside the big skeleton */}
                        <div className="flex space-x-2 absolute">
                            {[...Array(3)].map((_, i) => (
                                <span
                                    key={i}
                                    className="w-3 h-3 rounded-full animate-bounce"
                                    style={{
                                        backgroundColor: i === 0 ? "#2563EB" : i === 1 ? "#14B8A6" : "#FBBF24",
                                        animationDelay: `${i * 0.2}s`,
                                    }}
                                />
                            ))}
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
        <Card className="mt-3 border-0 shadow-lg
    bg-gradient-to-r from-yellow-100 via-pink-100 to-purple-200
    dark:from-purple-900 dark:via-pink-800 dark:to-indigo-800">

            <div className="px-4 py-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700 text-white font-semibold rounded-t-lg">
                Flashcard Card
            </div>
            <CardHeader className="flex flex-row justify-between py-1">
                <CardTitle className="text-purple-700 dark:text-gray-100">
                    {card.type.replace("_", " ").toUpperCase()}
                </CardTitle>

                {card.related_unit && (
                    <Badge className="bg-blue-500 text-white dark:bg-pink-700 dark:text-gray-100">{card.related_unit}</Badge>
                )}
            </CardHeader>

            <CardContent className="space-y-2 py-1 px-2">

                {card.title && (
                    <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{card.title}</h3>
                )}

                <p className="text-sm leading-snug text-gray-700 dark:text-gray-100 whitespace-pre-line">
                    {card.text.replace(/\\n/g, "\n")}
                </p>

                {card.image_url && (
                    <img
                        src={card.image_url}
                        className="rounded-md max-w-xs w-auto"
                    />
                )}

                {card.tags && (
                    <div className="flex flex-wrap gap-1">
                        {card.tags.split(",").map((tag) => (
                            <Badge key={tag} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                #{tag.trim()}
                            </Badge>
                        ))}
                    </div>
                )}


                {/* Stats */}
                <div className="flex gap-3 text-sm text-gray-700 dark:text-gray-100">
                    <p>Views: {counts.views}</p>
                    <p>Likes: {counts.likes}</p>
                    <p>Saves: {counts.saves}</p>
                    <p>Reports: {counts.reports}</p>
                </div>

                {/* Action Icons */}
                <div className="flex gap-3 items-center">
                    {/* Save Icon */}
                    <button
                        onClick={() => handleInteraction("save")}
                        className="p-1 transition-transform duration-150 ease-out active:scale-110"
                    >
                        <Bookmark
                            size={32}
                            fill={saved ? "currentColor" : "none"}
                            stroke="currentColor"
                            className={saved ? "text-yellow-500" : "text-gray-400 dark:text-gray-400"}
                        />
                    </button>

                    {/* Like Icon */}
                    <button
                        onClick={() => handleInteraction("like")}
                        className="p-1 transition-transform duration-150 ease-out active:scale-110"
                    >
                        <ThumbsUp
                            size={32}
                            fill={liked ? "currentColor" : "none"}
                            stroke="currentColor"
                            className={liked ? "text-blue-500" : "text-gray-400 dark:text-gray-400"}
                        />
                    </button>

                    {/* Report Icon */}
                    <button
                        onClick={() => handleInteraction("report")}
                        className="p-1 transition-transform duration-150 ease-out active:scale-110"
                    >
                        <Flag
                            size={32}
                            fill={reported ? "currentColor" : "none"}
                            stroke="currentColor"
                            className={reported ? "text-red-500" : "text-gray-400 dark:text-gray-400"}
                        />
                    </button>
                </div>

                {card.source && (
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                        Source: {card.source}
                    </p>
                )}

            </CardContent>
        </Card>
    );
}