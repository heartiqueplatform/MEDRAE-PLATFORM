// src/pages/challenge/useChallengeData.ts

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { playSound, initSound } from "@/lib/soundManager";
import { useFollowingList } from "@/hooks/useFollowingList";
import { burstConfetti, LAST_BATTLE_KEY, LAST_BATTLE_SHOWN_KEY, playTimerBeep } from "./confetti";
import {
    PLAYERS_CACHE_KEY,
    CHALLENGES_CACHE_KEY,
    loadCache,
    saveCache,
    readSchoolSlug,
} from "./cache";

const TIMER_TOTAL = 300;

interface UseChallengeDataArgs {
    user: any;
}

export function useChallengeData({ user }: UseChallengeDataArgs) {
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [challenges, setChallenges] = useState<any[]>(() => {
        if (typeof window !== "undefined") return loadCache(CHALLENGES_CACHE_KEY) || [];
        return [];
    });
    const [players, setPlayers] = useState<any[]>(() => {
        if (typeof window !== "undefined") {
            const cached = loadCache(PLAYERS_CACHE_KEY);
            if (cached) return cached;
        }
        return [];
    });
    const [search, setSearch] = useState("");
    const [onlyOnline, setOnlyOnline] = useState(false);
    const [tempQuestions, setTempQuestions] = useState<any[]>([]);
    const [pendingTargetUser, setPendingTargetUser] = useState<string | null>(null);
    const [activeChallenge, setActiveChallenge] = useState<any | null>(null);
    const [answers, setAnswers] = useState<string[]>([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showSubmitModal, setShowSubmitModal] = useState(false);

    const [loading, setLoading] = useState(() => {
        if (typeof window === "undefined") return false;
        const cachedPlayers = loadCache(PLAYERS_CACHE_KEY);
        const cachedChallenges = loadCache(CHALLENGES_CACHE_KEY);
        return !(cachedPlayers?.length > 0 || cachedChallenges?.length > 0);
    });
    const [isInitialLoad, setIsInitialLoad] = useState(() => {
        if (typeof window === "undefined") return true;
        const cachedPlayers = loadCache(PLAYERS_CACHE_KEY);
        const cachedChallenges = loadCache(CHALLENGES_CACHE_KEY);
        return !(cachedPlayers?.length > 0 || cachedChallenges?.length > 0);
    });
    const [showWinOverlay, setShowWinOverlay] = useState(false);
    const [showLossOverlay, setShowLossOverlay] = useState(false);
    const [seenIncomingIds, setSeenIncomingIds] = useState<Set<string>>(new Set());
    const [pinnedUsers, setPinnedUsers] = useState<any[]>(() => {
        const cached = loadCache(PLAYERS_CACHE_KEY);
        if (cached) return cached.filter((p: any) => p.is_pinned);
        return [];
    });
    const [isUpdating, setIsUpdating] = useState(false);
    const [timerWarningPlayed, setTimerWarningPlayed] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const duelTarget = searchParams.get("duel");

    const [initialTab, setInitialTab] = useState<
        "find" | "pinned" | "incoming" | "sent" | "completed"
    >("find");

    useEffect(() => {
        const hash = (window.location.hash || "").replace("#", "").trim();
        if (["find", "pinned", "incoming", "sent", "completed"].includes(hash)) {
            setInitialTab(hash as any);
        }
    }, []);

    const processingCompletedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval>>();
    const beepIntervalRef = useRef<ReturnType<typeof setInterval>>();
    const duelHandledRef = useRef(false);
    const submitGuardRef = useRef(false);
    const sendingRef = useRef(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const { isFollowing } = useFollowingList();

    useEffect(() => {
        const cached = loadCache(PLAYERS_CACHE_KEY);
        if (cached) {
            const pinned = cached.filter((u: any) => u.is_pinned);
            setPinnedUsers(pinned);
        }
    }, []);

    const togglePin = useCallback((userId: string) => {
        playSound("ui-tap");
        setPlayers((prevPlayers) => {
            const updatedPlayers = prevPlayers.map((player) =>
                player.user_id === userId
                    ? {
                        ...player,
                        is_pinned: !player.is_pinned,
                        pinned_at: !player.is_pinned ? Date.now() : undefined,
                    }
                    : player
            );
            const updatedCache = updatedPlayers.map((p) => ({
                user_id: p.user_id,
                name: p.name,
                username: p.username,
                avatar_url: p.avatar_url,
                is_online: p.is_online,
                is_pinned: p.is_pinned,
                pinned_at: p.pinned_at,
            }));
            saveCache(PLAYERS_CACHE_KEY, updatedCache);
            setPinnedUsers(updatedPlayers.filter((p) => p.is_pinned));
            return updatedPlayers;
        });
    }, []);

    useEffect(() => {
        if (showWinOverlay || showLossOverlay || activeChallenge) {
            document.body.style.overflow = "hidden";
            document.body.style.position = "fixed";
            document.body.style.width = "100%";
        } else {
            document.body.style.overflow = "";
            document.body.style.position = "";
            document.body.style.width = "";
        }
    }, [showWinOverlay, showLossOverlay, activeChallenge]);

    const fetchChallenges = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await supabase
                .from("challenges")
                .select(`*, from_user:from_user_id (name, username, avatar_url), to_user:to_user_id (name, username, avatar_url)`)
                .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
                .order("completed_at", { ascending: false })
                .limit(100);
            if (data) {
                setChallenges(data || []);
                saveCache(CHALLENGES_CACHE_KEY, data || []);
            }
        } catch (err) {
            console.error("Error fetching challenges:", err);
        }
    }, [user]);

    const fetchPlayers = useCallback(async () => {
        if (!user) return;
        try {
            let mySchoolSlug = readSchoolSlug();
            if (!mySchoolSlug) {
                const { data: me } = await supabase
                    .from("profiles")
                    .select("institution")
                    .eq("user_id", user.id)
                    .single();
                if (me?.institution && me.institution !== "other") {
                    mySchoolSlug = me.institution;
                    try {
                        localStorage.setItem(
                            "school_wars_current_institution_v1",
                            JSON.stringify({ slug: mySchoolSlug, ts: Date.now() })
                        );
                    } catch { /* ignore */ }
                }
            }

            const { data, error } = await supabase
                .from("profiles")
                .select("user_id, name, username, avatar_url, is_online, institution")
                .neq("user_id", user.id)
                .order("name", { ascending: true })
                .limit(200);

            if (error || !data) return;

            const existingCache = loadCache(PLAYERS_CACHE_KEY);
            const pinMap = new Map<string, { is_pinned: boolean; pinned_at?: number }>();
            if (existingCache) {
                existingCache.forEach((u: any) => {
                    if (u.is_pinned) {
                        pinMap.set(u.user_id, { is_pinned: true, pinned_at: u.pinned_at });
                    }
                });
            }

            const mergedData = data.map((player: any) => ({
                ...player,
                is_pinned: pinMap.has(player.user_id),
                pinned_at: pinMap.get(player.user_id)?.pinned_at,
                is_same_school: !!mySchoolSlug && player.institution === mySchoolSlug,
            }));

            const cacheData = mergedData.map((p: any) => ({
                user_id: p.user_id,
                name: p.name,
                username: p.username,
                avatar_url: p.avatar_url,
                is_online: p.is_online,
                institution: p.institution,
                is_pinned: p.is_pinned,
                pinned_at: p.pinned_at,
                is_same_school: p.is_same_school,
            }));

            saveCache(PLAYERS_CACHE_KEY, cacheData);
            setPlayers(mergedData);
            setPinnedUsers(mergedData.filter((p: any) => p.is_pinned));
        } catch (err) {
            console.error("Error fetching players:", err);
        }
    }, [user]);

    const handleManualUpdate = useCallback(async () => {
        if (isUpdating) return;
        setIsUpdating(true);
        playSound("ui-tap");
        try {
            await Promise.all([fetchChallenges(), fetchPlayers()]);
            if (navigator.vibrate) navigator.vibrate(50);
        } catch (err) {
            console.error("Error updating data:", err);
        } finally {
            setIsUpdating(false);
        }
    }, [fetchChallenges, fetchPlayers, isUpdating]);

    useEffect(() => {
        if (!user) return;
        const cachedPlayers = loadCache(PLAYERS_CACHE_KEY);
        const cachedChallenges = loadCache(CHALLENGES_CACHE_KEY);
        const hasCache = (cachedPlayers?.length ?? 0) > 0 || (cachedChallenges?.length ?? 0) > 0;

        if (cachedPlayers?.length > 0) {
            setPlayers(cachedPlayers);
            setPinnedUsers(cachedPlayers.filter((p: any) => p.is_pinned));
        }
        if (cachedChallenges?.length > 0) setChallenges(cachedChallenges);

        if (hasCache) {
            setLoading(false);
            setIsInitialLoad(false);
        }

        (async () => {
            try {
                await Promise.all([fetchPlayers(), fetchChallenges()]);
            } finally {
                setLoading(false);
                setIsInitialLoad(false);
            }
        })();
    }, [user, fetchPlayers, fetchChallenges]);

    useEffect(() => {
        let debounce: ReturnType<typeof setTimeout> | null = null;
        const handleAutoRefresh = () => {
            if (document.visibilityState !== "visible" || !user) return;
            if (debounce) clearTimeout(debounce);
            debounce = setTimeout(() => {
                fetchChallenges();
                fetchPlayers();
            }, 400);
        };
        document.addEventListener("visibilitychange", handleAutoRefresh);
        window.addEventListener("focus", handleAutoRefresh);
        return () => {
            document.removeEventListener("visibilitychange", handleAutoRefresh);
            window.removeEventListener("focus", handleAutoRefresh);
            if (debounce) clearTimeout(debounce);
        };
    }, [user, fetchChallenges, fetchPlayers]);

    useEffect(() => {
        initSound();
    }, []);

    const sendChallenge = useCallback(async (targetUserId: string) => {
        if (sendingRef.current) return;
        sendingRef.current = true;
        try {
            playSound("ui-tap");
            const canSend = !challenges.some(
                (c) =>
                    (c.from_user_id === user?.id && c.to_user_id === targetUserId && c.status !== "completed") ||
                    (c.from_user_id === targetUserId && c.to_user_id === user?.id && c.status !== "completed")
            );
            if (!canSend) {
                alert("Complete previous challenge with this player first.");
                return;
            }

            let questionsData: any[] | null = null;
            try {
                const prefetched = sessionStorage.getItem(`prefetched_questions_${targetUserId}`);
                if (prefetched) {
                    questionsData = JSON.parse(prefetched);
                    sessionStorage.removeItem(`prefetched_questions_${targetUserId}`);
                }
            } catch { /* ignore */ }

            if (!questionsData || questionsData.length === 0) {
                const { data, error } = await supabase.rpc("get_random_questions", { limit_count: 10 });
                if (error || !data) return;
                questionsData = data;
            }

            setTempQuestions(questionsData);
            setPendingTargetUser(targetUserId);
            setAnswers(Array(questionsData.length).fill(""));
            setCurrentQIndex(0);
            setActiveChallenge({
                from_user_id: user?.id,
                to_user_id: targetUserId,
                questions: questionsData,
                status: "self",
                score_to_beat: 0,
            });

            setTimeout(() => {
                if (document.documentElement.requestFullscreen)
                    document.documentElement.requestFullscreen().catch(() => { });
            }, 100);

            setTimeLeft(TIMER_TOTAL);
            setTimerWarningPlayed(false);
        } finally {
            setTimeout(() => { sendingRef.current = false; }, 1500);
        }
    }, [challenges, user?.id]);

    const acceptChallenge = useCallback(async (challenge: any) => {
        playSound("start");
        setSeenIncomingIds((prev) => new Set(prev).add(challenge.id));
        if (!challenge.question_ids || challenge.question_ids.length === 0) return;

        const { data: questionsData } = await supabase
            .from("simulation_questions")
            .select("*")
            .in("id", challenge.question_ids);
        if (!questionsData) return;

        setAnswers(Array(questionsData.length).fill(""));
        setCurrentQIndex(0);
        setActiveChallenge({ ...challenge, questions: questionsData, status: "opponent" });

        setTimeout(() => {
            if (document.documentElement.requestFullscreen)
                document.documentElement.requestFullscreen().catch(() => { });
        }, 100);
        setTimeLeft(TIMER_TOTAL);
        setTimerWarningPlayed(false);
    }, []);

    const cancelChallenge = useCallback(async (challengeId: string) => {
        playSound("ui-tap");
        const { error } = await supabase.from("challenges").delete().eq("id", challengeId);
        if (error) console.error(error);
        else await fetchChallenges();
    }, [fetchChallenges]);

    useEffect(() => {
        if (duelTarget) duelHandledRef.current = false;
    }, [duelTarget]);

    useEffect(() => {
        if (!duelTarget) return;
        if (activeChallenge) return;
        if (!players.length) return;
        if (duelHandledRef.current) return;

        const opponent = players.find((p: any) => p.user_id === duelTarget);
        if (!opponent) return;

        duelHandledRef.current = true;
        setSearchParams({}, { replace: true });

        const incomingChallenge = challenges.find(
            (c: any) => c.status === "pending" && c.from_user_id === duelTarget && c.to_user_id === user?.id
        );
        if (incomingChallenge) return void acceptChallenge(incomingChallenge);

        const outgoingChallenge = challenges.find(
            (c: any) => c.status === "pending" && c.from_user_id === user?.id && c.to_user_id === duelTarget
        );
        if (outgoingChallenge) return;

        sendChallenge(duelTarget);
    }, [
        duelTarget, players, activeChallenge, challenges, user?.id,
        sendChallenge, acceptChallenge, setSearchParams,
    ]);

    const filteredPlayers = useMemo(() => {
        let filtered = [...players];
        const term = search.trim().toLowerCase();
        if (term) {
            filtered = filtered.filter((p) => {
                const name = (p.name || "").toLowerCase();
                const username = (p.username || "").toLowerCase();
                return name.includes(term) || username.includes(term);
            });
        }
        if (onlyOnline) filtered = filtered.filter((p) => p.is_online);
        return filtered.sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            if (a.is_same_school && !b.is_same_school) return -1;
            if (!a.is_same_school && b.is_same_school) return 1;
            const aFollow = isFollowing(a.user_id);
            const bFollow = isFollowing(b.user_id);
            if (aFollow && !bFollow) return -1;
            if (!aFollow && bFollow) return 1;
            return (a.name || "").localeCompare(b.name || "");
        });
    }, [players, search, onlyOnline, isFollowing]);

    const handleInvite = (type: string) => {
        playSound("ui-tap");
        const message = `Hey 👋\n\nJoin me on Medrae 🚀\n\nCompete in challenges:\nhttps://medrae.vercel.app/challenge\n\nSign up here:\nhttps://medrae.vercel.app`;
        if (type === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
        if (type === "link") {
            navigator.clipboard.writeText("https://medrae.vercel.app");
            alert("Invite link copied!");
        }
    };

    const handleAnswer = useCallback((idx: number, opt: string) => {
        if (navigator.vibrate) navigator.vibrate(30);
        playSound("ui-tap");
        setAnswers((prev) => {
            const copy = [...prev];
            copy[idx] = opt;
            return copy;
        });
        if (idx < (activeChallenge?.questions?.length ?? 0) - 1) {
            setTimeout(
                () => setCurrentQIndex((i) => Math.min(i + 1, activeChallenge.questions.length - 1)),
                150
            );
        }
    }, [activeChallenge]);

    const submitChallenge = useCallback(async () => {
        if (!activeChallenge) return;
        if (submitGuardRef.current) return;
        submitGuardRef.current = true;

        try {
            const score = activeChallenge.questions.reduce(
                (acc: number, q: any, idx: number) => acc + (answers[idx] === q.correct_answer ? 1 : 0),
                0
            );

            if (activeChallenge.status === "self") {
                const { error } = await supabase.from("challenges").insert({
                    from_user_id: user?.id,
                    to_user_id: pendingTargetUser,
                    question_ids: tempQuestions.map((q) => q.id),
                    score_to_beat: score,
                    status: "pending",
                });
                if (!error) {
                    playSound("notification");
                    await fetchChallenges();
                }
            } else {
                await supabase
                    .from("challenges")
                    .update({
                        opponent_score: score,
                        status: "completed",
                        winner_id:
                            score > (activeChallenge.score_to_beat || 0)
                                ? user?.id
                                : activeChallenge.from_user_id,
                        completed_at: new Date(),
                    })
                    .eq("id", activeChallenge.id);
                await fetchChallenges();
            }
        } finally {
            setActiveChallenge(null);
            setTempQuestions([]);
            setPendingTargetUser(null);
            setAnswers([]);
            setCurrentQIndex(0);
            setTimerWarningPlayed(false);
            if (beepIntervalRef.current) {
                clearInterval(beepIntervalRef.current);
                beepIntervalRef.current = undefined;
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = undefined;
            }
            if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
            setTimeout(() => { submitGuardRef.current = false; }, 1000);
        }
    }, [activeChallenge, answers, user, pendingTargetUser, tempQuestions, fetchChallenges]);

    useEffect(() => {
        if (!activeChallenge) {
            if (timerRef.current) clearInterval(timerRef.current);
            if (beepIntervalRef.current) {
                clearInterval(beepIntervalRef.current);
                beepIntervalRef.current = undefined;
            }
            return;
        }
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft((t) => {
                if (t <= 1) {
                    submitChallenge();
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (beepIntervalRef.current) {
                clearInterval(beepIntervalRef.current);
                beepIntervalRef.current = undefined;
            }
        };
    }, [activeChallenge, submitChallenge]);

    useEffect(() => {
        if (activeChallenge && timeLeft <= 10 && timeLeft > 0) {
            if (!timerWarningPlayed) {
                setTimerWarningPlayed(true);
                playTimerBeep();
            }
        } else if (timeLeft > 10) {
            setTimerWarningPlayed(false);
        }
    }, [timeLeft, activeChallenge, timerWarningPlayed]);

    useEffect(() => {
        if (beepIntervalRef.current) {
            clearInterval(beepIntervalRef.current);
            beepIntervalRef.current = undefined;
        }
        if (activeChallenge && timeLeft <= 5 && timeLeft > 0) {
            beepIntervalRef.current = setInterval(playTimerBeep, 800);
        }
        return () => {
            if (beepIntervalRef.current) {
                clearInterval(beepIntervalRef.current);
                beepIntervalRef.current = undefined;
            }
        };
    }, [timeLeft, activeChallenge]);

    useEffect(() => {
        if (!activeChallenge) {
            if (document.fullscreenElement) document.exitFullscreen();
            return;
        }
        history.pushState(null, "", location.href);
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && activeChallenge) submitChallenge();
        };
        const handlePopState = () => {
            if (activeChallenge && confirm("Leave challenge? Your answers will be submitted."))
                submitChallenge();
            else history.pushState(null, "", location.href);
        };
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (activeChallenge) {
                e.preventDefault();
                e.returnValue = "";
                submitChallenge();
            }
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        window.addEventListener("popstate", handlePopState);
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            window.removeEventListener("popstate", handlePopState);
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [activeChallenge, submitChallenge]);

    useEffect(() => {
        if (!activeChallenge && document.fullscreenElement) document.exitFullscreen().catch(() => { });
    }, [activeChallenge]);

    const wins = challenges.filter((c) => c.winner_id === user?.id).length;
    const losses = challenges.filter((c) => c.status === "completed" && c.winner_id !== user?.id).length;
    const incoming = challenges.filter((c) => c.to_user_id === user?.id && c.status === "pending");
    const unseenIncomingCount = incoming.filter((c) => !seenIncomingIds.has(c.id)).length;
    const outgoing = challenges.filter((c) => c.from_user_id === user?.id && c.status === "pending");
    const pendingSentCount = outgoing.length;
    const completed = challenges.filter((c) => c.status === "completed");

    const getMostRecentBattle = useCallback(() => {
        if (completed.length === 0) return null;
        return [...completed].sort(
            (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
        )[0];
    }, [completed]);

    useEffect(() => {
        if (processingCompletedRef.current || completed.length === 0) return;
        const mostRecent = getMostRecentBattle();
        if (!mostRecent) return;

        const lastShown = localStorage.getItem(LAST_BATTLE_SHOWN_KEY);
        if (lastShown !== mostRecent.id) {
            processingCompletedRef.current = true;
            localStorage.setItem(LAST_BATTLE_SHOWN_KEY, mostRecent.id);
            localStorage.setItem(
                LAST_BATTLE_KEY,
                JSON.stringify({
                    id: mostRecent.id,
                    result: mostRecent.winner_id === user?.id ? "win" : "loss",
                    timestamp: mostRecent.completed_at,
                })
            );
            if (mostRecent.winner_id === user?.id) {
                burstConfetti();
                playSound("trivia-finish");
                setShowWinOverlay(true);
                setTimeout(() => {
                    setShowWinOverlay(false);
                    processingCompletedRef.current = false;
                }, 5000);
            } else {
                playSound("loss");
                setShowLossOverlay(true);
                setTimeout(() => {
                    setShowLossOverlay(false);
                    processingCompletedRef.current = false;
                }, 5000);
            }
        }
    }, [completed, user, getMostRecentBattle]);

    return {
        // state
        currentQIndex, setCurrentQIndex,
        challenges, players,
        search, setSearch,
        onlyOnline, setOnlyOnline,
        tempQuestions,
        pendingTargetUser,
        activeChallenge,
        answers,
        timeLeft,
        showSubmitModal, setShowSubmitModal,
        loading, isInitialLoad,
        showWinOverlay, setShowWinOverlay,
        showLossOverlay, setShowLossOverlay,
        seenIncomingIds, setSeenIncomingIds,
        pinnedUsers,
        isUpdating,
        initialTab,
        selectedUserId, setSelectedUserId,
        // derived
        filteredPlayers,
        wins, losses, incoming, unseenIncomingCount, outgoing, pendingSentCount, completed,
        isFollowing,
        // actions
        sendChallenge, acceptChallenge, cancelChallenge, submitChallenge,
        handleAnswer, handleInvite, handleManualUpdate, togglePin,
    };
}