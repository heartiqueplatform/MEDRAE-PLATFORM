"use client";
import { Link } from "react-router-dom";
import { Sun, Moon, RefreshCw, ChevronLeft, WifiOff, ChevronRight, CornerRightDown, Flag, Lock, Clock, Unlock, ShieldAlert, Video, Home, Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useParams } from "react-router-dom";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
            return "secondary";
        case "active":
            return "default";
        case "locked":
            return "destructive";
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
            <div className="relative bg-slate-900 border-0 p-8 rounded-full shadow-2xl">
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

    const [totalDuration, setTotalDuration] = useState(0);
    const [timerReady, setTimerReady] = useState(false);
    const [selectedPaper, setSelectedPaper] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedSession, setSelectedSession] = useState<string>("Session 1");
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
    const [loading, setLoading] = useState(true);
    const currentQuestion = questions?.[currentIndex] ?? null;
    const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [loudWarning, setLoudWarning] = useState(false);
    const [mediaAllowed, setMediaAllowed] = useState(false);
    const [examSession, setExamSession] = useState<any>(null);
    const [isNavigating, setIsNavigating] = useState(false);

    // State
    const [profile, setProfile] = useState<any>(() => {
        if (typeof window !== "undefined") {
            const cachedProfile = localStorage.getItem("profile");
            return cachedProfile ? JSON.parse(cachedProfile) : null;
        }
        return null;
    });

    const [isDark, setIsDark] = useState(false);
    const isOnline = useOnlineStatus();
    const [showConnectionOverlay, setShowConnectionOverlay] = useState(false);

    const confirmSubmit = async () => {
        if (!selectedPaper || isSubmitting) return;

        if ((window as any).electronAPI) {
            (window as any).electronAPI.endExam();
        }
        setIsSubmitting(true);

        const correctCount = questions.reduce((count, q) => {
            const userAnswer = answers[q.id];
            return userAnswer === q.correct_answer ? count + 1 : count;
        }, 0);

        const percentageScore = ((correctCount / questions.length) * 100).toFixed(2);

        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;

        await supabase.from("simulation_results").insert({
            paper_id: selectedPaper.id,
            user_id: userId,
            score: correctCount,
            total_questions: questions.length,
        });

        // Fresh profile fetch right before PDF
        let freshProfile: any = profile;
        if (userId && !freshProfile?.name) {
            const { data, error } = await supabase
                .from("profiles")
                .select("name, email, institution, course, county, phone, subscription, role")
                .eq("user_id", userId)
                .single();

            if (!error && data) {
                freshProfile = data;
                localStorage.setItem("profile", JSON.stringify(data));
                setProfile(data);
            }
        }

        await generatePDF(freshProfile);

        resetNow();
        setSelectedPaper(null);
        setShowDonePanel(false);
        setPendingAction(null);
        localStorage.removeItem(timerKey);

        exitFullscreen();
        navigate("/dashboard");

        setIsSubmitting(false);
    };

    // Cleanup when component unmounts
    useEffect(() => {
        return () => {
            if ((window as any).electronAPI) {
                (window as any).electronAPI.endExam();
            }

            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
            if (audioStream) {
                audioStream.getTracks().forEach(track => track.stop());
            }

            exitFullscreen();
        };
    }, []);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (!isOnline) {
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

            const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
            setAudioStream(mic);
            setMediaAllowed(true);

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

    const fetchProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
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

            const { data, error } = await supabase
                .from("exam_questions")
                .select("*")
                .eq("paper_id", paper_id);

            if (error) console.error("Error fetching questions:", error.message);
            else setQuestions(data ?? []);

            setSelectedPaper({ id: paper_id, title: "Test Paper" });

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
    }, [isDark]);

    // ===== Auto-submit if fullscreen is exited =====
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
    }, [selectedPaper, isSubmitting]);

    // Confirm before leaving
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

    useEffect(() => {
        return () => {
            cameraStream?.getTracks().forEach((t) => t.stop());
            audioStream?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    useEffect(() => {
        if (!selectedPaper || !mediaAllowed) return;

        const isElectron = !!(window as any).electronAPI;

        if (isElectron) {
            console.log('🔒 Starting exam mode with full lockdown');
            (window as any).electronAPI.startExam();

            (window as any).electronAPI.onEscapePressed(() => {
                alert('⚠️ ESC key is disabled during exam. Please continue with your assessment.');
            });

            (window as any).electronAPI.onBlockedClose(() => {
                alert('⚠️ Cannot close during active exam. Please submit your answers first.');
            });
        }

        return () => {
            if (isElectron && (window as any).electronAPI) {
                (window as any).electronAPI.endExam();
                (window as any).electronAPI.removeListeners();
            }
        };
    }, [selectedPaper, mediaAllowed]);

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

            let { data: session, error } = await supabase
                .from("exam_sessions")
                .select("*")
                .eq("user_id", userId)
                .eq("paper_id", paperId)
                .eq("status", "started")
                .single();

            if (error && error.code !== "PGRST116") throw error;

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

            setExamSession(session);
            localStorage.setItem(`exam-session-${paperId}`, session.id);

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
                    setTimerReady(true);
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

    // ============================================================
    // BRANDED PDF — no borders, professional look, logo, brand colors
    // ============================================================
    const generatePDF = async (profileOverride?: any) => {
        const doc = new jsPDF({ unit: "mm", format: "a4" });

        const pageWidth = doc.internal.pageSize.getWidth();   // ~210
        const pageHeight = doc.internal.pageSize.getHeight(); // ~297

        const brandBlue: [number, number, number] = [37, 99, 235];   // #2563EB
        const brandRed: [number, number, number] = [220, 38, 38];    // #DC2626
        const slateDark: [number, number, number] = [15, 23, 42];    // #0F172A
        const slateMid: [number, number, number] = [100, 116, 139];  // #64748B
        const slateLight: [number, number, number] = [241, 245, 249]; // #F1F5F9
        const greenAccent: [number, number, number] = [22, 163, 74];  // #16A34A

        const receiptNumber = `MED-${Date.now().toString().slice(-8)}`;
        const generatedAt = new Date().toLocaleString();

        const correctCount = questions.reduce((count, q) => {
            const userAnswer = answers[q.id];
            if (!userAnswer) return count;
            return userAnswer === q.correct_answer ? count + 1 : count;
        }, 0);

        const totalQuestions = questions.length;
        const percentageScore =
            totalQuestions > 0
                ? ((correctCount / totalQuestions) * 100).toFixed(2)
                : "0.00";

        const profileData =
            profileOverride ||
            profile ||
            (typeof window !== "undefined"
                ? JSON.parse(localStorage.getItem("profile") || "null")
                : null);

        // ============================================================
        // HEADER
        // ============================================================
        doc.setFillColor(...brandBlue);
        doc.rect(0, 0, pageWidth, 32, "F");

        try {
            doc.addImage("/pwa-512x512.png", "PNG", 14, 9, 14, 14);
        } catch (e) {
            console.warn("Logo not embedded in PDF:", e);
        }

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("MEDRAE", 32, 17);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Kenya Nursing Platform", 32, 23);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(`Receipt No: ${receiptNumber}`, pageWidth - 14, 15, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`Generated: ${generatedAt}`, pageWidth - 14, 21, { align: "right" });

        // ============================================================
        // TITLE BLOCK (Medrae red + Nursing black)
        // ============================================================
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...brandRed);
        const medraeWidth = doc.getTextWidth("Medrae ");

        doc.setTextColor(...slateDark);
        const nursingWidth = doc.getTextWidth("Nursing");

        const totalTitleWidth = medraeWidth + nursingWidth;
        const titleStartX = (pageWidth - totalTitleWidth) / 2;
        const titleY = 46;

        doc.setTextColor(...brandRed);
        doc.text("Medrae ", titleStartX, titleY);
        doc.setTextColor(...slateDark);
        doc.text("Nursing", titleStartX + medraeWidth, titleY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...slateMid);
        doc.text(
            "Official Exam Participation Receipt",
            pageWidth / 2,
            titleY + 6,
            { align: "center" }
        );

        doc.setDrawColor(...slateLight);
        doc.setLineWidth(0.5);
        doc.line(20, titleY + 10, pageWidth - 20, titleY + 10);

        // ============================================================
        // CANDIDATE INFO — two-column label / value table
        // ============================================================
        autoTable(doc, {
            startY: titleY + 16,
            theme: "plain",
            margin: { left: 20, right: 20 },
            styles: {
                font: "helvetica",
                fontSize: 9,
                cellPadding: 2.2,
                textColor: slateDark,
                lineColor: [255, 255, 255],
                lineWidth: 0,
            },
            columnStyles: {
                0: { cellWidth: 45, textColor: slateMid, fontStyle: "bold" },
                1: { cellWidth: "auto" },
            },
            body: [
                ["Candidate Name", profileData?.name || "N/A"],
                ["Email", profileData?.email || "N/A"],
                ["Institution", profileData?.institution || "N/A"],
                ["Course", profileData?.course || "N/A"],
                ["County", profileData?.county || "N/A"],
                ["Phone", profileData?.phone || "N/A"],
                ["Subscription", profileData?.subscription || "N/A"],
                ["Role", profileData?.role || "N/A"],
            ],
        });

        // @ts-ignore
        let afterInfoY = (doc as any).lastAutoTable?.finalY || titleY + 60;
        afterInfoY += 6;

        // ============================================================
        // EXAM SUMMARY CARD
        // ============================================================
        const cardX = 20;
        const cardW = pageWidth - 40;
        const cardH = 32;

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(cardX, afterInfoY, cardW, cardH, 2, 2, "F");

        doc.setFillColor(...brandBlue);
        doc.rect(cardX, afterInfoY, 2.5, cardH, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...slateMid);
        doc.text("PAPER", cardX + 8, afterInfoY + 7);
        doc.text("SESSION", cardX + 8, afterInfoY + 14);
        doc.text("SCORE", cardX + 8, afterInfoY + 21);
        doc.text("PERCENTAGE", cardX + 8, afterInfoY + 28);

        doc.setFontSize(9);
        doc.setTextColor(...slateDark);
        doc.setFont("helvetica", "normal");
        doc.text(`${selectedPaper?.title || "N/A"}`, cardX + 40, afterInfoY + 7);
        doc.text(`${selectedSession || "N/A"}`, cardX + 40, afterInfoY + 14);
        doc.setFont("helvetica", "bold");
        doc.text(`${correctCount} / ${totalQuestions}`, cardX + 40, afterInfoY + 21);

        // Percentage badge
        const pctColor =
            parseFloat(percentageScore) >= 50 ? greenAccent : brandRed;

        doc.setFillColor(...pctColor);
        doc.roundedRect(cardX + cardW - 38, afterInfoY + 15, 30, 12, 2, 2, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(
            `${percentageScore}%`,
            cardX + cardW - 23,
            afterInfoY + 23,
            { align: "center" }
        );

        let yPos = afterInfoY + cardH + 8;

        // ============================================================
        // CERTIFICATION STATEMENT
        // ============================================================
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...slateDark);
        doc.text("Certification of Participation", 20, yPos);
        yPos += 2;

        doc.setDrawColor(...slateLight);
        doc.setLineWidth(0.4);
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...slateDark);

        const statement = `This document certifies that the above candidate accessed and participated in the listed examination session on the Medrae Kenya Nursing Platform (MKN). This receipt confirms exam participation only and does not represent the final exam result or academic grading.

For more detailed resources, practice questions, and interactive learning, visit MEDRAE at https://medrae.vercel.app or call us at 0704473503 or 0717517371.

Keep striving — each step you take strengthens your nursing expertise and prepares you for success!`;

        const splitStatement = doc.splitTextToSize(statement, pageWidth - 40);
        const lineHeight = 4.6;

        for (let i = 0; i < splitStatement.length; i++) {
            if (yPos > pageHeight - 40) {
                doc.addPage();
                doc.setFillColor(...brandBlue);
                doc.rect(0, 0, pageWidth, 8, "F");
                yPos = 20;
            }
            doc.text(splitStatement[i], 20, yPos);
            yPos += lineHeight;
        }

        // ============================================================
        // SIGNATURE BLOCK
        // ============================================================
        yPos += 14;
        if (yPos > pageHeight - 40) {
            doc.addPage();
            doc.setFillColor(...brandBlue);
            doc.rect(0, 0, pageWidth, 8, "F");
            yPos = 30;
        }

        doc.setDrawColor(...slateMid);
        doc.setLineWidth(0.3);

        // Left signature
        doc.line(20, yPos, 90, yPos);
        doc.setFontSize(8);
        doc.setTextColor(...slateMid);
        doc.text("Authorized Platform Verification", 20, yPos + 4);

        // Right signature
        doc.line(pageWidth - 90, yPos, pageWidth - 20, yPos);
        doc.text("Digital System Stamp", pageWidth - 90, yPos + 4);

        // ============================================================
        // FOOTER (every page)
        // ============================================================
        const pageCount = doc.internal.getNumberOfPages();

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);

            doc.setDrawColor(...slateLight);
            doc.setLineWidth(0.4);
            doc.line(20, pageHeight - 16, pageWidth - 20, pageHeight - 16);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(...brandRed);
            doc.text("Medrae", 20, pageHeight - 10);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(...slateDark);
            doc.text(" Nursing", 20 + doc.getTextWidth("Medrae"), pageHeight - 10);

            doc.setTextColor(...slateMid);
            doc.setFontSize(8);
            doc.text(
                `Page ${i} of ${pageCount}`,
                pageWidth - 20,
                pageHeight - 10,
                { align: "right" }
            );
            doc.text(
                "medrae.vercel.app",
                pageWidth / 2,
                pageHeight - 10,
                { align: "center" }
            );
        }

        doc.save("Medrae_Nursing_Exam_Receipt.pdf");
    };

    // ============================================================
    // DONE PANEL — flat, no borders, working submit button
    // ============================================================
    if (showDonePanel) {
        const answered = questions.filter((q) => answers[q.id]);
        const unanswered = questions.filter((q) => !answers[q.id]);
        const flaggedQs = questions.filter((q) => flags.includes(q.id));
        const skippedQs = questions.filter((q) => skipped.includes(q.id));

        const correctCount = questions.reduce((count, q) => {
            const userAnswer = answers[q.id];
            if (!userAnswer) return count;
            return userAnswer === q.correct_answer ? count + 1 : count;
        }, 0);

        const totalQuestions = questions.length;
        const percentageScore = totalQuestions > 0 ? ((correctCount / totalQuestions) * 100).toFixed(2) : "0";

        return (
            <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-background px-2 py-4 md:px-4 md:py-8 font-sans">
                <div className="max-w-4xl mx-auto space-y-5 md:space-y-8">

                    {/* HEADER */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-blue-600 font-bold tracking-widest uppercase text-[10px] mb-1">
                                <FileCheck className="w-4 h-4" /> Final Audit Phase
                            </div>
                            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                Review Before You{" "}
                                <span className={pendingAction === "submit" ? "text-green-600" : "text-rose-600"}>
                                    {pendingAction === "submit" ? "Submit" : "Reset"}
                                </span>
                            </h2>
                            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-2xl">
                                {pendingAction === "submit"
                                    ? "Review your responses. Once submitted, your attempt is timestamped and locked."
                                    : "You are about to clear all progress. This action is recorded and cannot be undone."}
                            </p>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={isSubmitting}
                            className="rounded-xl border-0 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                            onClick={() => {
                                if (isSubmitting) return;
                                setShowDonePanel(false);
                                setPendingAction(null);
                            }}
                        >
                            <X className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                    </div>

                    {/* SCORE PREVIEW (submit only) */}
                    {pendingAction === "submit" && (
                        <div className="bg-white dark:bg-muted/30 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-4 border-blue-500 flex items-center justify-center font-black text-blue-600 text-sm md:text-base">
                                    {percentageScore}%
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                                        Score Preview
                                    </h3>
                                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                                        Based on your current responses
                                    </p>
                                </div>
                            </div>
                            <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                                {correctCount}{" "}
                                <span className="text-slate-300 dark:text-slate-600">/</span>{" "}
                                {totalQuestions} Questions
                            </div>
                        </div>
                    )}

                    {/* AUDIT GRID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
                        <AuditCard
                            title="Answered"
                            count={answered.length}
                            icon={<CheckCircle2 className="w-4 h-4" />}
                            color="green"
                            list={answered}
                            answers={answers}
                        />
                        <AuditCard
                            title="Remaining"
                            count={unanswered.length}
                            icon={<HelpCircle className="w-4 h-4" />}
                            color="rose"
                            list={unanswered}
                        />
                        <AuditCard
                            title="Flagged"
                            count={flaggedQs.length}
                            icon={<Flag className="w-4 h-4" />}
                            color="amber"
                            list={flaggedQs}
                        />
                        <AuditCard
                            title="Skipped"
                            count={skippedQs.length}
                            icon={<SkipForward className="w-4 h-4" />}
                            color="blue"
                            list={skippedQs}
                        />
                    </div>

                    {/* ACTION BUTTON — centered, spinner while submitting */}
                    <div className="flex justify-center pt-2">
                        <Button
                            size="lg"
                            disabled={isSubmitting}
                            className={`w-full md:w-auto md:min-w-[320px] h-14 md:h-16 px-8 rounded-2xl text-base md:text-lg font-bold transition-all border-0 ${isSubmitting
                                ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                                : pendingAction === "submit"
                                    ? "bg-blue-600 hover:bg-green-600 text-white"
                                    : "bg-rose-600 hover:bg-rose-700 text-white"
                                }`}
                            onClick={() => {
                                if (isSubmitting) return;
                                if (pendingAction === "submit") confirmSubmit();
                                if (pendingAction === "reset") resetNow();
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <RefreshCw className="mr-2 w-5 h-5 animate-spin" />
                                    {pendingAction === "submit"
                                        ? "Submitting & Generating PDF..."
                                        : "Resetting..."}
                                </>
                            ) : pendingAction === "submit" ? (
                                <>
                                    <FileCheck className="mr-2 w-5 h-5" />
                                    Confirm Final Submission
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="mr-2 w-5 h-5" />
                                    Confirm Permanent Reset
                                </>
                            )}
                        </Button>
                    </div>

                    {/* MARQUEE */}
                    <div className="relative mt-6 md:mt-10 py-4 md:py-6 overflow-hidden">
                        <div className="flex justify-center">
                            <div className="flex items-center gap-6 whitespace-nowrap animate-marquee-slow">
                                {[1, 2, 3].map((i) => (
                                    <span
                                        key={i}
                                        className="flex items-center gap-2 text-slate-400 text-xs md:text-sm font-medium"
                                    >
                                        🌟 Your commitment to academic integrity is appreciated. Good luck. 🌟
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        );
    }

    // Sub-component for audit cards (flat, no borders)
    function AuditCard({ title, count, icon, color, list, answers }: any) {
        const colorMap: any = {
            green: {
                header: "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400",
                badge: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
            },
            rose: {
                header: "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400",
                badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
            },
            amber: {
                header: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400",
                badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
            },
            blue: {
                header: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400",
                badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
            },
        };

        return (
            <Card className="border-0 shadow-none rounded-2xl overflow-hidden bg-white dark:bg-muted/30 flex flex-col">
                <CardHeader className={`${colorMap[color].header} py-3 px-4 rounded-t-2xl`}>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                            {icon} {title}
                        </div>
                        <span
                            className={`${colorMap[color].badge} px-2 py-0.5 rounded-full text-xs font-bold`}
                        >
                            {count}
                        </span>
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                    <ScrollArea className="h-40 md:h-48 p-3 custom-scrollbar">
                        <ul className="space-y-2.5">
                            {list.map((q: any, i: number) => (
                                <li key={q.id} className="text-[11px] leading-tight group">
                                    <span className="font-bold text-slate-400 mr-1">
                                        Q{i + 1}
                                    </span>
                                    <span className="text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                        {q.question_text.slice(0, 45)}...
                                    </span>
                                    {answers && answers[q.id] && (
                                        <div className="mt-1 text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded px-1.5 py-0.5 inline-block">
                                            {answers[q.id]}
                                        </div>
                                    )}
                                </li>
                            ))}
                            {list.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-24 md:h-32 opacity-30 italic text-xs text-slate-400">
                                    No items recorded
                                </div>
                            )}
                        </ul>
                    </ScrollArea>
                </CardContent>
            </Card>
        );
    }

    // Loading
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
            <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground grid md:grid-cols-3 grid-cols-1 gap-4 md:gap-6 px-2 py-4 md:p-8 hide-scrollbar">

                {/* LEFT COLUMN - Question and Controls */}
                <div className="md:col-span-2 space-y-3 md:space-y-4">
                    <Card className="min-h-[300px] md:min-h-[400px] bg-white dark:bg-gray-900 border-0 shadow-none rounded-2xl">
                        <CardHeader className="p-3 md:p-6">
                            <CardTitle className="text-sm md:text-base">
                                Question {currentIndex + 1} of {questions.length}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 md:p-6 space-y-3 md:space-y-4">
                            <p className="font-barlow text-sm md:text-base leading-relaxed">{currentQuestion.question_text}</p>
                            <div className="flex flex-col gap-2 md:gap-3">
                                {["A", "B", "C", "D"].map((opt) => {
                                    const isSelected = answers[currentQuestion.id] === opt;
                                    return (
                                        <div
                                            key={opt}
                                            onClick={() => handleAnswer(opt)}
                                            className="flex items-start gap-2 md:gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                        >
                                            <div
                                                className={`
                                                    w-4 h-4 md:w-5 md:h-5 flex-shrink-0 rounded-full border-2 mt-0.5
                                                    transition-colors duration-200
                                                    ${isSelected ? "bg-blue-500 border-blue-500" : "bg-white border-gray-400 dark:bg-black dark:border-gray-500"}
                                                `}
                                            ></div>
                                            <span className="whitespace-normal font-barlow text-sm md:text-base leading-relaxed">
                                                {currentQuestion[`option_${opt.toLowerCase()}`]}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Navigation Buttons */}
                    <div className="flex flex-wrap justify-center gap-1.5 md:gap-2">
                        <Button onClick={goPrev} disabled={currentIndex === 0} size="sm" className="text-xs md:text-sm px-3 md:px-4 border-0">
                            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" /> Previous
                        </Button>
                        <Button variant="outline" onClick={handleFlag} size="sm" className="text-xs md:text-sm px-3 md:px-4 border-0 bg-slate-100 dark:bg-slate-800">
                            <Flag className="w-4 h-4 md:w-5 md:h-5" /> Flag
                        </Button>
                        <Button variant="ghost" onClick={handleSkip} size="sm" className="text-xs md:text-sm px-3 md:px-4 border-0">
                            Skip <CornerRightDown className="w-4 h-4 md:w-5 md:h-5" />
                        </Button>
                        <Button onClick={goNext} disabled={currentIndex === questions.length - 1} size="sm" className="text-xs md:text-sm px-3 md:px-4 border-0">
                            Next <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                        </Button>
                        <Button variant="default" onClick={handleSubmit} disabled={currentIndex !== questions.length - 1 || isSubmitting || isNavigating} size="sm" className="text-xs md:text-sm px-3 md:px-4 border-0">
                            {isSubmitting ? "Submitting..." : "Submit"}
                        </Button>
                    </div>

                    {/* Skipped/Flagged Quick Jump */}
                    <div className="flex justify-center gap-2 md:gap-4">
                        <Button size="sm" variant="secondary" disabled={skipped.length === 0} onClick={() => { if (skipped.length > 0) jumpTo(questions.findIndex((q) => q.id === skipped[0])); }} className="text-[10px] md:text-xs border-0">
                            Skipped ({skipped.length})
                        </Button>
                        <Button size="sm" variant="destructive" disabled={flags.length === 0} onClick={() => { if (flags.length > 0) jumpTo(questions.findIndex((q) => q.id === flags[0])); }} className="text-[10px] md:text-xs border-0">
                            Flagged ({flags.length})
                        </Button>
                    </div>

                    {/* Media Controls */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <div className="flex-1 min-w-[100px] md:min-w-[150px]">
                            <ExamProctor videoStream={cameraStream} sessionId={examSession?.id ?? null} paperId={paper_id} />
                        </div>
                        <div className="w-20 h-16 md:w-32 md:h-28 rounded-lg overflow-hidden relative flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                            <canvas ref={canvasRef} width={128} height={96} className="w-full h-full" />
                            {loudWarning && (
                                <span className="absolute top-0.5 left-0.5 text-[6px] md:text-xs text-red-600 font-bold bg-white px-1 rounded">
                                    Loud
                                </span>
                            )}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => initMedia(true)} className="text-[10px] md:text-xs px-2 md:px-3 border-0 bg-slate-100 dark:bg-slate-800">
                            <RefreshCw className="w-3 h-3 md:w-4 md:h-4 mr-1" /> Reset
                        </Button>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-2 md:space-y-3">
                    {/* Timer Card */}
                    <Card className="bg-transparent text-foreground dark:text-gray-100 shadow-none border-0 rounded-none p-1 md:p-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 md:gap-2">
                                <img src="/pwa-192x192.jpeg" alt="Medrae Logo" className="h-4 w-4 md:h-6 md:w-6 rounded-sm object-contain" />
                                <p className="text-[10px] md:text-sm font-semibold text-blue-700 dark:text-blue-400">
                                    Medrae Self-Test
                                </p>
                            </div>
                            <div className="flex items-center gap-1 md:gap-2">
                                <Clock className="w-3 h-3 md:w-5 md:h-5 text-green-600" />
                                <span className="text-base md:text-2xl font-bold">{formatTime(timeLeft)}</span>
                            </div>
                        </div>
                        <p className="text-[8px] md:text-sm text-muted-foreground text-center mt-0.5 md:mt-1">
                            {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                    </Card>

                    {/* Questions Grid */}
                    <Card className="bg-transparent text-foreground dark:text-gray-100 shadow-none border-0">
                        <div className="flex items-center justify-between mb-1 md:mb-2">
                            <span className="text-[10px] md:text-sm font-bold">Questions</span>
                            <Button size="sm" variant="ghost" onClick={resetAnswers} className="text-[8px] md:text-xs border-0">
                                Reset
                            </Button>
                        </div>
                        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-1 md:gap-2">
                            {questions.map((q, i) => (
                                <Button
                                    key={q.id}
                                    size="sm"
                                    variant={currentIndex === i ? "default" : answers[q.id] ? "secondary" : flags.includes(q.id) ? "destructive" : "outline"}
                                    onClick={() => jumpTo(i)}
                                    className="h-7 w-7 md:h-10 md:w-10 text-[10px] md:text-sm p-0 border-0"
                                >
                                    {i + 1}
                                </Button>
                            ))}
                        </div>
                    </Card>

                    {/* Marquee */}
                    <div className="w-full overflow-hidden pt-1 md:pt-3 border-0">
                        <div className="flex w-max animate-marquee-slow">
                            <span className="whitespace-nowrap text-[10px] md:text-lg font-semibold tracking-wide text-foreground pr-4 md:pr-12">
                                Exam Mode • Stay Focused • Good Luck!
                            </span>
                            <span className="whitespace-nowrap text-[10px] md:text-lg font-semibold tracking-wide text-foreground pr-4 md:pr-12">
                                Exam Mode • Stay Focused • Good Luck!
                            </span>
                        </div>
                    </div>
                </div>

                {/* Media Permission Overlay */}
                <AnimatePresence>
                    {!mediaAllowed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-white dark:bg-black z-[100] flex flex-col items-center justify-center p-4 overflow-y-auto"
                        >
                            <div className="w-full max-w-md space-y-3 md:space-y-4">
                                <div className="flex justify-start">
                                    <Link to="/dashboard">
                                        <Button variant="outline" size="sm" className="text-xs border-0 bg-slate-100 dark:bg-slate-800">
                                            <Home className="w-3 h-3 mr-1" /> Exit
                                        </Button>
                                    </Link>
                                </div>

                                <div className="text-center space-y-2">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[8px] md:text-[10px] font-black uppercase tracking-widest border-0">
                                        <ShieldAlert className="w-3 h-3" /> Security Protocol
                                    </div>
                                    <h2 className="text-xl md:text-3xl font-extrabold tracking-tight">
                                        Device <span className="text-blue-600 dark:text-blue-400">Access</span>
                                    </h2>
                                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                                        Allow camera and microphone access to begin your exam.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 md:gap-3">
                                    <Button onClick={async () => { try { const cam = await navigator.mediaDevices.getUserMedia({ video: true }); setCameraStream(cam); if (videoRef.current) videoRef.current.srcObject = cam; } catch (err) { console.log("Camera not available"); } }} className={`h-10 md:h-14 text-xs md:text-sm border-0 ${cameraStream ? 'bg-green-600' : 'bg-blue-600'}`}>
                                        <Video className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                                        {cameraStream ? "Camera On" : "Camera"}
                                    </Button>
                                    <Button onClick={async () => { try { const mic = await navigator.mediaDevices.getUserMedia({ audio: true }); setAudioStream(mic); } catch (err) { console.log("Mic not available"); } }} className={`h-10 md:h-14 text-xs md:text-sm border-0 ${audioStream ? 'bg-green-600' : 'bg-blue-600'}`}>
                                        <Mic className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                                        {audioStream ? "Mic On" : "Microphone"}
                                    </Button>
                                </div>

                                <Button className="w-full h-10 md:h-14 bg-slate-900 hover:bg-black text-white font-bold text-xs md:text-sm border-0" onClick={() => { enterFullscreen(); setMediaAllowed(true); }}>
                                    <Unlock className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> Start Exam
                                </Button>

                                <div className="flex justify-center gap-4 text-[8px] md:text-[10px] font-bold text-gray-500 uppercase">
                                    <span className={`flex items-center gap-1 ${cameraStream ? 'text-green-600' : 'text-gray-400'}`}>
                                        <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${cameraStream ? 'bg-green-600' : 'bg-gray-300'}`} /> Camera
                                    </span>
                                    <span className={`flex items-center gap-1 ${audioStream ? 'text-green-600' : 'text-gray-400'}`}>
                                        <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${audioStream ? 'bg-green-600' : 'bg-gray-300'}`} /> Mic
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}