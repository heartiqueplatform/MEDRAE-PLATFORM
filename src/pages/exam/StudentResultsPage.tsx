"use client";
import { GlobalLoader } from "@/components/GlobalLoader";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    XCircle,
    Clock,
    BookOpen,
    Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
type StudentResult = any;
const StudentResultsPage = () => {
    const { paper_id } = useParams();
    const navigate = useNavigate();
    const [paper, setPaper] = useState<any>(null);
    const [result, setResult] = useState<StudentResult | null>(null);
    const [answers, setAnswers] = useState<any[]>([]);
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!paper_id || !/^[0-9a-fA-F-]{36}$/.test(paper_id)) {
                    setErrorMessage("Invalid exam link.");
                    setLoading(false);
                    return;
                }

                const {
                    data: { user },
                    error: userErr,
                } = await supabase.auth.getUser();

                if (userErr || !user) {
                    setErrorMessage("You must be logged in to view this page.");
                    setLoading(false);
                    return;
                }

                // Fetch paper
                const { data: paperData, error: paperErr } = await supabase
                    .from("exam_papers")
                    .select("*")
                    .eq("id", paper_id)
                    .maybeSingle();

                if (paperErr || !paperData) {
                    setErrorMessage("Exam not found.");
                    setLoading(false);
                    return;
                }

                setPaper(paperData);

                // Fetch result
                const { data: resData, error: resErr } = await supabase
                    .from("exam_results")
                    .select("*")
                    .eq("paper_id", paper_id)
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (resErr || !resData) {
                    setResult(null);
                } else {
                    setResult(resData);
                }

                // Fetch answers
                const { data: answersData } = await supabase
                    .from("exam_answers")
                    .select(`
                        *,
                        exam_questions(
                            question_text,
                            option_a,
                            option_b,
                            option_c,
                            option_d,
                            correct_answer,
                            explanation
                        )
                    `)
                    .eq("paper_id", paper_id)
                    .eq("user_id", user.id);

                setAnswers(answersData || []);
            } catch (err) {
                console.error(err);
                setErrorMessage("Something went wrong.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [paper_id]);

    if (loading) return <GlobalLoader />;
    if (errorMessage) return <p className="p-8">{errorMessage}</p>;
    if (!paper) return <p className="p-8">Paper not found.</p>;
    if (!result) return <p className="p-8">You have no results for this exam yet.</p>;

    const percent = ((result.score / result.total_questions) * 100).toFixed(1);



    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center p-4 md:p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-4xl space-y-6"
            >
                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="group flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-medium"
                >
                    <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </button>

                {/* Paper info Card */}
                <div className="overflow-hidden rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-0 shadow-sm">
                    <div className="p-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                                    {paper.title}
                                </h1>
                                {paper.description && (
                                    <p className="mt-2 text-gray-600 dark:text-gray-400 leading-relaxed">
                                        {paper.description}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-100 dark:border-blue-800">
                                    <BookOpen size={14} /> {paper.course || "N/A"}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider border border-purple-100 dark:border-purple-800">
                                    <Layout size={14} /> Block {paper.block || "N/A"}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold uppercase tracking-wider">
                                    <Clock size={14} /> {paper.duration} mins
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Result Summary Section */}
                    <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-2">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="space-y-1 text-center md:text-left">
                                <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Final Score</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-gray-900 dark:text-white">{result.score}</span>
                                    <span className="text-xl text-gray-400">/ {result.total_questions}</span>
                                </div>
                            </div>

                            <div className="relative flex items-center justify-center">
                                {/* Simple Progress Circle logic can go here, using percentage for now */}
                                <div className="text-center">
                                    <p className={`text-4xl font-bold ${percent >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                                        {percent}%
                                    </p>
                                    <p className="text-xs font-medium text-gray-400 uppercase">Accuracy</p>
                                </div>
                            </div>

                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-blue-500/20"
                            >
                                {expanded ? "Hide Detailed Review" : "Review Answers"}
                                {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Animated Answers Section */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.4, ease: "circOut" }}
                            className="overflow-hidden space-y-4"
                        >
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mt-0 mb-0 px-2">Question Analysis</h2>

                            {answers.map((ans: any, index: number) => (
                                <motion.div
                                    key={ans.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`p-6 rounded-2xl border backdrop-blur-sm transition-all ${ans.is_correct
                                        ? "bg-white/70 dark:bg-gray-900/70 border-green-100 dark:border-green-900/30 shadow-sm"
                                        : "bg-white/70 dark:bg-gray-900/70 border-red-100 dark:border-red-900/30 shadow-sm"
                                        }`}
                                >
                                    <div className="flex justify-between items-start gap-2 mb-2">
                                        <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 leading-tight">
                                            <span className="text-gray-400 mr-2">Q{index + 1}.</span>
                                            {ans.exam_questions?.question_text}
                                        </p>
                                        {ans.is_correct ? (
                                            <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                                                <CheckCircle className="text-green-500" size={24} />
                                            </div>
                                        ) : (
                                            <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded-full">
                                                <XCircle className="text-red-500" size={24} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                                        {["A", "B", "C", "D"].map((opt) => {
                                            const isSelected = ans.selected_answer === opt;
                                            const isCorrect = ans.exam_questions?.correct_answer === opt;

                                            return (
                                                <div
                                                    key={opt}
                                                    className={`p-3 rounded-xl border text-sm transition-all flex items-center gap-3 ${isSelected && isCorrect ? "bg-green-600 text-white border-green-600" :
                                                        isSelected ? "bg-yellow-500 text-black border-yellow-500 font-bold" :
                                                            isCorrect ? "bg-green-600 text-white border-green-600 font-bold" :
                                                                "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                                                        }`}
                                                >
                                                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs shrink-0 ${(isSelected || isCorrect) ? "bg-white/20" : "bg-gray-200 dark:bg-gray-700"
                                                        }`}>
                                                        {opt}
                                                    </span>
                                                    {ans.exam_questions?.[`option_${opt.toLowerCase()}`]}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {ans.exam_questions?.explanation && (
                                        <div className="mt-4 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Explanation</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                                                {ans.exam_questions.explanation}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default StudentResultsPage;