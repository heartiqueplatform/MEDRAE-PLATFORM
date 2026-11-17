"use client";
import React from "react";
import { Play, CheckCircle2, X, Download, AlertCircle, EyeOff } from "lucide-react";
import { ReactionIcon } from "./ReactionIcon";
import { fmtTime, fmtDate, fmtBytes } from "./utils";

export const EpisodeRow = React.memo(function EpisodeRow({
    track, index, isActive, isPlaying, onSelect, isAdmin, onHide,
    progress = 0, downloaded = false,
    interaction, onToggleReaction,
    downloadState, downloadProgress = 0, onDownload, onCancelDownload, onRemoveDownload, downloadSize,
}: {
    track: {
        id?: string;
        name: string;
        src: string;
        artwork?: string;
        duration?: number;
        showTitle?: string;
        showId?: string;
        publishedAt?: string;
    };
    index: number;
    isActive: boolean;
    isPlaying: boolean;
    onSelect: () => void;
    isAdmin?: boolean;
    onHide?: () => void;
    progress?: number;
    downloaded?: boolean;
    interaction?: {
        liked: boolean; loved: boolean; saved: boolean;
        counts: { like: number; love: number; save: number };
        playCount: number;
    };
    onToggleReaction?: (kind: "like" | "love" | "save") => void;
    downloadState?: "idle" | "downloading" | "downloaded" | "error";
    downloadProgress?: number;
    onDownload?: () => void;
    onCancelDownload?: () => void;
    onRemoveDownload?: () => void;
    downloadSize?: number;
}) {
    const R = 22;
    const C = 2 * Math.PI * R;
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const dashOffset = C * (1 - clampedProgress);

    return (
        <div
            className={`group w-full mb-0 overflow-hidden transition-colors duration-150 border-b border-slate-100 dark:border-[#21262d] ${isActive
                ? "bg-blue-50/70 dark:bg-blue-950/30"
                : "bg-transparent"
                }`}
        >
            <button onClick={onSelect} className="w-full flex items-start gap-3 px-3 py-3.5 md:py-3 text-left">
                <div className="relative shrink-0 w-16 h-16 rounded-full overflow-hidden bg-gh-l-hover dark:bg-gh-hover">
                    {track.artwork ? (
                        <img src={track.artwork} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gh-l-muted dark:text-gh-muted text-[10px]">
                            {index + 1}
                        </div>
                    )}
                    {isActive && (
                        <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 48 48">
                                <circle cx="24" cy="24" r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
                                <circle cx="24" cy="24" r={R} fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={dashOffset} style={{ transition: "stroke-dashoffset 0.25s linear" }} />
                            </svg>
                            {isPlaying ? (
                                <div className="flex items-end gap-[2px] h-3 z-10">
                                    {[0, 1, 2].map((i) => (
                                        <span
                                            key={i}
                                            className="w-[2px] rounded-full bg-white animate-eq-bar"
                                            style={{
                                                animationDelay: `${i * 0.12}s`,
                                                height: 3,
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <Play size={14} fill="white" className="text-white z-10 ml-0.5" />
                            )}
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <p className={`text-[13px] font-bold leading-snug line-clamp-2 ${isActive ? "text-blue-700 dark:text-blue-300" : "text-gh-l-text dark:text-gh-text"}`}>
                        {track.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {track.showTitle && (
                            <span className="text-[10px] font-semibold text-gh-l-muted dark:text-gh-muted">
                                {track.showTitle}
                            </span>
                        )}
                        {track.duration && (
                            <>
                                <span className="text-[10px] text-gh-l-muted dark:text-gh-muted">·</span>
                                <span className="text-[10px] text-gh-l-muted dark:text-gh-muted">
                                    {fmtTime(track.duration)}
                                </span>
                            </>
                        )}
                        {track.publishedAt && (
                            <>
                                <span className="text-[10px] text-gh-l-muted dark:text-gh-muted">·</span>
                                <span className="text-[10px] text-gh-l-muted dark:text-gh-muted">
                                    {fmtDate(track.publishedAt)}
                                </span>
                            </>
                        )}
                        {downloaded && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-[8px] uppercase tracking-wider">
                                <CheckCircle2 size={8} />
                                Downloaded{downloadSize ? ` · ${fmtBytes(downloadSize)}` : ""}
                            </span>
                        )}
                        {interaction && interaction.playCount > 0 && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[8px] uppercase tracking-wider">
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M8.5 5.5v13a1 1 0 0 0 1.55.83l9.5-6.5a1 1 0 0 0 0-1.66l-9.5-6.5A1 1 0 0 0 8.5 5.5Z" />
                                </svg>
                                {interaction.playCount >= 1000
                                    ? `${(interaction.playCount / 1000).toFixed(1)}K`
                                    : interaction.playCount}{" "}
                                play{interaction.playCount === 1 ? "" : "s"}
                            </span>
                        )}
                    </div>
                </div>
            </button>

            <div className="flex items-center gap-1 px-1 pb-2 pt-0.5">
                <ReactionIcon kind="like" active={interaction?.liked ?? false} count={interaction?.counts.like ?? 0} onClick={() => onToggleReaction?.("like")} />
                <ReactionIcon kind="love" active={interaction?.loved ?? false} count={interaction?.counts.love ?? 0} onClick={() => onToggleReaction?.("love")} />
                <ReactionIcon kind="save" active={interaction?.saved ?? false} count={interaction?.counts.save ?? 0} onClick={() => onToggleReaction?.("save")} />

                {/* Download / cancel / remove */}
                {downloadState === "downloading" && onCancelDownload && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onCancelDownload(); }}
                        className="flex items-center justify-center gap-1 h-11 px-2 rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors touch-manipulation"
                        aria-label="Cancel download"
                    >
                        <X size={16} />
                        <span className="text-[10px] font-bold tabular-nums">
                            {Math.round(downloadProgress * 100)}%
                        </span>
                    </button>
                )}
                {downloadState === "downloaded" && onRemoveDownload && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemoveDownload(); }}
                        className="flex items-center justify-center h-11 w-11 rounded-full text-emerald-600 hover:text-red-600 transition-colors touch-manipulation"
                        aria-label="Remove download"
                        title="Remove download"
                    >
                        <CheckCircle2 size={18} fill="currentColor" strokeWidth={0} />
                    </button>
                )}
                {downloadState === "idle" && onDownload && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDownload(); }}
                        className="flex items-center justify-center gap-1 h-11 px-1.5 rounded-full text-gh-l-muted dark:text-gh-muted hover:text-gh-l-text dark:hover:text-gh-text transition-colors touch-manipulation"
                        aria-label={
                            track.duration
                                ? `Download for offline (~${Math.round((track.duration * 128000) / 8000000)} MB)`
                                : "Download for offline"
                        }
                        title={
                            track.duration
                                ? `~${Math.round((track.duration * 128000) / 8000000)} MB`
                                : "Download for offline"
                        }
                    >
                        <Download size={18} />
                    </button>
                )}
                {downloadState === "error" && onDownload && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDownload(); }}
                        className="flex items-center justify-center h-11 w-11 rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors touch-manipulation"
                        aria-label="Retry download"
                        title="Retry download"
                    >
                        <AlertCircle size={18} />
                    </button>
                )}

                {isAdmin && onHide && (
                    <button
                        onClick={onHide}
                        className="ml-auto flex items-center justify-center h-11 w-11 rounded-full text-gh-l-muted dark:text-gh-muted hover:text-red-600 active:scale-95 transition-all"
                        title="Hide this episode"
                        aria-label="Hide this episode"
                    >
                        <EyeOff size={18} />
                    </button>
                )}
            </div>
        </div>
    );
});