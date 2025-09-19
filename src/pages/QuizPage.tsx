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
    "You are reporting this question. A new AI window is opening to discuss this question as Heartique team reviews it. You can send your input directly."
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

  if (loading) return <GlobalLoader message="Heartique is Loading quiz..." />;

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
          <div
  key={q.id}
  className="w-full p-4 border rounded shadow-sm 
             bg-white dark:bg-gray-800 
             border-gray-200 dark:border-gray-700 
             text-black dark:text-white"
>

           <p className="font-bold text-black dark:text-white mb-2">Q{i + 1}: {q.question_text}</p>

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
  ${selectedAnswer ? "cursor-default opacity-95" : "cursor-pointer"}
`}

                  >
                    {letter}. {optionText}
                  </button>
                );
              })}
            </div>
<div className="mt-2 flex gap-2">
  <button
    onClick={() => handleReportQuestion(q)} // optional: you can reuse same function
    className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
  >
    Report Question
  </button>

  <button
  onClick={() => {
    const optionsText = ["A", "B", "C", "D"]
      .map(
        (letter) =>
          `${letter}: ${q[`option_${letter.toLowerCase() as "a" | "b" | "c" | "d"}`]}`
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
Question: ${q.question_text}
Options:
${optionsText}
User Answer: ${answers[q.id] || "No answer selected"}
Please provide a detailed discussion and guidance.`;

setAIPrefillQuestion(chunkText(fullText, 200)); // 200 chars per block
setAIOverlayOpen(true);

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
                {q.explanation && (
                 <p className="text-black dark:text-white mt-1">

                    <span className="font-semibold">Explanation:</span> {q.explanation}
                  </p>
                )}
                {q.additional && (
                 <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 whitespace-pre-wrap text-black dark:text-white">

                    {q.additional}
                  </pre>
                )}
              </div>
            )}
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
