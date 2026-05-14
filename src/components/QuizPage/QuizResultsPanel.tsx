"use client";

type QuizResultsPanelProps = {
    quizFinished: boolean;
    finalScore: number;
    questions: any[];
    attempts: any[];

    playSound: (name: string) => void;
};

export function QuizResultsPanel({
    quizFinished,
    finalScore,
    questions,
    attempts,
    playSound,
}: QuizResultsPanelProps) {
    if (!quizFinished) return null;

    return (
        <>
            {/* ====================== FINAL RESULT ====================== */}
            <div className="mt-6 p-3 bg-green-100 dark:bg-green-900 rounded-none sm:rounded-md text-green-800 dark:text-green-200 font-semibold">
                Well done! You answered {finalScore} out of {questions.length} questions correctly.
                Keep practicing to strengthen your understanding and improve your score.
            </div>

            <button
                onClick={() => {
                    // 🔊 Play tap sound
                    playSound("tap");

                    // 📳 Vibration
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
                        + "\n\n Remember: progress is about growth, not perfection. The fact that you showed up and tried already puts you ahead. Keep pushing — your future self will thank you!"
                    );
                }}
                className="mt-4 px-6 py-3 bg-indigo-600 text-white font-bold rounded-none sm:rounded-md-lg shadow-md hover:bg-indigo-700 transition"
            >
                View Your Result
            </button>

            {/* ====================== PAST ATTEMPTS ====================== */}
            {attempts.length > 0 && (
                <div className="mt-10">
                    <h2 className="text-lg font-bold mb-2">Past Attempts</h2>

                    <ul className="space-y-2 text-sm text-gray-800">
                        {attempts.map((attempt) => (
                            <li
                                key={attempt.id}
                                className="p-2 border rounded-none sm:rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-black dark:text-white"
                            >
                                Your attempt on{" "}
                                {new Date(attempt.submitted_at).toLocaleString("en-US", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}{" "}
                                has been recorded. You scored {attempt.score} points for this checkpoint.
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </>
    );
}