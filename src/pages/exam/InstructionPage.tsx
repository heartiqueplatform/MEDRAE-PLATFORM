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

import { X, LockKeyhole, AlertCircle, ChevronLeft, Badge, ShieldAlert, KeyRound, ArrowLeft, Clock, Calendar, AlertTriangle } from "lucide-react";

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

        // Check if exam is active
        if (!paper.is_active) {
            setAccessError("Exam is currently inactive");
            setAccessErrorDetails("This exam has been deactivated by the tutor. Please contact your instructor for assistance.");
            setCanStart(false);
            return;
        }

        // Check if exam is released
        if (!paper.is_released) {
            setAccessError("Exam not yet released");
            setAccessErrorDetails("The tutor has not released this exam yet. Please check back later.");
            setCanStart(false);
            return;
        }

        // CRITICAL FIX: Get current time as UTC milliseconds for proper comparison
        const now = new Date();
        const nowUTC = now.getTime(); // This is milliseconds since epoch (always UTC)

        // Parse dates - the database stores them as UTC strings
        const scheduledStart = paper.scheduled_start ? new Date(paper.scheduled_start) : null;
        const scheduledEnd = paper.scheduled_end ? new Date(paper.scheduled_end) : null;

        // Get timestamps in milliseconds (UTC)
        const startTime = scheduledStart ? scheduledStart.getTime() : null;
        const endTime = scheduledEnd ? scheduledEnd.getTime() : null;

        // For debugging
        console.log("===== TIME DEBUGGING =====");
        console.log("Current time (local):", now.toLocaleString());
        console.log("Current time (UTC):", now.toUTCString());
        console.log("Current time (ms):", nowUTC);
        console.log("Scheduled Start (UTC):", scheduledStart?.toUTCString());
        console.log("Scheduled Start (ms):", startTime);
        console.log("Scheduled End (UTC):", scheduledEnd?.toUTCString());
        console.log("Scheduled End (ms):", endTime);
        console.log("Is now >= start?", startTime ? nowUTC >= startTime : false);
        console.log("Is now <= end?", endTime ? nowUTC <= endTime : false);
        console.log("==========================");

        // Validate dates
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
            // Check if exam has ended
            if (nowUTC > endTime) {
                setAccessError("Exam window has closed");
                setAccessErrorDetails(`This exam ended on ${scheduledEnd!.toLocaleString()}. You can no longer access it.`);
                setCanStart(false);
                setSecondsLeft(0);
                return;
            }

            // Check if exam hasn't started yet
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

            // Exam is within the window - allow access
            console.log("✅ Exam is within the window - allowing access");
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

            // Start date has passed - allow access
            console.log("✅ Start date has passed - allowing access");
            setCanStart(true);
            setSecondsLeft(0);
        }
        // CASE 3: No scheduled dates - allow immediate access
        else {
            console.log("✅ No scheduled dates - allowing immediate access");
            setCanStart(true);
            setSecondsLeft(0);
        }

        // Fetch instructions
        const { data: instr, error: instrError } = await supabase
            .from("exam_instructions")
            .select("content")
            .eq("paper_id", paper.id)
            .single();

        setInstructions(instrError || !instr ? "No instructions found for this exam." : instr.content);

        // Check existing session
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
        <div className="min-h-screen bg-transparent pt-0 p-0 md:p-6 flex justify-center items-start">
            <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-0 md:space-y-4 relative px-0 md:px-0">

                {/* Exam Key Overlay - z-index z-[9999] */}
                {!keyVerified && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 md:p-4">
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md" />

                        <Card className="relative w-full max-w-md border-0 shadow-2xl bg-white dark:bg-[#1c1e21] overflow-hidden rounded-2xl md:rounded-3xl">
                            {/* Top decorative security bar */}
                            <div className="h-1 w-full md:h-1.5 bg-slate-200 dark:bg-slate-700" />

                            <button
                                onClick={() => navigate(-1)}
                                className="absolute top-3 right-3 md:top-4 md:right-4 p-1.5 md:p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Go back"
                            >
                                <X className="h-4 w-4 md:h-5 md:w-5" />
                            </button>

                            <CardHeader className="pt-6 md:pt-8 pb-3 md:pb-4 text-center px-4 md:px-6">
                                <div className="mx-auto w-10 h-10 md:w-12 md:h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3 md:mb-4">
                                    <LockKeyhole className="h-5 w-5 md:h-6 md:w-6 text-slate-600 dark:text-slate-300" />
                                </div>
                                <CardTitle className="text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                    Secure Access Required
                                </CardTitle>
                                <CardDescription className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                                    This examination is protected. Please enter the unique Access Key provided by your institution.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-3 md:space-y-4 pb-6 md:pb-8 px-4 md:px-6">
                                <div className="space-y-1.5 md:space-y-2">
                                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                                        Authorization Key
                                    </label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-2.5 md:top-3 h-4 w-4 md:h-5 md:w-5 text-slate-400" />
                                        <Input
                                            type="password"
                                            placeholder="e.g. EXAM-992-K82"
                                            className="pl-9 md:pl-10 h-10 md:h-12 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-slate-400 font-mono text-sm md:text-lg tracking-widest uppercase rounded-lg md:rounded-xl"
                                            value={examKey}
                                            onChange={(e) => setExamKey(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {keyError && (
                                    <div className="flex items-center gap-2 p-2.5 md:p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
                                        <ShieldAlert className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-600 dark:text-red-400" />
                                        <p className="text-[10px] md:text-xs font-medium text-red-600 dark:text-red-400">
                                            {keyError}
                                        </p>
                                    </div>
                                )}

                                <Button
                                    className="w-full h-10 md:h-12 bg-white dark:bg-muted/30 text-black dark:text-white hover:bg-slate-200 dark:hover:bg-gray-800 font-bold transition-all shadow-lg rounded-lg md:rounded-xl text-sm md:text-base"
                                    onClick={verifyKey}
                                >
                                    Unlock Examination
                                </Button>
                            </CardContent>

                            <CardFooter className="bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 p-3 md:p-4">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors mx-auto"
                                >
                                    <ArrowLeft className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                    Cancel and return to dashboard
                                </button>
                            </CardFooter>
                        </Card>
                    </div>
                )}

                {/* Main Exam Instructions - Mobile Native */}
                {keyVerified && examInfo && (
                    <div className="space-y-0 md:space-y-4">

                        {/* Access Error Banner - Shown when access is denied */}
                        {accessError && (
                            <Card className="border-0 md:border rounded-none md:rounded-xl shadow-none md:shadow-md bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50">
                                <CardContent className="p-4 md:p-6">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                                            <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-red-600 dark:text-red-400" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-red-700 dark:text-red-400 text-sm md:text-base">
                                                {accessError}
                                            </h4>
                                            <p className="text-xs md:text-sm text-red-600 dark:text-red-300 mt-1 whitespace-pre-wrap">
                                                {accessErrorDetails}
                                            </p>
                                            {examInfo.scheduled_start && examInfo.scheduled_end && (
                                                <div className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg space-y-1">
                                                    <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        <span className="font-medium">Exam Window (UTC):</span>
                                                        <span>{new Date(examInfo.scheduled_start).toUTCString()} → {new Date(examInfo.scheduled_end).toUTCString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        <span className="font-medium">Current Time (UTC):</span>
                                                        <span>{new Date().toUTCString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        <span className="font-medium">Your Local Time:</span>
                                                        <span>{new Date().toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Exam Info Card */}
                        <Card className="border-0 md:border rounded-none md:rounded-xl shadow-none md:shadow-md dark:bg-muted/30">
                            <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-2 md:pb-4">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="flex items-center gap-1 text-blue-500 hover:text-blue-600 font-medium mb-2 md:mb-4 text-xs md:text-sm"
                                >
                                    <ChevronLeft size={16} className="md:w-5 md:h-5" /> Back
                                </button>
                                <CardTitle className="text-center text-xl md:text-3xl font-bold bg-gradient-to-r from-green-500 via-teal-400 to-blue-500 bg-clip-text text-transparent">
                                    {examInfo.title}
                                </CardTitle>
                                <CardDescription className="text-center text-xs md:text-sm text-muted-foreground">
                                    {examInfo.course || "-"} | {examInfo.block || "-"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-4 md:px-6 pb-4 md:pb-6 space-y-4 md:space-y-6 text-sm text-gray-700">
                                {/* DESCRIPTION SECTION */}
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 md:p-4 rounded-lg md:rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5 md:mb-2">Exam Description</h4>
                                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                        {examInfo.description || "No description provided."}
                                    </p>
                                </div>

                                {/* METADATA GRID */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 md:gap-x-8 gap-y-2 md:gap-y-3">
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                        <span className="text-[10px] md:text-sm font-semibold text-slate-500">Duration:</span>
                                        <span className="text-xs md:text-sm font-bold text-slate-900 dark:text-slate-100">{examInfo.duration} mins</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                        <span className="text-[10px] md:text-sm font-semibold text-slate-500">Public Exam:</span>
                                        <Badge variant="outline" className="text-[8px] md:text-[10px]">{examInfo.is_public ? "Yes" : "No"}</Badge>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                        <span className="text-[10px] md:text-sm font-semibold text-slate-500">Free Exam:</span>
                                        <span className="text-xs md:text-sm">{examInfo.is_free ? "Yes" : "No"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                        <span className="text-[10px] md:text-sm font-semibold text-slate-500">Active:</span>
                                        <span className="text-xs md:text-sm">{examInfo.is_active ? "Yes" : "No"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                        <span className="text-[10px] md:text-sm font-semibold text-slate-500">Released:</span>
                                        <span className="text-xs md:text-sm">{examInfo.is_released ? "Yes" : "No"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                        <span className="text-[10px] md:text-sm font-semibold text-slate-500">Results:</span>
                                        <span className="text-xs md:text-sm">{examInfo.results_released ? "Released" : "Pending"}</span>
                                    </div>

                                    {/* Full width items */}
                                    <div className="sm:col-span-2 flex flex-col gap-1 pt-1 md:pt-2">
                                        <span className="text-[9px] md:text-xs font-semibold text-slate-500 uppercase tracking-tighter">Scheduled Window:</span>
                                        <span className="text-[10px] md:text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 p-1.5 md:p-2 rounded-lg">
                                            Start: {examInfo.scheduled_start ? new Date(examInfo.scheduled_start).toLocaleString() : "-"}
                                            <br className="sm:hidden" />
                                            <span className="hidden sm:inline mx-1 md:mx-2">→</span>
                                            <span className="sm:hidden mx-1">→</span>
                                            End: {examInfo.scheduled_end ? new Date(examInfo.scheduled_end).toLocaleString() : "-"}
                                        </span>
                                        <span className="text-[8px] md:text-[9px] text-slate-400 mt-0.5">
                                            UTC: {examInfo.scheduled_start ? new Date(examInfo.scheduled_start).toUTCString() : "-"} → {examInfo.scheduled_end ? new Date(examInfo.scheduled_end).toUTCString() : "-"}
                                        </span>
                                    </div>

                                    <div className="sm:col-span-2 grid grid-cols-2 gap-2 md:gap-4 mt-1 md:mt-2">
                                        <div className="p-2 md:p-3 bg-slate-50 dark:bg-slate-800 rounded-lg md:rounded-xl">
                                            <p className="text-[8px] md:text-[10px] uppercase font-bold text-slate-400">Max Tab Switches</p>
                                            <p className="text-base md:text-lg font-black">{examInfo.max_tab_switch}</p>
                                        </div>
                                        <div className="p-2 md:p-3 bg-slate-50 dark:bg-slate-800 rounded-lg md:rounded-xl">
                                            <p className="text-[8px] md:text-[10px] uppercase font-bold text-slate-400">Strict Mode</p>
                                            <p className="text-base md:text-lg font-black">{examInfo.strict_mode ? "ON" : "OFF"}</p>
                                        </div>
                                    </div>

                                    {secondsLeft !== null && secondsLeft > 0 && !accessError && (
                                        <div className="col-span-full mt-2 md:mt-4 p-3 md:p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg md:rounded-2xl text-center font-bold text-orange-600 animate-pulse text-sm md:text-base">
                                            Exam starts in: {formatCountdown(secondsLeft)}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Instructions Card */}
                        <Card className="border-0 md:border rounded-none md:rounded-xl shadow-none md:shadow-sm dark:bg-muted/30">
                            <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-2 md:pb-4">
                                <CardTitle className="text-center text-base md:text-lg">Exam Instructions</CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 md:px-6 pb-4 md:pb-6 space-y-3 text-sm text-gray-900 dark:text-gray-50 leading-relaxed">
                                {instructions.split("\n").map((line, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 md:h-5 md:w-5 mt-0.5 md:mt-1 text-yellow-500 shrink-0" />
                                        <span className="text-xs md:text-sm">{line}</span>
                                    </div>
                                ))}
                                <Button
                                    className={`w-full mt-3 md:mt-4 text-white font-bold h-11 md:h-12 rounded-lg md:rounded-xl transition-all text-sm md:text-base ${sessionExpired || accessError
                                        ? "bg-slate-500 cursor-not-allowed"
                                        : (canStart ? "bg-green-600 hover:bg-green-700 shadow-lg" : "bg-blue-600")
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
                )}
            </div>
        </div>
    );
}