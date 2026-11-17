"use client";
import React from "react";
import { Play, X } from "lucide-react";
import { fmtTime } from "./utils";
import type { HistoryEntry } from "../MusicPlayerProvider";

export const ContinueListeningRow = React.memo(function ContinueListeningRow({
    entry,
    onResume,
    onRemove,
}: {
    entry: HistoryEntry;
    onResume: () => void;
    onRemove: () => void;
}) {
    const pct = entry.duration
        ? Math.min(100, Math.round((entry.position / entry.duration) * 100))
        : 0;
    const remaining = entry.duration
        ? Math.max(0, entry.duration - entry.position)
        : 0;

    const relTime = (() => {
        const diff = Date.now() - entry.lastPlayedAt;
        const m = Math.floor(diff / 60000);
        if (m < 1) return "just now";
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        const d = Math.floor(h / 24);
        if (d === 1) return "yesterday";
        if (d < 7) return `${d}d ago`;
        return new Date(entry.lastPlayedAt).toLocaleDateString();
    })();

    return (
        <div className="group relative w-full rounded-2xl bg-gh-l-card dark:bg-gh-card overflow-hidden mb-2">
            <button onClick={onResume} className="w-full flex items-center gap-3 p-3 text-left hover:bg-gh-l-hover dark:hover:bg-gh-hover transition-colors">
                <div className="relative shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gh-l-hover dark:bg-gh-hover">
                    {entry.artwork ? (
                        <img src={entry.artwork} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gh-l-muted dark:text-gh-muted text-[10px]">▶</div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={18} fill="white" className="text-white ml-0.5" />
                    </div>
                    {pct > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                            <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold truncate text-gh-l-text dark:text-gh-text">
                        {entry.name}
                    </p>
                    <p className="text-[10px] truncate text-gh-l-muted dark:text-gh-muted mt-0.5">
                        {entry.showTitle ? `${entry.showTitle} · ` : ""}
                        {remaining > 0 ? `${fmtTime(remaining)} left` : "Finished"}
                        {" · "}
                        {relTime}
                    </p>
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    {entry.position > 5 ? "Resume" : "Play"}
                </span>
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 text-gh-l-muted dark:text-gh-muted hover:text-red-600 transition-all"
                aria-label="Remove from history"
            >
                <X size={14} />
            </button>
        </div>
    );
});