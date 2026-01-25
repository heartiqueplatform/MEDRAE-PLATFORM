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

const PAGE_SIZE = 10;

export function MistakesCard() {
    const [data, setData] = useState<any[]>([]);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<any[]>([]);

    // Load counts from localStorage initially
    const [studentCounts, setStudentCounts] = useState<Record<string, number>>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("studentCounts");
            return saved ? JSON.parse(saved) : {};
        }
        return {};
    });

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
        const start = page * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const paginated = merged.slice(start, end);

        if (page === 0) {
            setData(paginated);
        } else {
            setData((prev) => [...prev, ...paginated]);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchMistakes();
    }, [page]);

    const openDetails = async (questionId: string) => {
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
    };

    const optionStyle = (key: string, correct: string) =>
        key === correct
            ? "border-green-500 bg-green-50 dark:bg-green-900"
            : "border-gray-200 dark:border-gray-700";

    return (
        <>
            <Card className="border-0 shadow-none bg-[var(--card-bg)] dark:bg-[var(--card-bg-dark)]">
                <CardHeader className="p-2">
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="text-red-500" />
                        Most Failed Questions
                    </CardTitle>
                    <CardDescription>High-impact mistakes students struggle with the most</CardDescription>
                </CardHeader>

                <CardContent className="flex gap-4 overflow-x-auto custom-scrollbar pb-4">
                    {data.map((item, i) => {
                        const q = item.quiz_questions;
                        return (
                            <motion.div key={i} whileHover={{ scale: 1.03 }} className="min-w-[320px]">
                                <Card onClick={() => openDetails(item.question_id)} className="cursor-pointer bg-white dark:bg-gray-900">
                                    <CardContent className="p-3 flex flex-col h-[520px]">
                                        {/* Question */}
                                        <p className="text-sm font-semibold mb-1">{q.question_text}</p>

                                        {/* Options */}
                                        <div className="flex flex-col gap-1 mb-2">
                                            {["A", "B", "C", "D"].map((key) => (
                                                <div
                                                    key={key}
                                                    className={`border rounded-md p-2 text-xs ${optionStyle(key, q.correct_answer)}`}
                                                >
                                                    <strong>{key}.</strong> {q[`option_${key.toLowerCase()}`]}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Explanation + additional scrollable */}
                                        <div className="flex-1 overflow-y-auto custom-scrollbar text-xs text-muted-foreground mb-2">
                                            <div>
                                                <strong>Explanation:</strong> {q.explanation}
                                            </div>
                                            {q.additional && <div className="italic mt-1">{q.additional}</div>}
                                        </div>

                                        {/* Stats */}
                                        <div className="flex justify-between items-center pt-2">
                                            <Badge className="bg-red-500 text-white cursor-pointer hover:opacity-80">
                                                Who attempted?
                                            </Badge>

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
        </>
    );
}
