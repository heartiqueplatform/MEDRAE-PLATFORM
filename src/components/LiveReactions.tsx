"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

// SVG Icons
const CorrectIcon = () => (
    <svg className="w-6 h-6 text-green-500 inline-block ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const WrongIcon = () => (
    <svg className="w-6 h-6 text-red-500 inline-block ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

type LiveEvent = {
    id: string;
    user_id: string;
    event_type: string;
    is_correct: boolean | null;
    streak_count: number | null;
    created_at: string;
    user_name?: string;
    user_avatar?: string;
    is_streak_popup?: boolean;
};

export default function LiveReactions() {
    const [events, setEvents] = useState<LiveEvent[]>([]);
    const [panelOpen, setPanelOpen] = useState(false);
    const [newEventCount, setNewEventCount] = useState(0);
    const panelRef = useRef<HTMLDivElement>(null);

    const [bubbleEvents, setBubbleEvents] = useState<number[]>([]);


    useEffect(() => {
        if (newEventCount > 0) {
            // Create a new bubble for each new event
            const newBubbles = Array.from({ length: newEventCount }, (_, i) => Date.now() + i);
            setBubbleEvents((prev) => [...prev, ...newBubbles]);

            // Remove bubbles after 2 seconds
            const timeout = setTimeout(() => {
                setBubbleEvents([]);
            }, 2000);

            return () => clearTimeout(timeout);
        }
    }, [newEventCount]);


    // Subscribe to Supabase events
    useEffect(() => {
        const channel = supabase
            .channel("live-answer-events-ui")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "live_answer_events" },
                async (payload) => {
                    const newEvent = payload.new as LiveEvent;

                    const { data: userData } = await supabase
                        .from("profiles")
                        .select("name, avatar_url")
                        .eq("user_id", newEvent.user_id)
                        .single();

                    if (userData) {
                        newEvent.user_name = userData.name;
                        newEvent.user_avatar = userData.avatar_url;
                    }

                    const newEvents: LiveEvent[] = [newEvent];

                    if (newEvent.streak_count && newEvent.streak_count >= 5) {
                        newEvents.push({
                            ...newEvent,
                            id: `${newEvent.id}-streak`,
                            is_streak_popup: true,
                        });
                    }

                    setEvents((prev) => {
                        const updated = [...newEvents, ...prev];
                        return updated.slice(0, 20);
                    });

                    if (!panelOpen) setNewEventCount((prev) => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [panelOpen]);

    const handleTogglePanel = () => {
        setPanelOpen(!panelOpen);
        if (!panelOpen) setNewEventCount(0);
    };
    const getEventIcon = (type?: string) => {
        if (type === "answered_correct") return <CorrectIcon />;
        if (type === "answered_wrong") return <WrongIcon />;
        return null;
    };

    return (
        <>
            {/* Floating Avatar Button */}
            <div className="hidden lg:block fixed bottom-60 right-2 z-50">

                <button
                    onClick={handleTogglePanel}
                    className="relative w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center hover:scale-110 transition-transform overflow-visible"
                >
                    <img
                        src="/UsersAvatar.jpg"
                        alt="Live"
                        className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-gray-700"
                    />

                    {/* Real Bubble Particles */}
                    {/* Real Bubble Particles */}
                    {bubbleEvents.map((id) => (
                        <span
                            key={id}
                            className="bubble"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 0.5}s`,
                                animationDuration: `${1.5 + Math.random() * 1.5}s`, // 1.5s to 3s
                                width: `${6 + Math.random() * 8}px`,
                                height: `${6 + Math.random() * 8}px`,
                            }}
                        />
                    ))}


                    {/* Optional event count badge */}
                    {newEventCount > 1 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                            {newEventCount}
                        </span>
                    )}
                </button>
            </div>


            {/* Overlay Panel */}
            <AnimatePresence>
                {panelOpen && (
                    <motion.div
                        ref={panelRef}
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 50 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-20 right-16 w-72 max-h-[70vh] p-4 bg-white dark:bg-gray-800 shadow-xl rounded-xl overflow-y-auto z-50 flex flex-col space-y-2 custom-scrollbar"
                    >
                        {/* Panel Header */}
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <h3 className="font-bold text-lg dark:text-white">Live Quizzes Activity</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    Watch your peers answering questions in real-time
                                </p>
                            </div>

                            {/* Close button */}
                            <button
                                onClick={() => setPanelOpen(false)}
                                className="ml-2 text-gray-500 hover:text-gray-900 dark:hover:text-white font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Event cards */}
                        <AnimatePresence initial={false}>
                            {events.map((event) => {
                                const isStreakPopup = event.is_streak_popup;
                                return (
                                    <motion.div
                                        layout
                                        key={event.id}
                                        initial={{ opacity: 0, x: 50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -50 }}
                                        transition={{ duration: 0.3 }}
                                        className={`flex items-start gap-3 px-3 py-2 rounded-lg shadow-md ${isStreakPopup
                                            ? "bg-yellow-400 text-black font-semibold"
                                            : "bg-gray-100 dark:bg-gray-900 dark:text-white text-gray-900"
                                            }`}
                                    >
                                        {/* Avatar */}
                                        {event.user_avatar ? (
                                            <img
                                                src={event.user_avatar}
                                                alt={event.user_name || "User"}
                                                className="w-10 h-10 flex-shrink-0 rounded-full object-cover border border-gray-300 dark:border-gray-700"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gray-400 border border-gray-300 dark:border-gray-700" />
                                        )}

                                        {/* Text */}
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{event.user_name || "Someone"}</span>
                                            {isStreakPopup ? (
                                                <span className="text-sm">
                                                    🎉 Hit a streak of {event.streak_count} correct answers!
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                                    is answering in quizzes page {getEventIcon(event.event_type)}

                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
