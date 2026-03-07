"use client";
import { GlobalLoader } from "@/components/GlobalLoader";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { BarChart3 } from "lucide-react";

type Result = {
    id: string;
    paper_id: string;
    score: number;
    total_questions: number;
    submitted_at: string;
    is_released: boolean;
    exam_papers: {
        id: string;
        title: string;
        course: string;
        is_released: boolean;

    };
};

const ResultsListPage = () => {
    const navigate = useNavigate();
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const fetchResults = async () => {
            try {
                setLoading(true);
                setErrorMessage("");

                const {
                    data: { user },
                    error: userErr,
                } = await supabase.auth.getUser();

                if (userErr || !user) {
                    setErrorMessage("You must be logged in.");
                    setLoading(false);
                    return;
                }

                const { data, error } = await supabase
                    .from("exam_results")
                    .select(`
                        id,
                        paper_id,
                        score,
                        total_questions,
                        submitted_at,
                            is_released,
                        exam_papers!inner (
                            id,
                            title,
                            course,
                            is_released
                        )
                    `)
                    .eq("user_id", user.id)
                    .order("submitted_at", { ascending: false });

                if (error) {
                    console.error(error);
                    setErrorMessage("Failed to load results.");
                    setLoading(false);
                    return;
                }

                setResults(data || []);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setErrorMessage("Something went wrong.");
                setLoading(false);
            }
        };

        fetchResults();
    }, []);

    if (loading) return <GlobalLoader />;
    if (errorMessage) return <p className="p-8">{errorMessage}</p>;

    return (
        <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
            <div className="w-full max-w-3xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-md rounded-2xl p-8 shadow-lg">
                <h1 className="text-4xl font-bold mb-6 flex items-center gap-2">
                    <BarChart3 />  Institutional Exam Results
                </h1>

                {results.length === 0 ? (
                    <p className="mt-2 text-gray-700 dark:text-gray-300">
                        Here you can view the results of your exams conducted by your institution.
                        Each result shown is linked to the exams you have taken within your academic program.
                        As your exams are marked and released, the scores will appear in this section for you to track your progress.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {results.map((res) => {
                            const isReleased =
                                res.exam_papers?.is_released && res.is_released;
                            const percentage = ((res.score / res.total_questions) * 100).toFixed(1);

                            return (
                                <div
                                    key={res.id}
                                    className={`p-6 rounded-xl bg-white/70 dark:bg-gray-800/70 cursor-pointer transition hover:shadow-md backdrop-blur-sm ${!isReleased ? "opacity-60 cursor-not-allowed" : ""
                                        }`}
                                    onClick={() => {
                                        if (isReleased) navigate(`/exam/${res.paper_id}/results`);
                                    }}
                                >
                                    <h2 className="text-xl font-semibold">{res.exam_papers.title}</h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Course: {res.exam_papers.course || "N/A"}
                                    </p>

                                    <p className={`mt-2 font-medium ${!isReleased ? "text-yellow-500" : ""}`}>
                                        {isReleased
                                            ? `Score: ${res.score} / ${res.total_questions} (${percentage}%)`
                                            : "Results not officially released yet"}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResultsListPage;