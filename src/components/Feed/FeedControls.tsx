"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { RotateCcw, Eraser } from "lucide-react";

type Props = {
    questionCount: number;
    session: any;
    supabase: any;
    setFeedImages: (val: any) => void;
    setQuestions: (val: any) => void;
    setAnswers: (val: any) => void;
    setQuestionCount: (val: number) => void;
    fetchQuestions: (page: number, limit?: number) => Promise<any[]>;
    user: any;
    loading: boolean;
    setLoading: (val: boolean) => void;
    setPage: (val: number) => void;
};

export default function FeedControls({
    questionCount,
    session,
    supabase,
    setFeedImages,
    setQuestions,
    setAnswers,
    setQuestionCount,
    fetchQuestions,
    user,
    loading,
    setLoading,
    setPage,
}: Props) {
    return (
        <div className="flex flex-row flex-wrap justify-between items-center mt-0 gap-3">

            <div className="flex flex-row flex-wrap items-center gap-3 w-full sm:w-auto">

                {/* Question Counter */}
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Questions Tried: {questionCount}
                </span>

                {/* RESET IMAGES */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            className="p-2 rounded-full active:scale-95 transition"
                            variant="ghost"
                            onClick={async () => {
                                const confirmed = window.confirm(
                                    "Reset all seen images? This cannot be undone."
                                );
                                if (!confirmed) return;

                                const userId = session?.user?.id;
                                if (!userId) return;

                                await supabase.from("seen_images").delete().eq("user_id", userId);

                                const { data: newImages } = await supabase
                                    .from("qfeed_images")
                                    .select("*")
                                    .order("created_at", { ascending: true });

                                setFeedImages(newImages);
                                alert("Images reset complete!");
                            }}
                        >
                            <RotateCcw size={20} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Reset images</p>
                    </TooltipContent>
                </Tooltip>

                {/* RESET QUESTIONS */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            className="p-2 rounded-full active:scale-95 transition"
                            variant="ghost"
                            onClick={async () => {
                                const confirmed = window.confirm(
                                    "Reset all seen questions? This cannot be undone."
                                );
                                if (!confirmed) return;

                                const userId = session?.user?.id;
                                if (!userId) return;

                                await supabase
                                    .from("qfeed_seen")
                                    .delete()
                                    .eq("user_id", userId);

                                localStorage.removeItem(`feed_questions_${userId}`);
                                localStorage.removeItem(`feed_answers_${userId}`);
                                localStorage.removeItem(`feed_count_${userId}`);

                                setQuestions([]);
                                setAnswers({});
                                setQuestionCount(0);

                                alert("Questions reset complete!");
                            }}
                        >
                            <Eraser size={20} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Reset questions</p>
                    </TooltipContent>
                </Tooltip>

                {/* RELOAD FEED */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            className="p-2 rounded-full active:scale-95 transition flex items-center gap-1"
                            variant="ghost"
                            onClick={async () => {
                                if (!user) return alert("Login first!");

                                setLoading(true);
                                setPage(0);
                                setQuestions([]);

                                try {
                                    const fresh = await fetchQuestions(0, 50);
                                    setQuestions(fresh);

                                    localStorage.setItem(
                                        `feed_questions_${user.id}`,
                                        JSON.stringify(fresh)
                                    );
                                } catch (err) {
                                    console.error(err);
                                    alert("Failed to reload feed.");
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        >
                            {loading ? (
                                <span className="flex items-center gap-1">
                                    <svg
                                        className="animate-spin h-4 w-4"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                                        <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
                                    </svg>
                                    Loading...
                                </span>
                            ) : (
                                <>
                                    <span className="text-sm">Reload Feed</span>
                                </>
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Reload feed</p>
                    </TooltipContent>
                </Tooltip>

            </div>
        </div>
    );
}