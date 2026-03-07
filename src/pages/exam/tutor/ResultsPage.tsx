"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ChevronDown, ChevronUp, CheckCircle, XCircle } from "lucide-react";
import { GlobalLoader } from "@/components/GlobalLoader";
type StudentResult = any;

type PaperResults = {
    paper: { id: string; title: string; is_released: boolean };
    results: StudentResult[];
};

const ExamResultsPage = () => {
    const [resultsByPaper, setResultsByPaper] = useState<PaperResults[]>([]);
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchResults = async () => {
        setLoading(true);
        try {
            const { data: papers, error: paperErr } = await supabase
                .from("exam_papers")
                .select("id, title, is_released")
                .order("created_at", { ascending: false });

            if (paperErr) throw paperErr;
            if (!papers || papers.length === 0) {
                setResultsByPaper([]);
                setLoading(false);
                return;
            }

            const resultsData = await Promise.all(
                papers.map(async (paper) => {
                    const { data: resData, error: resErr } = await supabase
                        .from("exam_results")
                        .select("*")
                        .eq("paper_id", paper.id)
                        .order("submitted_at", { ascending: false });

                    if (resErr) console.error("Results fetch error:", resErr);

                    const resultsWithProfiles = await Promise.all(
                        (resData || []).map(async (res) => {
                            const { data: profile } = await supabase
                                .from("profiles")
                                .select("name, email, avatar_url")
                                .eq("user_id", res.user_id)
                                .single();

                            const { data: answers } = await supabase
                                .from("exam_answers")
                                .select(
                                    `*, exam_questions(question_text, option_a, option_b, option_c, option_d, correct_answer, explanation)`
                                )
                                .eq("paper_id", paper.id)
                                .eq("user_id", res.user_id);

                            return {
                                ...res,
                                profile: profile || {},
                                answers: answers || [],
                            };
                        })
                    );

                    return { paper, results: resultsWithProfiles };
                })
            );

            setResultsByPaper(resultsData);
        } catch (err) {
            console.error("Error fetching results:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchResults();
    }, []);

    const releaseResults = async (paperId: string) => {
        setLoading(true);

        // Find current release status from state
        const paper = resultsByPaper.find((p) => p.paper.id === paperId);
        const currentlyReleased = paper?.paper.is_released ?? false;
        const newReleaseState = !currentlyReleased;

        // Update exam_papers
        const { error: paperErr } = await supabase
            .from("exam_papers")
            .update({ is_released: newReleaseState })
            .eq("id", paperId);

        if (paperErr) {
            console.error("Failed to update paper release:", paperErr);
            setLoading(false);
            return;
        }

        // Update all student exam_results for this paper
        const { error: studentErr } = await supabase
            .from("exam_results")
            .update({ is_released: newReleaseState })
            .eq("paper_id", paperId);

        if (studentErr) console.error("Failed to update student results:", studentErr);

        // Update local UI state
        setResultsByPaper((prev) =>
            prev.map((p) =>
                p.paper.id === paperId
                    ? {
                        ...p,
                        paper: { ...p.paper, is_released: newReleaseState },
                        results: p.results.map((r) => ({ ...r, is_released: newReleaseState })),
                    }
                    : p
            )
        );

        setLoading(false);
    };
    const toggleStudentRelease = async (
        resultId: string,
        current: boolean
    ) => {

        const { data, error } = await supabase
            .from("exam_results")
            .update({ is_released: !current })
            .eq("id", resultId)
            .select();
        if (error) {
            console.error("Student release update failed:", error);
            return;
        }
        setResultsByPaper((prev) =>
            prev.map((p) => ({
                ...p,
                results: p.results.map((r) =>
                    r.id === resultId
                        ? { ...r, is_released: !current }
                        : r
                ),
            }))
        );
    };
    return (
        <div className="max-w-8xl py-0 px-4 bg-transparent p-6 flex justify-center items-start">
            <div className="w-full max-w-3xl bg-white/20 dark:bg-gray-800/20 p-6 rounded-2xl shadow-lg backdrop-blur-md">

                {loading && <GlobalLoader />}

                {/* ---------- EMPTY STATE CARD ---------- */}
                {!loading && (!resultsByPaper || resultsByPaper.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4 w-full">
                        <div className="bg-gray-100 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-300 dark:border-gray-700 rounded-2xl p-6 shadow-xl max-w-md">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                                No Exam Results Yet
                            </h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                There are no exam papers or results available at the moment.
                                Once students complete exams and results are submitted, they will appear here.
                            </p>
                        </div>
                    </div>
                )}

                {/* ---------- PAPER RESULTS MAPPING ---------- */}
                {resultsByPaper.map(({ paper, results }) => {
                    const average =
                        results.length > 0
                            ? results.reduce((a, b) => a + b.score, 0) / results.length
                            : 0;
                    return (
                        <div key={paper.id}>
                            <div className="flex items-center justify-between mb-4 mt-4">
                                <h1 className="text-3xl font-bold">Results — {paper.title}</h1>

                                <button
                                    onClick={() => releaseResults(paper.id)}
                                    className={`px-4 py-2 rounded text-white transition ${paper.is_released ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"
                                        }`}
                                >
                                    {paper.is_released ? "Results Released " : "Release Results"}
                                </button>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                                {[
                                    { label: "Students", value: results.length },
                                    { label: "Average Score", value: average.toFixed(1) },
                                    {
                                        label: "Highest",
                                        value: results.length ? Math.max(...results.map((r) => r.score)) : 0,
                                    },
                                    {
                                        label: "Lowest",
                                        value: results.length ? Math.min(...results.map((r) => r.score)) : 0,
                                    },
                                ].map((card) => (
                                    <div
                                        key={card.label}
                                        className="p-4 rounded-xl bg-gray-100 dark:bg-gray-800 border-0"
                                    >
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                                        <p className="text-2xl font-bold">{card.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Student Cards */}
                            <div className="space-y-6">
                                {results.map((student) => {
                                    const percent = ((student.score / student.total_questions) * 100).toFixed(1);

                                    return (
                                        <div
                                            key={student.id}
                                            className={`rounded-xl p-5 ${paper.is_released ? "bg-gray-50 dark:bg-gray-800" : "bg-gray-200 dark:bg-gray-700 opacity-60"
                                                } border-0`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <img
                                                        src={student.profile?.avatar_url || "/default-avatar.png"}
                                                        alt="Avatar"
                                                        className="w-12 h-12 rounded-full object-cover"
                                                    />
                                                    <div>
                                                        <h2 className="font-semibold text-lg">
                                                            {student.profile?.name || "Student"}
                                                        </h2>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            {student.profile?.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!student.is_released}
                                                        onChange={() =>
                                                            toggleStudentRelease(student.id, student.is_released ?? false)
                                                        }
                                                    />
                                                    Release
                                                </label>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold">
                                                            {student.score} / {student.total_questions}
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">{percent}%</p>
                                                    </div>
                                                    <button
                                                        onClick={() =>
                                                            setExpandedStudent(
                                                                expandedStudent === student.id ? null : student.id
                                                            )
                                                        }
                                                    >
                                                        {expandedStudent === student.id ? <ChevronUp /> : <ChevronDown />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Answers Section */}
                                            {expandedStudent === student.id && (
                                                <div className="mt-6 space-y-4">
                                                    {student.answers?.map((ans: any) => (
                                                        <div
                                                            key={ans.id}
                                                            className="p-4 rounded-lg bg-gray-200 dark:bg-gray-700 border-0"
                                                        >
                                                            <p className="font-medium mb-2">
                                                                {ans.exam_questions?.question_text || "No question text"}
                                                            </p>

                                                            {/* Display options A–D */}
                                                            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                                                {["A", "B", "C", "D"].map((opt) => (
                                                                    <p
                                                                        key={opt}
                                                                        className={`p-1 rounded ${ans.selected_answer === opt
                                                                            ? "bg-yellow-500 text-black"
                                                                            : ""
                                                                            } ${ans.exam_questions?.correct_answer === opt
                                                                                ? "bg-green-600 text-white"
                                                                                : ""
                                                                            }`}
                                                                    >
                                                                        {opt}: {ans.exam_questions?.[`option_${opt.toLowerCase()}`]}
                                                                    </p>
                                                                ))}
                                                            </div>

                                                            {ans.exam_questions?.explanation && (
                                                                <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">
                                                                    Explanation: {ans.exam_questions.explanation}
                                                                </p>
                                                            )}

                                                            {ans.is_correct ? (
                                                                <CheckCircle className="text-green-500 mt-2" size={18} />
                                                            ) : (
                                                                <XCircle className="text-red-500 mt-2" size={18} />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })
                }
            </div>
        </div>
    );
};

export default ExamResultsPage;