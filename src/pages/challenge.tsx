"use client";
import { createPortal } from 'react-dom'; // 1. Add this import

import { useMemo } from "react";
import { useEffect, useState, useRef } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import { playSound, initSound } from "@/lib/soundManager";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalLoader } from "@/components/GlobalLoader";
import confetti from "canvas-confetti";
import {
    Inbox,

    History,
    Swords,
    Trophy,
    Flame,
    Send,
    Check,
    Clock,
    Users,
    Search,
    Zap,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
let playersMemoryCache: any[] | null = null;
let challengesMemoryCache: any[] | null = null;
let playersCacheTime = 0;
let challengesCacheTime = 0;

const STALE_TIME = 30000; // 30s
// ================= CHALLENGE TABS COMPONENT =================
function ChallengeTabs({
    incoming,
    outgoing,
    completed,
    acceptChallenge,
    user,
    loading,
    search,
    setSearch,
    onlyOnline,
    setOnlyOnline,
    filteredPlayers,
    sendChallenge,
    inviteCards,
    handleInvite,
    seenIncomingIds,        // ✅ add this
    setSeenIncomingIds,
    cancelChallenge,
    unseenIncomingCount,
    pendingSentCount,   // ✅ add this
}: any) {

    const [activeTab, setActiveTab] = useState<"find" | "incoming" | "sent" | "completed">("find");
    const renderTabContent = () => {

        switch (activeTab) {
            case "find":
                return (
                    <div className="space-y-4">
                        {/* --- SEARCH & FILTER --- */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    value={search}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSearch(value);

                                        if (!value.trim()) {
                                            setSearch("");
                                        }
                                    }}
                                    placeholder="Search peers..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-muted/30 border-none text-sm focus:ring-2 focus:ring-blue-500/50 transition-all outline-none"
                                />
                            </div>

                            <button
                                onClick={() => setOnlyOnline(!onlyOnline)}
                                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${onlyOnline
                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                    : "bg-white dark:bg-muted/30 border-slate-200 dark:border-slate-800 text-slate-500"
                                    }`}
                            >
                                <span className={`h-2 w-2 rounded-full ${onlyOnline ? "bg-white animate-pulse" : "bg-slate-300"}`} />
                                Online Only
                            </button>
                        </div>

                        {/* --- PLAYER LIST --- */}
                        <div className="space-y-3">
                            <AnimatePresence>
                                {/* 🔹 INVITE CARD (High-End CTA) */}
                                {!loading && inviteCards.map((card) => (
                                    <motion.div
                                        key={card.id}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleInvite(card.type)}
                                        className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex justify-between items-center cursor-pointer shadow-lg group"
                                    >
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none" />
                                        <div className="relative flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                                                <Send size={18} className="rotate-[-20deg]" />
                                            </div>
                                            <div>
                                                <p className="font-black text-sm uppercase tracking-tight">{card.name}</p>
                                                <p className="text-[10px] font-bold text-white/70 uppercase">Strengthen the network</p>
                                            </div>
                                        </div>
                                        <span className="relative text-[10px] font-black bg-black/20 px-3 py-1.5 rounded-lg border border-white/10 group-hover:bg-black/30 transition-colors">
                                            INVITE NOW
                                        </span>
                                    </motion.div>
                                ))}

                                {filteredPlayers.map((p: any) => (
                                    <motion.div
                                        key={p.user_id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-3 rounded-2xl bg-white dark:bg-muted/30 border-0 flex justify-between items-center hover:border-blue-500/30 transition-all shadow-sm group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner">
                                                    {p.avatar_url ? (
                                                        <img
                                                            src={p.avatar_url}
                                                            className="w-full h-full object-cover rounded-full"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-black">
                                                            {p.name?.[0]}
                                                        </div>
                                                    )}
                                                </div>
                                                {p.is_online && (
                                                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-lg border-2 border-white dark:border-slate-900 shadow-sm" />
                                                )}
                                            </div>

                                            <div className="space-y-0.5">
                                                <p className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-500 transition-colors">{p.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    @{p.username || "nurse"}
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => sendChallenge(p.user_id)}
                                            size="sm"
                                            className="h-9 px-4 rounded-xl bg-slate-900 dark:bg-blue-600 text-white font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/10"
                                        >
                                            Challenge
                                        </Button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                );

            case "incoming":
                if (incoming.length === 0) {
                    return (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-50">
                            <Inbox size={48} className="text-slate-300" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Active Invasions</p>
                        </div>
                    );
                }
                return incoming.map((c: any) => (
                    <motion.div
                        key={c.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 mb-3 rounded-2xl bg-white dark:bg-muted/30 border-2 border-slate-100 dark:border-slate-800 flex justify-between items-center group"
                    >
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <p className="font-black text-sm dark:text-white uppercase tracking-tight">{c.from_user?.name || "Player"}</p>
                                {!seenIncomingIds.has(c.id) && (
                                    <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">New Battle</span>
                                )}
                            </div>
                            <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">
                                Target Score: <span className="text-slate-900 dark:text-white ml-1">{c.score_to_beat}</span>
                            </p>
                        </div>
                        <Button
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(30);
                                acceptChallenge(c);
                            }}
                            className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase transition-all shadow-lg shadow-blue-500/20"
                        >
                            Accept
                        </Button>
                    </motion.div>
                ));

            case "sent":
                if (outgoing.length === 0) {
                    return (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-50">
                            <Send size={48} className="text-slate-300" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Quiet in the Arena</p>
                        </div>
                    );
                }
                return outgoing.map((c: any) => (
                    <motion.div
                        key={c.id}
                        className="p-4 mb-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 flex justify-between items-center"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Clock size={16} className="text-blue-500 animate-spin-slow" />
                            </div>
                            <p className="text-xs font-bold dark:text-slate-300">
                                Waiting for <span className="text-blue-500 uppercase">{c.to_user?.name}</span>
                            </p>
                        </div>
                        <button
                            onClick={() => confirm("Cancel request?") && cancelChallenge(c.id)}
                            className="text-[10px] font-black text-rose-500 uppercase hover:underline p-2"
                        >
                            Recall
                        </button>
                    </motion.div>
                ));

            case "completed":
                if (completed.length === 0) {
                    return (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-50">
                            <History size={48} className="text-slate-300" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Battle Records</p>
                        </div>
                    );
                }
                return completed.map((c: any) => {
                    const won = c.winner_id === user.id;
                    return (
                        <motion.div
                            key={c.id}
                            className={`p-4 mb-3 rounded-2xl border flex flex-col gap-2 ${won
                                ? "bg-emerald-50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20"
                                : "bg-rose-50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/20"
                                }`}
                        >
                            <div className="flex justify-between items-center">
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${won ? "text-emerald-600" : "text-rose-600"}`}>
                                    {won ? "Victory Secured" : "Defeat Incurred"}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Opponent: {c.score_to_beat}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <p className="text-sm font-bold dark:text-slate-200">Against {c.opponent_name || "Peer"}</p>
                                <p className={`text-xl font-black ${won ? "text-emerald-600" : "text-rose-600"}`}>{c.opponent_score}</p>
                            </div>
                        </motion.div>
                    );
                });
        }
    };
    return (
        <div className="mt-1">
            {/* --- PROFESSIONAL SEGMENTED TABS --- */}
            <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl mb-1 gap-1 overflow-x-auto custom-scrollbar">
                {[
                    { id: "find", label: "Participants", icon: Users },
                    { id: "incoming", label: "Incoming", icon: Inbox, badge: unseenIncomingCount, color: "bg-rose-500" },
                    { id: "sent", label: "Sent", icon: Send, badge: pendingSentCount, color: "bg-blue-500" },
                    { id: "completed", label: "History", icon: History, badge: completed.length, color: "bg-emerald-500" }
                ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(30);
                                setActiveTab(tab.id as any);
                            }}
                            className={`
                            relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap
                            ${isActive ? "text-blue-600 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}
                        `}
                        >
                            {/* Smooth Animated Slider Background */}
                            {isActive && (
                                <motion.div
                                    layoutId="activeTabBackground"
                                    className="absolute inset-0 bg-white dark:bg-blue-600 shadow-sm rounded-xl z-0"
                                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                />
                            )}

                            <div className="relative z-10 flex items-center gap-2">
                                {/* Icon (Optional but makes it look pro) */}
                                {Icon && <Icon size={14} className={isActive ? "text-blue-600 dark:text-white" : "text-slate-400"} />}

                                <span className="uppercase tracking-tight">
                                    {tab.label}
                                </span>

                                {/* Badge Pips */}
                                {tab.badge > 0 && (
                                    <span className={`
                                    flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full text-[10px] font-black text-white border-2 border-white dark:border-slate-800
                                    ${tab.color || 'bg-slate-500'}
                                `}>
                                        {tab.badge}
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* --- TAB CONTENT --- */}
            <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-20 w-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl animate-pulse border border-slate-100 dark:border-white/5" />
                                ))}
                            </div>
                        ) : (
                            renderTabContent()
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
// ================= SKELETON COMPONENTS =================
function StatCardSkeleton() {
    return (
        <div className="p-3 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse h-20" />
    );
}

function ChallengeItemSkeleton() {
    return (
        <div className="p-3 mb-2 rounded-lg bg-gray-200 dark:bg-gray-700 shadow-sm h-16 animate-pulse" />
    );
}

function PlayerCardSkeleton() {
    return (
        <div className="p-3 mb-2 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center gap-2 animate-pulse h-12" />
    );
}
export default function ChallengePage() {
    const session = useSession();
    const user = session?.user;
    // Add state for current question index
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [challenges, setChallenges] = useState<any[]>([]);
    const [players, setPlayers] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [onlyOnline, setOnlyOnline] = useState(false);
    // Add at top with useState
    const [tempQuestions, setTempQuestions] = useState<any[]>([]);
    const [pendingTargetUser, setPendingTargetUser] = useState<string | null>(null);
    // NEW: quiz challenge states
    const [activeChallenge, setActiveChallenge] = useState<any | null>(null);
    const [answers, setAnswers] = useState<string[]>([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const seenWins = useRef<Set<string>>(new Set());
    const [loading, setLoading] = useState(false); // start false
    const hasLoadedOnce = useRef(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [showWinOverlay, setShowWinOverlay] = useState(false);
    // Track which incoming challenges the user has seen
    const [seenIncomingIds, setSeenIncomingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            // Only show loader if NO cache exists
            const hasChallengesCache = !!challengesMemoryCache || !!localStorage.getItem("challenges_cache");
            const hasPlayersCache = !!playersMemoryCache || !!localStorage.getItem("players_cache");

            if (!hasChallengesCache || !hasPlayersCache) {
                setLoading(true);
            }

            await fetchChallenges();
            await fetchPlayers();

            setLoading(false);
            hasLoadedOnce.current = true;
            setIsInitialLoad(false);
        };

        fetchData();
        const challengeSub = supabase
            .channel("public:challenges")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "challenges" },
                () => {
                    fetchChallenges(); // no loading toggle
                }
            )
            .subscribe();

        const profileSub = supabase
            .channel("public:profiles")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "profiles" },
                () => {
                    fetchPlayers(search); // no loading toggle
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(challengeSub);
            supabase.removeChannel(profileSub);
        };
    }, [user]);
    // 🔊 INIT SOUND
    useEffect(() => {
        initSound();
    }, []);

    // ================= FETCH CHALLENGES =================
    const fetchChallenges = async () => {
        const { data } = await supabase
            .from("challenges")
            .select(`
                *,
                from_user:from_user_id (name, username, avatar_url),
                to_user:to_user_id (name, username, avatar_url)
            `)
            .or(`from_user_id.eq.${user?.id},to_user_id.eq.${user?.id}`)
            .order("created_at", { ascending: false });

        setChallenges(data || []);
        localStorage.setItem(
            "challenges_cache",
            JSON.stringify({
                data: data || [],
                timestamp: Date.now(),
            })
        );
    };

    // ================= FETCH PLAYERS =================
    const fetchPlayers = async (searchTerm = "") => {
        let query = supabase
            .from("profiles")
            .select("user_id, name, username, avatar_url, is_online")
            .neq("user_id", user?.id)
            .order("name", { ascending: true })
            .limit(50);

        if (searchTerm.trim()) {
            query = query.or(
                `name.ilike.%${searchTerm.trim()}%,username.ilike.%${searchTerm.trim()}%`
            );
        }

        const { data, error } = await query;

        if (error) console.error(error);
        else {
            const newData = data || [];

            setPlayers(newData);

            // memory cache
            playersMemoryCache = newData;
            playersCacheTime = Date.now();

            // localStorage backup
            localStorage.setItem(
                "players_cache",
                JSON.stringify({
                    data: newData,
                    timestamp: Date.now(),
                })
            );

        }
    };

    // ================= INITIAL FETCH + REALTIME =================

    const filteredPlayers = useMemo(() => {
        const term = search.trim().toLowerCase();

        // ✅ If search is empty → ALWAYS return full list
        if (!term) return players;

        return players.filter((p) => {
            const name = (p.name || "").toLowerCase();
            const username = (p.username || "").toLowerCase();

            return name.includes(term) || username.includes(term);
        });
    }, [players, search]);

    const cancelChallenge = async (challengeId: string) => {
        playSound("tap");

        const { error } = await supabase
            .from("challenges")
            .delete()
            .eq("id", challengeId);

        if (error) {
            console.error(error);
            alert("Failed to cancel request");
        } else {
            fetchChallenges(); // refresh UI
        }
    };
    // ================= ACTIONS =================
    const sendChallenge = async (targetUserId: string) => {
        playSound("tap");

        const canSend = !challenges.some(
            (c) =>
                (c.from_user_id === user.id && c.to_user_id === targetUserId && c.status !== "completed") ||
                (c.from_user_id === targetUserId && c.to_user_id === user.id && c.status !== "completed")
        );

        if (!canSend) {
            alert("Complete previous challenge with this player first.");
            return;
        }

        // 1. Fetch 10 random questions
        const { data: questionsData, error } = await supabase.rpc("get_random_questions", { limit_count: 10 });
        if (error || !questionsData) {
            console.error(error);
            return;
        }
        setTempQuestions(questionsData);
        setPendingTargetUser(targetUserId); // store who will get challenged
        setAnswers(Array(questionsData.length).fill(""));
        setActiveChallenge({
            from_user_id: user.id,
            to_user_id: targetUserId,
            questions: questionsData,
            status: "self", // mark as self-quiz
            score_to_beat: 0,
        });
        setTimeout(() => {
            const el = document.documentElement;
            if (el.requestFullscreen) {
                el.requestFullscreen().catch(() => { });
            }
        }, 100);
        setTimeLeft(300); // 5 minutes

    };
    // 🔹 ADD THIS BELOW sendChallenge()
    const handleInvite = (type: string) => {
        playSound("tap");

        const message = `Hey 👋

Join me on Medrae 🚀

Compete in challenges:
https://medrae.vercel.app/challenge

Sign up here:
https://medrae.vercel.app`;

        if (type === "whatsapp") {
            const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
            window.open(url, "_blank");
        }

        if (type === "link") {
            navigator.clipboard.writeText("https://medrae.vercel.app");
            alert("Invite link copied!");
        }
    };
    const acceptChallenge = async (challenge: any) => {
        playSound("start");
        setSeenIncomingIds((prev) => new Set(prev).add(challenge.id));
        if (!challenge.question_ids || challenge.question_ids.length === 0) return;

        const { data: questionsData, error } = await supabase
            .from("simulation_questions")
            .select("*")
            .in("id", challenge.question_ids);

        if (error || !questionsData) {
            console.error(error);
            return;
        }

        setAnswers(Array(questionsData.length).fill(""));
        setActiveChallenge({
            ...challenge,
            questions: questionsData,
            status: "opponent",
        });
        setTimeout(() => {
            const el = document.documentElement;
            if (el.requestFullscreen) {
                el.requestFullscreen().catch(() => { });
            }
        }, 100);

        setTimeLeft(300); // 5 minutes
    };
    const handleAnswer = (idx: number, opt: string) => {
        if (navigator.vibrate) navigator.vibrate(50);

        setAnswers((prev) => {
            const copy = [...prev];
            copy[idx] = opt;
            return copy;
        });

        // Auto-advance
        setCurrentQIndex((i) => Math.min(i + 1, activeChallenge.questions.length - 1));
    };
    const submitChallenge = async () => {
        if (!activeChallenge) return;

        const score = activeChallenge.questions.reduce((acc: number, q: any, idx: number) => {
            return acc + (answers[idx] === q.correct_answer ? 1 : 0);
        }, 0);

        if (activeChallenge.status === "self") {
            const { error } = await supabase.from("challenges").insert({
                from_user_id: user?.id,
                to_user_id: pendingTargetUser,
                question_ids: tempQuestions.map((q) => q.id),
                score_to_beat: score,
                status: "pending",
            });

            if (error) console.error(error);
            else {
                playSound("notification");
                fetchChallenges();
            }
        } else {
            await supabase
                .from("challenges")
                .update({
                    opponent_score: score,
                    status: "completed",
                    winner_id: score > (activeChallenge.score_to_beat || 0)
                        ? user?.id
                        : activeChallenge.from_user_id,
                    completed_at: new Date(),
                })
                .eq("id", activeChallenge.id);
        }

        setActiveChallenge(null);
        setTempQuestions([]);
        setPendingTargetUser(null);
        setAnswers([]); // <- added
        fetchChallenges();
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }
    };



    // Timer for auto-submit
    // Single timer with auto-submit on page close
    useEffect(() => {
        if (!activeChallenge) return;

        const timer = setInterval(() => {
            setTimeLeft((t) => {
                if (t <= 1) {
                    submitChallenge();
                    return 0;
                }
                return t - 1;
            });
        }, 1000);

        const handleUnload = (e: BeforeUnloadEvent) => {
            submitChallenge();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handleUnload);

        return () => {
            clearInterval(timer);
            window.removeEventListener("beforeunload", handleUnload);
        };
    }, [activeChallenge]);
    useEffect(() => {
        if (!activeChallenge) return;

        // Push a dummy state to trap back button
        history.pushState(null, "", location.href);

        // ===== FULLSCREEN EXIT (Laptop) =====
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && activeChallenge) {
                const stay = confirm("Fullscreen is required. Return to fullscreen?");
                if (stay) {
                    document.documentElement.requestFullscreen().catch(() => { });
                } else {
                    submitChallenge();
                }
            }
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);

        // ===== BACK BUTTON / NAVIGATION (Phone) =====
        const handlePopState = () => {
            if (!activeChallenge) return;

            const leave = confirm(
                "You are trying to leave the challenge. Your answers will be submitted. Proceed?"
            );

            if (leave) {
                submitChallenge();
                // allow back navigation naturally
            } else {
                // Cancel back: push state again to stay on page
                history.pushState(null, "", location.href);
            }
        };
        window.addEventListener("popstate", handlePopState);

        // ===== PAGE CLOSE / REFRESH =====
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!activeChallenge) return;
            e.preventDefault();
            e.returnValue =
                "You have an active challenge. Your answers will be submitted if you leave.";
            submitChallenge();
        };
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            window.removeEventListener("popstate", handlePopState);
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [activeChallenge]);
    useEffect(() => {
        // When challenge ends → exit fullscreen
        if (!activeChallenge) {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }
        }
    }, [activeChallenge]);
    // ================= STATS =================
    const wins = challenges.filter((c) => c.winner_id === user?.id).length;
    const losses = challenges.filter(
        (c) => c.status === "completed" && c.winner_id !== user?.id
    ).length;
    const incoming = challenges.filter(
        (c) => c.to_user_id === user?.id && c.status === "pending"
    );
    // Only count incoming challenges the user has not yet seen
    const unseenIncomingCount = incoming.filter(c => !seenIncomingIds.has(c.id)).length;


    const outgoing = challenges.filter(
        (c) => c.from_user_id === user?.id && c.status === "pending"
    );

    // Count pending sent challenges
    const pendingSentCount = outgoing.length;
    const completed = challenges.filter((c) => c.status === "completed");

    // 🎉 CONFETTI ONLY ON NEW WINS
    useEffect(() => {
        completed.forEach((c) => {
            if (c.winner_id === user?.id && !seenWins.current.has(c.id)) {
                seenWins.current.add(c.id);

                confetti({ particleCount: 100, spread: 100, origin: { y: 0.6 } });
                playSound("trivia-finish");

                setShowWinOverlay(true);

                setTimeout(() => {
                    setShowWinOverlay(false);
                }, 5000);
            }
        });
    }, [completed, user]);

    if (!user)
        return <GlobalLoader />; // keep for non-authenticated users

    // If user exists, we render the page immediately with skeletons where data is loading
    // 🔹 ADD THIS BEFORE return()
    const inviteCards = [
        {
            id: "invite-whatsapp",
            name: "Invite via WhatsApp",
            type: "whatsapp",
        },
    ];
    // ================= UI =================
    return (
        <>
            {/* --- FULL-SCREEN BATTLE INTERFACE --- */}
            {activeChallenge && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden"
                >
                    {/* 1. TOP STATUS BAR (HUD) */}
                    <div className="bg-white dark:bg-muted/30 border-b border-slate-200 dark:border-white/10 p-4 shadow-sm">
                        <div className="max-w-3xl mx-auto flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Swords className="text-blue-600 dark:text-blue-400 w-5 h-5" />
                                </div>
                                <div className="hidden xs:block">
                                    <h2 className="text-sm font-black dark:text-white uppercase tracking-tight leading-none">
                                        Medrae Arena
                                    </h2>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {activeChallenge?.status === "self" ? "Setting Target" : "Beat the Peer"}
                                    </span>
                                </div>
                            </div>

                            {/* Visual Timer */}
                            <div className="flex flex-col items-center">
                                <div className={`text-xl font-black tabular-nums transition-colors ${timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-slate-900 dark:text-white'}`}>
                                    {timeLeft}s
                                </div>
                                <div className="h-1 w-12 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                                    <motion.div
                                        className={`h-full ${timeLeft < 10 ? 'bg-rose-500' : 'bg-blue-500'}`}
                                        initial={{ width: "100%" }}
                                        animate={{ width: `${(timeLeft / 60) * 100}%` }} // Adjust 60 to your max time
                                    />
                                </div>
                            </div>

                            {/* Question Progress */}
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</p>
                                <p className="text-sm font-black dark:text-white">
                                    {currentQIndex + 1} <span className="text-slate-400">/ {activeChallenge.questions.length}</span>
                                </p>
                            </div>
                        </div>

                        {/* Global Progress Line */}
                        <div className="absolute bottom-0 left-0 h-[2px] bg-blue-500 transition-all duration-300"
                            style={{ width: `${((currentQIndex + 1) / activeChallenge.questions.length) * 100}%` }}
                        />
                    </div>

                    {/* 2. QUESTION SCROLL AREA */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950">
                        <div className="max-w-2xl mx-auto px-6 py-8 md:py-16 space-y-6">

                            {/* Question Card */}
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                                    <Zap size={12} className="text-blue-600 fill-current" />
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Clinical Scenario</span>
                                </div>
                                <h3 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                    {activeChallenge.questions[currentQIndex].question_text}
                                </h3>
                            </div>

                            {/* Options List */}
                            <div className="grid grid-cols-1 gap-3">
                                {["A", "B", "C", "D"].map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            if (navigator.vibrate) navigator.vibrate(30);
                                            handleAnswer(currentQIndex, opt);
                                        }}
                                        className={`group relative p-4 md:p-5 rounded-2xl text-left transition-all duration-200 border-2 flex items-center gap-4
                                ${answers[currentQIndex] === opt
                                                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]"
                                                : "bg-white dark:bg-muted/30 border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:text-slate-300"
                                            }`}
                                    >
                                        <span className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center font-black text-sm transition-colors
                                ${answers[currentQIndex] === opt ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}
                            `}>
                                            {opt}
                                        </span>
                                        <span className="font-semibold text-sm md:text-base leading-snug">
                                            {activeChallenge.questions[currentQIndex][`option_${opt.toLowerCase()}`]}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Desktop Help Hint */}
                            <p className="hidden md:block text-center text-xs text-slate-400 font-medium">
                                Click an option to select your answer. Use the buttons below to navigate.
                            </p>
                        </div>
                    </div>

                    {/* 3. NAVIGATION FOOTER (STAY FIXED) */}
                    <div className="bg-white dark:bg-muted/30 border-t border-slate-200 dark:border-white/10 p-4 pb-8 md:pb-6">
                        <div className="max-w-2xl mx-auto flex items-center gap-4">
                            <Button
                                variant="ghost"
                                onClick={() => setCurrentQIndex((i) => Math.max(i - 1, 0))}
                                disabled={currentQIndex === 0}
                                className="flex-1 h-12 rounded-xl font-bold dark:text-white"
                            >
                                <ChevronLeft className="mr-2 w-4 h-4" /> Previous
                            </Button>

                            {currentQIndex < activeChallenge.questions.length - 1 ? (
                                <Button
                                    onClick={() => setCurrentQIndex((i) => Math.min(i + 1, activeChallenge.questions.length - 1))}
                                    className="flex-1 h-12 rounded-xl bg-slate-900 dark:bg-blue-600 text-white font-bold"
                                >
                                    Next <ChevronRight className="ml-2 w-4 h-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => {
                                        if (navigator.vibrate) navigator.vibrate(50);
                                        playSound("tap");
                                        setShowSubmitModal(true);
                                    }}
                                    className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/20"
                                >
                                    Submit Battle
                                </Button>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* --- HEADER --- */}
            <div className="flex flex-col items-center text-center mb-3">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <Swords size={24} />
                    </div>

                    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                        Arena Challenges
                    </h1>
                </div>

                <p className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
                    Compete • Track • Dominate
                </p>
            </div>
            {/* --- STATS DASHBOARD --- */}
            <div className="grid grid-cols-3 gap-3 text-center max-w-2xl mx-auto mb-3">
                {loading ? (
                    [0, 1, 2].map((i) => <StatCardSkeleton key={i} />)
                ) : (
                    <>
                        {/* Wins Card */}
                        <div className="relative overflow-hidden p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                            <Trophy className="mx-auto mb-2 text-emerald-600 dark:text-emerald-400" size={20} />
                            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 leading-none">
                                {wins}
                            </p>
                            <p className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest mt-2">
                                Wins
                            </p>
                        </div>

                        {/* Losses Card */}
                        <div className="relative overflow-hidden p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
                            <Flame className="mx-auto mb-2 text-rose-600 dark:text-rose-400" size={20} />
                            <p className="text-2xl font-black text-rose-700 dark:text-rose-400 leading-none">
                                {losses}
                            </p>
                            <p className="text-[10px] font-bold text-rose-600/60 uppercase tracking-widest mt-2">
                                Losses
                            </p>
                        </div>

                        {/* Pending Card */}
                        <div className="relative overflow-hidden p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
                            <Clock className="mx-auto mb-2 text-amber-600 dark:text-amber-400" size={20} />
                            <p className="text-2xl font-black text-amber-700 dark:text-amber-400 leading-none">
                                {unseenIncomingCount}
                            </p>
                            <p className="text-[10px] font-bold text-amber-600/60 uppercase tracking-widest mt-2">
                                Pending
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* FIND PLAYERS */}
            <div className="p-0 rounded-xl max-w-2xl mx-auto border bg-white dark:bg-gray-900 border-0">
                <ChallengeTabs
                    incoming={incoming}
                    outgoing={outgoing}
                    completed={completed}
                    acceptChallenge={acceptChallenge}
                    user={user}
                    loading={loading}

                    // NEW PROPS
                    search={search}
                    setSearch={setSearch}
                    onlyOnline={onlyOnline}
                    setOnlyOnline={setOnlyOnline}
                    filteredPlayers={filteredPlayers}
                    sendChallenge={sendChallenge}
                    inviteCards={inviteCards}
                    handleInvite={handleInvite}
                    seenIncomingIds={seenIncomingIds}
                    setSeenIncomingIds={setSeenIncomingIds}
                    unseenIncomingCount={unseenIncomingCount}
                    pendingSentCount={pendingSentCount}
                    cancelChallenge={cancelChallenge}
                />
            </div>

            <AnimatePresence>
                {showSubmitModal && (
                    <motion.div
                        className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10000]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white dark:bg-gray-900 rounded-lg p-6 w-11/12 max-w-md shadow-lg flex flex-col gap-4"
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                        >
                            <h3 className="text-lg font-bold text-center">Submit Challenge?</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                                Once submitted, you won't be able to change your answers.
                            </p>
                            <div className="flex justify-center gap-4 mt-4">
                                <button
                                    onClick={() => setShowSubmitModal(false)}
                                    className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (navigator.vibrate) navigator.vibrate(50); // vibrate
                                        playSound("tap"); // play tap sound
                                        submitChallenge();
                                        setShowSubmitModal(false);
                                    }}
                                    className="px-4 py-2 rounded bg-green-600 text-white"
                                >
                                    Submit
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* --- 🏆 CINEMATIC WIN OVERLAY --- */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showWinOverlay && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6"
                        >
                            {/* Animated Background Glow Orbs */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/20 rounded-full blur-[100px] animate-pulse" />
                            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-[80px]" />

                            <motion.div
                                initial={{ scale: 0.8, y: 40, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.8, y: 40, opacity: 0 }}
                                transition={{ type: "spring", damping: 15 }}
                                className="relative bg-white dark:bg-muted/30 border-0 rounded-[3rem] p-10 md:p-16 flex flex-col items-center justify-center shadow-[0_32px_128px_-12px_rgba(0,0,0,0.5)] w-full max-w-lg text-center overflow-hidden"
                            >
                                {/* Sparkle Decorative Element */}
                                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

                                {/* Trophy Section */}
                                <div className="relative mb-8">
                                    <div className="absolute inset-0 bg-amber-400/30 blur-2xl rounded-full" />
                                    <motion.div
                                        animate={{ y: [0, -15, 0] }}
                                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                    >
                                        <Trophy size={80} className="relative text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                                    </motion.div>
                                </div>

                                {/* Text Content */}
                                <div className="space-y-4 mb-10">
                                    <div>
                                        <p className="text-amber-500 text-xs font-black uppercase tracking-[0.4em] mb-2">
                                            Arena Champion
                                        </p>
                                        <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">
                                            Victory!
                                        </h1>
                                    </div>

                                    <div className="h-px w-12 bg-slate-200 dark:bg-slate-700 mx-auto" />

                                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
                                        Clinical dominance established. You’ve out-performed your peer and earned your place at the top.
                                    </p>
                                </div>

                                {/* Primary Action Button */}
                                <Button
                                    size="lg"
                                    onClick={() => {
                                        if (navigator.vibrate) navigator.vibrate(50);
                                        setShowWinOverlay(false);
                                    }}
                                    className="
                        h-14 px-12 rounded-2xl bg-slate-900 dark:bg-white
                        text-white dark:text-slate-900 font-black uppercase tracking-widest
                        hover:scale-105 active:scale-95 transition-all shadow-xl
                    "
                                >
                                    Continue
                                </Button>

                                {/* Subtle Branding */}
                                <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                                    Medrae Challenge Arena
                                </p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body // 2. Teleport this to the document body
            )}
        </>
    );

}
