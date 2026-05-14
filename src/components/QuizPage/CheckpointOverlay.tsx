"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Trophy, ArrowRight, X, Star } from "lucide-react";

type CheckpointOverlayProps = {
    checkpointOverlay: {
        visible: boolean;
        reached: number;
        total: number;
        percentCompleted: number;
    } | null;
    quizId: string | null;
    userId: string | null;
    unit: string;
    lastCheckpoint: number;
    answers: Record<string, any>;
    questions: any[];
    supabase: any;
    setCheckpointOverlay: (v: any) => void;
    playSound: (name: string) => void;
};

// Professional Spring Physics
const springTransition = { type: "spring", stiffness: 300, damping: 30 };

export function CheckpointOverlay({
    checkpointOverlay,
    quizId,
    userId,
    unit,
    lastCheckpoint,
    answers,
    questions,
    supabase,
    setCheckpointOverlay,
    playSound,
}: CheckpointOverlayProps) {

    const handleSubmit = async () => {
        if (!quizId || !userId || !checkpointOverlay) return;

        // Haptic & Sound
        if (navigator.vibrate) navigator.vibrate([40, 20, 40]);
        playSound("start");

        const startIndex = lastCheckpoint - checkpointOverlay.total;
        const questionMap = new Map(questions.map(q => [q.id, q.correct_answer]));
        const checkpointQuestionIds = Object.keys(answers).slice(startIndex, startIndex + checkpointOverlay.total);

        const correctInCheckpoint = checkpointQuestionIds.reduce((count, qid) => {
            return answers[qid] === questionMap.get(qid) ? count + 1 : count;
        }, 0);

        // Close UI immediately for "Fast" feel, but keep data syncing in background
        setCheckpointOverlay(null);

        await supabase.from("quiz_results").insert([{
            quiz_id: quizId,
            user_id: userId,
            unit: unit,
            score: correctInCheckpoint,
            total_questions: checkpointOverlay.total,
            created_at: new Date().toISOString(),
        }]);
    };

    return (
        <AnimatePresence mode="wait">
            {checkpointOverlay?.visible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">

                    {/* BACKDROP EXIT: Fades out smoothly */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
                        onClick={() => setCheckpointOverlay(null)}
                    />

                    {/* MODAL EXIT: Scales down and slides out with gravity */}
                    <motion.div
                        initial={{ scale: 0.85, opacity: 0, y: 40, rotateX: 15 }}
                        animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
                        exit={{
                            scale: 0.95,
                            opacity: 0,
                            y: 20,
                            transition: { duration: 0.2, ease: "easeIn" }
                        }}
                        transition={springTransition}
                        className="relative bg-gray-900 border border-white/10 w-full max-w-md rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                        {/* Animated Header Gradient */}
                        <div className="h-36 bg-gradient-to-tr from-indigo-600 via-violet-600 to-fuchsia-600 flex items-center justify-center relative overflow-hidden">
                            {/* Decorative background shapes */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"
                            />

                            <div className="bg-white/10 p-1 rounded-full backdrop-blur-md border border-white/20">
                                <div className="bg-white p-4 rounded-full shadow-2xl">
                                    <Trophy className="w-10 h-10 text-orange-500" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 pb-10 px-8 text-center">
                            <div className="flex justify-center gap-1 mb-2">
                                {[...Array(3)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2 + i * 0.1 }}
                                    >
                                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                    </motion.div>
                                ))}
                            </div>

                            <h2 className="text-2xl font-black text-white tracking-tight mb-2">
                                Checkpoint Reached!
                            </h2>
                            <p className="text-gray-400 text-sm mb-8 px-4 leading-relaxed">
                                You're doing great. Take a moment to save your progress or keep the momentum going.
                            </p>

                            {/* Progress Container */}
                            <div className="bg-white/5 rounded-3xl p-6 mb-8 border border-white/5 ring-1 ring-inset ring-white/10">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Completion</span>
                                    <span className="text-lg font-mono font-bold text-white tracking-tighter">
                                        {checkpointOverlay.percentCompleted}%
                                    </span>
                                </div>

                                {/* Slim Modern Progress Bar */}
                                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${checkpointOverlay.percentCompleted}%` }}
                                        transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }} // Custom cubic-bezier for "pop"
                                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500"
                                    />
                                </div>

                                <p className="mt-4 text-xs text-gray-400 font-medium">
                                    Batch: <span className="text-gray-200">{checkpointOverlay.reached} questions</span>
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleSubmit}
                                    className="group relative flex items-center justify-center w-full bg-white text-gray-950 font-bold py-4 rounded-2xl transition-shadow hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                >
                                    <CheckCircle2 className="mr-2 w-5 h-5 text-indigo-600" />
                                    Submit Results
                                    <ArrowRight className="ml-2 w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                                </motion.button>

                                <button
                                    onClick={() => setCheckpointOverlay(null)}
                                    className="w-full bg-transparent hover:bg-white/5 text-gray-500 hover:text-white text-sm font-semibold py-3 transition-all rounded-xl"
                                >
                                    Continue Studying
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}