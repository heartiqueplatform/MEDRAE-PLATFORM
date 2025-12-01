"use client";
import { GlobalLoader } from "@/components/GlobalLoader"; // adjust path if needed
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Countdown from "react-countdown";
import { supabase } from "@/lib/supabaseClient";
import OverlayAI from "@/components/OverlayAI"; // path where you saved OverlayAI.tsx
import { ArrowUp } from "lucide-react";

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
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const unit = params.get("unit");
const [isAIOverlayOpen, setAIOverlayOpen] = useState(false);
const [aiPrefillQuestion, setAIPrefillQuestion] = useState("");
const [timerEnd, setTimerEnd] = useState<number | null>(null);
const [notes, setNotes] = useState<Record<string, string>>({});
const [notUnderstood, setNotUnderstood] = useState<Record<string, boolean>>({});
const [attemptsCount, setAttemptsCount] = useState<Record<string, number>>({});
const [helpOthersDisabled, setHelpOthersDisabled] = useState<{ [key: string]: boolean }>({});

const [notesOverlay, setNotesOverlay] = useState<string | null>(null); // updated

const [understood, setUnderstood] = useState<Record<string, boolean>>({});

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedbackShown, setFeedbackShown] = useState<Record<string, boolean>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [showUnansweredOnly, setShowUnansweredOnly] = useState(false);
// Detect system dark mode
const [isDarkMode, setIsDarkMode] = useState(false);
const [showScrollTop, setShowScrollTop] = useState(false);

// State to control overlay visibility and selected question helpers
const [helpMeOverlayOpen, setHelpMeOverlayOpen] = useState(false);
const [helpMeHelpers, setHelpMeHelpers] = useState<
  { id: string; whatsapp: string; user_id: string; profiles: { name: string; avatar_url?: string } }[]
>([]);
const [currentQuestionText, setCurrentQuestionText] = useState("");
// Step 1: Add state for overlay
const [helpMeOverlay, setHelpMeOverlay] = useState<{ helpers: any[], questionText: string } | null>(null);

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
    const loadQuiz = async () => {
      const { data: quiz, error } = await supabase
        .from("quizzes")
        .select("id")
        .eq("unit", unit)
        .single();

      if (error || !quiz) {
        console.error("Error fetching quiz:", error);
        setLoading(false);
        return;
      }

      setQuizId(quiz.id);

      const { data: quizQuestions, error: qError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quiz.id);

      if (qError) console.error("Error loading quiz questions:", qError);

      const enriched = (quizQuestions as Question[]).map(q => ({ ...q, quiz_id: quiz.id }));
      setQuestions(enriched);
      setLoading(false);
// Load timer end from localStorage
const savedEnd = localStorage.getItem(`quiz-${quiz.id}-end`);
if (savedEnd) {
  setTimerEnd(Number(savedEnd));
} else {
  const endTime = Date.now() + TIMER_DURATION;
  setTimerEnd(endTime);
  localStorage.setItem(`quiz-${quiz.id}-end`, endTime.toString());
}

      // Load from localStorage
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

    if (unit) loadQuiz();
  }, [unit]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id ?? null;
      setUserId(id);
    };

    fetchUser();
  }, []);

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

  const handleAnswer = (questionId: string, selected: string) => {
    if (answers[questionId]) return; // Prevent double answer
    const updatedAnswers = { ...answers, [questionId]: selected };
    setAnswers(updatedAnswers);
    setFeedbackShown((prev) => ({ ...prev, [questionId]: true }));
    localStorage.setItem(`quiz-${quizId}-answers`, JSON.stringify(updatedAnswers));
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

  const fullText = `Let's discuss this question in NCK format:
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

 const handleReset = () => {
  if (!quizId) return;
  if (!window.confirm("Are you sure you want to reset this quiz? All your answers will be lost.")) {
    return;
  }
  localStorage.removeItem(`quiz-${quizId}-answers`);
  setAnswers({});
  setFeedbackShown({});
  setQuizFinished(false);
  setFinalScore(0);
};

  if (loading) return <GlobalLoader message="Medrae is Loading quiz..." />;

  if (questions.length === 0) return <p className="p-4">No questions found for: {unit}</p>;

  const filteredQuestions = showUnansweredOnly
    ? questions.filter(q => !answers[q.id])
    : questions;

  return (
    <div className="min-h-screen w-full p-4 space-y-6 bg-gray-50 dark:bg-gray-900">
<div className="flex justify-between items-center">
  <h1 className="text-2xl font-bold text-blue-700">{unit}</h1>
          {!quizFinished && timerEnd && (
  <Countdown
    date={timerEnd}
    onComplete={() => handleSubmit(true)}
    renderer={({ hours, minutes, seconds }) => (
      <div className="px-3 py-2 sm:px-4 sm:py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-md text-center">
        <p className="text-sm sm:text-base font-bold text-red-600 dark:text-red-400 mb-1">
          Time Remaining
        </p>
        <div className="flex items-center justify-center space-x-2 sm:space-x-3 text-lg sm:text-xl font-extrabold">
          <div className="flex flex-col items-center">
            <span>{hours}</span>
            <span className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400">
              Hours
            </span>
          </div>
          <span>:</span>
          <div className="flex flex-col items-center">
            <span>{minutes}</span>
            <span className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400">
              Minutes
            </span>
          </div>
          <span>:</span>
          <div className="flex flex-col items-center">
            <span>{seconds < 10 ? `0${seconds}` : seconds}</span>
            <span className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400">
              Seconds
            </span>
          </div>
        </div>
      </div>
    )}
  />
)}

      </div>
<div className="mt-2 flex justify-center sm:justify-end">
  <button
    onClick={handleResetTimer}
    className="px-4 py-2 rounded border transition
               border-black text-black
               bg-transparent
               hover:bg-green-500 hover:text-white
               dark:border-white dark:text-white dark:bg-transparent dark:hover:bg-green-500 dark:hover:text-white"
  >
    Reset Timer
  </button>
</div>

<div className="flex justify-between items-center gap-4">
  <button
    onClick={() => setShowUnansweredOnly(!showUnansweredOnly)}
    className="px-4 py-2 rounded border transition
               border-black text-black
               bg-transparent
               hover:bg-black hover:text-white
               dark:border-white dark:text-white dark:bg-transparent dark:hover:bg-white dark:hover:text-black"
  >
    {showUnansweredOnly ? "Show All Questions" : "Show Unanswered Only"}
  </button>

  <button
    onClick={handleReset}
    className="px-4 py-2 rounded border transition
               border-black text-black
               bg-transparent
               hover:bg-black hover:text-white
               dark:border-white dark:text-white dark:bg-transparent dark:hover:bg-white dark:hover:text-black"
  >
    Reset Quiz
  </button>
</div>

{filteredQuestions.map((q, i) => {
  const selectedAnswer = answers[q.id];
  const isCorrect = selectedAnswer === q.correct_answer;
  const showFeedback = feedbackShown[q.id];

  return (
    <div key={q.id} className="flex flex-col lg:flex-row gap-4 w-full">

      {/* Question Card */}
      <div
        className={`flex-1 p-4 border rounded shadow-sm border-gray-200 dark:border-gray-700 text-black dark:text-white transition-colors
${understood[q.id] ? "bg-green-300 dark:bg-green-800" : ""}


      ${notUnderstood[q.id] ? "bg-[#FF4C4C] dark:bg-[#800000]" : "bg-white dark:bg-gray-800"}`}
      >
        <p className="font-bold mb-2">Q{i + 1}: {q.question_text}</p>

        <div className="ml-4 space-y-2 text-sm">
          {["A", "B", "C", "D"].map((letter) => {
            const optionText = q[`option_${letter.toLowerCase() as "a" | "b" | "c" | "d"}`];
            const isSelected = selectedAnswer === letter;
            const correct = q.correct_answer === letter;

            return (
              <button
                key={letter}
                disabled={!!selectedAnswer || quizFinished}
                onClick={() => handleAnswer(q.id, letter)}
                className={`w-full text-left px-3 py-2 rounded font-semibold border transition-all duration-150
                  ${isSelected
                    ? correct
                      ? "bg-green-500 dark:bg-green-600 border-green-700 dark:border-green-500 text-black dark:text-white"
                      : "bg-red-500 dark:bg-red-600 border-red-700 dark:border-red-500 text-black dark:text-white"
                    : "bg-yellow-400 dark:bg-amber-700 border-yellow-600 dark:border-amber-600 text-black dark:text-white dark:drop-shadow-md hover:bg-yellow-500 dark:hover:bg-amber-800"}
                  ${selectedAnswer ? "cursor-default opacity-95" : "cursor-pointer"}`}
              >
                {letter}. {optionText}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex gap-2">
          <button
            onClick={() => handleReportQuestion(q)}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Report Question
          </button>

          <button
            onClick={() => {
              const optionsText = ["A", "B", "C", "D"]
                .map(letter => `${letter}: ${q[`option_${letter.toLowerCase() as "a" | "b" | "c" | "d"}`]}`)
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
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            HX AI Assistance
          </button>
        </div>

        {showFeedback && (
          <div className="mt-3">
            <p className={`font-semibold ${isCorrect ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {isCorrect ? "Correct!" : `Wrong. Correct answer is ${q.correct_answer}`}
            </p>
            {q.explanation && <p className="mt-1"><span className="font-semibold">Explanation:</span> {q.explanation}</p>}
            {q.additional && (
              <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 whitespace-pre-wrap">{q.additional}</pre>
            )}
          </div>
        )}
      </div>

      {/* Small Note Card */}
      <div className="w-full lg:w-1/3 p-4 border rounded shadow-sm bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-black dark:text-white flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-bold">Your Notes evaluation panel</h2>
        <div className="flex flex-col sm:flex-row gap-2 mb-2">

           <button
  onClick={() => setNotesOverlay(q.id)}
  className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-700 rounded hover:bg-gray-400 dark:hover:bg-gray-600 transition"
>
  Expand
</button>

<button
  onClick={async () => {
    if (!userId) return;

    const newState = !understood[q.id];

    // Toggle states locally
    setUnderstood(prev => ({ ...prev, [q.id]: newState }));
    setNotUnderstood(prev => ({ ...prev, [q.id]: false }));

    // Upsert full row
    const row = {
      user_id: userId,
      question_id: q.id,
      note_text: notes[q.id] || "",
      understood: newState,
      is_not_understood: false,
      attempts: attempts[q.id] || 0,
      help_others: helpOthersDisabled[q.id] ? "saved" : null
    };

    try {
      await supabase
        .from("question_notes")
        .upsert([row], { onConflict: "question_id, user_id"
 });
    } catch (err) {
      console.error("Error updating Understood:", err);
    }
  }}
  className={`px-2 py-1 text-xs rounded text-white transition ${understood[q.id] ? "bg-blue-600" : "bg-green-500 hover:bg-green-600"}`}
>
  Understood
</button>


    {/* Not Understood */}
<button
  onClick={async () => {
    if (!userId) return;

    const newState = !notUnderstood[q.id];

    // Toggle states locally
    setNotUnderstood(prev => ({ ...prev, [q.id]: newState }));
    setUnderstood(prev => ({ ...prev, [q.id]: false }));

    // Upsert full row
    const row = {
      user_id: userId,
      question_id: q.id,
      note_text: notes[q.id] || "",
      understood: false,
      is_not_understood: newState,
      attempts: attempts[q.id] || 0,
      help_others: helpOthersDisabled[q.id] ? "saved" : null
    };

    try {
      await supabase
        .from("question_notes")
        .upsert([row], { onConflict: "question_id, user_id"
 });
    } catch (err) {
      console.error("Error updating Not Understood:", err);
    }
  }}
  className={`px-2 py-1 text-xs rounded text-white transition ${notUnderstood[q.id] ? "bg-red-500" : "bg-gray-500 hover:bg-red-600"}`}
>
  Not Understood
</button>


      {/* Attempts */}
<button
  onClick={async () => {
    if (!userId) return;

    const current = attempts[q.id] || 0;
    const newCount = current + 1;
    setAttempts(prev => ({ ...prev, [q.id]: newCount }));

    // Upsert full row with updated attempts
    const row = {
      user_id: userId,
      question_id: q.id,
      note_text: notes[q.id] || "",
      understood: understood[q.id] || false,
      is_not_understood: notUnderstood[q.id] || false,
      attempts: newCount,
      help_others: helpOthersDisabled[q.id] ? "saved" : null
    };

    try {
      await supabase
        .from("question_notes")
        .upsert([row], { onConflict: "question_id, user_id"
 });
    } catch (err) {
      console.error("Error updating Attempts:", err);
    }
  }}
  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition"
>
  Attempted {attempts[q.id] || 0}
</button>

          </div>
        </div>

        <textarea
          value={notes[q.id] || ""}
          onChange={(e) => setNotes(prev => ({ ...prev, [q.id]: e.target.value }))}
          className="w-full flex-1 p-2 border rounded resize-none bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white mb-2 h-32"
          placeholder="Take notes here..."
        />

        <div className="flex gap-2 justify-end">
          {/* Save */}
          <button
            onClick={async () => {
              if (!userId) return;
              const text = notes[q.id] || "";
              const { data: existing } = await supabase
                .from("question_notes")
                .select("id")
                .eq("question_id", q.id)
                .eq("user_id", userId)
                .single();

              if (existing) {
                await supabase.from("question_notes").update({ note_text: text }).eq("id", existing.id);
              } else {
                await supabase.from("question_notes").insert([{ question_id: q.id, user_id: userId, note_text: text }]);
              }
              alert("Note saved!");
            }}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Save notes
          </button>

          {/* Help Others */}
   {/* Help Others */}
<button
  onClick={async () => {
    if (!userId || helpOthersDisabled[q.id]) return;

    const phone = prompt("Enter your WhatsApp number (with country code, e.g., +254712345678):");
    if (!phone) return;

    const row = {
      user_id: userId,
      question_id: q.id,
      note_text: notes[q.id] || "",
      understood: understood[q.id] || false,
      is_not_understood: notUnderstood[q.id] || false,
      attempts: attempts[q.id] || 0,
      help_others: phone
    };

    try {
      await supabase
        .from("question_notes")
        .upsert([row], { onConflict: "question_id, user_id"
 });

      setHelpOthersDisabled(prev => ({ ...prev, [q.id]: true }));
      alert("Your number is now available for other students!");
    } catch (err) {
      console.error("Error saving Help Others:", err);
    }
  }}
  className={`px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition ${helpOthersDisabled[q.id] ? "opacity-50 cursor-not-allowed" : ""}`}
  disabled={helpOthersDisabled[q.id]}
>
  Help Others
</button>

          {/* Help Me */}

<button
  onClick={async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("question_notes")
      .select(`
        id,
        help_others,
        profiles:user_id(name, avatar_url)
      `)
      .eq("question_id", q.id)
      .not("help_others", "eq", "none"); // Only fetch rows where help_others has a phone

    if (error) {
      console.error("Error fetching helpers:", error);
      alert("Failed to fetch helpers.");
      return;
    }

    if (!data || data.length === 0) {
      alert("No one has offered help yet for this question.");
      return;
    }

    // Map to expected structure for overlay
    const helpers = data.map((d: any) => ({
      id: d.id,
      whatsapp: d.help_others,   // <-- this is the phone column
      profiles: d.profiles
    }));

    setHelpMeHelpers(helpers);
    setCurrentQuestionText(q.question_text);
    setHelpMeOverlayOpen(true);
  }}
  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition"
>
  Help Me
</button>

{notesOverlay === q.id && (
<div
  className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
  onClick={() => setNotesOverlay(null)} // clicking the overlay closes it
>

<div
  className="bg-gray-50 dark:bg-gray-900 w-full max-w-4xl h-[90vh] rounded shadow-lg flex flex-col p-4 overflow-auto"
  onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
>


      {/* ============================ */}
      {/* HEADER SECTION */}
      {/* ============================ */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-xl text-blue-700 dark:text-blue-300">
          📘 Expanded Notes Panel — Deep Thinking Mode
        </h2>
        <button
          onClick={() => setNotesOverlay(null)}
          className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-700 rounded hover:bg-gray-400 dark:hover:bg-gray-600 transition"
        >
          Close
        </button>
      </div>

      {/* ============================ */}
      {/* GUIDE / INSTRUCTION SECTION */}
      {/* ============================ */}
      <div className="mb-4 p-3 border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
        <p className="font-semibold mb-1">How to Use This Panel:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li><strong>Take deeper notes</strong> about why you got it wrong/right.</li>
          <li>Mark the question as <strong>Understood</strong> or <strong>Not Understood</strong>.</li>
          <li>Track how many times you have <strong>Attempted</strong> it.</li>
          <li>You can even <strong>Offer Help</strong> to others or request help using <strong>Help Me</strong>.</li>
          <li>Everything is auto-synced online.</li>
        </ul>
      </div>

      {/* ============================ */}
      {/* BUTTONS SECTION */}
      {/* ============================ */}
      <div className="flex flex-wrap gap-2 mb-4">

        {/* UNDERSTOOD */}
        <button
          onClick={async () => {
            if (!userId) return;

            const newState = !understood[q.id];
            setUnderstood(prev => ({ ...prev, [q.id]: newState }));
            setNotUnderstood(prev => ({ ...prev, [q.id]: false }));

            const row = {
              user_id: userId,
              question_id: q.id,
              note_text: notes[q.id] || "",
              understood: newState,
              is_not_understood: false,
              attempts: attempts[q.id] || 0,
              help_others: helpOthersDisabled[q.id] ? "saved" : null
            };

            try {
              await supabase.from("question_notes").upsert([row], { onConflict: ["user_id","question_id"] });
            } catch (err) {
              console.error("Error updating Understood:", err);
            }
          }}
          className={`px-3 py-1 text-sm rounded text-white transition ${
            understood[q.id]
              ? "bg-blue-600"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          Understood
        </button>

        {/* NOT UNDERSTOOD */}
        <button
          onClick={async () => {
            if (!userId) return;

            const newState = !notUnderstood[q.id];
            setNotUnderstood(prev => ({ ...prev, [q.id]: newState }));
            setUnderstood(prev => ({ ...prev, [q.id]: false }));

            const row = {
              user_id: userId,
              question_id: q.id,
              note_text: notes[q.id] || "",
              understood: false,
              is_not_understood: newState,
              attempts: attempts[q.id] || 0,
              help_others: helpOthersDisabled[q.id] ? "saved" : null
            };

            try {
              await supabase.from("question_notes").upsert([row], { onConflict: ["user_id","question_id"] });
            } catch (err) {
              console.error("Error updating Not Understood:", err);
            }
          }}
          className={`px-3 py-1 text-sm rounded text-white transition ${
            notUnderstood[q.id]
              ? "bg-red-500"
              : "bg-gray-500 hover:bg-red-600"
          }`}
        >
          Not Understood
        </button>

        {/* ATTEMPTED */}
        <button
          onClick={async () => {
            if (!userId) return;

            const current = attempts[q.id] || 0;
            const newCount = current + 1;
            setAttempts(prev => ({ ...prev, [q.id]: newCount }));

            const row = {
              user_id: userId,
              question_id: q.id,
              note_text: notes[q.id] || "",
              understood: understood[q.id] || false,
              is_not_understood: notUnderstood[q.id] || false,
              attempts: newCount,
              help_others: helpOthersDisabled[q.id] ? "saved" : null
            };

            try {
              await supabase.from("question_notes").upsert([row], { onConflict: ["user_id","question_id"] });
            } catch (err) {
              console.error("Error updating Attempts:", err);
            }
          }}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Attempted {attempts[q.id] || 0}
        </button>

      </div>

      {/* ============================ */}
      {/* NOTES TEXTAREA */}
      {/* ============================ */}
      <textarea
        value={notes[q.id] || ""}
        onChange={(e) => setNotes(prev => ({ ...prev, [q.id]: e.target.value }))}
        placeholder="Take notes here..."
        className="w-full flex-1 p-3 border rounded resize-none bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white mb-4"
      />

      {/* ============================ */}
      {/* BOTTOM BUTTONS */}
      {/* ============================ */}
      <div className="flex flex-wrap gap-2 mt-2">

        {/* SAVE NOTE */}
        <button
          onClick={async () => {
            if (!userId) return;

            const text = notes[q.id] || "";

            const row = {
              user_id: userId,
              question_id: q.id,
              note_text: text,
              understood: understood[q.id] || false,
              is_not_understood: notUnderstood[q.id] || false,
              attempts: attempts[q.id] || 0,
              help_others: helpOthersDisabled[q.id] ? "saved" : null
            };

            try {
              await supabase.from("question_notes").upsert([row], { onConflict: ["user_id","question_id"] });
              alert("Note saved!");
            } catch (err) {
              console.error("Error saving note:", err);
            }
          }}
          className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Save
        </button>

        {/* HELP OTHERS */}
        <button
          onClick={async () => {
            if (!userId || helpOthersDisabled[q.id]) return;

            const phone = prompt("Enter your WhatsApp number (e.g., +254712345678):");
            if (!phone) return;

            const row = {
              user_id: userId,
              question_id: q.id,
              note_text: notes[q.id] || "",
              understood: understood[q.id] || false,
              is_not_understood: notUnderstood[q.id] || false,
              attempts: attempts[q.id] || 0,
              help_others: phone
            };

            try {
              await supabase.from("question_notes").upsert([row], { onConflict: ["user_id","question_id"] });
              setHelpOthersDisabled(prev => ({ ...prev, [q.id]: true }));
              alert("Your number is now available to help others!");
            } catch (err) {
              console.error("Error saving Help Others:", err);
            }
          }}
          disabled={helpOthersDisabled[q.id]}
          className={`px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition ${
            helpOthersDisabled[q.id] ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          Help Others
        </button>

        {/* HELP ME */}
        <button
          onClick={async () => {
            if (!userId) return;

            try {
              const { data, error } = await supabase
                .from("question_notes")
                .select("user_id, help_others")
                .eq("question_id", q.id)
                .not("help_others", "is", null);

              if (error || !data || data.length === 0) {
                alert("No one has offered help yet.");
                return;
              }

              const options = data
                .map((d, idx) => `${idx + 1}. ${d.help_others}`)
                .join("\n");

              const choice = prompt(
                `Choose someone to WhatsApp:\n${options}\nEnter number:`
              );

              if (!choice) return;

              const selected = data[Number(choice) - 1];
              if (!selected) return;

              const message = encodeURIComponent(
                `Hi! Can you help me with this question?\n\n${q.question_text}\n\nThanks!`
              );

              window.open(`https://wa.me/${selected.help_others}?text=${message}`, "_blank");
            } catch (err) {
              console.error("Error fetching Help Me contacts:", err);
              alert("Failed to fetch helpers.");
            }
          }}
          className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition"
        >
          Help Me
        </button>

      </div>

    </div>
  </div>
)}



{/* Help Me Overlay */}
{helpMeOverlayOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2">
    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded shadow-lg p-4 flex flex-col space-y-3 h-[90vh] overflow-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-blue-700 dark:text-blue-300">Helpers Available</h2>
        <button
          onClick={() => setHelpMeOverlayOpen(false)}
          className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-700 rounded hover:bg-gray-400 dark:hover:bg-gray-600 transition"
        >
          Close
        </button>
      </div>

      {/* List of Helpers */}
      <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
        {helpMeHelpers.map((helper) => (
          <div
            key={helper.id}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            {/* Avatar */}
            <img
              src={helper.profiles.avatar_url || "/default-avatar.png"}
              alt={helper.profiles.name}
              className="w-10 h-10 rounded-full object-cover"
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
              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition"
            >
              Message
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
)}

        </div>
      </div>
    </div>

    
  );
})}


      {!quizFinished && Object.keys(answers).length === questions.length && (
        <button
          onClick={() => handleSubmit(false)}
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition mt-4"
        >
          Submit Quiz
        </button>
      )}

      {quizFinished && (
        <>
        <div className="mt-6 p-4 bg-green-100 dark:bg-green-900 rounded text-green-800 dark:text-green-200 font-semibold">
            You got {finalScore} out of {questions.length} correct!
          </div>

         <button
  onClick={() => {
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
  className="mt-4 px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition"
>
  View Your Result
</button>

        </>
      )}

      {attempts.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold mb-2">Past Attempts</h2>
          <ul className="space-y-2 text-sm text-gray-800">
            {attempts.map((attempt) => (
             <li key={attempt.id} className="p-2 border rounded bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-black dark:text-white">
                🗓 {new Date(attempt.submitted_at).toLocaleString()} — Score: {attempt.score}
              </li>
            ))}
          </ul>
        </div>
      )}
<OverlayAI
  isOpen={isAIOverlayOpen}
  onClose={() => setAIOverlayOpen(false)}
  prefillQuestion={aiPrefillQuestion}
  isDarkTheme={isDarkMode} // Pass theme flag
/>
{showScrollTop && (
  <button
    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    className={`fixed bottom-6 right-6 p-3 rounded-full shadow-lg hover:scale-110 transition-transform 
      ${isDarkMode ? "bg-white text-gray-900" : "bg-gray-900 text-white"}`}
    aria-label="Scroll to top"
  >
    <ArrowUp size={20} strokeWidth={2} />
  </button>
)}

    </div>
  );
}
