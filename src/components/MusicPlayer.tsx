"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown, ChevronLeft, SkipBack, Play, Pause, SkipForward,
    Repeat, Volume2, VolumeX, FilePlus, ListMusic,
    Plus, Loader2, CheckCircle2, AlertCircle, ThumbsUp, Trash2, Headphones, EyeOff
} from 'lucide-react';
import { useMusicPlayer } from "./MusicPlayerProvider";
import { usePodcastShows } from "@/hooks/usePodcastShows";
import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect, useMemo } from "react";

interface Track {
    id?: string;
    name: string;
    src: string;
    artwork?: string;
    duration?: number;
    showTitle?: string;
    showId?: string;
    publishedAt?: string;
}

// Global bridge so any component can open Studify
declare global {
    interface Window {
        __studifyOpen?: (screen?: "player" | "episodes" | "admin") => void;
    }
}

type Screen = "player" | "episodes" | "admin";

// ─── helpers ───
function fmtTime(seconds?: number) {
    if (!seconds || !isFinite(seconds)) return "--:--";
    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
}

function fmtDate(iso?: string) {
    if (!iso) return "";
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            year: "numeric", month: "short", day: "numeric",
        });
    } catch { return ""; }
}

const ADMIN_ID = "25f37970-c9b9-4c15-b8a2-514a912e3261";

function extractAppleId(input: string): string | null {
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) return trimmed;
    const m = trimmed.match(/id(\d+)/);
    return m ? m[1] : null;
}

export const MusicPlayer = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [screen, setScreen] = useState<Screen>("player");

    // ---- global opener (no flicker) ----
    useEffect(() => {
        window.__studifyOpen = (target: "player" | "episodes" | "admin" = "player") => {
            setIsOpen(true);
            requestAnimationFrame(() => setScreen(target));
        };
        return () => { window.__studifyOpen = undefined; };
    }, []);

    const [currentTime, setCurrentTime] = useState(0);
    const [totalTime, setTotalTime] = useState(0);
    const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
    const [showTracks, setShowTracks] = useState<Track[] | null>(null);       // ← NEW
    const [showTracksLoading, setShowTracksLoading] = useState(false);        // ← NEW

    const [userId, setUserId] = useState<string | null>(null);
    const [importInput, setImportInput] = useState("");
    const [importing, setImporting] = useState(false);
    const [importMsg, setImportMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [confirmHide, setConfirmHide] = useState<string | null>(null);

    const {
        tracks, currentIndex, isPlaying, volume, muted, repeatMode, progress,
        loading,
        audioRef, setTracks, setCurrentIndex, togglePlay,
        setVolume, setMuted, setRepeatMode, setProgress,
        refreshEpisodes,
        fetchShowEpisodes,
    } = useMusicPlayer();

    const { shows, refresh: refreshShows, toggleEndorse, deleteShow } = usePodcastShows();

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    }, []);
    const isAdmin = userId === ADMIN_ID;

    // ---- live time ----
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onTime = () => {
            setCurrentTime(audio.currentTime);
            setTotalTime(audio.duration || 0);
            setProgress(audio.currentTime / (audio.duration || 1));
        };
        const onLoaded = () => setTotalTime(audio.duration || 0);
        audio.addEventListener("timeupdate", onTime);
        audio.addEventListener("loadedmetadata", onLoaded);
        audio.addEventListener("durationchange", onLoaded);
        return () => {
            audio.removeEventListener("timeupdate", onTime);
            audio.removeEventListener("loadedmetadata", onLoaded);
            audio.removeEventListener("durationchange", onLoaded);
        };
    }, [audioRef, setProgress]);

    // ---- play/pause/volume ----
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = volume;
        audio.muted = muted;
        if (isPlaying && tracks[currentIndex]?.src) audio.play().catch(() => { });
        else audio.pause();
    }, [isPlaying, currentIndex, volume, muted, tracks, audioRef]);

    // ---- progress & end ----
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const handleEnded = () => {
            if (repeatMode === "one") { audio.currentTime = 0; audio.play(); }
            else if (repeatMode === "all") setCurrentIndex((p) => (p + 1) % Math.max(tracks.length, 1));
            else if (currentIndex < tracks.length - 1) setCurrentIndex((p) => p + 1);
            else togglePlay(false);
        };
        audio.addEventListener("ended", handleEnded);
        return () => audio.removeEventListener("ended", handleEnded);
    }, [currentIndex, repeatMode, tracks.length, setCurrentIndex, togglePlay, audioRef]);

    // ---- body scroll lock ----
    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) setTimeout(() => setScreen("player"), 250);
    }, [isOpen]);

    // ---- keyboard ----
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (screen !== "player") setScreen("player");
                else setIsOpen(false);
            }
            if (e.key === " " && screen === "player") {
                e.preventDefault();
                togglePlay();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, screen, togglePlay]);

    const currentTrack = tracks[currentIndex];
    const artworkSrc = currentTrack?.artwork || "";
    const totalDuration = useMemo(
        () => (totalTime > 0 ? totalTime : currentTrack?.duration ?? 0),
        [totalTime, currentTrack?.duration]
    );
    const visibleTracks = useMemo(() => {
        if (!selectedShowId) return tracks;                          // "All" → capped 200
        if (showTracks) return showTracks;                           // specific show → full list
        return tracks.filter((t) => t.showId === selectedShowId);    // fallback (still filtering)
    }, [tracks, selectedShowId, showTracks]);

    // ── NEW: on-demand fetch when a show chip is picked ──
    const handleSelectShow = async (showId: string | null) => {
        setSelectedShowId(showId);
        if (!showId) {
            setShowTracks(null);
            return;
        }
        setShowTracksLoading(true);
        const rows = await fetchShowEpisodes(showId);
        setShowTracks(rows);
        setShowTracksLoading(false);
    };

    // ---- handlers ----
    const handleNext = () => setCurrentIndex((p) => (p + 1) % Math.max(tracks.length, 1));
    const handlePrev = () => setCurrentIndex((p) => (p - 1 + tracks.length) % Math.max(tracks.length, 1));
    const handleToggleMute = () => setMuted((p) => !p);
    const handleCycleRepeat = () =>
        setRepeatMode((p) => (p === "off" ? "all" : p === "all" ? "one" : "off"));
    const handleSelectTrack = (globalIndex: number) => {
        setCurrentIndex(globalIndex);
        togglePlay(true);
        if (window.innerWidth < 768) setScreen("player");
    };

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        Array.from(e.target.files)
            .filter((f) => f.type.startsWith("audio/"))
            .forEach((file) => {
                if (file.size <= 2 * 1024 * 1024) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const base64 = ev.target?.result as string;
                        setTracks((prev) => [...prev, { name: file.name, src: base64 }]);
                    };
                    reader.readAsDataURL(file);
                } else {
                    const url = URL.createObjectURL(file);
                    setTracks((prev) => [...prev, { name: file.name, src: url }]);
                }
            });
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        audioRef.current.currentTime = ratio * (audioRef.current.duration || 0);
    };

    async function handleImport() {
        setImportMsg(null);
        const appleId = extractAppleId(importInput);
        if (!appleId) {
            setImportMsg({ kind: "err", text: "Could not find a numeric Apple ID." });
            return;
        }
        setImporting(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            if (!token) {
                setImportMsg({ kind: "err", text: "No session." });
                return;
            }
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-podcast`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ appleId }),
                }
            );
            const json = await res.json();
            if (!res.ok) {
                setImportMsg({ kind: "err", text: `${res.status}: ${json.error ?? "failed"}` });
            } else {
                setImportMsg({ kind: "ok", text: `Imported "${json.title}" — ${json.episodeCount} episodes` });
                setImportInput("");
                await refreshEpisodes({ silent: true });
                await refreshShows({ silent: true });
            }
        } catch (e: any) {
            setImportMsg({ kind: "err", text: String(e?.message ?? e) });
        } finally {
            setImporting(false);
        }
    }

    async function handleDeleteShow(showId: string) {
        const ok = await deleteShow(showId);
        if (ok) {
            await refreshEpisodes({ silent: true });
            setConfirmDelete(null);
        }
    }

    async function handleHideEpisode(episodeId: string) {
        const { error } = await supabase
            .from("podcast_episodes")
            .update({ is_hidden: true })
            .eq("id", episodeId);
        if (error) {
            console.error("hide episode:", error);
            return;
        }
        setConfirmHide(null);
        await refreshEpisodes({ silent: true });
    }

    /* ── Shared UI blocks ── */
    const playerEl = (
        <PlayerContent
            artworkSrc={artworkSrc}
            isPlaying={isPlaying}
            currentTrack={currentTrack}
            progress={progress}
            currentTime={currentTime}
            totalDuration={totalDuration}
            volume={volume}
            muted={muted}
            repeatActive={repeatMode !== "off"}
            loading={loading}
            onProgressClick={handleProgressClick}
            onTogglePlay={() => togglePlay()}
            onPrev={handlePrev}
            onNext={handleNext}
            onCycleRepeat={handleCycleRepeat}
            onToggleMute={handleToggleMute}
            onVolume={(v) => setVolume(v)}
            onUpload={handleUpload}
            onBrowse={() => setScreen("episodes")}
            episodeCount={tracks.length}
        />
    );

    const listEl = (
        <EpisodesContent
            visibleTracks={visibleTracks}
            currentTrackSrc={currentTrack?.src}
            isPlaying={isPlaying}
            loading={loading || showTracksLoading}
            selectedShowId={selectedShowId}
            onSelectShow={handleSelectShow}
            onSelectTrack={(idx) => {
                const t = visibleTracks[idx];
                const globalIdx = tracks.findIndex((x) => x.src === t.src);
                handleSelectTrack(globalIdx >= 0 ? globalIdx : idx);
            }}
            shows={shows}
            onToggleEndorse={toggleEndorse}
            isAdmin={isAdmin}
            onManage={() => setScreen("admin")}
            onHideEpisode={(id) => setConfirmHide(id)}
        />
    );

    return (
        <>
            <audio ref={audioRef} src={currentTrack?.src} crossOrigin="anonymous" />

            {/* ── SIDE TAB ── */}
            <div className="fixed top-1/4 -translate-y-1/2 right-0 z-40 group">
                <motion.div
                    initial={{ x: "85%" }}
                    whileHover={{ x: "0%" }}
                    animate={{ x: isPlaying ? "0%" : "55%" }}
                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                    className="relative flex items-center"
                >
                    <AnimatePresence>
                        {isPlaying && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: -12 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="absolute right-full hidden md:block"
                            >
                                <div className="bg-white dark:bg-gh-card px-4 py-2 rounded-2xl shadow-2xl shadow-black/25 min-w-[150px]">
                                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest block mb-1">
                                        Now Playing
                                    </span>
                                    <div className="w-28 overflow-hidden">
                                        <div className="animate-marquee text-[10px] font-bold text-black dark:text-gh-text whitespace-nowrap">
                                            {currentTrack?.name || "Medrae Podcast"}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex items-center bg-slate-200 dark:bg-gh-card p-2 rounded-l-3xl shadow-[-10px_0_30px_rgba(0,0,0,0.18)] transition-colors hover:bg-slate-300 dark:hover:bg-gh-hover"
                    >
                        <div className="relative h-14 w-14 flex items-center justify-center">
                            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-400/20" />
                                <motion.circle
                                    cx="50" cy="50" r="46"
                                    fill="none" stroke="currentColor" strokeWidth="6"
                                    strokeDasharray="290"
                                    style={{ strokeDashoffset: 290 - (290 * progress) }}
                                    className="text-blue-500"
                                />
                            </svg>
                            <div className={`h-11 w-11 rounded-full overflow-hidden relative ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                                <div className="absolute inset-0 bg-[radial-gradient(circle,_transparent_40%,_rgba(0,0,0,0.4)_100%)] z-10" />
                                <img src="/music.png" alt="Studify" className="w-full h-full object-cover" />
                            </div>
                            {isPlaying && (
                                <span className="absolute -top-1 -left-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                </span>
                            )}
                        </div>
                        <div className="ml-2 flex flex-col gap-1 pr-1 opacity-40 group-hover:opacity-100 transition-opacity">
                            <div className="w-1 h-1 bg-slate-700 dark:bg-gh-text rounded-full"></div>
                            <div className="w-1 h-1 bg-slate-700 dark:bg-gh-text rounded-full"></div>
                            <div className="w-1 h-1 bg-slate-700 dark:bg-gh-text rounded-full"></div>
                        </div>
                    </button>
                </motion.div>
            </div>

            {/* ── FULLSCREEN ── */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-[2147483647] bg-gh-l-canvas dark:bg-gh-canvas overflow-hidden"
                    >
                        <div className="h-full w-full flex flex-col">

                            {/* MOBILE top bar */}
                            <div className="md:hidden flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
                                {screen === "admin" ? (
                                    <button
                                        onClick={() => setScreen("player")}
                                        className="flex items-center gap-1.5 p-2 pr-3 rounded-full hover:bg-black/5 dark:hover:bg-gh-hover transition-colors text-gh-l-text dark:text-gh-text"
                                        aria-label="Back"
                                    >
                                        <ChevronLeft size={22} />
                                        <span className="text-xs font-bold">Back</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-gh-hover transition-colors text-gh-l-text dark:text-gh-text"
                                        aria-label="Close"
                                    >
                                        <ChevronDown size={22} />
                                    </button>
                                )}
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-black tracking-[0.3em] text-blue-600 dark:text-blue-400 uppercase">
                                        {screen === "player" && "Studify"}
                                        {screen === "episodes" && "Episodes"}
                                        {screen === "admin" && "Manage Podcasts"}
                                    </span>
                                    <span className="text-[9px] text-gh-l-muted dark:text-gh-muted font-semibold">
                                        {screen === "player" && (currentTrack?.showTitle ?? "Nursing Audio")}
                                        {screen === "episodes" && `${visibleTracks.length} available`}
                                        {screen === "admin" && `${shows.length} show${shows.length !== 1 ? "s" : ""}`}
                                    </span>
                                </div>
                                {screen === "player" && isAdmin ? (
                                    <button onClick={() => setScreen("admin")} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-gh-hover transition-colors text-blue-600 dark:text-blue-400">
                                        <Plus size={22} />
                                    </button>
                                ) : <div className="w-9" />}
                            </div>

                            {/* DESKTOP top bar */}
                            <div className="hidden md:flex items-center justify-between px-5 pt-4 pb-3 shrink-0 border-b border-gh-l-border dark:border-gh-border">
                                <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-gh-hover transition-colors text-gh-l-text dark:text-gh-text">
                                    <ChevronDown size={22} />
                                </button>

                                <div className="flex items-center gap-3">
                                    <span className="text-[11px] font-black tracking-[0.3em] text-blue-600 dark:text-blue-400 uppercase">
                                        Studify
                                    </span>
                                    <span className="text-[10px] text-gh-l-muted dark:text-gh-muted font-semibold">
                                        · {currentTrack?.showTitle ?? "Nursing Audio"}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {isAdmin && (
                                        <button
                                            onClick={() => setScreen(screen === "admin" ? "player" : "admin")}
                                            className={`p-2 rounded-full transition-colors ${screen === "admin"
                                                ? "bg-blue-600 text-white"
                                                : "hover:bg-black/5 dark:hover:bg-gh-hover text-blue-600 dark:text-blue-400"
                                                }`}
                                            title={screen === "admin" ? "Close admin" : "Manage podcasts"}
                                        >
                                            {screen === "admin" ? <ChevronLeft size={20} /> : <Plus size={20} />}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* DESKTOP: two columns edge-to-edge */}
                            <div className="hidden md:grid flex-1 min-h-0 grid-cols-[42%_58%]">
                                {/* LEFT — player card / admin card */}
                                <div className="min-h-0 overflow-y-auto custom-scrollbar p-4 md:p-5 border-0">
                                    {screen === "admin" ? (
                                        <div className="w-full rounded-xl bg-gh-l-card dark:bg-gh-card shadow-none p-4 md:p-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <h2 className="text-sm font-black text-gh-l-text dark:text-gh-text">
                                                    Manage Podcasts
                                                </h2>
                                                <button
                                                    onClick={() => setScreen("player")}
                                                    className="px-3 py-1.5 rounded-lg bg-gh-l-hover dark:bg-gh-hover text-xs font-bold text-gh-l-text dark:text-gh-text hover:opacity-90 transition-opacity"
                                                >
                                                    Done
                                                </button>
                                            </div>
                                            <AdminContent
                                                shows={shows}
                                                importInput={importInput}
                                                setImportInput={setImportInput}
                                                onImport={handleImport}
                                                importing={importing}
                                                importMsg={importMsg}
                                                onDelete={handleDeleteShow}
                                                confirmDelete={confirmDelete}
                                                setConfirmDelete={setConfirmDelete}
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full rounded-xl bg-gh-l-card dark:bg-gh-card shadow-0 p-4 md:p-5">
                                            {playerEl}
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT — list */}
                                <div className="min-h-0 overflow-hidden flex flex-col">
                                    {listEl}
                                </div>
                            </div>

                            {/* MOBILE — one screen at a time, opaque, no black flash */}
                            <div className="md:hidden flex-1 min-h-0 relative">
                                <AnimatePresence mode="popLayout" initial={false}>
                                    {screen === "player" && (
                                        <motion.div
                                            key="m-player"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.16 }}
                                            className="absolute inset-0 overflow-y-auto custom-scrollbar p-4 bg-gh-l-canvas dark:bg-gh-canvas"
                                        >
                                            <div className="w-full rounded-xl bg-gh-l-card dark:bg-gh-card shadow-none p-4">
                                                {playerEl}
                                            </div>
                                        </motion.div>
                                    )}

                                    {screen === "episodes" && (
                                        <motion.div
                                            key="m-episodes"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.16 }}
                                            className="absolute inset-0 bg-gh-l-canvas dark:bg-gh-canvas"
                                        >
                                            {listEl}
                                        </motion.div>
                                    )}

                                    {screen === "admin" && isAdmin && (
                                        <motion.div
                                            key="m-admin"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.16 }}
                                            className="absolute inset-0 overflow-y-auto custom-scrollbar p-4 bg-gh-l-canvas dark:bg-gh-canvas"
                                        >
                                            <div className="w-full rounded-xl bg-gh-l-card dark:bg-gh-card p-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h2 className="text-sm font-black text-gh-l-text dark:text-gh-text">
                                                        Manage Podcasts
                                                    </h2>
                                                    <button
                                                        onClick={() => setScreen("player")}
                                                        className="px-3 py-1.5 rounded-lg bg-gh-l-hover dark:bg-gh-hover text-xs font-bold text-gh-l-text dark:text-gh-text"
                                                    >
                                                        Done
                                                    </button>
                                                </div>
                                                <AdminContent
                                                    shows={shows}
                                                    importInput={importInput}
                                                    setImportInput={setImportInput}
                                                    onImport={handleImport}
                                                    importing={importing}
                                                    importMsg={importMsg}
                                                    onDelete={handleDeleteShow}
                                                    confirmDelete={confirmDelete}
                                                    setConfirmDelete={setConfirmDelete}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Hide-episode confirm */}
                        <AnimatePresence>
                            {confirmHide && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                                    onClick={() => setConfirmHide(null)}
                                >
                                    <motion.div
                                        initial={{ scale: 0.95, y: 10 }}
                                        animate={{ scale: 1, y: 0 }}
                                        exit={{ scale: 0.95, y: 10 }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="bg-gh-l-canvas dark:bg-gh-card rounded-2xl shadow-0 p-5 w-full max-w-sm"
                                    >
                                        <h3 className="text-sm font-black text-gh-l-text dark:text-gh-text mb-1">
                                            Hide this episode?
                                        </h3>
                                        <p className="text-xs text-gh-l-muted dark:text-gh-muted mb-4">
                                            It will be removed from the list for everyone. You can bring it back later from the database.
                                        </p>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setConfirmHide(null)}
                                                className="px-4 py-2 rounded-xl bg-gh-l-hover dark:bg-gh-hover text-xs font-bold text-gh-l-text dark:text-gh-text"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleHideEpisode(confirmHide)}
                                                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500"
                                            >
                                                Hide
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
            <style>{`
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .animate-marquee { display: inline-block; white-space: nowrap; padding-left: 100%; animation: marquee 8s linear infinite; }
    @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }

    /* Invisible scrollbar everywhere — no track, no thumb, no width */
    .custom-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
    .custom-scrollbar::-webkit-scrollbar { width: 0; height: 0; display: none; }

    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
`}</style>
        </>
    );
};

/* ═══════════ PLAYER CONTENT ═══════════ */
function PlayerContent(props: any) {
    const {
        artworkSrc, isPlaying, currentTrack, progress, currentTime, totalDuration,
        volume, muted, repeatActive, loading,
        onProgressClick, onTogglePlay, onPrev, onNext,
        onCycleRepeat, onToggleMute, onVolume, onUpload, onBrowse, episodeCount,
    } = props;

    const showSkeleton = loading && !currentTrack;

    if (showSkeleton) {
        return (
            <div className="w-full flex flex-col items-center animate-pulse">
                <div className="w-full max-w-[320px] md:max-w-[340px] aspect-square rounded-[2rem] bg-gh-l-hover dark:bg-gh-hover" />
                <div className="w-full mt-6 space-y-3">
                    <div className="h-4 rounded-full bg-gh-l-hover dark:bg-gh-hover mx-auto" style={{ width: "70%" }} />
                    <div className="h-3 rounded-full bg-gh-l-hover dark:bg-gh-hover mx-auto" style={{ width: "40%" }} />
                </div>
                <div className="w-full mt-6 h-1.5 rounded-full bg-gh-l-hover dark:bg-gh-hover" />
                <div className="w-full mt-8 flex items-center justify-between">
                    <div className="w-8 h-8 rounded-full bg-gh-l-hover dark:bg-gh-hover" />
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gh-l-hover dark:bg-gh-hover" />
                        <div className="w-16 h-16 rounded-full bg-gh-l-hover dark:bg-gh-hover" />
                        <div className="w-10 h-10 rounded-full bg-gh-l-hover dark:bg-gh-hover" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gh-l-hover dark:bg-gh-hover" />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col">
            {/* Artwork — centered & capped */}
            <div className="flex justify-center">
                <div className="relative w-[72vw] max-w-[320px] md:max-w-[340px] aspect-square rounded-[2rem] overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] bg-gh-l-card dark:bg-gh-card">
                    {artworkSrc ? (
                        <img
                            src={artworkSrc}
                            alt={currentTrack?.showTitle ?? "Artwork"}
                            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[6000ms] ease-out ${isPlaying ? "scale-105" : "scale-100"}`}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Headphones size={64} className="text-gh-l-muted dark:text-gh-muted" />
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

            {/* Everything below: edge-to-edge */}
            <div className="w-full mt-6">
                <div className="text-center">
                    <h2 className="text-lg md:text-xl font-bold text-gh-l-text dark:text-gh-text leading-snug line-clamp-2 px-2">
                        {currentTrack?.name || "Pick an episode"}
                    </h2>
                    <p className="mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                        {currentTrack?.showTitle ?? "Medrae"}
                    </p>
                    {currentTrack?.publishedAt && (
                        <p className="mt-1 text-[10px] text-gh-l-muted dark:text-gh-muted">
                            {fmtDate(currentTrack.publishedAt)}
                        </p>
                    )}
                </div>

                {/* Progress — full width */}
                <div className="w-full mt-5">
                    <div
                        className="relative h-1.5 bg-slate-300/70 dark:bg-gh-border rounded-full cursor-pointer group"
                        onClick={onProgressClick}
                    >
                        <div className="absolute h-full bg-blue-600 rounded-full" style={{ width: `${progress * 100}%` }} />
                        <div
                            className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-blue-600 shadow-none opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ left: `calc(${progress * 100}% - 6px)` }}
                        />
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] md:text-xs font-semibold text-gh-l-muted dark:text-gh-muted">
                        <span>{fmtTime(currentTime)}</span>
                        <span>{fmtTime(totalDuration || currentTrack?.duration)}</span>
                    </div>
                </div>

                {/* Controls — full width */}
                <div className="w-full mt-5 flex items-center justify-between">
                    <button
                        onClick={onCycleRepeat}
                        className={`p-2.5 rounded-full transition-colors ${repeatActive
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                            : "text-gh-l-muted dark:text-gh-muted hover:bg-black/5 dark:hover:bg-gh-hover"}`}
                    >
                        <Repeat size={18} />
                    </button>

                    <div className="flex items-center gap-3 md:gap-4">
                        <button onClick={onPrev} className="p-3 rounded-full text-gh-l-text dark:text-gh-text hover:bg-black/5 dark:hover:bg-gh-hover">
                            <SkipBack fill="currentColor" size={22} />
                        </button>
                        <button
                            onClick={onTogglePlay}
                            className="bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-none active:scale-95 transition-transform"
                            style={{ height: 64, width: 64 }}
                        >
                            {isPlaying ? <Pause fill="white" size={28} /> : <Play fill="white" size={28} className="ml-0.5" />}
                        </button>
                        <button onClick={onNext} className="p-3 rounded-full text-gh-l-text dark:text-gh-text hover:bg-black/5 dark:hover:bg-gh-hover">
                            <SkipForward fill="currentColor" size={22} />
                        </button>
                    </div>

                    <button
                        onClick={onToggleMute}
                        className="p-2.5 rounded-full text-gh-l-muted dark:text-gh-muted hover:bg-black/5 dark:hover:bg-gh-hover"
                    >
                        {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                </div>

                {/* Volume + Upload — full width */}
                <div className="w-full mt-4 flex items-center justify-between gap-4">
                    <input
                        type="range" min={0} max={1} step={0.01} value={volume}
                        onChange={(e) => onVolume(parseFloat(e.target.value))}
                        className="accent-blue-600 flex-1 h-1 cursor-pointer"
                    />
                    <label className="flex items-center gap-1.5 text-gh-l-muted dark:text-gh-muted hover:text-blue-600 cursor-pointer transition-colors text-[10px] font-bold uppercase tracking-widest shrink-0">
                        <FilePlus size={14} />
                        <span className="hidden sm:inline">Add</span>
                        <input type="file" accept="audio/*" multiple onChange={onUpload} className="hidden" />
                    </label>
                </div>

                {/* Mobile: browse */}
                {onBrowse && (
                    <button
                        onClick={onBrowse}
                        className="md:hidden w-full mt-5 py-3 px-4 rounded-2xl bg-gh-l-hover dark:bg-gh-hover hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-between text-gh-l-text dark:text-gh-text"
                    >
                        <span className="flex items-center gap-2 text-sm font-bold">
                            <ListMusic size={16} className="text-blue-600" />
                            Browse all episodes
                        </span>
                        <span className="text-[10px] font-bold text-gh-l-muted dark:text-gh-muted bg-gh-l-canvas dark:bg-gh-canvas px-2 py-0.5 rounded-full">
                            {episodeCount}
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
}

/* ═══════════ EPISODES LIST ═══════════ */
function EpisodesContent(props: any) {
    const {
        visibleTracks, currentTrackSrc, isPlaying, selectedShowId, loading,
        onSelectShow, onSelectTrack, shows, onToggleEndorse, isAdmin, onManage,
        onHideEpisode,
    } = props;

    const chips = useMemo(() => ([
        { id: null, label: "All", artwork: null },
        ...shows.map((s: any) => ({ id: s.id, label: s.title, artwork: s.artwork_url })),
    ]), [shows]);

    const showSkeleton = loading && visibleTracks.length === 0;

    /* ── Chips row ── */
    /* ── Story-style chips row ── */
    const chipsBlock = !showSkeleton && shows.length > 0 && (
        <div className="px-3 md:px-4 pt-3 pb-3 shrink-0">
            <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">

                {/* "All" tile — a small sparkle tile */}
                <button
                    onClick={() => onSelectShow(null)}
                    className="shrink-0 flex flex-col items-center gap-1.5 group"
                    aria-label="All shows"
                >
                    <div className={`relative w-28 h-28 md:w-32 md:h-32 rounded-xl p-[2px] transition-all ${selectedShowId === null
                        ? "bg-gradient-to-tr from-blue-500 via-blue-400 to-blue-600 shadow-lg shadow-blue-500/30"
                        : "bg-gh-l-hover dark:bg-gh-hover group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30"
                        }`}>
                        <div className="w-full h-full rounded-[22px] overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#B150F2] to-[#8927EB]">
                            <AppleLogo
                                className={`w-14 h-14 md:w-16 md:h-16 text-white transition-transform ${selectedShowId === null ? "scale-100" : "scale-95 group-hover:scale-100"
                                    }`}
                            />
                        </div>
                    </div>
                    <span className={`text-[10px] font-bold truncate max-w-[72px] ${selectedShowId === null
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gh-l-text dark:text-gh-text"
                        }`}>
                        All
                    </span>
                </button>
                {/* One tile per show */}
                {shows.map((s: any) => {
                    const active = selectedShowId === s.id;
                    const initial = (s.title || "?").trim().charAt(0).toUpperCase();
                    return (
                        <button
                            key={s.id}
                            onClick={() => onSelectShow(s.id)}
                            className="shrink-0 flex flex-col items-center gap-1.5 group"
                            aria-label={s.title}
                        >
                            {/* artwork tile with active ring */}
                            <div className={`relative w-28 h-28 md:w-32 md:h-32 rounded-xl p-[2px] transition-all ${active
                                ? "bg-gradient-to-tr from-blue-500 via-blue-400 to-blue-600 shadow-lg shadow-blue-500/30"
                                : "bg-transparent"
                                }`}>
                                <div className="relative w-full h-full rounded-[14px] overflow-hidden bg-gh-l-hover dark:bg-gh-hover">
                                    {s.artwork_url ? (
                                        <img
                                            src={s.artwork_url}
                                            alt=""
                                            className={`w-full h-full object-cover transition-transform ${active ? "scale-105" : "group-hover:scale-105"
                                                }`}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-lg font-black text-gh-l-muted dark:text-gh-muted">
                                            {initial}
                                        </div>
                                    )}

                                    {/* subtle dark overlay when not active */}
                                    {!active && (
                                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                                    )}
                                </div>

                                {/* endorsement badge */}
                                {s.endorsement_count > 0 && (
                                    <span className={`absolute -bottom-1 -right-1 min-w-[20px] h-[20px] px-1.5 rounded-full text-[9px] font-black flex items-center justify-center shadow-sm ${active
                                        ? "bg-blue-600 text-white"
                                        : "bg-gh-l-card dark:bg-gh-card text-gh-l-text dark:text-gh-text"
                                        }`}>
                                        {s.endorsement_count}
                                    </span>
                                )}
                            </div>

                            {/* name */}
                            <span className={`text-[10px] font-bold truncate max-w-[72px] text-center leading-tight ${active
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gh-l-text dark:text-gh-text"
                                }`}>
                                {s.title}
                            </span>
                        </button>
                    );
                })}

                {/* admin "Manage" tile */}
                {isAdmin && (
                    <button
                        onClick={onManage}
                        className="shrink-0 flex flex-col items-center gap-1.5 group"
                        aria-label="Manage podcasts"
                    >
                        <div className="w-28 h-28 md:w-32 md:h-32 rounded-xl border-2 border-dashed border-gh-l-border dark:border-gh-border flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                            <Plus size={22} />
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 truncate max-w-[72px] text-center">
                            Add
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
    /* ── Show cards ── */
    const showCardsBlock = !showSkeleton && selectedShowId === null && shows.length > 0 && (
        <div className="px-4 md:px-5 pb-3 shrink-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {shows.map((s: any) => (
                    <div
                        key={s.id}
                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-gh-l-card dark:bg-gh-card shadow-none"
                    >
                        {s.artwork_url && (
                            <img src={s.artwork_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold truncate text-gh-l-text dark:text-gh-text">
                                {s.title}
                            </p>
                            <p className="text-[10px] text-gh-l-muted dark:text-gh-muted">
                                {s.episode_count} episodes
                            </p>
                        </div>
                        <EndorseButton
                            endorsed={s.user_endorsed}
                            count={s.endorsement_count}
                            onClick={() => onToggleEndorse(s.id)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );

    /* ── Episode rows ── */
    const episodeRows = (
        <>
            {showSkeleton && <SkeletonList count={8} />}

            {!showSkeleton && visibleTracks.length === 0 && (
                <div className="py-16 text-center text-gh-l-muted dark:text-gh-muted text-sm">
                    No episodes yet.
                </div>
            )}

            {!showSkeleton && visibleTracks.map((t: any, i: number) => (
                <EpisodeRow
                    key={t.id || i}
                    track={t}
                    index={i}
                    isActive={currentTrackSrc === t.src}
                    isPlaying={isPlaying && currentTrackSrc === t.src}
                    onSelect={() => onSelectTrack(i)}
                    isAdmin={isAdmin}
                    onHide={() => t.id && onHideEpisode(t.id)}
                />
            ))}
        </>
    );

    return (
        <div className="h-full flex flex-col min-h-0">

            {/* ── MOBILE: one scroll column ── */}
            <div className="md:hidden h-full overflow-y-auto custom-scrollbar">
                {chipsBlock}
                {showCardsBlock}
                <div className="px-3 pb-6">
                    {episodeRows}
                </div>
            </div>

            {/* ── DESKTOP: pinned chips + independent scroll list ── */}
            <div className="hidden md:flex md:flex-col md:h-full md:min-h-0">
                {chipsBlock}
                {showCardsBlock}
                <div className="flex-1 min-h-0 px-4 pb-6">
                    <div className="h-full overflow-y-auto custom-scrollbar">
                        {episodeRows}
                    </div>
                </div>
            </div>

        </div>
    );
}

/* ═══════════ SKELETON ═══════════ */
function SkeletonList({ count = 8 }: { count?: number }) {
    return (
        <div className="animate-pulse">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="w-full rounded-2xl px-3 py-3 mb-1 flex items-center gap-3">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-gh-l-hover dark:bg-gh-hover" />
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3 rounded-full bg-gh-l-hover dark:bg-gh-hover" style={{ width: `${60 + (i % 4) * 8}%` }} />
                        <div className="h-2.5 rounded-full bg-gh-l-hover dark:bg-gh-hover" style={{ width: `${30 + (i % 3) * 10}%` }} />
                    </div>
                    <div className="shrink-0 w-4 h-4 rounded-full bg-gh-l-hover dark:bg-gh-hover" />
                </div>
            ))}
        </div>
    );
}

/* ═══════════ ADMIN ═══════════ */
function AdminContent(props: any) {
    const {
        shows, importInput, setImportInput, onImport, importing, importMsg,
        onDelete, confirmDelete, setConfirmDelete,
    } = props;

    return (
        <div className="space-y-5">
            <div className="rounded-xl bg-gh-l-card dark:bg-gh-card p-5 shadow-none">
                <h3 className="text-sm font-black tracking-tight text-gh-l-text dark:text-gh-text mb-1">
                    Add a nursing podcast
                </h3>
                <p className="text-[11px] text-gh-l-muted dark:text-gh-muted mb-4">
                    Paste any Apple Podcasts show link. All episodes will be imported and playable inside Studify.
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        value={importInput}
                        onChange={(e) => setImportInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !importing && onImport()}
                        placeholder="https://podcasts.apple.com/.../id1546623428"
                        className="flex-1 px-3 py-2.5 rounded-xl bg-gh-l-canvas dark:bg-gh-canvas text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gh-l-text dark:text-gh-text"
                    />
                    <button
                        onClick={onImport}
                        disabled={importing || !importInput.trim()}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                        {importing ? <><Loader2 size={16} className="animate-spin" /> Importing…</> : <>Import</>}
                    </button>
                </div>

                {importMsg && (
                    <div className={`mt-3 flex items-start gap-2 text-xs rounded-lg p-2.5 ${importMsg.kind === "ok"
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                        }`}>
                        {importMsg.kind === "ok"
                            ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                            : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                        <span className="break-words">{importMsg.text}</span>
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-sm font-black tracking-tight text-gh-l-text dark:text-gh-text mb-3">
                    Your shows
                </h3>
                {shows.length === 0 && (
                    <p className="text-xs text-gh-l-muted dark:text-gh-muted py-6 text-center">
                        No shows imported yet.
                    </p>
                )}
                <div className="space-y-2">
                    {shows.map((s: any) => (
                        <div
                            key={s.id}
                            className="flex items-center gap-3 p-3 rounded-2xl bg-gh-l-card dark:bg-gh-card shadow-none"
                        >
                            {s.artwork_url && (
                                <img src={s.artwork_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold truncate text-gh-l-text dark:text-gh-text">
                                    {s.title}
                                </p>
                                <p className="text-[10px] text-gh-l-muted dark:text-gh-muted">
                                    {s.episode_count} episodes · {s.endorsement_count} endorsements
                                </p>
                            </div>
                            {confirmDelete === s.id ? (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => onDelete(s.id)}
                                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-500"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        onClick={() => setConfirmDelete(null)}
                                        className="px-3 py-1.5 rounded-lg bg-gh-l-hover dark:bg-gh-hover text-xs font-bold text-gh-l-text dark:text-gh-text"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setConfirmDelete(s.id)}
                                    className="p-2 rounded-lg text-gh-l-muted dark:text-gh-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                    title="Delete show"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
// ── Apple logo (bitten apple) ──
function AppleLogo({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
            <path d="M17.05 12.54c-.03-2.8 2.29-4.14 2.4-4.2-1.31-1.91-3.35-2.17-4.07-2.2-1.73-.18-3.38 1.02-4.25 1.02-.88 0-2.23-.99-3.66-.97-1.88.03-3.62 1.09-4.59 2.78-1.96 3.4-.5 8.42 1.41 11.18.93 1.35 2.05 2.86 3.51 2.8 1.41-.05 1.94-.91 3.65-.91 1.7 0 2.18.91 3.66.88 1.5-.02 2.48-1.37 3.4-2.72 1.07-1.55 1.5-3.04 1.53-3.12-.03-.02-2.94-1.13-2.97-4.5zM14.29 4.51c.77-.93 1.29-2.23 1.15-3.51-1.11.04-2.44.74-3.23 1.66-.71.82-1.32 2.14-1.15 3.39 1.23.1 2.49-.62 3.23-1.54z" />
        </svg>
    );
}
/* ═══════════ ENDORSE ═══════════ */
function EndorseButton({ endorsed, count, onClick }: { endorsed: boolean; count: number; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${endorsed
                ? "bg-blue-600 text-white shadow-none"
                : "bg-gh-l-hover dark:bg-gh-hover text-gh-l-text dark:text-gh-text hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
            title={endorsed ? "Endorsed — click to remove" : "Endorse this show"}
        >
            <ThumbsUp size={13} fill={endorsed ? "currentColor" : "none"} />
            <span>{endorsed ? "Endorsed" : "Endorse"}</span>
            {count > 0 && (
                <span className={`text-[10px] font-black ${endorsed ? "text-white/80" : "text-gh-l-muted dark:text-gh-muted"}`}>
                    {count}
                </span>
            )}
        </button>
    );
}

/* ═══════════ EPISODE ROW ═══════════ */
function EpisodeRow({
    track, index, isActive, isPlaying, onSelect, isAdmin, onHide,
}: {
    track: Track;
    index: number;
    isActive: boolean;
    isPlaying: boolean;
    onSelect: () => void;
    isAdmin?: boolean;
    onHide?: () => void;
}) {
    return (
        <div
            className={`group w-full rounded-2xl px-3 py-3 mb-1 flex items-center gap-3 transition-all ${isActive
                ? "bg-blue-50 dark:bg-blue-950/40"
                : "hover:bg-gh-l-card dark:hover:bg-gh-card"
                }`}
        >
            <button onClick={onSelect} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <div className="relative shrink-0 w-12 h-12 rounded-full overflow-hidden bg-gh-l-hover dark:bg-gh-hover">
                    {track.artwork ? (
                        <img src={track.artwork} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gh-l-muted dark:text-gh-muted text-[10px] font-black">
                            {index + 1}
                        </div>
                    )}
                    {isPlaying && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="flex items-end gap-[2px] h-3">
                                {[0, 1, 2].map((i) => (
                                    <motion.span
                                        key={i}
                                        animate={{ height: [3, 10, 5, 9, 3] }}
                                        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.12 }}
                                        className="w-[2px] rounded-full bg-white"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <p className={`text-[13px] font-bold truncate ${isActive ? "text-blue-700 dark:text-blue-300" : "text-gh-l-text dark:text-gh-text"}`}>
                        {track.name}
                    </p>
                    <p className="text-[10px] truncate text-gh-l-muted dark:text-gh-muted">
                        {track.showTitle ? `${track.showTitle} · ` : ""}
                        {track.duration ? fmtTime(track.duration) : "—"}
                        {track.publishedAt ? ` · ${fmtDate(track.publishedAt)}` : ""}
                    </p>
                </div>

                <div className={`shrink-0 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gh-l-muted dark:text-gh-muted"}`}>
                    {isActive && isPlaying
                        ? <Pause size={18} fill="currentColor" />
                        : <Play size={18} fill="currentColor" />}
                </div>
            </button>

            {isAdmin && onHide && (
                <button
                    onClick={onHide}
                    className="shrink-0 p-1.5 rounded-lg text-gh-l-muted dark:text-gh-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors opacity-60 md:opacity-0 md:group-hover:opacity-100"
                    title="Hide this episode"
                >
                    <EyeOff size={14} />
                </button>
            )}
        </div>
    );
}