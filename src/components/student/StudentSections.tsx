import { Star, Crown, BookOpen, ChevronRight, Newspaper } from "lucide-react";
import {
    Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { DailyTriviaCard } from "@/components/TopStudentsPanel";
import CountdownFloating from "@/components/CountdownFloating";
import Algorithm from "@/components/Algorithm/Algorithm";
import { QuickDuelStrip } from "@/components/QuickDuelStrip";
import DailyDose from "@/components/DailyDose";
import ShortPaper1 from "@/components/ShortPaper1";
import ShortPaper2 from "@/components/ShortPaper2";
import ShortPractice from "@/components/ShortPractice";
import FeedSeenTop10 from "@/components/FeedSeenTop10";
import DailyStatus from "@/components/DailyStatus";
import { SchoolWarsCard } from "@/components/school-wars/SchoolWarsCard";
import { UserProfileModal } from "@/components/UserProfileModal";
import { DeferredMount } from "@/components/DeferredMount";
import { SkeletonLeaderboard } from "./SkeletonLeaderboard";
import StudentSimulationPapers from "./StudentSimulationPapers";

type Props = {
    activeFilter: string | null;
    user: any;
    initialCache: any;
    profileState: any;
    // Leaderboard state (lifted from dashboard)
    topStudents: any[];
    loadingTopStudents: boolean;
    setSelectedUserId: (id: string | null) => void;
    selectedUserId: string | null;
    // ✅ NEW — Proctorium papers
    simulationPapers: any[];
    simulationProgress: Record<string, number>;
    onOpenPaper: (id: string) => void;
};

const isVisible = (activeFilter: string | null, id: string) =>
    !activeFilter || activeFilter === "all" || activeFilter === id;

const SK = ({ h = 200 }: { h?: number }) => (
    <div style={{ height: h }} className="rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
);

export default function StudentSections({
    activeFilter, user, initialCache, profileState,
    topStudents, loadingTopStudents, setSelectedUserId, selectedUserId,
    simulationPapers, simulationProgress, onOpenPaper,
}: Props) {
    return (
        <>
            {isVisible(activeFilter, "duel") && (
                <div id="sec-quickduel" className="scroll-mt-16">
                    <QuickDuelStrip
                        userId={user?.id ?? ""}
                        initialHistory={initialCache.quickDuelHistory}
                        initialPlayers={initialCache.quickDuelPlayers}
                    />
                </div>
            )}

            {isVisible(activeFilter, "trivia") && (
                <div id="sec-trivia" className="scroll-mt-16">
                    <DailyTriviaCard />
                </div>
            )}

            {isVisible(activeFilter, "wars") && (
                <div id="sec-schoolwars" className="scroll-mt-16">
                    <SchoolWarsCard currentUserInstitution={profileState?.institution} />
                </div>
            )}

            {isVisible(activeFilter, "algo") && (
                <div id="sec-algorithm" className="scroll-mt-16">
                    <DeferredMount fallback={<SK h={320} />}>
                        <Algorithm />
                    </DeferredMount>
                </div>
            )}

            {isVisible(activeFilter, "dose") && (
                <div id="sec-dailydose" className="scroll-mt-16">
                    <DeferredMount fallback={<SK h={200} />}>
                        <DailyDose onOpenPlayer={() => (window as any).__studifyOpen?.()} />
                    </DeferredMount>
                </div>
            )}

            {/* Short paper 1 */}
            {isVisible(activeFilter, "papers") && (
                <div id="sec-paper1" className="scroll-mt-16">
                    <DeferredMount fallback={<SK h={240} />}>
                        <ShortPaper1 limit={5} />
                    </DeferredMount>
                </div>
            )}

            {/* ✅ Proctorium — now in the MIDDLE */}
            {isVisible(activeFilter, "papers") && (
                <div id="sec-proctorium" className="scroll-mt-16">
                    <StudentSimulationPapers
                        papers={simulationPapers}
                        progress={simulationProgress}
                        onOpenPaper={onOpenPaper}
                    />
                </div>
            )}

            {/* Short paper 2 */}
            {isVisible(activeFilter, "papers") && (
                <div id="sec-paper2" className="scroll-mt-16">
                    <DeferredMount fallback={<SK h={240} />}>
                        <ShortPaper2 limit={5} />
                    </DeferredMount>
                </div>
            )}
            {isVisible(activeFilter, "countdown") && (
                <div id="sec-countdown" className="scroll-mt-16">
                    <DeferredMount fallback={<SK h={200} />}>
                        <CountdownFloating />
                    </DeferredMount>
                </div>
            )}

            {isVisible(activeFilter, "leader") && (
                <div id="sec-leaderboard" className="scroll-mt-16">
                    <DeferredMount fallback={<SK h={400} />}>
                        <LeaderboardCard
                            topStudents={topStudents}
                            loadingTopStudents={loadingTopStudents}
                            setSelectedUserId={setSelectedUserId}
                            selectedUserId={selectedUserId}
                        />
                    </DeferredMount>
                </div>
            )}

            {isVisible(activeFilter, "practice") && (
                <div id="sec-practice" className="scroll-mt-16">
                    <DeferredMount fallback={<SK h={240} />}>
                        <ShortPractice limit={5} />
                    </DeferredMount>
                </div>
            )}
            {isVisible(activeFilter, "dailystatus") && (
                <div id="sec-dailystatus" className="scroll-mt-16">
                    <DeferredMount fallback={<SK h={140} />}>
                        <DailyStatus />
                    </DeferredMount>
                </div>
            )}
            {isVisible(activeFilter, "feed") && (
                <div id="sec-feed" className="scroll-mt-16">
                    <DeferredMount fallback={<SK h={200} />}>
                        <FeedSeenTop10 />
                    </DeferredMount>
                </div>
            )}


        </>
    );
}

/* ---------- Leaderboard Card (unchanged logic) ---------- */
function LeaderboardCard({
    topStudents, loadingTopStudents, setSelectedUserId, selectedUserId,
}: any) {
    return (
        <Card className="relative overflow-hidden rounded-2xl border-0 bg-white/50 dark:bg-muted/30 backdrop-blur-xl shadow-none mt-1">
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px] pointer-events-none" />
            <CardHeader className="relative z-10 pb-2">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Top Students
                    </CardTitle>
                    <Link
                        to="/Medrae-quizzes"
                        className="text-[11px] font-bold tracking-wider text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                        VIEW ALL →
                    </Link>
                </div>
                <details className="group mt-3 bg-slate-100/60 dark:bg-white/[0.04] rounded-xl border-0 overflow-hidden">
                    <summary className="cursor-pointer list-none p-3 flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 tracking-wider select-none">
                        <span>How winners are chosen</span>
                        <span className="transition-transform duration-200 group-open:rotate-180">▾</span>
                    </summary>
                    <div className="px-3 pb-3 pt-1 space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
                        <p>1. Star calculation: 90%+ → 5★, 75–89% → 4★, 60–74% → 3★, 40–59% → 2★, 1–39% → 1★</p>
                        <p>2. Tie-breakers: Total stars → Avg score → Units attempted</p>
                        <Button asChild className="w-full h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg">
                            <Link to="/Medrae-quizzes">IMPROVE MY RANK</Link>
                        </Button>
                    </div>
                </details>
            </CardHeader>

            <CardContent className="px-2 sm:px-3 relative z-10 pt-1 pb-2">
                {loadingTopStudents && topStudents.length === 0 ? (
                    <SkeletonLeaderboard count={5} />
                ) : topStudents.length > 0 ? (
                    <div className="flex flex-col">
                        {topStudents.map((s: any, idx: number) => {
                            const isTop3 = idx < 3;
                            const medals = ["🥇", "🥈", "🥉"];
                            return (
                                <button
                                    key={s.userid}
                                    onClick={() => setSelectedUserId(s.userid)}
                                    className="group flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-white/5 active:bg-slate-100 dark:active:bg-white/10"
                                >
                                    <img
                                        src={s.avatar_url || "/UsersAvatar.jpg"}
                                        alt={s.name}
                                        loading="lazy"
                                        decoding="async"
                                        className={`w-16 h-16 rounded-full object-cover shrink-0 ${isTop3 ? "ring-2 ring-yellow-400/60" : "ring-1 ring-slate-200 dark:ring-white/10"}`}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-[13px] text-slate-900 dark:text-white truncate leading-tight">
                                            {s.name || "Unknown"}
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                                            {s.institution || "Institution"}
                                        </p>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-2">
                                        <div className="w-6 text-center">
                                            {isTop3 ? (
                                                <span className="text-lg leading-none">{medals[idx]}</span>
                                            ) : (
                                                <span className="text-[11px] font-bold text-slate-400 tabular-nums">{idx + 1}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-50 dark:bg-yellow-500/10">
                                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                            <span className="text-[11px] font-bold text-yellow-700 dark:text-yellow-400 tabular-nums">{s.stars}</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-sm font-bold text-slate-500 tracking-wider">Competition Starting Soon...</p>
                    </div>
                )}
            </CardContent>

            <UserProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
        </Card>
    );
}