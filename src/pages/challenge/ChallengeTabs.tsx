// src/pages/challenge/ChallengeTabs.tsx

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, Search, Star, Inbox, Send, History, Check, Clock, Trophy, Flame,
    Swords, X, StarOff, RefreshCw,
} from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import { PlayerRowSkeleton } from "./skeleton";

interface ChallengeTabsProps {
    incoming: any[]; outgoing: any[]; completed: any[];
    acceptChallenge: (c: any) => void;
    user: any;
    loading: boolean;
    search: string; setSearch: (s: string) => void;
    onlyOnline: boolean; setOnlyOnline: (b: boolean) => void;
    filteredPlayers: any[];
    sendChallenge: (id: string) => void;
    inviteCards: { id: string; name: string; type: string }[];
    handleInvite: (type: string) => void;
    seenIncomingIds: Set<string>;
    setSeenIncomingIds: (s: Set<string>) => void;
    cancelChallenge: (id: string) => void;
    unseenIncomingCount: number;
    pendingSentCount: number;
    pinnedUsers: any[];
    togglePin: (id: string) => void;
    onUpdateList: () => void;
    isUpdating: boolean;
    onSelectUser: (id: string) => void;
    initialTab?: "find" | "pinned" | "incoming" | "sent" | "completed";
}

export function ChallengeTabs({
    incoming, outgoing, completed, acceptChallenge, user, loading,
    search, setSearch, onlyOnline, setOnlyOnline, filteredPlayers, sendChallenge,
    inviteCards, handleInvite, seenIncomingIds, setSeenIncomingIds,
    cancelChallenge, unseenIncomingCount, pendingSentCount, pinnedUsers,
    togglePin, onUpdateList, isUpdating, onSelectUser, initialTab = "find",
}: ChallengeTabsProps) {
    const [activeTab, setActiveTab] = useState<"find" | "pinned" | "incoming" | "sent" | "completed">(initialTab);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        if (initialTab && initialTab !== activeTab) setActiveTab(initialTab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialTab]);

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
                    <div className="w-full">
                        <div className="relative w-full group px-3 mb-2">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                            <input
                                defaultValue={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="Search peers…"
                                className="w-full h-10 pl-9 pr-4 rounded-xl text-sm
                                           bg-slate-100 dark:bg-white/[0.06]
                                           border-0 outline-none
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           focus:ring-2 focus:ring-blue-500/40 transition-shadow"
                            />
                        </div>

                        <div className="w-full">
                            {loading ? (
                                <PlayerRowSkeleton count={6} />
                            ) : filteredPlayers.length === 0 && inviteCards.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 px-3">
                                    <Users className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        No players found
                                    </p>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                        Tap "Update" to refresh the directory
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {inviteCards.map((card) => (
                                        <div
                                            key={card.id}
                                            className="flex items-center gap-3 px-3 py-2.5"
                                        >
                                            <button
                                                onClick={() => handleInvite(card.type)}
                                                className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70"
                                                style={{ touchAction: "manipulation" }}
                                            >
                                                <div className="relative shrink-0">
                                                    <div className="h-11 w-11 rounded-full bg-blue-50 dark:bg-blue-400/10 flex items-center justify-center">
                                                        <Send className="h-5 w-5 text-blue-600 dark:text-blue-400 -rotate-[20deg]" />
                                                    </div>
                                                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full
                                                                     bg-emerald-500 border-2 border-white dark:border-[#0d1117]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                                                        {card.name}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                                                        Strengthen the network · Free
                                                    </p>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => handleInvite(card.type)}
                                                className="shrink-0 h-8 px-3 rounded-full
                                                           text-[10px] font-bold uppercase tracking-wider
                                                           bg-blue-50 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400
                                                           active:scale-[0.95] transition-transform"
                                                style={{ touchAction: "manipulation" }}
                                            >
                                                Invite
                                            </button>

                                            <button
                                                onClick={onUpdateList}
                                                disabled={isUpdating}
                                                className="shrink-0 h-8 px-3 rounded-full
               text-[10px] font-bold uppercase tracking-wider
               bg-blue-600 text-white
               active:scale-[0.95] transition-transform
               disabled:opacity-50 disabled:active:scale-100
               flex items-center justify-center"
                                                style={{ touchAction: "manipulation" }}
                                            >
                                                {isUpdating ? "Updating…" : "Update"}
                                            </button>
                                        </div>
                                    ))}

                                    {filteredPlayers.map((p: any) => (
                                        <div
                                            key={p.user_id}
                                            className="px-3 py-2.5 sm:flex sm:items-center sm:gap-3"
                                        >
                                            <div className="flex items-start gap-3 sm:flex-1 sm:min-w-0 sm:items-center">
                                                <button
                                                    onClick={() => onSelectUser(p.user_id)}
                                                    className="relative shrink-0 active:scale-[0.97] transition-transform"
                                                    style={{ touchAction: "manipulation" }}
                                                >
                                                    <div className="h-11 w-11 rounded-full overflow-hidden bg-slate-100 dark:bg-white/[0.06]">
                                                        <img
                                                            src={p.avatar_url || "/pwa-512x512.png"}
                                                            className="w-full h-full object-cover"
                                                            alt={p.name}
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                    {p.is_online && (
                                                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full
                                                                         bg-emerald-500 border-2 border-white dark:border-[#0d1117]" />
                                                    )}
                                                    {p.is_pinned && (
                                                        <span className="absolute -top-1 -left-1 h-4 w-4 rounded-full
                                                                         bg-amber-500 flex items-center justify-center
                                                                         border-2 border-white dark:border-[#0d1117]">
                                                            <Star size={8} className="text-white fill-white" />
                                                        </span>
                                                    )}
                                                </button>

                                                <button
                                                    onClick={() => onSelectUser(p.user_id)}
                                                    className="flex-1 min-w-0 text-left active:opacity-70 pt-0.5 sm:pt-0"
                                                    style={{ touchAction: "manipulation" }}
                                                >
                                                    <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                                                        {p.name || "Unknown User"}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                                                        @{p.username || "nurse"}
                                                    </p>
                                                    {p.is_same_school && (
                                                        <span className="inline-flex items-center mt-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                                            Same campus
                                                        </span>
                                                    )}
                                                </button>
                                            </div>

                                            <div className="mt-2 flex items-center gap-1.5 pl-[56px] sm:mt-0 sm:pl-0 sm:flex-nowrap sm:shrink-0">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        togglePin(p.user_id);
                                                    }}
                                                    className={`shrink-0 flex items-center justify-center gap-1 h-8 px-2.5 rounded-full
                                                                active:scale-[0.95] transition-transform
                                                                ${p.is_pinned
                                                            ? "bg-amber-50 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400"
                                                            : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"
                                                        }`}
                                                    style={{ touchAction: "manipulation" }}
                                                    title={p.is_pinned ? "Remove from favorites" : "Add to favorites"}
                                                >
                                                    <Star size={13} className={p.is_pinned ? "fill-current" : ""} />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">
                                                        {p.is_pinned ? "Saved" : "Pin"}
                                                    </span>
                                                </button>

                                                <div className="shrink-0 [&_button]:h-8 [&_button]:text-[10px] [&_button]:rounded-full">
                                                    <FollowButton targetUserId={p.user_id} size="sm" />
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        sendChallenge(p.user_id);
                                                    }}
                                                    className="shrink-0 h-8 px-3 rounded-full
                                                               bg-blue-600 text-white
                                                               text-[10px] font-bold uppercase tracking-wider
                                                               active:scale-[0.95] transition-transform
                                                               flex-1 sm:flex-none"
                                                    style={{ touchAction: "manipulation" }}
                                                >
                                                    Challenge Me
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );

            case "pinned":
                if (pinnedUsers.length === 0) {
                    return (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 px-3">
                            <Star className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                No pinned friends
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                Pin your favorite peers for quick access
                            </p>
                        </div>
                    );
                }
                return (
                    <div className="flex flex-col">
                        {pinnedUsers.map((p: any) => (
                            <div key={p.user_id} className="flex items-center gap-3 px-3 py-2.5">
                                <button
                                    onClick={() => onSelectUser(p.user_id)}
                                    className="relative shrink-0 active:scale-[0.97] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <div className="h-11 w-11 rounded-full overflow-hidden bg-slate-100 dark:bg-white/[0.06]
                                                    ring-2 ring-amber-400/60">
                                        <img
                                            src={p.avatar_url || "/pwa-512x512.png"}
                                            className="w-full h-full object-cover"
                                            alt={p.name}
                                            loading="lazy"
                                        />
                                    </div>
                                    {p.is_online && (
                                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full
                                                         bg-emerald-500 border-2 border-white dark:border-[#0d1117]" />
                                    )}
                                </button>

                                <button
                                    onClick={() => onSelectUser(p.user_id)}
                                    className="flex-1 min-w-0 text-left active:opacity-70"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                                        {p.name || "Unknown User"}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                                        @{p.username || "nurse"}
                                    </p>
                                </button>

                                <button
                                    onClick={() => togglePin(p.user_id)}
                                    className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center
                                               bg-slate-100 dark:bg-white/[0.06]
                                               active:scale-[0.9] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                    title="Unpin user"
                                >
                                    <StarOff size={13} className="text-slate-400 dark:text-slate-500" />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        sendChallenge(p.user_id);
                                    }}
                                    className="shrink-0 h-8 px-3 rounded-full
                                               bg-amber-600 text-white
                                               text-[10px] font-bold uppercase tracking-wider
                                               flex items-center gap-1
                                               active:scale-[0.95] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <Swords size={12} />
                                    Challenge
                                </button>
                            </div>
                        ))}
                    </div>
                );

            case "incoming":
                if (incoming.length === 0) {
                    return (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 px-3">
                            <Inbox className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                No incoming challenges
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                When someone challenges you, it will appear here
                            </p>
                        </div>
                    );
                }
                return (
                    <div className="flex flex-col">
                        {incoming.map((challenge: any) => (
                            <div key={challenge.id} className="flex items-center gap-3 px-3 py-2.5">
                                <div className="relative shrink-0">
                                    <div className="h-11 w-11 rounded-full overflow-hidden bg-slate-100 dark:bg-white/[0.06]">
                                        {challenge.from_user?.avatar_url ? (
                                            <img
                                                src={challenge.from_user.avatar_url}
                                                className="w-full h-full object-cover"
                                                alt={challenge.from_user.name}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center
                                                            text-[12px] font-bold text-slate-500 dark:text-slate-400">
                                                {challenge.from_user?.name?.[0]?.toUpperCase() || "?"}
                                            </div>
                                        )}
                                    </div>
                                    <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full
                                                     bg-blue-500 flex items-center justify-center
                                                     border-2 border-white dark:border-[#0d1117]">
                                        <Swords size={8} className="text-white" />
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                                        {challenge.from_user?.name || "Unknown"}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                                        Incoming challenge
                                    </p>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        acceptChallenge(challenge);
                                    }}
                                    className="shrink-0 h-8 px-3 rounded-full
                                               bg-blue-600 text-white
                                               text-[10px] font-bold uppercase tracking-wider
                                               flex items-center gap-1
                                               active:scale-[0.95] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <Check size={12} />
                                    Accept
                                </button>
                            </div>
                        ))}
                    </div>
                );

            case "sent":
                if (outgoing.length === 0) {
                    return (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 px-3">
                            <Send className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                No sent challenges
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                Your pending challenges will appear here
                            </p>
                        </div>
                    );
                }
                return (
                    <div className="flex flex-col">
                        {outgoing.map((challenge: any) => (
                            <div key={challenge.id} className="flex items-center gap-3 px-3 py-2.5">
                                <div className="relative shrink-0">
                                    <div className="h-11 w-11 rounded-full overflow-hidden bg-slate-100 dark:bg-white/[0.06]">
                                        {challenge.to_user?.avatar_url ? (
                                            <img
                                                src={challenge.to_user.avatar_url}
                                                className="w-full h-full object-cover"
                                                alt={challenge.to_user.name}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center
                                                            text-[12px] font-bold text-slate-500 dark:text-slate-400">
                                                {challenge.to_user?.name?.[0]?.toUpperCase() || "?"}
                                            </div>
                                        )}
                                    </div>
                                    <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full
                                                     bg-amber-500 flex items-center justify-center
                                                     border-2 border-white dark:border-[#0d1117]">
                                        <Clock size={8} className="text-white" />
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                                        {challenge.to_user?.name || "Unknown"}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                                        Awaiting response
                                    </p>
                                </div>

                                <button
                                    onClick={() => cancelChallenge(challenge.id)}
                                    className="shrink-0 h-8 px-3 rounded-full
                                               bg-rose-50 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400
                                               text-[10px] font-bold uppercase tracking-wider
                                               flex items-center gap-1
                                               active:scale-[0.95] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <X size={12} />
                                    Cancel
                                </button>
                            </div>
                        ))}
                    </div>
                );

            case "completed":
                if (completed.length === 0) {
                    return (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 px-3">
                            <History className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                No battle history
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                Complete challenges to see your history
                            </p>
                        </div>
                    );
                }
                return (
                    <div className="flex flex-col">
                        {completed.slice(0, 20).map((challenge: any) => {
                            const isWin = challenge.winner_id === user.id;
                            const opponent = challenge.from_user_id === user.id
                                ? challenge.to_user
                                : challenge.from_user;

                            return (
                                <div key={challenge.id} className="flex items-center gap-3 px-3 py-2.5">
                                    <div className="relative shrink-0">
                                        <div className="h-11 w-11 rounded-full overflow-hidden bg-slate-100 dark:bg-white/[0.06]">
                                            <img
                                                src={opponent?.avatar_url || "/pwa-512x512.png"}
                                                className="w-full h-full object-cover"
                                                alt={opponent?.name || "Opponent"}
                                                loading="lazy"
                                            />
                                        </div>
                                        <span className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full
                                                          flex items-center justify-center
                                                          border-2 border-white dark:border-[#0d1117]
                                                          ${isWin ? "bg-emerald-500" : "bg-rose-500"}`}>
                                            {isWin ? (
                                                <Trophy size={8} className="text-white" />
                                            ) : (
                                                <Flame size={8} className="text-white" />
                                            )}
                                        </span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                                            {opponent?.name || "Unknown"}
                                        </p>
                                        <p className={`text-[11px] truncate leading-tight mt-0.5 font-bold
                                                       ${isWin ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                            {isWin ? "Victory" : "Defeat"} ·{" "}
                                            {challenge.from_user_id === user.id
                                                ? `${challenge.score_to_beat} vs ${challenge.opponent_score}`
                                                : `${challenge.opponent_score} vs ${challenge.score_to_beat}`}
                                        </p>
                                    </div>

                                    <span className={`shrink-0 px-2 py-0.5 rounded-full
                                                     text-[10px] font-bold
                                                     ${isWin
                                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400"
                                            : "bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-400"}`}>
                                        {isWin ? "Win" : "Loss"}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div>
            <div className="flex p-1 bg-slate-100 dark:bg-white/[0.06] rounded-full mb-2 gap-1 overflow-x-auto no-scrollbar">
                {[
                    { id: "find", label: "Find", icon: Users },
                    { id: "pinned", label: "Pinned", icon: Star, badge: pinnedUsers.length, color: "bg-amber-500" },
                    { id: "incoming", label: "Incoming", icon: Inbox, badge: unseenIncomingCount, color: "bg-rose-500" },
                    { id: "sent", label: "Sent", icon: Send, badge: pendingSentCount, color: "bg-blue-500" },
                    { id: "completed", label: "History", icon: History, badge: completed.length, color: "bg-emerald-500" },
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
                            className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-full
                                        text-[11px] font-bold whitespace-nowrap
                                        active:scale-[0.97] transition-transform
                                        ${isActive ? "text-white" : "text-slate-600 dark:text-slate-300"}`}
                            style={{ touchAction: "manipulation" }}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTabBackground"
                                    className="absolute inset-0 bg-blue-600 rounded-full z-0"
                                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                />
                            )}
                            <div className="relative z-10 flex items-center gap-1.5">
                                <Icon size={13} className={isActive ? "text-white" : "text-slate-400"} />
                                <span className="uppercase tracking-tight">{tab.label}</span>
                                {tab.badge > 0 && (
                                    <span className={`flex h-4 min-w-[16px] px-1 items-center justify-center
                                                      rounded-full text-[9px] font-bold text-white
                                                      ${tab.color || "bg-slate-500"}`}>
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
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                        {renderTabContent()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}