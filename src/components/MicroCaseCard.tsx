"use client";
import { GlobalLoader } from "@/components/GlobalLoader";
import { ThumbsUp, Bookmark, Flag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
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

    useEffect(() => {
        if (!user) return;

        const subscription = supabase
            .channel("micro_case_cards")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "micro_case_cards", filter: "is_active=eq.true" },
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

                    // If currently displayed card is this one, refresh counts & interactions
                    if (card && card.id === updatedCard.id) {
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

                            const [{ data: saveData }, { data: likeData }, { data: reportData }] = await Promise.all([
                                supabase.from("micro_case_card_saved_reports").select("id").eq("user_id", user.id).eq("card_id", updatedCard.id).maybeSingle(),
                                supabase.from("micro_case_card_likes").select("id").eq("user_id", user.id).eq("card_id", updatedCard.id).maybeSingle(),
                                supabase.from("micro_case_card_reports").select("id").eq("user_id", user.id).eq("card_id", updatedCard.id).maybeSingle(),
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
        if (!user) return;
        // NEW: clear stored batch so refresh loads new cards
        localStorage.removeItem("cardsBatch");
        setCardsBatch([]);
        const loadMicroCases = async () => {
            let selectedCard: MicroCaseCardType | null = null;

            // Load from localStorage
            const savedBatch = localStorage.getItem("cardsBatch");
            if (savedBatch) {
                const parsedBatch: MicroCaseCardType[] = JSON.parse(savedBatch);
                setCardsBatch(parsedBatch);

                selectedCard = cardId
                    ? parsedBatch.find((c) => c.id === cardId) || parsedBatch[0]
                    : parsedBatch[Math.floor(Math.random() * parsedBatch.length)];

                setCard(selectedCard);
                setLoading(false);
            }

            // Fetch from Supabase if no cached card
            if (!selectedCard) {
                setLoading(true);
                try {
                    const { data, error } = await supabase
                        .from("micro_case_cards")
                        .select("*")
                        .eq("is_active", true)
                        .order("created_at", { ascending: false }) // NEW
                        .limit(BATCH_SIZE); // NEW
                    if (error) throw error;
                    if (!data || data.length === 0) {
                        setNoCard(true);
                        setLoading(false);
                        return;
                    }

                    const newBatch = [...cardsBatch, ...data];
                    setCardsBatch(newBatch);
                    localStorage.setItem("cardsBatch", JSON.stringify(newBatch));

                    selectedCard = cardId
                        ? data.find((c) => c.id === cardId) || data[0]
                        : data[Math.floor(Math.random() * data.length)];

                    setCard(selectedCard);
                } catch (err) {
                    console.error("Error fetching micro-case cards:", err);
                } finally {
                    setLoading(false);
                }
            }

            // --- Always record view, even if cached ---
            if (selectedCard) {
                try {
                    const { data: existingView } = await supabase
                        .from("micro_case_card_views")
                        .select("id")
                        .eq("user_id", user.id)
                        .eq("card_id", selectedCard.id)
                        .maybeSingle();

                    if (!existingView) {
                        await supabase.from("micro_case_card_views").insert({
                            user_id: user.id,
                            card_id: selectedCard.id,
                        });
                    }

                    const [views, likes, saves, reports] = await Promise.all([
                        supabase.from("micro_case_card_views").select("*", { count: "exact", head: true }).eq("card_id", selectedCard.id),
                        supabase.from("micro_case_card_likes").select("*", { count: "exact", head: true }).eq("card_id", selectedCard.id),
                        supabase.from("micro_case_card_saved_reports").select("*", { count: "exact", head: true }).eq("card_id", selectedCard.id),
                        supabase.from("micro_case_card_reports").select("*", { count: "exact", head: true }).eq("card_id", selectedCard.id),
                    ]);

                    setCounts({
                        views: views.count || 0,
                        likes: likes.count || 0,
                        saves: saves.count || 0,
                        reports: reports.count || 0,
                    });

                    const [{ data: saveData }, { data: likeData }, { data: reportData }] = await Promise.all([
                        supabase.from("micro_case_card_saved_reports").select("id").eq("user_id", user.id).eq("card_id", selectedCard.id).maybeSingle(),
                        supabase.from("micro_case_card_likes").select("id").eq("user_id", user.id).eq("card_id", selectedCard.id).maybeSingle(),
                        supabase.from("micro_case_card_reports").select("id").eq("user_id", user.id).eq("card_id", selectedCard.id).maybeSingle(),
                    ]);

                    setSaved(!!saveData);
                    setLiked(!!likeData);
                    setReported(!!reportData);

                } catch (err) {
                    console.error("Error recording micro-case view:", err);
                }
            }
        };

        loadMicroCases();
    }, [user, cardId, batchIndex]);
    const handleInteraction = async (type: "save" | "like" | "report") => {
        if (!card || !user) return;
        if (tapSound) tapSound.play();

        const tableMap = {
            save: "micro_case_card_saved_reports",
            like: "micro_case_card_likes",
            report: "micro_case_card_reports",
        };
        const table = tableMap[type];

        let isActive = false;
        if (type === "save") isActive = saved;
        if (type === "like") isActive = liked;
        if (type === "report") isActive = reported;

        // Optimistic UI
        setCounts((prev) => ({ ...prev, [type + "s"]: prev[type + "s"] + (isActive ? -1 : 1) }));
        if (type === "save") setSaved(!isActive);
        if (type === "like") setLiked(!isActive);
        if (type === "report") setReported(!isActive);

        try {
            if (!isActive) {
                if (type === "report") {
                    // Include reason for report
                    await supabase
                        .from(table)
                        .upsert(
                            { user_id: user.id, card_id: card.id, reason: "Reported by user" },
                            { onConflict: ["user_id", "card_id"] }
                        );
                } else {
                    await supabase
                        .from(table)
                        .upsert({ user_id: user.id, card_id: card.id }, { onConflict: ["user_id", "card_id"] });
                }
            } else {
                await supabase.from(table).delete().eq("user_id", user.id).eq("card_id", card.id);
            }
        } catch (error) {
            console.error("Supabase interaction error:", error);
        }
    };

    if (loading)
        return (
            <Card className="mt-4 border-0 shadow-lg
            bg-gradient-to-r from-green-100 via-teal-200 to-cyan-300
            dark:from-teal-900 dark:via-cyan-800 dark:to-blue-900">
                <CardContent className="flex flex-col items-center justify-center h-48">
                    <p className="text-gray-700 dark:text-gray-200 mb-4 font-semibold">Loading Micro Case...</p>
                    <div className="flex space-x-2">
                        {[...Array(3)].map((_, i) => (
                            <span
                                key={i}
                                className="w-3 h-3 rounded-full animate-bounce"
                                style={{
                                    backgroundColor: i === 0 ? "#2563EB" : i === 1 ? "#14B8A6" : "#FBBF24", // Indigo, Teal, Gold
                                    animationDelay: `${i * 0.2}s`,
                                }}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );

    if (noCard)
        return <p className="text-center py-8 text-red-500 font-semibold">No micro-case card found</p>;

    if (!card) return null;

    return (
        <Card className="mt-2 border-0 shadow-lg
  bg-gradient-to-r from-green-100 via-teal-200 to-cyan-300
  dark:from-teal-900 dark:via-cyan-800 dark:to-blue-900">
            <div className="px-2 py-2 bg-green-200 dark:bg-cyan-800 text-green-900 dark:text-cyan-100 font-semibold rounded-t-lg">
                Micro Case! Card
            </div>
            <CardHeader className="flex flex-row justify-between">
                <CardTitle className="text-teal-800 dark:text-cyan-100">
                    {card.title || "MICRO CASE CARD"}
                </CardTitle>
                {card.related_unit && (
                    <Badge className="bg-teal-500 text-white dark:bg-cyan-700 dark:text-gray-100">
                        {card.related_unit}
                    </Badge>
                )}
            </CardHeader>

            <CardContent className="space-y-2 px-2">
                <p className="font-bold text-gray-900 dark:text-gray-100 whitespace-pre-line">{card.scenario}</p>
                <p className="text-sm text-gray-700 dark:text-gray-100 whitespace-pre-line"><strong>Q:</strong> {card.question}</p>
                <p className="text-sm text-gray-700 dark:text-gray-100 whitespace-pre-line"><strong>A:</strong> {card.answer}</p>
                {card.explanation && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                        <strong>Explanation:</strong> {card.explanation}
                    </p>
                )}

                <div className="flex gap-2 text-sm text-gray-700 dark:text-gray-100">
                    <p>Views: {counts.views}</p>
                    <p>Likes: {counts.likes}</p>
                    <p>Saves: {counts.saves}</p>
                    <p>Reports: {counts.reports}</p>
                </div>

                <div className="flex gap-4 pt-2 items-center">
                    <button onClick={() => handleInteraction("save")} className="p-1 transition-transform duration-150 ease-out active:scale-110">
                        <Bookmark size={32} fill={saved ? "currentColor" : "none"} stroke="currentColor"
                            className={saved ? "text-green-500" : "text-gray-400 dark:text-gray-400"} />
                    </button>
                    <button onClick={() => handleInteraction("like")} className="p-1 transition-transform duration-150 ease-out active:scale-110">
                        <ThumbsUp size={32} fill={liked ? "currentColor" : "none"} stroke="currentColor"
                            className={liked ? "text-teal-500" : "text-gray-400 dark:text-gray-400"} />
                    </button>
                    <button onClick={() => handleInteraction("report")} className="p-1 transition-transform duration-150 ease-out active:scale-110">
                        <Flag size={32} fill={reported ? "currentColor" : "none"} stroke="currentColor"
                            className={reported ? "text-rose-500" : "text-gray-400 dark:text-gray-400"} />
                    </button>
                </div>

                {card.tags && (
                    <div className="flex flex-wrap gap-2">
                        {card.tags.split(",").map((tag) => (
                            <Badge key={tag} className="bg-teal-200 dark:bg-cyan-700 text-teal-800 dark:text-cyan-100">
                                #{tag.trim()}
                            </Badge>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}