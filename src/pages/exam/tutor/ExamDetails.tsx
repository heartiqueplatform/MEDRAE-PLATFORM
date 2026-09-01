"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import React from 'react';
import {
    ChevronLeft,
    FileText,
    Save,
    Info,
    PenTool,
    CheckCircle2,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TutorExamDetails = () => {
    const { paper_id } = useParams();
    const navigate = useNavigate();

    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);

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

        setLoading(true);

        const { error } = await supabase
            .from("exam_instructions")
            .upsert([
                {
                    paper_id,
                    content,
                },
            ], { onConflict: ["paper_id"] });

        setLoading(false);

        if (error) {
            console.error(error);
            alert("Error saving instructions");
            return;
        }

        navigate(`/tutor/exams/${paper_id}/live`);
    };

    const handleBack = () => {
        const confirmBack = window.confirm(
            "Warning: Going back will discard any progress and the tutor will have to start all over again. Are you sure you want to leave this page?"
        );
        if (!confirmBack) return;
        navigate("/tutor/exams");
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background p-0 m-0 w-full font-['Inter',system-ui,-apple-system,sans-serif] transition-colors duration-300">

            {/* Main Content - Edge to Edge on Phone */}
            <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 py-4 sm:py-8">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* HEADER & NAVIGATION */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                            <button
                                onClick={handleBack}
                                className="group flex items-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-bold hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                                Back to Exam List
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-600 p-2 sm:p-2.5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
                                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Add Exam <span className="text-indigo-600 dark:text-indigo-400">Instructions</span>
                                </h1>
                            </div>
                        </div>

                        <Badge variant="outline" className="w-fit h-fit px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border-slate-200 dark:border-slate-800 bg-white dark:bg-muted/30 text-slate-500 font-bold uppercase tracking-widest text-[8px] sm:text-[10px]">
                            Step 2: Configuration
                        </Badge>
                    </div>

                    {/* EDITOR CONTAINER */}
                    <div className="relative">
                        <div className="relative bg-white/80 dark:bg-background border-0 rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl overflow-hidden">

                            {/* Toolbar Area */}
                            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/50">
                                <div className="flex items-center gap-2">
                                    <PenTool className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                                    <span className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Official Instruction Editor</span>
                                </div>
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-400/20" />
                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400/20" />
                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400/20" />
                                </div>
                            </div>

                            <form onSubmit={handleSaveInstruction} className="p-4 sm:p-6 md:p-10 space-y-5 sm:space-y-6">

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
                                        className="w-full p-4 sm:p-6 md:p-8 rounded-lg sm:rounded-xl bg-white dark:bg-background border-0 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-200 text-base sm:text-lg leading-relaxed font-serif placeholder:font-sans placeholder:text-slate-400 resize-none transition-all shadow-none sm:shadow-inner"
                                    />

                                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 opacity-30 group-hover:opacity-100 transition-opacity">
                                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                                    </div>
                                </div>

                                {/* Tips Section */}
                                <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl sm:rounded-2xl border-0">
                                    <Info className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 mt-0.5" />
                                    <p className="text-[10px] sm:text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed font-medium">
                                        <strong>Pro-Tip:</strong> Clearly state the duration, materials allowed (e.g., calculators), and marking schemes. These instructions will be displayed as the first step for all candidates.
                                    </p>
                                </div>

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 sm:h-14 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest shadow-lg sm:shadow-xl shadow-indigo-200/50 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-50 group"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span className="text-[10px] sm:text-xs">Saving Document...</span>
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <span className="text-[10px] sm:text-xs">Save & Continue Configuration</span>
                                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
                                        </span>
                                    )}
                                </Button>
                            </form>
                        </div>
                    </div>

                    {/* FOOTER DETAIL */}
                    <p className="text-center text-[8px] sm:text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em]">
                        Secure Examination Framework v4.0
                    </p>
                </div>
            </div>
        </div>
    );
}

export default TutorExamDetails;