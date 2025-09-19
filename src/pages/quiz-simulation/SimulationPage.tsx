"use client";
import { Link } from "react-router-dom";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlobalLoader } from "@/components/GlobalLoader";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion } from "framer-motion";
const totalDuration = 30 * 60;
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
const [paperList, setPaperList] = useState<any[]>(() => {
  // ✅ Load from localStorage first for instant display
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem("sim-papers");
    if (cached) return JSON.parse(cached);
  }
  return [];
});

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
  const currentQuestion = questions?.[currentIndex] ?? null;
const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
const canvasRef = useRef<HTMLCanvasElement | null>(null);
const [loudWarning, setLoudWarning] = useState(false);
const [mediaAllowed, setMediaAllowed] = useState(false);
const [profile, setProfile] = useState<any>(null);
const [loading, setLoading] = useState(true); // new

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

  //  Fetch logged-in user profile
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user?.id) {
    const profileData = await fetchProfile(userData.user.id);
    setProfile(profileData);

    // Fetch active subscription for this user
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("plan_type, is_active")
      .eq("user_id", userData.user.id)
      .eq("is_active", true)
      .single();

    if (subData) {
      setProfile((prev: any) => ({
        ...prev,
        subscription: subData.plan_type,
        subscription_active: subData.is_active,
      }));
    }
  }

  // Check which papers are done
  const { data: results } = await supabase.from("simulation_results").select("paper_id");
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
  fetchPapers();
}, []);
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
      setTimeLeft(totalDuration);
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
        return prev - 1;
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
    setAnswers({});
    setFlags([]);
    setSkipped([]);
    setCurrentIndex(0);
    setShowDonePanel(false);
    setPendingAction(null);
  };
const confirmSubmit = async () => {
  if (!selectedPaper) return;

  const correctCount = questions.reduce((count, q) => {
    const userAnswer = answers[q.id];
    return userAnswer === q.correct_answer ? count + 1 : count;
  }, 0);

  const percentageScore = ((correctCount / questions.length) * 100).toFixed(2);
await supabase.from("simulation_results").insert({
  paper_id: selectedPaper.id,
  user_id: (await supabase.auth.getUser()).data.user?.id, //  include user_id
  score: correctCount,
  total_questions: questions.length,
  });

  generatePDF();
  alert(
  `Congratulations! You’ve successfully completed the simulation.\n\n` +
  `Your Score: ${correctCount}/${questions.length} (${percentageScore}%)\n\n` +
  `Every question you tackled sharpened your knowledge and strengthened your skills. ` +
  `Remember, mastery is built step by step  each challenge you face is an opportunity to grow. ` +
  `Keep striving, stay curious, and trust in your dedication. Your persistence today shapes the exceptional professional you’re becoming!`
);


  resetNow();
  setSelectedPaper(null);
  setShowDonePanel(false);
  setPendingAction(null);

    //  No manual refresh needed, realtime will update the paper list
};
const generatePDF = async () => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Heatique nursing nexus scholar Simulation Results", 14, 20);
  
  // NEW: Candidate Details Section

  const correctCount = questions.reduce((count, q) => {
    const userAnswer = answers[q.id];
    return userAnswer === q.correct_answer ? count + 1 : count;
  }, 0);
  const percentageScore = ((correctCount / questions.length) * 100).toFixed(2);

  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("Candidate Details", 14, 30);
//  Candidate Profile Details
doc.setFont(undefined, "normal");
let y = 38;

if (profile) {
  doc.text(`Name: ${profile.name || "N/A"}`, 14, y); y += 6;
  doc.text(`Email: ${profile.email || "N/A"}`, 14, y); y += 6;
  doc.text(`Institution: ${profile.institution || "N/A"}`, 14, y); y += 6;
  doc.text(`Course: ${profile.course || "N/A"}`, 14, y); y += 6;
  doc.text(`County: ${profile.county || "N/A"}`, 14, y); y += 6;
  doc.text(`Phone: ${profile.phone || "N/A"}`, 14, y); y += 6;
  doc.text(`Subscription: ${profile.subscription || "N/A"}`, 14, y); y += 6;
  doc.text(`Role: ${profile.role || "N/A"}`, 14, y); y += 6;
} else {
  doc.text("Candidate Profile: Not Available", 14, y); 
  y += 6;
}

//  Paper details
doc.text(`Paper Title: ${selectedPaper?.title || "N/A"}`, 14, y); y += 6;
doc.text(`Score: ${correctCount}/${questions.length} (${percentageScore}%)`, 14, y); y += 6;
doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, y); y += 10;

let yPos = y; // continue after candidate + paper info

// Add advisory paragraph
doc.setFontSize(11);
const advisoryText = `Dear Student, these results are for your personal review and learning. Always cross-check answers with your study notes and seek clarification for any doubts. Remember, consistent practice improves retention and exam performance. For more detailed resources, practice questions, and interactive learning, visit HEARTIQUE NURSING NEXUS at https://heartique-nurses.com.`;

// Wrap text to fit PDF width
doc.setFont(undefined, "normal");
const pageWidth = doc.internal.pageSize.getWidth();
const splitText = doc.splitTextToSize(advisoryText, pageWidth - 28);

//  Use yPos (after details), not 30
doc.text(splitText, 14, yPos);

yPos = yPos + splitText.length * 6 + 4; // continue after advisory



  questions.forEach((q, i) => {
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont(undefined, "bold");
    doc.text(`Q${i + 1}: ${q.question_text}`, 14, yPos);

    yPos += 6;
    ["A", "B", "C", "D"].forEach((opt) => {
      const text = `${opt}. ${q[`option_${opt.toLowerCase()}`]}`;
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

  //  Footer + page numbers AFTER all content
  const pageCount = doc.internal.getNumberOfPages();
  const footerLine1 = "HEARTIQUE NURSING NEXUS SCHOLAR ";
  const footerLine2 = "Keep pushing, your dedication shapes the future of care!";

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


  doc.save("HEARTIQUE NURSING NEXUS SIMULATION.pdf");
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
   <div className="p-6 space-y-6 bg-background text-foreground dark:bg-gray-900 dark:text-gray-100 min-h-screen">
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
      <ul className="list-disc list-inside text-sm space-y-1 max-h-40 overflow-y-auto">
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
      className="flex-1"
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
</div>
    );
  }
  // Render paper selection
if (!selectedPaper) {
 if (loading && paperList.length === 0) {
  // Only show loader if no cached papers
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <GlobalLoader message="Heartique is Loading papers..." />
    </div>
  );
}

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <h2 className="text-xl font-bold mb-4">Choose a Paper</h2>
      {/* Dashboard Button */}
<div className="mb-4">
  <Button
    size="sm"
    asChild
    variant="outline"
    className="text-foreground hover:bg-green-500 hover:text-white dark:hover:text-white transition-colors"
  >
    <Link to="/dashboard">
          Go Back to Main Dashboard
    </Link>
  </Button>
</div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paperList.map((paper) => {
          const canAccess = profile?.subscription_active ? true : paper.is_free;

          return (
            <Card
              key={paper.id}
              className={`cursor-pointer hover:shadow-md transition ${
                paper.is_done ? "opacity-60" : canAccess ? "" : "opacity-50 cursor-not-allowed"
              }`}
             onClick={async () => {
  if (!paper.is_done && canAccess) {
    setSelectedPaper(paper);

    // ✅ Insert visit row
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.id) {
      await supabase.from("simulation_visits").insert({
        paper_id: paper.id,
        user_id: userData.user.id,
        visited_at: new Date().toISOString(), // optional timestamp column
      });
    }
  }
}}

            >
          
     
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {paper.title}
                  {paper.is_done ? (
                    <Badge variant={getStatusVariant("done")}>Done</Badge>
                  ) : profile?.subscription_active ? (
                    <Badge className="bg-green-600 text-white">Unlocked</Badge>
                  ) : paper.is_free ? (
                    <Badge className="bg-emerald-500 text-white">Free</Badge>
                  ) : (
                    <Badge variant="destructive">Premium / Pro</Badge>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-muted-foreground">{paper.description}</p>

                {paper.is_done && (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-green-600">
                      You’ve already submitted this paper.
                    </p>
                    <Badge variant="secondary">Completed</Badge>
                <Button
  size="sm"
  variant="destructive"
  onClick={async (e) => {
    e.stopPropagation();

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) return;

    // 1️⃣ Delete results from Supabase
    await supabase
      .from("simulation_results")
      .delete()
      .eq("paper_id", paper.id)
      .eq("user_id", userData.user.id);

    // 2️⃣ Remove saved answers in localStorage
    const localKey = `sim-answers-${paper.id}`;
    localStorage.removeItem(localKey);

    // 3️⃣ Update paperList state to reflect UI immediately
    setPaperList((prev) =>
      prev.map((p) =>
        p.id === paper.id ? { ...p, is_done: false } : p
      )
    );

    alert("Paper reset successfully. You can now retake it.");
  }}
>
  Reset Paper
</Button>

                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
  // No questions found / Loading questions
if (!currentQuestion) {
  if (questions.length === 0 && timeLeft > 0) {
    // Use global spinner instead
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <GlobalLoader message="Be patient Heartique is Loading questions..." />
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
    <div className="min-h-screen bg-background text-foreground grid grid-cols-1 md:grid-cols-3 gap-6 p-4 md:p-8">

     <div className="md:col-span-2 space-y-4">
  <Card>
    <CardHeader>
      <CardTitle>
        Question {currentIndex + 1} of {questions.length}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-base">{currentQuestion.question_text}</p>
      <div className="space-y-2">
        {["A", "B", "C", "D"].map((opt) => (
          <Button
            key={opt}
            variant={answers[currentQuestion.id] === opt ? "default" : "outline"}
            className="w-full justify-start"
            onClick={() => handleSelect(opt)}
          >
            {currentQuestion[`option_${opt.toLowerCase()}`]}
          </Button>
        ))}
      </div>
    </CardContent>
  </Card>

  {/* Centered navigation buttons */}
  <div className="flex flex-wrap justify-center gap-2 mt-4">
    <Button onClick={goPrev} disabled={currentIndex === 0}>
      Previous
    </Button>

    <Button variant="outline" onClick={handleFlag}>
      Flag
    </Button>

    <Button variant="ghost" onClick={handleSkip}>
      Skip
    </Button>

    <Button onClick={goNext} disabled={currentIndex === questions.length - 1}>
      Next
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
  <div className="border border-gray-300 rounded-lg overflow-hidden w-64 h-48">
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
<div className="border border-gray-300 rounded-lg overflow-hidden w-64 h-48 relative flex items-center justify-center">
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
  onClick={() => initMedia(true)}  // pass flag to force reload
>
  Reload Camera & Mic
</Button>

</div>

      </div>

      <div className="space-y-4">
       <Card>
  <CardHeader>
    <CardTitle>Time Left</CardTitle>
  </CardHeader>
  <CardContent className="text-center space-y-2">
    {/* Display current date */}
    <p className="text-sm text-muted-foreground">
      {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    </p>

    {/* Display countdown */}
    <p className="text-2xl font-bold">{formatTime(timeLeft)}</p>
  </CardContent>
</Card>

        <Card className="max-h-[400px] overflow-y-auto">
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
      </div>
{!mediaAllowed && (
  <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-50 flex items-center justify-center">
    <div className="text-center space-y-6">
      <h2 className="text-white text-2xl font-bold">Camera & Mic Disabled</h2>
      <p className="text-gray-300">
        Double Click below to enable camera and microphone.
      </p>

      <div className="flex flex-col gap-4">
        {/* Camera Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 2 }}
          onClick={async () => {
            try {
              const cam = await navigator.mediaDevices.getUserMedia({
                video: true,
              });
              setCameraStream(cam);
              if (videoRef.current) {
                videoRef.current.srcObject = cam;
              }
            } catch (err) {
              console.error("Camera blocked", err);
            }
          }}
         className="px-6 py-3 rounded-xl font-semibold shadow-lg bg-background text-foreground hover:bg-accent hover:text-accent-foreground"

        >
         Double click to enable camera
        </motion.button>

        {/* Mic Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
          onClick={async () => {
            try {
              const mic = await navigator.mediaDevices.getUserMedia({
                audio: true,
              });
              setAudioStream(mic);

              // ---- Setup analyser + soundwave ----
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

                  let color = "#10b981"; // Tailwind green-500
                  if (barHeight > 40 && barHeight <= 80) color = "#3b82f6"; // blue-500
                  if (barHeight > 80) color = "#ef4444"; // red-500

                  canvasCtx.fillStyle = color;
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
         className="px-6 py-3 rounded-xl font-semibold shadow-lg bg-background text-foreground hover:bg-accent hover:text-accent-foreground"

        >
          Enable mic
        </motion.button>

        {/* Final Start Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          animate={
            cameraStream && audioStream
              ? { scale: [1, 1.05, 1], boxShadow: ["0 0 0px #fff", "0 0 20px #a78bfa", "0 0 0px #fff"] }
              : {}
          }
          transition={{ repeat: Infinity, duration: 2 }}
          disabled={!cameraStream || !audioStream}
          onClick={() => setMediaAllowed(true)}
        className="px-6 py-3 rounded-xl font-semibold shadow-lg bg-background text-foreground hover:bg-accent hover:text-accent-foreground"

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
