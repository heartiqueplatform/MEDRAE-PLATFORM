"use client";
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown, ChevronLeft, SkipBack, Play, Pause, SkipForward,
    Repeat, Volume2, VolumeX, FilePlus, ListMusic,
    Plus, Loader2, CheckCircle2, AlertCircle, ThumbsUp, Trash2, Headphones, EyeOff
} from 'lucide-react';
import { useMusicPlayer } from "./MusicPlayerProvider";
import { usePodcastShows } from "@/hooks/usePodcastShows";
import { supabase } from "@/lib/supabaseClient";

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

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════
export const MusicPlayer = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [screen, setScreen] = useState<Screen>("player");

    // ---- global opener ----
    useEffect(() => {
        window.__studifyOpen = (target: Screen = "player") => {
            setIsOpen(true);
            requestAnimationFrame(() => setScreen(target));
        };
        return () => { window.__studifyOpen = undefined; };
    }, []);

    const [currentTime, setCurrentTime] = useState(0);
    const [totalTime, setTotalTime] = useState(0);
    const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
    const [showTracks, setShowTracks] = useState<Track[] | null>(null);
    const [showTracksLoading, setShowTracksLoading] = useState(false);

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

    // ═══════════════════════════════════════════════════════
    // ── LIVE TIME — throttled (2 Hz max, rAF-coalesced) ──
    // Prevents re-rendering the whole tree 4×/sec during playback.
    // ═══════════════════════════════════════════════════════
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        let rafId = 0;
        let lastPushed = -1;

        const push = () => {
            rafId = 0;
            const t = audio.currentTime;
            const d = audio.duration || 0;

            // Only update when the seconds value actually changed by >= 0.5s
            // (ring still animates smoothly thanks to CSS transition on strokeDashoffset)
            if (Math.abs(t - lastPushed) < 0.5 && lastPushed !== -1) return;

            lastPushed = t;
            setCurrentTime(t);
            setTotalTime(d);
            setProgress(d ? t / d : 0);
        };

        const onTime = () => {
            if (rafId) return;
            rafId = requestAnimationFrame(push);
        };
        const onLoaded = () => setTotalTime(audio.duration || 0);

        audio.addEventListener("timeupdate", onTime);
        audio.addEventListener("loadedmetadata", onLoaded);
        audio.addEventListener("durationchange", onLoaded);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
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
        if (!isOpen) {
            const t = setTimeout(() => setScreen("player"), 250);
            return () => clearTimeout(t);
        }
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

    // ═══════════════════════════════════════════════════════
    // ── MEMOIZED DERIVED STATE ──
    // ═══════════════════════════════════════════════════════
    const currentTrack = tracks[currentIndex];
    const artworkSrc = currentTrack?.artwork || "";
    const currentTrackSrc = currentTrack?.src;

    const totalDuration = useMemo(
        () => (totalTime > 0 ? totalTime : currentTrack?.duration ?? 0),
        [totalTime, currentTrack?.duration]
    );

    const visibleTracks = useMemo(() => {
        if (!selectedShowId) return tracks;
        if (showTracks && showTracks.length > 0) return showTracks;
        return tracks.filter((t) => t.showId === selectedShowId);
    }, [tracks, selectedShowId, showTracks]);

    // ═══════════════════════════════════════════════════════
    // ── STABLE HANDLERS (useCallback) ──
    // ═══════════════════════════════════════════════════════
    // Cache of showId → tracks so re-tapping a chip is instant
    const showTracksCacheRef = useRef<Map<string, Track[]>>(new Map());
    // Guard against out-of-order responses when the user taps fast
    const selectShowReqRef = useRef(0);

    const handleSelectShow = useCallback(async (showId: string | null) => {
        setSelectedShowId(showId);

        if (!showId) {
            setShowTracks(null);
            setShowTracksLoading(false);
            return;
        }

        // 1. Cache hit → instant
        const cached = showTracksCacheRef.current.get(showId);
        if (cached) {
            setShowTracks(cached);
            setShowTracksLoading(false);
            return;
        }

        // 2. Local `tracks` filter → instant for shows already in memory
        const local = tracks.filter((t) => t.showId === showId);
        if (local.length > 0) {
            setShowTracks(local);
            setShowTracksLoading(false);
            // still do a silent background refresh to catch hidden/newer episodes
            const reqId = ++selectShowReqRef.current;
            fetchShowEpisodes(showId).then((rows) => {
                if (selectShowReqRef.current !== reqId) return;   // stale, drop
                showTracksCacheRef.current.set(showId, rows);
                setShowTracks((prev) => (selectedShowId === showId ? rows : prev));
            }).catch(() => { /* silent */ });
            return;
        }

        // 3. Cold path — nothing local, do the network fetch
        const reqId = ++selectShowReqRef.current;
        setShowTracksLoading(true);
        try {
            const rows = await fetchShowEpisodes(showId);
            if (selectShowReqRef.current !== reqId) return;       // stale, drop
            showTracksCacheRef.current.set(showId, rows);
            setShowTracks(rows);
        } finally {
            if (selectShowReqRef.current === reqId) setShowTracksLoading(false);
        }
    }, [tracks, fetchShowEpisodes, selectedShowId]);

    const handleNext = useCallback(
        () => setCurrentIndex((p) => (p + 1) % Math.max(tracks.length, 1)),
        [tracks.length, setCurrentIndex]
    );
    const handlePrev = useCallback(
        () => setCurrentIndex((p) => (p - 1 + tracks.length) % Math.max(tracks.length, 1)),
        [tracks.length, setCurrentIndex]
    );
    const handleToggleMute = useCallback(() => setMuted((p) => !p), [setMuted]);
    const handleCycleRepeat = useCallback(
        () => setRepeatMode((p) => (p === "off" ? "all" : p === "all" ? "one" : "off")),
        [setRepeatMode]
    );
    const handleTogglePlay = useCallback(() => togglePlay(), [togglePlay]);
    const handleVolume = useCallback((v: number) => setVolume(v), [setVolume]);
    const handleBrowse = useCallback(() => setScreen("episodes"), []);
    const handleOpenAdmin = useCallback(() => setScreen("admin"), []);
    const handleCloseAdmin = useCallback(() => setScreen("player"), []);

    const handleSelectTrack = useCallback((track: Track) => {
        if (!track?.src) return;
        const existingIdx = tracks.findIndex((x) => x.src === track.src);
        if (existingIdx >= 0) {
            setCurrentIndex(existingIdx);
        } else {
            const newIdx = tracks.length;
            setTracks((prev) => [...prev, track]);
            setCurrentIndex(newIdx);
        }
        togglePlay(true);
        if (window.innerWidth < 768) setScreen("player");
    }, [tracks, setCurrentIndex, setTracks, togglePlay]);

    const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
    }, [setTracks]);

    const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        audioRef.current.currentTime = ratio * (audioRef.current.duration || 0);
    }, [audioRef]);

    const handleHideEpisodeRequest = useCallback((id: string) => setConfirmHide(id), []);

    // ═══════════════════════════════════════════════════════
    // ── ASYNC HANDLERS ──
    // ═══════════════════════════════════════════════════════
    const handleImport = useCallback(async () => {
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
                showTracksCacheRef.current.clear();
                if (selectedShowId) {
                    const rows = await fetchShowEpisodes(selectedShowId);
                    setShowTracks(rows);
                } else {
                    setShowTracks(null);
                }
            }
        } catch (e: any) {
            setImportMsg({ kind: "err", text: String(e?.message ?? e) });
        } finally {
            setImporting(false);
        }
    }, [importInput, selectedShowId, refreshEpisodes, refreshShows, fetchShowEpisodes]);

    const handleDeleteShow = useCallback(async (showId: string) => {
        const ok = await deleteShow(showId);
        if (ok) {
            await refreshEpisodes({ silent: true });
            await refreshShows({ silent: true });
            if (selectedShowId === showId) {
                setSelectedShowId(null);
                setShowTracks(null);
            } else if (selectedShowId) {
                const rows = await fetchShowEpisodes(selectedShowId);
                setShowTracks(rows);
            }
            setConfirmDelete(null);
        }
    }, [deleteShow, refreshEpisodes, refreshShows, selectedShowId, fetchShowEpisodes]);

    const handleHideEpisode = useCallback(async (episodeId: string) => {
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
        if (selectedShowId) {
            const rows = await fetchShowEpisodes(selectedShowId);
            setShowTracks(rows);
        }
    }, [refreshEpisodes, selectedShowId, fetchShowEpisodes]);

    // ═══════════════════════════════════════════════════════
    // ── MEMOIZED ELEMENT TREES ──
    // Only rebuild PlayerContent / EpisodesContent when their
    // actual props change — not on every parent re-render.
    // ═══════════════════════════════════════════════════════
    const playerEl = useMemo(() => (
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
            onTogglePlay={handleTogglePlay}
            onPrev={handlePrev}
            onNext={handleNext}
            onCycleRepeat={handleCycleRepeat}
            onToggleMute={handleToggleMute}
            onVolume={handleVolume}
            onUpload={handleUpload}
            onBrowse={handleBrowse}
            episodeCount={tracks.length}
        />
    ), [
        artworkSrc, isPlaying, currentTrack, progress, currentTime, totalDuration,
        volume, muted, repeatMode, loading, tracks.length,
        handleProgressClick, handleTogglePlay, handlePrev, handleNext,
        handleCycleRepeat, handleToggleMute, handleVolume, handleUpload, handleBrowse,
    ]);

    const listEl = useMemo(() => (
        <EpisodesContent
            visibleTracks={visibleTracks}
            currentTrackSrc={currentTrackSrc}
            isPlaying={isPlaying}
            progress={progress}
            loading={loading || showTracksLoading}
            selectedShowId={selectedShowId}
            onSelectShow={handleSelectShow}
            onSelectTrack={handleSelectTrack}
            shows={shows}
            onToggleEndorse={toggleEndorse}
            isAdmin={isAdmin}
            onManage={handleOpenAdmin}
            onHideEpisode={handleHideEpisodeRequest}
        />
    ), [
        visibleTracks, currentTrackSrc, isPlaying, progress,
        loading, showTracksLoading, selectedShowId,
        shows, isAdmin, toggleEndorse,
        handleSelectShow, handleSelectTrack, handleOpenAdmin, handleHideEpisodeRequest,
    ]);

    return (
        <>
            {/*
              * ⚡ PHONE PERF: src is driven imperatively by the provider,
              * not via React prop — avoids remount + CORS preflight on every track.
              */}
            <audio ref={audioRef} crossOrigin="anonymous" />

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
                        style={{ willChange: 'opacity' }}
                    >
                        <div className="h-full w-full flex flex-col">

                            {/* MOBILE top bar */}
                            <div className="md:hidden flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
                                {screen === "admin" ? (
                                    <button
                                        onClick={handleCloseAdmin}
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
                                    <button onClick={handleOpenAdmin} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-gh-hover transition-colors text-blue-600 dark:text-blue-400">
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
                                    <span className="text-[11px] font-bold tracking-[0.3em] text-blue-600 dark:text-blue-400 ">
                                        Medrae Studify
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

                            {/* DESKTOP: two columns */}
                            <div className="hidden md:grid flex-1 min-h-0 grid-cols-[42%_58%]">
                                <div className="min-h-0 overflow-y-auto custom-scrollbar p-4 md:p-5 border-0">
                                    {screen === "admin" ? (
                                        <div className="w-full rounded-xl bg-gh-l-card dark:bg-gh-card shadow-none p-4 md:p-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <h2 className="text-sm font-black text-gh-l-text dark:text-gh-text">
                                                    Manage Podcasts
                                                </h2>
                                                <button
                                                    onClick={handleCloseAdmin}
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
                                <div className="min-h-0 min-w-0 overflow-hidden">
                                    {listEl}
                                </div>
                            </div>

                            {/* MOBILE — one screen at a time, mode="wait" */}
                            <div className="md:hidden flex-1 min-h-0 relative">
                                <AnimatePresence mode="wait" initial={false}>
                                    {screen === "player" && (
                                        <motion.div
                                            key="m-player"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.12, ease: "easeOut" }}
                                            className="absolute inset-0 overflow-y-auto custom-scrollbar p-4 bg-gh-l-canvas dark:bg-gh-canvas"
                                            style={{ willChange: 'opacity' }}
                                        >
                                            <div className="w-full rounded-xl bg-gh-l-card dark:bg-gh-card shadow-none p-4">
                                                {playerEl}
                                            </div>
                                        </motion.div>
                                    )}

                                    {screen === "episodes" && (
                                        <motion.div
                                            key="m-episodes"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.12, ease: "easeOut" }}
                                            className="absolute inset-0 bg-gh-l-canvas dark:bg-gh-canvas"
                                            style={{ willChange: 'opacity' }}
                                        >
                                            {listEl}
                                        </motion.div>
                                    )}

                                    {screen === "admin" && isAdmin && (
                                        <motion.div
                                            key="m-admin"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.12, ease: "easeOut" }}
                                            className="absolute inset-0 overflow-y-auto custom-scrollbar p-4 bg-gh-l-canvas dark:bg-gh-canvas"
                                            style={{ willChange: 'opacity' }}
                                        >
                                            <div className="w-full rounded-xl bg-gh-l-card dark:bg-gh-card p-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h2 className="text-sm font-black text-gh-l-text dark:text-gh-text">
                                                        Manage Podcasts
                                                    </h2>
                                                    <button
                                                        onClick={handleCloseAdmin}
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

                        {/* Hide-episode confirm — no backdrop-blur on phone */}
                        <AnimatePresence>
                            {confirmHide && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/70 md:bg-black/60 md:backdrop-blur-sm z-50 flex items-center justify-center p-4"
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

    .custom-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
    .custom-scrollbar::-webkit-scrollbar { width: 0; height: 0; display: none; }

    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

    /* Phone perf: kill non-essential animations during scroll */
    @media (max-width: 767px) {
      .mobile-perf * { animation-duration: 0.01ms !important; }
    }
  `}</style>
        </>
    );
};

// ════════════════════════════════════════════════════════════
// PLAYER CONTENT — memoized
// ════════════════════════════════════════════════════════════
const PlayerContent = React.memo(function PlayerContent(props: any) {
    const {
        artworkSrc, isPlaying, currentTrack, progress, currentTime, totalDuration,
        volume, muted, repeatActive, loading,
        onProgressClick, onTogglePlay, onPrev, onNext,
        onCycleRepeat, onToggleMute, onVolume, onUpload, onBrowse, episodeCount,
    } = props;

    const showSkeleton = loading && !currentTrack;

    /* ── Volume popover state ── */
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
    const scheduleClose = useCallback(() => {
        if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = window.setTimeout(() => setVolOpen(false), 700);
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
            {/* Artwork */}
            <div className="flex justify-center">
                <div className="relative w-[72vw] max-w-[320px] md:max-w-[340px] aspect-square rounded-[2rem] overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] bg-slate-100 dark:bg-gh-card">
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

            {/* Everything below */}
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
                </div>

                {/* Controls */}
                <div className="w-full mt-5 flex items-center justify-between">
                    <button
                        onClick={onCycleRepeat}
                        className={`p-2.5 rounded-full transition-colors ${repeatActive
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                            : "text-slate-500 dark:text-gh-muted hover:bg-slate-100 dark:hover:bg-gh-hover"}`}
                    >
                        <Repeat size={18} />
                    </button>

                    <div className="flex items-center gap-4 md:gap-5">
                        <button
                            onClick={onPrev}
                            className="p-3 rounded-full text-slate-700 dark:text-gh-text hover:bg-slate-100 dark:hover:bg-gh-hover transition-colors"
                        >
                            <SkipBack fill="currentColor" size={26} />
                        </button>

                        <button
                            onClick={onTogglePlay}
                            aria-label={isPlaying ? "Pause" : "Play"}
                            className="relative active:scale-95 transition-transform"
                            style={{ height: 128, width: 128 }}
                        >
                            {(() => {
                                const safeProgress = Math.max(0, Math.min(1, Number(progress) || 0));
                                return (
                                    <svg
                                        viewBox="0 0 100 100"
                                        className="absolute inset-0 w-full h-full pointer-events-none"
                                        aria-hidden="true"
                                    >
                                        <circle
                                            cx="50" cy="50" r="44"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="5"
                                            className="text-slate-200 dark:text-gh-border"
                                        />
                                        <circle
                                            cx="50" cy="50" r="44"
                                            fill="none"
                                            stroke="#DC2626"
                                            strokeWidth="5"
                                            strokeLinecap="butt"
                                            pathLength={100}
                                            strokeDasharray="100"
                                            strokeDashoffset={100 - safeProgress * 100}
                                            transform="rotate(-90 50 50)"
                                        />
                                        <path
                                            d="M50 88
                       C47 85 14 60 8 42
                       C3 26 15 12 28 9
                       C38 7 46 12 50 20
                       C54 12 62 7 72 9
                       C85 12 97 26 92 42
                       C86 60 53 85 50 88 Z"
                                            fill="#E11D2A"
                                            transform="translate(50 52) scale(0.78) translate(-50 -50)"
                                        />
                                    </svg>
                                );
                            })()}

                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                {isPlaying ? (
                                    <svg width="38" height="38" viewBox="0 0 24 24" fill="#FFFFFF" style={{ marginTop: 6 }}>
                                        <rect x="7" y="5" width="4" height="14" rx="2" ry="2" />
                                        <rect x="13" y="5" width="4" height="14" rx="2" ry="2" />
                                    </svg>
                                ) : (
                                    <svg width="38" height="38" viewBox="0 0 24 24" fill="#FFFFFF" style={{ marginTop: 6, marginLeft: 4 }}>
                                        <path
                                            d="M8.5 5.5
                   C8.5 4.9 9.2 4.5 9.7 4.8
                   L18.8 11.3
                   C19.3 11.6 19.3 12.4 18.8 12.7
                   L9.7 19.2
                   C9.2 19.5 8.5 19.1 8.5 18.5
                   Z"
                                            stroke="#FFFFFF"
                                            strokeWidth="1.5"
                                            strokeLinejoin="round"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                )}
                            </span>
                        </button>
                        <button
                            onClick={onNext}
                            className="p-3 rounded-full text-slate-700 dark:text-gh-text hover:bg-slate-100 dark:hover:bg-gh-hover transition-colors"
                        >
                            <SkipForward fill="currentColor" size={26} />
                        </button>
                    </div>

                    {/* Volume popover */}
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
                                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 flex flex-col items-center gap-2 rounded-2xl bg-white dark:bg-gh-card shadow-2xl shadow-black/30 dark:shadow-black/60 ring-1 ring-slate-200 dark:ring-white/10 p-3 touch-manipulation"
                                    >
                                        <span className="text-[10px] font-black tabular-nums text-slate-500 dark:text-gh-muted">
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
                                            {muted || volume === 0
                                                ? <VolumeX size={16} />
                                                : <Volume2 size={16} />}
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

                <div className="w-full mt-4 flex items-center justify-end">
                    <label className="flex items-center gap-1.5 text-slate-500 dark:text-gh-muted hover:text-blue-600 cursor-pointer transition-colors text-[10px] font-bold uppercase tracking-widest">
                        <FilePlus size={14} />
                        <span className="hidden sm:inline">Add</span>
                        <input type="file" accept="audio/*" multiple onChange={onUpload} className="hidden" />
                    </label>
                </div>

                {onBrowse && (
                    <button
                        onClick={onBrowse}
                        className="md:hidden w-full mt-5 py-3 px-4 rounded-2xl bg-slate-100 dark:bg-gh-hover hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-between text-slate-800 dark:text-gh-text"
                    >
                        <span className="flex items-center gap-2 text-sm font-bold">
                            <ListMusic size={16} className="text-blue-600" />
                            Browse all episodes
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-gh-muted bg-white dark:bg-gh-canvas px-2 py-0.5 rounded-full">
                            {episodeCount}
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
});

// ════════════════════════════════════════════════════════════
// VLC VOLUME SLIDER — memoized
// ════════════════════════════════════════════════════════════
const VlcVolumeSlider = React.memo(function VlcVolumeSlider({
    value,
    onChange,
    onInteract,
}: {
    value: number;
    onChange: (v: number) => void;
    onInteract?: () => void;
}) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState(false);

    const clamp = (n: number) => Math.max(0, Math.min(1, n));

    const setFromClientY = (clientY: number) => {
        const el = trackRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const ratio = 1 - (clientY - rect.top) / rect.height;
        onChange(clamp(ratio));
    };

    const onPointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        setDragging(true);
        onInteract?.();
        setFromClientY(e.clientY);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!dragging) return;
        setFromClientY(e.clientY);
    };

    const onPointerUp = (e: React.PointerEvent) => {
        setDragging(false);
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            e.preventDefault();
            onChange(clamp(value + 0.05));
            onInteract?.();
        } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            e.preventDefault();
            onChange(clamp(value - 0.05));
            onInteract?.();
        }
    };

    const pct = Math.round(value * 100);

    return (
        <div
            ref={trackRef}
            role="slider"
            aria-label="Volume"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
            className="relative w-2.5 h-32 rounded-full cursor-pointer select-none bg-gradient-to-b from-slate-300 to-slate-200 dark:from-gh-border dark:to-gh-hover touch-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
            <div
                className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400"
                style={{ height: `${value * 100}%` }}
            />
            {[25, 50, 75].map((t) => (
                <span
                    key={t}
                    className="absolute left-1/2 -translate-x-1/2 h-px w-1.5 bg-black/20 dark:bg-white/20"
                    style={{ bottom: `${t}%` }}
                />
            ))}
            <div
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white ring-2 ring-blue-600 shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-transform"
                style={{ bottom: `calc(${value * 100}% - 0px)`, transform: "translate(-50%, 50%)" }}
            />
        </div>
    );
});

// ════════════════════════════════════════════════════════════
// EPISODES LIST — memoized
// ════════════════════════════════════════════════════════════
const EpisodesContent = React.memo(function EpisodesContent(props: any) {
    const {
        visibleTracks, currentTrackSrc, isPlaying, selectedShowId, loading,
        onSelectShow, onSelectTrack, shows, onToggleEndorse, isAdmin, onManage,
        onHideEpisode,
        progress = 0,
    } = props;

    const showSkeleton = loading && visibleTracks.length === 0;

    const chipsBlock = useMemo(() => {
        if (showSkeleton || shows.length === 0) return null;
        return (
            <div className="px-3 md:px-4 pt-3 pb-3 shrink-0">
                <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
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
                                <div className={`relative w-28 h-28 md:w-32 md:h-32 rounded-xl p-[2px] transition-all ${active
                                    ? "bg-gradient-to-tr from-blue-500 via-blue-400 to-blue-600 shadow-lg shadow-blue-500/30"
                                    : "bg-transparent"
                                    }`}>
                                    <div className="relative w-full h-full rounded-[14px] overflow-hidden bg-gh-l-hover dark:bg-gh-hover">
                                        {s.artwork_url ? (
                                            <img
                                                src={s.artwork_url}
                                                alt=""
                                                loading="lazy"
                                                decoding="async"
                                                className={`w-full h-full object-cover transition-transform ${active ? "scale-105" : "group-hover:scale-105"
                                                    }`}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-lg font-black text-gh-l-muted dark:text-gh-muted">
                                                {initial}
                                            </div>
                                        )}
                                        {!active && (
                                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                                        )}
                                    </div>
                                    {s.endorsement_count > 0 && (
                                        <span className={`absolute -bottom-1 -right-1 min-w-[20px] h-[20px] px-1.5 rounded-full text-[9px] font-black flex items-center justify-center shadow-sm ${active
                                            ? "bg-blue-600 text-white"
                                            : "bg-gh-l-card dark:bg-gh-card text-gh-l-text dark:text-gh-text"
                                            }`}>
                                            {s.endorsement_count}
                                        </span>
                                    )}
                                </div>
                                <span className={`text-[10px] font-bold truncate max-w-[72px] text-center leading-tight ${active
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-gh-l-text dark:text-gh-text"
                                    }`}>
                                    {s.title}
                                </span>
                            </button>
                        );
                    })}
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
    }, [shows, selectedShowId, isAdmin, showSkeleton, onSelectShow, onManage]);

    const showCardsBlock = useMemo(() => {
        if (showSkeleton || selectedShowId !== null || shows.length === 0) return null;
        return (
            <div className="px-4 md:px-5 pb-3 shrink-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {shows.map((s: any) => (
                        <div
                            key={s.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectShow(s.id)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onSelectShow(s.id);
                                }
                            }}
                            className="group flex items-center gap-3 p-2.5 rounded-2xl bg-gh-l-card dark:bg-gh-card shadow-none cursor-pointer transition-colors hover:bg-gh-l-hover dark:hover:bg-gh-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            {s.artwork_url && (
                                <img
                                    src={s.artwork_url}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold truncate text-gh-l-text dark:text-gh-text group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {s.title}
                                </p>
                                <p className="text-[10px] text-gh-l-muted dark:text-gh-muted">
                                    {s.episode_count} episodes
                                </p>
                            </div>

                            {/* Endorse button — stopPropagation so it doesn't open the show */}
                            <div onClick={(e) => e.stopPropagation()}>
                                <EndorseButton
                                    endorsed={s.user_endorsed}
                                    count={s.endorsement_count}
                                    onClick={() => onToggleEndorse(s.id)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }, [shows, selectedShowId, showSkeleton, onToggleEndorse, onSelectShow]);

    const episodeRows = useMemo(() => (
        <>
            {showSkeleton && <SkeletonList count={8} />}

            {!showSkeleton && visibleTracks.length === 0 && (
                <div className="py-16 text-center text-gh-l-muted dark:text-gh-muted text-sm">
                    No episodes yet.
                </div>
            )}

            {!showSkeleton && visibleTracks.map((t: any, i: number) => {
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
                        onSelect={() => onSelectTrack(t)}
                        isAdmin={isAdmin}
                        onHide={() => t.id && onHideEpisode(t.id)}
                    />
                );
            })}
        </>
    ), [visibleTracks, currentTrackSrc, isPlaying, progress, showSkeleton, isAdmin, onSelectTrack, onHideEpisode]);

    return (
        <div className="h-full flex flex-col min-h-0">
            <div className="md:hidden h-full overflow-y-auto custom-scrollbar">
                {chipsBlock}
                {showCardsBlock}
                <div className="px-3 pb-6">
                    {episodeRows}
                </div>
            </div>

            <div className="hidden md:block md:h-full md:min-h-0 md:overflow-y-auto custom-scrollbar">
                {chipsBlock}
                {showCardsBlock}
                <div className="px-4 pb-6">
                    {episodeRows}
                </div>
            </div>
        </div>
    );
});

// ════════════════════════════════════════════════════════════
// SKELETON
// ════════════════════════════════════════════════════════════
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

// ════════════════════════════════════════════════════════════
// ADMIN
// ════════════════════════════════════════════════════════════
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
                                <img src={s.artwork_url} alt="" loading="lazy" decoding="async" className="w-14 h-14 rounded-xl object-cover" />
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

// ── Apple logo ──
function AppleLogo({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
            <path d="M17.05 12.54c-.03-2.8 2.29-4.14 2.4-4.2-1.31-1.91-3.35-2.17-4.07-2.2-1.73-.18-3.38 1.02-4.25 1.02-.88 0-2.23-.99-3.66-.97-1.88.03-3.62 1.09-4.59 2.78-1.96 3.4-.5 8.42 1.41 11.18.93 1.35 2.05 2.86 3.51 2.8 1.41-.05 1.94-.91 3.65-.91 1.7 0 2.18.91 3.66.88 1.5-.02 2.48-1.37 3.4-2.72 1.07-1.55 1.5-3.04 1.53-3.12-.03-.02-2.94-1.13-2.97-4.5zM14.29 4.51c.77-.93 1.29-2.23 1.15-3.51-1.11.04-2.44.74-3.23 1.66-.71.82-1.32 2.14-1.15 3.39 1.23.1 2.49-.62 3.23-1.54z" />
        </svg>
    );
}

// ════════════════════════════════════════════════════════════
// ENDORSE
// ════════════════════════════════════════════════════════════
const EndorseButton = React.memo(function EndorseButton({ endorsed, count, onClick }: { endorsed: boolean; count: number; onClick: () => void }) {
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
});

// ════════════════════════════════════════════════════════════
// EPISODE ROW — memoized (biggest win: rows skip re-render on
// timeupdate since their props don't change)
// ════════════════════════════════════════════════════════════
const EpisodeRow = React.memo(function EpisodeRow({
    track, index, isActive, isPlaying, onSelect, isAdmin, onHide, progress = 0, downloaded = false,
}: {
    track: Track;
    index: number;
    isActive: boolean;
    isPlaying: boolean;
    onSelect: () => void;
    isAdmin?: boolean;
    onHide?: () => void;
    progress?: number;
    downloaded?: boolean;
}) {
    const R = 22;
    const C = 2 * Math.PI * R;
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const dashOffset = C * (1 - clampedProgress);

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
                        <img src={track.artwork} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gh-l-muted dark:text-gh-muted text-[10px] font-black">
                            {index + 1}
                        </div>
                    )}

                    {isActive && (
                        <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                            <svg
                                className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                                viewBox="0 0 48 48"
                            >
                                <circle
                                    cx="24" cy="24" r={R}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.25)"
                                    strokeWidth="2.5"
                                />
                                <circle
                                    cx="24" cy="24" r={R}
                                    fill="none"
                                    stroke="#60A5FA"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeDasharray={C}
                                    strokeDashoffset={dashOffset}
                                    style={{ transition: "stroke-dashoffset 0.25s linear" }}
                                />
                            </svg>

                            {isPlaying ? (
                                <div className="flex items-end gap-[2px] h-3 z-10">
                                    {[0, 1, 2].map((i) => (
                                        <motion.span
                                            key={i}
                                            animate={{ height: [3, 10, 5, 9, 3] }}
                                            transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.12 }}
                                            className="w-[2px] rounded-full bg-white"
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
                    <p className={`text-[13px] font-bold truncate ${isActive ? "text-blue-700 dark:text-blue-300" : "text-gh-l-text dark:text-gh-text"}`}>
                        {track.name}
                    </p>

                    <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[10px] truncate text-gh-l-muted dark:text-gh-muted">
                            {track.showTitle ? `${track.showTitle} · ` : ""}
                            {track.duration ? fmtTime(track.duration) : "—"}
                            {track.publishedAt ? ` · ${fmtDate(track.publishedAt)}` : ""}
                        </p>

                        {downloaded && (
                            <span
                                className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full
                                           bg-emerald-100 dark:bg-emerald-950/50
                                           text-emerald-700 dark:text-emerald-400
                                           text-[8px] font-black uppercase tracking-wider"
                                title="Downloaded for offline playback"
                            >
                                <CheckCircle2 size={8} />
                                Downloaded
                            </span>
                        )}
                    </div>
                </div>

                {!isActive && (
                    <div className="shrink-0 text-gh-l-muted dark:text-gh-muted">
                        <Play size={18} fill="currentColor" />
                    </div>
                )}
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
});