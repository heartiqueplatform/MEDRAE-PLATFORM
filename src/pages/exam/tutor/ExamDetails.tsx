"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import React from "react";
import {
    ChevronLeft,
    FileText,
    Save,
    Info,
    PenTool,
    CheckCircle2,
    Sparkles,
} from "lucide-react";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" = "light") => {
    try { playSound("ui-tap"); } catch { /* no-op */ }
    if (type === "success") vibrate([15, 30, 15]);
    else vibrate(15);
};

const TutorExamDetails = () => {
    const { paper_id } = useParams();
    const navigate = useNavigate();

    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);

    const handleBack = useCallback(() => {
        tap();
        const confirmBack = window.confirm(
            "Warning: Going back will discard any progress and the tutor will have to start all over again. Are you sure you want to leave this page?"
        );
        if (!confirmBack) return;
        navigate("/tutor/exams");
    }, [navigate]);

    // Fetch existing instructions on mount
    useEffect(() => {
        if (!paper_id) return;

        const fetchInstruction = async () => {
            const { data, error } = await supabase
                .from("exam_instructions")
                .select("content")
                .eq("paper_id", paper_id)
                .single();

            if (error && error.code !== "PGRST116") {
                console.error(error);
                return;
            }

            if (data?.content) setContent(data.content);
        };

        fetchInstruction();
    }, [paper_id]);

    const handleSaveInstruction = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!paper_id) {
            alert("Invalid paper ID");
            return;
        }

        tap("success");
        setLoading(true);

        const { error } = await supabase
            .from("exam_instructions")
            .upsert(
                [
                    {
                        paper_id,
                        content,
                    },
                ],
                { onConflict: ["paper_id"] }
            );

        setLoading(false);

        if (error) {
            console.error(error);
            alert("Error saving instructions");
            return;
        }

        navigate(`/tutor/exams/${paper_id}/live`);
    };

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
                        Exam instructions
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        Step 2 · Configuration
                    </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                 text-[10px] font-bold uppercase tracking-wider
                                 bg-blue-50 dark:bg-blue-400/10
                                 text-blue-700 dark:text-blue-400 shrink-0">
                    <FileText className="h-3 w-3" />
                    Editor
                </span>
            </header>

            {/* ── SCROLLING BODY ──────────────────────────────── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <div className="w-full max-w-[880px] mx-auto px-4 py-3 pb-24 safe-bottom space-y-3">
                    {/* Editor card */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">
                        {/* Toolbar */}
                        <div className="px-4 py-3 border-b border-slate-200/70 dark:border-white/[0.06]
                                        flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <PenTool className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                <span className="text-[10px] font-bold uppercase tracking-wider
                                                 text-slate-500 dark:text-slate-400">
                                    Official instruction editor
                                </span>
                            </div>
                            <div className="flex gap-1.5">
                                <div className="h-2.5 w-2.5 rounded-full bg-rose-400/30" />
                                <div className="h-2.5 w-2.5 rounded-full bg-amber-400/30" />
                                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/30" />
                            </div>
                        </div>

                        <form onSubmit={handleSaveInstruction} className="p-4 space-y-3">
                            <div className="relative">
                                <textarea
                                    placeholder={`Example Header:

SCHOOL NAME: ____________________
SUBJECT: ____________________
CLASS: ____________________
DURATION: 2 Hours

INSTRUCTIONS TO CANDIDATES:
1. Do not open this booklet until told to do so.
2. Use only a blue or black pen...`}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    required
                                    rows={12}
                                    className="w-full p-3 rounded-xl text-sm leading-relaxed
                                               bg-slate-50 dark:bg-[#0d1117]
                                               border-0 outline-none font-serif resize-none
                                               text-slate-700 dark:text-slate-200
                                               placeholder:font-sans placeholder:text-slate-400
                                               dark:placeholder:text-slate-500
                                               focus:ring-2 focus:ring-blue-500/40
                                               transition-shadow"
                                />
                                <div className="absolute top-2 right-2 opacity-30">
                                    <Sparkles className="h-4 w-4 text-blue-400" />
                                </div>
                            </div>

                            {/* Tips */}
                            <div className="rounded-xl bg-blue-50 dark:bg-blue-400/10 p-3
                                            flex items-start gap-2">
                                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                                    <strong>Pro tip:</strong> clearly state the duration, materials
                                    allowed (e.g. calculators), and marking schemes. These
                                    instructions will be displayed as the first step for all candidates.
                                </p>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-10 rounded-xl bg-blue-600 text-white
                                           text-sm font-bold
                                           flex items-center justify-center gap-1.5
                                           active:scale-[0.97] transition-transform
                                           disabled:opacity-50 disabled:active:scale-100"
                                style={{ touchAction: "manipulation" }}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving…
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Save & continue configuration
                                        <CheckCircle2 className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    </section>

                    <p className="text-[9px] text-center uppercase tracking-wider font-bold
                                  text-slate-400 dark:text-slate-500 pt-2">
                        Secure examination framework · v4.0
                    </p>
                </div>
            </main>
        </div>
    );
};

export default TutorExamDetails;