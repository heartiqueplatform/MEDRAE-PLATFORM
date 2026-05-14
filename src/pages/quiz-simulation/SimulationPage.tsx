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
  Sparkles
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


export default function SimulationPage() {
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
  }

  // will hold paper id being reset

  const [paperList, setPaperList] = useState<any[]>(() => {
    // ✅ Load from localStorage first for instant display
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("sim-papers");
      if (cached) return JSON.parse(cached);
    }
    return [];
  });

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

  const currentQuestion = questions?.[currentIndex] ?? null;
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loudWarning, setLoudWarning] = useState(false);
  const [mediaAllowed, setMediaAllowed] = useState(false);
  // State
  const [profile, setProfile] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const cachedProfile = localStorage.getItem("profile");
      return cachedProfile ? JSON.parse(cachedProfile) : null;
    }
    return null;
  });
  const [loading, setLoading] = useState(true); // new

  // 1️⃣ Add this state at the top of your component
  const [resettingPaper, setResettingPaper] = useState<string | null>(null);
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

  // Fetch active papers and mark which ones are already done

  const fetchPapers = async () => {
    setLoading(true); //  start loading

    const { data: papers } = await supabase
      .from("simulation_papers")
      .select("*")
      .eq("is_active", true);

    if (!papers) {
      setLoading(false);
      return;
    }

    // Fetch profile
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.id) {
      const profileData = await fetchProfile(userData.user.id);

      // Fetch subscription
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("plan_type, is_active")
        .eq("user_id", userData.user.id)
        .eq("is_active", true);

      const fullProfile = {
        ...profileData,
        subscription: subData?.[0]?.plan_type || null,
        subscription_active: subData?.[0]?.is_active || false,
      };

      // ✅ Save in state AND localStorage
      setProfile(fullProfile);
      localStorage.setItem("profile", JSON.stringify(fullProfile));
    }

    // Check which papers are done
    // updated ✅ only fetch results for THIS user
    const { data: results } = await supabase
      .from("simulation_results")
      .select("paper_id")
      .eq("user_id", userData.user.id);

    const donePaperIds = results?.map((r) => r.paper_id) || [];

    const papersWithStatus = papers.map((p) => ({
      ...p,
      is_done: donePaperIds.includes(p.id),
    }));
    setPaperList(papersWithStatus);
    //  Cache in localStorage for next load
    localStorage.setItem("sim-papers", JSON.stringify(papersWithStatus));


    setLoading(false); //  stop loading
  };

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
  }, [selectedPaper, isSubmitting]);
  useEffect(() => {
    fetchPapers();
  }, []);
  // Confirm before leaving if user is in the middle of a simulation
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


  //  Realtime subscription for simulation (papers, results, subscription)
  useEffect(() => {
    let channel = supabase.channel("simulation_realtime");

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "simulation_papers",
        },
        () => {
          console.log("Realtime: papers changed, refreshing...");
          fetchPapers(); // refresh paper list
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "simulation_results",
        },
        () => {
          console.log("Realtime: results changed, refreshing...");
          fetchPapers(); // refresh paper statuses
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
        },
        async () => {
          console.log("Realtime: subscription changed, refreshing profile...");
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user?.id) {
            const profileData = await fetchProfile(userData.user.id);
            setProfile(profileData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch questions for selected paper
  useEffect(() => {
    if (!selectedPaper) return;
    const fetchQuestions = async () => {
      const { data } = await supabase.from("simulation_questions").select("*").eq("paper_id", selectedPaper.id);
      const saved = JSON.parse(localStorage.getItem(localKey) || "{}");
      const unanswered = data?.filter((q) => !saved[q.id]) || [];
      setQuestions(unanswered);
      setAnswers(saved);
      setCurrentIndex(0);
      const savedTime = localStorage.getItem(timerKey);

      if (savedTime) {
        setTimeLeft(parseInt(savedTime, 10));
      } else {
        setTimeLeft(totalDuration);
      }

    };
    fetchQuestions();
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
  const confirmSubmit = async () => {
    if (!selectedPaper || isSubmitting) return;

    setIsSubmitting(true); // 🔒 lock

    const correctCount = questions.reduce((count, q) => {
      const userAnswer = answers[q.id];
      return userAnswer === q.correct_answer ? count + 1 : count;
    }, 0);

    const percentageScore = ((correctCount / questions.length) * 100).toFixed(2);

    await supabase.from("simulation_results").insert({
      paper_id: selectedPaper.id,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      score: correctCount,
      total_questions: questions.length,
    });

    generatePDF();

    resetNow();
    setSelectedPaper(null);
    setShowDonePanel(false);
    setPendingAction(null);
    localStorage.removeItem(timerKey);

    exitFullscreen(); // 👈 explicitly exit fullscreen
    navigate("/dashboard");

    setIsSubmitting(false); // optional cleanup
  };
  const generatePDF = async () => {
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 🧾 Generate Receipt Number
    const receiptNumber = "MED-" + Date.now();


    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("MEDRAE KENYA NURSING PLATFORM (MKN)", pageWidth / 2, 18, { align: "center" });

    doc.setFontSize(12);
    doc.setFont(undefined, "normal");
    doc.text("Proctorium Revision Results", pageWidth / 2, 24, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Receipt No: ${receiptNumber}`, pageWidth - 60, 32);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 60, 38);

    // NEW: Candidate Details Section

    const correctCount = questions.reduce((count, q) => {
      const userAnswer = answers[q.id];
      return userAnswer === q.correct_answer ? count + 1 : count;
    }, 0);
    const percentageScore = ((correctCount / questions.length) * 100).toFixed(2);

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("Candidate Details", 14, 45);

    // Candidate Profile Details
    doc.setFont(undefined, "normal");
    let y = 53;

    // ✅ Fetch from state or fallback to localStorage
    const profileData =
      profile ||
      (typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("profile") || "null")
        : null);

    if (profileData) {
      doc.text(`Name: ${profileData.name || "N/A"}`, 14, y); y += 6;
      doc.text(`Email: ${profileData.email || "N/A"}`, 14, y); y += 6;
      doc.text(`Institution: ${profileData.institution || "N/A"}`, 14, y); y += 6;
      doc.text(`Course: ${profileData.course || "N/A"}`, 14, y); y += 6;
      doc.text(`County: ${profileData.county || "N/A"}`, 14, y); y += 6;
      doc.text(`Phone: ${profileData.phone || "N/A"}`, 14, y); y += 6;
      doc.text(`Subscription: ${profileData.subscription || "N/A"}`, 14, y); y += 6;
      doc.text(`Role: ${profileData.role || "N/A"}`, 14, y); y += 6;
    } else {
      doc.text("Candidate Profile: Not Available", 14, y);
      y += 6;
    }

    // Paper details
    doc.text(`Paper Title: ${selectedPaper?.title || "N/A"}`, 14, y); y += 6;
    doc.text(`Score: ${correctCount}/${questions.length} (${percentageScore}%)`, 14, y); y += 6;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, y); y += 10;

    let yPos = y; // continue after candidate + paper info

    // Add advisory paragraph
    doc.setFontSize(11);
    const advisoryText = `Dear Student,

These results are for your personal review and learning. To maximize your nursing exam preparation and improve clinical knowledge, consider the following tips:

• Review your answers carefully – Cross-check with your lecture notes, textbooks, and clinical guidelines.
• Identify weak areas – Focus on topics where mistakes were made or answers were skipped.
• Practice consistently – Regular self-testing improves retention and builds confidence for real exams.
• Use active recall & spaced repetition – Quiz yourself repeatedly over intervals to reinforce learning.
• Simulate exam conditions – Practice under timed conditions to improve time management skills.
• Seek clarification – Ask peers, instructors, or online resources when uncertain about a topic.
• Apply clinical reasoning – Relate theoretical knowledge to real patient scenarios for deeper understanding.
• Take care of yourself – Rest, hydrate, and maintain focus; a healthy mind improves performance.
• Join study groups – Collaborate with classmates to discuss cases and share insights.
• Review NCK/NCLEX-style questions – Familiarize yourself with exam formats and tricky scenarios.

For more detailed resources, practice questions, and interactive learning, visit MEDRAE : https://medrae.vercel.app/ or call us at 0704473503.

Keep striving each step you take strengthens your nursing expertise and prepares you for success!`;

    // Wrap text to fit PDF width
    doc.setFont(undefined, "normal");
    const splitText = doc.splitTextToSize(advisoryText, pageWidth - 28);

    // Use yPos (after details), not 30
    doc.text(splitText, 14, yPos);

    yPos = yPos + splitText.length * 6 + 4;


    /*

        questions.forEach((q, i) => {
          if (yPos > 260) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFont(undefined, "bold");
          doc.text(`Q${i + 1}: ${q.question_text}`, 14, yPos);

          yPos += 6;
          ["A", "B", "C", "D"].forEach((opt) => {
            const text = `${opt}. ${q[\`option_${opt.toLowerCase()}\`]}`;
            if (q.correct_answer === opt) {
              doc.setTextColor(0, 128, 0);
              doc.setFont(undefined, "bold");
            } else {
              doc.setTextColor(0, 0, 0);
              doc.setFont(undefined, "normal");
            }
            doc.text(text, 20, yPos);
            yPos += 6;
          });

          yPos += 4;
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, "normal");
        });
    */

    // Footer + page numbers AFTER all content
    const pageCount = doc.internal.getNumberOfPages();
    const footerLine1 = "MEDRAE";
    const footerLine2 = "S";

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(100);

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const textWidth1 = doc.getTextWidth(footerLine1);
      doc.text(footerLine1, (pageWidth - textWidth1) / 2, pageHeight - 20);

      const textWidth2 = doc.getTextWidth(footerLine2);
      doc.text(footerLine2, (pageWidth - textWidth2) / 2, pageHeight - 14);

      const pageText = `Page ${i} of ${pageCount}`;
      const textWidthPage = doc.getTextWidth(pageText);
      doc.text(pageText, (pageWidth - textWidthPage) / 2, pageHeight - 8);
    }

    doc.save("MEDRAE_Revision_Proctorium.pdf");
  };


  // Render Review Panel with percentage score
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
      <div className="min-h-screen w-full   bg-[#F8FAFC] p-4 md:p-8 font-sans">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* TOP NAVIGATION & TITLE */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-600 font-bold tracking-widest uppercase text-[10px] mb-1">
                <FileCheck className="w-4 h-4" /> Final Audit Phase
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Review Before You <span className={pendingAction === "submit" ? "text-green-600" : "text-rose-600"}>
                  {pendingAction === "submit" ? "Submit" : "Reset"}
                </span>
              </h2>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-200 text-slate-500 hover:bg-slate-100"
              onClick={() => {
                setShowDonePanel(false);
                setPendingAction(null);
              }}
            >
              <X className="w-4 h-4 mr-2" /> Cancel Request
            </Button>
          </div>

          {/* MOTIVATIONAL BOX */}
          <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-100 text-slate-700 overflow-hidden rounded-3xl">
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                <Trophy className="w-10 h-10 text-amber-500" />
              </div>

              <div className="space-y-2">
                <h4 className="text-slate-900 font-bold text-lg">
                  Knowledge Refinement
                </h4>

                <p className="text-sm leading-relaxed text-slate-600 max-w-3xl">
                  Every challenge you face is an opportunity to grow. Take a moment to reflect on your progress.
                  Remember, true learning is not only about the final score but the effort, perseverance, and insight gained along the way.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SCORE PREVIEW (Only for Submit) */}
          {pendingAction === "submit" && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-4 border-blue-500 flex items-center justify-center font-black text-blue-600">
                  {percentageScore}%
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Score Preview</h3>
                  <p className="text-sm text-slate-500">Based on your current responses</p>
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tighter">
                {correctCount} <span className="text-slate-300">/</span> {questions.length} Questions
              </div>
            </div>
          )}

          {/* AUDIT GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

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

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              size="lg"
              className={`flex-1 h-16 rounded-2xl text-lg font-bold transition-all shadow-xl ${pendingAction === "submit"
                ? "bg-blue-600 hover:bg-green-600 shadow-blue-100"
                : "bg-rose-600 hover:bg-rose-700 shadow-rose-100"
                }`}
              onClick={() => {
                if (pendingAction === "submit") confirmSubmit();
                if (pendingAction === "reset") resetNow();
              }}
            >
              {pendingAction === "submit" ? (
                <>Confirm Final Submission <ArrowRight className="ml-2 w-5 h-5" /></>
              ) : (
                <>Reset All Progress <RotateCcw className="ml-2 w-5 h-5" /></>
              )}
            </Button>
          </div>

          {/* MODERN MARQUEE */}
          <div className="relative mt-12 py-6 overflow-hidden">
            <Separator className="absolute top-0 opacity-50" />
            <div className="flex justify-center">
              <div className="flex items-center gap-8 whitespace-nowrap animate-marquee-slow">
                {[1, 2, 3].map((i) => (
                  <span key={i} className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                    🌟 Thank you for choosing our platform. We appreciate your trust and commitment to excellence! 🌟
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Sub-component for individual audit categories
  function AuditCard({ title, count, icon, color, list, answers }: any) {
    const colorMap: any = {
      green: "text-green-600 bg-green-50 border-green-100",
      rose: "text-rose-600 bg-rose-50 border-rose-100",
      amber: "text-amber-600 bg-amber-50 border-amber-100",
      blue: "text-blue-600 bg-blue-50 border-blue-100",
    };

    return (
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className={`${colorMap[color]} border-b py-4`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
              {icon} {title}
            </div>
            <Badge className={`${colorMap[color]} border shadow-none px-2 py-0`}>{count}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-48 p-4">
            <ul className="space-y-3">
              {list.map((q: any, i: number) => (
                <li key={q.id} className="text-[11px] leading-tight group">
                  <span className="font-bold text-slate-400 mr-1">Q{i + 1}</span>
                  <span className="text-slate-600 group-hover:text-slate-900 transition-colors">
                    {q.question_text.slice(0, 45)}...
                  </span>
                  {answers && answers[q.id] && (
                    <div className="mt-1 text-[10px] font-black text-blue-600 bg-blue-50/50 rounded px-1.5 py-0.5 inline-block">
                      {answers[q.id]}
                    </div>
                  )}
                </li>
              ))}
              {list.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 opacity-20 italic text-xs">
                  No items recorded
                </div>
              )}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }
  // Render paper selection
  if (!selectedPaper) {
    if (loading && paperList.length === 0) {
      // Only show loader if no cached papers
      return (
        <div className="fixed inset-0 flex items-center justify-center z-50
                bg-white text-black dark:bg-black dark:text-white">
          <GlobalLoader message="Medrae is Loading papers..." />
        </div>

      );
    }


    // Note: I'm assuming getStatusVariant, supabase, setSelectedPaper,
    // setPaperList, resettingPaper, etc. are available in your scope.
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] p-6 lg:p-10 font-sans">
        {/* Header Section */}
        <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold tracking-widest uppercase text-xs mb-2">
              <Zap className="w-4 h-4 fill-current" /> Examination Portal
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Available <span className="text-blue-600">Papers</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium">
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
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  className={`group relative h-full flex flex-col border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden bg-white ${paper.is_done ? "bg-slate-50/50" : isLocked ? "bg-slate-50" : "hover:-translate-y-1"
                    }`}
                >
                  {/* Status Bar */}
                  <div className={`h-1.5 w-full ${paper.is_done ? "bg-green-500" : isLocked ? "bg-slate-300" : "bg-blue-600"
                    }`} />

                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl ${paper.is_done ? "bg-green-100 text-green-600" : isLocked ? "bg-slate-200 text-slate-500" : "bg-blue-50 text-blue-600"
                        }`}>
                        <FileText className="w-6 h-6" />
                      </div>

                      {/* Dynamic Badge Logic */}
                      <div className="flex flex-col items-end gap-2">
                        {paper.is_done ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 uppercase text-[10px] font-bold">Completed</Badge>
                        ) : profile?.subscription_active ? (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 uppercase text-[10px] font-bold flex gap-1 items-center">
                            <Crown className="w-3 h-3" /> Premium Access
                          </Badge>
                        ) : paper.is_free ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 uppercase text-[10px] font-bold">Standard Free</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 uppercase text-[10px] font-bold flex gap-1 items-center">
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
                  </CardContent>

                  <CardFooter className="pt-0 pb-6 px-6">
                    {paper.is_done ? (
                      <div className="w-full space-y-3">
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl border border-green-100">
                          <CheckCircle className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs font-bold uppercase tracking-tight">Record on file</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all font-bold group"
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
                      // --- NEW CODE (CLICKABLE & SMOOTH) ---
                      <Button
                        className={`w-full h-12 rounded-xl font-bold transition-all shadow-lg active:scale-[0.98] ${canAccess
                          ? "bg-blue-600 hover:bg-blue-700 shadow-blue-100 group"
                          : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100" // Changed from gray to Amber
                          }`}
                        // Removed disabled={!canAccess} so users can click to upgrade
                        onClick={async () => {
                          if (canAccess) {
                            // Original Logic for Paid Users
                            setSelectedPaper(paper);
                            const { data: userData } = await supabase.auth.getUser();
                            if (userData?.user?.id) {
                              await supabase.from("simulation_visits").insert({
                                paper_id: paper.id,
                                user_id: userData.user.id,
                                visited_at: new Date().toISOString(),
                              });
                            }
                          } else {
                            // Smooth navigation for Free Users
                            navigate("/subscription");
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
      </div>
    );
  }
  // No questions found / Loading questions
  if (!currentQuestion) {
    if (questions.length === 0 && timeLeft > 0) {
      return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-background text-foreground">
          <GlobalLoader message="Medrae is Loading questions..." />
        </div>
      );
    }


    // No questions exist
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">No questions found for this paper.</p>
        <Button className="mt-4" onClick={() => setSelectedPaper(null)}>
          Choose Another Paper
        </Button>
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
          {/* Camera Panel */}
          <div className="border border-gray-300 rounded-lg overflow-hidden w-24 h-16">
            {cameraStream ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                autoPlay
              />
            ) : (
              <p className="text-center text-sm text-gray-500">Camera not available</p>
            )}
          </div>

          {/* Sound Wave Panel (Right side) */}
          <div className="border border-gray-300 rounded-lg overflow-hidden w-24 h-16 relative flex items-center justify-center">
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
  );
}
