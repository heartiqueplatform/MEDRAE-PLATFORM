"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, AlertTriangle, Loader2, PlusCircle, ChevronRight, CheckCircle, ArchiveRestore, X, BookOpen } from "lucide-react";
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
  `)
            .order("times_wrong", { ascending: false })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

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
        // 5️⃣ Corrected: Merge with existing data
        // We don't slice 'merged' here because 'merged' already only contains
        // the unique questions from the specific range we fetched from Supabase.
        setData((prev) => {
            const updatedData = [...prev];

            merged.forEach((newQ) => {
                // Check if we already have this question in our list
                const exists = updatedData.some((item) => item.question_id === newQ.question_id);
                if (!exists) {
                    updatedData.push(newQ);
                }
            });

            // Save to localStorage
            if (typeof window !== "undefined") {
                localStorage.setItem("mistakesData", JSON.stringify(updatedData.slice(0, 100)));
            }

            return updatedData;
        });

        setLoading(false);
    };

    useEffect(() => {
        fetchMistakes();
    }, [page]);



    const openDetails = async (questionId: string) => {
        setLoadingStudents(true);

        try {
            // 1️⃣ get mistake rows
            const { data: mistakes, error } = await supabase
                .from("user_mistakes")
                .select(`
        user_id,
        times_wrong,
        last_wrong_at,
        profiles (
            name,
            institution,
            avatar_url
        )
    `)
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
            {loadingStudents && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-md transition-all">
                    <button
                        onClick={() => setLoadingStudents(false)}
                        className="absolute top-6 right-6 p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 transition-colors"
                    >
                        <X size={24} />
                    </button>
                    <div className="flex flex-col items-center gap-4">
                        <GlobalLoader />
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400 animate-pulse uppercase tracking-widest">
                            Analyzing Student Data...
                        </p>
                    </div>
                </div>
            )}

            <Card className="rounded-xl border-0 shadow-xl bg-white dark:bg-gray-900 mt-2 overflow-hidden">
                <CardHeader className="p-6 pb-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-2xl font-black text-gray-900 dark:text-white">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600">
                                    <AlertTriangle size={24} />
                                </div>
                                High-Frequency Mistakes
                            </CardTitle>
                            <CardDescription className="mt-2 text-gray-500 dark:text-gray-400">
                                Questions nursing students struggle with most. Focus your revision here.
                            </CardDescription>
                        </div>

                        {/* Restore Hidden Button - Placed at top right for cleaner UI */}
                        {hiddenIds.length > 0 && (
                            <div className="group relative">
                                <button
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
                                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all active:scale-95 border border-gray-200 dark:border-gray-700"
                                >
                                    <ArchiveRestore size={18} className="text-blue-600" />
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                        Restore {hiddenIds.length}
                                    </span>
                                </button>
                                <span className="absolute bottom-full right-0 mb-2 scale-0 group-hover:scale-100 transition-all bg-gray-900 text-white text-[10px] px-2 py-1 rounded">
                                    Bring back mastered questions
                                </span>
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="flex overflow-x-auto snap-x snap-mandatory gap-2 custom-scrollbar py-2 px-2 scroll-smooth">
                    {data
                        .filter((item) => !hiddenIds.includes(item.question_id))
                        .map((item, i) => {
                            const q = item.quiz_questions;
                            return (
                                <motion.div
                                    key={item.question_id}
                                    layout
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    onClick={() => setExpandedCard({ ...item, index: i })}
                                    className="w-[300px] md:w-[350px] flex-shrink-0 snap-center"
                                >
                                    <Card className="h-[420px] flex flex-col relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group rounded-2xl overflow-hidden">

                                        {/* Archive/Achieve Button */}
                                        <div className="absolute top-3 right-3 z-20">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setHiddenIds((prev) => {
                                                        const updated = [...prev, item.question_id];
                                                        localStorage.setItem("hiddenMistakeQuestions", JSON.stringify(updated));
                                                        return updated;
                                                    });
                                                    setData((prev) => prev.filter((q) => q.question_id !== item.question_id));
                                                }}
                                                className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors group/btn"
                                            >
                                                <CheckCircle size={18} />
                                                <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 scale-0 group-hover/btn:scale-100 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                                                    Mark as Mastered
                                                </span>
                                            </button>
                                        </div>

                                        <div className="p-5 flex flex-col h-full">
                                            {/* Header: Number + Last Attempt */}
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                                                    Question {i + 1}
                                                </span>
                                                <span className="text-[10px] font-medium text-gray-400 italic">
                                                    {item.lastWrong ? formatDistanceToNow(new Date(item.lastWrong)) + " ago" : "No attempts"}
                                                </span>
                                            </div>

                                            {/* Question Text */}
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-snug line-clamp-3 mb-4">
                                                {q.question_text}
                                            </p>

                                            {/* Options List */}
                                            <div className="flex flex-col gap-1.5 flex-grow">
                                                {["A", "B", "C", "D"].map((key) => (
                                                    <div
                                                        key={key}
                                                        className={`flex items-start gap-3 p-2.5 rounded-xl text-[11px] transition-colors border ${key === q.correct_answer
                                                            ? "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800 text-green-700 dark:text-green-400 font-bold"
                                                            : "bg-gray-50 dark:bg-gray-800/40 border-transparent text-gray-600 dark:text-gray-400"
                                                            }`}
                                                    >
                                                        <span className="opacity-50">{key}.</span>
                                                        <span className="line-clamp-2">{q[`option_${key.toLowerCase()}`]}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Bottom Info: Who failed + Expand */}
                                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openDetails(item.question_id);
                                                    }}
                                                    className="flex items-center gap-2 group/who"
                                                >
                                                    <div className="flex -space-x-2">
                                                        {[1, 2, 3].map((n) => (
                                                            <div key={n} className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[8px] font-bold">
                                                                {n}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 group-hover/who:underline">
                                                        See Peers
                                                    </span>
                                                </button>

                                                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 group-hover:text-blue-500 transition-colors">
                                                    Details <ChevronRight size={14} />
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            );
                        })}

                    {/* Load More Button */}
                    <div className="flex items-center justify-center min-w-[200px] pr-8">
                        <Button
                            variant="ghost"
                            onClick={() => setPage((p) => p + 1)}
                            disabled={loading}
                            className="flex flex-col gap-2 h-auto py-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={24} />
                            ) : (
                                <>
                                    <PlusCircle size={24} />
                                    <span className="font-bold text-xs">Load More</span>
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
            {/* --- Students Overlay (Peer Analytics) --- */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    aria-describedby={undefined}
                    className="max-w-xl border-0 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                        <DialogTitle className="flex gap-3 items-center text-xl font-black text-gray-900 dark:text-white">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                                <Users size={20} />
                            </div>
                            Student Analytics
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                            Peers who struggled with this concept
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-4 space-y-3 max-h-[450px] overflow-y-auto custom-scrollbar">
                        {selected.length === 0 ? (
                            <p className="text-center py-10 text-gray-400 italic">No student data available</p>
                        ) : (
                            selected.map((s, i) => (
                                <div
                                    key={i}
                                    className="flex justify-between items-center bg-white dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 transition-colors shadow-sm"
                                >
                                    <div className="flex gap-3 items-center">
                                        <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-700 shadow-sm">
                                            <AvatarImage src={s.profile?.avatar_url || "/UsersAvatar.jpg"} />
                                            <AvatarFallback className="bg-blue-50 text-blue-600 font-bold">
                                                {s.profile?.name?.[0] || "?"}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{s.profile?.name}</p>
                                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-tight">
                                                {s.profile?.institution || "Medical Student"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1">
                                        <Badge className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800 font-black px-2 py-0.5">
                                            {s.times_wrong}× Fail
                                        </Badge>
                                        <p className="text-[10px] font-medium text-gray-400">
                                            {formatDistanceToNow(new Date(s.last_wrong_at))} ago
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* --- Expanded Card Overlay (Detailed Review) --- */}
            {expandedCard && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950/60 backdrop-blur-md p-4"
                    onClick={() => setExpandedCard(null)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="relative bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-white/20 flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header / Top Bar */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full flex items-center justify-center font-black">
                                    {expandedCard.index + 1}
                                </div>
                                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Question Review</span>
                            </div>
                            <button
                                onClick={() => setExpandedCard(null)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-red-500 transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="p-8 overflow-y-auto custom-scrollbar space-y-2 text-left">

                            {/* Question Text */}
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                                {expandedCard.quiz_questions.question_text}
                            </h2>

                            {/* Options Grid */}
                            <div className="grid grid-cols-1 gap-1">
                                {["A", "B", "C", "D"].map((key) => {
                                    const isCorrect = key === expandedCard.quiz_questions.correct_answer;
                                    return (
                                        <div
                                            key={key}
                                            className={`group flex items-start gap-4 p-4 rounded-2xl border-2 transition-all ${isCorrect
                                                ? "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-900 dark:text-green-400"
                                                : "bg-gray-50 dark:bg-gray-800/40 border-transparent text-gray-600 dark:text-gray-400"
                                                }`}
                                        >
                                            <div className={`h-6 w-6 rounded-md flex items-center justify-center text-xs font-black shrink-0 ${isCorrect ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                                                }`}>
                                                {key}
                                            </div>
                                            <span className="text-sm md:text-base font-semibold leading-relaxed">
                                                {expandedCard.quiz_questions[`option_${key.toLowerCase()}`]}
                                            </span>
                                            {isCorrect && <CheckCircle size={20} className="ml-auto text-green-500 shrink-0" />}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Clinical Explanation Section */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] p-8 border border-blue-100 dark:border-blue-800/50">
                                <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400">
                                    <BookOpen size={20} />
                                    <h3 className="font-black text-sm uppercase tracking-widest">Rational & Explanation</h3>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed font-medium">
                                        {expandedCard.quiz_questions.explanation}
                                    </p>

                                    {expandedCard.quiz_questions.additional && (
                                        <div className="pt-4 border-t border-blue-200/50 dark:border-blue-800/50">
                                            <p className="text-blue-800/70 dark:text-blue-300/70 italic text-sm leading-relaxed">
                                                <strong>Note:</strong> {expandedCard.quiz_questions.additional}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-gray-50 dark:bg-gray-800/30 text-center">
                            <button
                                onClick={() => setExpandedCard(null)}
                                className="px-8 py-3 bg-gray-200 dark:bg-gray-900 text-black dark:text-white font-bold rounded-2xl hover:scale-105 transition-transform"
                            >
                                Understood
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </>
    );
}
