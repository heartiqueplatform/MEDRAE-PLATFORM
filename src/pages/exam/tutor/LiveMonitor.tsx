"use client";

import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

import React from 'react';
import {
    Edit2,
    CheckCircle,
    ChevronLeft,
    FileText,
    ListChecks,
    Plus,
    Upload,
    CheckCircle2,
    Award,
    Edit3,
    Trash2,
    Layers,
    Database,
    Save,
    FileSpreadsheet,
    LogOut
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState, useRef } from "react";

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
    const formRef = useRef<HTMLDivElement>(null);
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
    const [saving, setSaving] = useState(false);

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
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

    const handleSaveAndExit = async () => {
        if (!paper_id) return;

        setSaving(true);

        // Small delay to show saving state
        await new Promise(resolve => setTimeout(resolve, 500));

        setSaving(false);
        navigate("/dashboard/tutor", { replace: true }); // Navigates without refresh
    };

    const handleBack = () => {
        navigate(`/tutor/exams/${paper_id}`);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-background p-0 m-0 w-full font-['Inter',system-ui,-apple-system,sans-serif] transition-colors duration-300">

            <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 py-4 sm:py-8">
                <div className="max-w-6xl mx-auto space-y-4">

                    {/* TOP NAVIGATION & STATS */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <button
                                onClick={handleBack}
                                className="group flex items-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-bold hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-2"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                                Back to Instructions
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-600 p-2 sm:p-2.5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
                                    <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                        Question <span className="text-indigo-600">Studio</span>
                                    </h1>
                                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">Curating Exam: {questions.length} Questions Loaded</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Save & Exit Button */}
                            <Button
                                onClick={handleSaveAndExit}
                                disabled={saving}
                                className="h-10 sm:h-12 px-4 sm:px-6 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] sm:text-xs rounded-xl shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Save & Exit
                                    </>
                                )}
                            </Button>

                            <div className="flex items-center gap-2 sm:gap-3 bg-white dark:bg-slate-800 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl shadow-sm border-0">
                                <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-center">
                                    <span className="block text-lg sm:text-xl font-black text-slate-900 dark:text-white">{questions.length}</span>
                                    <span className="text-[8px] sm:text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest">Total Qs</span>
                                </div>
                                <Separator orientation="vertical" className="h-6 sm:h-8 bg-slate-200 dark:bg-slate-700" />
                                <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-center">
                                    <span className="block text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400">{questions.reduce((acc: number, q: any) => acc + (q.marks || 0), 0)}</span>
                                    <span className="text-[8px] sm:text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest">Total Marks</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6 sm:gap-8">
                        {/* LEFT: COMPOSER FORM */}
                        <div className="space-y-2">
                            <Card
                                ref={formRef}
                                className="border-0 shadow-none sm:shadow-2xl rounded-none sm:rounded-3xl bg-white dark:bg-slate-900/50 overflow-hidden"
                            >
                                <div className="bg-slate-900 dark:bg-slate-950 p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-white">
                                        {editingId ? <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />}
                                        <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em]">
                                            {editingId ? "Editor Mode" : "Composer Mode"}
                                        </span>
                                    </div>
                                    {editingId && <Badge className="bg-amber-500 text-white border-0 text-[8px] sm:text-[10px]">Editing Q-ID: {editingId.toString().slice(0, 4)}</Badge>}
                                </div>

                                <CardContent className="p-4 sm:p-6 md:p-8">
                                    <form onSubmit={handleAddOrEditQuestion} className="space-y-4 sm:space-y-6">
                                        <div className="space-y-1.5 sm:space-y-2">
                                            <label className="text-[9px] sm:text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 ml-1">Question Prompt</label>
                                            <textarea
                                                placeholder="Type the clinical scenario or question here..."
                                                value={questionText}
                                                onChange={(e) => setQuestionText(e.target.value)}
                                                required
                                                rows={4}
                                                className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-0 focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-slate-700 dark:text-slate-200 font-medium resize-none text-sm sm:text-base placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                            />
                                        </div>

                                        <div className="space-y-2 sm:space-y-3">
                                            <label className="text-[9px] sm:text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 ml-1">Response Options</label>
                                            {[
                                                { id: 'A', val: optionA, set: setOptionA },
                                                { id: 'B', val: optionB, set: setOptionB },
                                                { id: 'C', val: optionC, set: setOptionC },
                                                { id: 'D', val: optionD, set: setOptionD },
                                            ].map((opt) => (
                                                <div key={opt.id} className="relative group">
                                                    <span className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 font-black text-[10px] sm:text-xs ${correctAnswer === opt.id ? 'text-green-500' : 'text-slate-300 dark:text-slate-600'}`}>
                                                        {opt.id}
                                                    </span>
                                                    <input
                                                        placeholder={`Option ${opt.id}`}
                                                        value={opt.val}
                                                        onChange={(e) => opt.set(e.target.value)}
                                                        required
                                                        className="w-full p-2.5 sm:p-3 pl-8 sm:pl-10 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800/50 border-0 focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                            <div className="space-y-1.5 sm:space-y-2">
                                                <label className="text-[9px] sm:text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 ml-1">Key</label>
                                                <select
                                                    value={correctAnswer}
                                                    onChange={(e) => setCorrectAnswer(e.target.value)}
                                                    className="w-full p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800/50 border-0 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm"
                                                >
                                                    <option value="A">Answer: A</option>
                                                    <option value="B">Answer: B</option>
                                                    <option value="C">Answer: C</option>
                                                    <option value="D">Answer: D</option>
                                                </select>
                                            </div>

                                            <div className="space-y-1.5 sm:space-y-2">
                                                <label className="text-[9px] sm:text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 ml-1">Weight (Marks)</label>
                                                <input
                                                    type="number"
                                                    value={marks}
                                                    onChange={(e) => setMarks(Number(e.target.value))}
                                                    className="w-full p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800/50 border-0 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200"
                                                />
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className={`w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg sm:shadow-xl ${editingId
                                                ? "bg-amber-500 hover:bg-amber-600 shadow-amber-100 dark:shadow-amber-900/30 dark:hover:bg-amber-600"
                                                : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 dark:shadow-indigo-900/30 dark:hover:bg-indigo-700"
                                                } text-xs sm:text-sm text-white hover:text-white`}
                                        >
                                            {loading ? "Processing..." : editingId ? "Update Question" : "Add to Bank"}
                                            {!loading && <Save className="ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* CSV SECTION */}
                            <div className="p-4 sm:p-6 bg-white dark:bg-slate-900/50 rounded-xl sm:rounded-3xl border-0 border-dashed border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                                    <div className="p-1.5 sm:p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                                        <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">Bulk Import</h4>
                                        <p className="text-[8px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-tight">CSV: question, A, B, C, D, correct, marks</p>
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleCSVUpload}
                                    className="block w-full text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4 file:rounded-full file:border-0 file:text-[8px] sm:file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-indigo-50 dark:file:bg-indigo-900/30 file:text-indigo-700 dark:file:text-indigo-400 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50 transition-all cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* RIGHT: QUESTION LIST */}
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center justify-between mb-2 px-1 sm:px-2">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 dark:text-slate-500" />
                                    <h3 className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Question Bank</h3>
                                </div>
                                <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8px] sm:text-[10px] border-0">Live Sync Active</Badge>
                            </div>

                            <div className="space-y-3 sm:space-y-4 max-h-[800px] overflow-y-auto pr-1 sm:pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                                {questions.length === 0 && (
                                    <div className="text-center py-12 sm:py-20 bg-white dark:bg-slate-900/50 rounded-xl sm:rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                                        <p className="text-slate-400 dark:text-slate-500 font-medium italic text-xs sm:text-sm">No questions added to this session yet.</p>
                                    </div>
                                )}

                                {questions.map((q: any, index: number) => (
                                    <Card key={q.id} className="border-0 shadow-sm hover:shadow-md transition-all rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900/50 overflow-hidden group">
                                        <div className="flex">
                                            <div className="w-10 sm:w-12 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center py-3 sm:py-4 border-r border-slate-100 dark:border-slate-800">
                                                <span className="text-[10px] sm:text-xs font-black text-slate-300 dark:text-slate-600">#{index + 1}</span>
                                            </div>
                                            <div className="flex-1 p-3 sm:p-5 relative">
                                                <p className="font-bold text-slate-800 dark:text-slate-200 pr-12 sm:pr-16 leading-snug text-sm sm:text-base">
                                                    {q.question_text}
                                                </p>

                                                <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-1.5 sm:gap-y-2 mt-3 sm:mt-4">
                                                    {['a', 'b', 'c', 'd'].map((char) => (
                                                        <div key={char} className="flex items-start gap-1.5 sm:gap-2">
                                                            <span className={`text-[8px] sm:text-[10px] font-black mt-0.5 ${q.correct_answer.toLowerCase() === char ? 'text-green-500' : 'text-slate-300 dark:text-slate-600'}`}>
                                                                {char.toUpperCase()}
                                                            </span>
                                                            <span className={`text-[10px] sm:text-xs ${q.correct_answer.toLowerCase() === char ? 'font-bold text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                {q[`option_${char}`]}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-50 dark:border-slate-800">
                                                    <div className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 sm:px-2 py-0.5 rounded">
                                                        <Award className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                        {q.marks} MARKS
                                                    </div>
                                                    <div className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[10px] font-black text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-1.5 sm:px-2 py-0.5 rounded">
                                                        <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                        KEY: {q.correct_answer}
                                                    </div>
                                                </div>

                                                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(q)}
                                                        className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg"
                                                    >
                                                        <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(q.id)}
                                                        className="h-6 w-6 sm:h-8 sm:w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"
                                                    >
                                                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TutorLiveMonitor;