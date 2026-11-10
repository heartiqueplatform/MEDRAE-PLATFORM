"use client";

import { CheckCircle2 } from "lucide-react";
import { useCallback } from "react";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" = "light") => {
    playSound("ui-tap");
    if (type === "success") vibrate([20, 30, 20]);
    else vibrate(15);
};

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type SubmitQuizButtonProps = {
    quizFinished: boolean;
    answers: Record<string, any>;
    questions: any[];
    handleSubmit: (auto?: boolean) => void;
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function SubmitQuizButton({
    quizFinished,
    answers,
    questions,
    handleSubmit,
}: SubmitQuizButtonProps) {
    const allAnswered = Object.keys(answers).length === questions.length;

    const onSubmit = useCallback(() => {
        tap("success");
        handleSubmit(false);
    }, [handleSubmit]);

    if (quizFinished) return null;
    if (!allAnswered) return null;

    return (
        <button
            onClick={onSubmit}
            className="w-full h-11 rounded-xl bg-blue-600 text-white
                       text-sm font-bold
                       flex items-center justify-center gap-2
                       active:scale-[0.97] transition-transform"
            style={{ touchAction: "manipulation" }}
        >
            <CheckCircle2 className="h-4 w-4" />
            Submit quiz
        </button>
    );
}