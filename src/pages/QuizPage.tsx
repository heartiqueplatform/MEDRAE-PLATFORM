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
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Countdown from "react-countdown";
import { supabase } from "@/lib/supabaseClient";
import OverlayAI from "@/components/OverlayAI";
import { ArrowUp, HelpCircle, CheckCircle2, PanelRightOpen, BookOpen, Timer, GraduationCap, ChevronDown, ChevronUp, TimerReset, RotateCcw, Save, Users, MessageCircle, X, Cpu, AlertTriangle, Volume, VolumeX, Filter, ChevronLeft, ChevronRight, AlertCircle, Volume2, Sparkles, PlusCircle } from "lucide-react";
import FloatingChat from "@/components/FloatingChat";
import { getUnitOffline, saveUnitOffline, getAnswersOffline, saveAnswersOffline, } from "@/lib/indexedDb";
import { saveNoteOffline, getNoteOffline, getPendingNotes, markNoteSynced } from "@/lib/indexedDb";
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

interface CachedSubscription {
  plan_type: string;
  is_active: boolean;
  expires_at: string | null;
  cached_at: number;
}

const TIMER_DURATION = 300_000; // 3 hours
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache for subscription
const QUESTIONS_PER_BATCH = 20;

// Helper to fetch more questions (paginated)
async function fetchMoreQuestions(supabase: any, quizId: string, offset: number, limit: number = 20) {
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .range(offset, offset + limit - 1);

  if (error) return [];
  return data;
}

// Get total question count for a unit
async function fetchTotalQuestionCount(supabase: any, quizId: string) {
  const { count, error } = await supabase
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .eq("quiz_id", quizId);

  if (error) return 0;
  return count || 0;
}

// Cache subscription check
async function getCachedSubscription(userId: string): Promise<CachedSubscription | null> {
  try {
    const cached = localStorage.getItem(`sub_${userId}`);
    if (!cached) return null;

    const data: CachedSubscription = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid (5 minutes)
    if (now - data.cached_at < CACHE_DURATION) {
      return data;
    }

    return null;
  } catch {
    return null;
  }
}

async function cacheSubscription(userId: string, subscription: any) {
  const cacheData: CachedSubscription = {
    plan_type: subscription?.plan_type || 'free',
    is_active: subscription?.is_active || false,
    expires_at: subscription?.expires_at || null,
    cached_at: Date.now(),
  };
  localStorage.setItem(`sub_${userId}`, JSON.stringify(cacheData));
}

export default function QuizPage() {
  const session = useSession();
  const user = session?.user;
  const userId = user?.id;
  const location = useLocation();
  const [progressOpen, setProgressOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(QUESTIONS_PER_BATCH);
  const [lockedVisible, setLockedVisible] = useState<Record<string, boolean>>({});
  const [resetting, setResetting] = useState(false);
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
  const [notesOverlay, setNotesOverlay] = useState<string | null>(null);
  const [understood, setUnderstood] = useState<Record<string, boolean>>({});
  const [unitId, setUnitId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [confidenceLevels, setConfidenceLevels] = useState<Record<string, string>>({});
  const [questionsSource, setQuestionsSource] = useState<"remote" | "local" | null>(null);

  const navigate = useNavigate();

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
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [checkpointOverlay, setCheckpointOverlay] = useState<{
    visible: boolean;
    reached: number;
    total: number;
  } | null>(null);
  const circleRefs = useRef([]);

  // State for Load More functionality
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [hasMoreQuestions, setHasMoreQuestions] = useState(false);

  // Memoized filtered questions for performance
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchesCourse = selectedCourse === "All" || q.course_tag === selectedCourse;
      const matchesUnanswered = !showUnansweredOnly || (!answers[q.id] || lockedVisible[q.id]);
      return matchesCourse && matchesUnanswered;
    });
  }, [questions, selectedCourse, showUnansweredOnly, answers, lockedVisible]);

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

  const [helpMeOverlayOpen, setHelpMeOverlayOpen] = useState(false);
  const [helpMeHelpers, setHelpMeHelpers] = useState<
    { id: string; whatsapp: string; user_id: string; profiles: { name: string; avatar_url?: string } }[]
  >([]);
  const [currentQuestionText, setCurrentQuestionText] = useState("");
  const [helpMeOverlay, setHelpMeOverlay] = useState<{ helpers: any[], questionText: string } | null>(null);
  const [isMuted, setIsMuted] = useState(
    localStorage.getItem("quizMuted") === "true" ? true : false
  );

  async function recordMistake(userId: string, question: any, selectedOption: string, reason?: string) {
    try {
      const { error: upsertError } = await supabase
        .from("user_mistakes")
        .upsert(
          {
            user_id: userId,
            question_id: question.id,
            quiz_id: question.quiz_id,
            last_wrong_at: new Date(),
            times_wrong: 1,
            user_selected: selectedOption,
            ...(reason ? { mistake_reason: reason } : {}),
          },
          { onConflict: "user_id,question_id" }
        );
      if (upsertError) throw upsertError;
      const { data, error } = await supabase.rpc("increment_mistake", {
        user_uuid: userId,
        question_uuid: question.id,
        selected_option: selectedOption,
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error recording mistake:", error);
    }
  }

  const saveNoteOfflineFn = async (questionId: string, noteText: string) => {
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
  // Warning if user tries to leave with an incomplete batch of 10
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const currentBatchProgress = Object.keys(answers).length - lastCheckpoint;

      // If they have answered questions but haven't hit the 10-question auto-save
      if (currentBatchProgress > 0 && currentBatchProgress < 10) {
        const message = `You have ${currentBatchProgress} unsaved answers in this batch. Complete 10 questions to auto-save before leaving!`;
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [answers, lastCheckpoint]);
  useEffect(() => {
    const handleOnline = async () => {
      try {
        const offlineNotes: Record<string, string> = loadOfflineNotes();
        if (!offlineNotes || Object.keys(offlineNotes).length === 0) return;
        if (!userId) return;
        for (const questionId of Object.keys(offlineNotes)) {
          const noteText = offlineNotes[questionId];
          await supabase
            .from("question_notes")
            .upsert([{
              user_id: userId,
              question_id: questionId,
              note_text: noteText,
              understood: understood[questionId] || false,
              is_not_understood: notUnderstood[questionId] || false,
              attempts: attemptsCount[questionId] || 0,
            }], { onConflict: "question_id,user_id" });
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
    const loadOfflineNotesAsync = async () => {
      const offlineNotes: Record<string, string> = JSON.parse(
        localStorage.getItem("offlineNotes") || "{}"
      );
      for (const q of questions) {
        if (offlineNotes[q.id]) {
          setNotes(prev => ({ ...prev, [q.id]: offlineNotes[q.id] }));
        }
        const offlineNoteDB = await getNoteOffline(q.id);
        if (offlineNoteDB?.note_text) {
          setNotes(prev => ({ ...prev, [q.id]: offlineNoteDB.note_text }));
        }
        const offlineAnswer = await getAnswersOffline(q.id);
        if (offlineAnswer) {
          setUnderstood(prev => ({ ...prev, [q.id]: offlineAnswer.understood || false }));
          setNotUnderstood(prev => ({ ...prev, [q.id]: offlineAnswer.not_understood || false }));
          setAttemptsCount(prev => ({ ...prev, [q.id]: offlineAnswer.attempts || 0 }));
        }
      }
    };
    loadOfflineNotesAsync();
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

  useEffect(() => {
    async function handleOnline() {
      await syncOfflineAnswers();
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
          newHelpDisabled[qid] = !!row.help_others;
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
    const updateTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Optimized loadQuiz with better caching
  useEffect(() => {
    let cancelled = false;

    const loadQuiz = async () => {
      if (!unit) return;
      setLoading(true);

      // 1. Check user subscription with caching
      if (userId) {
        try {
          // Try to get cached subscription first
          const cachedSub = await getCachedSubscription(userId);

          if (cachedSub && cachedSub.is_active && (cachedSub.plan_type === 'pro' || cachedSub.plan_type === 'premium')) {
            // Check if subscription is expired
            const expiry = cachedSub.expires_at ? new Date(cachedSub.expires_at) : null;
            const isNotExpired = expiry ? expiry > new Date() : true;
            if (isNotExpired) {
              setIsPremium(true);
            } else {
              // Cache expired, need to fetch fresh
              const { data: sub, error: subError } = await supabase
                .from("subscriptions")
                .select("plan_type, is_active, expires_at")
                .eq("user_id", userId)
                .maybeSingle();

              if (sub && !subError) {
                const now = new Date();
                const expiry = sub.expires_at ? new Date(sub.expires_at) : null;
                const hasActivePlan = sub.is_active === true;
                const isPaidTier = sub.plan_type === 'pro' || sub.plan_type === 'premium';
                const isNotExpired = expiry ? expiry > now : true;
                const premiumStatus = hasActivePlan && isPaidTier && isNotExpired;
                setIsPremium(premiumStatus);
                await cacheSubscription(userId, sub);
              }
            }
          } else {
            // No valid cache, fetch fresh
            const { data: sub, error: subError } = await supabase
              .from("subscriptions")
              .select("plan_type, is_active, expires_at")
              .eq("user_id", userId)
              .maybeSingle();

            if (sub && !subError) {
              const now = new Date();
              const expiry = sub.expires_at ? new Date(sub.expires_at) : null;
              const hasActivePlan = sub.is_active === true;
              const isPaidTier = sub.plan_type === 'pro' || sub.plan_type === 'premium';
              const isNotExpired = expiry ? expiry > now : true;
              const premiumStatus = hasActivePlan && isPaidTier && isNotExpired;
              setIsPremium(premiumStatus);
              await cacheSubscription(userId, sub);
            }
          }
        } catch (err) {
          console.error("Subscription check error:", err);
          // Fallback: assume not premium
          setIsPremium(false);
        }
      }

      /** STEP 1: Load from Cache (IndexedDB) for INSTANT display **/
      const offlineUnit = await getUnitOffline(unit);
      let currentQuizId = null;
      let cachedQuestions = [];

      if (offlineUnit && offlineUnit.questions?.length) {
        if (!cancelled) {
          currentQuizId = offlineUnit.quizId;
          setQuizId(offlineUnit.quizId);

          // For premium users, show all cached questions
          // For free users, limit to first 20
          const allQuestions = offlineUnit.questions;
          cachedQuestions = allQuestions;
          setQuestions(allQuestions);
          setQuestionsSource("local");
          setLoading(false);

          // Get total count from cache if available
          if (offlineUnit.totalCount) {
            setTotalQuestions(offlineUnit.totalCount);
            const hasMore = offlineUnit.totalCount > allQuestions.length;
            setHasMoreQuestions(hasMore);
          }
        }
      }

      /** STEP 2: Background Sync - Always check Supabase for new questions **/
      try {
        const { data: quiz, error: quizError } = await supabase
          .from("quizzes")
          .select("id")
          .eq("unit", unit)
          .single();

        if (quiz && !quizError) {
          currentQuizId = quiz.id;
          if (!cancelled) setQuizId(quiz.id);

          // Get total question count
          const total = await fetchTotalQuestionCount(supabase, quiz.id);
          if (!cancelled) {
            setTotalQuestions(total);
            const hasMore = total > QUESTIONS_PER_BATCH;
            setHasMoreQuestions(hasMore);
          }

          const { data: quizQuestions, error: qError } = await supabase
            .from("quiz_questions")
            .select("*")
            .eq("quiz_id", quiz.id)
            .order("created_at", { ascending: true });

          if (quizQuestions && !qError && !cancelled) {
            const enriched = quizQuestions.map((q: any) => ({
              ...q,
              quiz_id: quiz.id,
            }));

            // Only update if there are changes
            if (JSON.stringify(enriched) !== JSON.stringify(offlineUnit?.questions)) {
              setQuestions(enriched);
              setQuestionsSource("remote");
              await saveUnitOffline({
                unitId: unit,
                quizId: quiz.id,
                questions: enriched,
                savedAt: Date.now(),
                totalCount: total,
              });
            }
          }
        }
      } catch (err) {
        console.error("Background sync failed (likely offline):", err);
      } finally {
        if (!cancelled) setLoading(false);
      }

      /** STEP 3: Restore State (Answers, Timer, etc.) **/
      if (currentQuizId) {
        const offlineSaved = await getAnswersOffline(unit);
        if (offlineSaved?.answers) {
          setAnswers(offlineSaved.answers);
          const fb = {};
          Object.keys(offlineSaved.answers).forEach(id => {
            fb[id] = true;
          });
          setFeedbackShown(fb);
        }
        const savedEnd = localStorage.getItem(`quiz-${currentQuizId}-end`);
        if (savedEnd) {
          setTimerEnd(Number(savedEnd));
        } else {
          const endTime = Date.now() + TIMER_DURATION;
          setTimerEnd(endTime);
          localStorage.setItem(`quiz-${currentQuizId}-end`, endTime.toString());
        }
        const localAnswers = localStorage.getItem(`quiz-${currentQuizId}-answers`);
        if (localAnswers) {
          const parsed = JSON.parse(localAnswers);
          setAnswers(prev => ({ ...prev, ...parsed }));

          // FIX: Sync lastCheckpoint with existing answers so it doesn't trigger on reload
          const currentCount = Object.keys(parsed).length;
          setLastCheckpoint(currentCount);

          const feedbackState: Record<string, boolean> = {};
          Object.keys(parsed).forEach(id => {
            feedbackState[id] = true;
          });
          setFeedbackShown(prev => ({ ...prev, ...feedbackState }));
        }
      }
    };

    loadQuiz();
    return () => {
      cancelled = true;
    };
  }, [unit, userId, session]);

  // Load more questions function with caching
  const handleLoadMore = useCallback(async () => {
    if (!quizId || isLoadingMore || !hasMoreQuestions || !isPremium) return;

    setIsLoadingMore(true);
    const currentOffset = questions.length;

    try {
      const newQuestions = await fetchMoreQuestions(supabase, quizId, currentOffset, QUESTIONS_PER_BATCH);

      if (newQuestions && newQuestions.length > 0) {
        const enrichedNew = newQuestions.map((q: any) => ({
          ...q,
          quiz_id: quizId,
        }));

        const updatedQuestions = [...questions, ...enrichedNew];
        setQuestions(updatedQuestions);
        setHasMoreQuestions(newQuestions.length === QUESTIONS_PER_BATCH);

        // Update offline cache
        await saveUnitOffline({
          unitId: unit,
          quizId: quizId,
          questions: updatedQuestions,
          savedAt: Date.now(),
          totalCount: totalQuestions,
        });
      } else {
        setHasMoreQuestions(false);
      }
    } catch (error) {
      console.error("Error loading more questions:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [quizId, isLoadingMore, hasMoreQuestions, isPremium, questions, unit, totalQuestions]);

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
    const timer = setTimeout(() => { }, 30000);
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


  const handleAnswer = useCallback((questionId: string, selected: string) => {
    if (answers[questionId]) return;
    const nextIndex = questions.findIndex(q => q.id === questionId);
    if (nextIndex !== -1) setCurrentQuestionIndex(nextIndex);
    const updatedAnswers = { ...answers, [questionId]: selected };
    saveAnswersOffline(unit, updatedAnswers);
    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString();
    const newEntry = `Hey! Great job! You answered this question on ${date} at ${time}. Keep up the good work!`;
    const existingNote = notes[questionId] || "";
    const updatedNote = existingNote ? existingNote + "\n" + newEntry : newEntry;
    saveNoteOfflineFn(questionId, updatedNote);
    localStorage.setItem(`note-${questionId}`, updatedNote);
    setNotes(prev => ({ ...prev, [questionId]: updatedNote }));
    setAnswers(updatedAnswers);

    const CHECKPOINT_SIZE = 10;
    const nextCount = Object.keys(updatedAnswers).length;

    // Trigger ONLY when hitting exactly 10, 20, 30... and only if we haven't processed this batch
    if (nextCount > 0 && nextCount % CHECKPOINT_SIZE === 0 && nextCount > lastCheckpoint) {
      // Logic to calculate accuracy for the LAST 10 questions
      const startIndex = nextCount - CHECKPOINT_SIZE;
      const checkpointQuestionIds = Object.keys(updatedAnswers).slice(startIndex, nextCount);

      const correctInCheckpoint = checkpointQuestionIds.reduce((count, qid) => {
        const q = questions.find(q => q.id === qid);
        return q && updatedAnswers[qid] === q.correct_answer ? count + 1 : count;
      }, 0);

      const percentCompleted = Math.round((correctInCheckpoint / CHECKPOINT_SIZE) * 100);

      // Mark this batch as completed
      setLastCheckpoint(nextCount);

      setCheckpointOverlay({
        visible: true,
        reached: correctInCheckpoint, // This is actual score
        total: CHECKPOINT_SIZE,
        percentCompleted, // This is accuracy %
      });

      if (!isMuted) playSound("notification");
    }
    setRecentlyAnsweredId(questionId);
    setFeedbackShown(prev => ({ ...prev, [questionId]: true }));
    setOpenExplanationFor(questionId);
    localStorage.setItem(`quiz-${quizId}-answers`, JSON.stringify(updatedAnswers));
    setQuestionStartTime(Date.now());
    if (showUnansweredOnly) {
      setLockedVisible(prev => ({
        ...prev,
        [questionId]: true,
      }));
    }
  }, [answers, questions, unit, notes, lastCheckpoint, isMuted, quizId, showUnansweredOnly]);

  const handleReportQuestion = async (question: Question) => {
    alert("You are reporting this question. A new AI window is opening to discuss this question as Medrae team reviews it. You can send your input directly.");
    const reportPayload = {
      question_id: question.id,
      quiz_id: quizId,
      question_text: question.question_text,
      reported_at: new Date().toISOString(),
      user_id: userId,
      user_answer: answers[question.id] || "No answer selected",
    };
    const { error } = await supabase
      .from("quiz_questions")
      .update({ is_flagged: true })
      .eq("id", question.id);
    if (error) {
      console.error("Error flagging question:", error);
      alert("Failed to flag question.");
      return;
    }
    const optionsText = ["A", "B", "C", "D"]
      .map(
        (letter) =>
          `${letter}: ${question[`option_${letter.toLowerCase() as "a" | "b" | "c" | "d"}`]}`
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
    const fullText = `Let's discuss this question in NCK/NCLEX format:
Question: ${question.question_text}
Options:
${optionsText}
User Answer: ${answers[question.id] || "No answer selected"}
Please provide a detailed discussion and guidance.`;
    setAIPrefillQuestion(chunkText(fullText, 200));
    setAIOverlayOpen(true);
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
    if (unit) {
      const submittedUnits = JSON.parse(localStorage.getItem("submittedUnits") || "[]");
      if (!submittedUnits.includes(unit)) {
        submittedUnits.push(unit);
        localStorage.setItem("submittedUnits", JSON.stringify(submittedUnits));
      }
    }
    setFinalScore(correctCount);
    setQuizFinished(true);
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
    setResetting(true);
    setTimeout(() => {
      localStorage.removeItem(`quiz-${quizId}-answers`);
      localStorage.removeItem(`quiz-${quizId}-end`);
      setAnswers({});
      setFeedbackShown({});
      setLockedVisible({});
      setQuizFinished(false);
      setFinalScore(0);
      setResetting(false);
    }, 600);
  };

  // Check if a question should be locked (only for free users)
  const isQuestionLocked = useCallback((index: number) => {
    return !isPremium && index >= QUESTIONS_PER_BATCH;
  }, [isPremium]);

  if (loading && questions.length === 0) {
    return <GlobalLoader />;
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

  return (
    <div className="space-y-0 max-w-8xl mx-auto px-3 sm:px-6 lg:px-8  ">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <header className="sticky top-0 rounded-xl  w-full bg-white/80 dark:bg-background backdrop-blur-md border-b border-gray-200 dark:border-gray-900 shadow-sm">
          <div className="max-w-7xl mx-auto px-4  py-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-white truncate max-w-[250px] sm:max-w-none uppercase">
                  {unit}
                </h1>
                {/* Show total count for premium users */}
                {isPremium && totalQuestions > 0 && (
                  <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                    {totalQuestions} total
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-6">
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
                    <div
                      className="absolute inset-0 bg-black/10 rounded-full transition-all duration-1000"
                      style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                    />
                  </button>
                </div>
              </div>
            </div>
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
        isDarkMode={isDarkMode}
      />
      <div className="mt-2 flex justify-between items-center w-full gap-4"></div>
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
                  setCurrentQuestionIndex(0);
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

          {/* Upgrade Banner for Free Users - Only show if premium is false AND there are more questions */}
          {!isPremium && totalQuestions > QUESTIONS_PER_BATCH && (
            <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                    <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-bold text-amber-800 dark:text-amber-300">
                      {totalQuestions - QUESTIONS_PER_BATCH} more questions available!
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      Upgrade to Pro to unlock all {totalQuestions} questions in this unit
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/subscription")}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-2 rounded-full transition-all shadow-md flex items-center gap-2"
                >
                  <Sparkles size={16} />
                  Upgrade Now
                </button>
              </div>
            </div>
          )}

          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q, i) => {
              const selectedAnswer = answers[q.id];
              const showFeedback = feedbackShown[q.id];

              // Only render the current question for performance
              if (i !== currentQuestionIndex) return null;

              // Check if this question should be locked for free users
              const isLocked = isQuestionLocked(i);

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
                      You've mastered the first 20 questions! To access the remaining <b>{totalQuestions - QUESTIONS_PER_BATCH} questions</b> in this unit and unlock full clinical rationales, upgrade to a Pro plan.
                    </p>
                    <button
                      onClick={() => navigate("/subscription")}
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
                  <div
                    className={cn(
                      "flex-1 px-3 md:px-4 py-2 md:py-2 transition-all duration-300 md:border-0",
                      "md:shadow-sm md:rounded-xl",
                      "border-0",
                      understood[q.id]
                        ? "md:border-emerald-500 bg-emerald-50/30 dark:md:border-emerald-500/50 dark:bg-emerald-500/5"
                        : notUnderstood[q.id]
                          ? "md:border-rose-500 bg-rose-50/30 dark:md:border-rose-500/50 dark:bg-rose-500/5"
                          : "md:border-slate-100 bg-white dark:md:border-slate-800 dark:bg-muted/30",
                      "text-slate-900 dark:text-slate-100"
                    )}>
                    <div className="min-h-[60px] md:min-h-[70px] flex items-start">
                      <p className="font-bold mb-1.5 md:mb-2 leading-relaxed text-sm md:text-base">
                        Q{i + 1}: {q.question_text}
                      </p>
                    </div>

                    <div className="space-y-1.5 md:space-y-2 text-sm">
                      {["A", "B", "C", "D"].map((letter) => {
                        const optionText = q[`option_${letter.toLowerCase() as "a" | "b" | "c" | "d"}`];
                        const isSelected = selectedAnswer === letter;
                        const correct = q.correct_answer === letter;
                        return (
                          <button
                            key={letter}
                            className={`w-full text-left px-0 md:px-4 py-2.5 md:py-3 rounded-none md:rounded-md font-semibold
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
                              if (!isMuted) {
                                playSound(q.correct_answer === letter ? "tap-correct" : "tap-wrong");
                              }
                              const correct = q.correct_answer === letter;
                              if (!correct) {
                                setShowReasonBox(prev => ({ ...prev, [q.id]: true }));
                              }
                              if (navigator.vibrate) {
                                if (correct) {
                                  navigator.vibrate(50);
                                } else {
                                  navigator.vibrate([100, 50, 100]);
                                }
                              }
                              const endTime = Date.now();
                              const timeTaken = (endTime - questionStartTime) / 1000;
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
                              setConfidenceLevels((prev) => {
                                const updated = { ...prev, [q.id]: confidence };
                                localStorage.setItem("confidenceLevels", JSON.stringify(updated));
                                return updated;
                              });
                              handleAnswer(q.id, letter);
                              if (!userId) return;
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
                              if (!correct) {
                                setShowReasonBox(prev => ({ ...prev, [q.id]: true }));
                                if (!userId) return;
                                (async () => {
                                  try {
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
    flex justify-between items-center p-2 md:p-2.5 px-2 md:px-3.5 rounded-lg border transition-all duration-200
    ${!selectedAnswer
                                  ? "border-0 bg-white hover:border-blue-400 dark:bg-slate-800 dark:hover:border-blue-500"
                                  : "border-0 bg-white dark:bg-slate-800"
                                }
    ${selectedAnswer && q.correct_answer !== letter && selectedAnswer !== letter ? "opacity-50" : "opacity-100"}
  `}
                            >
                              <div className="flex items-center gap-2 md:gap-3">
                                <span className={`text-xs font-bold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-md border transition-colors duration-300 ${selectedAnswer && q.correct_answer === letter
                                  ? "bg-emerald-500 border-0 text-white"
                                  : selectedAnswer === letter && q.correct_answer !== letter
                                    ? "bg-rose-500 border-0 text-white"
                                    : "bg-slate-100 dark:bg-slate-700 border-0 text-slate-500 dark:text-slate-400"
                                  }`}>
                                  {letter}
                                </span>
                                <span className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-200">
                                  {optionText}
                                </span>
                              </div>
                              <div className="flex items-center ml-3 md:ml-4">
                                {selectedAnswer && (
                                  q.correct_answer === letter ? (
                                    <div className="flex items-center gap-1 md:gap-1.5 animate-[pop_0.3s_ease-out]">
                                      <span className="text-[9px] md:text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Correct</span>
                                      <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                  ) : selectedAnswer === letter ? (
                                    <div className="flex items-center gap-1 md:gap-1.5 animate-[shake_0.4s_ease-in-out]">
                                      <span className="text-[9px] md:text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-tight">Wrong</span>
                                      <X className="w-3.5 h-3.5 md:w-4 md:h-4 text-rose-500 dark:text-rose-400" />
                                    </div>
                                  ) : null
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-center gap-2 md:gap-3 w-full mt-3 md:mt-0">
                      <button
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="inline-flex items-center justify-center gap-1 md:gap-2 px-4 md:px-6 h-10 md:h-11 rounded-lg md:rounded-xl
        border border-gray-200 bg-white text-gray-700
        dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200
        hover:bg-gray-50 dark:hover:bg-gray-800
        active:bg-gray-100 dark:active:bg-gray-700
        transition-all duration-200 font-semibold shadow-sm
        disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent text-xs md:text-sm"
                      >
                        <ChevronLeft size={16} className="md:size-18" />
                        <span>Previous</span>
                      </button>

                      <button
                        onClick={() => {
                          // For premium users, just navigate to next question
                          // For free users, show upgrade when trying to access beyond 20th
                          if (!isPremium && currentQuestionIndex === 19) {
                            navigate("/subscription");
                          } else {
                            setCurrentQuestionIndex(prev =>
                              prev < filteredQuestions.length - 1 ? prev + 1 : prev
                            );
                          }
                        }}
                        disabled={currentQuestionIndex === filteredQuestions.length - 1 && isPremium}
                        className={cn(
                          "inline-flex items-center justify-center gap-1 md:gap-2 px-6 md:px-8 h-10 md:h-11 rounded-lg md:rounded-xl transition-all duration-200 font-semibold shadow-sm active:scale-[0.98] text-xs md:text-sm",
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
                        {!isPremium && currentQuestionIndex === 19 ? (
                          <Sparkles size={16} className="md:size-18" />
                        ) : (
                          <ChevronRight size={16} className="md:size-18" />
                        )}
                      </button>
                      <SubmitQuizButton
                        quizFinished={quizFinished}
                        answers={answers}
                        questions={questions}
                        handleSubmit={handleSubmit}
                      />
                    </div>

                    <div className="mt-2 md:mt-1 flex flex-wrap items-center justify-between w-full gap-2 md:gap-3 border-0 pt-3 md:pt-4">
                      <div className="flex items-center gap-1.5 md:gap-2 w-full flex-wrap">
                        <button
                          onClick={() => setOpenExplanationFor(q.id)}
                          disabled={!showFeedback}
                          className={`relative flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-lg md:rounded-xl border transition-all duration-300 group shadow-sm active:scale-95
    ${showFeedback
                              ? "bg-white dark:bg-muted/30 border-slate-200 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 hover:border-cyan-200 dark:hover:border-cyan-800"
                              : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed"
                            }`}
                        >
                          <BookOpen className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-colors ${showFeedback ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400"}`} />
                          <span className={`text-[10px] md:text-[11px] font-bold uppercase tracking-[0.1em] ${showFeedback ? "text-slate-700 dark:text-slate-300 group-hover:text-cyan-700 dark:group-hover:text-cyan-300" : "text-slate-400"}`}>
                            Rationale
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            const optionsText = ["A", "B", "C", "D"]
                              .map(letter => `${letter}: ${q[`option_${letter.toLowerCase() as "a" | "b" | "c" | "d"}`]}`)
                              .join("\n");
                            const fullText = `Let's discuss this question:\nQuestion: ${q.question_text}\nOptions:\n${optionsText}\nUser Answer: ${answers[q.id] || "No answer selected"}`;
                            setAIPrefillQuestion(fullText);
                            setAIOverlayOpen(true);
                          }}
                          className="relative flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-lg md:rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-muted/30 transition-all duration-300 group hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-200 dark:hover:border-purple-800 shadow-sm active:scale-95"
                        >
                          <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-500 dark:text-purple-400 group-hover:animate-spin-slow transition-transform" />
                          <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.1em] text-slate-700 dark:text-slate-300 group-hover:text-purple-700 dark:group-hover:text-purple-300">
                            AI Consult
                          </span>
                        </button>

                        <button
                          onClick={toggleMute}
                          className={`ml-auto relative flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-lg md:rounded-xl border transition-all duration-300 group shadow-sm active:scale-95
    ${isMuted
                              ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                              : "bg-white dark:bg-muted/30 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800"}
  `}
                        >
                          <div className="relative">
                            {isMuted ? (
                              <VolumeX className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 dark:text-slate-500 transition-colors" />
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500 dark:text-indigo-400" />
                                <span className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-20" />
                              </>
                            )}
                          </div>
                          <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.1em] text-slate-700 dark:text-slate-300">
                            {isMuted ? "Muted" : "Audio"}
                          </span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 md:gap-2 w-full flex-wrap">
                        <button
                          onClick={handleReset}
                          disabled={resetting}
                          className={`relative flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-lg md:rounded-xl border transition-all duration-300 group shadow-sm
    ${resetting
                              ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-70 cursor-not-allowed"
                              : "bg-white dark:bg-muted/30 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 active:scale-95"}
  `}
                        >
                          {resetting ? (
                            <svg
                              className="animate-spin h-3.5 w-3.5 md:h-4 md:w-4 text-slate-500"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-600 dark:text-slate-400 group-hover:rotate-[-180deg] transition-transform duration-500" />
                          )}
                          <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.1em] text-slate-700 dark:text-slate-300">
                            {resetting ? "Resetting..." : "Reset"}
                          </span>
                        </button>

                        <button
                          onClick={handleResetTimer}
                          className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-lg md:rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-800/50 active:scale-95 transition-all group shadow-sm"
                        >
                          <TimerReset className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600 dark:text-green-300 group-hover:rotate-[-45deg] transition-transform duration-300" />
                          <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.1em] text-green-700 dark:text-green-300">
                            Timer
                          </span>
                        </button>

                        <button
                          onClick={() => handleReportQuestion(q)}
                          className="ml-auto relative flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-lg md:rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-muted/30 transition-all duration-300 group hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 dark:hover:border-red-800 shadow-sm active:scale-95"
                        >
                          <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 dark:text-slate-500 group-hover:text-red-500 transition-colors group-hover:animate-pulse" />
                          <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-400 group-hover:text-red-700 dark:group-hover:text-red-400">
                            Report
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-col items-center gap-3 w-full">
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
                      saveNoteOffline={saveNoteOfflineFn}
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

          {/* LOAD MORE BUTTON - Only for Premium Users */}
          {isPremium && hasMoreQuestions && (
            <div className="flex justify-center mt-8 mb-4">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <PlusCircle size={20} />
                    Load More Questions ({questions.length} / {totalQuestions})
                  </>
                )}
              </button>
            </div>
          )}

          {/* Premium Badge - Only show for premium users */}
          {isPremium && (
            <div className="text-center mt-4 mb-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-bold rounded-full">
                <Sparkles size={12} />
                Premium Access
                <Sparkles size={12} />
              </span>
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
          isDarkTheme={isDarkMode}
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
    </div>
  );
}