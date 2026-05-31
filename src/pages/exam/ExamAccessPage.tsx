"use client";
import { Link } from "react-router-dom";
import { Sun, Moon, RefreshCw, ChevronLeft, WifiOff, ChevronRight, CornerRightDown, Flag, Lock, Clock, Unlock, ShieldAlert, Video, Home, Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useParams } from "react-router-dom"; // at the top with other imports
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlobalLoader } from "@/components/GlobalLoader";
import ExamProctor from "@/components/ExamProctor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AnimatePresence, motion } from "framer-motion";

import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area"; // If you have Shadcn ScrollArea, otherwise use div
import {
    CheckCircle2,
    HelpCircle,
    SkipForward,
    AlertTriangle,
    FileCheck,
    RotateCcw,
    X
} from "lucide-react";
const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
        case "done":
            return "secondary"; // grey/blue
        case "active":
            return "default"; // normal
        case "locked":
            return "destructive"; // red
        default:
            return "outline";
    }
};

// Connectivity Guard UI
const ConnectivityOverlay = () => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
    >
        <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
            <div className="relative bg-slate-900 border border-slate-800 p-8 rounded-full shadow-2xl">
                <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
                <WifiOff className="absolute -top-2 -right-2 w-8 h-8 text-rose-500 animate-bounce" />
            </div>
        </div>
        <div className="space-y-4 max-w-md">
            <h2 className="text-3xl font-black text-white tracking-tight italic">
                CONNECTION <span className="text-blue-500">INTERRUPTED</span>
            </h2>
            <div className="flex items-center justify-center gap-2 text-slate-400 font-medium uppercase tracking-[0.2em] text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Attempting Auto-Reconnect
            </div>
            <p className="text-slate-500 text-sm">
                Your exam progress is <span className="text-slate-300 font-bold">safely paused</span>.
                The system will resume automatically once your connection is stable.
            </p>
        </div>
    </motion.div>
);
export default function ExamAccessPage() {
    // ===== Fullscreen helpers =====
    const enterFullscreen = () => {
        const el = document.documentElement;
        if (el.requestFullscreen) {
            el.requestFullscreen();
        }
    };

    const exitFullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    };

    const navigate = useNavigate();
    const [dismissed, setDismissed] = useState(false);
    // 🚫 Block mobile screens completely
    if (typeof window !== "undefined") {
        const isLaptop = window.innerWidth >= 1000; // adjust size if needed

        if (!isLaptop && !dismissed) {
            return (
                <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-6 text-center">
                    <h1 className="text-3xl font-bold mb-4">Laptop Required</h1>
                    <p className="text-lg mb-6">
                        This Exam is only available on laptops or desktops for
                        proctoring (camera + mic + full interface).
                    </p>
                    <button
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                        onClick={() => navigate("/dashboard")}
                    >
                        OK
                    </button>

                </div>
            );
        }
    }
    const [totalDuration, setTotalDuration] = useState(0);
    const [timerReady, setTimerReady] = useState(false);
    const [selectedPaper, setSelectedPaper] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedSession, setSelectedSession] = useState<string>("Session 1"); // or fetch dynamically
    // will hold paper id being reset
    const { paper_id } = useParams<{ paper_id: string }>();
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<{ [key: string]: string }>({});
    const [flags, setFlags] = useState<string[]>([]);
    const [skipped, setSkipped] = useState<string[]>([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showDonePanel, setShowDonePanel] = useState(false);
    const [pendingAction, setPendingAction] = useState<"submit" | "reset" | null>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const localKey = selectedPaper?.id ? `sim-answers-${selectedPaper.id}` : "";
    const timerKey = paper_id ? `sim-timer-${paper_id}` : "";
    const [loading, setLoading] = useState(true); // new
    const currentQuestion = questions?.[currentIndex] ?? null;
    const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [loudWarning, setLoudWarning] = useState(false);
    const [mediaAllowed, setMediaAllowed] = useState(false);
    const [examSession, setExamSession] = useState<any>(null);

    // State
    const [profile, setProfile] = useState<any>(() => {
        if (typeof window !== "undefined") {
            const cachedProfile = localStorage.getItem("profile");
            return cachedProfile ? JSON.parse(cachedProfile) : null;
        }
        return null;
    });


    // 1️⃣ Add this state at the top of your component

    const [isDark, setIsDark] = useState(false);
    const isOnline = useOnlineStatus();
    const [showConnectionOverlay, setShowConnectionOverlay] = useState(false);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (!isOnline) {
            // Wait 1.5 seconds of "offline" before showing the overlay
            // This stops the flashing on small glitches
            timeout = setTimeout(() => setShowConnectionOverlay(true), 1500);
        } else {
            setShowConnectionOverlay(false);
        }
        return () => clearTimeout(timeout);
    }, [isOnline]);
    const initMedia = useCallback(async (force = false) => {
        try {
            if (force) {
                cameraStream?.getTracks().forEach((t) => t.stop());
                audioStream?.getTracks().forEach((t) => t.stop());
            }

            // Request video separately
            const cam = await navigator.mediaDevices.getUserMedia({ video: true });
            setCameraStream(cam);

            if (videoRef.current) {
                videoRef.current.srcObject = cam;
                videoRef.current.muted = true;
                videoRef.current.playsInline = true;
                videoRef.current.autoplay = true;
                await videoRef.current.play().catch((err) =>
                    console.log("Autoplay blocked:", err)
                );
            }

            // Request audio separately
            const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
            setAudioStream(mic);
            setMediaAllowed(true);


            // ---- Audio analyser setup ----
            const audioCtx = new (window.AudioContext ||
                (window as any).webkitAudioContext)();
            const source = audioCtx.createMediaStreamSource(mic);
            const analyser = audioCtx.createAnalyser();
            source.connect(analyser);
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const canvas = canvasRef.current;
            if (!canvas) return;
            const canvasCtx = canvas.getContext("2d");
            if (!canvasCtx) return;

            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;

            const draw = () => {
                requestAnimationFrame(draw);
                analyser.getByteFrequencyData(dataArray);

                canvasCtx.fillStyle = "#f3f4f6";
                canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

                let maxVolume = 0;
                const barWidth = (canvas.width / bufferLength) * 2.5;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    const barHeight = dataArray[i] / 2;
                    maxVolume = Math.max(maxVolume, dataArray[i]);

                    let color = "green";
                    if (barHeight > 40 && barHeight <= 80) color = "blue";
                    if (barHeight > 80) color = "red";

                    canvasCtx.fillStyle = color;
                    canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                    x += barWidth + 1;
                }

                setLoudWarning(maxVolume > 150);
            };

            draw();
        } catch (err) {
            console.error("Camera or Audio access denied/unavailable", err);
        }
    }, [cameraStream, audioStream]);



    // Fetch full profile of logged-in user
    const fetchProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")  // fetch ALL columns
            .eq("user_id", userId)
            .single();

        if (error) {
            console.error("Error fetching profile:", error.message);
            return null;
        }

        return data;
    };

    useEffect(() => {
        if (!paper_id) return;

        const initExam = async () => {
            setLoading(true);

            // Fetch questions
            const { data, error } = await supabase
                .from("exam_questions")
                .select("*")
                .eq("paper_id", paper_id);

            if (error) console.error("Error fetching questions:", error.message);
            else setQuestions(data ?? []);

            setSelectedPaper({ id: paper_id, title: "Test Paper" });

            // 🔹 Ensure session exists
            await getOrCreateSession(paper_id);

            setLoading(false);
        };

        initExam();
    }, [paper_id]);

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        ;
    }, [isDark]);

    // ===== Auto-submit if fullscreen is exited (ESC, swipe, system) =====
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (selectedPaper && !document.fullscreenElement && !isSubmitting) {
                confirmSubmit();
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
        };
    }, [selectedPaper, isSubmitting]);;


    // Confirm before leaving if user is in the middle of a Exam
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (selectedPaper) {
                event.preventDefault();
                event.returnValue = "Are you sure you want to leave? Your progress may be lost.";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [selectedPaper, timeLeft]);


    // Timer
    useEffect(() => {
        if (!selectedPaper || !timerReady) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    confirmSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [selectedPaper, timerReady]);
    // Inside your component, replace the two existing camera/audio useEffects
    useEffect(() => {
        return () => {
            cameraStream?.getTracks().forEach((t) => t.stop());
            audioStream?.getTracks().forEach((t) => t.stop());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        const fetchAndStoreProfile = async () => {
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData.user?.id;
            if (!userId) return;

            const profileFromDb = await fetchProfile(userId);
            if (profileFromDb) {
                setProfile(profileFromDb);
                localStorage.setItem("profile", JSON.stringify(profileFromDb));
            }
        };

        fetchAndStoreProfile();
    }, []);

    const formatTime = (s: number) => {
        const h = Math.floor(s / 3600).toString().padStart(2, "0");
        const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
        const sec = (s % 60).toString().padStart(2, "0");
        return `${h}:${m}:${sec}`;
    };
    const getOrCreateSession = async (paperId: string) => {
        try {
            const userId = (await supabase.auth.getUser()).data.user?.id;
            if (!userId) throw new Error("User not logged in");

            // 1️⃣ Check for existing active session
            let { data: session, error } = await supabase
                .from("exam_sessions")
                .select("*")
                .eq("user_id", userId)
                .eq("paper_id", paperId)
                .eq("status", "started")
                .single();

            // Ignore "no rows found" error
            if (error && error.code !== "PGRST116") throw error;

            // 2️⃣ If no active session, create one
            if (!session) {
                const { data: newSession, error: insertError } = await supabase
                    .from("exam_sessions")
                    .insert({
                        user_id: userId,
                        paper_id: paperId,
                        status: "started",
                        started_at: new Date().toISOString(),
                    })
                    .select("*")
                    .single();

                if (insertError) throw insertError;
                session = newSession;
            }

            // 3️⃣ Store in state and localStorage for quick access
            setExamSession(session);
            localStorage.setItem(`exam-session-${paperId}`, session.id);

            // calculate remaining time using server session
            const { data: paper } = await supabase
                .from("exam_papers")
                .select("duration")
                .eq("id", paperId)
                .single();

            if (paper) {
                const durationSeconds = (paper.duration ?? 30) * 60;

                const started = new Date(session.started_at).getTime();
                const now = new Date().getTime();

                const elapsed = Math.floor((now - started) / 1000);

                const remaining = durationSeconds - elapsed;
                setTotalDuration(durationSeconds);

                if (remaining <= 0) {
                    console.warn("Session expired");
                    confirmSubmit();
                } else {
                    setTimeLeft(remaining);
                    setTimerReady(true); // start timer ONLY after time is calculated
                }
            }
        } catch (err) {
            console.error("Error creating or fetching session:", err);
            return null;
        }
    };

    const handleAnswer = async (option: string) => {
        if (!currentQuestion || !selectedPaper) return;

        let sessionId = localStorage.getItem(`exam-session-${selectedPaper.id}`);
        if (!sessionId) {
            const session = await getOrCreateSession(selectedPaper.id);
            if (!session) return;
            sessionId = session.id;
        }

        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) return;

        // ✅ Upsert the answer
        const { error } = await supabase
            .from("exam_answers")
            .upsert(
                {
                    session_id: sessionId,
                    paper_id: selectedPaper.id,
                    question_id: currentQuestion.id,
                    user_id: userId,
                    selected_answer: option,
                },
                { onConflict: ["session_id", "question_id"] }
            );

        if (error) console.error("Error saving answer:", error.message);
        else setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }));
    };

    const handleFlag = () => {
        if (!currentQuestion) return;
        if (!flags.includes(currentQuestion.id)) {
            setFlags([...flags, currentQuestion.id]);
        }
    };

    const handleSkip = () => {
        if (!currentQuestion) return;
        if (!skipped.includes(currentQuestion.id)) {
            setSkipped([...skipped, currentQuestion.id]);
        }
        goNext();
    };

    const goNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const goPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const jumpTo = (index: number) => {
        setCurrentIndex(index);
    };

    const handleSubmit = () => {
        setPendingAction("submit");
        setShowDonePanel(true);
    };

    const resetAnswers = () => {
        setPendingAction("reset");
        setShowDonePanel(true);
    };

    const resetNow = () => {
        if (!selectedPaper) return;
        localStorage.removeItem(localKey);
        localStorage.removeItem(timerKey);

        setAnswers({});
        setFlags([]);
        setSkipped([]);
        setCurrentIndex(0);
        setShowDonePanel(false);
        setPendingAction(null);
    };
    const confirmSubmit = async () => {
        if (!selectedPaper || isSubmitting) return; // 🔒 prevent double execution

        setIsSubmitting(true);

        try {
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData.user?.id;
            if (!userId) {
                setIsSubmitting(false);
                return;
            }

            // 1️⃣ Compute score
            let correctCount = 0;
            for (const q of questions) {
                if (answers[q.id] === q.correct_answer) correctCount++;
            }

            const totalQuestions = questions.length;

            // 2️⃣ Save result (safe upsert)
            const { error: resultError } = await supabase
                .from("exam_results")
                .upsert(
                    {
                        user_id: userId,
                        paper_id: selectedPaper.id,
                        score: correctCount,
                        total_questions: totalQuestions,
                        submitted_at: new Date().toISOString(),
                    },
                    { onConflict: "user_id,paper_id" }
                );

            if (resultError) {
                console.error("Error inserting exam_results:", resultError.message);
                setIsSubmitting(false);
                return; // ❗ stop if DB fails
            }

            // 3️⃣ Update session
            const sessionId = localStorage.getItem(`exam-session-${selectedPaper.id}`);
            if (sessionId) {
                await supabase
                    .from("exam_sessions")
                    .update({
                        completed_at: new Date().toISOString(),
                        status: "completed",
                        duration_seconds: (totalDuration || 0) - timeLeft,
                    })
                    .eq("id", sessionId);
            }

            // 4️⃣ Exit fullscreen safely
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            }

            // 5️⃣ Generate PDF
            await generatePDF();

            // 6️⃣ Cleanup
            resetNow();
            setSelectedPaper(null);
            setShowDonePanel(false);
            setPendingAction(null);
            localStorage.removeItem(timerKey);

            navigate("/dashboard");
        } catch (err) {
            console.error("Submission error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };
    const generatePDF = async () => {
        const doc = new jsPDF({ unit: "pt", format: "a4" });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const margin = 40;
        let y = margin;

        const lineHeight = 16;

        // ===== WATERMARK =====
        doc.setTextColor(230, 230, 230);
        doc.setFontSize(70);
        doc.setFont(undefined, "bold");
        doc.text("MEDRAE", pageWidth / 2, pageHeight / 2, {
            align: "center",
            angle: 45,
        });
        doc.setTextColor(0, 0, 0);

        // ===== BORDER =====
        doc.setLineWidth(1);
        doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin);

        // ===== HEADER BOX =====
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y, pageWidth - margin * 2, 70, "F");

        doc.setFontSize(18);
        doc.setFont(undefined, "bold");
        doc.text("MEDRAE Kenya Nursing Platform", pageWidth / 2, y + 28, { align: "center" });

        doc.setFontSize(12);
        doc.setFont(undefined, "normal");
        doc.text("Official Exam Participation Receipt", pageWidth / 2, y + 48, { align: "center" });

        y += 90;

        // ===== PROFILE DATA =====
        const profileData =
            profile ||
            (typeof window !== "undefined"
                ? JSON.parse(localStorage.getItem("profile") || "null")
                : null);

        const drawRow = (label: string, value: string) => {
            doc.setFont(undefined, "bold");
            doc.text(label, margin, y);

            doc.setFont(undefined, "normal");
            doc.text(value || "N/A", margin + 160, y);

            y += lineHeight;
        };

        // ===== RECEIPT NUMBER =====
        const receiptNumber = `MED-${Date.now().toString().slice(-8)}`;

        doc.setFontSize(11);
        drawRow("Receipt Number:", receiptNumber);
        drawRow("Exam Date:", new Date().toLocaleString());
        y += 8;

        // ===== SEPARATOR =====
        doc.setDrawColor(200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 20;

        // ===== CANDIDATE DETAILS =====
        doc.setFontSize(13);
        doc.setFont(undefined, "bold");
        doc.text("Candidate Information", margin, y);
        y += 20;

        doc.setFontSize(11);

        if (profileData) {
            drawRow("Full Name:", profileData.name);
            drawRow("Email Address:", profileData.email);
            drawRow("Institution:", profileData.institution);
            drawRow("Course / Program:", profileData.course);
            drawRow("County:", profileData.county);
            drawRow("Phone Number:", profileData.phone);
            drawRow("Subscription Type:", profileData.subscription);
            drawRow("Role:", profileData.role);
        } else {
            drawRow("Candidate Profile:", "Not Available");
        }

        y += 10;

        // ===== SEPARATOR =====
        doc.line(margin, y, pageWidth - margin, y);
        y += 20;

        // ===== EXAM DETAILS =====
        doc.setFontSize(13);
        doc.setFont(undefined, "bold");
        doc.text("Exam Information", margin, y);
        y += 20;

        doc.setFontSize(11);

        drawRow("Exam Paper Title:", selectedPaper?.title || "N/A");
        drawRow("Session:", selectedSession || "N/A");
        drawRow("Platform:", "Medrae Self‑Test Proctorium Lite");

        y += 10;

        doc.line(margin, y, pageWidth - margin, y);
        y += 20;

        // ===== CERTIFICATION TEXT =====
        doc.setFontSize(11);

        const statement = `
This document certifies that the above candidate accessed and participated in the listed examination session on the Medrae Kenya Nursing Platform (MKN).

This receipt confirms exam participation only and does not represent the final exam result or academic grading.
`;

        const splitStatement = doc.splitTextToSize(statement.trim(), pageWidth - margin * 2);

        splitStatement.forEach((line: string) => {
            doc.text(line, margin, y);
            y += lineHeight;
        });

        y += 40;

        // ===== SIGNATURE AREA =====
        doc.line(margin, y, margin + 200, y);
        doc.text("Authorized Platform Verification", margin, y + 14);

        doc.line(pageWidth - margin - 200, y, pageWidth - margin, y);
        doc.text("Digital System Stamp", pageWidth - margin - 200, y + 14);

        // ===== FOOTER =====
        const pageCount = doc.internal.getNumberOfPages();

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);

            doc.setFontSize(9);
            doc.setTextColor(120);

            const footerText1 = "MEDRAE • Advancing nursing education and student success.";
            const footerText2 = `Page ${i} of ${pageCount}`;

            const textWidth1 = doc.getTextWidth(footerText1);
            doc.text(footerText1, (pageWidth - textWidth1) / 2, pageHeight - 40);

            const textWidth2 = doc.getTextWidth(footerText2);
            doc.text(footerText2, (pageWidth - textWidth2) / 2, pageHeight - 28);
        }

        // ===== SAVE =====
        doc.save("MEDRAE_Exam_Receipt.pdf");
    };
    // Render Review Panel with percentage score
    if (showDonePanel) {
        const answered = questions.filter((q) => answers[q.id]);
        const unanswered = questions.filter((q) => !answers[q.id]);
        const flaggedQs = questions.filter((q) => flags.includes(q.id));
        const skippedQs = questions.filter((q) => skipped.includes(q.id));

        const correctCount = questions.reduce((count, q) => {
            const userAnswer = answers[q.id];
            if (!userAnswer) return count; // skip unanswered
            return userAnswer === q.correct_answer ? count + 1 : count;
        }, 0);

        const totalQuestions = questions.length;
        const percentageScore = totalQuestions > 0 ? ((correctCount / totalQuestions) * 100).toFixed(2) : "0";


        return (
            <div className="min-h-screen w-full  bg-slate-50 dark:bg-[#18191a] text-slate-900 dark:text-slate-100 p-4 md:p-8">
                <div className="max-w-6xl mx-auto space-y-8">

                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-extrabold tracking-tight">
                                {pendingAction === "submit" ? "Final Submission Review" : "Reset Session Request"}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-sm leading-relaxed">
                                {pendingAction === "submit"
                                    ? "Please conduct a final review of your responses. Once submitted, your attempts are timestamped and locked for grading. Changes cannot be made after this point."
                                    : "You are about to clear all progress. This action is recorded and cannot be undone."
                                }
                            </p>
                        </div>

                        {/* Security Badge */}
                        <div className="hidden lg:flex items-center gap-2 bg-white dark:bg-muted/30 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-full shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Secure Session Active</span>
                        </div>
                    </div>

                    {/* Status Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                        {/* Answered */}
                        <Card className="border-0 border-l-4 border-l-emerald-500 shadow-sm bg-white dark:bg-[#242526]">
                            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Answered</CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="text-2xl font-bold mb-3">{answered.length}</div>
                                <div className="h-48 overflow-y-auto pr-2 space-y-2 scrollbar-thin">
                                    {answered.map((q, i) => (
                                        <div key={q.id} className="text-xs p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-700">
                                            <span className="font-bold text-slate-400 mr-2">Q{i + 1}</span>
                                            <span className="text-slate-600 dark:text-slate-300 italic">Choice: {answers[q.id]}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Unanswered */}
                        <Card className="border-0 border-l-4 border-l-rose-500 shadow-sm bg-white dark:bg-[#242526]">
                            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Remaining</CardTitle>
                                <HelpCircle className="h-4 w-4 text-rose-500" />
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="text-2xl font-bold mb-3 text-rose-600">{unanswered.length}</div>
                                <div className="h-48 overflow-y-auto pr-2 space-y-2">
                                    {unanswered.length > 0 ? unanswered.map((q, i) => (
                                        <div key={q.id} className="text-xs p-2 border border-dashed border-slate-200 dark:border-slate-700 rounded text-slate-400">
                                            Question {i + 1} requires attention
                                        </div>
                                    )) : (
                                        <div className="text-xs text-slate-400 italic">All questions answered.</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Flagged */}
                        <Card className="border-0 border-l-4 border-l-amber-500 shadow-sm bg-white dark:bg-[#242526]">
                            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Review Later</CardTitle>
                                <Flag className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="text-2xl font-bold mb-3">{flaggedQs.length}</div>
                                <div className="h-48 overflow-y-auto pr-2 space-y-2">
                                    {flaggedQs.map((q, i) => (
                                        <div key={q.id} className="text-xs p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-100 dark:border-amber-900/30">
                                            Question {i + 1} marked for review
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Skipped */}
                        <Card className="border-0 border-l-4 border-l-blue-500 shadow-sm bg-white dark:bg-[#242526]">
                            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Skipped</CardTitle>
                                <SkipForward className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="text-2xl font-bold mb-3">{skippedQs.length}</div>
                                <div className="h-48 overflow-y-auto pr-2 space-y-2">
                                    {skippedQs.map((q, i) => (
                                        <div key={q.id} className="text-xs p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-100 dark:border-blue-900/30">
                                            Question {i + 1} skipped
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Actions Section */}
                    <div className="bg-white dark:bg-[#242526] rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <Button
                                size="lg"
                                className={`flex-[2] h-14 text-base font-bold shadow-lg transition-all ${pendingAction === "submit"
                                    ? "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                                    : "bg-rose-600 hover:bg-rose-700 text-white"
                                    }`}
                                onClick={() => {
                                    if (pendingAction === "submit") confirmSubmit();
                                    if (pendingAction === "reset") resetNow();
                                }}
                            >
                                {pendingAction === "submit" ? (
                                    <span className="flex items-center gap-2">
                                        <FileCheck className="w-5 h-5" /> Confirm Final Submission & Generate PDF
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <RotateCcw className="w-5 h-5" /> Confirm Permanent Reset
                                    </span>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                size="lg"
                                className="flex-1 h-14 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                                onClick={() => {
                                    setShowDonePanel(false);
                                    setPendingAction(null);
                                }}
                            >
                                <X className="w-4 h-4 mr-2" /> Return to Questions
                            </Button>
                        </div>

                        <div className="mt-6 flex items-center justify-center gap-4 text-slate-400">
                            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold">End of Assessment Summary</span>
                            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                        </div>
                    </div>

                    {/* Professional Footer — No Marquee for Exam */}
                    <div className="text-center pb-10">
                        <p className="text-xs text-slate-400 font-medium italic">
                            "Your commitment to academic integrity is appreciated. Good luck with your results."
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    // No questions found / Loading questions
    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-background text-foreground">
                <GlobalLoader />
            </div>
        );
    }

    if (!currentQuestion) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>No questions found for this paper.</p>
            </div>
        );
    }


    // Main question view
    return (
        <>
            <AnimatePresence>
                {showConnectionOverlay && <ConnectivityOverlay />}
            </AnimatePresence>
            <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground grid md:grid-cols-3 grid-cols-1 gap-6 p-8">
                <div className="md:col-span-2 space-y-4">

                    <Card className="min-h-[400px] bg-white dark:bg-gray-900 border border-0 shadow-sm rounded-xl">
                        <CardHeader>
                            <CardTitle>
                                Question {currentIndex + 1} of {questions.length}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="font-barlow text-sm leading-relaxed">{currentQuestion.question_text}</p>
                            <div className="flex flex-col gap-3">
                                {["A", "B", "C", "D"].map((opt) => {
                                    const isSelected = answers[currentQuestion.id] === opt;

                                    return (
                                        <div
                                            key={opt}
                                            onClick={() => handleAnswer(opt)}
                                            className="flex items-start gap-3 cursor-pointer"
                                        >
                                            {/* Empty circle */}
                                            <div
                                                className={`
            w-5 h-5 flex-shrink-0 rounded-full border-2 mt-1
            transition-colors duration-200
            ${isSelected ? "bg-blue-500 border-blue-500" : "bg-white border-gray-400 dark:bg-black dark:border-gray-500"}
            hover:${!isSelected ? "bg-gray-200 dark:bg-gray-700" : ""}
          `}
                                            ></div>

                                            {/* Answer text */}
                                            <span className="whitespace-normal font-barlow text-sm leading-relaxed">{currentQuestion[`option_${opt.toLowerCase()}`]}</span>
                                        </div>
                                    );
                                })}
                            </div>

                        </CardContent>
                    </Card>

                    {/* Centered navigation buttons */}
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                        <Button
                            onClick={goPrev}
                            disabled={currentIndex === 0}
                            className="flex items-center gap-2"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleFlag}
                            className="flex items-center gap-2"
                        >
                            <Flag className="w-5 h-5" />
                            Flag
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={handleSkip}
                            className="flex items-center gap-2"
                        >
                            Skip
                            <CornerRightDown className="w-5 h-5" />
                        </Button>

                        <Button
                            onClick={goNext}
                            disabled={currentIndex === questions.length - 1}
                            className="flex items-center gap-2"
                        >
                            Next
                            <ChevronRight className="w-5 h-5" />
                        </Button>

                        <Button
                            variant="default"
                            onClick={handleSubmit}
                            disabled={currentIndex !== questions.length - 1} // disable until last question
                            title={
                                currentIndex !== questions.length - 1
                                    ? `You must reach the last question to submit`
                                    : `Submit your answers`
                            }
                        >
                            Submit & Generate PDF
                        </Button>

                    </div>

                    {/* Skipped / Flagged question tabs */}
                    <div className="flex justify-center gap-4 mt-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            disabled={skipped.length === 0}
                            onClick={() => {
                                if (skipped.length > 0) {
                                    jumpTo(questions.findIndex((q) => q.id === skipped[0]));
                                }
                            }}
                        >
                            ⏭ Skipped ({skipped.length})
                        </Button>

                        <Button
                            size="sm"
                            variant="destructive"
                            disabled={flags.length === 0}
                            onClick={() => {
                                if (flags.length > 0) {
                                    jumpTo(questions.findIndex((q) => q.id === flags[0]));
                                }
                            }}
                        >
                            Flagged ({flags.length})
                        </Button>
                    </div>

                    <div className="flex gap-4 mt-6 items-start">
                        <ExamProctor
                            videoStream={cameraStream}
                            sessionId={examSession?.id ?? null}
                            paperId={paper_id}  // ← pass it here
                        />
                        {/* Sound Wave Panel (Right side) */}
                        <div className="border border-gray-300 rounded-lg overflow-hidden w-40 h-32 relative flex items-center justify-center">
                            <canvas ref={canvasRef} width={256} height={192} className="w-full h-full" />
                            {loudWarning && (
                                <span className="absolute top-1 left-1 text-xs text-red-600 font-bold bg-white px-1 rounded">
                                    Loud noise detected
                                </span>
                            )}
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => initMedia(true)}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Reset Cam & Mic
                        </Button>

                    </div>

                </div>

                <div className="space-y-2">

                    <Card className="bg-transparent text-foreground dark:text-gray-100 shadow-none border-none rounded-none p-2">

                        {/* App Title inside the card with logo */}
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <img
                                src="/pwa-192x192.jpeg"
                                alt="Medrae Logo"
                                className="h-6 w-6 rounded-sm object-contain"
                            />
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                                Medrae Self-Test: Proctorium Lite
                            </p>
                        </div>

                        <CardHeader className="flex justify-between items-center">
                            <CardTitle>Time Left</CardTitle>


                            <button className="p-1 rounded hover:bg-green-100 transition">
                                <Clock className="w-5 h-5 text-green-600" />
                            </button>
                        </CardHeader>
                        <CardContent className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground">
                                {new Date().toLocaleDateString(undefined, {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </p>

                            <p className="text-2xl font-bold">{formatTime(timeLeft)}</p>
                        </CardContent>
                    </Card>

                    <Card className="max-h-[400px] overflow-y-auto pr-2 bg-transparent text-foreground dark:text-gray-100 shadow-none border-none rounded-none overflow-y-auto custom-scrollbar">

                        <CardHeader className="flex justify-between items-center sticky top-0 bg-background z-10">
                            <CardTitle>Questions</CardTitle>
                            <Button size="sm" variant="ghost" onClick={resetAnswers}>
                                Reset
                            </Button>
                        </CardHeader>
                        <CardContent className="grid grid-cols-[repeat(auto-fit,minmax(40px,1fr))] gap-2">
                            {questions.map((q, i) => (
                                <Button
                                    key={q.id}
                                    size="sm"
                                    variant={
                                        currentIndex === i
                                            ? "default"
                                            : answers[q.id]
                                                ? "secondary"
                                                : flags.includes(q.id)
                                                    ? "destructive"
                                                    : "outline"
                                    }
                                    onClick={() => jumpTo(i)}
                                >
                                    {i + 1}
                                </Button>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Encouragement Marquee — Endless Loop */}
                    <div className="w-full overflow-hidden border-t border-border pt-4">
                        <div className="flex w-max animate-marquee-slow">
                            <div
                                dir="rtl"
                                className="whitespace-nowrap text-lg md:text-xl font-semibold tracking-wide text-foreground pr-16"
                            >
                                Exam Mode
                            </div>

                            <div
                                dir="rtl"
                                className="whitespace-nowrap text-lg md:text-xl font-semibold tracking-wide text-foreground pr-16"
                            >
                                Exam Mode
                            </div>
                        </div>
                    </div>

                </div>


                <AnimatePresence>
                    {!mediaAllowed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-4"
                        >
                            {/* TOP NAVIGATION */}
                            <div className="text-center space-y-4">
                                <Link to="/dashboard">
                                    <motion.button
                                        whileHover={{ x: -5 }}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-2xl text-gray-700 hover:bg-gray-50 transition-all font-semibold text-sm shadow-sm"
                                    >
                                        <Home className="w-4 h-4" />
                                        Exit to Dashboard
                                    </motion.button>
                                </Link>
                            </div>

                            <div className="max-w-4xl w-full space-y-8">

                                {/* HEADER SECTION */}
                                <div className="text-center space-y-4">

                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest">
                                        <ShieldAlert className="w-3.5 h-3.5" /> Security Protocol Active
                                    </div>

                                    <h2 className="text-gray-900 text-4xl font-extrabold tracking-tight italic">
                                        Device <span className="text-gray-800">Authorization</span>
                                    </h2>

                                    <div className="bg-white border border-gray-200 rounded-2xl p-4 max-w-2xl mx-auto shadow-sm">
                                        <p className="text-gray-600 text-sm leading-relaxed">
                                            To ensure examination integrity, we require access to your camera and microphone.
                                            <span className="text-gray-700 block mt-2 font-bold uppercase text-[11px] tracking-wider">
                                                ⚠️ Critical: Pressing "ESC" during simulation will trigger an immediate auto-submission.
                                            </span>
                                        </p>
                                    </div>

                                </div>

                                {/* INTERACTIVE TILES */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">

                                    {/* CAMERA CARD */}
                                    <div className="relative group">
                                        <div className={`absolute -inset-0.5 rounded-3xl blur opacity-20 transition duration-1000 group-hover:opacity-40 ${cameraStream ? 'bg-green-200' : 'bg-blue-200'}`}></div>

                                        <motion.div className="relative bg-white rounded-3xl p-6 border border-gray-200 h-full flex flex-col items-center shadow-sm">

                                            <div className={`mb-4 p-4 rounded-2xl ${cameraStream ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                <Video className="w-8 h-8" />
                                            </div>

                                            <h3 className="text-gray-900 font-bold mb-1">Visual Identity</h3>

                                            <p className="text-gray-500 text-xs text-center mb-6 px-4">
                                                Proctoring layer uses facial detection to verify candidate presence.
                                            </p>

                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={async () => {
                                                    try {
                                                        const cam = await navigator.mediaDevices.getUserMedia({ video: true });
                                                        setCameraStream(cam);
                                                        if (videoRef.current) videoRef.current.srcObject = cam;
                                                    } catch (err) {
                                                        console.error("Camera blocked", err);
                                                    }
                                                }}
                                                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border
                 ${cameraStream
                                                        ? 'bg-green-600 text-white border-green-600 cursor-default'
                                                        : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {cameraStream ? "Camera Synced" : "Enable Camera"}
                                            </motion.button>

                                        </motion.div>
                                    </div>

                                    {/* MICROPHONE CARD */}
                                    <div className="relative group">
                                        <div className={`absolute -inset-0.5 rounded-3xl blur opacity-20 transition duration-1000 group-hover:opacity-40 ${audioStream ? 'bg-green-200' : 'bg-gray-200'}`}></div>

                                        <motion.div className="relative bg-white rounded-3xl p-6 border border-gray-200 h-full flex flex-col items-center shadow-sm">

                                            {/* VISUALIZER */}
                                            <div className="relative w-full h-24 mb-4 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                                                <canvas ref={canvasRef} className="w-full h-full" />

                                                {!audioStream && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Mic className="w-8 h-8 text-gray-400 animate-pulse" />
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="text-gray-900 font-bold mb-1">Audio Environment</h3>

                                            <p className="text-gray-500 text-xs text-center mb-6 px-4">
                                                Detects excessive ambient noise and external assistance.
                                            </p>

                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={async () => {
                                                    try {
                                                        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
                                                        setAudioStream(mic);

                                                        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                                                        const source = audioCtx.createMediaStreamSource(mic);
                                                        const analyser = audioCtx.createAnalyser();

                                                        source.connect(analyser);
                                                        analyser.fftSize = 256;

                                                        const bufferLength = analyser.frequencyBinCount;
                                                        const dataArray = new Uint8Array(bufferLength);

                                                        const canvas = canvasRef.current;
                                                        if (!canvas) return;

                                                        const canvasCtx = canvas.getContext("2d");
                                                        if (!canvasCtx) return;

                                                        canvas.width = canvas.clientWidth;
                                                        canvas.height = canvas.clientHeight;

                                                        const draw = () => {
                                                            requestAnimationFrame(draw);

                                                            analyser.getByteFrequencyData(dataArray);

                                                            canvasCtx.fillStyle = "rgba(255, 255, 255, 0.6)";
                                                            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

                                                            let maxVolume = 0;
                                                            let x = 0;
                                                            const barWidth = (canvas.width / bufferLength) * 2;

                                                            for (let i = 0; i < bufferLength; i++) {
                                                                const barHeight = dataArray[i] / 2;
                                                                maxVolume = Math.max(maxVolume, dataArray[i]);

                                                                canvasCtx.fillStyle =
                                                                    barHeight > 60 ? "#ef4444" : "#3b82f6";

                                                                canvasCtx.fillRect(
                                                                    x,
                                                                    canvas.height - barHeight,
                                                                    barWidth,
                                                                    barHeight
                                                                );

                                                                x += barWidth + 1;
                                                            }

                                                            setLoudWarning(maxVolume > 150);
                                                        };

                                                        draw();
                                                    } catch (err) {
                                                        console.error("Mic blocked", err);
                                                    }
                                                }}
                                                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border
                 ${audioStream
                                                        ? 'bg-green-600 text-white border-green-600 cursor-default'
                                                        : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {audioStream ? "Mic Calibrated" : "Enable Microphone"}
                                            </motion.button>

                                        </motion.div>
                                    </div>

                                </div>

                                {/* FINAL BUTTON */}
                                <div className="flex flex-col items-center pt-6">

                                    <motion.button
                                        disabled={!cameraStream || !audioStream}
                                        onClick={() => {
                                            const audio = new Audio("/sounds/start.mp3");
                                            audio.play().catch(() => { });
                                            enterFullscreen();
                                            setMediaAllowed(true);
                                        }}
                                        whileHover={cameraStream && audioStream ? { scale: 1.05 } : {}}
                                        whileTap={{ scale: 0.95 }}
                                        className={`relative group px-12 py-5 rounded-full font-black text-sm uppercase tracking-[0.3em] transition-all border
             ${cameraStream && audioStream
                                                ? 'bg-gray-900 text-white shadow-md hover:bg-black'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {cameraStream && audioStream ? (
                                                <Unlock className="w-5 h-5" />
                                            ) : (
                                                <Lock className="w-5 h-5" />
                                            )}
                                            Initiate Simulation Session
                                        </div>
                                    </motion.button>

                                    <div className="mt-6 flex items-center gap-4">

                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-2 h-2 rounded-full ${cameraStream ? 'bg-green-500' : 'bg-gray-300'}`} />
                                            <span className="text-[10px] font-bold text-gray-500 uppercase">
                                                Video Sync
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-2 h-2 rounded-full ${audioStream ? 'bg-green-500' : 'bg-gray-300'}`} />
                                            <span className="text-[10px] font-bold text-gray-500 uppercase">
                                                Audio Calibration
                                            </span>
                                        </div>

                                    </div>

                                </div>

                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}