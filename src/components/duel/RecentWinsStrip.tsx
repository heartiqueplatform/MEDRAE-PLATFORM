import { memo } from "react";
import { Trophy } from "lucide-react";
import { useRecentWins } from "@/hooks/useRecentWins";

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

    if (!loading && wins.length === 0) return null;

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-1.5 px-1 mb-2">
                <Trophy size={12} className="text-amber-600 dark:text-amber-400" />
                <h3 className="text-[10px] font-bold uppercase tracking-wider
                               text-slate-500 dark:text-slate-400">
                    Recent wins
                </h3>
            </div>

            {/* Horizontal scroll — no visible bar */}
            <div
                className="flex gap-2 overflow-x-auto no-scrollbar overscroll-x-contain pb-1 -mx-1 px-1"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                {loading && wins.length === 0
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="shrink-0 w-[124px] h-[148px] rounded-2xl
                                       bg-white dark:bg-[#161b22]
                                       animate-pulse"
                        />
                    ))
                    : wins.map((w) => {
                        const isMe = w.winner_id === currentUserId;
                        return (
                            <button
                                key={w.challenge_id}
                                onClick={() => onSelectUser(w.winner_id)}
                                className={`shrink-0 w-[124px] min-h-[148px] rounded-2xl p-3 text-left
                                            transition-transform active:scale-[0.97]
                                            bg-white dark:bg-[#161b22]
                                            ${isMe
                                        ? "bg-amber-50 dark:bg-amber-400/10"
                                        : ""
                                    }`}
                                style={{ touchAction: "manipulation" }}
                            >
                                <div className="relative">
                                    <img
                                        src={w.winner_avatar || "/pwa-512x512.png"}
                                        alt={w.winner_name}
                                        loading="lazy"
                                        decoding="async"
                                        className="h-14 w-14 rounded-full object-cover mx-auto
                                                   bg-slate-100 dark:bg-white/[0.06]"
                                    />
                                    <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full
                                                     bg-amber-500 flex items-center justify-center
                                                     ring-2 ring-white dark:ring-[#161b22]">
                                        <Trophy size={10} className="text-white" strokeWidth={2.6} />
                                    </span>
                                </div>

                                <p className="mt-2 text-[11px] font-bold truncate text-center
                                              text-slate-900 dark:text-white">
                                    {isMe ? "You" : w.winner_name}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400
                                              text-center truncate mt-0.5">
                                    Won a clinical duel
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500
                                              text-center mt-0.5 tabular-nums">
                                    {relTime(w.won_at)}
                                </p>
                            </button>
                        );
                    })}
            </div>
        </div>
    );
});