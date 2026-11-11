// src/pages/challenge/index.tsx

"use client";

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@supabase/auth-helpers-react";
import { ChevronLeft, RefreshCw, Trophy, Flame, Clock, Users } from "lucide-react";

import { GlobalLoader } from "@/components/GlobalLoader";
import { UserProfileModal } from "@/components/UserProfileModal";
import { RecentWinsStrip } from "@/components/duel/RecentWinsStrip";
import { playSound } from "@/lib/soundManager";

import { useChallengeData } from "./useChallengeData";
import { ChallengeTabs } from "./ChallengeTabs";
import { BattleView } from "./BattleView";
import { SubmitModal } from "./SubmitModal";
import { WinOverlay, LossOverlay } from "./ResultOverlays";
import { StatCardSkeleton } from "./skeleton";

export default function ChallengePage() {
    const session = useSession();
    const user = session?.user;
    const navigate = useNavigate();

    const data = useChallengeData({ user });

    const handleBack = useCallback(() => {
        playSound("ui-tap");
        if (navigator.vibrate) navigator.vibrate(20);
        navigate("/dashboard/student");
    }, [navigate]);

    if (!user) return <GlobalLoader />;

    const inviteCards = [{ id: "invite-whatsapp", name: "Invite via WhatsApp", type: "whatsapp" }];

    return (
        <div
            className="fixed inset-0 flex flex-col
                       bg-slate-50 dark:bg-[#0d1117]
                       text-slate-900 dark:text-white overflow-hidden"
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            {/* ── STICKY HEADER ─────────────────────────────── */}
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={handleBack}
                    aria-label="Go back"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5
                               transition-colors"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate">
                        Challenge
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {data.wins}W · {data.losses}L · {data.unseenIncomingCount} pending
                    </p>
                </div>
                <button
                    onClick={data.handleManualUpdate}
                    disabled={data.isUpdating}
                    className="h-9 px-2.5 rounded-full flex items-center justify-center shrink-0
               bg-slate-100 dark:bg-white/[0.06]
               active:bg-slate-200 dark:active:bg-white/[0.1]
               disabled:opacity-50"
                    style={{ touchAction: "manipulation" }}
                >
                    <span className="text-[11px] font-semibold">
                        {data.isUpdating ? "Updating…" : "Update List"}
                    </span>
                </button>
            </header>

            {/* ── SCROLLING BODY ────────────────────────────── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <div className="w-full max-w-[880px] mx-auto px-3 py-3 pb-24 safe-bottom space-y-3">

                    {/* Stats */}
                    <section className="grid grid-cols-3 gap-2">
                        {data.loading && data.isInitialLoad && data.players.length === 0 && data.challenges.length === 0 ? (
                            <>
                                <StatCardSkeleton />
                                <StatCardSkeleton />
                                <StatCardSkeleton />
                            </>
                        ) : (
                            <>
                                <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 text-center">
                                    <Trophy className="mx-auto text-emerald-600 dark:text-emerald-400" size={18} />
                                    <p className="text-xl font-bold tabular-nums mt-1.5 text-slate-900 dark:text-white leading-none">
                                        {data.wins}
                                    </p>
                                    <p className="text-[10px] font-bold uppercase tracking-wider
                                                  text-slate-500 dark:text-slate-400 mt-1">
                                        Wins
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 text-center">
                                    <Flame className="mx-auto text-rose-600 dark:text-rose-400" size={18} />
                                    <p className="text-xl font-bold tabular-nums mt-1.5 text-slate-900 dark:text-white leading-none">
                                        {data.losses}
                                    </p>
                                    <p className="text-[10px] font-bold uppercase tracking-wider
                                                  text-slate-500 dark:text-slate-400 mt-1">
                                        Losses
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 text-center">
                                    <Clock className="mx-auto text-amber-600 dark:text-amber-400" size={18} />
                                    <p className="text-xl font-bold tabular-nums mt-1.5 text-slate-900 dark:text-white leading-none">
                                        {data.unseenIncomingCount}
                                    </p>
                                    <p className="text-[10px] font-bold uppercase tracking-wider
                                                  text-slate-500 dark:text-slate-400 mt-1">
                                        Pending
                                    </p>
                                </div>
                            </>
                        )}
                    </section>

                    {/* Recent wins strip */}
                    <RecentWinsStrip
                        onSelectUser={data.setSelectedUserId}
                        currentUserId={user?.id}
                    />

                    {/* Tabs */}
                    <ChallengeTabs
                        incoming={data.incoming}
                        outgoing={data.outgoing}
                        completed={data.completed}
                        acceptChallenge={data.acceptChallenge}
                        initialTab={data.initialTab}
                        user={user}
                        loading={data.loading && data.isInitialLoad && data.players.length === 0 && data.challenges.length === 0}
                        search={data.search}
                        setSearch={data.setSearch}
                        onlyOnline={data.onlyOnline}
                        setOnlyOnline={data.setOnlyOnline}
                        filteredPlayers={data.filteredPlayers}
                        sendChallenge={data.sendChallenge}
                        inviteCards={inviteCards}
                        handleInvite={data.handleInvite}
                        seenIncomingIds={data.seenIncomingIds}
                        setSeenIncomingIds={data.setSeenIncomingIds}
                        unseenIncomingCount={data.unseenIncomingCount}
                        pendingSentCount={data.pendingSentCount}
                        cancelChallenge={data.cancelChallenge}
                        pinnedUsers={data.pinnedUsers}
                        togglePin={data.togglePin}
                        onUpdateList={data.handleManualUpdate}
                        isUpdating={data.isUpdating}
                        onSelectUser={data.setSelectedUserId}
                    />
                </div>
            </main>

            {/* ── OVERLAYS ─────────────────────────────────── */}
            {data.activeChallenge && (
                <BattleView
                    activeChallenge={data.activeChallenge}
                    currentQIndex={data.currentQIndex}
                    setCurrentQIndex={data.setCurrentQIndex}
                    answers={data.answers}
                    timeLeft={data.timeLeft}
                    handleAnswer={data.handleAnswer}
                    onShowSubmit={() => data.setShowSubmitModal(true)}
                />
            )}

            <SubmitModal
                open={data.showSubmitModal}
                onClose={() => data.setShowSubmitModal(false)}
                onConfirm={() => {
                    data.submitChallenge();
                    data.setShowSubmitModal(false);
                }}
            />

            <WinOverlay
                open={data.showWinOverlay}
                onClose={() => data.setShowWinOverlay(false)}
            />
            <LossOverlay
                open={data.showLossOverlay}
                onClose={() => data.setShowLossOverlay(false)}
            />

            <UserProfileModal
                userId={data.selectedUserId}
                onClose={() => data.setSelectedUserId(null)}
            />
        </div>
    );
}