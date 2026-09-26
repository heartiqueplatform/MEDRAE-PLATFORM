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

import { X, LockKeyhole, AlertCircle, ChevronLeft, ShieldAlert, KeyRound, ArrowLeft, Clock, Calendar, AlertTriangle } from "lucide-react";

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
    const [accessError, setAccessError] = useState<string | null>(null);
    const [accessErrorDetails, setAccessErrorDetails] = useState<string | null>(null);

    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
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

        setAccessError(null);
        setAccessErrorDetails(null);
        setSecondsLeft(null);
        setCanStart(false);

        const { data: paper, error } = await supabase
            .from("exam_papers")
            .select("id, title, course, block, duration, is_public, is_free, is_active, is_released, results_released, scheduled_start, scheduled_end, max_tab_switch, strict_mode, description, created_at")
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

        if (!paper.is_active) {
            setAccessError("Exam is currently inactive");
            setAccessErrorDetails("This exam has been deactivated by the tutor. Please contact your instructor for assistance.");
            setCanStart(false);
            return;
        }

        if (!paper.is_released) {
            setAccessError("Exam not yet released");
            setAccessErrorDetails("The tutor has not released this exam yet. Please check back later.");
            setCanStart(false);
            return;
        }

        const now = new Date();
        const nowUTC = now.getTime();

        const scheduledStart = paper.scheduled_start ? new Date(paper.scheduled_start) : null;
        const scheduledEnd = paper.scheduled_end ? new Date(paper.scheduled_end) : null;

        const startTime = scheduledStart ? scheduledStart.getTime() : null;
        const endTime = scheduledEnd ? scheduledEnd.getTime() : null;

        if (paper.scheduled_start && (startTime === null || isNaN(startTime))) {
            setAccessError("Invalid scheduled start date");
            setAccessErrorDetails("The exam has an invalid start date. Please contact your instructor.");
            setCanStart(false);
            return;
        }

        if (paper.scheduled_end && (endTime === null || isNaN(endTime))) {
            setAccessError("Invalid scheduled end date");
            setAccessErrorDetails("The exam has an invalid end date. Please contact your instructor.");
            setCanStart(false);
            return;
        }

        // CASE 1: Both start and end dates are set
        if (startTime !== null && endTime !== null) {
            if (nowUTC > endTime) {
                setAccessError("Exam window has closed");
                setAccessErrorDetails(`This exam ended on ${scheduledEnd!.toLocaleString()}. You can no longer access it.`);
                setCanStart(false);
                setSecondsLeft(0);
                return;
            }

            if (nowUTC < startTime) {
                const diffMs = startTime - nowUTC;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHours / 24);

                let timeMsg = "";
                if (diffDays > 0) {
                    timeMsg = `${diffDays} day${diffDays > 1 ? 's' : ''} from now`;
                } else if (diffHours > 0) {
                    timeMsg = `${diffHours} hour${diffHours > 1 ? 's' : ''} from now`;
                } else if (diffMins > 0) {
                    timeMsg = `${diffMins} minute${diffMins > 1 ? 's' : ''} from now`;
                } else {
                    timeMsg = "moments from now";
                }

                setAccessError("Exam hasn't started yet");
                setAccessErrorDetails(
                    `This exam is scheduled to start on ${scheduledStart!.toLocaleString()} (${timeMsg}).\n` +
                    `Current time: ${now.toLocaleString()}`
                );

                const diffSeconds = Math.floor((startTime - nowUTC) / 1000);
                setSecondsLeft(diffSeconds > 0 ? diffSeconds : 0);
                setCanStart(false);
                return;
            }

            setCanStart(true);
            setSecondsLeft(0);
        }
        // CASE 2: Only start date set
        else if (startTime !== null && endTime === null) {
            if (nowUTC < startTime) {
                const diffMs = startTime - nowUTC;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHours / 24);

                let timeMsg = "";
                if (diffDays > 0) {
                    timeMsg = `${diffDays} day${diffDays > 1 ? 's' : ''} from now`;
                } else if (diffHours > 0) {
                    timeMsg = `${diffHours} hour${diffHours > 1 ? 's' : ''} from now`;
                } else if (diffMins > 0) {
                    timeMsg = `${diffMins} minute${diffMins > 1 ? 's' : ''} from now`;
                } else {
                    timeMsg = "moments from now";
                }

                setAccessError("Exam hasn't started yet");
                setAccessErrorDetails(`This exam is scheduled to start on ${scheduledStart!.toLocaleString()} (${timeMsg}). Please wait until the scheduled time.`);

                const diffSeconds = Math.floor((startTime - nowUTC) / 1000);
                setSecondsLeft(diffSeconds > 0 ? diffSeconds : 0);
                setCanStart(false);
                return;
            }

            setCanStart(true);
            setSecondsLeft(0);
        }
        // CASE 3: No scheduled dates
        else {
            setCanStart(true);
            setSecondsLeft(0);
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
            .select("id, status, started_at")
            .eq("paper_id", paper.id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (sessionData) {
            setExistingSession(sessionData);

            if (sessionData.status === "completed" || sessionData.status === "submitted") {
                setSessionExpired(true);
                setCanStart(false);
                setAccessError("Exam already completed");
                setAccessErrorDetails("You have already submitted this exam. You cannot take it again.");
                return;
            }

            const startedAt = new Date(sessionData.started_at).getTime();
            const durationMs = paper.duration * 60 * 1000;
            const nowTime = Date.now();
            const expiryTime = startedAt + durationMs;
            const remainingSecs = Math.floor((expiryTime - nowTime) / 1000);

            if (remainingSecs <= 0) {
                setSecondsLeft(0);
                setCanStart(false);
                setSessionExpired(true);
                setAccessError("Session expired");
                setAccessErrorDetails(`Your ${paper.duration}-minute exam session has ended. You can no longer continue.`);
                toast({
                    title: "Session Expired",
                    description: "The time limit for your exam session has reached.",
                    variant: "destructive",
                });
            } else {
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
        <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-background font-sans">
            {/* ==================================================== */}
            {/* EXAM KEY OVERLAY                                     */}
            {/* ==================================================== */}
            {!keyVerified && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 md:p-4">
                    <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md" />

                    <Card className="relative w-full max-w-md border-0 shadow-none bg-white dark:bg-[#1c1e21] overflow-hidden rounded-2xl">
                        <button
                            onClick={() => navigate(-1)}
                            className="absolute top-3 right-3 p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
                            title="Go back"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <CardHeader className="pt-8 pb-4 text-center px-5">
                            <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <LockKeyhole className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                            </div>
                            <CardTitle className="text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Secure Access Required
                            </CardTitle>
                            <CardDescription className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                This examination is protected. Please enter the unique Access Key provided by your institution.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4 pb-6 px-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                                    Authorization Key
                                </label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                    <Input
                                        type="password"
                                        placeholder="e.g. EXAM-992-K82"
                                        className="pl-10 h-12 bg-slate-100/70 dark:bg-slate-900/50 border-0 focus-visible:ring-2 focus-visible:ring-blue-500 font-mono text-base tracking-widest uppercase rounded-xl"
                                        value={examKey}
                                        onChange={(e) => setExamKey(e.target.value)}
                                    />
                                </div>
                            </div>

                            {keyError && (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30">
                                    <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                                    <p className="text-xs font-medium text-red-600 dark:text-red-400">
                                        {keyError}
                                    </p>
                                </div>
                            )}

                            <Button
                                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all rounded-xl text-sm md:text-base border-0"
                                onClick={verifyKey}
                            >
                                Unlock Examination
                            </Button>
                        </CardContent>

                        <CardFooter className="bg-transparent border-0 p-4">
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

            {/* ==================================================== */}
            {/* MAIN INSTRUCTIONS                                    */}
            {/* ==================================================== */}
            {keyVerified && examInfo && (
                <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-background px-2 py-4 md:px-4 md:py-8">
                    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">

                        {/* ACCESS ERROR BANNER */}
                        {accessError && (
                            <Card className="border-0 shadow-none bg-rose-50 dark:bg-rose-950/20 rounded-2xl">
                                <CardContent className="p-4 md:p-5">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-rose-100 dark:bg-rose-900/40 p-2 rounded-xl shrink-0">
                                            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-rose-700 dark:text-rose-400 text-sm md:text-base">
                                                {accessError}
                                            </h4>
                                            <p className="text-xs md:text-sm text-rose-600 dark:text-rose-300 mt-1 whitespace-pre-wrap">
                                                {accessErrorDetails}
                                            </p>

                                            {examInfo.scheduled_start && examInfo.scheduled_end && (
                                                <div className="mt-3 p-3 bg-white/60 dark:bg-black/20 rounded-xl space-y-1.5">
                                                    <div className="flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                                                        <Calendar className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                                        <span className="font-semibold">Window (UTC):</span>
                                                        <span className="break-all">
                                                            {new Date(examInfo.scheduled_start).toUTCString()} → {new Date(examInfo.scheduled_end).toUTCString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                                                        <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                                        <span className="font-semibold">Now (UTC):</span>
                                                        <span>{new Date().toUTCString()}</span>
                                                    </div>
                                                    <div className="flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                                                        <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                                        <span className="font-semibold">Your Local:</span>
                                                        <span>{new Date().toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* EXAM INFO CARD */}
                        <Card className="border-0 shadow-none bg-white dark:bg-muted/30 rounded-2xl">
                            <CardHeader className="px-5 pt-5 pb-3">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium mb-3 text-xs md:text-sm w-fit"
                                >
                                    <ChevronLeft size={16} /> Back
                                </button>
                                <CardTitle className="text-center text-xl md:text-3xl font-extrabold bg-gradient-to-r from-green-500 via-teal-400 to-blue-500 bg-clip-text text-transparent tracking-tight">
                                    {examInfo.title}
                                </CardTitle>
                                <CardDescription className="text-center text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    {examInfo.course || "-"} | {examInfo.block || "-"}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="px-4 md:px-5 pb-5 space-y-4 md:space-y-5 text-sm">
                                {/* DESCRIPTION */}
                                <div className="bg-slate-100/70 dark:bg-slate-900/50 p-3 md:p-4 rounded-xl">
                                    <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                        Exam Description
                                    </h4>
                                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                        {examInfo.description || "No description provided."}
                                    </p>
                                </div>

                                {/* METADATA */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                                    <div className="flex justify-between items-center pb-1">
                                        <span className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400">
                                            Duration:
                                        </span>
                                        <span className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">
                                            {examInfo.duration} mins
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pb-1">
                                        <span className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400">
                                            Public Exam:
                                        </span>
                                        <span className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">
                                            {examInfo.is_public ? "Yes" : "No"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pb-1">
                                        <span className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400">
                                            Free Exam:
                                        </span>
                                        <span className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">
                                            {examInfo.is_free ? "Yes" : "No"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pb-1">
                                        <span className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400">
                                            Active:
                                        </span>
                                        <span className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">
                                            {examInfo.is_active ? "Yes" : "No"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pb-1">
                                        <span className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400">
                                            Released:
                                        </span>
                                        <span className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">
                                            {examInfo.is_released ? "Yes" : "No"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pb-1">
                                        <span className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400">
                                            Results:
                                        </span>
                                        <span className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">
                                            {examInfo.results_released ? "Released" : "Pending"}
                                        </span>
                                    </div>

                                    {/* Scheduled window */}
                                    <div className="sm:col-span-2 pt-2">
                                        <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                            Scheduled Window
                                        </p>
                                        <div className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 p-3 rounded-xl text-xs md:text-sm">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                <span className="font-semibold">Start:</span>
                                                <span>{examInfo.scheduled_start ? new Date(examInfo.scheduled_start).toLocaleString() : "-"}</span>
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                                                <span className="font-semibold">End:</span>
                                                <span>{examInfo.scheduled_end ? new Date(examInfo.scheduled_end).toLocaleString() : "-"}</span>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed">
                                            UTC: {examInfo.scheduled_start ? new Date(examInfo.scheduled_start).toUTCString() : "-"} → {examInfo.scheduled_end ? new Date(examInfo.scheduled_end).toUTCString() : "-"}
                                        </p>
                                    </div>

                                    {/* Two small metric cards */}
                                    <div className="sm:col-span-2 grid grid-cols-2 gap-3 mt-2">
                                        <div className="p-3 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl">
                                            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5">
                                                Max Tab Switches
                                            </p>
                                            <p className="text-lg font-black text-slate-900 dark:text-white">
                                                {examInfo.max_tab_switch}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl">
                                            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5">
                                                Strict Mode
                                            </p>
                                            <p className="text-lg font-black text-slate-900 dark:text-white">
                                                {examInfo.strict_mode ? "ON" : "OFF"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Countdown */}
                                    {secondsLeft !== null && secondsLeft > 0 && !accessError && (
                                        <div className="col-span-full mt-3 p-4 bg-orange-50 dark:bg-orange-950/30 rounded-xl text-center font-bold text-orange-600 dark:text-orange-400 animate-pulse text-sm md:text-base">
                                            Exam starts in: {formatCountdown(secondsLeft)}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* INSTRUCTIONS CARD */}
                        <Card className="border-0 shadow-none bg-white dark:bg-muted/30 rounded-2xl">
                            <CardHeader className="px-5 pt-5 pb-3">
                                <CardTitle className="text-center text-base md:text-lg font-bold text-slate-900 dark:text-white">
                                    Exam Instructions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 md:px-5 pb-5 space-y-3 text-sm leading-relaxed">
                                {instructions.split("\n").map((line, idx) => (
                                    <div key={idx} className="flex items-start gap-2.5">
                                        <AlertCircle className="h-4 w-4 md:h-5 md:w-5 mt-0.5 text-amber-500 shrink-0" />
                                        <span className="text-xs md:text-sm text-slate-700 dark:text-slate-300">
                                            {line}
                                        </span>
                                    </div>
                                ))}

                                <Button
                                    className={`w-full mt-4 text-white font-bold h-12 md:h-14 rounded-xl transition-all text-sm md:text-base border-0 ${sessionExpired || accessError
                                        ? "bg-slate-400 dark:bg-slate-600 cursor-not-allowed"
                                        : canStart
                                            ? "bg-green-600 hover:bg-green-700"
                                            : "bg-blue-600 hover:bg-blue-700"
                                        }`}
                                    onClick={handleStartExam}
                                    disabled={!canStart || sessionExpired || !!accessError}
                                >
                                    {accessError ? (
                                        <span className="flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" /> Access Denied
                                        </span>
                                    ) : sessionExpired ? (
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
                </div>
            )}
        </div>
    );
}