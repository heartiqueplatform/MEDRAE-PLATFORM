"use client";

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";
import { Label } from "@/components/ui/label";
import {
    Info,
    ShieldCheck,
    User,
    School,
    BookOpen,
    Hash,
    GraduationCap,
    ChevronLeft,
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

const tap = () => {
    try { playSound("ui-tap"); } catch { /* no-op */ }
    vibrate(15);
};

export default function CandidateInfo() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<any>({
        name: "",
        email: "",
        institution: "",
        course: "",
        block: "",
        nck_number: "",
    });
    const handleBack = useCallback(() => {
        tap();
        navigate("/dashboard/student");
    }, [navigate]);

    // Load cached data or fetch from Supabase
    useEffect(() => {
        const localKey = "candidateInfo";
        const cached = localStorage.getItem(localKey);

        if (cached) {
            setUserData(JSON.parse(cached));
            setLoading(false);
        }

        const fetchUserData = async () => {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.error("No auth user found");
                return;
            }

            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (error) {
                console.error("Error fetching user:", error.message);
            } else {
                setUserData(data);
                localStorage.setItem(localKey, JSON.stringify(data));
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const handleProceed = async () => {
        tap();
        localStorage.setItem("candidateInfo", JSON.stringify(userData));

        let paperId = "no-paper";
        try {
            const { data, error } = await supabase
                .from("exam_papers")
                .select("id")
                .limit(1)
                .single();

            if (data && data.id) {
                paperId = data.id;
            }
        } catch (err) {
            console.error("Error fetching paper:", err);
        }

        navigate(`/exam/instructions/${paperId}`);
    };

    /* ─── LOADING SHELL ───────────────────────────────────────── */
    if (loading) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
                <header className="shrink-0 flex items-center gap-2 px-2 h-14
                                   bg-white dark:bg-[#0d1117]
                                   border-b border-slate-200/70 dark:border-white/[0.06]
                                   safe-top">
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="h-4 w-40 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                        <div className="h-3 w-28 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                    </div>
                </header>
                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-3 pb-24 safe-bottom">
                    <div className="w-full max-w-[880px] mx-auto space-y-3">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 animate-pulse space-y-3">
                            <div className="h-4 w-40 bg-slate-200 dark:bg-white/[0.1] rounded" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="h-3 w-full bg-slate-200 dark:bg-white/[0.1] rounded" />
                                ))}
                            </div>
                        </div>
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 animate-pulse space-y-3">
                            <div className="h-4 w-40 bg-slate-200 dark:bg-white/[0.1] rounded" />
                            <div className="h-10 w-full bg-slate-200 dark:bg-white/[0.1] rounded-xl" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-10 w-full bg-slate-200 dark:bg-white/[0.1] rounded-xl" />
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    /* ─── REAL PAGE ───────────────────────────────────────────── */
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
                    <h1 className="text-base font-bold leading-tight truncate text-slate-900 dark:text-white">
                        Exam gateway
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        Identity verification
                    </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                 bg-blue-50 dark:bg-blue-400/10
                                 text-blue-700 dark:text-blue-400
                                 text-[10px] font-bold uppercase tracking-wider shrink-0">
                    <ShieldCheck className="h-3 w-3" />
                    Official
                </span>
            </header>

            {/* ── SCROLLING BODY ──────────────────────────────── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <div className="w-full max-w-[880px] mx-auto px-4 py-3 pb-24 safe-bottom space-y-3">

                    {/* Instructions card */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg
                                            bg-blue-50 dark:bg-blue-400/10
                                            flex items-center justify-center shrink-0">
                                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-blue-600 dark:text-blue-400 leading-none mb-1">
                                    Before you start
                                </p>
                                <h2 className="text-sm font-bold leading-tight">
                                    Critical examination instructions
                                </h2>
                            </div>
                        </div>

                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                            {[
                                {
                                    title: "Identity verification",
                                    body: "Ensure your full name and email match your official government or school ID.",
                                },
                                {
                                    title: "Academic records",
                                    body: "Verify that your institution, course, and block/class are accurate for proper credit.",
                                },
                                {
                                    title: "Exam number",
                                    body: "Cross-check your NCK/exam number with your institution's official records.",
                                },
                                {
                                    title: "Mandatory authorization",
                                    body: "A valid exam key from your tutor is required to unlock this session.",
                                },
                                {
                                    title: "Official tracking",
                                    body: "All activity is logged and recorded for official institutional exam tracking.",
                                },
                                {
                                    title: "Session scope",
                                    body: "This portal is for formal exams only. Do not use for practice or self-study.",
                                },
                                {
                                    title: "Data integrity",
                                    body: "Any changes made here are permanent and will be reflected in your final certificate.",
                                },
                                {
                                    title: "Proctoring ready",
                                    body: "Ensure you have a stable connection; session interruptions are flagged automatically.",
                                },
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                    <span className="mt-1.5 h-1 w-1 rounded-full
                                                     bg-blue-500 dark:bg-blue-400 shrink-0" />
                                    <span className="text-[11px] text-slate-600 dark:text-slate-300
                                                     leading-relaxed">
                                        <strong className="text-slate-900 dark:text-white">
                                            {item.title}:
                                        </strong>{" "}
                                        {item.body}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* Identity form */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-sm font-bold leading-tight">
                                Identity verification
                            </h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                                Please ensure all fields accurately reflect your institutional registration.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Full Name */}
                            <div className="space-y-1.5 md:col-span-2">
                                <Label
                                    htmlFor="name"
                                    className="text-[10px] font-bold uppercase tracking-wider
                                               text-slate-500 dark:text-slate-400"
                                >
                                    Full candidate name
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2
                                                     h-4 w-4 text-slate-400 dark:text-slate-500" />
                                    <Input
                                        id="name"
                                        className="pl-9 h-10 rounded-xl text-sm border-0
                                                   bg-slate-50 dark:bg-[#0d1117]
                                                   focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                        value={userData.name || ""}
                                        placeholder="Enter your full official name"
                                        onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Institution */}
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="institution"
                                    className="text-[10px] font-bold uppercase tracking-wider
                                               text-slate-500 dark:text-slate-400"
                                >
                                    Institution
                                </Label>
                                <div className="relative">
                                    <School className="absolute left-3 top-1/2 -translate-y-1/2
                                                       h-4 w-4 text-slate-400 dark:text-slate-500" />
                                    <Input
                                        id="institution"
                                        className="pl-9 h-10 rounded-xl text-sm border-0
                                                   bg-slate-50 dark:bg-[#0d1117]
                                                   focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                        value={userData.institution || ""}
                                        placeholder="University / College"
                                        onChange={(e) => setUserData({ ...userData, institution: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Exam Number */}
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="exam_number"
                                    className="text-[10px] font-bold uppercase tracking-wider
                                               text-slate-500 dark:text-slate-400"
                                >
                                    Exam number (NCK)
                                </Label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2
                                                     h-4 w-4 text-slate-400 dark:text-slate-500" />
                                    <Input
                                        id="exam_number"
                                        className="pl-9 h-10 rounded-xl text-sm border-0
                                                   bg-slate-50 dark:bg-[#0d1117]
                                                   focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                        value={userData.nck_number || ""}
                                        placeholder="Official index no."
                                        onChange={(e) => setUserData({ ...userData, nck_number: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Course */}
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="course"
                                    className="text-[10px] font-bold uppercase tracking-wider
                                               text-slate-500 dark:text-slate-400"
                                >
                                    Course of study
                                </Label>
                                <div className="relative">
                                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2
                                                         h-4 w-4 text-slate-400 dark:text-slate-500" />
                                    <Input
                                        id="course"
                                        className="pl-9 h-10 rounded-xl text-sm border-0
                                                   bg-slate-50 dark:bg-[#0d1117]
                                                   focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                        value={userData.course || ""}
                                        placeholder="Major / Program"
                                        onChange={(e) => setUserData({ ...userData, course: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Block / Class */}
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="class"
                                    className="text-[10px] font-bold uppercase tracking-wider
                                               text-slate-500 dark:text-slate-400"
                                >
                                    Block / Class
                                </Label>
                                <div className="relative">
                                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2
                                                              h-4 w-4 text-slate-400 dark:text-slate-500" />
                                    <Input
                                        id="class"
                                        className="pl-9 h-10 rounded-xl text-sm border-0
                                                   bg-slate-50 dark:bg-[#0d1117]
                                                   focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                        value={userData.block_class || userData.block || ""}
                                        placeholder="e.g. Year 3 · Group B"
                                        onChange={(e) => setUserData({ ...userData, block_class: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleProceed}
                            className="w-full h-10 rounded-xl bg-blue-600 text-white
                                       text-sm font-bold
                                       flex items-center justify-center gap-1.5
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <ShieldCheck className="h-4 w-4" />
                            Verify details & continue
                        </button>

                        <p className="text-[9px] text-center uppercase tracking-[0.15em] font-semibold
                                      text-slate-400 dark:text-slate-500 leading-relaxed">
                            Authorized access only · Security logged system
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}