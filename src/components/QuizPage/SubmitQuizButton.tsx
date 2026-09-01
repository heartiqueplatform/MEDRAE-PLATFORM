"use client";

type SubmitQuizButtonProps = {
    quizFinished: boolean;
    answers: Record<string, any>;
    questions: any[];
    handleSubmit: (auto?: boolean) => void;
};

export function SubmitQuizButton({
    quizFinished,
    answers,
    questions,
    handleSubmit,
}: SubmitQuizButtonProps) {
    if (quizFinished) return null;

    const allAnswered =
        Object.keys(answers).length === questions.length;

    if (!allAnswered) return null;

    return (
        <button
            onClick={() => handleSubmit(false)}
            className="inline-flex items-center justify-center gap-2 px-6 h-11 rounded-xl
                border border-gray-200 bg-blue-700  text-white
                dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200
                hover:bg-blue-500 hover:text-white dark:hover:bg-gray-800
                active:bg-gray-100 dark:active:bg-gray-700
                transition-all duration-200 font-semibold shadow-sm
                disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
            Submit Quiz
        </button>
    );
}