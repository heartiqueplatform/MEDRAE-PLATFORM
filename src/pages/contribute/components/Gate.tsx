// src/pages/contribute/components/Gate.tsx

"use client";

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Lock, Sparkles, Clock, XCircle, AlertTriangle, ChevronRight } from "lucide-react";
import { playSound } from "@/lib/soundManager";
import type { EnrollmentStatus } from "../types";

interface Props {
    status: EnrollmentStatus | null;
    notes?: string | null;
}

export function Gate({ status, notes }: Props) {
    const navigate = useNavigate();

    const goToWallet = () => {
        playSound("ui-tap");
        navigate("/wallet");
    };

    if (!status) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center space-y-4"
            >
                <div className="h-14 w-14 rounded-full bg-amber-50 dark:bg-amber-500/10
                                flex items-center justify-center mx-auto">
                    <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Approval required
                    </h2>
                    <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        To create quizzes and earn coins from them, you must first
                        join the Medrae Coin Program. Apply once, get approved, and
                        your submissions unlock immediately.
                    </p>
                </div>
                <button
                    onClick={goToWallet}
                    className="w-full h-11 rounded-xl bg-blue-600 text-white
                               text-sm font-bold flex items-center justify-center gap-1.5
                               active:scale-[0.97] transition-transform"
                    style={{ touchAction: "manipulation" }}
                >
                    <Sparkles className="w-4 h-4" />
                    Apply for the Coin Program
                    <ChevronRight className="w-4 h-4" />
                </button>
                <p className="text-[10.5px] text-slate-400 dark:text-slate-500">
                    You'll be taken to your wallet where you can submit an application.
                </p>
            </motion.div>
        );
    }

    if (status === "pending") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center space-y-3"
            >
                <div className="h-14 w-14 rounded-full bg-amber-50 dark:bg-amber-500/10
                                flex items-center justify-center mx-auto">
                    <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Application under review
                </h2>
                <p className="text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Your Coin Program application is being reviewed. You'll be
                    notified within 24 hours. Once approved, you can start
                    creating quizzes and earning coins.
                </p>
                <button
                    onClick={goToWallet}
                    className="w-full h-11 rounded-xl bg-slate-100 dark:bg-white/[0.06]
                               text-slate-700 dark:text-slate-300 text-sm font-bold
                               flex items-center justify-center gap-1.5
                               active:scale-[0.97] transition-transform"
                >
                    View wallet status
                </button>
            </motion.div>
        );
    }

    if (status === "rejected") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center space-y-3"
            >
                <div className="h-14 w-14 rounded-full bg-rose-50 dark:bg-rose-500/10
                                flex items-center justify-center mx-auto">
                    <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Application declined
                </h2>
                <p className="text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {notes || "Your Coin Program application was declined."}
                </p>
                <button
                    onClick={goToWallet}
                    className="w-full h-11 rounded-xl bg-slate-100 dark:bg-white/[0.06]
                               text-slate-700 dark:text-slate-300 text-sm font-bold
                               flex items-center justify-center gap-1.5
                               active:scale-[0.97] transition-transform"
                >
                    View wallet & reapply
                </button>
            </motion.div>
        );
    }

    // suspended
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center space-y-3"
        >
            <div className="h-14 w-14 rounded-full bg-rose-50 dark:bg-rose-500/10
                            flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Account suspended
            </h2>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {notes || "Your creator privileges are currently paused. Contact support for details."}
            </p>
            <button
                onClick={goToWallet}
                className="w-full h-11 rounded-xl bg-slate-100 dark:bg-white/[0.06]
                           text-slate-700 dark:text-slate-300 text-sm font-bold
                           flex items-center justify-center gap-1.5
                           active:scale-[0.97] transition-transform"
            >
                View wallet
            </button>
        </motion.div>
    );
}