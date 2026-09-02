"use client";
import { createPortal } from 'react-dom';
import { useMemo } from "react";
import { useEffect, useState, useRef, useCallback } from "react";
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
    Star,
    StarOff,
    RefreshCw,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";


interface CachedUser {
    user_id: string;
    name: string;
    username: string;
    avatar_url: string;
    is_online: boolean;
    is_pinned?: boolean;
    pinned_at?: number;
}

// Cache keys - persistent across sessions
const PLAYERS_CACHE_KEY = "challenge_players_cache_v5";
const CHALLENGES_CACHE_KEY = "challenge_history_cache_v5";
const CACHE_VERSION = "5.0";
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days cache

// Memory cache for faster access
let playersMemoryCache: CachedUser[] | null = null;
let challengesMemoryCache: any[] | null = null;

// Optimized cache management functions
const loadCache = <T,>(key: string): T | null => {
    try {
        const cached = localStorage.getItem(key);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.version === CACHE_VERSION) {
                return parsed.data;
            }
        }
        return null;
    } catch (error) {
        console.error("Failed to load cache:", error);
        return null;
    }
};

const saveCache = <T,>(key: string, data: T): void => {
    try {
        const cacheData = {
            data,
            timestamp: Date.now(),
            version: CACHE_VERSION,
        };
        localStorage.setItem(key, JSON.stringify(cacheData));

        // Update memory cache
        if (key === PLAYERS_CACHE_KEY) {
            playersMemoryCache = data as any;
        } else if (key === CHALLENGES_CACHE_KEY) {
            challengesMemoryCache = data as any;
        }
    } catch (error) {
        console.error("Failed to save cache:", error);
    }
};

// Clear all cache
const clearAllCache = () => {
    localStorage.removeItem(PLAYERS_CACHE_KEY);
    localStorage.removeItem(CHALLENGES_CACHE_KEY);
    playersMemoryCache = null;
    challengesMemoryCache = null;
};

// Optimized confetti burst
const burstConfetti = () => {
    requestAnimationFrame(() => {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, startVelocity: 25, colors: ["#fbbf24", "#f97316", "#ef4444", "#22c55e"], ticks: 150, gravity: 0.8 });
        setTimeout(() => {
            requestAnimationFrame(() => {
                confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 }, startVelocity: 20, colors: ["#f59e0b", "#ec4899", "#06b6d4"], ticks: 120, gravity: 0.9 });
            });
        }, 120);
    });
};

// Storage keys for battle overlays
const LAST_BATTLE_KEY = "last_battle_result";
const LAST_BATTLE_SHOWN_KEY = "last_battle_result_shown";

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
    seenIncomingIds,
    setSeenIncomingIds,
    cancelChallenge,
    unseenIncomingCount,
    pendingSentCount,
    pinnedUsers,
    togglePin,
    onUpdateList,
    isUpdating,
}: any) {

    const [activeTab, setActiveTab] = useState<"find" | "pinned" | "incoming" | "sent" | "completed">("find");
    const searchDebounceRef = useRef<NodeJS.Timeout>();

    const handleSearchChange = useCallback((value: string) => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            setSearch(value);
            if (!value.trim()) setSearch("");
        }, 300);
    }, [setSearch]);

    const renderTabContent = () => {
        switch (activeTab) {
            case "find":
                return (
                    <div className="space-y-4 w-full">
                        {/* Search and filters - full width */}
                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    defaultValue={search}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    placeholder="Search peers..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-muted/30 border-none text-sm focus:ring-2 focus:ring-blue-500/50 transition-all outline-none"
                                />
                            </div>

                            <button
                                onClick={() => setOnlyOnline(!onlyOnline)}
                                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border active:scale-95 ${onlyOnline
                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                    : "bg-white dark:bg-muted/30 border-slate-200 dark:border-slate-800 text-slate-500"
                                    }`}
                                style={{ touchAction: 'manipulation' }}
                            >
                                <span className={`h-2 w-2 rounded-full ${onlyOnline ? "bg-white animate-pulse" : "bg-slate-300"}`} />
                                Online Only
                            </button>

                            <button
                                onClick={onUpdateList}
                                disabled={isUpdating}
                                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border active:scale-95 ${isUpdating
                                    ? "bg-slate-400 border-slate-400 text-white cursor-not-allowed"
                                    : "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-600"
                                    }`}
                                style={{ touchAction: 'manipulation' }}
                            >
                                <RefreshCw size={14} className={isUpdating ? "animate-spin" : ""} />
                                {isUpdating ? "Updating..." : "Update List"}
                            </button>
                        </div>

                        {/* User Cards Grid */}
                        <div className="w-full">
                            <AnimatePresence>
                                {/* Invite Card */}
                                {/* Invite Card - Now part of the grid */}

                                {/* Empty State */}
                                {filteredPlayers.length === 0 && !loading && (
                                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-50 w-full">
                                        <Users size={48} className="text-slate-300" />
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Players Found</p>
                                        <p className="text-xs text-slate-400">Tap "Update List" to refresh the player directory</p>
                                    </div>
                                )}

                                {/* User Cards Grid - 4 columns on desktop */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">

                                    {/* Invite Card - Now part of the grid */}
                                    {!loading && inviteCards.map((card) => (
                                        <motion.div
                                            key={card.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleInvite(card.type)}
                                            className="group relative bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl border-2 border-indigo-500/30 hover:border-indigo-400/60 hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
                                            style={{ touchAction: 'manipulation' }}
                                        >
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none" />

                                            <div className="p-4 relative">
                                                {/* Icon - Centered like other cards */}
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="relative">
                                                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/30 shadow-inner">
                                                            <Send size={28} className="text-white rotate-[-20deg]" />
                                                        </div>
                                                        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-400 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center animate-pulse">
                                                            <span className="text-[8px]">✨</span>
                                                        </span>
                                                    </div>

                                                    <span className="text-[10px] font-bold text-white/60 bg-white/10 px-2 py-1 rounded-full">
                                                        Invite
                                                    </span>
                                                </div>

                                                {/* Name and Description */}
                                                <div className="mb-3">
                                                    <h3 className="font-bold text-base text-white truncate">
                                                        {card.name}
                                                    </h3>
                                                    <p className="text-xs font-medium text-white/70 truncate">
                                                        Strengthen the network
                                                    </p>
                                                </div>

                                                {/* Status Badge - Mimicking other cards */}
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/20">
                                                        <Users size={10} />
                                                        Invite Peers
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/30 text-white border border-amber-400/30">
                                                        <Star size={10} className="fill-amber-400" />
                                                        Free
                                                    </span>
                                                </div>

                                                {/* Invite Button - Mimicking Challenge button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleInvite(card.type);
                                                    }}
                                                    className="w-full h-10 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-all hover:scale-[1.02] active:scale-95 border border-white/20 backdrop-blur-sm flex items-center justify-center gap-2"
                                                    style={{ touchAction: 'manipulation' }}
                                                >
                                                    <Send size={14} className="rotate-[-20deg]" />
                                                    Invite Now
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {filteredPlayers.map((p: any) => (
                                        <motion.div
                                            key={p.user_id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="group relative bg-white dark:bg-muted/30 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-blue-500/30 hover:shadow-xl transition-all duration-300 overflow-hidden"
                                        >
                                            {/* Card Content */}
                                            <div className="p-4">
                                                {/* Avatar and Online Status */}
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="relative">
                                                        <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-inner">
                                                            {p.avatar_url ? (
                                                                <img
                                                                    src={p.avatar_url}
                                                                    className="w-full h-full object-cover rounded-full"
                                                                    alt={p.name}
                                                                    loading="lazy"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <img
                                                                        src="/pwa-512x512.png"
                                                                        className="w-full h-full object-cover rounded-full"
                                                                        alt="Medrae Logo"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                        {p.is_online && (
                                                            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm animate-pulse" />
                                                        )}
                                                    </div>

                                                    {/* Pin Button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePin(p.user_id);
                                                        }}
                                                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-90"
                                                        style={{ touchAction: 'manipulation' }}
                                                        title={p.is_pinned ? "Unpin user" : "Pin user"}
                                                    >
                                                        {p.is_pinned ? (
                                                            <Star size={16} className="text-amber-500 fill-amber-500" />
                                                        ) : (
                                                            <StarOff size={16} className="text-slate-400" />
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Name and Username */}
                                                <div className="mb-3">
                                                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                                        {p.name || "Unknown User"}
                                                    </h3>
                                                    <p className="text-xs font-medium text-slate-400 truncate">
                                                        @{p.username || "nurse"}
                                                    </p>
                                                </div>

                                                {/* Status Badge */}
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${p.is_online
                                                        ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                                        : "bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400"
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${p.is_online ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                                                            }`} />
                                                        {p.is_online ? "Online" : "Offline"}
                                                    </span>
                                                    {p.is_pinned && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                                                            <Star size={10} className="fill-amber-500" />
                                                            Pinned
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Challenge Button */}
                                                <Button
                                                    onClick={() => sendChallenge(p.user_id)}
                                                    size="sm"
                                                    className="w-full h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-500/20"
                                                    style={{ touchAction: 'manipulation' }}
                                                >
                                                    <Swords size={14} className="mr-1.5" />
                                                    Challenge
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </AnimatePresence>
                        </div>
                    </div>
                );

            // ... rest of tabs remain the same (pinned, incoming, sent, completed)
            case "pinned":
                // ... keep existing pinned tab code
                if (pinnedUsers.length === 0) {
                    return (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-50">
                            <Star size={48} className="text-slate-300" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Pinned Friends</p>
                            <p className="text-xs text-slate-400">Pin your favorite peers for quick access</p>
                        </div>
                    );
                }
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
                        {pinnedUsers.map((p: any) => (
                            <motion.div
                                key={p.user_id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="group relative bg-white dark:bg-muted/30 rounded-2xl border-2 border-amber-500/20 hover:border-amber-500/50 hover:shadow-xl transition-all duration-300 overflow-hidden"
                            >
                                <div className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-amber-500 shadow-inner">
                                                {p.avatar_url ? (
                                                    <img
                                                        src={p.avatar_url}
                                                        className="w-full h-full object-cover rounded-full"
                                                        alt={p.name}
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <img
                                                            src="/pwa-512x512.png"
                                                            className="w-full h-full object-cover rounded-full"
                                                            alt="Medrae Logo"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            {p.is_online && (
                                                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm animate-pulse" />
                                            )}
                                        </div>
                                        <button
                                            onClick={() => togglePin(p.user_id)}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-90"
                                            style={{ touchAction: 'manipulation' }}
                                            title="Unpin user"
                                        >
                                            <StarOff size={16} className="text-slate-400" />
                                        </button>
                                    </div>

                                    <div className="mb-3">
                                        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate">
                                            {p.name || "Unknown User"}
                                        </h3>
                                        <p className="text-xs font-medium text-slate-400 truncate">
                                            @{p.username || "nurse"}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                            <Star size={10} className="fill-amber-500" />
                                            Pinned
                                        </span>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${p.is_online
                                            ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                            : "bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400"
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${p.is_online ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                                                }`} />
                                            {p.is_online ? "Online" : "Offline"}
                                        </span>
                                    </div>

                                    <Button
                                        onClick={() => sendChallenge(p.user_id)}
                                        size="sm"
                                        className="w-full h-10 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-amber-500/20"
                                        style={{ touchAction: 'manipulation' }}
                                    >
                                        <Swords size={14} className="mr-1.5" />
                                        Challenge
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                );

            // ... rest of tabs (incoming, sent, completed) remain similar but with cards
            case "incoming":
                if (incoming.length === 0) {
                    return (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-50">
                            <Inbox size={48} className="text-slate-300" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Incoming Challenges</p>
                            <p className="text-xs text-slate-400">When someone challenges you, it will appear here</p>
                        </div>
                    );
                }
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
                        {incoming.map((challenge: any) => (
                            <motion.div
                                key={challenge.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="group relative bg-white dark:bg-muted/30 rounded-2xl border-2 border-blue-500/20 hover:border-blue-500/50 hover:shadow-xl transition-all duration-300 overflow-hidden"
                            >
                                <div className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-blue-500 shadow-inner">
                                                {challenge.from_user?.avatar_url ? (
                                                    <img
                                                        src={challenge.from_user.avatar_url}
                                                        className="w-full h-full object-cover rounded-full"
                                                        alt={challenge.from_user.name}
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-2xl">
                                                        {challenge.from_user?.name?.[0]?.toUpperCase() || "?"}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                                <Swords size={10} className="text-white" />
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {new Date(challenge.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <div className="mb-3">
                                        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate">
                                            {challenge.from_user?.name || "Unknown"}
                                        </h3>
                                        <p className="text-xs font-medium text-slate-400 truncate">
                                            Incoming Challenge
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                                            <Clock size={10} />
                                            Pending
                                        </span>
                                    </div>

                                    <Button
                                        onClick={() => acceptChallenge(challenge)}
                                        size="sm"
                                        className="w-full h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-500/20"
                                        style={{ touchAction: 'manipulation' }}
                                    >
                                        <Check size={14} className="mr-1.5" />
                                        Accept Challenge
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                );

            case "sent":
                if (outgoing.length === 0) {
                    return (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-50">
                            <Send size={48} className="text-slate-300" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Sent Challenges</p>
                            <p className="text-xs text-slate-400">Your pending challenges will appear here</p>
                        </div>
                    );
                }
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
                        {outgoing.map((challenge: any) => (
                            <motion.div
                                key={challenge.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="group relative bg-white dark:bg-muted/30 rounded-2xl border-2 border-amber-500/20 hover:border-amber-500/50 hover:shadow-xl transition-all duration-300 overflow-hidden"
                            >
                                <div className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-amber-500 shadow-inner">
                                                {challenge.to_user?.avatar_url ? (
                                                    <img
                                                        src={challenge.to_user.avatar_url}
                                                        className="w-full h-full object-cover rounded-full"
                                                        alt={challenge.to_user.name}
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-2xl">
                                                        {challenge.to_user?.name?.[0]?.toUpperCase() || "?"}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                                <Clock size={10} className="text-white" />
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {new Date(challenge.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <div className="mb-3">
                                        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate">
                                            {challenge.to_user?.name || "Unknown"}
                                        </h3>
                                        <p className="text-xs font-medium text-slate-400 truncate">
                                            Awaiting Response
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                            <Send size={10} />
                                            Pending
                                        </span>
                                    </div>

                                    <Button
                                        onClick={() => cancelChallenge(challenge.id)}
                                        size="sm"
                                        variant="outline"
                                        className="w-full h-10 rounded-xl border-rose-500 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-bold text-xs transition-all active:scale-95"
                                        style={{ touchAction: 'manipulation' }}
                                    >
                                        <X size={14} className="mr-1.5" />
                                        Cancel
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                );

            case "completed":
                if (completed.length === 0) {
                    return (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-50">
                            <History size={48} className="text-slate-300" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Battle History</p>
                            <p className="text-xs text-slate-400">Complete challenges to see your history</p>
                        </div>
                    );
                }
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
                        {completed.slice(0, 20).map((challenge: any) => {
                            const isWin = challenge.winner_id === user.id;
                            return (
                                <motion.div
                                    key={challenge.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`group relative bg-white dark:bg-muted/30 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${isWin ? "border-emerald-500/30 hover:border-emerald-500/50" : "border-rose-500/30 hover:border-rose-500/50"
                                        } hover:shadow-xl`}
                                >
                                    <div className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-inner">
                                                    {challenge.from_user_id === user.id ? (
                                                        challenge.to_user?.avatar_url ? (
                                                            <img
                                                                src={challenge.to_user.avatar_url}
                                                                className="w-full h-full object-cover rounded-full"
                                                                alt={challenge.to_user.name}
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <img
                                                                    src="/pwa-512x512.png"
                                                                    className="w-full h-full object-cover rounded-full"
                                                                    alt="Medrae Logo"
                                                                />
                                                            </div>
                                                        )
                                                    ) : (
                                                        challenge.from_user?.avatar_url ? (
                                                            <img
                                                                src={challenge.from_user.avatar_url}
                                                                className="w-full h-full object-cover rounded-full"
                                                                alt={challenge.from_user.name}
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <img
                                                                    src="/pwa-512x512.png"
                                                                    className="w-full h-full object-cover rounded-full"
                                                                    alt="Medrae Logo"
                                                                />
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                                {isWin ? (
                                                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                                        <Trophy size={10} className="text-white" />
                                                    </span>
                                                ) : (
                                                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                                        <Flame size={10} className="text-white" />
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                {new Date(challenge.completed_at).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <div className="mb-3">
                                            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate">
                                                {challenge.from_user_id === user.id ? challenge.to_user?.name : challenge.from_user?.name}
                                            </h3>
                                            <p className="text-xs font-medium text-slate-400 truncate">
                                                {isWin ? "Victory!" : "Defeat"}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 mb-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${isWin
                                                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                                : "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400"
                                                }`}>
                                                {isWin ? <Trophy size={10} /> : <Flame size={10} />}
                                                {isWin ? "Win" : "Loss"}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm font-bold">
                                            <span className={isWin ? "text-emerald-600" : "text-rose-600"}>
                                                {challenge.from_user_id === user.id ? challenge.score_to_beat : challenge.opponent_score}
                                            </span>
                                            <span className="text-slate-300 dark:text-slate-600">vs</span>
                                            <span className="text-slate-600 dark:text-slate-400">
                                                {challenge.from_user_id === user.id ? challenge.opponent_score : challenge.score_to_beat}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                );

            default:
                return null;
        }
    };



    return (
        <div className="mt-1">
            <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl mb-1 gap-1 overflow-x-auto custom-scrollbar">
                {[
                    { id: "find", label: "Find", icon: Users },
                    { id: "pinned", label: "Pinned", icon: Star, badge: pinnedUsers.length, color: "bg-amber-500" },
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
                            relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap active:scale-95
                            ${isActive ? "text-blue-600 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}
                        `}
                            style={{ touchAction: 'manipulation' }}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTabBackground"
                                    className="absolute inset-0 bg-white dark:bg-blue-600 shadow-sm rounded-xl z-0"
                                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                />
                            )}

                            <div className="relative z-10 flex items-center gap-2">
                                {Icon && <Icon size={14} className={isActive ? "text-blue-600 dark:text-white" : "text-slate-400"} />}
                                <span className="uppercase tracking-tight">{tab.label}</span>
                                {tab.badge > 0 && (
                                    <span className={`flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full text-[10px] font-black text-white border-2 border-white dark:border-slate-800 ${tab.color || 'bg-slate-500'}`}>
                                        {tab.badge}
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

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
    return <div className="p-3 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse h-20" />;
}

// Timer beep function using Web Audio API
const playTimerBeep = () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'square';

        gainNode.gain.value = 0.3;
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
        console.log('Audio not available');
    }
};

export default function ChallengePage() {
    const session = useSession();
    const user = session?.user;
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [challenges, setChallenges] = useState<any[]>(() => {
        // Initialize from cache
        if (typeof window !== "undefined") {
            return loadCache(CHALLENGES_CACHE_KEY) || [];
        }
        return [];
    });
    const [players, setPlayers] = useState<any[]>(() => {
        // Initialize from cache
        if (typeof window !== "undefined") {
            const cached = loadCache(PLAYERS_CACHE_KEY);
            if (cached) {
                playersMemoryCache = cached;
                return cached;
            }
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
    const [loading, setLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [showWinOverlay, setShowWinOverlay] = useState(false);
    const [showLossOverlay, setShowLossOverlay] = useState(false);
    const [seenIncomingIds, setSeenIncomingIds] = useState<Set<string>>(new Set());
    const [pinnedUsers, setPinnedUsers] = useState<any[]>(() => {
        const cached = loadCache(PLAYERS_CACHE_KEY);
        if (cached) return cached.filter((p: any) => p.is_pinned);
        return [];
    });
    const [isUpdating, setIsUpdating] = useState(false); // New state for update loading
    const [timerWarningPlayed, setTimerWarningPlayed] = useState(false);

    const lastShownBattleId = useRef<string | null>(null);
    const processingCompletedRef = useRef(false);
    const timerRef = useRef<NodeJS.Timeout>();
    const intervalRef = useRef<NodeJS.Timeout>();
    const beepIntervalRef = useRef<NodeJS.Timeout>();

    // Load pinned users from cache on mount
    useEffect(() => {
        const cached = loadCache(PLAYERS_CACHE_KEY);
        if (cached) {
            const pinned = cached.filter(user => user.is_pinned);
            setPinnedUsers(pinned);
        }
    }, []);

    // Toggle pin for a user
    const togglePin = useCallback((userId: string) => {
        playSound("ui-tap");

        setPlayers(prevPlayers => {
            const updatedPlayers = prevPlayers.map(player =>
                player.user_id === userId
                    ? { ...player, is_pinned: !player.is_pinned, pinned_at: !player.is_pinned ? Date.now() : undefined }
                    : player
            );

            const updatedCache = updatedPlayers.map(p => ({
                user_id: p.user_id,
                name: p.name,
                username: p.username,
                avatar_url: p.avatar_url,
                is_online: p.is_online,
                is_pinned: p.is_pinned,
                pinned_at: p.pinned_at
            }));
            saveCache(PLAYERS_CACHE_KEY, updatedCache);

            const updatedPinned = updatedPlayers.filter(p => p.is_pinned);
            setPinnedUsers(updatedPinned);

            return updatedPlayers;
        });
    }, []);

    // Body scroll lock for overlays
    useEffect(() => {
        if (showWinOverlay || showLossOverlay || activeChallenge) {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
        } else {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        }
    }, [showWinOverlay, showLossOverlay, activeChallenge]);

    // ✅ OPTIMIZED: Fetch challenges with persistent caching (no auto-refresh)
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

    // ✅ OPTIMIZED: Fetch players with persistent caching (no auto-refresh)
    const fetchPlayers = useCallback(async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("user_id, name, username, avatar_url, is_online")
                .neq("user_id", user.id)
                .order("name", { ascending: true })
                .limit(200);

            if (error || !data) return;

            const existingCache = loadCache(PLAYERS_CACHE_KEY);
            const pinMap = new Map();
            if (existingCache) {
                existingCache.forEach((user: any) => {
                    if (user.is_pinned) pinMap.set(user.user_id, { is_pinned: true, pinned_at: user.pinned_at });
                });
            }

            const mergedData = data.map(player => ({
                ...player,
                is_pinned: pinMap.has(player.user_id),
                pinned_at: pinMap.get(player.user_id)?.pinned_at
            }));

            const cacheData = mergedData.map(p => ({
                user_id: p.user_id,
                name: p.name,
                username: p.username,
                avatar_url: p.avatar_url,
                is_online: p.is_online,
                is_pinned: p.is_pinned,
                pinned_at: p.pinned_at
            }));

            saveCache(PLAYERS_CACHE_KEY, cacheData);
            setPlayers(mergedData);
            setPinnedUsers(mergedData.filter(p => p.is_pinned));
        } catch (err) {
            console.error("Error fetching players:", err);
        }
    }, [user]);

    // Manual update function - triggered by user tapping "Update List"
    const handleManualUpdate = useCallback(async () => {
        if (isUpdating) return;

        setIsUpdating(true);
        playSound("ui-tap");

        try {
            // Fetch fresh data
            await Promise.all([
                fetchChallenges(),
                fetchPlayers()
            ]);

            // Optional: Show success feedback
            if (navigator.vibrate) navigator.vibrate(50);
        } catch (err) {
            console.error("Error updating data:", err);
        } finally {
            setIsUpdating(false);
        }
    }, [fetchChallenges, fetchPlayers, isUpdating]);

    // Initial data load - only on mount, no auto-refresh
    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            // 1. Immediate UI: Load from cache so it looks fast
            const cachedPlayers = loadCache(PLAYERS_CACHE_KEY);
            const cachedChallenges = loadCache(CHALLENGES_CACHE_KEY);

            if (cachedPlayers?.length > 0) {
                setPlayers(cachedPlayers);
                setPinnedUsers(cachedPlayers.filter(p => p.is_pinned));
            } else {
                setLoading(true); // Only show loader if nothing is cached
            }

            if (cachedChallenges?.length > 0) {
                setChallenges(cachedChallenges);
            }

            // 2. Background Sync: Always fetch fresh data on refresh/mount
            // This ensures that even if you have a cache, you get the latest scores
            await Promise.all([
                fetchPlayers(),
                fetchChallenges()
            ]);

            setLoading(false);
            setIsInitialLoad(false);
        };

        loadData();
    }, [user, fetchPlayers, fetchChallenges]);
    // Add this inside the ChallengePage component
    useEffect(() => {
        const handleAutoRefresh = () => {
            // Only refresh if the user is actually looking at the page
            if (document.visibilityState === 'visible' && user) {
                console.log("App focused/returned: Refreshing data...");
                fetchChallenges();
                fetchPlayers();
            }
        };

        // Listen for tab switching or coming back from another app
        document.addEventListener("visibilitychange", handleAutoRefresh);
        // Listen for clicking back into the window
        window.addEventListener("focus", handleAutoRefresh);

        return () => {
            document.removeEventListener("visibilitychange", handleAutoRefresh);
            window.removeEventListener("focus", handleAutoRefresh);
        };
    }, [user, fetchChallenges, fetchPlayers]);
    useEffect(() => { initSound(); }, []);

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
        if (onlyOnline) filtered = filtered.filter(p => p.is_online);
        return filtered.sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return (a.name || "").localeCompare(b.name || "");
        });
    }, [players, search, onlyOnline]);

    const cancelChallenge = async (challengeId: string) => {
        playSound("ui-tap");
        const { error } = await supabase.from("challenges").delete().eq("id", challengeId);
        if (error) console.error(error);
        else await fetchChallenges(); // Refresh after action
    };

    const sendChallenge = async (targetUserId: string) => {
        playSound("ui-tap");
        const canSend = !challenges.some(c => (c.from_user_id === user.id && c.to_user_id === targetUserId && c.status !== "completed") || (c.from_user_id === targetUserId && c.to_user_id === user.id && c.status !== "completed"));
        if (!canSend) { alert("Complete previous challenge with this player first."); return; }

        const { data: questionsData, error } = await supabase.rpc("get_random_questions", { limit_count: 10 });
        if (error || !questionsData) return;

        setTempQuestions(questionsData);
        setPendingTargetUser(targetUserId);
        setAnswers(Array(questionsData.length).fill(""));
        setCurrentQIndex(0);
        setActiveChallenge({ from_user_id: user.id, to_user_id: targetUserId, questions: questionsData, status: "self", score_to_beat: 0 });
        setTimeout(() => { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => { }); }, 100);
        setTimeLeft(300);
        setTimerWarningPlayed(false);
    };

    const handleInvite = (type: string) => {
        playSound("ui-tap");
        const message = `Hey 👋\n\nJoin me on Medrae 🚀\n\nCompete in challenges:\nhttps://medrae.vercel.app/challenge\n\nSign up here:\nhttps://medrae.vercel.app`;
        if (type === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
        if (type === "link") { navigator.clipboard.writeText("https://medrae.vercel.app"); alert("Invite link copied!"); }
    };

    const acceptChallenge = async (challenge: any) => {
        playSound("start");
        setSeenIncomingIds((prev) => new Set(prev).add(challenge.id));
        if (!challenge.question_ids || challenge.question_ids.length === 0) return;

        const { data: questionsData } = await supabase.from("simulation_questions").select("*").in("id", challenge.question_ids);
        if (!questionsData) return;

        setAnswers(Array(questionsData.length).fill(""));
        setCurrentQIndex(0);
        setActiveChallenge({ ...challenge, questions: questionsData, status: "opponent" });
        setTimeout(() => { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => { }); }, 100);
        setTimeLeft(300);
        setTimerWarningPlayed(false);
    };

    const handleAnswer = useCallback((idx: number, opt: string) => {
        if (navigator.vibrate) navigator.vibrate(30);
        playSound("ui-tap");
        setAnswers((prev) => { const copy = [...prev]; copy[idx] = opt; return copy; });
        if (idx < activeChallenge?.questions?.length - 1) {
            setTimeout(() => setCurrentQIndex((i) => Math.min(i + 1, activeChallenge.questions.length - 1)), 150);
        }
    }, [activeChallenge]);

    const submitChallenge = useCallback(async () => {
        if (!activeChallenge) return;
        const score = activeChallenge.questions.reduce((acc: number, q: any, idx: number) => acc + (answers[idx] === q.correct_answer ? 1 : 0), 0);

        if (activeChallenge.status === "self") {
            const { error } = await supabase.from("challenges").insert({ from_user_id: user?.id, to_user_id: pendingTargetUser, question_ids: tempQuestions.map(q => q.id), score_to_beat: score, status: "pending" });
            if (!error) { playSound("notification"); await fetchChallenges(); }
        } else {
            await supabase.from("challenges").update({ opponent_score: score, status: "completed", winner_id: score > (activeChallenge.score_to_beat || 0) ? user?.id : activeChallenge.from_user_id, completed_at: new Date() }).eq("id", activeChallenge.id);
            await fetchChallenges(); // Refresh challenges after completion
        }
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
        if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
    }, [activeChallenge, answers, user, pendingTargetUser, tempQuestions, fetchChallenges]);

    // Timer effect with 10-second warning and 5-second repeating beeps
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

    // Timer warning effect - plays beep at 10 seconds
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

    // Repeating beep effect for last 5 seconds
    useEffect(() => {
        // Clear any existing interval
        if (beepIntervalRef.current) {
            clearInterval(beepIntervalRef.current);
            beepIntervalRef.current = undefined;
        }

        if (activeChallenge && timeLeft <= 5 && timeLeft > 0) {
            beepIntervalRef.current = setInterval(() => {
                playTimerBeep();
            }, 800);
        }

        return () => {
            if (beepIntervalRef.current) {
                clearInterval(beepIntervalRef.current);
                beepIntervalRef.current = undefined;
            }
        };
    }, [timeLeft, activeChallenge]);

    // Fullscreen handling
    useEffect(() => {
        if (!activeChallenge) {
            if (document.fullscreenElement) document.exitFullscreen();
            return;
        }
        history.pushState(null, "", location.href);
        const handleFullscreenChange = () => { if (!document.fullscreenElement && activeChallenge) submitChallenge(); };
        const handlePopState = () => { if (activeChallenge && confirm("Leave challenge? Your answers will be submitted.")) submitChallenge(); else history.pushState(null, "", location.href); };
        const handleBeforeUnload = (e: BeforeUnloadEvent) => { if (activeChallenge) { e.preventDefault(); e.returnValue = ""; submitChallenge(); } };
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
    const unseenIncomingCount = incoming.filter(c => !seenIncomingIds.has(c.id)).length;
    const outgoing = challenges.filter((c) => c.from_user_id === user?.id && c.status === "pending");
    const pendingSentCount = outgoing.length;
    const completed = challenges.filter((c) => c.status === "completed");

    const getMostRecentBattle = useCallback(() => {
        if (completed.length === 0) return null;
        return [...completed].sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0];
    }, [completed]);

    // Handle showing overlay for most recent battle only once
    useEffect(() => {
        if (processingCompletedRef.current || completed.length === 0) return;
        const mostRecent = getMostRecentBattle();
        if (!mostRecent) return;

        const lastShown = localStorage.getItem(LAST_BATTLE_SHOWN_KEY);
        if (lastShown !== mostRecent.id) {
            processingCompletedRef.current = true;
            localStorage.setItem(LAST_BATTLE_SHOWN_KEY, mostRecent.id);
            localStorage.setItem(LAST_BATTLE_KEY, JSON.stringify({ id: mostRecent.id, result: mostRecent.winner_id === user?.id ? 'win' : 'loss', timestamp: mostRecent.completed_at }));

            if (mostRecent.winner_id === user?.id) {
                burstConfetti();
                playSound("trivia-finish");
                setShowWinOverlay(true);
                setTimeout(() => { setShowWinOverlay(false); processingCompletedRef.current = false; }, 5000);
            } else {
                playSound("loss");
                setShowLossOverlay(true);
                setTimeout(() => { setShowLossOverlay(false); processingCompletedRef.current = false; }, 5000);
            }
        }
    }, [completed, user, getMostRecentBattle]);

    if (!user) return <GlobalLoader />;

    const inviteCards = [{ id: "invite-whatsapp", name: "Invite via WhatsApp", type: "whatsapp" }];

    return (
        <>
            {/* Battle Interface - Edge to edge, no borders */}
            {activeChallenge && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col overflow-hidden"
                    style={{ willChange: 'transform' }}
                >
                    {/* Header - Clean, no border */}
                    <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg">
                        <div className="px-4 py-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl" />
                                        <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                                            <Swords className="text-white w-4 h-4" />
                                        </div>
                                    </div>
                                    <div>
                                        <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">Medrae Arena</h2>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{activeChallenge?.status === "self" ? "Setting Benchmark" : "Peer Challenge"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <svg className="w-11 h-11 transform -rotate-90">
                                            <circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="2.5" fill="none" className="text-slate-200 dark:text-slate-700" />
                                            <circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeDasharray={`${2 * Math.PI * 18}`} strokeDashoffset={`${2 * Math.PI * 18 * (1 - timeLeft / 300)}`} className={`transition-all duration-1000 ${timeLeft < 30 ? 'text-rose-500' : 'text-blue-500'}`} />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className={`text-xs font-black tabular-nums ${timeLeft < 30 ? 'text-rose-500 animate-pulse' : 'text-slate-700 dark:text-slate-300'}`}>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Question</p>
                                        <p className="text-lg font-black text-slate-800 dark:text-white">{currentQIndex + 1} <span className="text-xs text-slate-400">/ {activeChallenge.questions.length}</span></p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 relative">
                                <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" initial={{ width: "0%" }} animate={{ width: `${((currentQIndex + 1) / activeChallenge.questions.length) * 100}%` }} transition={{ duration: 0.3 }} />
                                </div>
                                <div className="absolute -top-0.5 left-0 right-0 flex justify-between px-1">
                                    {activeChallenge.questions.map((_: any, idx: number) => (
                                        <div key={idx} className={`w-1 h-1 rounded-full transition-all duration-300 ${idx <= currentQIndex ? 'bg-blue-500 shadow-lg shadow-blue-500/50' : 'bg-slate-300 dark:bg-slate-700'}`} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content - Edge to edge */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="px-4 py-6 md:py-8 max-w-2xl mx-auto">
                            <motion.div key={currentQIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
                                {/* Tags - Clean, no border */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 backdrop-blur-sm">
                                        <Zap size={11} className="text-blue-600 fill-current" />
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Clinical</span>
                                    </div>
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10">
                                        <Trophy size={11} className="text-amber-600" />
                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">{activeChallenge?.status === "self" ? "Target" : "vs Peer"}</span>
                                    </div>
                                </div>

                                {/* Question - Reasonable font size */}
                                <div className="space-y-3">
                                    <h3 className="text-lg md:text-xl lg:text-2xl font-bold leading-snug text-slate-900 dark:text-slate-100">
                                        {activeChallenge.questions[currentQIndex].question_text}
                                    </h3>
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/5">
                                        <p className="text-[11px] font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                            <span className="text-sm">💡</span>
                                            {currentQIndex === 0 && "Let's begin! Read carefully and choose the best answer."}
                                            {currentQIndex === Math.floor(activeChallenge.questions.length / 2) && "You're doing great! Keep the momentum going!"}
                                            {currentQIndex === activeChallenge.questions.length - 2 && "Almost there! One final push!"}
                                            {currentQIndex > 0 && currentQIndex < Math.floor(activeChallenge.questions.length / 2) && currentQIndex !== Math.floor(activeChallenge.questions.length / 2) && "Stay focused, you've got this!"}
                                            {currentQIndex > Math.floor(activeChallenge.questions.length / 2) && currentQIndex < activeChallenge.questions.length - 2 && "Excellent progress! Keep going!"}
                                        </p>
                                    </motion.div>
                                </div>

                                {/* Options - Clean, no borders */}
                                <div className="grid grid-cols-1 gap-2.5 mt-5">
                                    {["A", "B", "C", "D"].map((opt, optIndex) => {
                                        const optionText = activeChallenge.questions[currentQIndex][`option_${opt.toLowerCase()}`];
                                        const isSelected = answers[currentQIndex] === opt;
                                        return (
                                            <motion.button
                                                key={opt}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: optIndex * 0.05 }}
                                                onClick={() => { if (navigator.vibrate) navigator.vibrate(30); handleAnswer(currentQIndex, opt); playSound("ui-tap"); }}
                                                className={`group relative p-3.5 rounded-xl text-left transition-all duration-300 flex items-start gap-3 active:scale-[0.99] ${isSelected
                                                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/30"
                                                    : "bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                                    }`}
                                                style={{ touchAction: 'manipulation' }}
                                            >
                                                <div className={`relative z-10 h-7 w-7 shrink-0 rounded-lg flex items-center justify-center font-black text-xs transition-all duration-200 ${isSelected
                                                    ? "bg-white/20 text-white"
                                                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20"
                                                    }`}>{opt}</div>
                                                <span className={`relative z-10 font-medium text-sm md:text-base leading-relaxed flex-1 ${isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"
                                                    }`}>{optionText}</span>
                                                {isSelected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2"><Check size={18} className="text-white" /></motion.div>}
                                            </motion.button>
                                        );
                                    })}
                                </div>

                                {/* Progress indicator - Clean, no border */}
                                <div className="mt-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/20">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5"><Check size={11} className="text-emerald-500" /><span className="font-medium text-slate-600 dark:text-slate-400 text-[10px]">Answered: {answers.filter(a => a).length}</span></div>
                                            <div className="flex items-center gap-1.5"><Clock size={11} className="text-amber-500" /><span className="font-medium text-slate-600 dark:text-slate-400 text-[10px]">Remaining: {activeChallenge.questions.length - answers.filter(a => a).length}</span></div>
                                        </div>
                                        <div className="text-right"><span className="text-[9px] font-mono text-slate-400">Q{currentQIndex + 1}/{activeChallenge.questions.length}</span></div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Bottom Navigation - Clean, no border */}
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-lg">
                        <div className="px-4 py-3 max-w-2xl mx-auto">
                            <div className="flex items-center gap-3">
                                <Button variant="outline" onClick={() => { if (navigator.vibrate) navigator.vibrate(20); setCurrentQIndex((i) => Math.max(i - 1, 0)); playSound("ui-tap"); }} disabled={currentQIndex === 0} className="flex-1 h-11 rounded-xl font-bold active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 bg-white dark:bg-slate-800 border-0 shadow-sm"><ChevronLeft className="mr-2 w-4 h-4" /><span className="hidden sm:inline text-xs">Previous</span></Button>
                                {currentQIndex < activeChallenge.questions.length - 1 ? (
                                    <Button onClick={() => { if (navigator.vibrate) navigator.vibrate(20); setCurrentQIndex((i) => Math.min(i + 1, activeChallenge.questions.length - 1)); playSound("ui-tap"); }} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 dark:from-blue-600 dark:to-indigo-600 text-white font-bold active:scale-95 transition-all shadow-lg border-0"><span className="hidden sm:inline text-xs">Next</span><ChevronRight className="ml-2 w-4 h-4" /></Button>
                                ) : (
                                    <Button onClick={() => { if (navigator.vibrate) navigator.vibrate(50); playSound("ui-tap"); setShowSubmitModal(true); }} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold active:scale-95 transition-all shadow-lg shadow-emerald-500/20 border-0"><Send className="mr-2 w-4 h-4" />Submit</Button>
                                )}
                            </div>
                            <p className="text-center text-[8px] font-medium text-slate-400 mt-1.5">Tap option to select • Swipe to navigate</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Header - Clean typography */}


            {/* Stats Dashboard - Clean, no borders */}
            <div className="grid grid-cols-3 gap-2 text-center max-w-full mx-auto mb-3">
                {loading && isInitialLoad ? (<><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>) : (<>
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                        <Trophy className="mx-auto mb-1.5 text-emerald-600 dark:text-emerald-400" size={18} />
                        <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 leading-none">{wins}</p>
                        <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest mt-1.5">Wins</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10">
                        <Flame className="mx-auto mb-1.5 text-rose-600 dark:text-rose-400" size={18} />
                        <p className="text-xl font-black text-rose-700 dark:text-rose-400 leading-none">{losses}</p>
                        <p className="text-[9px] font-bold text-rose-600/60 uppercase tracking-widest mt-1.5">Losses</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                        <Clock className="mx-auto mb-1.5 text-amber-600 dark:text-amber-400" size={18} />
                        <p className="text-xl font-black text-amber-700 dark:text-amber-400 leading-none">{unseenIncomingCount}</p>
                        <p className="text-[9px] font-bold text-amber-600/60 uppercase tracking-widest mt-1.5">Pending</p>
                    </div>
                </>)}
            </div>

            {/* Challenge Tabs - Edge to edge, no borders */}
            <div className="w-full max-w-full mx-auto">
                <ChallengeTabs
                    incoming={incoming}
                    outgoing={outgoing}
                    completed={completed}
                    acceptChallenge={acceptChallenge}
                    user={user}
                    loading={loading && isInitialLoad}
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
                    pinnedUsers={pinnedUsers}
                    togglePin={togglePin}
                    onUpdateList={handleManualUpdate}
                    isUpdating={isUpdating}
                />
            </div>

            {/* Submit Modal - Clean design */}
            <AnimatePresence>
                {showSubmitModal && (
                    <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10000]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSubmitModal(false)}>
                        <motion.div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-11/12 max-w-md shadow-2xl flex flex-col gap-4" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-bold text-center">Submit Challenge?</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 text-center">Once submitted, you won't be able to change your answers.</p>
                            <div className="flex justify-center gap-4 mt-4">
                                <button onClick={() => setShowSubmitModal(false)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 active:scale-95 transition-all font-medium text-sm">Cancel</button>
                                <button onClick={() => { if (navigator.vibrate) navigator.vibrate(50); playSound("ui-tap"); submitChallenge(); setShowSubmitModal(false); }} className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white active:scale-95 transition-all font-medium text-sm shadow-lg shadow-emerald-500/20">Submit</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Win Overlay - Clean design */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showWinOverlay && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6 overflow-hidden" onClick={() => setShowWinOverlay(false)}>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/20 rounded-full blur-[100px] animate-pulse" />
                            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-[80px]" />
                            <motion.div initial={{ scale: 0.8, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.8, y: 40, opacity: 0 }} transition={{ type: "spring", damping: 15 }} className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-12 flex flex-col items-center justify-center shadow-[0_32px_128px_-12px_rgba(0,0,0,0.5)] w-full max-w-lg text-center overflow-hidden" onClick={e => e.stopPropagation()}>
                                <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                                <div className="relative mb-6"><div className="absolute inset-0 bg-amber-400/30 blur-2xl rounded-full" /><motion.div animate={{ y: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}><Trophy size={64} className="relative text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" /></motion.div></div>
                                <div className="space-y-3 mb-8"><div><p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Champion</p><h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">Victory!</h1></div><div className="h-px w-12 bg-slate-200 dark:bg-slate-700 mx-auto" /><p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">Clinical dominance established. You've out-performed your peer.</p></div>
                                <Button size="lg" onClick={() => { if (navigator.vibrate) navigator.vibrate(50); setShowWinOverlay(false); }} className="h-12 px-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl border-0 text-sm">Continue</Button>
                                <p className="mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Nurse Duel (N.D) Challenge</p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>, document.body
            )}

            {/* Loss Overlay - Clean design */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showLossOverlay && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6 overflow-hidden" onClick={() => setShowLossOverlay(false)}>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-500/20 rounded-full blur-[100px] animate-pulse" />
                            <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-red-500/10 rounded-full blur-[80px]" />
                            <motion.div initial={{ scale: 0.8, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.8, y: 40, opacity: 0 }} transition={{ type: "spring", damping: 15 }} className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-12 flex flex-col items-center justify-center shadow-[0_32px_128px_-12px_rgba(0,0,0,0.5)] w-full max-w-lg text-center overflow-hidden" onClick={e => e.stopPropagation()}>
                                <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-rose-400 to-transparent" />
                                <div className="relative mb-6"><div className="absolute inset-0 bg-rose-400/30 blur-2xl rounded-full" /><motion.div animate={{ y: [0, -10, 0, -5, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}><Flame size={64} className="relative text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" /></motion.div></div>
                                <div className="space-y-3 mb-8"><div><p className="text-rose-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Outcome</p><h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">Defeat</h1></div><div className="h-px w-12 bg-slate-200 dark:bg-slate-700 mx-auto" /><p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">Every loss is a lesson. Knowledge is power, and power grows with persistence.</p></div>
                                <div className="flex flex-col gap-3 w-full"><Button size="lg" onClick={() => { if (navigator.vibrate) navigator.vibrate(50); setShowLossOverlay(false); }} className="h-12 px-10 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-rose-500/30 border-0 text-sm">Try Another Battle</Button><p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Rise Again • Stronger Than Before</p></div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>, document.body
            )}
        </>
    );
}