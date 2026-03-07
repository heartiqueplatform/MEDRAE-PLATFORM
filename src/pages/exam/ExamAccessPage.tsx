"use client";
import { Link } from "react-router-dom";
import { Sun, Moon, RefreshCw, ChevronLeft, ChevronRight, CornerRightDown, Flag, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { motion } from "framer-motion";
const totalDuration = 60 * 60;

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
    const [timeLeft, setTimeLeft] = useState(totalDuration);
    const [showDonePanel, setShowDonePanel] = useState(false);
    const [pendingAction, setPendingAction] = useState<"submit" | "reset" | null>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const localKey = selectedPaper?.id ? `sim-answers-${selectedPaper.id}` : "";
    const timerKey = selectedPaper?.id ? `sim-timer-${selectedPaper.id}` : "";
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

        const fetchQuestions = async () => {
            setLoading(true);

            const { data, error } = await supabase
                .from("exam_questions")
                .select("*")
                .eq("paper_id", paper_id);

            if (error) {
                console.error("Error fetching exam questions:", error.message);
            } else {
                setQuestions(data ?? []);
                setSelectedPaper({ id: paper_id, title: "Test Paper" });
            }

            setLoading(false);
        };

        fetchQuestions();
    }, [paper_id]);
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
    }, [selectedPaper]);


    // Timer
    useEffect(() => {
        if (!selectedPaper) return;
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    alert("Time's up! Auto-submitting...");
                    confirmSubmit();
                }
                const newTime = prev - 1;
                localStorage.setItem(timerKey, newTime.toString());
                return newTime;

            });
        }, 1000);
        return () => clearInterval(interval);
    }, [selectedPaper]);

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

            return session;
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
                        duration_seconds: totalDuration - timeLeft,
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

            const footerText1 = "MEDRAE • Stop Guessing. Start Passing.";
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
            <div className="p-6 space-y-6 bg-background text-foreground dark:bg-gray-900 dark:text-gray-100 min-h-screen  ">
                <h2 className="text-2xl font-semibold">
                    Review Before You {pendingAction === "submit" ? "Submit" : "Reset"}
                </h2>

                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    Every challenge you face is an opportunity to grow and refine your knowledge. Take a moment to
                    reflect on your progress, celebrate the answers you have mastered, and view the areas you can
                    improve as stepping stones toward mastery. Remember, true learning is not only about the final
                    score but the effort, perseverance, and insight gained along the way. Embrace this moment with
                    confidence, curiosity, and the unwavering belief that each step forward strengthens your
                    professional journey.
                </p>

                {pendingAction === "submit" && (
                    <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400">
                        Your Score Preview: {correctCount}/{questions.length} ({percentageScore}%)
                    </h3>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Answered */}
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <h3 className="font-bold text-lg mb-2 text-green-700 dark:text-green-400">
                            Answered Questions ({answered.length})
                        </h3>
                        <ul className="list-disc list-inside text-sm space-y-1 max-h-40 overflow-y-auto">
                            {answered.map((q, i) => (
                                <li key={q.id}>
                                    Q{i + 1}: {q.question_text.slice(0, 50)}... – <strong>{answers[q.id]}</strong>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Unanswered */}
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <h3 className="font-bold text-lg mb-2 text-red-600 dark:text-red-400">
                            Unanswered Questions ({unanswered.length})
                        </h3>
                        <ul className="list-disc list-inside text-sm space-y-1 max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent">

                            {unanswered.map((q, i) => (
                                <li key={q.id}>Q{i + 1}: {q.question_text.slice(0, 50)}...</li>
                            ))}
                        </ul>
                    </div>

                    {/* Flagged */}
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <h3 className="font-bold text-lg mb-2 text-yellow-600 dark:text-yellow-400">
                            Flagged ({flaggedQs.length})
                        </h3>
                        <ul className="list-disc list-inside text-sm space-y-1 max-h-40 overflow-y-auto">
                            {flaggedQs.map((q, i) => (
                                <li key={q.id}>Q{i + 1}: {q.question_text.slice(0, 50)}...</li>
                            ))}
                        </ul>
                    </div>

                    {/* Skipped */}
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <h3 className="font-bold text-lg mb-2 text-blue-600 dark:text-blue-400">
                            ⏭ Skipped ({skippedQs.length})
                        </h3>
                        <ul className="list-disc list-inside text-sm space-y-1 max-h-40 overflow-y-auto">
                            {skippedQs.map((q, i) => (
                                <li key={q.id}>Q{i + 1}: {q.question_text.slice(0, 50)}...</li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                    <Button
                        className="flex-1 bg-blue-600 text-white hover:bg-green-600 dark:bg-blue-500 dark:hover:bg-green-500 transition-colors"
                        onClick={() => {
                            if (pendingAction === "submit") confirmSubmit();
                            if (pendingAction === "reset") resetNow();
                        }}
                    >
                        Confirm {pendingAction === "submit" ? "Submit & Generate PDF" : "Reset Answers"}
                    </Button>

                    <Button
                        variant="ghost"
                        className="flex-1"
                        onClick={() => {
                            setShowDonePanel(false);
                            setPendingAction(null);
                        }}
                    >
                        Cancel Request
                    </Button>
                </div>

                {/* Thank You Marquee — centered */}
                <div className="w-full h-16 flex items-center justify-center overflow-hidden border-t border-border">
                    <div className="whitespace-nowrap animate-marquee-slow text-lg md:text-xl font-semibold tracking-wide text-foreground">
                        🌟 Thank you for choosing our website! We appreciate your trust and commitment to learning! 🌟
                    </div>
                </div>

            </div>
        );
    }

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
        <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground grid md:grid-cols-3 grid-cols-1 gap-6 p-8">
            <div className="md:col-span-2 space-y-4">

                <Card className="min-h-[400px] bg-white dark:bg-gray-900 border border-0 shadow-sm rounded-xl">
                    <CardHeader>
                        <CardTitle>
                            Question {currentIndex + 1} of {questions.length}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-base">{currentQuestion.question_text}</p>
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
                                        <span className="whitespace-normal">{currentQuestion[`option_${opt.toLowerCase()}`]}</span>
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


            {!mediaAllowed && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-40 flex items-center justify-center">
                    <div className="text-center space-y-6">
                        {/* HOME BUTTON TOP LEFT */}
                        <div className="absolute top-4 left-4">
                            <Link to="/dashboard">
                                <motion.button
                                    initial={false}
                                    whileHover={{ scale: 1.05 }}
                                    className="px-4 py-2 border border-gray-400 rounded-xl text-white hover:bg-green-500 hover:text-white transition-all duration-300 shadow-md"
                                >
                                    Go to My Dashboard
                                </motion.button>
                            </Link>
                        </div>
                        <h2 className="text-white text-2xl font-bold">Camera & Mic Disabled</h2>
                        <p className="text-gray-300">
                            Double Click below to enable camera and microphone to start your Exam.
                            <br />
                            ⚠️ Pressing <strong>ESC</strong> at any time will immediately end and submit the Exam.
                        </p>


                        <div className="flex flex-col gap-4">
                            {/* Camera Button */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                animate={
                                    cameraStream
                                        ? { scale: [1, 1.05, 1], boxShadow: ["0 0 0px #10b981", "0 0 20px #10b981", "0 0 0px #10b981"] }
                                        : { opacity: [0.8, 1, 0.8] }
                                }
                                transition={{ repeat: Infinity, duration: 2 }}
                                onClick={async () => {
                                    try {
                                        const cam = await navigator.mediaDevices.getUserMedia({ video: true });
                                        setCameraStream(cam);
                                        if (videoRef.current) videoRef.current.srcObject = cam;
                                    } catch (err) {
                                        console.error("Camera blocked", err);
                                    }
                                }}
                                className={`block mx-auto w-64 px-3 py-1.5 rounded-3xl font-semibold shadow-lg transition-colors
    ${cameraStream ? 'bg-green-500 text-white hover:bg-purple-600' : 'bg-background text-foreground hover:bg-accent hover:text-accent-foreground'}`}
                            >
                                Double Click to Enable camera
                            </motion.button>
                            {/* Mic Button */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                animate={
                                    audioStream
                                        ? { scale: [1, 1.05, 1], boxShadow: ["0 0 0px #10b981", "0 0 20px #10b981", "0 0 0px #10b981"] }
                                        : { opacity: [0.8, 1, 0.8] }
                                }
                                transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                                onClick={async () => {
                                    try {
                                        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
                                        setAudioStream(mic);

                                        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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

                                                let color = "#ac0e97ff"; // Tailwind green-500
                                                if (barHeight > 40 && barHeight <= 80) color = "#3b82f6"; // blue-500
                                                if (barHeight > 80) color = "#ef4444"; // red-500

                                                canvasCtx.fillStyle = color;
                                                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                                                x += barWidth + 1;
                                            }

                                            setLoudWarning(maxVolume > 150);
                                        };

                                        draw();
                                    } catch (err) {
                                        console.error("Mic blocked", err);
                                    }
                                }}
                                className={`block mx-auto w-64 px-3 py-1.5 rounded-3xl font-semibold shadow-lg transition-colors
    ${audioStream ? 'bg-green-500 text-white hover:bg-blue-600' : 'bg-background text-foreground hover:bg-accent hover:text-accent-foreground'}`}
                            >
                                Enable mic
                            </motion.button>


                            {/* Final Start Button */}
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                animate={
                                    cameraStream && audioStream
                                        ? { scale: [1, 1.05, 1], boxShadow: ["0 0 0px #fff", "0 0 20px #10b981", "0 0 0px #fff"] }
                                        : {}
                                }
                                transition={{ repeat: Infinity, duration: 2 }}
                                disabled={!cameraStream || !audioStream}
                                onClick={() => {
                                    // Play start sound
                                    const audio = new Audio("/sounds/start.mp3");
                                    audio.play().catch(() => { });

                                    // Enter fullscreen (user gesture required)
                                    enterFullscreen();

                                    // Allow exam to start
                                    setMediaAllowed(true);
                                }}

                                className={`block mx-auto w-64 px-3 rounded-3xl py-1.5 font-semibold shadow-lg transition-colors
    ${cameraStream && audioStream ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-background text-foreground hover:bg-accent hover:text-accent-foreground'}`}
                            >
                                Hey, I'm ready to start!
                            </motion.button>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
