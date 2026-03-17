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



                {/* Static Heading */}
                <div className="px-4 py-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500
                dark:from-teal-700 dark:via-cyan-700 dark:to-blue-700 text-white font-semibold rounded-t-lg">
                    Micro Case
                </div>

                {/* Header / Info Skeleton */}
                <CardHeader className="flex flex-row justify-between py-1">
                    <CardTitle className="text-blue-700 dark:text-gray-100 text-lg">
                        CASE TYPE
                    </CardTitle>
                    <Badge className="bg-green-500 text-white dark:bg-cyan-700 dark:text-gray-100 text-lg">
                        UNIT
                    </Badge>
                </CardHeader>
                <CardContent className="space-y-3 py-2 px-2 animate-pulse">
                    {/* Big skeleton for main description */}
                    <div className="h-36 w-full bg-gray-300 dark:bg-gray-700 rounded-md relative flex items-center justify-center">

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

                    {/* One small skeleton for stats / extra info */}
                    <div className="h-6 w-1/2 bg-gray-300 dark:bg-gray-700 rounded-md" />
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