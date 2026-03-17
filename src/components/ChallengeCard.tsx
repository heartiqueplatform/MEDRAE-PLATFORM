"use client";

import { Swords } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button"; // Using your existing UI Button

export default function ChallengeCard() {
    const navigate = useNavigate();

    const handleNavigate = () => {
        if (navigator.vibrate) navigator.vibrate(50);
        navigate("/challenge");
    };

    return (
        <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="
        relative overflow-hidden rounded-3xl p-8 shadow-2xl
        flex flex-col md:flex-row items-center gap-6
        bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600
        text-white
        dark:from-gray-800 dark:via-gray-700 dark:to-gray-900
        hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]
        transition-shadow duration-300
      "
        >
            {/* Icon */}
            <div className="
        flex-shrink-0 p-5 rounded-full
        bg-white/30 dark:bg-white/10 backdrop-blur-md
        flex items-center justify-center
      ">
                <Swords size={44} className="text-white dark:text-pink-400 drop-shadow-lg" />
            </div>

            {/* Text */}
            <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-extrabold mb-2 tracking-wide drop-shadow-md">
                    Challenge Your Classmate!
                </h2>
                <p className="text-white/90 dark:text-gray-300 text-sm md:text-base leading-relaxed">
                    Compete in quizzes, track your scores, and show who’s the top brain in your class.
                </p>

                {/* Button */}
                <div className="mt-4 md:mt-6">
                    <Button
                        onClick={handleNavigate}
                        className="bg-white text-purple-700 dark:text-white dark:bg-pink-500 hover:bg-gray-100 dark:hover:bg-pink-600 font-semibold px-6 py-2 rounded-full shadow-lg transition-all"
                    >
                        Visit Page
                    </Button>
                </div>
            </div>

            {/* Glow accent */}
            <div className="
        absolute -top-10 -right-10 w-40 h-40 rounded-full
        bg-pink-500/40 dark:bg-pink-600/30 blur-3xl animate-pulse-slow pointer-events-none
      "></div>
        </motion.div>
    );
}