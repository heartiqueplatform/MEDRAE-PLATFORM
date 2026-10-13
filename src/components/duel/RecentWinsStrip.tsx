import { memo } from "react";
import { Trophy, Flame } from "lucide-react";
import { useRecentWins, type RecentWin } from "@/hooks/useRecentWins";

function relTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d === 1) return "yesterday";
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
}

export const RecentWinsStrip = memo(function RecentWinsStrip({
    onSelectUser,
    currentUserId,
}: {
    onSelectUser: (userId: string) => void;
    currentUserId?: string;
}) {
    const { wins, loading } = useRecentWins();

    // Don't render anything if there's nothing to show
    if (!loading && wins.length === 0) return null;

    return (
        <div className="mb-4">
            <div className="flex items-center gap-2 px-3 md:px-0 mb-2">
                <Trophy size={13} className="text-amber-500" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Recent wins
                </h3>
            </div>

            <div className="flex gap-2.5 overflow-x-auto custom-scrollbar pb-2 px-3 md:px-0">
                {loading && wins.length === 0
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="shrink-0 w-[132px] h-[150px] rounded-2xl bg-slate-100 dark:bg-slate-800/40 animate-pulse"
                        />
                    ))
                    : wins.map((w) => {
                        const isMe = w.winner_id === currentUserId;
                        return (
                            <button
                                key={w.challenge_id}
                                onClick={() => onSelectUser(w.winner_id)}
                                className={`
                    shrink-0 w-[132px] rounded-2xl p-3 text-left
                    transition-all active:scale-[0.97]
                    bg-white dark:bg-slate-900
                    border ${isMe
                                        ? "border-amber-400/60 ring-1 ring-amber-400/30"
                                        : "border-slate-100 dark:border-slate-800"}
                  `}
                            >
                                <div className="relative">
                                    <img
                                        src={w.winner_avatar || "/pwa-512x512.png"}
                                        alt={w.winner_name}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-14 h-14 rounded-full object-cover mx-auto"
                                    />
                                    {/* Trophy mini-badge on the avatar */}
                                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center border-2 border-white dark:border-slate-900">
                                        <Trophy size={10} className="text-white" />
                                    </span>
                                </div>

                                <p className="mt-2 text-[11px] font-bold text-slate-900 dark:text-white truncate text-center">
                                    {isMe ? "You" : w.winner_name}
                                </p>
                                <p className="text-[9px] text-slate-400 text-center truncate mt-0.5">
                                    Won a Clinical Duel
                                </p>
                                <p className="text-[9px] text-slate-400 text-center mt-0.5">
                                    {relTime(w.won_at)}
                                </p>
                            </button>
                        );
                    })}
            </div>
        </div>
    );
});