"use client";
import { GlobalLoader } from "@/components/GlobalLoader";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { ChevronDown, ChevronUp, CheckCircle, XCircle, ChevronLeft } from "lucide-react";

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
        <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
            <div className="w-full max-w-3xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-md rounded-2xl p-8 shadow-lg space-y-2">

                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1 text-blue-500 hover:text-blue-600 font-medium mb-4"
                >
                    <ChevronLeft size={20} /> Back
                </button>

                {/* Paper info */}
                <div className="p-6 rounded-xl bg-white/70 dark:bg-gray-800/70 border backdrop-blur-sm">
                    <h1 className="text-3xl font-bold">{paper.title}</h1>
                    {paper.description && <p className="mt-2">{paper.description}</p>}
                    <p className="mt-2 text-sm text-gray-500">
                        Course: {paper.course || "N/A"} | Block: {paper.block || "N/A"} | Duration: {paper.duration} mins
                    </p>
                </div>

                {/* Result summary */}
                <div className="p-6 rounded-xl bg-white/70 dark:bg-gray-800/70 border backdrop-blur-sm">
                    <p className="text-lg font-bold">
                        Score: {result.score} / {result.total_questions} ({percent}%)
                    </p>

                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="mt-2 text-sm text-blue-500 flex items-center gap-1"
                    >
                        {expanded ? "Hide Answers" : "Show Answers"} {expanded ? <ChevronUp /> : <ChevronDown />}
                    </button>

                    {/* Answers */}
                    {expanded &&
                        answers.map((ans: any) => (
                            <div key={ans.id} className="mt-4 p-4 rounded-lg bg-gray-200/70 dark:bg-gray-700/70 backdrop-blur-sm">
                                <p className="font-medium mb-2">{ans.exam_questions?.question_text}</p>

                                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                    {["A", "B", "C", "D"].map((opt) => (
                                        <p
                                            key={opt}
                                            className={`p-1 rounded ${ans.selected_answer === opt ? "bg-yellow-500 text-black" : ""
                                                } ${ans.exam_questions?.correct_answer === opt ? "bg-green-600 text-white" : ""
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
            </div>
        </div>
    );
};

export default StudentResultsPage;