"use client";

import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Countdown from "react-countdown";
import { supabase } from "@/lib/supabaseClient";

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

    setFinalScore(correctCount);
    setQuizFinished(true);
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

  if (loading) return <p className="p-4">Loading quiz...</p>;
  if (questions.length === 0) return <p className="p-4">No questions found for: {unit}</p>;

  const filteredQuestions = showUnansweredOnly
    ? questions.filter(q => !answers[q.id])
    : questions;

  return (
    <div className="min-h-screen w-full p-4 space-y-6 bg-gray-50">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-700">{unit}</h1>
        {!quizFinished && (
          <Countdown
            date={Date.now() + TIMER_DURATION}
            onComplete={() => handleSubmit(true)}
            renderer={({ minutes, seconds }) => (
              <span className="text-red-600 font-semibold">
                ⏳ {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
              </span>
            )}
          />
        )}
      </div>

      <div className="flex justify-between items-center gap-4">
        <button
          onClick={() => setShowUnansweredOnly(!showUnansweredOnly)}
          className="px-4 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-600 transition"
        >
          {showUnansweredOnly ? "Show All Questions" : "Show Unanswered Only"}
        </button>

        <button
          onClick={handleReset}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Reset Quiz
        </button>
      </div>

      {filteredQuestions.map((q, i) => {
        const selectedAnswer = answers[q.id];
        const isCorrect = selectedAnswer === q.correct_answer;
        const showFeedback = feedbackShown[q.id];

        return (
          <div key={q.id} className="p-4 border rounded shadow-sm bg-white">
            <p className="font-bold text-black mb-2">Q{i + 1}: {q.question_text}</p>

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
                          ? "bg-green-500 border-green-700 text-black"
                          : "bg-red-500 border-red-700 text-black"
                        : "bg-yellow-400 border-yellow-600 text-black hover:bg-yellow-500"}
                      ${selectedAnswer ? "cursor-default opacity-95" : "cursor-pointer"}
                    `}
                  >
                    {letter}. {optionText}
                  </button>
                );
              })}
            </div>

            {showFeedback && (
              <div className="mt-3">
                <p className={`font-semibold ${isCorrect ? "text-green-700" : "text-red-600"}`}>
                  {isCorrect ? "Correct!" : `Wrong. Correct answer is ${q.correct_answer}`}
                </p>
                {q.explanation && (
                  <p className="text-black mt-1">
                    <span className="font-semibold">Explanation:</span> {q.explanation}
                  </p>
                )}
                {q.additional && (
                  <pre className="mt-2 text-xs bg-gray-100 p-2 whitespace-pre-wrap text-black">
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
          <div className="mt-6 p-4 bg-green-100 rounded text-green-800 font-semibold">
            You got {finalScore} out of {questions.length} correct!
          </div>

          <button
            onClick={() => alert(`You scored ${finalScore}/${questions.length}`)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Get Result
          </button>
        </>
      )}

      {attempts.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold mb-2">Past Attempts</h2>
          <ul className="space-y-2 text-sm text-gray-800">
            {attempts.map((attempt) => (
              <li key={attempt.id} className="p-2 border rounded bg-white">
                🗓 {new Date(attempt.submitted_at).toLocaleString()} — Score: {attempt.score}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
