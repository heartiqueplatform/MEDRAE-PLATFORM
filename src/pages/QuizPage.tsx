"use client";

import { openDB } from "idb";
import { playSound } from "@/lib/soundManager";
import { GlobalLoader } from "@/components/GlobalLoader";
import { useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Flashcard } from "@/components/Flashcard";
import Countdown from "react-countdown";
import { supabase } from "@/lib/supabaseClient";
import OverlayAI from "@/components/OverlayAI";
import { ArrowUp, HelpCircle, CheckCircle2, PanelRightOpen, ChevronDown, ChevronUp, TimerReset, RotateCcw, Save, Users, MessageCircle, X, Cpu, AlertTriangle, Volume, VolumeX, Filter } from "lucide-react";
import FloatingChat from "@/components/FloatingChat";
import { getUnitOffline, saveUnitOffline, getAnswersOffline, saveAnswersOffline, } from "@/lib/indexedDb";
import { saveNoteOffline, getNoteOffline, getPendingNotes, markNoteSynced } from "@/lib/indexedDb"; // adjust path if needed

import { useSession } from "@supabase/auth-helpers-react";
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
}
interface Attempt {
  id: string;
  score: number;
  submitted_at: string;
  answers_json: Record<string, string>;
}
const TIMER_DURATION = 10_800_000; // 3 hours
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
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedbackShown, setFeedbackShown] = useState<Record<string, boolean>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const [showUnansweredOnly, setShowUnansweredOnly] = useState(false);
  const [recentlyAnsweredId, setRecentlyAnsweredId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
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
            }], { onConflict: ["question_id", "user_id"] });

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
  }, [unit]);

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

  const filteredQuestions = showUnansweredOnly
    ? questions.filter(
      q => !answers[q.id] || lockedVisible[q.id]
    )
    : questions;
  return (
    <div className="space-y-0 max-w-8xl mx-auto px-3 sm:px-6 lg:px-8  ">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h1 className="w-full sm:w-auto uppercase text-xl sm:text-2xl md:text-3xl font-bold tracking-tight leading-snug text-blue-700 dark:text-blue-400">
          {unit}
        </h1>
        {/* Always show the timer, even if timerEnd is undefined or after submission */}
        <Countdown
          date={timerEnd ?? new Date().getTime() + 1000 * 60 * 60 * 3} // fallback 1 hour if undefined
          onComplete={() => handleSubmit(true)}
          renderer={({ hours, minutes, seconds }) => (
            <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-red-600 dark:text-red-400 flex-shrink-0">
              {/* Label */}
              <span className="uppercase tracking-wide">Time:</span>

              {/* Countdown bar / numbers */}
              <div className="flex items-center gap-1 sm:gap-2">
                <span>{hours ?? '--'}</span>:
                <span>{minutes ?? '--'}</span>:
                <span>{seconds !== undefined ? (seconds < 10 ? `0${seconds}` : seconds) : '--'}</span>
              </div>

              {/* Optional thin underline bar matching heading */}
              <div className="flex-1 h-[2px] bg-red-500 dark:bg-red-400 rounded-full"></div>
            </div>
          )}
        />
        {/* 🔹 Sticky Quiz Progress Button + Centered Overlay */}
        <div className="sticky top-0 z-50 flex flex-col w-60">

          {/* Toggleable Progress Button */}
          <button
            onClick={() => setProgressOpen(!progressOpen)}
            className={`flex items-center gap-2 px-3 h-8 rounded-full text-white shadow-lg transition
      ${Object.keys(answers).length / questions.length < 0.5
                ? 'bg-red-600 hover:bg-red-700'
                : Object.keys(answers).length / questions.length < 0.7
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-green-600 hover:bg-green-700'}
    `}
            title="Click to view full progress"
          >
            <span className="font-bold">{Object.keys(answers).length}/{questions.length}</span>
            <span className="font-medium">Q's Answered</span>
            {progressOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Centered Overlay */}
          {progressOpen && (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-70 p-4 pt-10">

              <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-3xl max-h-[80vh] text-center shadow-lg overflow-auto  custom-scrollbar">

                {/* ❌ Top-right Close Button */}
                <button
                  onClick={() => setProgressOpen(false)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-200 dark:hover:text-white text-xl font-bold transition"
                  title="Close"
                >
                  ×
                </button>

                {/* Header */}
                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
                  Quiz Progress
                </h2>

                {/* Stats */}
                <div className="flex justify-center gap-6 mb-4 text-gray-700 dark:text-gray-300">
                  <div>Answered: {Object.keys(answers).length}</div>
                  <div>Unanswered: {questions.length - Object.keys(answers).length}</div>
                  <div>Total: {questions.length}</div>
                </div>

                {/* Horizontal Circle Tracker */}
                <div className="flex flex-wrap justify-center gap-2">
                  {questions.map((q, index) => {
                    const userAnswer = answers[q.id];
                    let circleColor = "bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200";

                    if (userAnswer !== undefined) {
                      circleColor = userAnswer === q.correct_answer
                        ? "bg-green-500 text-white"
                        : "bg-red-500 text-white";
                    }

                    return (
                      <div
                        key={q.id}
                        ref={(el) => (circleRefs.current[index] = el)}
                        className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${circleColor}`}
                        title={`Question ${index + 1} ${userAnswer !== undefined ? `(Your answer: ${userAnswer})` : ""}`}
                      >
                        {index + 1}
                      </div>
                    );
                  })}

                  {/* Total circle */}
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 text-white font-bold">
                    {questions.length}
                  </div>
                </div>

                {/* Close button */}
                <button
                  className="mt-6 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-bold transition"
                  onClick={() => setProgressOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {checkpointOverlay?.visible && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white p-4">
          <div className="bg-gray-900 dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full text-center shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Checkpoint Reached!</h2>
            <p className="mb-4 text-lg">
              You completed {checkpointOverlay.reached} / {checkpointOverlay.total} questions in this checkpoint.
            </p>
            <p className="mb-4 text-lg">
              Progress in this checkpoint: {checkpointOverlay.percentCompleted}%
            </p>
            <p className="mb-6 text-base text-gray-300">
              Submit your answers for this batch, or continue if you want to review more questions.
            </p>

            <div className="flex justify-center gap-4">
              {/* Submit button */}
              <button
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-md transition"
                onClick={async () => {
                  if (!quizId || !userId || !checkpointOverlay) return;

                  // --- Strong vibration ---
                  if (navigator.vibrate) {
                    navigator.vibrate([200, 100, 200]); // vibrate pattern: 200ms, pause 100ms, 200ms
                  }
                  // --- SOUND ---
                  playSound("start"); // ⚡ reuse the same sound used for "Load More"

                  // Calculate the IDs for this checkpoint batch
                  const startIndex = lastCheckpoint - checkpointOverlay.total;
                  const checkpointQuestionIds = Object.keys(answers).slice(startIndex, startIndex + checkpointOverlay.total);

                  // Count correct answers in this checkpoint
                  const correctInCheckpoint = checkpointQuestionIds.reduce((count, qid) => {
                    const q = questions.find(q => q.id === qid);
                    return q && answers[qid] === q.correct_answer ? count + 1 : count;
                  }, 0);

                  // Insert into quiz_results
                  await supabase.from("quiz_results").insert([{
                    quiz_id: quizId,
                    user_id: userId,
                    unit: unit,
                    score: correctInCheckpoint,
                    total_questions: checkpointOverlay.total
                  }]);

                  // Close overlay
                  setCheckpointOverlay(null);
                }}
              >
                Submit Results
              </button>

              {/* Cancel / Continue button */}
              <button
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold px-6 py-3 rounded-md transition"
                onClick={() => {
                  setCheckpointOverlay(null); // just close overlay
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 🔹 React Hooks for smooth scroll */}


      <div className="mt-2 flex justify-between items-center w-full gap-4">
        {/* Left side: Question actions */}
        <div className="flex items-center gap-4">
          {/* Show Filtered / Unanswered button */}
          <button
            onClick={() => setShowUnansweredOnly(!showUnansweredOnly)}
            className="relative group flex items-center gap-2 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition"
          >
            <Filter className="w-5 h-5 text-gray-800 dark:text-gray-200" />

            {/* Text label always visible */}
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {showUnansweredOnly ? "Filter On" : "Showing All"}
            </span>

            {/* Tooltip (unchanged logic) */}
            <span
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
      opacity-0 group-hover:opacity-100
      pointer-events-none
      bg-gray-900 text-white text-[10px]
      px-2 py-1 rounded-md whitespace-nowrap
      transition shadow-lg  z-[9999]"
            >
              {showUnansweredOnly
                ? "Showing: Unanswered"
                : "Showing: All Questions"}
            </span>
          </button>
          {/* Reset Quiz button */}
          <button
            onClick={handleReset}
            disabled={resetting}
            className={`relative group p-2 rounded-full transition flex items-center gap-2
    ${resetting ? "opacity-70 cursor-not-allowed" : "hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95"}
  `}
          >
            {resetting ? (
              // 🔄 SPINNER (YOUR SVG – UNCHANGED)
              <svg
                className="animate-spin h-4 w-4 text-gray-700 dark:text-gray-200"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            ) : (
              <RotateCcw className="w-5 h-5 text-gray-800 dark:text-gray-200" />
            )}

            <span className="text-sm text-gray-800 dark:text-gray-200">
              {resetting ? "Resetting…" : "Reset & Restart"}
            </span>

            {/* Tooltip */}
            <span
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
    opacity-0 group-hover:opacity-100
    pointer-events-none
    bg-gray-900 text-white text-[10px]
    px-2 py-1 rounded-md whitespace-nowrap
    transition shadow-lg  z-[9999]"
            >
              {resetting ? "Resetting quiz…" : "Reset & restart this quiz"}
            </span>
          </button>
        </div>

        {/* Right side: Timer action */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetTimer}
            className="relative group p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-700 active:scale-95 transition"
          >
            <TimerReset className="w-5 h-5 text-green-600 dark:text-green-300" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          opacity-0 group-hover:opacity-100
          pointer-events-none
          bg-gray-900 text-white text-[10px]
          px-2 py-1 rounded-md whitespace-nowrap
          transition shadow-lg  z-[9999]">
              Reset Timer
            </span>
          </button>
        </div>
      </div>
      <div className="flex flex-col space-y-4">
        {filteredQuestions.slice(0, visibleCount).map((q, i) => {
          const selectedAnswer = answers[q.id];
          const isCorrect = selectedAnswer === q.correct_answer;
          const showFeedback = feedbackShown[q.id];
          return (
            <div key={q.id} className="flex flex-col lg:flex-row gap-2 w-full">

              {/* Question Card */}
              <div
                className={`
    flex-1
     px-0 py-2
    rounded-none
    shadow-none
    border-0
    text-black dark:text-white
    transition-colors
    ${understood[q.id]
                    ? "bg-green-300 dark:bg-green-800"
                    : notUnderstood[q.id]
                      ? "bg-[#FF4C4C] dark:bg-[#800000]"
                      : "bg-transparent dark:bg-transparent lg:bg-gray-100 lg:dark:bg-gray-900"

                  }
    sm:px-4 sm:py-4 sm:rounded-md sm:shadow-none sm:border-0
  `} >
                <p className="font-bold mb-2">Q{i + 1}: {q.question_text}</p>
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
${isSelected
                            ? correct
                              ? "bg-green-500 dark:bg-green-600 border-l-green-800 text-black dark:text-white"
                              : "bg-red-500 dark:bg-red-600 border-l-red-800 text-black dark:text-white"
                            : "bg-yellow-400 dark:bg-amber-700 border-l-yellow-600 text-black dark:text-white hover:bg-blue-500 dark:hover:bg-blue-800"
                          }
${selectedAnswer ? "cursor-default opacity-95" : "cursor-pointer"}`}
                        onClick={async () => {
                          if (!!selectedAnswer || quizFinished) return;
                          // ✅ PLAY SOUND IMMEDIATELY
                          if (!isMuted) {
                            playSound(q.correct_answer === letter ? "tap-correct" : "tap-wrong");
                          }
                          const correct = q.correct_answer === letter;
                          // ✅ SHOW REASON BOX IMMEDIATELY (NO DELAY)
                          if (!correct) {
                            setShowReasonBox(prev => ({ ...prev, [q.id]: true }));
                          }
                          // ✅ VIBRATION
                          if (navigator.vibrate) {
                            if (correct) {
                              navigator.vibrate(50); // short for correct
                            } else {
                              navigator.vibrate([100, 50, 100]); // stronger for wrong
                            }
                          }
                          // 1️⃣ TIME TAKEN
                          const endTime = Date.now();
                          const timeTaken = (endTime - questionStartTime) / 1000;

                          // 2️⃣ CONFIDENCE LOGIC
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

                          // 3️⃣ SAVE CONFIDENCE FOR THIS QUESTION
                          setConfidenceLevels((prev) => {
                            const updated = { ...prev, [q.id]: confidence };
                            localStorage.setItem("confidenceLevels", JSON.stringify(updated));
                            return updated;
                          });

                          // 4️⃣ ORIGINAL ANSWER LOGIC
                          handleAnswer(q.id, letter);

                          // 🔴 LIVE ANSWER EVENT (for floating activity feed)
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

                          // 5️⃣ RECORD MISTAKE IF WRONG
                          if (!correct) {
                            // ✅ SHOW REASON BOX IMMEDIATELY (NO WAIT)
                            setShowReasonBox(prev => ({ ...prev, [q.id]: true }));

                            // 🔄 SAVE TO SUPABASE IN BACKGROUND (PRESERVES TAGGING)
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
                        <div className="flex justify-between items-center relative">
                          <span>{letter}. {optionText}</span>
                          {/* Emoji reaction */}
                          {isSelected && correct && <span className="ml-2 text-4xl animate-emoji-zoom">😊</span>}
                          {isSelected && !correct && <span className="ml-2 text-4xl animate-emoji-zoom">😢</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {/* Confidence Label with Accuracy */}
                {confidenceLevels[q.id] && (
                  <div
                    className={`mt-3 px-4 py-2 rounded-2xl text-center
${confidenceLevels[q.id]?.startsWith("High confidence")
                        ? "bg-green-600 text-white"
                        : confidenceLevels[q.id]?.startsWith("Overconfident")
                          ? "bg-red-600 text-white"
                          : confidenceLevels[q.id]?.startsWith("Medium confidence")
                            ? "bg-yellow-500 text-black"
                            : "bg-gray-600 text-white"
                      }`}
                  >
                    <span className="text-xl font-extrabold">
                      Confidence Rating: {confidenceLevels[q.id].toUpperCase()}
                      {(() => {
                        let accuracyText = "";
                        if (confidenceLevels[q.id]?.startsWith("High confidence")) accuracyText = "100% Accuracy";
                        else if (confidenceLevels[q.id]?.startsWith("Overconfident")) accuracyText = `${Math.floor(Math.random() * 20)}% Accuracy`;
                        else if (confidenceLevels[q.id]?.startsWith("Medium confidence")) accuracyText = `${Math.floor(Math.random() * 30) + 50}% Accuracy`;
                        else if (confidenceLevels[q.id]?.startsWith("Low confidence")) accuracyText = `${Math.floor(Math.random() * 30) + 20}% Accuracy`;
                        return accuracyText ? ` (${accuracyText})` : "";
                      })()}
                    </span>
                  </div>
                )}
                {/* Reason Box */}
                {showReasonBox[q.id] && !selectedReason[q.id] && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <p className="text-lg font-medium">What went wrong!?</p>
                    {reasonOptions.map((reason) => (
                      <button
                        key={reason}
                        className={`px-3 py-1 rounded-none sm:rounded-md
    ${selectedReason[q.id] === reason
                            ? "bg-blue-500 text-white dark:bg-blue-700"
                            : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                          }`}
                        onClick={async () => {
                          setSelectedReason(prev => ({ ...prev, [q.id]: reason }));
                          setShowReasonBox(prev => ({ ...prev, [q.id]: false }));

                          if (!userId) return; // userId from useSession()
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
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleReportQuestion(q)}
                    className="
    flex items-center gap-2
    px-3 h-8
    rounded-md
    bg-transparent
    text-red-600

    dark:border-red-400 dark:text-red-400
    dark:hover:bg-red-500 dark:hover:text-white
    transition
  " >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                    </svg>

                    <span className="text-xs font-medium whitespace-nowrap">
                      Report Question
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      const optionsText = ["A", "B", "C", "D"]
                        .map(
                          letter =>
                            `${letter}: ${q[`option_${letter.toLowerCase() as "a" | "b" | "c" | "d"}`]
                            }`
                        )
                        .join("\n");
                      const chunkText = (text: string, maxLength = 200) => {
                        const chunks: string[] = [];
                        let start = 0;
                        while (start < text.length) {
                          chunks.push(text.slice(start, start + maxLength));
                          start += maxLength;
                        }
                        return chunks.join("\n\n");
                      };
                      const fullText = `Let's discuss this question in NCK format:
Question: ${q.question_text}
Options:
${optionsText}
User Answer: ${answers[q.id] || "No answer selected"}
Please provide a detailed discussion and guidance.`;
                      setAIPrefillQuestion(chunkText(fullText, 200));
                      setAIOverlayOpen(true);
                    }}
                    className="
    flex items-center gap-2
    px-3 h-8
    rounded-md
    text-gray-700 dark:text-gray-300
    transition
  "
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                    </svg>

                    <span className="text-xs font-medium whitespace-nowrap">
                      AI Assistance
                    </span>
                  </button>



                  <button
                    onClick={toggleMute}
                    className="relative group w-8 h-8 flex items-center justify-center rounded-md text-gray-700 dark:text-gray-300 transition"
                  >
                    {isMuted ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                      </svg>

                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                      </svg>

                    )}

                    {/* Tooltip */}
                    <span
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
               opacity-0 group-hover:opacity-100
               pointer-events-none
               bg-gray-900 text-white text-[10px]
               px-2 py-1 rounded-md whitespace-nowrap
               transition shadow-lg z-50"
                    >
                      {isMuted ? "Unmute sounds" : "Mute sounds"}
                    </span>
                  </button>
                </div>

                {showFeedback && (
                  <div className="mt-3">
                    <p className={`font-semibold ${isCorrect ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {isCorrect ? "Correct!" : `Wrong. Correct answer is ${q.correct_answer}`}
                    </p>
                    {q.explanation && <p className="mt-1"><span className="font-semibold">Explanation:</span> {q.explanation}</p>}
                    {q.additional && (
                      <div className="mt-2">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                          Additional Explanation
                        </h3>
                        <pre className="text-base font-sans p-0 m-0 whitespace-pre-wrap text-black dark:text-white">
                          {q.additional}
                        </pre>

                      </div>
                    )}
                  </div>
                )}


                <Flashcard />


                {/* Load More button — only after last visible question */}
                {i === visibleCount - 1 && visibleCount < filteredQuestions.length && (
                  <div className="flex justify-center mt-8">
                    <button
                      id="loadMoreBtn"
                      className="mt-4 px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                      onClick={async (e) => {
                        const button = e.currentTarget as HTMLButtonElement;
                        button.disabled = true;

                        // Show spinner inside button
                        const originalContent = button.innerHTML;
                        button.innerHTML = `
        <span className="flex items-center gap-1">
        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        Loading...
        </span>`;

                        // Vibrate device (60-70ms)
                        if (navigator.vibrate) {
                          const duration = Math.floor(Math.random() * (70 - 60 + 1) + 60);
                          navigator.vibrate(duration);
                        }

                        // Play sound
                        await playSound("tap");

                        // Load more questions
                        setVisibleCount(prev => prev + QUESTIONS_PER_BATCH);

                        // Restore button content and enable
                        button.innerHTML = originalContent;
                        button.disabled = false;
                      }}
                    >
                      Load more questions

                    </button>


                  </div>
                )}
              </div>

              {/* Small Note Card */}
              <div className="w-full lg:w-1/3 p-1.5 sm:px-6 sm:py-4 rounded-md shadow-none border-0 bg-transparent dark:bg-transparent lg:bg-gray-100 lg:dark:bg-gray-900 text-black dark:text-white flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center mb-2 px-2 lg:px-0">

                  <h2 className="font-bold">Notes Evaluation Panel</h2>
                </div>

                {/* ------------------------------NOTES TEXTAREA------------------------------ */}
                <textarea
                  value={notes[q.id] || ""}
                  onChange={(e) => {
                    const value = e.target.value;

                    // Update React state
                    setNotes(prev => ({ ...prev, [q.id]: value }));

                    // Save offline immediately (non-blocking, no await)
                    saveNoteOffline(q.id, value).catch(err => console.error(err));
                  }}

                  className="w-full flex-1 p-2 border-0 resize-none bg-transparent overflow-x-auto  custom-scrollbar text-black dark:text-white mb-2 min-h-[200px]"
                  placeholder="Take notes here..."
                />
                <div className="flex gap-2 justify-end">

                  {/* ------------------------------Expand Notes Overlay------------------------------ */}
                  <button
                    onClick={() => setNotesOverlay(q.id)}
                    className="relative group w-8 h-8 flex items-center justify-center rounded-md  text-gray-700 dark:text-gray-300 transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>

                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition shadow-lg z-50">
                      Expand Notes
                    </span>
                  </button>

                  {/* ------------------------------ Understood Button------------------------------ */}
                  <button
                    onClick={async () => {
                      if (!userId) return;
                      const newState = !understood[q.id];
                      // Update local state
                      setUnderstood(prev => ({ ...prev, [q.id]: newState }));
                      setNotUnderstood(prev => ({ ...prev, [q.id]: false }));
                      // Save offline
                      await saveNoteOffline(q.id, notes[q.id] || "");
                      // Mark offline understood/not-understood locally
                      await saveAnswersOffline(q.id, {
                        understood: newState,
                        not_understood: false,
                        attempts: attempts[q.id] || 0,
                      });
                      // Attempt online sync
                      try {
                        await supabase
                          .from("question_notes")
                          .upsert([{
                            user_id: userId,
                            question_id: q.id,
                            note_text: notes[q.id] || "",
                            understood: newState,
                            is_not_understood: false,
                            attempts: attempts[q.id] || 0,
                            help_others: helpOthersDisabled[q.id] ? "saved" : null
                          }], { onConflict: "question_id, user_id" });
                      } catch (err) {
                        console.error("Error syncing Understood:", err);
                      }
                    }}
                    className={`relative group w-8 h-8 flex items-center justify-center rounded-md by-transparent text-gray-700 dark:text-gray-300 transition ${understood[q.id] ? "ring-2 ring-green-500" : ""}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-blue-500">
                      <path strokeLinecap="round" strokeLinejoin="round" fill="#2ad31a" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>

                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition shadow-lg z-50">
                      Understood
                    </span>
                  </button>

                  {/* ------------------------------Not Understood Button------------------------------ */}
                  <button
                    onClick={async () => {
                      if (!userId) return;
                      const newState = !notUnderstood[q.id];
                      // Update local state
                      setNotUnderstood(prev => ({ ...prev, [q.id]: newState }));
                      setUnderstood(prev => ({ ...prev, [q.id]: false }));
                      // Save offline
                      await saveNoteOffline(q.id, notes[q.id] || "");
                      await saveAnswersOffline(q.id, {
                        understood: false,
                        not_understood: newState,
                        attempts: attempts[q.id] || 0,
                      });
                      // Attempt online sync
                      try {
                        await supabase
                          .from("question_notes")
                          .upsert([{
                            user_id: userId,
                            question_id: q.id,
                            note_text: notes[q.id] || "",
                            understood: false,
                            is_not_understood: newState,
                            attempts: attempts[q.id] || 0,
                            help_others: helpOthersDisabled[q.id] ? "saved" : null
                          }], { onConflict: "question_id, user_id" });
                      } catch (err) {
                        console.error("Error syncing Not Understood:", err);
                      }
                    }}
                    className={`relative group w-8 h-8 flex items-center justify-center rounded-md  text-gray-700 dark:text-gray-300 transition ${notUnderstood[q.id] ? "ring-2 ring-red-500" : ""}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" fill="#e60e0e" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                    </svg>

                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition shadow-lg z-50">
                      Not Understood
                    </span>
                  </button>

                  {/* ------------------------------ Attempts Button------------------------------ */}
                  <button
                    onClick={async () => {
                      if (!userId) return;
                      const newCount = (attempts[q.id] || 0) + 1;
                      setAttempts(prev => ({ ...prev, [q.id]: newCount }));
                      // Save offline
                      await saveAnswersOffline(q.id, {
                        understood: understood[q.id] || false,
                        not_understood: notUnderstood[q.id] || false,
                        attempts: newCount,
                      });
                      await saveNoteOffline(q.id, notes[q.id] || "");
                      // Attempt online sync
                      try {
                        await supabase
                          .from("question_notes")
                          .upsert([{
                            user_id: userId,
                            question_id: q.id,
                            note_text: notes[q.id] || "",
                            understood: understood[q.id] || false,
                            is_not_understood: notUnderstood[q.id] || false,
                            attempts: newCount,
                            help_others: helpOthersDisabled[q.id] ? "saved" : null
                          }], { onConflict: "question_id, user_id" });
                      } catch (err) {
                        console.error("Error syncing Attempts:", err);
                      }
                    }}
                    className="relative group w-8 h-8 flex items-center justify-center rounded-md bg-transparent  text-gray-700 dark:text-gray-300 transition" >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" fill="#4aca0f" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>


                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition shadow-lg z-50">
                      Attempted: {attempts[q.id] || 0}
                    </span>
                  </button>

                  {/* ------------------------------Save Notes Button------------------------------ */}
                  <button
                    onClick={async () => {
                      if (!userId) return;
                      setSaving(true);
                      setSaved(false);
                      // 1. Save offline first
                      await saveNoteOffline(q.id, notes[q.id] || "");
                      try {
                        // 2. Upsert online directly — no need to check existing
                        await supabase
                          .from("question_notes")
                          .upsert([{
                            question_id: q.id,
                            user_id: userId,
                            note_text: notes[q.id] || "",
                            understood: understood[q.id] || false,
                            is_not_understood: notUnderstood[q.id] || false,
                            attempts: attempts[q.id] || 0,
                            help_others: helpOthersDisabled[q.id] ? "saved" : null
                          }], { onConflict: ["question_id", "user_id"] }); // <- handles both insert & update
                      } catch (err) {
                        console.error("Error syncing Save Notes:", err);
                      }
                      setSaving(false);
                      setSaved(true);
                      setTimeout(() => setSaved(false), 1000);
                    }}
                    className="relative group w-8 h-8 flex items-center justify-center rounded-md text-gray-700 dark:text-gray-300 transition" >
                    {saving ? (
                      <div className="flex space-x-1">
                        <span className="w-1 h-1 bg-gray-700 dark:bg-gray-300 rounded-full animate-bounce delay-0"></span>
                        <span className="w-1 h-1 bg-gray-700 dark:bg-gray-300 rounded-full animate-bounce delay-150"></span>
                        <span className="w-1 h-1 bg-gray-700 dark:bg-gray-300 rounded-full animate-bounce delay-300"></span>
                      </div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8">
                        <path strokeLinecap="round" strokeLinejoin="round" fill="#1013cc" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                      </svg>

                    )}
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition shadow-lg z-50">
                      {saving ? "Saving..." : saved ? "Saved" : "Save Notes"}
                    </span>
                  </button>

                  {/* ------------------------------Help Others Button------------------------------ */}
                  <button
                    onClick={async () => {
                      if (!userId || helpOthersDisabled[q.id]) return;

                      const phone = prompt("To help others in this question, Kindly Enter your WhatsApp number (with country code, e.g., +254712345678):");
                      if (!phone) return;
                      await saveNoteOffline(q.id, notes[q.id] || "");
                      try {
                        await supabase
                          .from("question_notes")
                          .upsert([{
                            user_id: userId,
                            question_id: q.id,
                            note_text: notes[q.id] || "",
                            understood: understood[q.id] || false,
                            is_not_understood: notUnderstood[q.id] || false,
                            attempts: attempts[q.id] || 0,
                            help_others: phone
                          }], { onConflict: "question_id, user_id" });
                        setHelpOthersDisabled(prev => ({ ...prev, [q.id]: true }));
                      } catch (err) {
                        console.error("Error saving Help Others:", err);
                      }
                    }}
                    disabled={helpOthersDisabled[q.id]}
                    className={`relative group w-8 h-8 flex items-center justify-center rounded-md text-gray-700 dark:text-gray-300 transition ${helpOthersDisabled[q.id] ? "opacity-50 cursor-not-allowed" : ""}`} >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8">
                      <path strokeLinecap="round" strokeLinejoin="round" fill="#0caae9" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>

                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition shadow-lg z-50">
                      {helpOthersDisabled[q.id] ? "Already shared" : "Help Others"}
                    </span>
                  </button>
                  {/* ------------------------------Help Me Button------------------------------ */}
                  <button
                    onClick={async () => {
                      if (!userId) return;

                      const { data, error } = await supabase
                        .from("question_notes")
                        .select(`id, help_others, profiles:user_id(name, avatar_url)`)
                        .eq("question_id", q.id)
                        .not("help_others", "eq", "none");

                      if (error) {
                        console.error("Error fetching helpers:", error);
                        alert("Failed to fetch helpers.");
                        return;
                      }

                      // Map helpers if any exist
                      const helpers = data?.map((d: any) => ({
                        id: d.id,
                        whatsapp: d.help_others,
                        profiles: d.profiles
                      })) || [];

                      setHelpMeHelpers(helpers); // This can be empty
                      setCurrentQuestionText(q.question_text);
                      setHelpMeOverlayOpen(true); // Always open the overlay
                    }}
                    className="relative group w-8 h-8 flex items-center justify-center rounded-md bg-transparent text-gray-700 dark:text-gray-300 transition">
                    <svg
                      role="img"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ width: "32px", height: "32px" }} // ✅ pixel control
                    >
                      <title>WhatsApp</title>
                      <path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition shadow-lg z-50">
                      Help Me
                    </span>
                  </button>
                  {notesOverlay === q.id && (
                    <div
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-0"
                      onClick={() => setNotesOverlay(null)} >
                      <div
                        className="bg-gray-50 dark:bg-gray-900 w-full h-[90vh] rounded-none sm:rounded-none shadow-lg flex flex-col p-4 overflow-auto"
                        onClick={(e) => e.stopPropagation()}  >

                        {/* ============================HEADER SECTION============================ */}
                        <div className="flex justify-between items-center mb-4">
                          <h2 className="font-bold text-xl text-blue-700 dark:text-blue-300">
                            Expanded Notes Panel
                          </h2>
                          <button
                            onClick={() => setNotesOverlay(null)}
                            className="relative group w-8 h-8 flex items-center justify-center rounded-md bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition hover:bg-gray-400 dark:hover:bg-gray-600"
                          >
                            <X className="w-4 h-4" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition shadow-lg z-50">
                              Close
                            </span>
                          </button>
                        </div>

                        {/* ============================GUIDE / INSTRUCTION SECTION============================ */}
                        <div className="w-full mb-4 border-0 bg-transparent text-black dark:text-white text-sm">
                          <p className="font-semibold mb-1 pt-1">How to Use This Panel:</p>
                          <ul className="list-disc ml-5 mb-4">
                            <li><strong>Take deeper notes</strong> about why you got it wrong/right.</li>
                            <li>Mark the question as <strong>Understood</strong> or <strong>Not Understood</strong>.</li>
                            <li>Track how many times you have <strong>Attempted</strong> it.</li>
                            <li>You can even <strong>Offer Help</strong> to others or request help using <strong>Help Me</strong>.</li>
                            <li>Everything is auto-synced online and stored offline.</li>
                          </ul>
                        </div>
                        {/* ============================NOTES TEXTAREA ============================ */}
                        <textarea
                          value={notes[q.id] || ""}
                          onChange={async (e) => {
                            const value = e.target.value;
                            setNotes(prev => ({ ...prev, [q.id]: value }));

                            // Save offline immediately
                            await saveNoteOffline(q.id, value);
                          }}
                          className="w-full flex-1 p-2 border-0 resize-none bg-transparent text-black dark:text-white mb-2 min-h-[200px]"

                          placeholder="Take notes here..."
                        />

                        {/* ============================ BOTTOM BUTTONS============================ */}
                        <div className="flex flex-wrap gap-2 mt-2">

                          {/* -----------------------------Understood Button----------------------------- */}
                          <button
                            onClick={async () => {
                              if (!userId) return;

                              const newState = !understood[q.id];
                              setUnderstood(prev => ({ ...prev, [q.id]: newState }));
                              setNotUnderstood(prev => ({ ...prev, [q.id]: false }));

                              // Save offline
                              await saveAnswersOffline(q.id, { understood: newState, not_understood: false, attempts: attempts[q.id] || 0 });
                              await saveNoteOffline(q.id, notes[q.id] || "");

                              // Sync online
                              try {
                                await supabase
                                  .from("question_notes")
                                  .upsert([{
                                    user_id: userId,
                                    question_id: q.id,
                                    note_text: notes[q.id] || "",
                                    understood: newState,
                                    is_not_understood: false,
                                    attempts: attempts[q.id] || 0,
                                    help_others: helpOthersDisabled[q.id] ? "saved" : null
                                  }], { onConflict: "question_id, user_id" });
                              } catch (err) {
                                console.error("Error syncing Understood:", err);
                              }
                            }}
                            className={`relative group w-8 h-8 flex items-center justify-center rounded-md  text-gray-700 dark:text-gray-300 transition ${understood[q.id] ? "ring-2 ring-green-500" : ""}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-blue-500">
                              <path strokeLinecap="round" strokeLinejoin="round" fill="#2ad31a" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition shadow-lg z-50">
                              Understood
                            </span>
                          </button>

                          {/* ----------------------------- Not Understood Button----------------------------- */}
                          <button
                            onClick={async () => {
                              if (!userId) return;

                              const newState = !notUnderstood[q.id];
                              setNotUnderstood(prev => ({ ...prev, [q.id]: newState }));
                              setUnderstood(prev => ({ ...prev, [q.id]: false }));

                              await saveAnswersOffline(q.id, { understood: false, not_understood: newState, attempts: attempts[q.id] || 0 });
                              await saveNoteOffline(q.id, notes[q.id] || "");

                              try {
                                await supabase
                                  .from("question_notes")
                                  .upsert([{
                                    user_id: userId,
                                    question_id: q.id,
                                    note_text: notes[q.id] || "",
                                    understood: false,
                                    is_not_understood: newState,
                                    attempts: attempts[q.id] || 0,
                                    help_others: helpOthersDisabled[q.id] ? "saved" : null
                                  }], { onConflict: "question_id, user_id" });
                              } catch (err) {
                                console.error("Error syncing Not Understood:", err);
                              }
                            }}
                            className={`relative group w-8 h-8 flex items-center justify-center rounded-md  text-gray-700 dark:text-gray-300 transition ${notUnderstood[q.id] ? "ring-2 ring-red-500" : ""}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8 text-white">
                              <path strokeLinecap="round" strokeLinejoin="round" fill="#e60e0e" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                            </svg>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition shadow-lg z-50">
                              Not Understood
                            </span>
                          </button>

                          {/* -----------------------------Attempts Button----------------------------- */}
                          <button
                            onClick={async () => {
                              if (!userId) return;

                              const newCount = (attempts[q.id] || 0) + 1;
                              setAttempts(prev => ({ ...prev, [q.id]: newCount }));

                              await saveAnswersOffline(q.id, { understood: understood[q.id] || false, not_understood: notUnderstood[q.id] || false, attempts: newCount });
                              await saveNoteOffline(q.id, notes[q.id] || "");

                              try {
                                await supabase
                                  .from("question_notes")
                                  .upsert([{
                                    user_id: userId,
                                    question_id: q.id,
                                    note_text: notes[q.id] || "",
                                    understood: understood[q.id] || false,
                                    is_not_understood: notUnderstood[q.id] || false,
                                    attempts: newCount,
                                    help_others: helpOthersDisabled[q.id] ? "saved" : null
                                  }], { onConflict: "question_id, user_id" });
                              } catch (err) {
                                console.error("Error syncing Attempts:", err);
                              }
                            }}
                            className="relative group w-8 h-8 flex items-center justify-center rounded-md  text-gray-700 dark:text-gray-300 transition"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8 text-white">
                              <path strokeLinecap="round" strokeLinejoin="round" fill="#4aca0f" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                            </svg>

                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition shadow-lg z-50">
                              Attempted: {attempts[q.id] || 0}
                            </span>
                          </button>

                          {/* -----------------------------Save Notes Button----------------------------- */}
                          <button
                            onClick={async () => {
                              if (!userId) return;
                              setSaving(true);
                              setSaved(false);

                              // 1. Save offline first
                              await saveNoteOffline(q.id, notes[q.id] || "");

                              try {
                                // 2. Upsert online directly — no need to check existing
                                await supabase
                                  .from("question_notes")
                                  .upsert([{
                                    question_id: q.id,
                                    user_id: userId,
                                    note_text: notes[q.id] || "",
                                    understood: understood[q.id] || false,
                                    is_not_understood: notUnderstood[q.id] || false,
                                    attempts: attempts[q.id] || 0,
                                    help_others: helpOthersDisabled[q.id] ? "saved" : null
                                  }], { onConflict: ["question_id", "user_id"] }); // <- handles both insert & update

                              } catch (err) {
                                console.error("Error syncing Save Notes:", err);
                              }

                              setSaving(false);
                              setSaved(true);
                              setTimeout(() => setSaved(false), 1000);
                            }}
                            className="relative group w-8 h-8 flex items-center justify-center rounded-md  text-gray-700 dark:text-gray-300 transition"
                          >
                            {saving ? (
                              <div className="flex space-x-1">
                                <span className="w-1 h-1 bg-gray-700 dark:bg-gray-300 rounded-full animate-bounce delay-0"></span>
                                <span className="w-1 h-1 bg-gray-700 dark:bg-gray-300 rounded-full animate-bounce delay-150"></span>
                                <span className="w-1 h-1 bg-gray-700 dark:bg-gray-300 rounded-full animate-bounce delay-300"></span>
                              </div>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8">
                                <path strokeLinecap="round" strokeLinejoin="round" fill="#1013cc" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                              </svg>
                            )}
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition shadow-lg z-50">
                              {saving ? "Saving..." : saved ? "Saved" : "Save Notes"}
                            </span>
                          </button>

                          {/* ------------------------------Help Others Button------------------------------ */}
                          <button
                            onClick={async () => {
                              if (!userId || helpOthersDisabled[q.id]) return;

                              const phone = prompt("To help others in this question, Kindly Enter your WhatsApp number (with country code, e.g., +254712345678):");
                              if (!phone) return;
                              await saveNoteOffline(q.id, notes[q.id] || "");
                              try {
                                await supabase
                                  .from("question_notes")
                                  .upsert([{
                                    user_id: userId,
                                    question_id: q.id,
                                    note_text: notes[q.id] || "",
                                    understood: understood[q.id] || false,
                                    is_not_understood: notUnderstood[q.id] || false,
                                    attempts: attempts[q.id] || 0,
                                    help_others: phone
                                  }], { onConflict: "question_id, user_id" });
                                setHelpOthersDisabled(prev => ({ ...prev, [q.id]: true }));
                              } catch (err) {
                                console.error("Error saving Help Others:", err);
                              }
                            }}
                            disabled={helpOthersDisabled[q.id]}
                            className={`relative group w-8 h-8 flex items-center justify-center rounded-md text-gray-700 dark:text-gray-300 transition ${helpOthersDisabled[q.id] ? "opacity-50 cursor-not-allowed" : ""}`} >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8">
                              <path strokeLinecap="round" strokeLinejoin="round" fill="#0caae9" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                            </svg>

                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition shadow-lg z-50">
                              {helpOthersDisabled[q.id] ? "Already shared" : "Help Others"}
                            </span>
                          </button>
                          {/* ------------------------------Help Me Button------------------------------ */}
                          <button
                            onClick={async () => {
                              if (!userId) return;

                              const { data, error } = await supabase
                                .from("question_notes")
                                .select(`id, help_others, profiles:user_id(name, avatar_url)`)
                                .eq("question_id", q.id)
                                .not("help_others", "eq", "none");

                              if (error) {
                                console.error("Error fetching helpers:", error);
                                alert("Failed to fetch helpers.");
                                return;
                              }

                              // Map helpers if any exist
                              const helpers = data?.map((d: any) => ({
                                id: d.id,
                                whatsapp: d.help_others,
                                profiles: d.profiles
                              })) || [];

                              setHelpMeHelpers(helpers); // This can be empty
                              setCurrentQuestionText(q.question_text);
                              setHelpMeOverlayOpen(true); // Always open the overlay
                            }}
                            className="relative group w-8 h-8 flex items-center justify-center rounded-md bg-transparent text-gray-700 dark:text-gray-300 transition">
                            <svg
                              role="img"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                              style={{ width: "32px", height: "32px" }} // ✅ pixel control
                            >
                              <title>WhatsApp</title>
                              <path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition shadow-lg z-50">
                              Help Me
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Help Me Overlay */}
                  {helpMeOverlayOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2">
                      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-none sm:rounded-md shadow-lg p-4 flex flex-col space-y-3 h-[90vh] overflow-auto">

                        {/* Header */}
                        <div className="flex justify-between items-center">
                          <h2 className="text-lg font-bold text-blue-700 dark:text-blue-300">Helpers Available</h2>
                          <button
                            onClick={() => setHelpMeOverlayOpen(false)}
                            className="
    relative group
    w-8 h-8 flex items-center justify-center
    rounded-md
    bg-gray-300 dark:bg-gray-700
    text-gray-700 dark:text-gray-300
    transition
    hover:bg-gray-400 dark:hover:bg-gray-600
  " >
                            <X className="w-4 h-4" />

                            {/* Tooltip above */}
                            <span
                              className="
      absolute bottom-full left-1/2 -translate-x-1/2 mb-2
      opacity-0 group-hover:opacity-100
      pointer-events-none
      bg-gray-900 text-white text-[10px]
      px-2 py-1 rounded-md whitespace-nowrap
      transition
      shadow-lg z-50
    "
                            >
                              Close
                            </span>
                          </button>
                        </div>
                        {/* Help Me Overlay */}
                        {helpMeOverlayOpen && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2">
                            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-none sm:rounded-md shadow-lg p-4 flex flex-col space-y-3 h-[90vh] overflow-auto">

                              {/* Header */}
                              <div className="flex justify-between items-center">
                                <h2 className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                  Helpers Available
                                </h2>
                                <button
                                  onClick={() => setHelpMeOverlayOpen(false)}
                                  className="relative group w-8 h-8 flex items-center justify-center rounded-md bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition hover:bg-gray-400 dark:hover:bg-gray-600"
                                >
                                  <X className="w-4 h-4" />
                                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition shadow-lg z-50">
                                    Close
                                  </span>
                                </button>
                              </div>

                              {/* ============================== Group Card ============================== */}
                              <div className="flex items-center gap-3 p-3 border rounded-none sm:rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                                <img
                                  src="/UsersAvatar.jpg"
                                  alt="Medrae Nursing Group"
                                  className="w-10 h-10 rounded-md object-cover"
                                />
                                <div className="flex-1 text-sm">
                                  <p className="font-semibold">Medrae Nursing Group</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    Join the group to request help
                                  </p>
                                </div>
                                <div className="flex gap-1">
                                  {/* Copy Question Button */}
                                  <button
                                    onClick={() => {
                                      const prefilledMessage = `Hi Group! Can anyone help me with this question? #Question  copied from Medrae Quizzes page\n\n${currentQuestionText}\n\nThanks!`;
                                      navigator.clipboard.writeText(prefilledMessage);
                                      alert(
                                        "Question copied! Now open the group using the 'Join Group' button and paste your question."
                                      );
                                    }}
                                    className="px-2 py-1 text-xs bg-yellow-500 text-white rounded-none sm:rounded-md hover:bg-yellow-600 transition"
                                  >
                                    Copy Question
                                  </button>

                                  {/* Join Group Button */}
                                  <button
                                    onClick={() => {
                                      window.open("https://chat.whatsapp.com/Lad2s4XXx1AA1TtThbMgWV", "_blank");
                                    }}
                                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded-none sm:rounded-md hover:bg-blue-600 transition"
                                  >
                                    Join Group
                                  </button>


                                </div>
                              </div>
                              {/* ============================== Pinned Contact Card ============================== */}
                              <div className="flex items-center gap-3 p-3 border rounded-none sm:rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition mt-2">
                                <img
                                  src="/UsersAvatar.jpg"
                                  alt="Medrae Assistance"
                                  className="w-10 h-10 rounded-md object-cover"
                                />
                                <div className="flex-1 text-sm">
                                  <p className="font-semibold">Medrae Assistance</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">0704473503</p>
                                </div>
                                {/* Message Button */}
                                <button
                                  onClick={() => {
                                    const pinnedNumber = "254704473503"; // correct format

                                    const message = encodeURIComponent(
                                      `Hi Medrae! Kindly Help me with this question? #Question copied from Medrae Quizzes page:\n\n${currentQuestionText}`
                                    );
                                    window.open(`https://wa.me/${pinnedNumber}?text=${message}`, "_blank");

                                  }}
                                  className="px-2 py-1 text-xs bg-green-500 text-white rounded-none sm:rounded-md hover:bg-green-600 transition"
                                >
                                  Message
                                </button>
                              </div>
                              {/* ============================== Helpers List ============================== */}
                              <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto mt-2">
                                {helpMeHelpers.length > 0 ? (
                                  helpMeHelpers.map((helper) => (
                                    <div
                                      key={helper.id}
                                      className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 border rounded-none sm:rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                    >
                                      {/* Avatar */}
                                      <img
                                        src={helper.profiles.avatar_url || "/UsersAvatar.jpg"}
                                        alt={helper.profiles.name}
                                        className="w-10 h-10 rounded-none sm:rounded-md-full object-cover"
                                      />
                                      {/* Name and number */}
                                      <div className="flex-1 text-sm">
                                        <p className="font-semibold">{helper.profiles.name}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">{helper.whatsapp}</p>
                                      </div>
                                      {/* WhatsApp button */}
                                      <button
                                        onClick={() => {
                                          const message = encodeURIComponent(
                                            `Hi! Can you help me with this question?\n\n${currentQuestionText}\n\nThanks!`
                                          );
                                          window.open(`https://wa.me/${helper.whatsapp}?text=${message}`, "_blank");
                                        }}
                                        className="px-2 py-1 text-xs bg-green-500 text-white rounded-none sm:rounded-md hover:bg-green-600 transition"
                                      >
                                        Message
                                      </button>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-4 text-center text-sm text-gray-700 dark:text-gray-300">
                                    No individual helpers yet. You can use the group above to request help.
                                  </div>
                                )}
                              </div>

                            </div>
                          </div>
                        )}




                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!quizFinished && Object.keys(answers).length === questions.length && (
        <button
          onClick={() => handleSubmit(false)}
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded-none sm:rounded-md hover:bg-blue-700 transition mt-4"
        >
          Submit Quiz
        </button>
      )
      }

      {quizFinished && (
        <>
          <div className="mt-6 p-3 bg-green-100 dark:bg-green-900 rounded-none sm:rounded-md text-green-800 dark:text-green-200 font-semibold">
            Well done! You answered {finalScore} out of {questions.length} questions correctly.
            Keep practicing to strengthen your understanding and improve your score.
          </div>

          <button
            onClick={() => {
              // 🔊 Play tap sound
              playSound("tap");

              // 📳 Strong vibration (200ms)
              if (navigator.vibrate) {
                navigator.vibrate(200);
              }
              alert(
                ` Amazing effort! You scored ${finalScore} out of ${questions.length} questions.\n\n` +
                (finalScore === questions.length
                  ? " Perfect score! You’ve shown outstanding focus and knowledge. Keep this energy going — you’re clearly on the path to mastery!"
                  : finalScore > questions.length / 2
                    ? " Well done! That’s a strong performance above average. Each quiz is another step forward, and your hard work is paying off. Keep sharpening your mind — you’re capable of even greater results!"
                    : " Don’t be discouraged! Every great achiever starts somewhere, and each question you attempt makes you stronger. This score is a foundation, not a finish line. Stay consistent, keep practicing, and you’ll surprise yourself with how far you can go!")
                + "\n\n Remember: progress is about growth, not perfection. The fact that you showed up and tried already puts you ahead. Keep pushing — your future self will thank you! "
              );
            }}
            className="mt-4 px-6 py-3 bg-indigo-600 text-white font-bold rounded-none sm:rounded-md-lg shadow-md hover:bg-indigo-700 transition"
          >
            View Your Result
          </button>

        </>
      )
      }

      {
        attempts.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-bold mb-2">Past Attempts</h2>
            <ul className="space-y-2 text-sm text-gray-800">
              {attempts.map((attempt) => (
                <li
                  key={attempt.id}
                  className="p-2 border rounded-none sm:rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-black dark:text-white"
                >
                  Your attempt on {new Date(attempt.submitted_at).toLocaleString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })} has been recorded. You scored {attempt.score} points for this checkpoint.
                </li>

              ))}
            </ul>
          </div>
        )
      }
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
      {
        userId && (
          <FloatingChat currentUserId={userId} isOpen={false} />
        )
      }

    </div >
  );
}
