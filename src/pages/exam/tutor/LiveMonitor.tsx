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
    FileSpreadsheet
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState, useRef } from "react"; // Added useRef
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

    const handleBack = () => {
        navigate(`/tutor/exams/${paper_id}`); // back to instructions
    };


    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-background p-4 md:p-8 transition-colors duration-300">
            <div className="max-w-6xl mx-auto space-y-4">

                {/* TOP NAVIGATION & STATS */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <button
                            onClick={handleBack}
                            className="group flex items-center text-slate-500 dark:text-slate-400 text-sm font-bold hover:text-blue-600 transition-colors mb-2"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                            Back to Instructions
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
                                <Layers className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Question <span className="text-indigo-600">Studio</span>
                                </h1>
                                <p className="text-xs text-slate-500 font-medium">Curating Exam: {questions.length} Questions Loaded</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="px-4 py-2 text-center">
                            <span className="block text-xl font-black text-slate-900 dark:text-white">{questions.length}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Total Qs</span>
                        </div>
                        <Separator orientation="vertical" className="h-8" />
                        <div className="px-4 py-2 text-center">
                            <span className="block text-xl font-black text-blue-600">{questions.reduce((acc: number, q: any) => acc + (q.marks || 0), 0)}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Total Marks</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-8">
                    {/* LEFT: COMPOSER FORM */}
                    <div className="space-y-2">
                        <Card
                            ref={formRef}  // <--- ATTACH REF HERE
                            className="border-none shadow-2xl shadow-slate-200/50 dark:shadow-none rounded-3xl bg-white dark:bg-muted/30 overflow-hidden"
                        >
                            <div className="bg-slate-900 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-white">
                                    {editingId ? <Edit3 className="w-4 h-4 text-amber-400" /> : <Plus className="w-4 h-4 text-blue-400" />}
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                                        {editingId ? "Editor Mode" : "Composer Mode"}
                                    </span>
                                </div>
                                {editingId && <Badge className="bg-amber-500 text-white border-none">Editing Q-ID: {editingId.toString().slice(0, 4)}</Badge>}
                            </div>

                            <CardContent className="p-6 md:p-8">
                                <form onSubmit={handleAddOrEditQuestion} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold uppercase text-slate-400 ml-1">Question Prompt</label>
                                        <textarea
                                            placeholder="Type the clinical scenario or question here..."
                                            value={questionText}
                                            onChange={(e) => setQuestionText(e.target.value)}
                                            required
                                            rows={4}
                                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-slate-700 dark:text-slate-200 font-medium resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <label className="text-[11px] font-bold uppercase text-slate-400 ml-1">Response Options</label>
                                        {[
                                            { id: 'A', val: optionA, set: setOptionA },
                                            { id: 'B', val: optionB, set: setOptionB },
                                            { id: 'C', val: optionC, set: setOptionC },
                                            { id: 'D', val: optionD, set: setOptionD },
                                        ].map((opt) => (
                                            <div key={opt.id} className="relative group">
                                                <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-black text-xs ${correctAnswer === opt.id ? 'text-green-500' : 'text-slate-300'}`}>
                                                    {opt.id}
                                                </span>
                                                <input
                                                    placeholder={`Option ${opt.id}`}
                                                    value={opt.val}
                                                    onChange={(e) => opt.set(e.target.value)}
                                                    required
                                                    className="w-full p-3 pl-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-semibold"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold uppercase text-slate-400 ml-1">Key</label>
                                            <select
                                                value={correctAnswer}
                                                onChange={(e) => setCorrectAnswer(e.target.value)}
                                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600"
                                            >
                                                <option value="A">Answer: A</option>
                                                <option value="B">Answer: B</option>
                                                <option value="C">Answer: C</option>
                                                <option value="D">Answer: D</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold uppercase text-slate-400 ml-1">Weight (Marks)</label>
                                            <input
                                                type="number"
                                                value={marks}
                                                onChange={(e) => setMarks(Number(e.target.value))}
                                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl ${editingId
                                            ? "bg-amber-500 hover:bg-amber-600 shadow-amber-100"
                                            : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                                            }`}
                                    >
                                        {loading ? "Processing..." : editingId ? "Update Question" : "Add to Bank"}
                                        {!loading && <Save className="ml-2 w-4 h-4" />}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* CSV SECTION */}
                        <div className="p-6 bg-white dark:bg-muted/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Bulk Import</h4>
                                    <p className="text-[10px] text-slate-400 font-medium tracking-tight">CSV: question, A, B, C, D, correct, marks</p>
                                </div>
                            </div>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleCSVUpload}
                                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* RIGHT: QUESTION LIST */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2 px-2">
                            <div className="flex items-center gap-2">
                                <Database className="w-4 h-4 text-slate-400" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Question Bank</h3>
                            </div>
                            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-500">Live Sync Active</Badge>
                        </div>

                        <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                            {questions.length === 0 && (
                                <div className="text-center py-20 bg-white dark:bg-muted/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-400 font-medium italic">No questions added to this session yet.</p>
                                </div>
                            )}

                            {questions.map((q: any, index: number) => (
                                <Card key={q.id} className="border-none shadow-sm hover:shadow-md transition-all rounded-2xl bg-white dark:bg-muted/30 overflow-hidden group">
                                    <div className="flex">
                                        <div className="w-12 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center py-4 border-r dark:border-slate-800">
                                            <span className="text-xs font-black text-slate-300">#{index + 1}</span>
                                        </div>
                                        <div className="flex-1 p-5 relative">
                                            <p className="font-bold text-slate-800 dark:text-slate-200 pr-16 leading-snug">
                                                {q.question_text}
                                            </p>

                                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4">
                                                {['a', 'b', 'c', 'd'].map((char) => (
                                                    <div key={char} className="flex items-start gap-2">
                                                        <span className={`text-[10px] font-black mt-0.5 ${q.correct_answer.toLowerCase() === char ? 'text-green-500' : 'text-slate-300'}`}>
                                                            {char.toUpperCase()}
                                                        </span>
                                                        <span className={`text-xs ${q.correct_answer.toLowerCase() === char ? 'font-bold text-slate-700 dark:text-slate-300' : 'text-slate-500'}`}>
                                                            {q[`option_${char}`]}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded">
                                                    <Award className="w-3 h-3" />
                                                    {q.marks} MARKS
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-green-600 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    KEY: {q.correct_answer}
                                                </div>
                                            </div>

                                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(q)}
                                                    className="h-8 w-8 text-amber-500 hover:bg-amber-50 rounded-lg"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(q.id)}
                                                    className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
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
    );
}

export default TutorLiveMonitor;