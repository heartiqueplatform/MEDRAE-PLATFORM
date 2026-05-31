"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

import { Swords, X, Activity, Zap, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
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
            {/* --- FLOATING STATUS BUTTON --- */}
            <div className="hidden lg:block fixed bottom-8 right-6 z-50">
                <button
                    onClick={handleTogglePanel}
                    className="group relative h-12 w-12 flex items-center justify-center transition-all duration-300 active:scale-90"
                >
                    {/* Pulsing Outer Ring */}
                    <span className="absolute inset-0 rounded-2xl bg-blue-500/20 dark:bg-blue-400/10 animate-pulse" />

                    <div className="relative h-12 w-12 rounded-2xl bg-white dark:bg-zinc-950border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
                        <img
                            src="/UsersAvatar.jpg"
                            alt="Live"
                            className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all"
                        />

                        {/* Status Indicator */}
                        <div className="absolute bottom-1 right-1 h-3 w-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                    </div>

                    {/* Bubble Particles (Preserved Logic) */}
                    {bubbleEvents.map((id) => (
                        <span
                            key={id}
                            className="bubble bg-blue-500/40 dark:bg-blue-400/40"
                            style={{
                                left: `${Math.random() * 80 + 10}%`,
                                animationDuration: `${1.5 + Math.random() * 1}s`,
                                width: `${4 + Math.random() * 6}px`,
                                height: `${4 + Math.random() * 6}px`,
                            }}
                        />
                    ))}

                    {/* Compact Event Count Badge */}
                    {newEventCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center font-black shadow-lg border-2 border-white dark:border-slate-950">
                            {newEventCount > 9 ? '9+' : newEventCount}
                        </span>
                    )}
                </button>
            </div>

            {/* --- OVERLAY ACTIVITY PANEL --- */}
            <AnimatePresence>
                {panelOpen && (
                    <motion.div
                        ref={panelRef}
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        className="fixed bottom-24 right-24 w-80 max-h-[60vh] flex flex-col bg-white/95 dark:bg-gray-900 backdrop-blur-xl border-0 shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-xl overflow-hidden z-50"
                    >
                        {/* Sticky Header */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-950/50">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                    <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Live Activity</h3>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Peers Online Now</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPanelOpen(false)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>

                        {/* Activity List */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                            <AnimatePresence initial={false}>
                                {events.map((event) => {
                                    const isStreak = event.is_streak_popup;
                                    return (
                                        <motion.div
                                            layout
                                            key={event.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isStreak
                                                ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
                                                : "bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800"
                                                }`}
                                        >
                                            <div className="relative shrink-0">
                                                <img
                                                    src={event.user_avatar || "/UsersAvatar.jpg"}
                                                    alt={event.user_name}
                                                    className="w-10 h-10 rounded-xl object-cover border border-white dark:border-slate-800 shadow-sm"
                                                />
                                                {isStreak && (
                                                    <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border border-white dark:border-slate-900">
                                                        <Zap size={8} className="text-white fill-current" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                                    {event.user_name || "Peering Nurse"}
                                                </p>
                                                <p className={`text-[10px] leading-tight mt-0.5 ${isStreak ? "text-amber-700 dark:text-amber-400 font-bold" : "text-slate-500"}`}>
                                                    {isStreak
                                                        ? `Aced ${event.streak_count} questions in a row!`
                                                        : `Solving clinical quizzes...`
                                                    }
                                                </p>
                                            </div>

                                            {!isStreak && (
                                                <div className="shrink-0 text-slate-300 dark:text-slate-700">
                                                    <ChevronRight size={14} />
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>

                        {/* Footer Hint */}
                        <div className="p-3 text-center bg-slate-50 dark:bg-slate-900/80">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Sync Active</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}