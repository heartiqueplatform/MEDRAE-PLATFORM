"use client";
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { useMusicPlayer, type HistoryEntry } from "./MusicPlayerProvider";
import { useReportPlay } from "@/hooks/useReportPlay";
import { useEpisodeInteractions } from "@/hooks/useEpisodeInteractions";
import { usePodcastShows } from "@/hooks/usePodcastShows";
import { useShowFollows } from "@/hooks/useShowFollows";
import { useDownloads } from "@/hooks/useDownloads";
import { supabase } from "@/lib/supabaseClient";
import { useLocation } from "react-router-dom";
import { EpisodeSearchBar } from "@/components/EpisodeSearchBar";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { searchEpisodesLocal } from "@/lib/studifyDb";

// Extracted components
import { PlayerContent } from "./musicplayer/PlayerContent";
import { EpisodesContent } from "./musicplayer/EpisodesContent";
import { DownloadsContent } from "./musicplayer/DownloadsContent";
import { AdminContent } from "./musicplayer/AdminContent";
import { fmtBytes } from "./musicplayer/utils";

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

type Screen = "player" | "episodes" | "admin" | "downloads";

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
export const MusicPlayer = ({ forceOpen = false }: { forceOpen?: boolean } = {}) => {
    const [isOpen, setIsOpen] = useState(forceOpen);
    const [screen, setScreen] = useState<Screen>(forceOpen ? "episodes" : "player");
    useEffect(() => {
        if (forceOpen) return;
        window.__studifyOpen = (target: Screen = "player") => {
            setScreen(target);
            setIsOpen(true);
        };
        return () => {
            if (window.__studifyOpen) window.__studifyOpen = undefined;
        };
    }, [forceOpen]);
    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent("music-player-visibility", { detail: { open: isOpen } })
        );
    }, [isOpen]);
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
        loadMoreEpisodes,
        hasMoreEpisodes,
        isLoadingMoreEpisodes,
        fetchShowEpisodes,
        searchEpisodesRemote,
        history,
        clearHistory,
        removeFromHistory,
    } = useMusicPlayer();
    const { shows, refresh: refreshShows, toggleEndorse, deleteShow } = usePodcastShows();
    const downloads = useDownloads();
    const { report: reportPlay } = useReportPlay();
    const {
        toggle: toggleReaction,
        hydrate: hydrateInteractions,
        get: getInteraction,
        version: interactionVersion,
    } = useEpisodeInteractions();
    const {
        toggle: toggleFollow,
        hydrate: hydrateFollows,
        get: getFollow,
    } = useShowFollows();

    const totalEpisodes = useMemo(() => {
        const sum = shows.reduce(
            (acc: number, s: any) => acc + (Number(s?.episode_count) || 0),
            0
        );
        return sum;
    }, [shows]);
    const totalEpisodesLabel = useMemo(() => {
        if (!totalEpisodes) return "3K+";
        if (totalEpisodes >= 1000) {
            const k = totalEpisodes / 1000;
            const short = Math.ceil(k);
            return `${short}K+`;
        }
        if (totalEpisodes >= 100) return `${totalEpisodes}+`;
        return String(totalEpisodes);
    }, [totalEpisodes]);
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    }, []);
    const isAdmin = userId === ADMIN_ID;

    const location = useLocation();
    const [isDesktopViewport, setIsDesktopViewport] = useState(() => {
        if (typeof window === "undefined") return true;
        return window.matchMedia("(min-width: 768px)").matches;
    });
    useEffect(() => {
        const mq = window.matchMedia("(min-width: 768px)");
        const onChange = (e: MediaQueryListEvent) => setIsDesktopViewport(e.matches);
        mq.addEventListener("change", onChange);
        setIsDesktopViewport(mq.matches);
        return () => mq.removeEventListener("change", onChange);
    }, []);

    const showSideTab = useMemo(() => {
        const onDashboard =
            location.pathname === "/dashboard" ||
            location.pathname.startsWith("/dashboard/");
        if (!onDashboard) return false;
        if (isDesktopViewport) return true;
        return isPlaying;
    }, [location.pathname, isDesktopViewport, isPlaying]);

    // Live time
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        let rafId = 0;
        let lastPushed = -1;

        const push = () => {
            rafId = 0;
            const t = audio.currentTime;
            const d = audio.duration || 0;
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

    // End of track
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

    // Keyboard
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (screen !== "player") {
                    setScreen("player");
                } else if (forceOpen) {
                    window.history.length > 1
                        ? window.history.back()
                        : (window.location.href = "/dashboard/student");
                } else {
                    setIsOpen(false);
                }
            }
            if (e.key === " " && screen === "player") {
                e.preventDefault();
                togglePlay();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, screen, togglePlay, forceOpen]);
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

    useEffect(() => {
        const ids = visibleTracks
            .map((t) => t.id)
            .filter((id): id is string => !!id);
        if (ids.length === 0) return;
        const timer = setTimeout(() => hydrateInteractions(ids), 300);
        return () => clearTimeout(timer);
    }, [visibleTracks, hydrateInteractions]);
    useEffect(() => {
        const ids = shows.map((s: any) => s.id).filter((id): id is string => !!id);
        if (ids.length === 0) return;
        const timer = setTimeout(() => hydrateFollows(ids), 400);
        return () => clearTimeout(timer);
    }, [shows, hydrateFollows]);

    const showTracksCacheRef = useRef<Map<string, Track[]>>(new Map());
    const selectShowReqRef = useRef(0);

    const handleSelectShow = useCallback(async (showId: string | null) => {
        setSelectedShowId(showId);
        if (!showId) {
            setShowTracks(null);
            setShowTracksLoading(false);
            return;
        }
        const cached = showTracksCacheRef.current.get(showId);
        if (cached) {
            setShowTracks(cached);
            setShowTracksLoading(false);
            return;
        }
        const local = tracks.filter((t) => t.showId === showId);
        if (local.length > 0) {
            setShowTracks(local);
            setShowTracksLoading(false);
            const reqId = ++selectShowReqRef.current;
            fetchShowEpisodes(showId).then((rows) => {
                if (selectShowReqRef.current !== reqId) return;
                showTracksCacheRef.current.set(showId, rows);
                setShowTracks((prev) => (selectedShowId === showId ? rows : prev));
            }).catch(() => { });
            return;
        }
        const reqId = ++selectShowReqRef.current;
        setShowTracksLoading(true);
        try {
            const rows = await fetchShowEpisodes(showId);
            if (selectShowReqRef.current !== reqId) return;
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
    const handleTogglePlay = useCallback(() => {
        togglePlay();
    }, [togglePlay]);
    const handleVolume = useCallback((v: number) => setVolume(v), [setVolume]);
    const handleBrowse = useCallback(() => setScreen("episodes"), []);
    const handleDownloads = useCallback(() => setScreen("downloads"), []);
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
        if (track.id && track.showId) {
            reportPlay(track.id, track.showId, 0);
        }
        if (window.innerWidth < 768) setScreen("player");
    }, [tracks, setCurrentIndex, setTracks, togglePlay, reportPlay]);

    const handleResumeFromHistory = useCallback((entry: HistoryEntry) => {
        const idx = tracks.findIndex((t) => (t.id || t.src) === entry.id);
        if (idx >= 0) {
            setCurrentIndex(idx);
        } else {
            const newIdx = tracks.length;
            setTracks((prev) => [
                ...prev,
                {
                    id: entry.id,
                    name: entry.name,
                    src: entry.src,
                    artwork: entry.artwork,
                    duration: entry.duration,
                    showTitle: entry.showTitle,
                    showId: entry.showId,
                    publishedAt: entry.publishedAt,
                },
            ]);
            setCurrentIndex(newIdx);
        }
        requestAnimationFrame(() => {
            const audio = audioRef.current;
            if (!audio) return;
            const seek = () => {
                try { audio.currentTime = Math.max(0, entry.position); } catch { }
                audio.removeEventListener("loadedmetadata", seek);
            };
            if (audio.readyState >= 1) {
                try { audio.currentTime = Math.max(0, entry.position); } catch { }
            } else {
                audio.addEventListener("loadedmetadata", seek);
            }
        });
        togglePlay(true);
        if (window.innerWidth < 768) setScreen("player");
    }, [tracks, setCurrentIndex, setTracks, togglePlay, audioRef]);

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

    const handleSearchMemory = useCallback((query: string): any[] => {
        const scored = fuzzySearch(tracks, query, (t) => t.name, 40);
        return scored.map((t) => ({
            id: t.id ?? t.src,
            title: t.name,
            showTitle: t.showTitle,
            artwork: t.artwork,
            duration: t.duration,
            publishedAt: t.publishedAt,
        }));
    }, [tracks]);

    const handleSearchLocal = useCallback(async (query: string): Promise<any[]> => {
        const rows = await searchEpisodesLocal(query, 40);
        return rows.map((e) => ({
            id: e.id,
            title: e.title,
            showTitle: e.showTitle,
            artwork: e.showArtwork,
            duration: e.duration,
            publishedAt: e.publishedAt,
        }));
    }, []);

    const handleSearchRemote = useCallback(async (query: string): Promise<any[]> => {
        const rows = await searchEpisodesRemote(query);
        return rows.map((t) => ({
            id: t.id ?? t.src,
            title: t.name,
            showTitle: t.showTitle,
            artwork: t.artwork,
            duration: t.duration,
            publishedAt: t.publishedAt,
        }));
    }, [searchEpisodesRemote]);

    const handleSearchSelect = useCallback((result: any) => {
        const idx = tracks.findIndex((t) => (t.id ?? t.src) === result.id);
        if (idx >= 0) {
            setCurrentIndex(idx);
        } else {
            const src = result.src ?? "";
            if (!src) return;
            const newTrack = {
                id: result.id,
                name: result.title,
                src,
                artwork: result.artwork,
                duration: result.duration,
                showTitle: result.showTitle,
                showId: result.showId,
                publishedAt: result.publishedAt,
            };
            const newIndex = tracks.length;
            setTracks((prev) => [...prev, newTrack]);
            setCurrentIndex(newIndex);
        }
        togglePlay(true);
        if (window.innerWidth < 768) setScreen("player");
    }, [tracks, setCurrentIndex, setTracks, togglePlay]);

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
            onDownloads={handleDownloads}
            episodeCount={tracks.length}
            totalEpisodesLabel={totalEpisodesLabel}
            currentInteraction={
                currentTrack?.id ? getInteraction("episode", currentTrack.id) : undefined
            }
            visibleTracks={visibleTracks}
            currentTrackSrc={currentTrackSrc}
            onSelectTrack={handleSelectTrack}
            onToggleReaction={toggleReaction}
            getInteraction={getInteraction}

            getDownloadState={downloads.getState}
            getDownloadProgress={downloads.getProgress}
            onDownload={(t: any) => downloads.download(t)}
            onCancelDownload={(id: string) => downloads.cancel(id)}
            downloadCount={downloads.downloadedItems.length}
        />
    ), [
        artworkSrc, isPlaying, currentTrack, progress, currentTime, totalDuration,
        volume, muted, repeatMode, loading, tracks.length, totalEpisodesLabel,
        handleProgressClick, handleTogglePlay, handlePrev, handleNext,
        handleCycleRepeat, handleToggleMute, handleVolume, handleUpload,
        handleBrowse, handleDownloads,
        getInteraction, interactionVersion,
        visibleTracks, currentTrackSrc, handleSelectTrack, toggleReaction,
        downloads,
    ]);

    const listEl = useMemo(() => (
        <EpisodesContent
            visibleTracks={visibleTracks}
            currentTrackSrc={currentTrackSrc}
            isPlaying={isPlaying}
            progress={progress}
            loading={loading || showTracksLoading}
            parentLoading={loading && tracks.length === 0}
            selectedShowId={selectedShowId}
            onSelectShow={handleSelectShow}
            onSelectTrack={handleSelectTrack}
            shows={shows}
            onToggleEndorse={toggleEndorse}
            isAdmin={isAdmin}
            onManage={handleOpenAdmin}
            onHideEpisode={handleHideEpisodeRequest}
            history={history}
            onResumeFromHistory={handleResumeFromHistory}
            onRemoveFromHistory={removeFromHistory}
            onClearHistory={clearHistory}
            getInteraction={getInteraction}
            onToggleReaction={toggleReaction}
            getFollow={getFollow}
            onToggleFollow={toggleFollow}
            getDownloadState={downloads.getState}
            getDownloadProgress={downloads.getProgress}
            onDownload={(t: any) => downloads.download(t)}
            onCancelDownload={(id: string) => downloads.cancel(id)}
            loadMoreEpisodes={loadMoreEpisodes}
            hasMoreEpisodes={hasMoreEpisodes}
            isLoadingMoreEpisodes={isLoadingMoreEpisodes}
        />
    ), [
        visibleTracks, currentTrackSrc, isPlaying,
        loading, showTracksLoading, tracks.length,
        selectedShowId, shows, isAdmin, toggleEndorse,
        handleSelectShow, handleSelectTrack, handleOpenAdmin, handleHideEpisodeRequest,
        history, handleResumeFromHistory, removeFromHistory, clearHistory,
        getFollow, toggleFollow,
        getInteraction, interactionVersion, toggleReaction,
        downloads,
        loadMoreEpisodes, hasMoreEpisodes, isLoadingMoreEpisodes,
    ]);

    const downloadedTracks = useMemo<Track[]>(() => {
        const byId = new Map<string, Track>();
        tracks.forEach((t) => { if (t.id) byId.set(t.id, t); });
        return downloads.downloadedItems
            .map((item) => byId.get(item.episodeId))
            .filter((t): t is Track => !!t);
    }, [downloads.downloadedItems, tracks]);

    const downloadsEl = useMemo(() => (
        <DownloadsContent
            items={downloads.downloadedItems}
            tracks={downloadedTracks}
            currentTrackSrc={currentTrackSrc}
            isPlaying={isPlaying}
            progress={progress}
            onSelectTrack={handleSelectTrack}
            onRemove={(id: string) => downloads.remove(id)}
            getInteraction={getInteraction}
            onToggleReaction={toggleReaction}
            onBrowse={handleBrowse}
        />
    ), [
        downloads.downloadedItems, downloadedTracks, currentTrackSrc,
        isPlaying, progress, handleSelectTrack, downloads,
        getInteraction, interactionVersion, toggleReaction, handleBrowse,
    ]);

    if (!forceOpen && location.pathname === "/listen") {
        return null;
    }

    return (
        <>
            {showSideTab && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 340, damping: 26 }}
                    className="fixed top-1/4 -translate-y-1/2 right-4 z-40 group"
                >
                    <motion.div
                        variants={{
                            collapsed: { width: 56, height: 56, borderRadius: 28, opacity: 1 },
                            expanded: { width: 240, height: 56, borderRadius: 28, opacity: 1 },
                        }}
                        initial="collapsed"
                        whileHover="expanded"
                        whileTap="expanded"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="relative flex items-center bg-gh-l-card dark:bg-gh-card overflow-hidden cursor-pointer"
                        onClick={() => setIsOpen(true)}
                        role="button"
                        aria-label="Open Medrae Player"
                    >
                        {isPlaying && (
                            <motion.span
                                aria-hidden="true"
                                animate={{ opacity: [0.35, 0.6, 0.35] }}
                                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-0 rounded-full bg-blue-500/25 blur-lg pointer-events-none"
                            />
                        )}
                        <div className="relative h-14 w-14 flex items-center justify-center shrink-0">
                            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100" aria-hidden="true">
                                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" className="text-gh-l-hover dark:text-gh-hover" />
                                <motion.circle
                                    cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="5"
                                    strokeLinecap="round" strokeDasharray="290"
                                    style={{ strokeDashoffset: 290 - 290 * progress }}
                                    className="text-blue-500"
                                />
                            </svg>
                            <div className={`h-11 w-11 rounded-full overflow-hidden relative bg-slate-900 dark:bg-slate-800 flex items-center justify-center ${isPlaying ? "animate-[spin_4s_linear_infinite]" : ""}`}>
                                <div className="absolute inset-0 bg-[radial-gradient(circle,_transparent_45%,_rgba(0,0,0,0.45)_100%)] z-10 pointer-events-none" />
                                <svg viewBox="0 0 24 24" className="h-6 w-6 text-white/90 relative z-20" fill="none" stroke="currentColor" strokeWidth={1.75}>
                                    <path d="M3 14v-3a9 9 0 0 1 18 0v3" />
                                    <path d="M21 19a2 2 0 0 1-2 2h-1v-6h3v4zM3 19a2 2 0 0 0 2 2h1v-6H3v4z" />
                                </svg>
                            </div>
                            {isPlaying && (
                                <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center gap-[1px] px-[3px]">
                                    <motion.span animate={{ height: [3, 7, 3] }} transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }} className="w-[1.5px] bg-white rounded-full" />
                                    <motion.span animate={{ height: [5, 3, 6, 3] }} transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.15 }} className="w-[1.5px] bg-white rounded-full" />
                                    <motion.span animate={{ height: [3, 6, 3] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }} className="w-[1.5px] bg-white rounded-full" />
                                </div>
                            )}
                        </div>
                        <motion.div
                            variants={{
                                collapsed: { opacity: 0, x: -8 },
                                expanded: { opacity: 1, x: 0 },
                            }}
                            transition={{ duration: 0.18, delay: 0.05 }}
                            className="flex items-center gap-2 pr-3 pl-0 min-w-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex flex-col min-w-0 max-w-[130px]">
                                <span className="text-[9px] text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none">
                                    {isPlaying ? "Now playing" : "Paused"}
                                </span>
                                <span className="text-[12px] font-bold text-gh-l-text dark:text-gh-text truncate leading-tight mt-0.5">
                                    {currentTrack?.name || "Medrae Player"}
                                </span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                aria-label={isPlaying ? "Pause" : "Play"}
                                className="h-9 w-9 shrink-0 rounded-full bg-gh-l-text dark:bg-gh-text text-gh-l-card dark:text-gh-card flex items-center justify-center active:scale-95 transition-transform"
                            >
                                {isPlaying ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <rect x="6" y="5" width="4" height="14" rx="1.5" />
                                        <rect x="14" y="5" width="4" height="14" rx="1.5" />
                                    </svg>
                                ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M8.5 5.5v13a1 1 0 0 0 1.55.83l9.5-6.5a1 1 0 0 0 0-1.66l-9.5-6.5A1 1 0 0 0 8.5 5.5Z" />
                                    </svg>
                                )}
                            </button>
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className={
                            forceOpen
                                ? "relative w-full h-full bg-background dark:bg-[#0d1117] overflow-hidden"
                                : "fixed inset-0 z-[2147483647] bg-background dark:bg-[#0d1117] overflow-hidden"
                        }
                        data-music-player-root={forceOpen ? "inline" : "overlay"}
                    >
                        <div className="h-full w-full flex flex-col">
                            {/* MOBILE top bar */}
                            <div className="md:hidden flex items-center justify-between px-4 pt-4 pb-3 shrink-0 bg-white dark:bg-[#0d1117]">
                                {screen === "admin" || screen === "downloads" ? (
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
                                        onClick={() => {
                                            if (forceOpen) {
                                                window.history.length > 1
                                                    ? window.history.back()
                                                    : (window.location.href = "/dashboard/student");
                                            } else {
                                                setIsOpen(false);
                                            }
                                        }}
                                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-gh-hover transition-colors text-gh-l-text dark:text-gh-text"
                                        aria-label="Close"
                                    >
                                        <ChevronDown size={22} />
                                    </button>
                                )}
                                <div className="flex flex-col items-center">
                                    <span className="text-[15px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white">
                                        {screen === "player" && "Medrae Studify"}
                                        {screen === "episodes" && "Studify Episodes"}
                                        {screen === "admin" && "Manage Podcasts"}
                                        {screen === "downloads" && "Offline Downloads"}
                                    </span>
                                    <span className="text-[9px] text-gh-l-muted dark:text-gh-muted font-semibold">
                                        {screen === "player" && (currentTrack?.showTitle ?? "Nursing Audio")}
                                        {screen === "episodes" && `${totalEpisodesLabel} episodes`}
                                        {screen === "admin" && `${shows.length} show${shows.length !== 1 ? "s" : ""}`}
                                        {screen === "downloads" && `${downloads.downloadedItems.length} saved`}
                                    </span>
                                </div>
                                {screen === "player" && isAdmin ? (
                                    <button onClick={handleOpenAdmin} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-gh-hover transition-colors text-blue-600 dark:text-blue-400">
                                        <Plus size={22} />
                                    </button>
                                ) : <div className="w-9" />}
                            </div>

                            {/* DESKTOP top bar */}
                            <div className="hidden md:flex items-center justify-between px-5 pt-4 pb-3 shrink-0 border-b border-gh-l-border dark:border-gh-border bg-white dark:bg-[#0d1117]">
                                <button
                                    onClick={() => {
                                        if (forceOpen) {
                                            window.history.length > 1
                                                ? window.history.back()
                                                : (window.location.href = "/dashboard/student");
                                        } else {
                                            setIsOpen(false);
                                        }
                                    }}
                                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-gh-hover transition-colors text-gh-l-text dark:text-gh-text"
                                >
                                    <ChevronDown size={22} />
                                </button>
                                <div className="flex items-center gap-3">
                                    <span className="text-[15px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white">
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

                            {/* DESKTOP search */}


                            {/* DESKTOP two columns */}
                            <div className="hidden md:grid flex-1 min-h-0 grid-cols-[42%_58%]">
                                <div className="min-h-0 overflow-y-auto custom-scrollbar p-4 md:p-5 border-0">
                                    {screen === "admin" ? (
                                        <div className="w-full rounded-xl bg-gh-l-card dark:bg-gh-card shadow-none p-4 md:p-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <h2 className="text-sm text-gh-l-text dark:text-gh-text">
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
                                    ) : screen === "downloads" ? (
                                        <div className="w-full rounded-xl bg-gh-l-card dark:bg-gh-card shadow-none p-4 md:p-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <h2 className="text-sm text-gh-l-text dark:text-gh-text">
                                                    Offline Downloads
                                                </h2>
                                                <button
                                                    onClick={() => setScreen("player")}
                                                    className="px-3 py-1.5 rounded-lg bg-gh-l-hover dark:bg-gh-hover text-xs font-bold text-gh-l-text dark:text-gh-text"
                                                >
                                                    Done
                                                </button>
                                            </div>
                                            <p className="text-[11px] text-gh-l-muted dark:text-gh-muted mb-3">
                                                Play these without internet.
                                            </p>
                                            {downloads.downloadedItems.length === 0 && (
                                                <p className="text-xs text-gh-l-muted dark:text-gh-muted py-8 text-center">
                                                    No downloads yet. Tap ⬇ on any episode to save it offline.
                                                </p>
                                            )}
                                            <div className="space-y-2">
                                                {downloads.downloadedItems.map((item) => {
                                                    const t = downloadedTracks.find((x) => x.id === item.episodeId);
                                                    if (!t) return null;
                                                    return (
                                                        <div key={item.episodeId} className="flex items-center gap-3 p-3 rounded-2xl bg-gh-l-canvas dark:bg-gh-canvas">
                                                            {t.artwork && (
                                                                <img src={t.artwork} alt="" loading="lazy" className="w-12 h-12 rounded-xl object-cover" />
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-bold truncate text-gh-l-text dark:text-gh-text">
                                                                    {t.name}
                                                                </p>
                                                                <p className="text-[10px] text-gh-l-muted dark:text-gh-muted">
                                                                    {t.showTitle ?? ""} · {fmtBytes(item.size)}
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => downloads.remove(item.episodeId)}
                                                                className="p-2 rounded-lg text-gh-l-muted hover:text-red-600 transition-colors"
                                                                aria-label="Remove download"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full rounded-xl bg-gh-l-card dark:bg-gh-card shadow-0 p-4 md:p-5">
                                            {playerEl}
                                        </div>
                                    )}
                                </div>
                                <div className="min-h-0 min-w-0 overflow-hidden flex flex-col">
                                    {/* Search — only spans the list side */}
                                    <div className="shrink-0 px-4 pt-3 pb-2">
                                        <EpisodeSearchBar
                                            onSearchMemory={handleSearchMemory}
                                            onSearchLocal={handleSearchLocal}
                                            onSearchRemote={handleSearchRemote}
                                            onSelect={handleSearchSelect}
                                            placeholder="Search episodes, topics, shows…"
                                        />
                                    </div>

                                    {/* List fills remaining height */}
                                    <div className="flex-1 min-h-0 overflow-hidden">
                                        {listEl}
                                    </div>
                                </div>
                            </div>

                            {/* MOBILE */}
                            <div className="md:hidden flex-1 min-h-0 relative">
                                <AnimatePresence initial={false}>
                                    {screen === "player" && (
                                        <motion.div
                                            key="m-player"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.12, ease: "easeOut" }}
                                            className="absolute inset-0 overflow-y-auto custom-scrollbar p-4 bg-gh-l-canvas dark:bg-gh-canvas"
                                        >
                                            <div className="w-full rounded-xl bg-gh-l-card dark:bg-gh-card shadow-none p-3 sm:p-4">
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
                                            className="absolute inset-0 flex flex-col bg-background dark:bg-[#0d1117]"
                                        >
                                            <div className="shrink-0 px-3 pt-2 pb-2">
                                                <EpisodeSearchBar
                                                    onSearchMemory={handleSearchMemory}
                                                    onSearchLocal={handleSearchLocal}
                                                    onSearchRemote={handleSearchRemote}
                                                    onSelect={handleSearchSelect}
                                                    placeholder="Search episodes…"
                                                />
                                            </div>
                                            <div className="flex-1 min-h-0">
                                                {listEl}
                                            </div>
                                        </motion.div>
                                    )}
                                    {screen === "admin" && isAdmin && (
                                        <motion.div
                                            key="m-admin"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.12, ease: "easeOut" }}
                                            className="absolute inset-0 overflow-y-auto custom-scrollbar px-3 py-4 sm:p-4 bg-gh-l-canvas dark:bg-gh-canvas"
                                        >
                                            <div className="w-full rounded-xl bg-gh-l-card dark:bg-gh-card p-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h2 className="text-sm text-gh-l-text dark:text-gh-text">
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

                                    {screen === "downloads" && (
                                        <motion.div
                                            key="m-downloads"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.12, ease: "easeOut" }}
                                            className="absolute inset-0 overflow-y-auto custom-scrollbar px-3 py-4 sm:p-4 bg-gh-l-canvas dark:bg-gh-canvas"
                                        >
                                            {downloadsEl}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Hide episode confirm */}
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
                                        <h3 className="text-sm text-gh-l-text dark:text-gh-text mb-1">
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
            </AnimatePresence >
            <style>{`
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .animate-marquee { display: inline-block; white-space: nowrap; padding-left: 100%; animation: marquee 8s linear infinite; }
    @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
    .custom-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
    .custom-scrollbar::-webkit-scrollbar { width: 0; height: 0; display: none; }
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    @media (max-width: 767px) {
      .mobile-perf * { animation-duration: 0.01ms !important; }
    }
      @keyframes eq-bar {
    0%, 100% { height: 3px; }
    50% { height: 10px; }
}
.animate-eq-bar {
    animation: eq-bar 0.8s ease-in-out infinite;
}
  `}</style>
        </>
    );
};