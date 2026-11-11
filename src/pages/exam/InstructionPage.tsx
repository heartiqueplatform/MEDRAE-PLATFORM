"use client";

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { GlobalLoader } from "@/components/GlobalLoader";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { CenteredModal } from "@/components/ui/CenteredModal";
import React from "react";
import {
    X,
    LockKeyhole,
    AlertCircle,
    ChevronLeft,
    ShieldAlert,
    KeyRound,
    Clock,
    Calendar,
    AlertTriangle,
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

const tap = (type: "light" | "success" | "warning" = "light") => {
    try { playSound("ui-tap"); } catch { /* no-op */ }
    if (type === "success") vibrate([15, 30, 15]);
    else if (type === "warning") vibrate(60);
    else vibrate(15);
};

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

    const handleBack = useCallback(() => {
        tap();
        if (window.history.length > 1) navigate(-1);
        else navigate("/dashboard/student", { replace: true });
    }, [navigate]);

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
        tap();

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
            tap("warning");
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
        tap("success");
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

    /* ─── LOADING ────────────────────────────────────────────── */
    if (loadingPage) {
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
                <main className="flex-1 min-h-0 flex items-center justify-center">
                    <GlobalLoader message="Setting up exam page..." />
                </main>
            </div>
        );
    }

    /* ─── EXAM KEY GATE (before key is verified) ─────────────── */
    if (!keyVerified) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white">
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
                            Exam access
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            Enter your institutional key
                        </p>
                    </div>
                </header>
                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex items-center justify-center px-4 py-6">
                    <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#161b22] p-5 space-y-4">
                        <div className="flex flex-col items-center text-center">
                            <div className="h-12 w-12 rounded-full
                                            bg-slate-100 dark:bg-white/[0.06]
                                            flex items-center justify-center mb-3">
                                <LockKeyhole className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                            </div>
                            <h2 className="text-base font-bold leading-tight">
                                Secure access required
                            </h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-1">
                                This examination is protected. Enter the unique access key provided by your institution.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider
                                              text-slate-500 dark:text-slate-400 ml-1">
                                Authorization key
                            </label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2
                                                     h-4 w-4 text-slate-400 dark:text-slate-500" />
                                <Input
                                    type="password"
                                    placeholder="e.g. EXAM-992-K82"
                                    className="pl-9 h-10 rounded-xl border-0 text-sm font-mono
                                               tracking-widest uppercase
                                               bg-slate-50 dark:bg-[#0d1117]
                                               focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                    value={examKey}
                                    onChange={(e) => setExamKey(e.target.value)}
                                />
                            </div>
                        </div>

                        {keyError && (
                            <div className="flex items-center gap-2 rounded-xl
                                            bg-rose-50 dark:bg-rose-400/10 p-3">
                                <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-snug">
                                    {keyError}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={verifyKey}
                            className="w-full h-10 rounded-xl bg-blue-600 text-white
                                       text-sm font-bold
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            Unlock examination
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    /* ─── MAIN INSTRUCTIONS ──────────────────────────────────── */
    if (keyVerified && examInfo) {
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
                            {examInfo.title || "Exam instructions"}
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            {examInfo.course || "—"} · {examInfo.block || "—"}
                        </p>
                    </div>
                </header>

                {/* ── SCROLLING BODY ──────────────────────────────── */}
                <main
                    className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain"
                    style={{ WebkitOverflowScrolling: "touch" }}
                >
                    <div className="w-full max-w-[880px] mx-auto px-4 py-3 pb-24 safe-bottom space-y-3">

                        {/* Access error banner */}
                        {accessError && (
                            <section className="rounded-2xl bg-rose-50 dark:bg-rose-400/10 p-4 space-y-2">
                                <div className="flex items-start gap-2.5">
                                    <div className="h-8 w-8 rounded-lg
                                                    bg-rose-100 dark:bg-rose-400/20
                                                    flex items-center justify-center shrink-0">
                                        <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-bold text-rose-700 dark:text-rose-300 leading-tight">
                                            {accessError}
                                        </p>
                                        <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 whitespace-pre-wrap leading-relaxed">
                                            {accessErrorDetails}
                                        </p>
                                    </div>
                                </div>

                                {examInfo.scheduled_start && examInfo.scheduled_end && (
                                    <div className="rounded-xl bg-white/70 dark:bg-black/20 p-3 space-y-1.5">
                                        <div className="flex items-start gap-2 text-[11px] text-rose-700 dark:text-rose-300">
                                            <Calendar className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                            <span className="font-bold">Window (UTC):</span>
                                            <span className="break-all">
                                                {new Date(examInfo.scheduled_start).toUTCString()} → {new Date(examInfo.scheduled_end).toUTCString()}
                                            </span>
                                        </div>
                                        <div className="flex items-start gap-2 text-[11px] text-rose-700 dark:text-rose-300">
                                            <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                            <span className="font-bold">Now (UTC):</span>
                                            <span>{new Date().toUTCString()}</span>
                                        </div>
                                        <div className="flex items-start gap-2 text-[11px] text-rose-700 dark:text-rose-300">
                                            <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                            <span className="font-bold">Your local:</span>
                                            <span>{new Date().toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Exam info card */}
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg
                                                bg-blue-50 dark:bg-blue-400/10
                                                flex items-center justify-center shrink-0">
                                    <LockKeyhole className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider
                                                  text-blue-600 dark:text-blue-400 leading-none mb-1">
                                        Exam
                                    </p>
                                    <h2 className="text-sm font-bold leading-tight truncate">
                                        {examInfo.title || "Exam"}
                                    </h2>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-slate-500 dark:text-slate-400 mb-1.5">
                                    Description
                                </p>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {examInfo.description || "No description provided."}
                                </p>
                            </div>

                            {/* Metadata grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                                <MetaRow label="Duration" value={`${examInfo.duration} mins`} />
                                <MetaRow label="Public exam" value={examInfo.is_public ? "Yes" : "No"} />
                                <MetaRow label="Free exam" value={examInfo.is_free ? "Yes" : "No"} />
                                <MetaRow label="Active" value={examInfo.is_active ? "Yes" : "No"} />
                                <MetaRow label="Released" value={examInfo.is_released ? "Yes" : "No"} />
                                <MetaRow label="Results" value={examInfo.results_released ? "Released" : "Pending"} />
                            </div>

                            {/* Scheduled window */}
                            <div className="rounded-xl bg-blue-50 dark:bg-blue-400/10 p-3 space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-blue-700 dark:text-blue-400 mb-1">
                                    Scheduled window
                                </p>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2
                                                text-[11px] text-blue-700 dark:text-blue-300">
                                    <span className="font-bold">Start:</span>
                                    <span>{examInfo.scheduled_start ? new Date(examInfo.scheduled_start).toLocaleString() : "—"}</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2
                                                text-[11px] text-blue-700 dark:text-blue-300">
                                    <span className="font-bold">End:</span>
                                    <span>{examInfo.scheduled_end ? new Date(examInfo.scheduled_end).toLocaleString() : "—"}</span>
                                </div>
                                <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-1.5 leading-relaxed break-all">
                                    UTC: {examInfo.scheduled_start ? new Date(examInfo.scheduled_start).toUTCString() : "—"} → {examInfo.scheduled_end ? new Date(examInfo.scheduled_end).toUTCString() : "—"}
                                </p>
                            </div>

                            {/* Two metric tiles */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider
                                                  text-slate-500 dark:text-slate-400 mb-1">
                                        Max tab switches
                                    </p>
                                    <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white leading-none">
                                        {examInfo.max_tab_switch}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider
                                                  text-slate-500 dark:text-slate-400 mb-1">
                                        Strict mode
                                    </p>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">
                                        {examInfo.strict_mode ? "ON" : "OFF"}
                                    </p>
                                </div>
                            </div>

                            {/* Countdown */}
                            {secondsLeft !== null && secondsLeft > 0 && !accessError && (
                                <div className="rounded-xl bg-amber-50 dark:bg-amber-400/10 p-3
                                                text-center text-[12px] font-bold
                                                text-amber-700 dark:text-amber-300 tabular-nums
                                                animate-pulse">
                                    Exam starts in: {formatCountdown(secondsLeft)}
                                </div>
                            )}
                        </section>

                        {/* Instructions card */}
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                            <h2 className="text-sm font-bold leading-tight">
                                Exam instructions
                            </h2>

                            <div className="space-y-2">
                                {instructions.split("\n").map((line, idx) => (
                                    <div key={idx} className="flex items-start gap-2.5">
                                        <AlertCircle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                                        <span className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {line}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleStartExam}
                                disabled={!canStart || sessionExpired || !!accessError}
                                className={`w-full h-10 rounded-xl text-white text-sm font-bold
                                            flex items-center justify-center gap-1.5
                                            active:scale-[0.97] transition-transform
                                            disabled:opacity-60 disabled:active:scale-100
                                            ${sessionExpired || accessError
                                        ? "bg-slate-400 dark:bg-slate-600 cursor-not-allowed"
                                        : canStart
                                            ? "bg-emerald-600"
                                            : "bg-blue-600"
                                    }`}
                                style={{ touchAction: "manipulation" }}
                            >
                                {accessError ? (
                                    <>
                                        <AlertTriangle className="h-4 w-4" />
                                        Access denied
                                    </>
                                ) : sessionExpired ? (
                                    <>
                                        <X className="h-4 w-4" />
                                        Session expired / already submitted
                                    </>
                                ) : existingSession ? (
                                    "Continue exam session"
                                ) : canStart ? (
                                    "Begin examination now"
                                ) : (
                                    `Starts in ${formatCountdown(secondsLeft || 0)}`
                                )}
                            </button>
                        </section>
                    </div>
                </main>
            </div>
        );
    }

    return null;
}

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                     */
/* ------------------------------------------------------------------ */

function MetaRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{label}</span>
            <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                {value}
            </span>
        </div>
    );
}