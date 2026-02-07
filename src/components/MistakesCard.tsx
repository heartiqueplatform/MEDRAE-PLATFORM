"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, AlertTriangle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { GlobalLoader } from "@/components/GlobalLoader";
const PAGE_SIZE = 10;

export function MistakesCard() {
    const [hiddenIds, setHiddenIds] = useState<string[]>(() => {
        if (typeof window === "undefined") return [];
        const saved = localStorage.getItem("hiddenMistakeQuestions");
        return saved ? JSON.parse(saved) : [];
    });

    const [data, setData] = useState<any[]>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("mistakesData");
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });
    const [expandedCard, setExpandedCard] = useState<any | null>(null);

    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Load counts from localStorage initially
    const [studentCounts, setStudentCounts] = useState<Record<string, number>>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("studentCounts");
            return saved ? JSON.parse(saved) : {};
        }
        return {};
    });
    let lastTap = 0;

    const handleCardDoubleTap = (item: any) => {
        const now = Date.now();
        if (now - lastTap < 300) { // 300ms threshold for double tap
            setExpandedCard(item);
        }
        lastTap = now;
    };

    const fetchMistakes = async () => {
        setLoading(true);

        // 1️⃣ fetch all mistakes with related question
        const { data: mistakes, error } = await supabase
            .from("user_mistakes")
            .select(`
        user_id,
        question_id,
        times_wrong,
        last_wrong_at,
        quiz_questions (
          id,
          question_text,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_answer,
          explanation,
          additional
        )
      `);

        if (error || !mistakes) {
            console.error("Supabase fetch error:", error);
            setLoading(false);
            return;
        }

        // 2️⃣ Aggregate total fails AND unique students per question
        const questionMap: Record<string, { totalFails: number; uniqueStudentIds: Set<string>; lastWrong: string | null; quiz_questions: any }> = {};

        for (const m of mistakes) {
            if (!questionMap[m.question_id]) {
                questionMap[m.question_id] = {
                    totalFails: 0,
                    uniqueStudentIds: new Set(),
                    lastWrong: m.last_wrong_at,
                    quiz_questions: m.quiz_questions,
                };
            }

            questionMap[m.question_id].totalFails += m.times_wrong;
            questionMap[m.question_id].uniqueStudentIds.add(m.user_id);

            if (m.last_wrong_at) {
                const prev = questionMap[m.question_id].lastWrong;
                if (!prev || new Date(m.last_wrong_at) > new Date(prev)) {
                    questionMap[m.question_id].lastWrong = m.last_wrong_at;
                }
            }
        }

        // 3️⃣ Convert map to array and sort by totalFails
        const merged = Object.entries(questionMap)
            .map(([question_id, val]) => ({
                question_id,
                totalFails: val.totalFails,
                uniqueStudents: val.uniqueStudentIds.size, // ✅ unique student count
                lastWrong: val.lastWrong,
                quiz_questions: val.quiz_questions,
            }))
            .sort((a, b) => b.totalFails - a.totalFails);

        // 4️⃣ Store counts in state AND localStorage
        const counts: Record<string, number> = {};
        merged.forEach((m) => {
            counts[m.question_id] = m.uniqueStudents;
        });
        setStudentCounts(counts);
        localStorage.setItem("studentCounts", JSON.stringify(counts));

        // 5️⃣ Apply pagination
        // 5️⃣ Apply pagination and merge with existing data
        const start = page * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const newQuestions = merged.slice(start, end);

        setData((prev) => {
            // Avoid duplicates
            const mergedData = [...prev];
            newQuestions.forEach((q) => {
                if (!mergedData.some((item) => item.question_id === q.question_id)) {
                    mergedData.push(q);
                }
            });

            // Save updated data to localStorage
            if (typeof window !== "undefined") {
                localStorage.setItem("mistakesData", JSON.stringify(mergedData));
            }

            return mergedData;
        });


        setLoading(false);
    };

    useEffect(() => {
        fetchMistakes();
    }, [page]);
    useEffect(() => {
        const interval = setInterval(fetchMistakes, 10000); // fetch every 10s in background
        return () => clearInterval(interval);
    }, []);


    const openDetails = async (questionId: string) => {
        setLoadingStudents(true);

        try {
            // 1️⃣ get mistake rows
            const { data: mistakes, error } = await supabase
                .from("user_mistakes")
                .select("user_id, times_wrong, last_wrong_at")
                .eq("question_id", questionId)
                .order("last_wrong_at", { ascending: false });

            if (error || !mistakes) {
                setSelected([]);
                setOpen(true);
                return;
            }

            // 2️⃣ collect user ids
            const userIds = mistakes.map((m) => m.user_id);

            // 3️⃣ fetch profiles with correct columns
            const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, name, institution, avatar_url")
                .in("user_id", userIds);

            // 4️⃣ merge results
            const merged = mistakes.map((m) => ({
                ...m,
                profile: profiles?.find((p) => p.user_id === m.user_id),
            }));

            // ✅ Update student count for this question and persist
            setStudentCounts((prev) => {
                const updated = { ...prev, [questionId]: merged.length };
                localStorage.setItem("studentCounts", JSON.stringify(updated));
                return updated;
            });

            setSelected(merged);
            setOpen(true);
        } finally {
            setLoadingStudents(false);
        }
    };

    const optionStyle = () => "";

    return (
        <>
            {/* Full-screen loading overlay */}
            {/* Full-screen loading overlay */}
            {loadingStudents && (
                <div
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center
               bg-white/40 dark:bg-black/40 backdrop-blur-sm"
                >
                    {/* Close button */}
                    <button
                        onClick={() => setLoadingStudents(false)}
                        className="absolute top-4 right-4 text-2xl font-bold text-gray-700 dark:text-white hover:text-red-500"
                    >
                        ✕
                    </button>

                    {/* Loader spinner */}
                    <GlobalLoader />
                </div>
            )}

            <Card className="rounded-md border-0 shadow-md bg-gray-100 dark:bg-gray-900 mt-4">

                <CardHeader className="p-2">
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="text-red-500" />
                        Most Failed Questions
                    </CardTitle>
                    <CardDescription>High-impact mistakes students struggle with the most. Tap a card to expand and learn more...</CardDescription>
                </CardHeader>

                <CardContent className="flex overflow-x-auto snap-x snap-mandatory gap-4 custom-scrollbar pb-2">

                    {data
                        .filter((item) => !hiddenIds.includes(item.question_id))
                        .map((item, i) => {

                            const q = item.quiz_questions;
                            return (
                                <motion.div
                                    key={item.question_id}
                                    onClick={() => setExpandedCard(item)}
                                    className="w-[calc(100vw-1rem)] sm:w-[320px] flex-shrink-0 hover:mistake-card-glow transition-all mt-4"
                                    initial={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 120 }}
                                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                                >
                                    <Card className="w-full relative
                 bg-gradient-to-b from-gray-300 to-gray-400
                 dark:from-gray-700 dark:to-gray-900
                 shadow-md rounded-xl hover:glow-effect">

                                        {/* Restore Hidden Button */}
                                        {hiddenIds.length > 0 && (
                                            <div className="flex text-[10px] justify-start mb-2 mt-2">
                                                <div className="relative inline-block group">
                                                    <div
                                                        onClick={() => {
                                                            setData((prev) => {
                                                                const allHidden = hiddenIds.map((id) => {
                                                                    const savedData = JSON.parse(localStorage.getItem("mistakesData") || "[]");
                                                                    return savedData.find((q: any) => q.question_id === id);
                                                                }).filter(Boolean);
                                                                return [...prev, ...allHidden];
                                                            });
                                                            setHiddenIds([]);
                                                        }}
                                                        className="inline-flex items-center justify-center cursor-pointer hover:opacity-80 active:scale-95 transition px-2 py-1 relative"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-6 h-6">
                                                            <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                                                        </svg>

                                                        {/* Badge */}
                                                        {hiddenIds.length > 0 && (
                                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-[1px]">
                                                                {hiddenIds.length}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Tooltip */}
                                                    <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all bg-gray-900 text-white text-xs px-2 py-1 rounded">
                                                        Achieved
                                                    </span>
                                                </div>


                                            </div>
                                        )}
                                        <CardContent className="p-2 flex flex-col h-[360px] justify-between">

                                            {/* Swipe hint + Hide Button */}
                                            <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1">

                                                <div className="relative inline-block group">
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent triggering card click
                                                            setHiddenIds((prev) => {
                                                                const updated = [...prev, item.question_id];
                                                                localStorage.setItem(
                                                                    "hiddenMistakeQuestions",
                                                                    JSON.stringify(updated)
                                                                );
                                                                return updated;
                                                            });
                                                            setData((prev) =>
                                                                prev.filter((q) => q.question_id !== item.question_id)
                                                            );
                                                        }}
                                                        className="inline-flex items-center justify-center cursor-pointer hover:opacity-80 active:scale-95 transition px-2 py-1"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-6 h-6">
                                                            <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                                                        </svg>
                                                    </div>

                                                    {/* Tooltip */}
                                                    <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all bg-gray-900 text-white text-xs px-2 py-1 rounded">
                                                        Achieve
                                                    </span>
                                                </div>

                                            </div>

                                            {/* Question */}
                                            <p className="text-sm font-semibold mt-4 mb-1">
                                                {q.question_text}
                                            </p>



                                            {/* Options */}
                                            <div className="flex flex-col gap-1 mb-2">
                                                {["A", "B", "C", "D"].map((key) => (
                                                    <div
                                                        key={key}
                                                        className={`flex items-start gap-2 px-2 py-2 text-xs
border-b last:border-b-0
border-gray-200 dark:border-gray-700
${key === q.correct_answer ? "text-green-700 dark:text-green-400 font-medium" : "text-gray-700 dark:text-gray-300"}
`}

                                                    >
                                                        <strong>{key}.</strong> {q[`option_${key.toLowerCase()}`]}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Explanation + additional scrollable */}


                                            {/* Stats */}
                                            <div className="flex justify-between items-center pt-2">
                                                <div className="relative inline-block group">
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openDetails(item.question_id);
                                                        }}
                                                        className="inline-flex items-center justify-center cursor-pointer hover:opacity-80 active:scale-95 transition"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-8 h-8">
                                                            <path stroke-linecap="round" stroke-linejoin="round" fill="#0caae9" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                                                        </svg>
                                                    </div>

                                                    {/* Tooltip */}
                                                    <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all bg-gray-900 text-white text-xs px-2 py-1 rounded">
                                                        Who?
                                                    </span>
                                                </div>



                                                <span className="text-xs text-muted-foreground">
                                                    {item.lastWrong ? formatDistanceToNow(new Date(item.lastWrong)) + " ago" : "No attempts yet"}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}

                    {/* Load More Button */}
                    <div className="flex items-center justify-center min-w-[320px]">
                        <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : "Load more"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Students Overlay */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex gap-2 items-center">
                            <Users /> Students who missed this
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar">
                        {selected.map((s, i) => (
                            <div key={i} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                                <div className="flex gap-2 items-center">
                                    <Avatar>
                                        <AvatarImage src={s.profile?.avatar_url || "/UsersAvatar.jpg"} />
                                        <AvatarFallback>{s.profile?.name?.[0] || "?"}</AvatarFallback>
                                    </Avatar>

                                    <div>
                                        <p className="text-sm font-medium">{s.profile?.name}</p>
                                        <p className="text-xs text-muted-foreground">{s.profile?.institution}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge variant="secondary">{s.times_wrong}×</Badge>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(s.last_wrong_at))} ago
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
            {/* Expanded Card Overlay */}
            {expandedCard && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-1"
                    onClick={() => setExpandedCard(null)} // tap outside closes
                >
                    <div
                        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-lg max-w-xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-6"
                        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setExpandedCard(null)}
                            className="absolute top-4 right-4 text-xl font-bold text-gray-700 dark:text-white hover:text-red-500"
                        >
                            ✕
                        </button>

                        {/* Question */}
                        <h2 className="text-lg font-semibold mb-3">{expandedCard.quiz_questions.question_text}</h2>

                        {/* Options */}
                        <div className="flex flex-col gap-2 mb-4">
                            {["A", "B", "C", "D"].map((key) => (
                                <div
                                    key={key}
                                    className={`px-3 py-2 rounded border ${key === expandedCard.quiz_questions.correct_answer
                                        ? "border-green-600 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-400 font-medium"
                                        : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                        }`}
                                >
                                    <strong>{key}.</strong> {expandedCard.quiz_questions[`option_${key.toLowerCase()}`]}
                                </div>
                            ))}
                        </div>

                        {/* Explanation + additional */}
                        <div className="text-xl text-white-foreground">
                            <p><strong>Explanation:</strong> {expandedCard.quiz_questions.explanation}</p>
                            {expandedCard.quiz_questions.additional && (
                                <p className="italic mt-1">{expandedCard.quiz_questions.additional}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}


        </>
    );
}
