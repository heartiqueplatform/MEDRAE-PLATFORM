"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
    FileText,
    ListChecks,
    CheckCircle,
    Upload,
    Award,
    Edit2,
    Trash2,
    ChevronLeft,
} from "lucide-react";

type Question = {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string;
    marks: number;
};

const TutorLiveMonitor = () => {
    const { paper_id } = useParams();
    const navigate = useNavigate();

    const [questionText, setQuestionText] = useState("");
    const [optionA, setOptionA] = useState("");
    const [optionB, setOptionB] = useState("");
    const [optionC, setOptionC] = useState("");
    const [optionD, setOptionD] = useState("");
    const [correctAnswer, setCorrectAnswer] = useState("A");
    const [marks, setMarks] = useState(1);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        const { data } = await supabase
            .from("exam_questions")
            .select("*")
            .eq("paper_id", paper_id)
            .order("created_at", { ascending: false });

        if (data) setQuestions(data);
    };

    const handleAddOrEditQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paper_id) return;

        setLoading(true);

        if (editingId) {
            // Update existing question
            const { error } = await supabase
                .from("exam_questions")
                .update({
                    question_text: questionText,
                    option_a: optionA,
                    option_b: optionB,
                    option_c: optionC,
                    option_d: optionD,
                    correct_answer: correctAnswer,
                    marks,
                })
                .eq("id", editingId);

            if (error) {
                console.error(error);
                alert("Error updating question");
            } else {
                setEditingId(null);
            }
        } else {
            // Add new question
            const { error } = await supabase.from("exam_questions").insert([
                {
                    paper_id,
                    question_text: questionText,
                    option_a: optionA,
                    option_b: optionB,
                    option_c: optionC,
                    option_d: optionD,
                    correct_answer: correctAnswer,
                    marks,
                },
            ]);

            if (error) {
                console.error(error);
                alert("Error adding question");
            }
        }

        setQuestionText("");
        setOptionA("");
        setOptionB("");
        setOptionC("");
        setOptionD("");
        setCorrectAnswer("A");
        setMarks(1);

        setLoading(false);
        fetchQuestions();
    };

    const handleEdit = (q: Question) => {
        setEditingId(q.id);
        setQuestionText(q.question_text);
        setOptionA(q.option_a);
        setOptionB(q.option_b);
        setOptionC(q.option_c);
        setOptionD(q.option_d);
        setCorrectAnswer(q.correct_answer);
        setMarks(q.marks);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this question?")) return;

        const { error } = await supabase.from("exam_questions").delete().eq("id", id);
        if (error) {
            console.error(error);
            alert("Error deleting question");
            return;
        }
        fetchQuestions();
    };

    const handleCSVUpload = async (e: any) => {
        const file = e.target.files[0];
        if (!file || !paper_id) return;

        const text = await file.text();
        const rows = text.split("\n").slice(1);

        const formatted = rows
            .map((row) => {
                const cols = row.split(",");
                if (cols.length < 7) return null;
                return {
                    paper_id,
                    question_text: cols[0],
                    option_a: cols[1],
                    option_b: cols[2],
                    option_c: cols[3],
                    option_d: cols[4],
                    correct_answer: cols[5],
                    marks: Number(cols[6]) || 1,
                };
            })
            .filter(Boolean);

        const { error } = await supabase.from("exam_questions").insert(formatted as any);

        if (error) {
            console.error(error);
            alert("CSV upload failed");
            return;
        }

        fetchQuestions();
        alert("CSV uploaded successfully");
    };

    const handleBack = () => {
        navigate(`/tutor/exams/${paper_id}`); // back to instructions
    };

    return (
        <div className="min-h-screen bg-transparent p-6 pt-0 flex justify-center">
            <div className="w-full max-w-5xl bg-white/20 dark:bg-gray-800/20 backdrop-blur-md rounded-2xl shadow-lg p-8">

                {/* Back Button */}
                <button
                    onClick={handleBack}
                    className="flex items-center text-gray-900 dark:text-white mb-6 hover:text-green-600 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back to Instructions
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <FileText className="text-blue-600" size={28} />
                    <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
                        Question Manager ({questions.length} Questions)
                    </h1>
                </div>

                {/* Add/Edit Form */}
                <form onSubmit={handleAddOrEditQuestion} className="space-y-2 mb-10">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                        <ListChecks size={18} />
                        <span className="text-sm font-medium">
                            {editingId ? "Edit Question" : "Add Question"}
                        </span>
                    </div>

                    <textarea
                        placeholder="Enter the full question text..."
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        required
                        rows={4}
                        className="w-full p-4 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <input
                            placeholder="Option A"
                            value={optionA}
                            onChange={(e) => setOptionA(e.target.value)}
                            required
                            className="p-3 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <input
                            placeholder="Option B"
                            value={optionB}
                            onChange={(e) => setOptionB(e.target.value)}
                            required
                            className="p-3 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <input
                            placeholder="Option C"
                            value={optionC}
                            onChange={(e) => setOptionC(e.target.value)}
                            required
                            className="p-3 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <input
                            placeholder="Option D"
                            value={optionD}
                            onChange={(e) => setOptionD(e.target.value)}
                            required
                            className="p-3 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <select
                            value={correctAnswer}
                            onChange={(e) => setCorrectAnswer(e.target.value)}
                            className="p-3 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="A">Correct Answer: A</option>
                            <option value="B">Correct Answer: B</option>
                            <option value="C">Correct Answer: C</option>
                            <option value="D">Correct Answer: D</option>
                        </select>

                        <input
                            type="number"
                            value={marks}
                            onChange={(e) => setMarks(Number(e.target.value))}
                            className="p-3 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-all disabled:bg-blue-400"
                    >
                        {loading ? (editingId ? "Updating..." : "Adding...") : editingId ? "Update Question" : "Add Question"}
                    </button>
                </form>

                {/* CSV Upload */}
                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-2 text-gray-800 dark:text-gray-200">
                        <Upload size={18} />
                        <span className="font-medium">
                            Upload CSV (question, A, B, C, D, correct, marks)
                        </span>
                    </div>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleCSVUpload}
                        className="block w-full text-sm text-gray-700 dark:text-gray-200"
                    />
                </div>

                {/* Question List */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle size={20} className="text-green-600" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Added Questions
                        </h2>
                    </div>

                    {questions.map((q) => (
                        <div
                            key={q.id}
                            className="bg-white/40 dark:bg-gray-700/40 rounded-xl p-4 mb-4 backdrop-blur-sm relative"
                        >
                            <p className="font-semibold text-gray-900 dark:text-white mb-2">
                                {q.question_text}
                            </p>

                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-800 dark:text-gray-200">
                                <p>A: {q.option_a}</p>
                                <p>B: {q.option_b}</p>
                                <p>C: {q.option_c}</p>
                                <p>D: {q.option_d}</p>
                            </div>

                            <div className="flex items-center gap-2 mt-3 text-sm text-gray-600 dark:text-gray-300">
                                <Award size={16} />
                                <span>
                                    Correct: {q.correct_answer} | Marks: {q.marks}
                                </span>
                            </div>

                            <div className="absolute top-4 right-4 flex gap-2">
                                <button
                                    onClick={() => handleEdit(q)}
                                    className="text-yellow-500 hover:text-yellow-600"
                                    title="Edit Question"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(q.id)}
                                    className="text-red-500 hover:text-red-600"
                                    title="Delete Question"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TutorLiveMonitor;