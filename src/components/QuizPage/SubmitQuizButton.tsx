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
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-none sm:rounded-md hover:bg-blue-700 transition mt-4"
        >
            Submit Quiz
        </button>
    );
}