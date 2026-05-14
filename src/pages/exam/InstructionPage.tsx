"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { GlobalLoader } from "@/components/GlobalLoader";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

import React from 'react';

import { X, LockKeyhole, AlertCircle, ChevronLeft, Badge, ShieldAlert, KeyRound, ArrowLeft } from "lucide-react";

export default function ExamInstructions() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [sessionExpired, setSessionExpired] = useState(false);
    const [examKey, setExamKey] = useState("");
    const [paperId, setPaperId] = useState<string | null>(null);
    const [instructions, setInstructions] = useState<string>("");
    const [examInfo, setExamInfo] = useState<any>(null);
    const [loadingPage, setLoadingPage] = useState(true);
    const [keyError, setKeyError] = useState<string | null>(null);
    const [keyVerified, setKeyVerified] = useState(false);

    const [secondsLeft, setSecondsLeft] = useState<number | null>(10);
    const [canStart, setCanStart] = useState(false);
    const [existingSession, setExistingSession] = useState<any>(null);

    useEffect(() => {
        const timer = setTimeout(() => setLoadingPage(false), 300);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (secondsLeft === null || secondsLeft <= 0) {
            setCanStart(true);
            return;
        }
        const timer = setInterval(() => {
            setSecondsLeft((prev) => (prev && prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [secondsLeft]);

    const verifyKey = async () => {
        if (!examKey) return;

        const { data: paper, error } = await supabase
            .from("exam_papers")
            .select("*")
            .eq("exam_key", examKey)
            .single();

        if (error || !paper) {
            setKeyError("Invalid exam key. Please check with your school.");
            return;
        }

        setPaperId(paper.id);
        setExamInfo(paper);
        setKeyVerified(true);
        setKeyError(null);

        if (paper.scheduled_start) {
            const startTime = new Date(paper.scheduled_start).getTime();
            const now = Date.now();
            const diff = Math.floor((startTime - now) / 1000);
            setSecondsLeft(diff > 0 ? diff : 0);
            if (diff <= 0) setCanStart(true);
        }

        const { data: instr, error: instrError } = await supabase
            .from("exam_instructions")
            .select("content")
            .eq("paper_id", paper.id)
            .single();

        setInstructions(instrError || !instr ? "No instructions found for this exam." : instr.content);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!user || userError) return;

        const { data: sessionData } = await supabase
            .from("exam_sessions")
            .select("*")
            .eq("paper_id", paper.id)
            .eq("user_id", user.id)
            .single();

        // ... after fetching sessionData ...
        if (sessionData) {
            setExistingSession(sessionData);

            // 1. Check if the session was already manually finished
            if (sessionData.status === "completed" || sessionData.status === "submitted") {
                setSessionExpired(true);
                setCanStart(false);
                return;
            }

            // 2. Calculate time remaining
            const startedAt = new Date(sessionData.started_at).getTime();
            const durationMs = paper.duration * 60 * 1000;
            const now = Date.now();
            const expiryTime = startedAt + durationMs;
            const remainingSecs = Math.floor((expiryTime - now) / 1000);

            if (remainingSecs <= 0) {
                // SESSION EXPIRED
                setSecondsLeft(0);
                setCanStart(false);
                setSessionExpired(true);
                toast({
                    title: "Session Expired",
                    description: "The time limit for your exam session has reached.",
                    variant: "destructive",
                });
            } else {
                // SESSION ALIVE
                setSecondsLeft(remainingSecs);
                setCanStart(true);
                setSessionExpired(false);
                toast({
                    title: "Exam in Progress",
                    description: `You have ${Math.floor(remainingSecs / 60)} minutes remaining.`,
                });
            }
        }
    };

    const startSession = async () => {
        if (!paperId) return null;

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!user || userError) {
            console.error("User not logged in:", userError);
            return null;
        }

        if (existingSession) return existingSession;

        const { data, error } = await supabase
            .from("exam_sessions")
            .insert([{
                paper_id: paperId,
                user_id: user.id,
                started_at: new Date().toISOString(),
                status: "started",
            }])
            .select()
            .single();

        if (error) {
            console.error("Error starting session:", error);
            return null;
        }

        toast({
            title: "Exam Started",
            description: "Your exam session has begun. Good luck!",
        });

        setExistingSession(data);
        return data;
    };

    const handleStartExam = async () => {
        if (!canStart || !paperId) return;
        const session = await startSession();
        if (session) {
            navigate(`/exam/access/${paperId}?session_id=${session.id}`);
        }
    };

    const formatCountdown = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    if (loadingPage) return <GlobalLoader message="Setting up exam page..." />;

    return (
        <div className="min-h-screen bg-transparen pt-0 t p-6 flex justify-center items-start">
            <div className="w-full max-w-3xl space-y-2 relative">

                {/* Exam Key Overlay */}
                {!keyVerified && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Modern Backdrop: Dark Slate with a heavy blur for focus */}
                        <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md" />

                        <Card className="relative w-full max-w-md border-0 shadow-2xl bg-white dark:bg-[#1c1e21] overflow-hidden">
                            {/* Top decorative security bar */}
                            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700" />

                            <button
                                onClick={() => navigate(-1)}
                                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Go back"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            <CardHeader className="pt-8 pb-4 text-center">
                                <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                    <LockKeyhole className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                                </div>
                                <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                    Secure Access Required
                                </CardTitle>
                                <CardDescription className="text-slate-500 dark:text-slate-400">
                                    This examination is protected. Please enter the unique Access Key provided by your institution.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4 pb-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                                        Authorization Key
                                    </label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                        <Input
                                            type="password"
                                            placeholder="e.g. EXAM-992-K82"
                                            className="pl-10 h-12 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-slate-400 font-mono text-lg tracking-widest uppercase"
                                            value={examKey}
                                            onChange={(e) => setExamKey(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {keyError && (
                                    <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
                                        <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
                                        <p className="text-xs font-medium text-red-600 dark:text-red-400">
                                            {keyError}
                                        </p>
                                    </div>
                                )}

                                <Button
                                    className="w-full h-12 bg-white dark:bg-slate-900 text-black dark:text-white hover:bg-slate-200 dark:hover:bg-gray-800 font-bold transition-all shadow-lg"
                                    onClick={verifyKey}
                                >
                                    Unlock Examination
                                </Button>
                            </CardContent>

                            <CardFooter className="bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 p-4">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors mx-auto"
                                >
                                    <ArrowLeft className="h-3 w-3" />
                                    Cancel and return to dashboard
                                </button>
                            </CardFooter>
                        </Card>
                    </div>
                )}

                {/* Main Exam Instructions */}
                {keyVerified && examInfo && (
                    <div className="space-y-2">

                        <Card className="border-0 shadow-md ">
                            <CardHeader>
                                {/* Back button */}
                                <button
                                    onClick={() => navigate(-1)}
                                    className="flex items-center gap-1 text-blue-500 hover:text-blue-600 font-medium mb-4"
                                >
                                    <ChevronLeft size={20} /> Back
                                </button>
                                <CardTitle className="text-center text-3xl font-bold bg-gradient-to-r from-green-500 via-teal-400 to-blue-500 bg-clip-text text-transparent">
                                    {examInfo.title}
                                </CardTitle>
                                <CardDescription className="text-center text-sm text-muted-foreground">
                                    {examInfo.course || "-"} | {examInfo.block || "-"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 text-sm text-gray-700">
                                {/* 1. DESCRIPTION SECTION (Full Width) */}
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Exam Description</h4>
                                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                        {examInfo.description || "No description provided."}
                                    </p>
                                </div>

                                {/* 2. METADATA GRID (2 Columns) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                        <span className="font-semibold text-slate-500">Duration:</span>
                                        <span className="font-bold text-slate-900 dark:text-slate-100">{examInfo.duration} mins</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                        <span className="font-semibold text-slate-500">Public Exam:</span>
                                        <Badge variant="outline" className="text-[10px]">{examInfo.is_public ? "Yes" : "No"}</Badge>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                        <span className="font-semibold text-slate-500">Free Exam:</span>
                                        <span>{examInfo.is_free ? "Yes" : "No"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                        <span className="font-semibold text-slate-500">Active:</span>
                                        <span>{examInfo.is_active ? "Yes" : "No"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                        <span className="font-semibold text-slate-500">Released:</span>
                                        <span>{examInfo.is_released ? "Yes" : "No"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                        <span className="font-semibold text-slate-500">Results:</span>
                                        <span>{examInfo.results_released ? "Released" : "Pending"}</span>
                                    </div>

                                    {/* Full width items inside the grid */}
                                    <div className="sm:col-span-2 flex flex-col gap-1 pt-2">
                                        <span className="font-semibold text-slate-500 text-xs uppercase tracking-tighter">Scheduled Window:</span>
                                        <span className="text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 p-2 rounded-lg">
                                            {examInfo.scheduled_start ? new Date(examInfo.scheduled_start).toLocaleString() : "-"}
                                            <span className="mx-2">→</span>
                                            {examInfo.scheduled_end ? new Date(examInfo.scheduled_end).toLocaleString() : "-"}
                                        </span>
                                    </div>

                                    <div className="sm:col-span-2 grid grid-cols-2 gap-4 mt-2">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                            <p className="text-[10px] uppercase font-bold text-slate-400">Max Tab Switches</p>
                                            <p className="text-lg font-black">{examInfo.max_tab_switch}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                            <p className="text-[10px] uppercase font-bold text-slate-400">Strict Mode</p>
                                            <p className="text-lg font-black">{examInfo.strict_mode ? "ON" : "OFF"}</p>
                                        </div>
                                    </div>

                                    {secondsLeft !== null && secondsLeft > 0 && (
                                        <div className="col-span-full mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-center font-bold text-orange-600 animate-pulse">
                                            Exam starts in: {formatCountdown(secondsLeft)}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Instructions */}
                        <Card className="border-0">
                            <CardHeader>
                                <CardTitle className="text-center text-lg">Exam Instructions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-gray-900 dark:text-gray-50 leading-relaxed">                             {instructions.split("\n").map((line, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 mt-1 text-yellow-500" />
                                    <span>{line}</span>
                                </div>
                            ))}
                                <Button
                                    className={`w-full mt-4 text-white font-bold h-12 rounded-xl transition-all ${sessionExpired
                                        ? "bg-slate-500 cursor-not-allowed"
                                        : (canStart ? "bg-green-600 hover:bg-green-700 shadow-lg" : "bg-blue-600")
                                        }`}
                                    onClick={handleStartExam}
                                    disabled={!canStart || sessionExpired}
                                >
                                    {sessionExpired ? (
                                        <span className="flex items-center gap-2">
                                            <X className="w-4 h-4" /> Session Expired / Already Submitted
                                        </span>
                                    ) : existingSession ? (
                                        "Continue Exam Session"
                                    ) : canStart ? (
                                        "Begin Examination Now"
                                    ) : (
                                        `Starts in ${formatCountdown(secondsLeft || 0)}`
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}