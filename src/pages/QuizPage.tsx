"use client";
import { ExplanationOverlay } from "@/components/QuizPage/ExplanationOverlay";
import { QuestionInsights } from "@/components/QuizPage/QuestionInsights";
import { SubmitQuizButton } from "@/components/QuizPage/SubmitQuizButton.tsx";
import { CheckpointOverlay } from "@/components/QuizPage/CheckpointOverlay";
import { QuizProgressOverlay } from "@/components/QuizPage/QuizProgressOverlay";
import { QuizResultsPanel } from "@/components/QuizPage/QuizResultsPanel";
import { HelpMeOverlay } from "@/components/QuizPage/HelpMeOverlay";
import { openDB } from "idb";
import { playSound } from "@/lib/soundManager";
import { GlobalLoader } from "@/components/GlobalLoader";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import Countdown from "react-countdown";
import { supabase } from "@/lib/supabaseClient";
import OverlayAI from "@/components/OverlayAI";
import { ArrowUp, HelpCircle, CheckCircle2, PanelRightOpen, BookOpen, Timer, GraduationCap, ChevronDown, ChevronUp, TimerReset, RotateCcw, Save, Users, MessageCircle, X, Cpu, AlertTriangle, Volume, VolumeX, Filter, ChevronLeft, ChevronRight, AlertCircle, Volume2, Sparkles } from "lucide-react";
import FloatingChat from "@/components/FloatingChat";
import { getUnitOffline, saveUnitOffline, getAnswersOffline, saveAnswersOffline, } from "@/lib/indexedDb";
import { saveNoteOffline, getNoteOffline, getPendingNotes, markNoteSynced } from "@/lib/indexedDb"; // adjust path if needed
import { NotesEvaluationPanel } from "@/components/QuizPage/NotesEvaluationPanel";
import { useSession } from "@supabase/auth-helpers-react";
import { cn } from "@/lib/utils";
interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  additional: string | null;
  course_tag?: string;
}
interface Attempt {
  id: string;
  score: number;
  submitted_at: string;
  answers_json: Record<string, string>;
}
const TIMER_DURATION = 300_000; // 3 hours
export default function QuizPage() {
  const session = useSession();
  const user = session?.user;
  const userId = user?.id;
  const location = useLocation();
  const QUESTIONS_PER_BATCH = 20;
  const [progressOpen, setProgressOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(QUESTIONS_PER_BATCH);
  const [lockedVisible, setLockedVisible] = useState<Record<string, boolean>>({});
  const [resetting, setResetting] = useState(false); // ✅ added
  const params = new URLSearchParams(location.search);
  const unit = params.get("unit");
  const [saving, setSaving] = useState(false);
  const [isAIOverlayOpen, setAIOverlayOpen] = useState(false);
  const [aiPrefillQuestion, setAIPrefillQuestion] = useState("");
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notUnderstood, setNotUnderstood] = useState<Record<string, boolean>>({});
  const [attemptsCount, setAttemptsCount] = useState<Record<string, number>>({});
  const [helpOthersDisabled, setHelpOthersDisabled] = useState<{ [key: string]: boolean }>({});
  const [saved, setSaved] = useState(false);
  const [notesOverlay, setNotesOverlay] = useState<string | null>(null); // updated
  const [understood, setUnderstood] = useState<Record<string, boolean>>({});
  const [unitId, setUnitId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [confidenceLevels, setConfidenceLevels] = useState<Record<string, string>>({});
  const [questionsSource, setQuestionsSource] = useState<"remote" | "local" | null>(null);

  const navigate = useNavigate(); // Add this line

  const [feedbackShown, setFeedbackShown] = useState<Record<string, boolean>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [explanationOverlayOpen, setExplanationOverlayOpen] = useState(false);
  const [openExplanationFor, setOpenExplanationFor] = useState<string | null>(null);
  const [showUnansweredOnly, setShowUnansweredOnly] = useState(false);
  const [recentlyAnsweredId, setRecentlyAnsweredId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("All");
  const courseOptions = ["All", "BSN", "KRCHN", "KRN",];
  // --- NEW ---
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false); // Track if user has pro/premium plan
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [checkpointOverlay, setCheckpointOverlay] = useState<{
    visible: boolean;
    reached: number;
    total: number;
  } | null>(null);
  const circleRefs = useRef([]);

  useEffect(() => {
    if (currentQuestionIndex !== undefined && circleRefs.current[currentQuestionIndex]) {
      circleRefs.current[currentQuestionIndex].scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest"
      });
    }
  }, [currentQuestionIndex]);
  const [showReasonBox, setShowReasonBox] = useState<{ [key: string]: boolean }>(() => {
    const saved = localStorage.getItem("showReasonBox");
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedReason, setSelectedReason] = useState<{ [key: string]: string | null }>(() => {
    const saved = localStorage.getItem("selectedReason");
    return saved ? JSON.parse(saved) : {};
  });
  const reasonOptions = [
    "Misread question",
    "Concept gap",
    "Rushed",
    "Guess"
  ];


  useEffect(() => {
    localStorage.setItem("showReasonBox", JSON.stringify(showReasonBox));
  }, [showReasonBox]);
  useEffect(() => {
    localStorage.setItem("selectedReason", JSON.stringify(selectedReason));
  }, [selectedReason]);
  const [lastCheckpoint, setLastCheckpoint] = useState(0);

  // State to control overlay visibility and selected question helpers
  const [helpMeOverlayOpen, setHelpMeOverlayOpen] = useState(false);
  const [helpMeHelpers, setHelpMeHelpers] = useState<
    { id: string; whatsapp: string; user_id: string; profiles: { name: string; avatar_url?: string } }[]
  >([]);
  const [currentQuestionText, setCurrentQuestionText] = useState("");
  // Step 1: Add state for overlay
  const [helpMeOverlay, setHelpMeOverlay] = useState<{ helpers: any[], questionText: string } | null>(null);
  const [isMuted, setIsMuted] = useState(
    localStorage.getItem("quizMuted") === "true" ? true : false
  );
  // ✅ Records a wrong answer, increments times_wrong if repeated, stores selected wrong option, and optionally saves reason
  async function recordMistake(userId: string, question: any, selectedOption: string, reason?: string) {
    try {
      // 1️⃣ Upsert first attempt (insert if not exists)
      const { error: upsertError } = await supabase
        .from("user_mistakes")
        .upsert(
          {
            user_id: userId,
            question_id: question.id,
            quiz_id: question.quiz_id,
            last_wrong_at: new Date(),
            times_wrong: 1, // default for first insertion
            user_selected: selectedOption, // store the selected wrong option
            ...(reason ? { mistake_reason: reason } : {}), // optionally include reason
          },
          { onConflict: "user_id,question_id" }
        );
      if (upsertError) throw upsertError;
      // 2️ Increment times_wrong using RPC and update last_wrong_at and user_selected
      const { data, error } = await supabase.rpc("increment_mistake", {
        user_uuid: userId,
        question_uuid: question.id,
        selected_option: selectedOption, // latest wrong selection
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error recording mistake:", error);
    }
  }
  // ------------------------------// Offline Notes Storage Helpers// ------------------------------
  const saveNoteOffline = async (questionId: string, noteText: string) => {
    try {
      const savedNotes = JSON.parse(localStorage.getItem("offlineNotes") || "{}");
      savedNotes[questionId] = noteText;
      localStorage.setItem("offlineNotes", JSON.stringify(savedNotes));
    } catch (err) {
      console.error("Failed to save note offline:", err);
    }
  };
  const loadOfflineNotes = () => {
    try {
      return JSON.parse(localStorage.getItem("offlineNotes") || "{}");
    } catch (err) {
      console.error("Failed to load offline notes:", err);
      return {};
    }
  };

  async function syncOfflineAnswers() {
    const offline = await getAnswersOffline(unit);
    if (!offline || !offline.pending) return;

    // updated: upload pending answers to supabase
    const { data, error } = await supabase
      .from("quiz_answers")
      .upsert({
        user_id: userId,
        unit_id: unit,
        answers: offline.answers,
        updated_at: new Date(),
      });

    if (!error) {
      const db = await openDB("MedraeDB", 1);

      // updated: mark as synced (pending: false)
      await db.put("answers", {
        unitId: unit,
        answers: offline.answers,
        pending: false,
      });
    }
  }

  const toggleMute = () => {
    setIsMuted(prev => {
      localStorage.setItem("quizMuted", (!prev).toString());
      return !prev;
    });
  };
  useEffect(() => {
    const handleOnline = async () => {
      try {
        // Load all offline notes from localStorage
        const offlineNotes: Record<string, string> = loadOfflineNotes();

        if (!offlineNotes || Object.keys(offlineNotes).length === 0) return;

        if (!userId) return;

        // Loop through each note and upsert to Supabase
        for (const questionId of Object.keys(offlineNotes)) {
          const noteText = offlineNotes[questionId];

          await supabase
            .from("question_notes")
            .upsert([{
              user_id: userId,
              question_id: questionId,
              note_text: noteText,
              // Merge with existing understood/not-understood & attempts if needed
              understood: understood[questionId] || false,
              is_not_understood: notUnderstood[questionId] || false,
              attempts: attemptsCount[questionId] || 0,
            }], { onConflict: "question_id,user_id" });

          // Optionally, mark as synced (clear localStorage only if successful)
          // delete offlineNotes[questionId];
        }

        console.log("Offline notes synced successfully!");
      } catch (err) {
        console.error("Error syncing offline notes:", err);
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [userId, notes, understood, notUnderstood, attemptsCount]);

  useEffect(() => {
    if (!questions || questions.length === 0) return;
    // ✅ FIXED VERSION
    const loadOfflineNotes = async () => {
      // Read from localStorage safely, no recursion
      const offlineNotes: Record<string, string> = JSON.parse(
        localStorage.getItem("offlineNotes") || "{}"
      );

      for (const q of questions) {
        // Merge localStorage notes first
        if (offlineNotes[q.id]) {
          setNotes(prev => ({ ...prev, [q.id]: offlineNotes[q.id] }));
        }

        // Then merge IndexedDB notes (if any)
        const offlineNoteDB = await getNoteOffline(q.id);
        if (offlineNoteDB?.note_text) {
          setNotes(prev => ({ ...prev, [q.id]: offlineNoteDB.note_text }));
        }

        // Load offline answers
        const offlineAnswer = await getAnswersOffline(q.id);
        if (offlineAnswer) {
          setUnderstood(prev => ({ ...prev, [q.id]: offlineAnswer.understood || false }));
          setNotUnderstood(prev => ({ ...prev, [q.id]: offlineAnswer.not_understood || false }));
          setAttemptsCount(prev => ({ ...prev, [q.id]: offlineAnswer.attempts || 0 }));
        }
      }
    };

    // Call it once safely
    loadOfflineNotes();

  }, [questions]);

  useEffect(() => {
    if (!questions || questions.length === 0) return;

    const loadOfflineAnswers = async () => {
      for (const q of questions) {
        const offline = await getAnswersOffline(unit);
        if (offline?.answers && offline.answers[q.id]) {
          setAnswers(prev => ({ ...prev, [q.id]: offline.answers[q.id] }));
          setFeedbackShown(prev => ({ ...prev, [q.id]: true }));
        }
      }
    };

    loadOfflineAnswers();
  }, [questions]);

  // Auto-sync offline answers when back online
  useEffect(() => {
    async function handleOnline() {
      await syncOfflineAnswers(); // updated
    }

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  useEffect(() => {
    if (!userId || !questions.length) return;
    const loadSavedData = async () => {
      try {
        const questionIds = questions.map(q => String(q.id));
        const { data, error } = await supabase
          .from("question_notes")
          .select("*")
          .in("question_id", questionIds)
          .eq("user_id", String(userId));

        if (error) throw error;
        if (!data) return;

        const newNotes: Record<string, string> = {};
        const newUnderstood: Record<string, boolean> = {};
        const newNotUnderstood: Record<string, boolean> = {};
        const newAttempts: Record<string, number> = {};
        const newHelpDisabled: Record<string, boolean> = {};

        data.forEach(row => {
          const qid = String(row.question_id);
          newNotes[qid] = row.note_text || "";
          newUnderstood[qid] = !!row.understood;
          newNotUnderstood[qid] = !!row.is_not_understood;
          newAttempts[qid] = row.attempts || 0;
          newHelpDisabled[qid] = !!row.help_others; // mark help as used
        });

        setNotes(newNotes);
        setUnderstood(newUnderstood);
        setNotUnderstood(newNotUnderstood);
        setAttempts(newAttempts);
        setHelpOthersDisabled(newHelpDisabled);

      } catch (err) {
        console.error("Error loading saved question state:", err);
      }
    };


    loadSavedData();
  }, [questions, userId]);



  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDarkMode(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300); // show after user scrolls 300px
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => {
    let cancelled = false;

    const loadQuiz = async () => {
      if (!unit) return;
      setLoading(true);

      // 1. Set default state
      setIsPremium(false);

      if (userId) {
        // We fetch the subscription
        const { data: sub, error: subError } = await supabase
          .from("subscriptions")
          .select("plan_type, is_active, expires_at")
          .eq("user_id", userId)
          .maybeSingle(); // .maybeSingle() is better than .single() because it won't throw a console error if the row is missing

        // Check if sub exists. If sub is null, the code below is skipped and isPremium stays FALSE
        if (sub && !subError) {
          const now = new Date();
          const expiry = sub.expires_at ? new Date(sub.expires_at) : null;

          const hasActivePlan = sub.is_active === true;
          const isPaidTier = sub.plan_type === 'pro' || sub.plan_type === 'premium';
          const isNotExpired = expiry ? expiry > now : true;

          // Only if ALL conditions are met do we unlock the quiz
          if (hasActivePlan && isPaidTier && isNotExpired) {
            setIsPremium(true);
          }
        }
      }

      // ... rest of your loadQuiz logic (fetching questions)

      /** ✅ STEP 1: Try IndexedDB first */
      const offlineUnit = await getUnitOffline(unit);

      if (offlineUnit && offlineUnit.questions?.length) {
        if (cancelled) return;

        setQuizId(offlineUnit.quizId);
        setQuestions(offlineUnit.questions);
        setQuestionsSource("local");
        setLoading(false);

        return; // 🚀 STOP HERE (NO SUPABASE CALL)
      }

      /** ✅ STEP 2: Fallback to Supabase */
      const { data: quiz, error } = await supabase
        .from("quizzes")
        .select("id")
        .eq("unit", unit)
        .single();

      if (error || !quiz) {
        console.error("Error fetching quiz:", error);
        if (!cancelled) setLoading(false);
        return;
      }

      if (cancelled) return;

      setQuizId(quiz.id);

      const { data: quizQuestions, error: qError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quiz.id);

      if (qError || !quizQuestions) {
        console.error("Error loading quiz questions:", qError);
        if (!cancelled) setLoading(false);
        return;
      }

      if (cancelled) return;

      const enriched = quizQuestions.map((q: any) => ({
        ...q,
        quiz_id: quiz.id,
      }));

      /** ✅ STEP 3: Save locally for next time */
      await saveUnitOffline({
        unitId: unit,
        quizId: quiz.id,
        questions: enriched,
        savedAt: Date.now(),
      });

      setQuestions(enriched);
      setLastCheckpoint(0);
      setQuestionsSource("remote");
      setLoading(false);
      // Restore offline answers
      const offlineSaved = await getAnswersOffline(unit);

      if (offlineSaved?.answers) {
        // updated
        setAnswers(offlineSaved.answers);

        const fb = {};
        Object.keys(offlineSaved.answers).forEach(id => {
          fb[id] = true;
        });

        setFeedbackShown(fb);
      }

      /** ✅ TIMER (unchanged) */
      const savedEnd = localStorage.getItem(`quiz-${quiz.id}-end`);
      if (savedEnd) {
        setTimerEnd(Number(savedEnd));
      } else {
        const endTime = Date.now() + TIMER_DURATION;
        setTimerEnd(endTime);
        localStorage.setItem(`quiz-${quiz.id}-end`, endTime.toString());
      }

      /** ✅ ANSWERS RESTORE (unchanged) */
      const local = localStorage.getItem(`quiz-${quiz.id}-answers`);
      if (local) {
        const parsed = JSON.parse(local);
        setAnswers(parsed);

        const feedbackState: Record<string, boolean> = {};
        Object.keys(parsed).forEach(id => {
          feedbackState[id] = true;
        });
        setFeedbackShown(feedbackState);
      }
    };

    loadQuiz();

    return () => {
      cancelled = true;
    };
  }, [unit, userId, session]);

  useEffect(() => {
    const saved = localStorage.getItem("confidenceLevels");
    if (saved) {
      setConfidenceLevels(JSON.parse(saved));
    }
  }, []);
  useEffect(() => {
    setVisibleCount(QUESTIONS_PER_BATCH);
  }, [questions, showUnansweredOnly]);


  useEffect(() => {
    if (!recentlyAnsweredId) return;

    const timer = setTimeout(() => {
    }, 30000);


    return () => clearTimeout(timer);
  }, [recentlyAnsweredId]);

  useEffect(() => {
    const loadAttempts = async () => {
      if (!quizId || !userId) return;

      const { data: pastAttempts } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("user_id", userId)
        .order("submitted_at", { ascending: false });

      setAttempts(pastAttempts || []);
    };

    if (quizId && userId) loadAttempts();
  }, [quizId, userId]);

  useEffect(() => {
    const channel = supabase
      .channel("live-answer-events")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_answer_events",
        },
        (payload) => {

        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAnswer = (questionId: string, selected: string) => {
    if (answers[questionId]) return; // Prevent double answer
    // After updating answers
    const nextIndex = questions.findIndex(q => q.id === questionId);
    if (nextIndex !== -1) setCurrentQuestionIndex(nextIndex);

    const updatedAnswers = { ...answers, [questionId]: selected };

    // Save entire unit answers offline
    saveAnswersOffline(unit, updatedAnswers);

    // Prepare a new note entry (encouraging note)
    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString();
    const newEntry = `Hey! Great job! You answered this question on ${date} at ${time}. Keep up the good work!`;

    // Merge with existing note if any
    const existingNote = notes[questionId] || "";
    const updatedNote = existingNote ? existingNote + "\n" + newEntry : newEntry;

    // Save individual question note offline
    saveNoteOffline(questionId, updatedNote); // your offline storage function
    localStorage.setItem(`note-${questionId}`, updatedNote);

    // Update React state so panel shows immediately
    setNotes(prev => ({ ...prev, [questionId]: updatedNote }));

    // Update answers and feedback
    setAnswers(updatedAnswers);
    // checkpoint size
    // checkpoint size
    const CHECKPOINT_SIZE = 10;
    const previousCount = Object.keys(answers).length;
    const nextCount = Object.keys(updatedAnswers).length;

    // only trigger checkpoint when enough answers since last checkpoint
    if (
      nextCount - lastCheckpoint >= CHECKPOINT_SIZE &&
      nextCount > previousCount
    ) {
      // get the IDs of the current checkpoint questions
      const checkpointQuestionIds = Object.keys(updatedAnswers).slice(lastCheckpoint, lastCheckpoint + CHECKPOINT_SIZE);

      // count correct answers in this checkpoint
      const correctInCheckpoint = checkpointQuestionIds.reduce((count, qid) => {
        const q = questions.find(q => q.id === qid);
        return q && updatedAnswers[qid] === q.correct_answer ? count + 1 : count;
      }, 0);

      const percentCompleted = Math.round((correctInCheckpoint / CHECKPOINT_SIZE) * 100);

      setLastCheckpoint(nextCount);
      setCheckpointOverlay({
        visible: true,
        reached: correctInCheckpoint,
        total: CHECKPOINT_SIZE,
        percentCompleted,
      });

      // 🔊 Play checkpoint sound
      if (!isMuted) {
        playSound("notification");
      }
    }


    setRecentlyAnsweredId(questionId);
    setFeedbackShown(prev => ({ ...prev, [questionId]: true }));

    // NEW - auto open explanation overlay after answering
    setOpenExplanationFor(questionId);
    // Save unit answers to localStorage
    localStorage.setItem(`quiz-${quizId}-answers`, JSON.stringify(updatedAnswers));

    setQuestionStartTime(Date.now());
    // 🔒 Keep this question visible when filter is ON
    if (showUnansweredOnly) {
      setLockedVisible(prev => ({
        ...prev,
        [questionId]: true,
      }));
    }
  };

  const handleReportQuestion = async (question: Question) => {
    // Single alert before opening overlay
    alert(
      "You are reporting this question. A new AI window is opening to discuss this question as Medrae team reviews it. You can send your input directly."
    );

    const reportPayload = {
      question_id: question.id,
      quiz_id: quizId,
      question_text: question.question_text,
      reported_at: new Date().toISOString(),
      user_id: userId,
      user_answer: answers[question.id] || "No answer selected",
    };

    // Flag question in Supabase
    const { error } = await supabase
      .from("quiz_questions")
      .update({ is_flagged: true })
      .eq("id", question.id);

    if (error) {
      console.error("Error flagging question:", error);
      alert("Failed to flag question.");
      return;
    }

    // Build string with question + options + user answer
    const optionsText = ["A", "B", "C", "D"]
      .map(
        (letter) =>
          `${letter}: ${question[`option_${letter.toLowerCase() as "a" | "b" | "c" | "d"}`]}`
      )
      .join("\n");

    // Function to split long text into blocks of max length
    const chunkText = (text: string, maxLength = 200) => {
      const chunks: string[] = [];
      let start = 0;
      while (start < text.length) {
        chunks.push(text.slice(start, start + maxLength));
        start += maxLength;
      }
      return chunks.join("\n\n"); // separate each block with double line breaks
    };

    const fullText = `Let's discuss this question in NCK/NCLEX format:
Question: ${question.question_text}
Options:
${optionsText}
User Answer: ${answers[question.id] || "No answer selected"}
Please provide a detailed discussion and guidance.`;

    setAIPrefillQuestion(chunkText(fullText, 200)); // 200 chars per block
    setAIOverlayOpen(true); // Open AI overlay
  };


  const handleSubmit = async (auto = false) => {
    if (quizFinished || !quizId || !userId) return;

    const correctCount = Object.entries(answers).reduce((count, [questionId, selected]) => {
      const q = questions.find((q) => q.id === questionId);
      return q && q.correct_answer === selected ? count + 1 : count;
    }, 0);

    const { error: attemptError } = await supabase.from("quiz_attempts").insert([{
      quiz_id: quizId,
      user_id: userId,
      score: correctCount,
      answers_json: answers,
      attempt_number: 1
    }]);

    if (attemptError) {
      console.error("Error saving attempt:", attemptError);
      if (!auto) alert("Submission failed.");
      return;
    }

    const { error: resultError } = await supabase.from("quiz_results").insert([{
      quiz_id: quizId,
      user_id: userId,
      unit: unit,
      score: correctCount,
      total_questions: questions.length
    }]);

    if (resultError) console.error("Error saving result:", resultError);
    // Save this unit as completed in localStorage for recommendations
    if (unit) {
      const submittedUnits = JSON.parse(localStorage.getItem("submittedUnits") || "[]");
      if (!submittedUnits.includes(unit)) {
        submittedUnits.push(unit);
        localStorage.setItem("submittedUnits", JSON.stringify(submittedUnits));
      }
    }

    setFinalScore(correctCount);
    setQuizFinished(true);
    // Remove saved timer when quiz ends
    localStorage.removeItem(`quiz-${quizId}-end`);

  };
  const handleResetTimer = () => {
    if (!quizId) return;
    if (!window.confirm("Are you sure you want to reset the timer?")) return;

    const newEnd = Date.now() + TIMER_DURATION;
    setTimerEnd(newEnd);
    localStorage.setItem(`quiz-${quizId}-end`, newEnd.toString());
  };
  const handleReset = async () => {
    if (!quizId || resetting) return;

    const confirmed = window.confirm(
      "Reset & Restart Quiz\n\n" +
      "This will:\n" +
      "• Clear all your answers for this quiz\n" +
      "• Remove explanations and feedback\n" +
      "• Restart the quiz from the beginning\n\n" +
      "This will NOT:\n" +
      "• Delete your account\n" +
      "• Affect other units or quizzes\n" +
      "• Remove saved notes\n\n" +
      "Do you want to continue?"
    );

    if (!confirmed) return;

    setResetting(true); // 🔄 start animation

    // small delay so user SEES animation
    setTimeout(() => {
      localStorage.removeItem(`quiz-${quizId}-answers`);
      localStorage.removeItem(`quiz-${quizId}-end`);

      setAnswers({});
      setFeedbackShown({});
      setLockedVisible({});
      setQuizFinished(false);
      setFinalScore(0);

      setResetting(false); // ✅ stop animation
    }, 600);
  };
  if (loading && questions.length === 0) {
    return <GlobalLoader message="Medrae is Loading quiz..." />;
  }

  if (questions.length === 0) return <p className="p-4 text-gray-700 dark:text-gray-300">
    No questions found for: <strong>{unit}</strong>. <br /><br />
    This could be due to several reasons: <br />
    1. The platform hasn’t updated questions for this unit yet. <br />
    2. You’re visiting this page offline for the first time; to use it offline, please visit the page at least once while online. <br />
    3. There may be a network issue  try reloading the app or checking your internet connection. <br /><br />
    Want to suggest a new unit, request more questions, or suggest a feature?{" "}
    <a
      href="https://wa.me/254704473503"
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline"
    >
      Click here to message us on WhatsApp
    </a>.
  </p>

  const filteredQuestions = questions.filter(q => {
    // 1. Filter by Course Tag (Matches the button selected)
    const matchesCourse = selectedCourse === "All" || q.course_tag === selectedCourse;

    // 2. Filter by Unanswered (Existing logic)
    const matchesUnanswered = !showUnansweredOnly || (!answers[q.id] || lockedVisible[q.id]);

    // Only return the question if it passes BOTH filters
    return matchesCourse && matchesUnanswered;
  });
  return (
    <div className="space-y-0 max-w-8xl mx-auto px-3 sm:px-6 lg:px-8  ">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <header className="sticky top-0 rounded-xl z-[100] w-full bg-white/80 dark:bg-background backdrop-blur-md border-b border-gray-200 dark:border-gray-900 shadow-sm">
          <div className="max-w-7xl mx-auto px-4  py-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

              {/* 1. Unit Title Section */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-white truncate max-w-[250px] sm:max-w-none uppercase">
                  {unit}
                </h1>
              </div>

              {/* 2. Timer & Progress Controls */}
              <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-6">

                {/* The Countdown Widget */}
                <Countdown
                  date={timerEnd ?? new Date().getTime() + TIMER_DURATION}
                  onComplete={() => handleSubmit(true)}
                  renderer={({ hours, minutes, seconds }) => (
                    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full border border-red-100 dark:border-red-900/30">
                      <Timer className="w-4 h-4 text-red-600 dark:text-red-400 animate-pulse" />
                      <div className="flex items-center font-mono font-bold text-red-600 dark:text-red-400 text-sm sm:text-base">
                        <span>{String(hours).padStart(2, '0')}</span>
                        <span className="mx-0.5 animate-none">:</span>
                        <span>{String(minutes).padStart(2, '0')}</span>
                        <span className="mx-0.5 animate-none">:</span>
                        <span>{String(seconds).padStart(2, '0')}</span>
                      </div>
                    </div>
                  )}
                />

                {/* 3. Progress Button */}
                <div className="relative">
                  <button
                    onClick={() => setProgressOpen(!progressOpen)}
                    className={`group flex items-center gap-3 pl-4 pr-3 py-1.5 rounded-full text-white shadow-md transition-all active:scale-95
              ${Object.keys(answers).length / questions.length < 0.5
                        ? 'bg-red-600 hover:bg-red-700'
                        : Object.keys(answers).length / questions.length < 0.7
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-green-600 hover:bg-green-700'}
            `}
                  >
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-[10px] uppercase font-bold opacity-80">Progress</span>
                      <span className="text-sm font-bold">
                        {Object.keys(answers).length}/{questions.length}
                      </span>
                    </div>

                    <div className="h-6 w-px bg-white/20" />

                    {progressOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}

                    {/* Subtle Visual Progress Fill (Background Layer) */}
                    <div
                      className="absolute inset-0 bg-black/10 rounded-full transition-all duration-1000"
                      style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                    />
                  </button>
                </div>
              </div>

            </div>

            {/* Simple Linear Progress Bar (Under header) */}
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full bg-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </header>
        <QuizProgressOverlay
          progressOpen={progressOpen}
          setProgressOpen={setProgressOpen}
          answers={answers}
          questions={questions}
          circleRefs={circleRefs}
          setCurrentQuestionIndex={setCurrentQuestionIndex}
        />
      </div>
      <CheckpointOverlay
        checkpointOverlay={checkpointOverlay}
        quizId={quizId}
        userId={userId}
        unit={unit}
        lastCheckpoint={lastCheckpoint}
        answers={answers}
        questions={questions}
        supabase={supabase}
        setCheckpointOverlay={setCheckpointOverlay}
        playSound={playSound}
      />
      <div className="mt-2 flex justify-between items-center w-full gap-4">


      </div>
      <div className="flex flex-col items-center">
        <div className="w-full max-w-6xl min-h-[500px] relative">
          {/* Course Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mt-2 scrollbar-hide">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            {courseOptions.map((course) => (
              <button
                key={course}
                onClick={() => {
                  setSelectedCourse(course);
                  setCurrentQuestionIndex(0); // Reset to first question when filtering
                }}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                  selectedCourse === course
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                    : "bg-white dark:bg-muted/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300"
                )}
              >
                {course}
              </button>
            ))}
          </div>
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q, i) => {
              const selectedAnswer = answers[q.id];
              const showFeedback = feedbackShown[q.id];

              if (i !== currentQuestionIndex) return null;

              // PAYWALL LOGIC: First 20 are free, 21+ require Premium
              const isLocked = !isPremium && i >= 20;


              if (isLocked) {
                return (
                  <div key="locked-content" className="flex flex-col items-center justify-center p-8 sm:p-16 bg-white dark:bg-muted/30 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xl text-center">
                    <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-6">
                      <Sparkles className="w-10 h-10 text-amber-600 dark:text-amber-400 animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      Unit Limit Reached
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm">
                      You've mastered the first 20 questions! To access the remaining <b>{questions.length - 20} questions</b> in this unit and unlock full clinical rationales, upgrade to a Pro plan.
                    </p>

                    <button
                      onClick={() => navigate("/subscription")} // Smooth internal navigation
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 group"
                    >
                      <span>Access Full Unit Content</span>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                );
              }

              return (
                <div key={q.id} className="relative flex flex-col gap-0 w-full rounded-lg overflow-hidden">
                  {/* ... the rest of your original code ... */}
                  {/* Question Card */}
                  <div
                    className={cn(
                      "flex-1 px-4 py-2 transition-all duration-300 border-0", // Base: added border-2
                      "shadow-sm rounded-xl", // Modern "App" feel with larger rounded corners

                      // STATUS: UNDERSTOOD (Clinical Green Outline)
                      understood[q.id]
                        ? "border-emerald-500 bg-emerald-50/30 dark:border-emerald-500/50 dark:bg-emerald-500/5"

                        // STATUS: NOT UNDERSTOOD (Observation Red Outline)
                        : notUnderstood[q.id]
                          ? "border-rose-500 bg-rose-50/30 dark:border-rose-500/50 dark:bg-rose-500/5"

                          // STATUS: DEFAULT (Neutral Slate Outline)
                          : "border-slate-100 bg-white dark:border-slate-800 dark:bg-muted/30",

                      "text-slate-900 dark:text-slate-100"
                    )}>

                    <div className="min-h-[70px] flex items-start">
                      <p className="font-bold mb-2 leading-relaxed">
                        Q{i + 1}: {q.question_text}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm">
                      {["A", "B", "C", "D"].map((letter) => {
                        const optionText = q[`option_${letter.toLowerCase() as "a" | "b" | "c" | "d"}`];
                        const isSelected = selectedAnswer === letter;
                        const correct = q.correct_answer === letter;
                        return (
                          <button
                            key={letter}
                            className={`w-full text-left px-4 py-3 rounded-none sm:rounded-md font-semibold
border-l-4 transition-all duration-150

${selectedAnswer
                                ? correct
                                  ? "bg-transparent border-l-blue-500 text-black dark:text-white"
                                  : "bg-transparent border-l-gray-400 text-black dark:text-white"
                                : "bg-transparent border-l-gray-200 dark:border-l-gray-700 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                              }

${selectedAnswer ? "cursor-default opacity-95" : "cursor-pointer"}`}
                            onClick={async () => {
                              if (!!selectedAnswer || quizFinished) return;
                              //  PLAY SOUND IMMEDIATELY
                              if (!isMuted) {
                                playSound(q.correct_answer === letter ? "tap-correct" : "tap-wrong");
                              }
                              const correct = q.correct_answer === letter;
                              //  SHOW REASON BOX IMMEDIATELY (NO DELAY)
                              if (!correct) {
                                setShowReasonBox(prev => ({ ...prev, [q.id]: true }));
                              }
                              //  VIBRATION
                              if (navigator.vibrate) {
                                if (correct) {
                                  navigator.vibrate(50); // short for correct
                                } else {
                                  navigator.vibrate([100, 50, 100]); // stronger for wrong
                                }
                              }
                              // 1️ TIME TAKEN
                              const endTime = Date.now();
                              const timeTaken = (endTime - questionStartTime) / 1000;

                              // 2️ CONFIDENCE LOGIC
                              let confidence = "";
                              let accuracy = 0;
                              if (correct) {
                                confidence = "High confidence";
                                accuracy = 100;
                              } else if (timeTaken <= 10) {
                                confidence = "Overconfident";
                                accuracy = Math.floor(Math.random() * 20);
                              } else if (timeTaken <= 20) {
                                confidence = "Medium confidence";
                                accuracy = Math.floor(Math.random() * 30) + 50;
                              } else {
                                confidence = "Low confidence";
                                accuracy = Math.floor(Math.random() * 30) + 20;
                              }

                              // 3️ SAVE CONFIDENCE FOR THIS QUESTION
                              setConfidenceLevels((prev) => {
                                const updated = { ...prev, [q.id]: confidence };
                                localStorage.setItem("confidenceLevels", JSON.stringify(updated));
                                return updated;
                              });

                              // 4️ ORIGINAL ANSWER LOGIC
                              handleAnswer(q.id, letter);

                              //  LIVE ANSWER EVENT (for floating activity feed)
                              if (!userId) return; // userId from const userId = session?.user?.id;

                              try {
                                await supabase.from("live_answer_events").insert({
                                  user_id: userId,
                                  question_id: q.id,
                                  event_type: correct ? "answered_correct" : "answered_wrong",
                                  is_correct: correct,
                                  streak_count: null,
                                  points: correct ? 1 : 0,
                                });
                              } catch (err) {
                                console.error("Error inserting live event:", err);
                              }

                              // 5️ RECORD MISTAKE IF WRONG
                              if (!correct) {
                                //  SHOW REASON BOX IMMEDIATELY (NO WAIT)
                                setShowReasonBox(prev => ({ ...prev, [q.id]: true }));

                                //  SAVE TO SUPABASE IN BACKGROUND (PRESERVES TAGGING)
                                if (!userId) return; // userId from session

                                (async () => {
                                  try {
                                    // Upsert first attempt
                                    await supabase.from("user_mistakes").upsert(
                                      {
                                        user_id: userId,
                                        question_id: q.id,
                                        quiz_id: q.quiz_id,
                                        last_wrong_at: new Date(),
                                        times_wrong: 1,
                                        user_selected: letter,
                                      },
                                      { onConflict: "user_id,question_id" }
                                    );

                                    // Increment times_wrong using RPC
                                    await supabase.rpc("increment_mistake", {
                                      user_uuid: userId,
                                      question_uuid: q.id,
                                      selected_option: letter,
                                    });

                                  } catch (error) {
                                    console.error("Error recording mistake:", error);
                                  }
                                })();
                              }
                            }}
                          >
                            <div
                              className={`
    flex justify-between items-center p-2.5 px-3.5 rounded-lg border transition-all duration-200
    ${!selectedAnswer
                                  ? "border-0 bg-white hover:border-blue-400  dark:bg-slate-800 dark:hover:border-blue-500"
                                  : "border-0 bg-white dark:bg-slate-800" // Keep background neutral after selection
                                }
    ${selectedAnswer && q.correct_answer !== letter && selectedAnswer !== letter ? "opacity-50" : "opacity-100"}
  `}
                            >
                              <div className="flex items-center gap-3">
                                {/* HIGHLIGHTED LETTER BOX - The main visual indicator */}
                                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-md border transition-colors duration-300 ${selectedAnswer && q.correct_answer === letter
                                  ? "bg-emerald-500 border-0 text-white" // Correct answer (always show green)
                                  : selectedAnswer === letter && q.correct_answer !== letter
                                    ? "bg-rose-500 border-0 text-white" // User's wrong pick (show red)
                                    : "bg-slate-100 dark:bg-slate-700 border-0 text-slate-500 dark:text-slate-400"
                                  }`}>
                                  {letter}
                                </span>

                                {/* Option Text - Stays clean/neutral */}
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                  {optionText}
                                </span>
                              </div>

                              {/* FEEDBACK AT THE END */}
                              <div className="flex items-center ml-4">
                                {selectedAnswer && (
                                  q.correct_answer === letter ? (
                                    <div className="flex items-center gap-1.5 animate-[pop_0.3s_ease-out]">
                                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Correct</span>
                                      <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                  ) : selectedAnswer === letter ? (
                                    <div className="flex items-center gap-1.5 animate-[shake_0.4s_ease-in-out]">
                                      <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-tight">Wrong</span>
                                      <X className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                                    </div>
                                  ) : null
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-center gap-3 w-full">
                      {/* PREV BUTTON */}
                      <button
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="inline-flex items-center justify-center gap-2 px-6 h-11 rounded-xl
        border border-gray-200 bg-white text-gray-700
        dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200
        hover:bg-gray-50 dark:hover:bg-gray-800
        active:bg-gray-100 dark:active:bg-gray-700
        transition-all duration-200 font-semibold shadow-sm
        disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <ChevronLeft size={18} />
                        <span>Previous</span>
                      </button>



                      {/* --- NEW DYNAMIC NEXT/UNLOCK BUTTON --- */}
                      <button
                        onClick={() => {
                          // If user is at question 20 (index 19) and is NOT premium, send to subscription
                          if (!isPremium && currentQuestionIndex === 19) {
                            navigate("/subscription");
                          } else {
                            // Otherwise, normal next question logic
                            setCurrentQuestionIndex(prev =>
                              prev < filteredQuestions.length - 1 ? prev + 1 : prev
                            );
                          }
                        }}
                        // We REMOVE the !isPremium check from disabled so the button remains clickable
                        disabled={currentQuestionIndex === filteredQuestions.length - 1}
                        className={cn(
                          "inline-flex items-center justify-center gap-2 px-8 h-11 rounded-xl transition-all duration-200 font-semibold shadow-sm active:scale-[0.98]",
                          // Change color to Gold/Amber if it's the "Unlock" state to make it stand out
                          (!isPremium && currentQuestionIndex === 19)
                            ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white",
                          "disabled:opacity-30 disabled:cursor-not-allowed"
                        )}
                      >
                        <span>
                          {(() => {
                            if (!isPremium && currentQuestionIndex === 19) return "Unlock 100+ Questions";
                            if (currentQuestionIndex === filteredQuestions.length - 1) return "Finish";
                            return "Next";
                          })()}
                        </span>

                        {/* Show a Sparkle icon if it's the unlock button, otherwise the Chevron */}
                        {!isPremium && currentQuestionIndex === 19 ? (
                          <Sparkles size={18} />
                        ) : (
                          <ChevronRight size={18} />
                        )}
                      </button>
                    </div>
                    {/* --- START OF IMPROVED BLOCK --- */}
                    <div className="mt-1 flex flex-wrap items-center justify-between w-full gap-3 border-0 pt-4">

                      {/* Left Side: Help Buttons */}
                      <div className="flex items-center gap-2 w-full">

                        {/* --- CLINICAL RATIONALE (EXPLANATION) --- */}
                        <button
                          onClick={() => setOpenExplanationFor(q.id)}
                          disabled={!showFeedback}
                          className={`relative flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 group shadow-sm active:scale-95
    ${showFeedback
                              ? "bg-white dark:bg-muted/30 border-slate-200 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 hover:border-cyan-200 dark:hover:border-cyan-800"
                              : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed"
                            }`}
                        >
                          <BookOpen className={`w-4 h-4 transition-colors ${showFeedback ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400"}`} />

                          <span className={`text-[11px] font-bold uppercase tracking-[0.1em] ${showFeedback ? "text-slate-700 dark:text-slate-300 group-hover:text-cyan-700 dark:group-hover:text-cyan-300" : "text-slate-400"}`}>
                            Clinical Rationale
                          </span>

                          {/* TOOLTIP */}
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3
    opacity-0 group-hover:opacity-100
    pointer-events-none
    bg-slate-900 text-white text-[9px]
    px-2 py-1 rounded-md whitespace-nowrap
    transition-all shadow-xl z-[9999] border border-slate-700 uppercase tracking-tighter">
                            {showFeedback ? "View scientific breakdown" : "Complete quiz to unlock insight"}
                          </span>
                        </button>


                        {/* --- AI CONSULTATION (AI ASSISTANCE) --- */}
                        <button
                          onClick={() => {
                            const optionsText = ["A", "B", "C", "D"]
                              .map(letter => `${letter}: ${q[`option_${letter.toLowerCase() as "a" | "b" | "c" | "d"}`]}`)
                              .join("\n");
                            const fullText = `Let's discuss this question:\nQuestion: ${q.question_text}\nOptions:\n${optionsText}\nUser Answer: ${answers[q.id] || "No answer selected"}`;

                            setAIPrefillQuestion(fullText);
                            setAIOverlayOpen(true);
                          }}
                          className="relative flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-muted/30 transition-all duration-300 group hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-200 dark:hover:border-purple-800 shadow-sm active:scale-95"
                        >
                          <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400 group-hover:animate-spin-slow transition-transform" />

                          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-700 dark:text-slate-300 group-hover:text-purple-700 dark:group-hover:text-purple-300">
                            AI Consultation
                          </span>

                          {/* TOOLTIP */}
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3
    opacity-0 group-hover:opacity-100
    pointer-events-none
    bg-slate-900 text-white text-[9px]
    px-2 py-1 rounded-md whitespace-nowrap
    transition-all shadow-xl z-[9999] border border-slate-700 uppercase tracking-tighter">
                            Initiate Virtual MD analysis
                          </span>
                        </button>
                        {/* Mute Toggle */}
                        <button
                          onClick={toggleMute}
                          className={`ml-auto relative flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 group shadow-sm active:scale-95
    ${isMuted
                              ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                              : "bg-white dark:bg-muted/30 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800"}
  `}
                        >
                          {/* Dynamic Icon with Clinical Styling */}
                          <div className="relative">
                            {isMuted ? (
                              <VolumeX className="w-4 h-4 text-slate-400 dark:text-slate-500 transition-colors" />
                            ) : (
                              <>
                                <Volume2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                                {/* Subtle animation ring for "Active" sound */}
                                <span className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-20" />
                              </>
                            )}
                          </div>

                          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-700 dark:text-slate-300">
                            {isMuted ? "Audio Muted" : "Monitor Active"}
                          </span>

                          {/* PROFESSIONAL TOOLTIP */}
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3
    opacity-0 group-hover:opacity-100
    pointer-events-none
    bg-slate-900 text-white text-[9px]
    px-2 py-1 rounded-md whitespace-nowrap
    transition-all shadow-xl z-[9999] border border-slate-700 uppercase tracking-tighter">
                            {isMuted ? "Enable system telemetry sounds" : "Silence audio monitoring"}
                          </span>
                        </button>

                      </div>

                      {/* Right Side: System Buttons */}
                      <div className="flex items-center gap-2 w-full">
                        {/* Reset Quiz button */}
                        <button
                          onClick={handleReset}
                          disabled={resetting}
                          className={`relative flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 group shadow-sm
    ${resetting
                              ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-70 cursor-not-allowed"
                              : "bg-white dark:bg-muted/30 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 active:scale-95"}
  `}
                        >
                          {resetting ? (
                            // 🔄 REFINED SPINNER
                            <svg
                              className="animate-spin h-4 w-4 text-slate-500"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          ) : (
                            <RotateCcw className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:rotate-[-180deg] transition-transform duration-500" />
                          )}

                          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-700 dark:text-slate-300">
                            {resetting ? "Resetting Session..." : "Reset & Restart"}
                          </span>

                          {/* MEDICAL STYLE TOOLTIP */}
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3
    opacity-0 group-hover:opacity-100
    pointer-events-none
    bg-slate-900 text-white text-[9px]
    px-2 py-1 rounded-md whitespace-nowrap
    transition-all shadow-xl z-[9999] border border-slate-700 uppercase tracking-tighter">
                            {resetting ? "Purging current progress..." : "Wipe progress and start over"}
                          </span>
                        </button>
                        <button
                          onClick={handleResetTimer}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-800/50 active:scale-95 transition-all group shadow-sm"
                        >
                          <TimerReset className="w-4 h-4 text-green-600 dark:text-green-300 group-hover:rotate-[-45deg] transition-transform duration-300" />

                          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-green-700 dark:text-green-300">
                            Reset Timer
                          </span>

                          {/* Optional: Subtle Tooltip kept for extra clarity */}
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3
    opacity-0 group-hover:opacity-100
    pointer-events-none
    bg-slate-900 text-white text-[9px]
    px-2 py-1 rounded-xl whitespace-nowrap
    transition-all shadow-xl z-[9999] border border-slate-700">
                            Restart Session Clock
                          </span>
                        </button>
                        {/* Report Button */}
                        <button
                          onClick={() => handleReportQuestion(q)}
                          className="ml-auto relative flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-muted/30 transition-all duration-300 group hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 dark:hover:border-red-800 shadow-sm active:scale-95"
                        >
                          {/* Warning Icon with a subtle shake animation on hover */}
                          <AlertCircle className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-red-500 transition-colors group-hover:animate-pulse" />

                          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-400 group-hover:text-red-700 dark:group-hover:text-red-400">
                            Flag Anomaly
                          </span>

                          {/* TOOLTIP: Explains the clinical purpose */}
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3
    opacity-0 group-hover:opacity-100
    pointer-events-none
    bg-slate-900 text-white text-[9px]
    px-2 py-1 rounded-md whitespace-nowrap
    transition-all shadow-xl z-[9999] border border-slate-700 uppercase tracking-tighter">
                            Report content discrepancy
                          </span>
                        </button>


                      </div>
                    </div>
                    {/* --- END OF IMPROVED BLOCK --- */}


                    <div className="mt-2 flex flex-col items-center gap-3 w-full">
                      {/* Progress Indicator (Subtle professional touch) */}
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Question {currentQuestionIndex + 1} of {filteredQuestions.length}
                      </span>


                    </div>
                  </div>

                  <QuestionInsights
                    confidenceLevel={confidenceLevels[q.id]}
                    showReasonBox={showReasonBox[q.id]}
                    selectedReason={selectedReason[q.id]}
                    reasonOptions={reasonOptions}
                    onReasonSelect={async (reason) => {
                      setSelectedReason(prev => ({ ...prev, [q.id]: reason }));
                      setShowReasonBox(prev => ({ ...prev, [q.id]: false }));

                      if (!userId) return;

                      try {
                        const { error } = await supabase
                          .from("user_mistakes")
                          .update({ mistake_reason: reason })
                          .eq("user_id", userId)
                          .eq("question_id", q.id);

                        if (error) throw error;
                      } catch (err) {
                        console.error("Error saving mistake reason:", err);
                      }
                    }}
                  />


                  <div className="w-full border-0 bg-transparent">
                    <NotesEvaluationPanel
                      q={q}
                      userId={userId}
                      notes={notes}
                      setNotes={setNotes}
                      understood={understood}
                      setUnderstood={setUnderstood}
                      notUnderstood={notUnderstood}
                      setNotUnderstood={setNotUnderstood}
                      attempts={attempts}
                      setAttempts={setAttempts}
                      saving={saving}
                      setSaving={setSaving}
                      saved={saved}
                      setSaved={setSaved}
                      helpOthersDisabled={helpOthersDisabled}
                      setHelpOthersDisabled={setHelpOthersDisabled}
                      setHelpMeHelpers={setHelpMeHelpers}
                      setCurrentQuestionText={setCurrentQuestionText}
                      setHelpMeOverlayOpen={setHelpMeOverlayOpen}
                      saveNoteOffline={saveNoteOffline}
                      saveAnswersOffline={saveAnswersOffline}
                      supabase={supabase}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <AlertTriangle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">No questions found for <b>{selectedCourse}</b> in this unit.</p>
              <button onClick={() => setSelectedCourse("All")} className="mt-4 text-indigo-600 font-bold">View All Questions</button>
            </div>
          )}
        </div>
        <ExplanationOverlay
          open={!!openExplanationFor}
          onClose={() => setOpenExplanationFor(null)}
          isCorrect={
            questions.find(q => q.id === openExplanationFor)?.correct_answer ===
            answers[openExplanationFor || ""]
          }
          correctAnswer={
            questions.find(q => q.id === openExplanationFor)?.correct_answer
          }
          explanation={
            questions.find(q => q.id === openExplanationFor)?.explanation
          }
          additional={
            questions.find(q => q.id === openExplanationFor)?.additional
          }
        />
        <HelpMeOverlay
          helpMeOverlayOpen={helpMeOverlayOpen}
          setHelpMeOverlayOpen={setHelpMeOverlayOpen}
          helpMeHelpers={helpMeHelpers}
          currentQuestionText={currentQuestionText}
        />
        <SubmitQuizButton
          quizFinished={quizFinished}
          answers={answers}
          questions={questions}
          handleSubmit={handleSubmit}
        />
        <QuizResultsPanel
          quizFinished={quizFinished}
          finalScore={finalScore}
          questions={questions}
          attempts={attempts}
          playSound={playSound}
        />
        <OverlayAI
          isOpen={isAIOverlayOpen}
          onClose={() => setAIOverlayOpen(false)}
          prefillQuestion={aiPrefillQuestion}
          isDarkTheme={isDarkMode} // Pass theme flag
        />
        {
          showScrollTop && (
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className={`fixed bottom-6 right-6 p-3 rounded-none sm:rounded-md-full shadow-lg hover:scale-110 transition-transform
      ${isDarkMode ? "bg-white text-gray-900" : "bg-gray-900 text-white"}`}
              aria-label="Scroll to top"
            >
              <ArrowUp size={20} strokeWidth={2} />
            </button>
          )
        }

      </div>
    </div >
  );
}
