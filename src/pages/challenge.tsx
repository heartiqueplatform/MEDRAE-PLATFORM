"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import { playSound, initSound } from "@/lib/soundManager";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalLoader } from "@/components/GlobalLoader";
import confetti from "canvas-confetti";
import {
    Swords,
    Trophy,
    Flame,
    Send,
    Check,
    Clock,
    Users,
    Search,
} from "lucide-react";
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
                    <div className="p-2">

                        {/* SEARCH */}
                        <div className="flex gap-2 mb-3">
                            <div className="flex items-center border rounded px-2 w-full dark:border-gray-700">
                                <Search size={16} />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search users..."
                                    className="w-full p-1 outline-none bg-transparent"
                                />
                            </div>

                            <button
                                onClick={() => setOnlyOnline(!onlyOnline)}
                                className={`px-2 rounded border ${onlyOnline ? "bg-green-200 dark:bg-green-800" : ""}`}
                            >
                                Online
                            </button>
                        </div>

                        {/* PLAYER LIST */}
                        <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar pr-1">
                            <div className="mt-auto">

                                <AnimatePresence>
                                    {/* 🔹 INVITE CARD */}
                                    {!loading && inviteCards.map((card) => (
                                        <motion.div
                                            key={card.id}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => handleInvite(card.type)}
                                            className="p-3 mb-2 rounded-xl
            bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500
            dark:from-indigo-600 dark:via-purple-600 dark:to-pink-600
            text-white flex justify-between items-center cursor-pointer
            shadow-md hover:shadow-lg transition-all duration-200"
                                        >
                                            <div className="flex items-center gap-2">
                                                {/* ICON */}
                                                <div className="w-9 h-9 rounded-full bg-white/25 backdrop-blur flex items-center justify-center">
                                                    <Send size={16} />
                                                </div>

                                                {/* TEXT */}
                                                <div>
                                                    <p className="font-medium text-sm">{card.name}</p>
                                                    <p className="text-xs opacity-90">Grow the community</p>
                                                </div>
                                            </div>

                                            {/* BADGE */}
                                            <span className="text-xs bg-white/25 backdrop-blur px-2 py-1 rounded-md">
                                                Invite a Friend
                                            </span>
                                        </motion.div>
                                    ))}

                                    {filteredPlayers.map((p: any) => (
                                        <motion.div
                                            key={p.user_id}
                                            whileTap={{ scale: 0.97 }}
                                            className="p-3 mb-2 rounded-lg bg-gray-50 dark:bg-gray-800 flex justify-between items-center"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="relative">
                                                    {p.avatar_url ? (
                                                        <img
                                                            src={p.avatar_url}
                                                            className="w-9 h-9 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-sm font-bold">
                                                            {p.name?.[0] || "U"}
                                                        </div>
                                                    )}
                                                    {p.is_online && (
                                                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></span>
                                                    )}
                                                </div>

                                                <div>
                                                    <p className="font-medium text-sm">{p.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        @{p.username || "no-username"}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => sendChallenge(p.user_id)}
                                                className="flex items-center gap-1 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg shadow-md"
                                            >
                                                <Send size={16} />
                                                <span>Send Challenge</span>
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                );
            case "incoming":
                if (incoming.length === 0) {
                    return (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            No incoming challenges. Sit tight or ask a friend to challenge you!
                        </div>
                    );
                }
                return incoming.map((c: any) => (
                    <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="p-3 mb-2 rounded-lg bg-gray-100 dark:bg-gray-800 shadow-sm flex justify-between"
                    >
                        <div className="flex flex-col">
                            <p className="font-medium flex items-center gap-2">
                                {c.from_user?.name || "Player"}

                                {/* 🔹 Unseen badge */}
                                {!seenIncomingIds.has(c.id) && (
                                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                        New
                                    </span>
                                )}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Score: {c.score_to_beat}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                playSound("tap");
                                if (navigator.vibrate) navigator.vibrate(30);
                                acceptChallenge(c);
                            }}
                            className="flex items-center gap-1 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg shadow-md transition-colors duration-150"
                        >
                            <Check size={16} />
                            <span>Accept Challenge</span>
                        </button>
                    </motion.div>
                ));

            case "sent":
                if (outgoing.length === 0) {
                    return (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            No sent challenges. Choose a friend and start a challenge!
                        </div>
                    );
                }

                return outgoing.map((c: any) => (
                    <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="p-3 mb-2 rounded-lg bg-gray-50 dark:bg-gray-800 flex justify-between items-center"
                    >
                        <p className="text-sm">
                            Waiting for {c.to_user?.name || "player"}
                        </p>

                        <button
                            onClick={() => {
                                const ok = confirm("Are you sure you want to cancel this request?");
                                if (ok) {
                                    cancelChallenge(c.id);
                                }
                            }}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                        >
                            Cancel
                        </button>
                    </motion.div>
                ));

            case "completed":
                if (completed.length === 0) {
                    return (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            No completed challenges yet. Play a challenge and see your results here!
                        </div>
                    );
                }
                return completed.map((c: any) => {
                    const won = c.winner_id === user.id;
                    return (
                        <motion.div
                            key={c.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className={`p-3 mb-2 rounded-lg border-0 shadow-sm ${won ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}
                        >
                            <p className="font-medium">{won ? "You won" : "You lost"}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Opponent: {c.score_to_beat} | You: {c.opponent_score}
                            </p>
                        </motion.div>
                    );
                });
        }
    };

    return (
        <div className="mt-2">
            {/* TABS */}
            {/* TABS */}
            <div className="flex border-b border-gray-300 dark:border-gray-700 mb-3 ">
                {["find", "incoming", "sent", "completed"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex-1 py-2 font-medium relative text-center ${activeTab === tab
                            ? "border-b-2 border-blue-500 text-blue-600"
                            : "text-gray-500 dark:text-gray-400"
                            }`}
                    >
                        <span className="relative inline-block">
                            {tab === "find" ? "Participants" : tab.charAt(0).toUpperCase() + tab.slice(1)}

                            {/* Incoming badge */}
                            {tab === "incoming" && unseenIncomingCount > 0 && (
                                <span className="absolute -top-1 -right-5 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    {unseenIncomingCount}
                                </span>
                            )}

                            {/* Sent badge (read/unread style) */}
                            {tab === "sent" && pendingSentCount > 0 && (
                                <span className="absolute -top-1 -right-6 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    {pendingSentCount}
                                </span>
                            )}

                            {/* Completed badge */}
                            {tab === "completed" && completed.length > 0 && (
                                <span className="absolute -top-1 -right-5 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    {completed.length}
                                </span>
                            )}
                        </span>
                    </button>
                ))}
            </div>

            {/* TAB CONTENT */}
            <div className="h-96">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        {loading ? (
                            [0, 1, 2, 3].map((i) => <ChallengeItemSkeleton key={i} />)
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
    const [loading, setLoading] = useState(true);
    const [showWinOverlay, setShowWinOverlay] = useState(false);
    // Track which incoming challenges the user has seen
    const [seenIncomingIds, setSeenIncomingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true); // start loader
            await fetchChallenges();
            await fetchPlayers();
            setLoading(false); // stop loader
        };

        fetchData();

        const challengeSub = supabase
            .channel("public:challenges")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "challenges" },
                () => fetchChallenges()
            )
            .subscribe();

        const profileSub = supabase
            .channel("public:profiles")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "profiles" },
                () => fetchPlayers(search)
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
        else setPlayers(data || []);
    };
    useEffect(() => {
        if (!user) return;
        const handler = setTimeout(() => fetchPlayers(search), 500); // slightly longer delay
        return () => clearTimeout(handler);
    }, [search, user]);
    // ================= INITIAL FETCH + REALTIME =================
    useEffect(() => {
        if (!user) return;

        fetchChallenges();
        fetchPlayers();

        const challengeSub = supabase
            .channel("public:challenges")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "challenges" },
                () => fetchChallenges()
            )
            .subscribe();

        const profileSub = supabase
            .channel("public:profiles")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "profiles" },
                () => fetchPlayers(search)
            )
            .subscribe();

        return () => {
            supabase.removeChannel(challengeSub);
            supabase.removeChannel(profileSub);
        };
    }, [user]);

    // ================= FILTER =================
    const filteredPlayers = players.filter((p) => {
        const term = search.trim().toLowerCase();
        if (!term) return true;
        const name = (p.name || "").toLowerCase();
        const username = (p.username || "").toLowerCase();
        return name.includes(term) || username.includes(term);
    });

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

            <div className="w-full sm:max-w-4xl sm:mx-auto p-2 sm:p-4 space-y-2 border-0">
                {/* FULL-SCREEN QUIZ */}
                {activeChallenge && (
                    <div
                        className="fixed inset-0 z-[9999] bg-white dark:bg-gray-900 flex flex-col justify-center items-center pt-32 sm:pt-0"
                        style={{ height: "100vh" }}
                    >
                        <h2 className="text-xl font-bold mb-1">
                            Answer the Challenge!
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-md mb-2">
                            {activeChallenge?.status === "self"
                                ? "Complete all 10 questions and your score will be sent as a challenge to another player. They will try to beat your score."
                                : "You are attempting to beat another player's score. Try your best to score higher and win the challenge!"}
                        </p>

                        <p className="mb-2 font-medium">Time left: {timeLeft}s</p>

                        <div className="flex-1 flex flex-col justify-between overflow-y-auto custom-scrollbar p-2">

                            {/* Question Header */}
                            {/* Question + Options + Navigation */}
                            <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar px-1">

                                {/* Question Header */}
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Question {currentQIndex + 1} / {activeChallenge.questions.length}
                                    </p>
                                    <p className="font-medium text-lg">
                                        {activeChallenge.questions[currentQIndex].question_text}
                                    </p>
                                </div>

                                {/* Options - Vertical */}
                                <div className="flex flex-col gap-2">
                                    {["A", "B", "C", "D"].map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => handleAnswer(currentQIndex, opt)}
                                            className={`p-2 border rounded-lg text-left transition-colors duration-150 ${answers[currentQIndex] === opt
                                                ? "bg-blue-500 text-white"
                                                : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                                                }`}
                                        >
                                            <span className="font-bold">{opt}:</span>{" "}
                                            {activeChallenge.questions[currentQIndex][`option_${opt.toLowerCase()}`]}
                                        </button>
                                    ))}
                                </div>

                                {/* Navigation directly below options */}
                                {/* Navigation directly below options */}
                                <div className="flex justify-center gap-3 mt-2">
                                    <button
                                        onClick={() => setCurrentQIndex((i) => Math.max(i - 1, 0))}
                                        disabled={currentQIndex === 0}
                                        className="px-6 py-2 bg-gray-300 dark:bg-gray-700 rounded disabled:opacity-50"
                                    >
                                        Previous
                                    </button>

                                    {currentQIndex < activeChallenge.questions.length - 1 ? (
                                        <button
                                            onClick={() => setCurrentQIndex((i) => Math.min(i + 1, activeChallenge.questions.length - 1))}
                                            className="px-6 py-2 bg-blue-600 text-white rounded"
                                        >
                                            Next
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                if (navigator.vibrate) navigator.vibrate(50); // vibrate
                                                playSound("tap"); // play tap sound
                                                setShowSubmitModal(true);
                                            }}
                                            className="px-6 py-2 bg-green-600 text-white rounded"
                                        >
                                            Submit
                                        </button>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                )}

                {/* HEADER */}
                <div className="text-center">
                    <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                        <Swords size={22} /> Challenges
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Compete and track performance
                    </p>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-3 gap-2 text-center">
                    {loading ? (
                        [0, 1, 2].map((i) => <StatCardSkeleton key={i} />)
                    ) : (
                        <>
                            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                                <Trophy className="mx-auto mb-1" size={18} />
                                <p className="font-bold">{wins}</p>
                                <p className="text-xs">Wins</p>
                            </div>
                            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
                                <Flame className="mx-auto mb-1" size={18} />
                                <p className="font-bold">{losses}</p>
                                <p className="text-xs">Losses</p>
                            </div>
                            <div className="p-3 rounded-xl bg-yellow-100 dark:bg-yellow-900/30">
                                <Clock className="mx-auto mb-1" size={18} />
                                <p className="font-bold">{unseenIncomingCount}</p>
                                <p className="text-xs">Pending</p>
                            </div>
                        </>
                    )}
                </div>

                {/* FIND PLAYERS */}
                <div className="p-1 rounded-xl border bg-white dark:bg-gray-900 border-0">
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
                {/* 🔹 WIN OVERLAY */}
                <AnimatePresence>
                    {showWinOverlay && (
                        <motion.div
                            className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                className="bg-white dark:bg-gray-900 rounded-2xl p-8 flex flex-col items-center justify-center shadow-2xl"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                            >
                                <Trophy size={60} className="text-yellow-500 mb-4 animate-bounce" />
                                <h1 className="text-4xl font-bold text-center text-green-600 mb-2">
                                    You Won!
                                </h1>
                                <p className="text-center text-gray-600 dark:text-gray-300">
                                    One challenge down, glory earned!
                                    <br />
                                    Get ready for the next round.
                                    <br />
                                    Challenge more nurses and prove you're the best.
                                </p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );

}
