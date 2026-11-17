"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Repeat, SkipBack, SkipForward, Volume2, VolumeX,
    FilePlus, ListMusic, Headphones, Download,
} from "lucide-react";
import { VlcVolumeSlider } from "./VlcVolumeSlider";
import { EpisodeRow } from "./EpisodeRow";
import { fmtTime, fmtDate } from "./utils";

export const PlayerContent = React.memo(function PlayerContent(props: any) {
    const {
        artworkSrc, isPlaying, currentTrack, progress, currentTime, totalDuration,
        volume, muted, repeatActive, loading,
        onProgressClick, onTogglePlay, onPrev, onNext,
        onCycleRepeat, onToggleMute, onVolume, onUpload, onBrowse, onDownloads, episodeCount,
        totalEpisodesLabel, currentInteraction,
        visibleTracks, currentTrackSrc, onSelectTrack, onToggleReaction, getInteraction,
        getDownloadState, getDownloadProgress, onDownload, onCancelDownload,
        downloadCount,
    } = props;
    const showSkeleton = !currentTrack && (loading || (props?.visibleTracks?.length ?? 0) === 0);
    const [volOpen, setVolOpen] = useState(false);
    const volWrapRef = useRef<HTMLDivElement>(null);
    const hideTimerRef = useRef<number | null>(null);

    const openVol = useCallback(() => {
        if (hideTimerRef.current) {
            window.clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
        setVolOpen(true);
    }, []);

    const closeNow = useCallback(() => {
        if (hideTimerRef.current) {
            window.clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
        setVolOpen(false);
    }, []);

    useEffect(() => {
        if (!volOpen) return;
        const onDocClick = (e: MouseEvent | TouchEvent) => {
            if (!volWrapRef.current) return;
            if (!volWrapRef.current.contains(e.target as Node)) closeNow();
        };
        document.addEventListener("mousedown", onDocClick);
        document.addEventListener("touchstart", onDocClick);
        return () => {
            document.removeEventListener("mousedown", onDocClick);
            document.removeEventListener("touchstart", onDocClick);
        };
    }, [volOpen, closeNow]);

    useEffect(() => () => {
        if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    }, []);

    const effectiveVolume = muted ? 0 : volume;
    const volPct = Math.round(effectiveVolume * 100);

    if (showSkeleton) {
        return (
            <div className="w-full flex flex-col items-center animate-pulse">
                <div className="w-full max-w-[320px] md:max-w-[340px] aspect-square rounded-[2rem] bg-slate-200 dark:bg-gh-hover" />
                <div className="w-full mt-6 space-y-3">
                    <div className="h-4 rounded-full bg-slate-200 dark:bg-gh-hover mx-auto" style={{ width: "70%" }} />
                    <div className="h-3 rounded-full bg-slate-200 dark:bg-gh-hover mx-auto" style={{ width: "40%" }} />
                </div>
                <div className="w-full mt-6 h-1.5 rounded-full bg-slate-200 dark:bg-gh-hover" />
                <div className="w-full mt-8 flex items-center justify-between">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-gh-hover" />
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-gh-hover" />
                        <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-gh-hover" />
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-gh-hover" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-gh-hover" />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col">
            <div className="flex justify-center">
                <div className="relative w-[72vw] max-w-[320px] md:max-w-[340px] aspect-square rounded-[2rem] overflow-hidden bg-slate-100 dark:bg-gh-card">
                    {artworkSrc ? (
                        <img
                            src={artworkSrc}
                            alt={currentTrack?.showTitle ?? "Artwork"}
                            loading="lazy"
                            decoding="async"
                            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[6000ms] ease-out ${isPlaying ? "scale-105" : "scale-100"}`}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Headphones size={64} className="text-slate-400 dark:text-gh-muted" />
                        </div>
                    )}
                    {isPlaying && (
                        <div className="absolute bottom-4 left-4 flex items-end gap-1 h-6">
                            {[...Array(5)].map((_, i) => (
                                <motion.span
                                    key={i}
                                    animate={{ height: [6, 22, 10, 18, 6], opacity: [0.6, 1, 0.7, 1, 0.6] }}
                                    transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.08, ease: "easeInOut" }}
                                    className="w-1 rounded-full bg-white shadow"
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full mt-6">
                <div className="text-center">
                    <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-gh-text leading-snug line-clamp-2 px-2">
                        {currentTrack?.name || "Pick an episode"}
                    </h2>
                    <p className="mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                        {currentTrack?.showTitle ?? "Medrae"}
                    </p>
                    {currentTrack?.publishedAt && (
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-gh-muted">
                            {fmtDate(currentTrack.publishedAt)}
                        </p>
                    )}
                    {currentInteraction && currentInteraction.playCount > 0 && (
                        <p className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[10px] uppercase tracking-wider">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M8.5 5.5v13a1 1 0 0 0 1.55.83l9.5-6.5a1 1 0 0 0 0-1.66l-9.5-6.5A1 1 0 0 0 8.5 5.5Z" />
                            </svg>
                            {currentInteraction.playCount >= 1000
                                ? `${(currentInteraction.playCount / 1000).toFixed(1)}K`
                                : currentInteraction.playCount}{" "}
                            play{currentInteraction.playCount === 1 ? "" : "s"}
                        </p>
                    )}
                </div>

                <div className="w-full mt-5 flex items-center justify-between gap-2 min-w-0">
                    <button
                        onClick={onCycleRepeat}
                        className={`p-2.5 rounded-full transition-colors ${repeatActive
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                            : "text-slate-500 dark:text-gh-muted hover:bg-slate-100 dark:hover:bg-gh-hover"}`}
                    >
                        <Repeat size={18} />
                    </button>

                    <div className="flex items-center gap-2 sm:gap-4 md:gap-5 shrink-0">
                        <button
                            onClick={onPrev}
                            className="p-2 sm:p-3 rounded-full text-slate-700 dark:text-gh-text hover:bg-slate-100 dark:hover:bg-gh-hover transition-colors"
                        >
                            <SkipBack fill="currentColor" size={22} className="sm:w-[26px] sm:h-[26px]" />
                        </button>
                        <button
                            onClick={onTogglePlay}
                            aria-label={isPlaying ? "Pause" : "Play"}
                            className="relative active:scale-95 transition-transform w-[88px] h-[88px] sm:w-[112px] sm:h-[112px] md:w-[128px] md:h-[128px]"
                        >
                            {(() => {
                                const safeProgress = Math.max(0, Math.min(1, Number(progress) || 0));
                                return (
                                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none -rotate-90" aria-hidden="true">
                                        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="5" className="text-slate-200 dark:text-[#21262d]" />
                                        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" pathLength={100} strokeDasharray="100" strokeDashoffset={100 - safeProgress * 100} className="text-blue-600 dark:text-blue-500 transition-[stroke-dashoffset] duration-150" />
                                    </svg>
                                );
                            })()}
                            <span className="absolute inset-[11%] rounded-full bg-gradient-to-br from-slate-100 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center shadow-lg shadow-black/10 dark:shadow-black/40">
                                {isPlaying ? (
                                    <svg width="30" height="30" viewBox="0 0 24 24" className="text-slate-900 dark:text-white ml-1" fill="currentColor">
                                        <rect x="7" y="5" width="3.5" height="14" rx="1.5" />
                                        <rect x="13.5" y="5" width="3.5" height="14" rx="1.5" />
                                    </svg>
                                ) : (
                                    <svg width="30" height="30" viewBox="0 0 24 24" className="text-slate-900 dark:text-white ml-1" fill="currentColor">
                                        <path d="M8 5.5v13a1 1 0 0 0 1.55.83l9.5-6.5a1 1 0 0 0 0-1.66l-9.5-6.5A1 1 0 0 0 8 5.5Z" />
                                    </svg>
                                )}
                            </span>
                        </button>
                        <button
                            onClick={onNext}
                            className="p-2 sm:p-3 rounded-full text-slate-700 dark:text-gh-text hover:bg-slate-100 dark:hover:bg-gh-hover transition-colors"
                        >
                            <SkipForward fill="currentColor" size={22} className="sm:w-[26px] sm:h-[26px]" />
                        </button>
                    </div>

                    <div ref={volWrapRef} className="relative">
                        <button
                            onClick={() => (volOpen ? closeNow() : openVol())}
                            className="p-2.5 rounded-full text-slate-500 dark:text-gh-muted hover:bg-slate-100 dark:hover:bg-gh-hover transition-colors touch-manipulation"
                            aria-label={volOpen ? "Close volume" : "Adjust volume"}
                            aria-expanded={volOpen}
                        >
                            {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>

                        <AnimatePresence>
                            {volOpen && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.12 }}
                                        className="fixed inset-0 z-40 md:hidden"
                                        onClick={closeNow}
                                        aria-hidden="true"
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                        className="absolute bottom-full mb-3 z-50 right-0 md:left-1/2 md:right-auto md:-translate-x-1/2 max-w-[calc(100vw-1.5rem)] flex flex-col items-center gap-2 rounded-xl bg-white dark:bg-gh-card ring-1 ring-slate-200 dark:ring-white/10 p-3 touch-manipulation"
                                    >
                                        <span className="text-[10px] tabular-nums text-slate-500 dark:text-gh-muted">
                                            {volPct}%
                                        </span>
                                        <VlcVolumeSlider
                                            value={effectiveVolume}
                                            onChange={(v) => {
                                                if (v > 0 && muted) onToggleMute();
                                                onVolume(v);
                                            }}
                                            onInteract={openVol}
                                        />
                                        <button
                                            onClick={onToggleMute}
                                            className="mt-1 p-1.5 rounded-full text-slate-500 dark:text-gh-muted hover:bg-slate-100 dark:hover:bg-gh-hover transition-colors touch-manipulation"
                                            aria-label={muted ? "Unmute" : "Mute"}
                                        >
                                            {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="w-full mt-3 flex justify-between text-[10px] md:text-xs font-semibold text-slate-500 dark:text-gh-muted">
                    <span>{fmtTime(currentTime)}</span>
                    <span>{fmtTime(totalDuration || currentTrack?.duration)}</span>
                </div>

                <div className="w-full mt-4 flex items-center justify-end gap-2">
                    {onDownloads && (
                        <button
                            onClick={onDownloads}
                            className="flex items-center gap-1.5 text-slate-500 dark:text-gh-muted hover:text-blue-600 transition-colors text-[10px] font-bold uppercase tracking-widest"
                        >
                            <Download size={14} />
                            <span>{downloadCount > 0 ? `Offline (${downloadCount})` : "Offline"}</span>
                        </button>
                    )}
                    <label className="flex items-center gap-1.5 text-slate-500 dark:text-gh-muted hover:text-blue-600 cursor-pointer transition-colors text-[10px] font-bold uppercase tracking-widest">
                        <FilePlus size={14} />
                        <span className="hidden sm:inline">Add</span>
                        <input type="file" accept="audio/*" multiple onChange={onUpload} className="hidden" />
                    </label>
                </div>

                {onBrowse && (
                    <div className="mt-5">
                        <button
                            onClick={onBrowse}
                            className="md:hidden w-full py-3 px-4 rounded-2xl bg-slate-100 dark:bg-gh-hover hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-between text-slate-800 dark:text-gh-text"
                        >
                            <span className="flex items-center gap-2 text-sm font-bold">
                                <ListMusic size={16} className="text-blue-600" />
                                Browse all episodes
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-gh-muted bg-white dark:bg-gh-canvas px-2 py-0.5 rounded-full">
                                {totalEpisodesLabel}
                            </span>
                        </button>

                        {Array.isArray(visibleTracks) && visibleTracks.length > 0 && (
                            <div className="md:hidden mt-4">
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <h3 className="text-[11px] uppercase tracking-widest font-bold text-slate-500 dark:text-gh-muted">
                                        Up Next
                                    </h3>
                                    <span className="text-[10px] font-semibold text-slate-400 dark:text-gh-muted">
                                        {visibleTracks.length} episode{visibleTracks.length === 1 ? "" : "s"}
                                    </span>
                                </div>
                                <div className="space-y-1.5 max-h-[45vh] overflow-y-auto custom-scrollbar pr-1">
                                    {visibleTracks.slice(0, 5).map((t: any, i: number) => {
                                        const isThisActive = currentTrackSrc === t.src;
                                        return (
                                            <EpisodeRow
                                                key={t.id || i}
                                                track={t}
                                                index={i}
                                                isActive={isThisActive}
                                                isPlaying={isPlaying && isThisActive}
                                                progress={isThisActive ? progress : 0}
                                                downloaded={!!t.downloaded}
                                                onSelect={() => onSelectTrack?.(t)}
                                                isAdmin={false}
                                                onHide={() => { }}
                                                interaction={t.id ? getInteraction?.("episode", t.id) : undefined}
                                                onToggleReaction={
                                                    t.id && onToggleReaction
                                                        ? (kind: "like" | "love" | "save") =>
                                                            onToggleReaction("episode", t.id, kind)
                                                        : undefined
                                                }
                                                downloadState={t.id ? getDownloadState?.(t.id) : undefined}
                                                downloadProgress={t.id ? getDownloadProgress?.(t.id) ?? 0 : 0}
                                                onDownload={t.id && onDownload ? () => onDownload(t) : undefined}
                                                onCancelDownload={t.id && onCancelDownload ? () => onCancelDownload(t.id) : undefined}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});