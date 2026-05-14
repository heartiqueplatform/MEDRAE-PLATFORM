"use client";

import { Swords, ChevronRight, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ChallengeCard() {
    const navigate = useNavigate();

    const handleNavigate = () => {
        if (navigator.vibrate) navigator.vibrate(50);
        navigate("/challenge");
    };

    return (
        <motion.div
            whileHover={{ translateY: -2 }}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="
                relative overflow-hidden w-full max-w-xl mx-auto
                flex items-center gap-4 p-3 pr-5
                bg-white dark:bg-slate-950
                border-0
                rounded-2xl shadow-sm hover:shadow-md transition-all duration-300
            "
        >
            {/* Professional Image Container */}
            <div className="relative h-16 w-16 md:h-20 md:w-20 shrink-0 rounded-xl overflow-hidden shadow-inner bg-slate-100">
                <img
                    src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=200&h=200"
                    alt="Clinical Challenge"
                    className="h-full w-full object-cover grayscale-[20%] group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-blue-600/10 dark:bg-blue-400/10" />

                {/* Floating Icon Overlay */}
                <div className="absolute bottom-1 right-1 bg-white dark:bg-slate-900 p-1 rounded-lg shadow-lg border border-slate-100 dark:border-slate-800">
                    <Swords size={12} className="text-blue-600 dark:text-blue-400" />
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight uppercase">
                        Classmate Challenge
                    </h3>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 md:line-clamp-2 leading-relaxed">
                    Test your clinical skills in a 1v1 battle and climb the leaderboard.
                </p>
            </div>

            {/* Action Button */}
            <div className="shrink-0">
                <Button
                    onClick={handleNavigate}
                    size="sm"
                    className="
                        h-9 px-4 rounded-xl font-bold text-xs
                        bg-slate-900 dark:bg-blue-600 text-white
                        hover:bg-blue-700 dark:hover:bg-blue-500
                        flex items-center gap-1 group transition-all
                    "
                >
                    Battle
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Button>
            </div>

            {/* Subtle Gradient Accent (Theme Aware) */}
            <div className="absolute top-0 right-0 w-1/4 h-full bg-gradient-to-l from-blue-50/50 dark:from-blue-900/10 to-transparent pointer-events-none" />
        </motion.div>
    );
}