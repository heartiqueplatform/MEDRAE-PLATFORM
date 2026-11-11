"use client";

import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
    Edit3,
    CheckCircle2,
    ChevronLeft,
    Plus,
    Trash2,
    Layers,
    Database,
    Save,
    FileSpreadsheet,
    LogOut,
    Award,
} from "lucide-react";
import { playSound } from "@/lib/soundManager";

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

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" | "warning" = "light") => {
    try { playSound("ui-tap"); } catch { /* no-op */ }
    if (type === "success") vibrate([15, 30, 15]);
    else if (type === "warning") vibrate(60);
    else vibrate(15);
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

    const handleBack = useCallback(() => {
        tap();
        navigate(`/tutor/exams/${paper_id}`);
    }, [navigate, paper_id]);

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

        tap();
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
        tap();
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
        tap("warning");

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
        tap();

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
        tap("success");
        setSaving(true);

        await new Promise((resolve) => setTimeout(resolve, 500));

        setSaving(false);
        navigate("/dashboard/tutor", { replace: true });
    };

    const totalMarks = questions.reduce(
        (acc: number, q: any) => acc + (q.marks || 0),
        0
    );

    return (
        <div
            className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white"
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            {/* ── HEADER ──────────────────────────────────────── */}
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={handleBack}
                    aria-label="Go back"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5
                               transition-colors shrink-0"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate">
                        Question studio
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {questions.length} question{questions.length === 1 ? "" : "s"} · {totalMarks} mark{totalMarks === 1 ? "" : "s"}
                    </p>
                </div>
                <button
                    onClick={handleSaveAndExit}
                    disabled={saving}
                    className="h-9 px-2.5 rounded-full flex items-center justify-center gap-1 shrink-0
                               bg-emerald-600 text-white
                               active:scale-[0.95] transition-transform
                               disabled:opacity-50 disabled:active:scale-100"
                    style={{ touchAction: "manipulation" }}
                >
                    {saving ? (
                        <>
                            <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span className="text-[11px] font-semibold">Saving</span>
                        </>
                    ) : (
                        <>
                            <LogOut className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-semibold">Save & exit</span>
                        </>
                    )}
                </button>
            </header>

            {/* ── SCROLLING BODY ──────────────────────────────── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <div className="w-full max-w-[880px] mx-auto px-4 py-3 pb-24 safe-bottom space-y-3">

                    {/* Composer card */}
                    <section
                        ref={formRef}
                        className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden"
                    >
                        <div className="px-4 py-3 flex items-center justify-between gap-2
                                        border-b border-slate-200/70 dark:border-white/[0.06]">
                            <div className="flex items-center gap-2">
                                {editingId ? (
                                    <Edit3 className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                                ) : (
                                    <Plus className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                )}
                                <span className="text-[10px] font-bold uppercase tracking-wider
                                                 text-slate-500 dark:text-slate-400">
                                    {editingId ? "Edit mode" : "Compose mode"}
                                </span>
                            </div>
                            {editingId && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                                                 bg-amber-50 dark:bg-amber-400/10
                                                 text-amber-700 dark:text-amber-400">
                                    Q-{editingId.toString().slice(0, 4)}
                                </span>
                            )}
                        </div>

                        <form onSubmit={handleAddOrEditQuestion} className="p-4 space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider
                                                  text-slate-500 dark:text-slate-400 ml-1">
                                    Question prompt
                                </label>
                                <textarea
                                    placeholder="Type the clinical scenario or question here…"
                                    value={questionText}
                                    onChange={(e) => setQuestionText(e.target.value)}
                                    required
                                    rows={4}
                                    className="w-full p-3 rounded-xl text-sm font-medium resize-none
                                               bg-slate-50 dark:bg-[#0d1117]
                                               border-0 outline-none
                                               text-slate-700 dark:text-slate-200
                                               placeholder:text-slate-400 dark:placeholder:text-slate-500
                                               focus:ring-2 focus:ring-blue-500/40"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider
                                                  text-slate-500 dark:text-slate-400 ml-1">
                                    Response options
                                </label>
                                {[
                                    { id: "A", val: optionA, set: setOptionA },
                                    { id: "B", val: optionB, set: setOptionB },
                                    { id: "C", val: optionC, set: setOptionC },
                                    { id: "D", val: optionD, set: setOptionD },
                                ].map((opt) => (
                                    <div key={opt.id} className="relative">
                                        <span
                                            className={`absolute left-3 top-1/2 -translate-y-1/2
                                                        text-[11px] font-bold
                                                        ${correctAnswer === opt.id
                                                    ? "text-emerald-600 dark:text-emerald-400"
                                                    : "text-slate-300 dark:text-slate-600"
                                                }`}
                                        >
                                            {opt.id}
                                        </span>
                                        <input
                                            placeholder={`Option ${opt.id}`}
                                            value={opt.val}
                                            onChange={(e) => opt.set(e.target.value)}
                                            required
                                            className="w-full h-10 pl-9 pr-3 rounded-xl text-sm font-semibold
                                                       bg-slate-50 dark:bg-[#0d1117]
                                                       border-0 outline-none
                                                       text-slate-700 dark:text-slate-200
                                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                                       focus:ring-2 focus:ring-blue-500/40"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider
                                                      text-slate-500 dark:text-slate-400 ml-1">
                                        Key
                                    </label>
                                    <select
                                        value={correctAnswer}
                                        onChange={(e) => setCorrectAnswer(e.target.value)}
                                        className="w-full h-10 rounded-xl px-3 font-bold text-sm
                                                   bg-slate-50 dark:bg-[#0d1117]
                                                   border-0 outline-none
                                                   text-blue-600 dark:text-blue-400
                                                   focus:ring-2 focus:ring-blue-500/40
                                                   cursor-pointer"
                                    >
                                        <option value="A">Answer: A</option>
                                        <option value="B">Answer: B</option>
                                        <option value="C">Answer: C</option>
                                        <option value="D">Answer: D</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider
                                                      text-slate-500 dark:text-slate-400 ml-1">
                                        Marks
                                    </label>
                                    <input
                                        type="number"
                                        value={marks}
                                        onChange={(e) => setMarks(Number(e.target.value))}
                                        className="w-full h-10 rounded-xl px-3 font-bold text-sm
                                                   bg-slate-50 dark:bg-[#0d1117]
                                                   border-0 outline-none
                                                   text-slate-700 dark:text-slate-200
                                                   focus:ring-2 focus:ring-blue-500/40"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full h-10 rounded-xl text-white text-sm font-bold
                                            flex items-center justify-center gap-1.5
                                            active:scale-[0.97] transition-transform
                                            disabled:opacity-50 disabled:active:scale-100
                                            ${editingId ? "bg-amber-600" : "bg-blue-600"}`}
                                style={{ touchAction: "manipulation" }}
                            >
                                {loading ? (
                                    "Processing…"
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        {editingId ? "Update question" : "Add to bank"}
                                    </>
                                )}
                            </button>
                        </form>
                    </section>

                    {/* CSV import */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-400/10
                                            flex items-center justify-center shrink-0">
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-emerald-600 dark:text-emerald-400 leading-none mb-1">
                                    Bulk import
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    CSV columns: question, A, B, C, D, correct, marks
                                </p>
                            </div>
                        </div>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleCSVUpload}
                            className="block w-full text-[11px] text-slate-500 dark:text-slate-400
                                       file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0
                                       file:text-[10px] file:font-bold file:uppercase file:tracking-wider
                                       file:bg-emerald-50 dark:file:bg-emerald-400/10
                                       file:text-emerald-700 dark:file:text-emerald-400
                                       active:file:bg-emerald-100 dark:active:file:bg-emerald-400/20
                                       transition-colors cursor-pointer"
                        />
                    </section>

                    {/* Question bank */}
                    <section className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-1.5">
                                <Database className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                <h3 className="text-[10px] font-bold uppercase tracking-wider
                                               text-slate-500 dark:text-slate-400">
                                    Question bank
                                </h3>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                             text-[10px] font-bold uppercase tracking-wider
                                             bg-slate-100 dark:bg-white/[0.06]
                                             text-slate-600 dark:text-slate-300">
                                Live sync
                            </span>
                        </div>

                        {questions.length === 0 && (
                            <div className="rounded-2xl bg-white dark:bg-[#161b22] py-14 px-4 text-center">
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                                    No questions added to this session yet.
                                </p>
                            </div>
                        )}

                        {questions.map((q: any, index: number) => (
                            <div
                                key={q.id}
                                className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="shrink-0 h-6 w-6 rounded-lg
                                                    bg-slate-100 dark:bg-white/[0.06]
                                                    flex items-center justify-center
                                                    text-[10px] font-bold tabular-nums
                                                    text-slate-500 dark:text-slate-400">
                                        #{index + 1}
                                    </div>
                                    <p className="text-[12px] font-bold leading-snug flex-1 min-w-0">
                                        {q.question_text}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                    {["a", "b", "c", "d"].map((char) => (
                                        <div key={char} className="flex items-start gap-1.5">
                                            <span
                                                className={`text-[10px] font-bold mt-0.5 shrink-0
                                                            ${q.correct_answer.toLowerCase() === char
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : "text-slate-300 dark:text-slate-600"
                                                    }`}
                                            >
                                                {char.toUpperCase()}
                                            </span>
                                            <span
                                                className={`text-[11px] leading-snug
                                                            ${q.correct_answer.toLowerCase() === char
                                                        ? "font-bold text-slate-900 dark:text-white"
                                                        : "text-slate-500 dark:text-slate-400"
                                                    }`}
                                            >
                                                {q[`option_${char}`]}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2
                                                pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                                         text-[10px] font-bold
                                                         bg-blue-50 dark:bg-blue-400/10
                                                         text-blue-700 dark:text-blue-400">
                                            <Award className="h-3 w-3" />
                                            {q.marks} mark{q.marks === 1 ? "" : "s"}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                                         text-[10px] font-bold
                                                         bg-emerald-50 dark:bg-emerald-400/10
                                                         text-emerald-700 dark:text-emerald-400">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Key: {q.correct_answer}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleEdit(q)}
                                            aria-label="Edit question"
                                            className="h-8 w-8 rounded-full flex items-center justify-center
                                                       text-amber-600 dark:text-amber-400
                                                       bg-amber-50 dark:bg-amber-400/10
                                                       active:scale-[0.9] transition-transform"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            <Edit3 className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(q.id)}
                                            aria-label="Delete question"
                                            className="h-8 w-8 rounded-full flex items-center justify-center
                                                       text-rose-600 dark:text-rose-400
                                                       bg-rose-50 dark:bg-rose-400/10
                                                       active:scale-[0.9] transition-transform"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </section>
                </div>
            </main>
        </div>
    );
};

export default TutorLiveMonitor;