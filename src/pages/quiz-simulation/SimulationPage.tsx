"use client";
import { Link } from "react-router-dom";
import {
  Sun, Moon, FileText, RefreshCw, Lock, RotateCcw, LayoutDashboard, Crown, Zap,
  Unlock, ChevronLeft, ChevronRight, CornerRightDown, Flag, Clock,
  CheckCircle,
  Home,
  ShieldAlert,
  Video,
  Mic,
  Sparkles,
  ArrowLeft,
  GraduationCap
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import React from 'react';
import {
  CheckCircle2,
  XCircle,
  FastForward,
  AlertCircle,
  FileCheck,
  X,
  Trophy,
  ArrowRight
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlobalLoader } from "@/components/GlobalLoader";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AnimatePresence, motion } from "framer-motion";

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

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function SimulationPage() {
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

  // ── Mobile gate: now only fires when a paper is actually started ──
  const [isLaptop, setIsLaptop] = useState(true);
  const [showMobileBlock, setShowMobileBlock] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsLaptop(window.innerWidth >= 1000);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [paperList, setPaperList] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("sim-papers");
      if (cached) return JSON.parse(cached);
    }
    return [];
  });

  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<any | null>(null);
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
  const [showPremiumOverlay, setShowPremiumOverlay] = useState(false);
  const [selectedPaperForOverlay, setSelectedPaperForOverlay] = useState<any>(null);
  const [userRole, setUserRole] = useState<"student" | "tutor" | "staff" | null>(null);
  const [isTutor, setIsTutor] = useState(false);
  const currentQuestion = questions?.[currentIndex] ?? null;
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loudWarning, setLoudWarning] = useState(false);
  const [mediaAllowed, setMediaAllowed] = useState(false);

  const TUTOR_SIMULATION_SUBSCRIPTION = {
    price: 1999,
    duration: "2 months",
    currency: "KES",
    features: [
      "Full access to all simulation papers",
      "NCK-aligned examination format",
      "Detailed performance analytics",
      "PDF certificate generation",
      "Institutional exam creation",
      "Free job posting across our site",
      "Priority support"
    ]
  };

  const STUDENT_SIMULATION_SUBSCRIPTION = {
    price: 399,
    duration: "2 months",
    currency: "KES",
    features: [
      "Full access to all simulation papers",
      "NCK-aligned examination format",
      "Detailed performance analytics",
      "PDF certificate generation",
      "Proctorium Lite exam interface",
      "Progress tracking"
    ]
  };

  const [profile, setProfile] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const cachedProfile = localStorage.getItem("profile");
      return cachedProfile ? JSON.parse(cachedProfile) : null;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

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

    // ── Fetch the real profile right before generating the PDF ──
    let freshProfile: any = null;
    if (userId) {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, email, institution, course, county, phone, subscription, role")
        .eq("user_id", userId)
        .single();

      if (!error && data) {
        freshProfile = data;
        // Cache it under BOTH keys so nothing else in the app goes stale
        localStorage.setItem("profile", JSON.stringify(data));
        localStorage.setItem("userProfile", JSON.stringify(data));
        setProfile(data);
      }
    }

    // 🔑 CRITICAL: wait for the PDF to actually generate before navigating away,
    // otherwise the browser cancels the download and you get a blank/null PDF.
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
  const [resettingPaper, setResettingPaper] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

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

  const fetchPapers = async () => {
    setLoading(true);

    const { data: papers } = await supabase
      .from("simulation_papers")
      .select("id, title, description, duration, is_free")
      .eq("is_active", true);

    if (!papers) {
      setLoading(false);
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: subData } = await supabase
      .from("subscriptions")
      .select("plan_type, is_active, expires_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    const now = new Date();
    const isSubValid = subData && subData.is_active && new Date(subData.expires_at) > now;

    // Prefer the full profile from state; fall back to localStorage.
    // Never overwrite good fields with an empty object.
    const cachedProfile = localStorage.getItem("profile");
    const profileObj = cachedProfile ? JSON.parse(cachedProfile) : {};

    const fullProfile = {
      ...profileObj,
      ...(profile || {}),
      subscription_active: !!isSubValid,
      plan_type: subData?.plan_type || "Free"
    };

    setProfile(fullProfile);

    setProfile(fullProfile);

    const { data: results } = await supabase
      .from("simulation_results")
      .select("paper_id")
      .eq("user_id", userId);

    const donePaperIds = results?.map((r) => r.paper_id) || [];

    const papersWithStatus = papers.map((p) => ({
      ...p,
      is_done: donePaperIds.includes(p.id),
    }));

    setPaperList(papersWithStatus);
    localStorage.setItem("sim-papers", JSON.stringify(papersWithStatus));
    setLoading(false);
  };

  useEffect(() => {
    const getUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        if (profile) {
          setUserRole(profile.role as "student" | "tutor" | "staff");
          setIsTutor(profile.role === "tutor");
        }
      }
    };
    getUserRole();
  }, []);
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error || !data) return;

      setProfile(data);
      localStorage.setItem("profile", JSON.stringify(data));
      localStorage.setItem("userProfile", JSON.stringify(data));
    };

    loadProfile();
  }, []);
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

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

  useEffect(() => {
    fetchPapers();
  }, []);

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
    if (!selectedPaper) return;

    const fetchQuestions = async () => {
      setQuestionsLoading(true);

      try {
        const { data } = await supabase
          .from("simulation_questions")
          .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer")
          .eq("paper_id", selectedPaper.id);

        const shuffledData = data ? shuffleArray([...data]) : [];

        const saved = JSON.parse(localStorage.getItem(localKey) || "{}");
        const unanswered = shuffledData?.filter((q) => !saved[q.id]) || [];
        setQuestions(unanswered);
        setAnswers(saved);
        setCurrentIndex(0);

        const durationInSeconds = (selectedPaper.duration || 60) * 60;
        setTotalDuration(durationInSeconds);

        const savedTime = localStorage.getItem(timerKey);
        if (savedTime) {
          setTimeLeft(parseInt(savedTime, 10));
        } else {
          setTimeLeft(durationInSeconds);
        }
      } catch (error) {
        console.error("Error fetching questions:", error);
      } finally {
        setQuestionsLoading(false);
      }
    };

    fetchQuestions();
  }, [selectedPaper]);

  useEffect(() => {
    if (!selectedPaper || totalDuration === 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          alert("Time's up! Auto-submitting...");
          confirmSubmit();
          return 0;
        }
        const newTime = prev - 1;
        localStorage.setItem(timerKey, newTime.toString());
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedPaper, totalDuration]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((t) => t.stop());
      audioStream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  const handleSelect = (option: string) => {
    if (!currentQuestion) return;
    const updated = { ...answers, [currentQuestion.id]: option };
    setAnswers(updated);
    localStorage.setItem(localKey, JSON.stringify(updated));
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

    const receiptNumber = "MED-" + Date.now();
    const generatedAt = new Date().toLocaleString();

    // ── Score calc (kept identical) ─────────────────────────────
    const correctCount = questions.reduce((count, q) => {
      const userAnswer = answers[q.id];
      return userAnswer === q.correct_answer ? count + 1 : count;
    }, 0);
    const percentageScore =
      questions.length > 0
        ? ((correctCount / questions.length) * 100).toFixed(2)
        : "0.00";

    // ── Profile (kept identical priority) ───────────────────────
    const profileData =
      profileOverride ||
      profile ||
      (typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("profile") || "null")
        : null);

    // ============================================================
    // HEADER
    // ============================================================
    // Brand blue band
    doc.setFillColor(...brandBlue);
    doc.rect(0, 0, pageWidth, 32, "F");

    // Logo (left side) — swap the filename if yours differs
    try {
      // 12x12 mm logo at 14,10
      doc.addImage("/pwa-512x512.png", "PNG", 14, 9, 14, 14);
    } catch (e) {
      // If logo fails to load (e.g. CORS or wrong path), just skip it
      console.warn("Logo not embedded in PDF:", e);
    }

    // Title: "Medrae" red + "Nursing" black — drawn on the white part below
    // But we put a small wordmark on the blue band too, in white, for identity.
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("MEDRAE", 32, 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Kenya Nursing Platform", 32, 23);

    // Right side: receipt + generated date
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

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...slateMid);
    doc.text(
      "Proctorium Revision Results",
      pageWidth / 2,
      titleY + 6,
      { align: "center" }
    );

    // Thin divider
    doc.setDrawColor(...slateLight);
    doc.setLineWidth(0.5);
    doc.line(20, titleY + 10, pageWidth - 20, titleY + 10);

    // ============================================================
    // CANDIDATE INFO — two-column label / value table via autoTable
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
        0: { cellWidth: 38, textColor: slateMid, fontStyle: "bold" },
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

    // @ts-ignore — autoTable attaches lastAutoTable to doc
    let afterInfoY = (doc as any).lastAutoTable?.finalY || titleY + 60;
    afterInfoY += 6;

    // ============================================================
    // SCORE SUMMARY CARD
    // ============================================================
    const cardX = 20;
    const cardW = pageWidth - 40;
    const cardH = 26;

    // Background
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(cardX, afterInfoY, cardW, cardH, 2, 2, "F");

    // Left accent strip
    doc.setFillColor(...brandBlue);
    doc.rect(cardX, afterInfoY, 2.5, cardH, "F");

    // Labels
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...slateMid);
    doc.text("PAPER", cardX + 8, afterInfoY + 7);
    doc.text("SCORE", cardX + 8, afterInfoY + 15);
    doc.text("PERCENTAGE", cardX + 8, afterInfoY + 22);

    // Values
    doc.setFontSize(9);
    doc.setTextColor(...slateDark);
    doc.text(
      `${selectedPaper?.title || "N/A"}`,
      cardX + 40,
      afterInfoY + 7
    );
    doc.text(
      `${correctCount} / ${questions.length}`,
      cardX + 40,
      afterInfoY + 15
    );

    // Percentage badge on right
    const pctColor =
      parseFloat(percentageScore) >= 50 ? greenAccent : brandRed;

    doc.setFillColor(...pctColor);
    doc.roundedRect(cardX + cardW - 38, afterInfoY + 6, 30, 14, 2, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(
      `${percentageScore}%`,
      cardX + cardW - 23,
      afterInfoY + 15,
      { align: "center" }
    );

    let yPos = afterInfoY + cardH + 8;

    // ============================================================
    // ADVISORY SECTION
    // ============================================================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...slateDark);
    doc.text("Personalized Study Advisory", 20, yPos);
    yPos += 2;

    doc.setDrawColor(...slateLight);
    doc.setLineWidth(0.4);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...slateDark);

    const advisoryText = `Dear Student,

These results are for your personal review and learning. To maximize your nursing exam preparation and improve clinical knowledge, consider the following tips:

• Review your answers carefully - Cross-check with your lecture notes, textbooks, and clinical guidelines.
• Identify weak areas - Focus on topics where mistakes were made or answers were skipped.
• Practice consistently - Regular self-testing improves retention and builds confidence for real exams.
• Use active recall & spaced repetition - Quiz yourself repeatedly over intervals to reinforce learning.
• Simulate exam conditions - Practice under timed conditions to improve time management skills.
• Seek clarification - Ask peers, instructors, or online resources when uncertain about a topic.
• Apply clinical reasoning - Relate theoretical knowledge to real patient scenarios for deeper understanding.
• Take care of yourself - Rest, hydrate, and maintain focus; a healthy mind improves performance.
• Join study groups - Collaborate with classmates to discuss cases and share insights.
• Review NCK/NCLEX-style questions - Familiarize yourself with exam formats and tricky scenarios.

For more detailed resources, practice questions, and interactive learning call us at 0704473503.

Keep striving - each step you take strengthens your nursing expertise and prepares you for success!`;

    const splitAdvisory = doc.splitTextToSize(advisoryText, pageWidth - 40);

    // Manual line-by-line rendering so we can paginate if needed
    const lineHeight = 4.6;
    for (let i = 0; i < splitAdvisory.length; i++) {
      if (yPos > pageHeight - 25) {
        doc.addPage();
        // Redraw the top band on new pages (lightweight)
        doc.setFillColor(...brandBlue);
        doc.rect(0, 0, pageWidth, 8, "F");
        yPos = 20;
      }
      doc.text(splitAdvisory[i], 20, yPos);
      yPos += lineHeight;
    }

    // ============================================================
    // FOOTER (on every page)
    // ============================================================
    const pageCount = doc.internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Footer thin line
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

    doc.save("Medrae_Nursing_Revision_Proctorium.pdf");
  };
  // ── Mobile block screen — only shown after tapping Begin ──────
  if (showMobileBlock && !dismissed) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">Laptop Required</h1>
        <p className="text-lg mb-6">
          This simulation is only available on laptops or desktops for
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

  if (showDonePanel) {
    const answered = questions.filter((q) => answers[q.id]);
    const unanswered = questions.filter((q) => !answers[q.id]);
    const flaggedQs = questions.filter((q) => flags.includes(q.id));
    const skippedQs = questions.filter((q) => skipped.includes(q.id));

    const correctCount = questions.reduce((count, q) => {
      const userAnswer = answers[q.id];
      return userAnswer === q.correct_answer ? count + 1 : count;
    }, 0);

    const percentageScore = ((correctCount / questions.length) * 100).toFixed(2);

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
              <X className="w-4 h-4 mr-2" /> Cancel Request
            </Button>
          </div>

          {/* MOTIVATIONAL BOX */}
          <Card className="border-0 shadow-none bg-white dark:bg-muted/30 rounded-2xl">
            <CardContent className="p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-2xl shrink-0">
                <Trophy className="w-7 h-7 text-amber-500" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-slate-900 dark:text-white font-bold text-base md:text-lg">
                  Knowledge Refinement
                </h4>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Every challenge you face is an opportunity to grow. Take a moment
                  to reflect on your progress. Remember, true learning is not only
                  about the final score but the effort, perseverance, and insight
                  gained along the way.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SCORE PREVIEW */}
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
                {questions.length} Questions
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
              title="Unanswered"
              count={unanswered.length}
              icon={<XCircle className="w-4 h-4" />}
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
              icon={<FastForward className="w-4 h-4" />}
              color="blue"
              list={skippedQs}
            />
          </div>

          {/* ACTION BUTTON — centered, not full laptop width */}
          {/* ACTION BUTTON — centered, not full laptop width */}
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
                  <RefreshCw className="ml-0 mr-2 w-5 h-5 animate-spin" />
                  {pendingAction === "submit"
                    ? "Submitting & Generating PDF..."
                    : "Resetting..."}
                </>
              ) : pendingAction === "submit" ? (
                <>
                  Confirm Final Submission{" "}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              ) : (
                <>
                  Reset All Progress <RotateCcw className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
          </div>

          {/* MARQUEE — no top separator */}
          <div className="relative mt-6 md:mt-10 py-4 md:py-6 overflow-hidden">
            <div className="flex justify-center">
              <div className="flex items-center gap-6 whitespace-nowrap animate-marquee-slow">
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="flex items-center gap-2 text-slate-400 text-xs md:text-sm font-medium"
                  >
                    🌟 Thank you for choosing our platform. We appreciate your trust
                    and commitment to excellence! 🌟
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

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

  if (!selectedPaper) {
    if (loading && paperList.length === 0) {
      return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-background text-foreground">
          <GlobalLoader />
        </div>
      );
    }

    return (
      <div className="h-screen w-full bg-[#F8FAFC] px-2 py-4 md:p-6 lg:p-10 font-sans overflow-y-auto hide-scrollbar">
        {/* Header Section */}
        <div className="max-w-7xl mx-auto mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold tracking-widest uppercase text-xs mb-2">
              <Zap className="w-4 h-4 fill-current" /> Examination Portal
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Available <span className="text-blue-600">Papers</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-sm md:text-base">
              Select an assessment module to begin your simulation session.
            </p>
          </div>

          <Link to="/dashboard">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-700 font-bold hover:bg-slate-50 transition-all"
            >
              <LayoutDashboard className="w-4 h-4 text-blue-600" />
              Candidate Dashboard
            </motion.button>
          </Link>
        </div>

        {/* Grid Section */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {paperList.map((paper: any) => {
            const canAccess = profile?.subscription_active ? true : paper.is_free;
            const isLocked = !canAccess && !paper.is_done;

            return (
              <motion.div
                key={paper.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                <Card
                  className={`group relative h-full flex flex-col border-0 shadow-none transition-all duration-300 rounded-2xl md:rounded-3xl overflow-hidden bg-white ${paper.is_done ? "bg-slate-50/50" : isLocked ? "bg-slate-50" : "hover:-translate-y-1"
                    }`}
                >
                  {/* Status Bar — color strip, not a border */}
                  <div className={`h-1.5 w-full ${paper.is_done ? "bg-green-500" : isLocked ? "bg-slate-300" : "bg-blue-600"
                    }`} />

                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl ${paper.is_done ? "bg-green-100 text-green-600" : isLocked ? "bg-slate-200 text-slate-500" : "bg-blue-50 text-blue-600"
                        }`}>
                        <FileText className="w-6 h-6" />
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {paper.is_done ? (
                          <Badge className="bg-green-100 text-green-700 border-0 uppercase text-[10px] font-bold">Completed</Badge>
                        ) : profile?.subscription_active ? (
                          <Badge className="bg-blue-100 text-blue-700 border-0 uppercase text-[10px] font-bold flex gap-1 items-center">
                            <Crown className="w-3 h-3" /> Premium Access
                          </Badge>
                        ) : paper.is_free ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 uppercase text-[10px] font-bold">Standard Free</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 border-0 uppercase text-[10px] font-bold flex gap-1 items-center">
                            <Lock className="w-3 h-3" /> Pro Required
                          </Badge>
                        )}
                      </div>
                    </div>

                    <CardTitle className={`text-xl font-bold leading-tight ${isLocked ? "text-slate-400" : "text-slate-800"}`}>
                      {paper.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                      {paper.description || "Comprehensive NCK-aligned simulation paper covering core nursing competencies and clinical reasoning."}
                    </p>
                    {paper.duration && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>Duration: {paper.duration} minutes</span>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-0 pb-6 px-6">
                    {paper.is_done ? (
                      <div className="w-full space-y-3">
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl">
                          <CheckCircle className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs font-bold uppercase tracking-tight">Record on file</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-0 bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all font-bold group"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setResettingPaper(paper.id);
                            const { data: userData } = await supabase.auth.getUser();
                            if (!userData?.user?.id) { setResettingPaper(null); return; }

                            await supabase.from("simulation_results").delete().eq("paper_id", paper.id).eq("user_id", userData.user.id);
                            localStorage.removeItem(`sim-answers-${paper.id}`);
                            setPaperList((prev: any) => prev.map((p: any) => p.id === paper.id ? { ...p, is_done: false } : p));
                            setResettingPaper(null);
                          }}
                          disabled={resettingPaper === paper.id}
                        >
                          <RotateCcw className={`w-4 h-4 mr-2 ${resettingPaper === paper.id ? "animate-spin" : "group-hover:-rotate-45 transition-transform"}`} />
                          {resettingPaper === paper.id ? "Wiping Data..." : "Reset Submission"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        className={`w-full h-12 rounded-xl font-bold transition-all active:scale-[0.98] border-0 ${canAccess
                          ? "bg-blue-600 hover:bg-blue-700 text-white group"
                          : "bg-amber-500 hover:bg-amber-600 text-white"
                          }`}
                        onClick={() => {
                          // ✅ Mobile gate — only blocks the exam, not browsing
                          if (!isLaptop) {
                            setShowMobileBlock(true);
                            return;
                          }
                          if (canAccess) {
                            setQuestionsLoading(true);
                            setSelectedPaper(paper);
                          } else {
                            setSelectedPaperForOverlay(paper);
                            setShowPremiumOverlay(true);
                          }
                        }}
                      >
                        {canAccess ? (
                          <>
                            Begin Assessment <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2 animate-pulse" /> Unlock Assessment
                          </>
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {showPremiumOverlay && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPremiumOverlay(false)}
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className={`relative p-8 text-center ${isTutor ? 'bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500' : 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500'}`}>
                  <div className="absolute top-0 right-0 p-4">
                    <button onClick={() => setShowPremiumOverlay(false)} className="text-white/80 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                    {isTutor ? <GraduationCap className="w-12 h-12 text-white" /> : <Lock className="w-12 h-12 text-white" />}
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2">
                    {isTutor ? "Tutor Pro Access Required" : "Premium Assessment"}
                  </h3>
                  <p className="text-white/90 text-sm">
                    {selectedPaperForOverlay?.title}
                  </p>
                </div>

                <div className="p-8">
                  <div className="space-y-4 mb-8">
                    {(isTutor ? TUTOR_SIMULATION_SUBSCRIPTION.features : STUDENT_SIMULATION_SUBSCRIPTION.features).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-center mb-6">
                    <span className="text-3xl font-bold">
                      {isTutor ? TUTOR_SIMULATION_SUBSCRIPTION.currency : STUDENT_SIMULATION_SUBSCRIPTION.currency}
                      {isTutor ? TUTOR_SIMULATION_SUBSCRIPTION.price : STUDENT_SIMULATION_SUBSCRIPTION.price}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {' '} / {isTutor ? TUTOR_SIMULATION_SUBSCRIPTION.duration : STUDENT_SIMULATION_SUBSCRIPTION.duration}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setShowPremiumOverlay(false);
                      navigate("/subscription", { state: { role: isTutor ? "tutor" : "student" } });
                    }}
                    className={`w-full font-bold py-4 px-6 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 group mb-3 border-0 ${isTutor
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                      }`}
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>
                      {isTutor
                        ? `Upgrade to Tutor Pro — ${TUTOR_SIMULATION_SUBSCRIPTION.currency} ${TUTOR_SIMULATION_SUBSCRIPTION.price}`
                        : `Unlock All — ${STUDENT_SIMULATION_SUBSCRIPTION.currency} ${STUDENT_SIMULATION_SUBSCRIPTION.price} for ${STUDENT_SIMULATION_SUBSCRIPTION.duration}`
                      }
                    </span>
                  </button>

                  <button
                    onClick={() => setShowPremiumOverlay(false)}
                    className="w-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium"
                  >
                    Maybe later
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (questionsLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-background text-foreground">
        <GlobalLoader />
      </div>
    );
  }

  if (!currentQuestion && questions.length === 0) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-950 flex flex-col items-center justify-center p-8 z-50">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <FileText className="w-10 h-10 text-amber-500 dark:text-amber-400" />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              No Questions Available
            </h2>

            <div className="bg-white dark:bg-gray-800 rounded-xl border-0 p-5 shadow-sm">
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                This assessment paper is currently being prepared by our content team.
                Questions are carefully curated to align with NCK examination standards
                and clinical competencies.
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-gray-700">
                <p className="text-slate-500 dark:text-slate-500 text-xs leading-relaxed">
                  <span className="font-semibold text-amber-600 dark:text-amber-400">Why this happens:</span> Papers
                  are published first, then populated with questions through our quality
                  assurance process to ensure accuracy and relevance.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-base border-0"
              onClick={() => {
                setSelectedPaper(null);
                setQuestionsLoading(false);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Available Papers
            </Button>

            <p className="text-xs text-slate-400 dark:text-slate-500">
              Questions are typically added within 24-48 hours after paper creation
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main question view
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground grid md:grid-cols-3 grid-cols-1 gap-4 md:gap-6 px-2 py-4 md:p-8 hide-scrollbar">
      <div className="md:col-span-2 space-y-4">

        <Card className="min-h-[400px] bg-white dark:bg-gray-900 border-0 shadow-none rounded-2xl">
          <CardHeader>
            <CardTitle>
              Question {currentIndex + 1} of {questions.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-barlow text-sm leading-relaxed">
              {currentQuestion.question_text}
            </p>
            <div className="flex flex-col gap-3">
              {["A", "B", "C", "D"].map((opt) => {
                const isSelected = answers[currentQuestion.id] === opt;

                return (
                  <div
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    className="flex items-start gap-3 cursor-pointer"
                  >
                    <div
                      className={`
            w-5 h-5 flex-shrink-0 rounded-full border-2 mt-1
            transition-colors duration-200
            ${isSelected ? "bg-blue-500 border-blue-500" : "bg-white border-gray-400 dark:bg-black dark:border-gray-500"}
          `}
                    ></div>

                    <span className="whitespace-normal font-barlow text-sm leading-relaxed">{currentQuestion[`option_${opt.toLowerCase()}`]}</span>
                  </div>
                );
              })}
            </div>

          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <Button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 border-0"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={handleFlag}
            className="flex items-center gap-2 border-0 bg-slate-100"
          >
            <Flag className="w-5 h-5" />
            Flag
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="flex items-center gap-2 border-0"
          >
            Skip
            <CornerRightDown className="w-5 h-5" />
          </Button>

          <Button
            onClick={goNext}
            disabled={currentIndex === questions.length - 1}
            className="flex items-center gap-2 border-0"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </Button>

          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={currentIndex !== questions.length - 1}
            title={
              currentIndex !== questions.length - 1
                ? `You must reach the last question to submit`
                : `Submit your answers`
            }
            className="border-0"
          >
            Submit & Generate PDF
          </Button>

        </div>

        <div className="flex justify-center gap-4 mt-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={skipped.length === 0}
            className="border-0"
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
            className="border-0"
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
          <div className="rounded-lg overflow-hidden w-24 h-16 bg-slate-900">
            {cameraStream ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                autoPlay
              />
            ) : (
              <p className="text-center text-xs text-gray-400 p-2">Camera not available</p>
            )}
          </div>

          <div className="rounded-lg overflow-hidden w-24 h-16 relative flex items-center justify-center bg-slate-100 dark:bg-slate-800">
            <canvas ref={canvasRef} width={256} height={192} className="w-full h-full" />
            {loudWarning && (
              <span className="absolute top-1 left-1 text-[10px] text-red-600 font-bold bg-white px-1 rounded">
                Loud noise
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => initMedia(true)}
            className="flex items-center gap-2 border-0 bg-slate-100"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Cam & Mic
          </Button>

        </div>

      </div>

      <div className="space-y-2">

        <Card className="bg-transparent text-foreground dark:text-gray-100 shadow-none border-0 rounded-none p-2">

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

            <button className="p-1 rounded hover:bg-green-100 transition border-0">
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

        <Card className="max-h-[400px] overflow-y-auto pr-2 bg-transparent text-foreground dark:text-gray-100 shadow-none border-0 rounded-none custom-scrollbar">

          <CardHeader className="flex justify-between items-center sticky top-0 bg-background z-10">
            <CardTitle>Questions</CardTitle>
            <Button size="sm" variant="ghost" onClick={resetAnswers} className="border-0">
              Reset
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-[repeat(auto-fit,minmax(40px,1fr))] gap-2">
            {questions.map((q, i) => (
              <Button
                key={q.id}
                size="sm"
                className="border-0"
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

        <div className="w-full overflow-hidden pt-4 border-0">
          <div className="flex w-max animate-marquee-slow">
            <div
              dir="rtl"
              className="whitespace-nowrap text-lg md:text-xl font-semibold tracking-wide text-foreground pr-16"
            >
              🌟 Keep going — every question makes you stronger • Believe in yourself • Progress over perfection • You’ve got this • Stay focused and finish strong 🌟
            </div>

            <div
              dir="rtl"
              className="whitespace-nowrap text-lg md:text-xl font-semibold tracking-wide text-foreground pr-16"
            >
              🌟 Keep going — every question makes you stronger • Believe in yourself • Progress over perfection • You’ve got this • Stay focused and finish strong 🌟
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
            <div className="text-center space-y-4">
              <Link to="/dashboard">
                <motion.button
                  whileHover={{ x: -5 }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border-0 rounded-2xl text-gray-700 hover:bg-gray-50 transition-all font-semibold text-sm shadow-sm"
                >
                  <Home className="w-4 h-4" />
                  Exit to Dashboard
                </motion.button>
              </Link>
            </div>

            <div className="max-w-4xl w-full space-y-8">

              <div className="text-center space-y-4">

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 border-0 text-gray-700 text-[10px] font-black uppercase tracking-widest">
                  <ShieldAlert className="w-3.5 h-3.5" /> Security Protocol Active
                </div>

                <h2 className="text-gray-900 text-4xl font-extrabold tracking-tight italic">
                  Device <span className="text-gray-800">Authorization</span>
                </h2>

                <div className="bg-white border-0 rounded-2xl p-4 max-w-2xl mx-auto shadow-sm">
                  <p className="text-gray-600 text-sm leading-relaxed">
                    To ensure examination integrity, we require access to your camera and microphone.
                    <span className="text-gray-700 block mt-2 font-bold uppercase text-[11px] tracking-wider">
                      ⚠️ Critical: Pressing "ESC" during simulation will trigger an immediate auto-submission.
                    </span>
                  </p>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:max-w-full md:px-4 lg:px-6 mx-auto">

                <div className="relative group">
                  <div className={`absolute -inset-0.5 rounded-3xl blur opacity-20 transition duration-1000 group-hover:opacity-40 ${cameraStream ? 'bg-green-200' : 'bg-blue-200'}`}></div>

                  <motion.div className="relative bg-white rounded-3xl p-6 border-0 h-full flex flex-col items-center shadow-sm">

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
                      className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border-0
                ${cameraStream
                          ? 'bg-green-600 text-white cursor-default'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                    >
                      {cameraStream ? "Camera Synced" : "Enable Camera"}
                    </motion.button>

                  </motion.div>
                </div>

                <div className="relative group">
                  <div className={`absolute -inset-0.5 rounded-3xl blur opacity-20 transition duration-1000 group-hover:opacity-40 ${audioStream ? 'bg-green-200' : 'bg-gray-200'}`}></div>

                  <motion.div className="relative bg-white rounded-3xl p-6 border-0 h-full flex flex-col items-center shadow-sm">

                    <div className="relative w-full h-24 mb-4 rounded-xl overflow-hidden bg-gray-100 border-0">
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
                      className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border-0
                ${audioStream
                          ? 'bg-green-600 text-white cursor-default'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                    >
                      {audioStream ? "Mic Calibrated" : "Enable Microphone"}
                    </motion.button>

                  </motion.div>
                </div>

              </div>

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
                  className={`relative group px-12 py-5 rounded-full font-black text-sm uppercase tracking-[0.3em] transition-all border-0
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

  );
}