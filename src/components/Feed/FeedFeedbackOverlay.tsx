"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Props {
    message: string | null;
    onClose: () => void;
}

export default function FeedFeedbackOverlay({ message, onClose }: Props) {
    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    className="fixed inset-0 z-[2147483647] flex items-center justify-center px-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div
                        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ scale: 0.6, y: 40 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18 }}
                        className="relative z-10 px-6 py-6 rounded-3xl
                            bg-white dark:bg-gray-900
                            text-center max-w-sm w-full"
                    >
                        <div className="w-full flex justify-center items-center">
                            {message.includes("🔥") && (
                                <img
                                    src="https://em-content.zobj.net/source/animated-noto-color-emoji/356/fire_1f525.gif"
                                    alt="fire"
                                    width={110}
                                    height={110}
                                />
                            )}
                            {message.includes("🏆") && (
                                <img
                                    src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f3c6/512.gif"
                                    alt="trophy"
                                    width={110}
                                    height={110}
                                />
                            )}
                            {message.includes("💬") && (
                                <img
                                    src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a1/512.gif"
                                    alt="hint"
                                    width={110}
                                    height={110}
                                />
                            )}
                        </div>
                        <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mt-2">
                            {message}
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}