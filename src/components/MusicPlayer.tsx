"use client";
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown, ChevronLeft, SkipBack, Play, SkipForward,
    Repeat, Volume2, VolumeX, FilePlus, ListMusic,
    Plus, Loader2, CheckCircle2, AlertCircle, ThumbsUp, Trash2, Headphones, EyeOff,
    X,
    Disc3,
} from "lucide-react";
import { useMusicPlayer, type HistoryEntry } from "./MusicPlayerProvider";
import { useReportPlay } from "@/hooks/useReportPlay";
import { useEpisodeInteractions } from "@/hooks/useEpisodeInteractions";
import { Heart, Bookmark } from "lucide-react";
import { usePodcastShows } from "@/hooks/usePodcastShows";
import { useShowFollows } from "@/hooks/useShowFollows";
import { supabase } from "@/lib/supabaseClient";
import { useLocation } from "react-router-dom";
import { EpisodeSearchBar } from "@/components/EpisodeSearchBar";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { searchEpisodesLocal } from "@/lib/studifyDb";
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
    // ✅ Set `screen` BEFORE flipping `isOpen` true. Otherwise the previous
    //    screen renders for one frame (player) before switching to the
    //    requested one (episodes), producing a visible jump.
    useEffect(() => {
        window.__studifyOpen = (target: Screen = "player") => {
            setScreen(target);   // set first
            setIsOpen(true);     // open after
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
        searchEpisodesRemote,
        history,
        clearHistory,
        removeFromHistory,
    } = useMusicPlayer();
    const { shows, refresh: refreshShows, toggleEndorse, deleteShow } = usePodcastShows();
    const { report: reportPlay } = useReportPlay();
    const {
        toggle: toggleReaction,
        hydrate: hydrateInteractions,
        get: getInteraction,
    } = useEpisodeInteractions();
    const {
        toggle: toggleFollow,
        hydrate: hydrateFollows,
        get: getFollow,
    } = useShowFollows();
    // ✅ Total episodes across all shows — used for the "Browse" label
    //    and the episodes header. Falls back to "3K+" if shows haven't loaded.
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
            // Round UP so "3K+" is truthful (2544 → 3K+)
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

    // ✅ Only show the floating side tab on the home dashboard.
    //    Audio keeps playing everywhere — this only controls visibility
    //    of the tap-to-open button.
    // ✅ Visibility rules for the floating side tab:
    //    • Route must be a dashboard (existing rule)
    //    • Desktop (≥ md): always show — hover-to-expand UX works there
    //    • Mobile (< md): only show while audio is actively playing,
    //      because the footer already has a Listen tab on phones
    const location = useLocation();

    // Track viewport width so the rule reacts to rotation / resize.
    const [isDesktopViewport, setIsDesktopViewport] = useState(() => {
        if (typeof window === "undefined") return true;
        return window.matchMedia("(min-width: 768px)").matches;
    });

    useEffect(() => {
        const mq = window.matchMedia("(min-width: 768px)");
        const onChange = (e: MediaQueryListEvent) => setIsDesktopViewport(e.matches);
        mq.addEventListener("change", onChange);
        // Sync once in case matchMedia drifted (rare)
        setIsDesktopViewport(mq.matches);
        return () => mq.removeEventListener("change", onChange);
    }, []);

    const showSideTab = useMemo(() => {
        const onDashboard =
            location.pathname === "/dashboard" ||
            location.pathname.startsWith("/dashboard/");
        if (!onDashboard) return false;
        if (isDesktopViewport) return true;   // laptop / desktop
        return isPlaying;                      // mobile: only while playing
    }, [location.pathname, isDesktopViewport, isPlaying]);
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
    // ✅ Hydrate reaction counts when the episode list changes
    useEffect(() => {
        const ids = visibleTracks
            .map((t) => t.id)
            .filter((id): id is string => !!id);
        if (ids.length > 0) hydrateInteractions(ids);
    }, [visibleTracks, hydrateInteractions]);
    // ✅ Hydrate follow state when the shows list changes
    useEffect(() => {
        const ids = shows.map((s: any) => s.id).filter((id): id is string => !!id);
        if (ids.length > 0) hydrateFollows(ids);
    }, [shows, hydrateFollows]);
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

        // ✅ Report the play (non-blocking, deduped server-side)
        if (track.id && track.showId) {
            reportPlay(track.id, track.showId, 0);
        }

        if (window.innerWidth < 768) setScreen("player");
    }, [tracks, setCurrentIndex, setTracks, togglePlay, reportPlay]);
    const handleResumeFromHistory = useCallback((entry: HistoryEntry) => {
        // Find the track in `tracks` (or build one from the entry if missing)
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

        // Seek to saved position after the track is loaded
        requestAnimationFrame(() => {
            const audio = audioRef.current;
            if (!audio) return;
            const seek = () => {
                try {
                    audio.currentTime = Math.max(0, entry.position);
                } catch { /* ignore */ }
                audio.removeEventListener("loadedmetadata", seek);
            };
            if (audio.readyState >= 1) {
                try { audio.currentTime = Math.max(0, entry.position); } catch { /* ignore */ }
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
    // ── Layer 1: instant search on the 200 tracks already in memory ──
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

    // ── Layer 2: Dexie sweep (fast, thousands of rows) ──
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

    // ── Layer 3: Supabase search (authoritative) ──
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

    // ── When a search result is tapped, play it ──
    const handleSearchSelect = useCallback((result: any) => {
        // Find in tracks, else append
        const idx = tracks.findIndex((t) => (t.id ?? t.src) === result.id);
        if (idx >= 0) {
            setCurrentIndex(idx);
        } else {
            const newTrack = {
                id: result.id,
                name: result.title,
                src: result.src ?? "",
                artwork: result.artwork,
                duration: result.duration,
                showTitle: result.showTitle,
                showId: result.showId,
                publishedAt: result.publishedAt,
            };
            // If src is missing, we need to fetch the full episode — for now,
            // find it in `tracks` by id (it should be there since we searched)
            setTracks((prev) => [...prev, newTrack]);
            setCurrentIndex(tracks.length);
        }
        togglePlay(true);
        if (window.innerWidth < 768) setScreen("player");
    }, [tracks, setCurrentIndex, setTracks, togglePlay]);
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
            totalEpisodesLabel={totalEpisodesLabel}
            currentInteraction={
                currentTrack?.id ? getInteraction("episode", currentTrack.id) : undefined
            }
        />
    ), [
        artworkSrc, isPlaying, currentTrack, progress, currentTime, totalDuration,
        volume, muted, repeatMode, loading, tracks.length, totalEpisodesLabel,
        handleProgressClick, handleTogglePlay, handlePrev, handleNext,
        handleCycleRepeat, handleToggleMute, handleVolume, handleUpload, handleBrowse,
        getInteraction,
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
            // ✅ history
            history={history}
            onResumeFromHistory={handleResumeFromHistory}
            onRemoveFromHistory={removeFromHistory}
            onClearHistory={clearHistory}
            getInteraction={getInteraction}
            onToggleReaction={toggleReaction}
            getFollow={getFollow}
            onToggleFollow={toggleFollow}
        />
    ), [
        visibleTracks, currentTrackSrc, isPlaying, progress,
        loading, showTracksLoading, tracks.length,
        selectedShowId, shows, isAdmin, toggleEndorse,
        handleSelectShow, handleSelectTrack, handleOpenAdmin, handleHideEpisodeRequest,
        history, handleResumeFromHistory, removeFromHistory, clearHistory,

        getFollow, toggleFollow,
        getInteraction, toggleReaction,
    ]);
    return (
        <>
            {/*
              * ⚡ PHONE PERF: src is driven imperatively by the provider,
              * not via React prop — avoids remount + CORS preflight on every track.
              */}
            <audio ref={audioRef} crossOrigin="anonymous" />
            {/* ✅ Pre-warm the episodes list off-screen — keeps the heaviest
                subtree mounted from app boot, so tapping Studify → Browse is instant. */}
            <div
                aria-hidden="true"
                style={{
                    position: "fixed",
                    width: 0,
                    height: 0,
                    overflow: "hidden",
                    visibility: "hidden",
                    pointerEvents: "none",
                }}
            >
                {listEl}
            </div>

            {showSideTab && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 340, damping: 26 }}
                    className="fixed top-1/4 -translate-y-1/2 right-4 z-40 group"
                >
                    <motion.div
                        variants={{
                            collapsed: {
                                width: 56,
                                height: 56,
                                borderRadius: 28,
                                opacity: 1,
                            },
                            expanded: {
                                width: 240,
                                height: 56,
                                borderRadius: 28,
                                opacity: 1,
                            },
                        }}
                        initial="collapsed"
                        whileHover="expanded"
                        whileTap="expanded"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="
                relative flex items-center
                bg-gh-l-card dark:bg-gh-card
                shadow-[0_8px_28px_-8px_rgba(0,0,0,0.22)]
                dark:shadow-[0_8px_28px_-8px_rgba(0,0,0,0.6)]
                overflow-hidden
                cursor-pointer
            "
                        onClick={() => setIsOpen(true)}
                        role="button"
                        aria-label="Open Medrae Player"
                    >
                        {/* Soft glow behind (only when playing) */}
                        {isPlaying && (
                            <motion.span
                                aria-hidden="true"
                                animate={{
                                    opacity: [0.35, 0.6, 0.35],
                                }}
                                transition={{
                                    duration: 2.6,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                                className="absolute inset-0 rounded-full bg-blue-500/25 blur-lg pointer-events-none"
                            />
                        )}

                        {/* ── LEFT: Album disc with progress ring (fixed 56px) ── */}
                        <div className="relative h-14 w-14 flex items-center justify-center shrink-0">
                            <svg
                                className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                                viewBox="0 0 100 100"
                                aria-hidden="true"
                            >
                                <circle
                                    cx="50" cy="50" r="46"
                                    fill="none" stroke="currentColor" strokeWidth="4"
                                    className="text-gh-l-hover dark:text-gh-hover"
                                />
                                <motion.circle
                                    cx="50" cy="50" r="46"
                                    fill="none" stroke="currentColor" strokeWidth="5"
                                    strokeLinecap="round"
                                    strokeDasharray="290"
                                    style={{ strokeDashoffset: 290 - 290 * progress }}
                                    className="text-blue-500"
                                />
                            </svg>

                            <div
                                className={`
                        h-11 w-11 rounded-full overflow-hidden relative
                        bg-slate-900 dark:bg-slate-800
                        shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]
                        flex items-center justify-center
                        ${isPlaying ? "animate-[spin_4s_linear_infinite]" : ""}
                    `}
                            >
                                {/* Vinyl sheen */}
                                <div className="absolute inset-0 bg-[radial-gradient(circle,_transparent_45%,_rgba(0,0,0,0.45)_100%)] z-10 pointer-events-none" />

                                <Headphones
                                    className="h-6 w-6 text-white/90 relative z-20"
                                    strokeWidth={1.75}
                                />
                            </div>
                            {/* Playing signal — animated bars */}
                            {isPlaying && (
                                <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 ring-[2.5px] ring-gh-l-card dark:ring-gh-card flex items-center justify-center gap-[1px] px-[3px]">
                                    <motion.span
                                        animate={{ height: [3, 7, 3] }}
                                        transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
                                        className="w-[1.5px] bg-white rounded-full"
                                    />
                                    <motion.span
                                        animate={{ height: [5, 3, 6, 3] }}
                                        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
                                        className="w-[1.5px] bg-white rounded-full"
                                    />
                                    <motion.span
                                        animate={{ height: [3, 6, 3] }}
                                        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                                        className="w-[1.5px] bg-white rounded-full"
                                    />
                                </div>
                            )}
                        </div>

                        {/* ── RIGHT: Title + controls (revealed on expand) ── */}
                        <motion.div
                            variants={{
                                collapsed: { opacity: 0, x: -8 },
                                expanded: { opacity: 1, x: 0 },
                            }}
                            transition={{ duration: 0.18, delay: 0.05 }}
                            className="flex items-center gap-2 pr-3 pl-0 min-w-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Track info */}
                            <div className="flex flex-col min-w-0 max-w-[130px]">
                                <span className="text-[9px]   text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none">
                                    {isPlaying ? "Now playing" : "Paused"}
                                </span>
                                <span className="text-[12px] font-bold text-gh-l-text dark:text-gh-text truncate leading-tight mt-0.5">
                                    {currentTrack?.name || "Medrae Player"}
                                </span>
                            </div>

                            {/* Play/pause */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    togglePlay();
                                }}
                                aria-label={isPlaying ? "Pause" : "Play"}
                                className="
                        h-9 w-9 shrink-0 rounded-full
                        bg-gh-l-text dark:bg-gh-text
                        text-gh-l-card dark:text-gh-card
                        flex items-center justify-center
                        active:scale-95 transition-transform
                    "
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
                                    <span className="text-[15px]   tracking-[-0.02em] text-blue-black dark:text-white">
                                        {screen === "player" && "Medrae Studify"}
                                        {screen === "episodes" && "Studify Episodes"}
                                        {screen === "admin" && "Manage Podcasts"}
                                    </span>
                                    <span className="text-[9px] text-gh-l-muted dark:text-gh-muted font-semibold">
                                        {screen === "player" && (currentTrack?.showTitle ?? "Nursing Audio")}
                                        {screen === "episodes" && `${totalEpisodesLabel} episodes`}
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
                                    <span className="text-[15px]   tracking-[-0.02em] text-slate-900 dark:text-white">
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
                            {/* DESKTOP: search bar */}
                            <div className="hidden md:block px-5 pb-3 pt-2 shrink-0">
                                <EpisodeSearchBar
                                    onSearchMemory={handleSearchMemory}
                                    onSearchLocal={handleSearchLocal}
                                    onSearchRemote={handleSearchRemote}
                                    onSelect={handleSearchSelect}
                                    placeholder="Search episodes, topics, shows…"
                                />
                            </div>
                            {/* DESKTOP: two columns */}
                            <div className="hidden md:grid flex-1 min-h-0 grid-cols-[42%_58%]">
                                <div className="min-h-0 overflow-y-auto custom-scrollbar p-4 md:p-5 border-0">
                                    {screen === "admin" ? (
                                        <div className="w-full rounded-xl bg-gh-l-card dark:bg-gh-card shadow-none p-4 md:p-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <h2 className="text-sm   text-gh-l-text dark:text-gh-text">
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
                                            className="absolute inset-0 flex flex-col bg-gh-l-canvas dark:bg-gh-canvas"
                                            style={{ willChange: 'opacity' }}
                                        >
                                            {/* 🔍 Search bar — always at top of episodes screen */}
                                            <div className="shrink-0 px-3 pt-2 pb-2">
                                                <EpisodeSearchBar
                                                    onSearchMemory={handleSearchMemory}
                                                    onSearchLocal={handleSearchLocal}
                                                    onSearchRemote={handleSearchRemote}
                                                    onSelect={handleSearchSelect}
                                                    placeholder="Search episodes…"
                                                />
                                            </div>

                                            {/* 📜 Episodes list — scrolls under the search bar */}
                                            <div className="flex-1 min-h-0">
                                                {listEl}
                                            </div>
                                        </motion.div>
                                    )}
                                    {/* ✅ Pre-render the episodes screen ALWAYS (not just while on player).
                                        Keeps the tree mounted across player↔episodes transitions so the
                                        first render of EpisodesContent is not on the critical tap path.
                                        Hidden when not active — no paint, no interaction. */}
                                    {screen !== "episodes" && (
                                        <div
                                            key="m-episodes-preload"
                                            aria-hidden="true"
                                            className="absolute inset-0 opacity-0 pointer-events-none"
                                            style={{ visibility: "hidden" }}
                                        >
                                            {listEl}
                                        </div>
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
                                                    <h2 className="text-sm   text-gh-l-text dark:text-gh-text">
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
                                        <h3 className="text-sm   text-gh-l-text dark:text-gh-text mb-1">
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
        totalEpisodesLabel, currentInteraction,
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
                    {currentInteraction && currentInteraction.playCount > 0 && (
                        <p className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[10px]   uppercase tracking-wider">
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
                                        className="absolute inset-0 w-full h-full pointer-events-none -rotate-90"
                                        aria-hidden="true"
                                    >
                                        {/* Track ring */}
                                        <circle
                                            cx="50" cy="50" r="44"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="5"
                                            className="text-slate-200 dark:text-[#21262d]"
                                        />
                                        {/* Progress ring — follows the playhead */}
                                        <circle
                                            cx="50" cy="50" r="44"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="5"
                                            strokeLinecap="round"
                                            pathLength={100}
                                            strokeDasharray="100"
                                            strokeDashoffset={100 - safeProgress * 100}
                                            className="text-blue-600 dark:text-blue-500 transition-[stroke-dashoffset] duration-150"
                                        />
                                    </svg>
                                );
                            })()}

                            {/* Solid center disc */}
                            <span className="absolute inset-[14px] rounded-full bg-gradient-to-br from-slate-100 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center shadow-lg shadow-black/10 dark:shadow-black/40">
                                {isPlaying ? (
                                    /* Pause icon */
                                    <svg
                                        width="30" height="30" viewBox="0 0 24 24"
                                        className="text-slate-900 dark:text-white"
                                        fill="currentColor"
                                    >
                                        <rect x="7" y="5" width="3.5" height="14" rx="1.5" />
                                        <rect x="13.5" y="5" width="3.5" height="14" rx="1.5" />
                                    </svg>
                                ) : (
                                    /* Play icon — optical centering via marginLeft */
                                    <svg
                                        width="30" height="30" viewBox="0 0 24 24"
                                        className="text-slate-900 dark:text-white ml-1"
                                        fill="currentColor"
                                    >
                                        <path d="M8 5.5v13a1 1 0 0 0 1.55.83l9.5-6.5a1 1 0 0 0 0-1.66l-9.5-6.5A1 1 0 0 0 8 5.5Z" />
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
                                        className="
        absolute bottom-full mb-3 z-50
        right-0 md:left-1/2 md:right-auto md:-translate-x-1/2
        max-w-[calc(100vw-1.5rem)]
        flex flex-col items-center gap-2 rounded-xl
        bg-white dark:bg-gh-card
        shadow-2xl shadow-black/30 dark:shadow-black/60
        ring-1 ring-slate-200 dark:ring-white/10
        p-3 touch-manipulation
    "
                                    >
                                        <span className="text-[10px]   tabular-nums text-slate-500 dark:text-gh-muted">
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
                            {totalEpisodesLabel}
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
        parentLoading,
        onSelectShow, onSelectTrack, shows, onToggleEndorse, isAdmin, onManage,
        onHideEpisode,
        progress = 0,
        history = [],
        onResumeFromHistory,
        onRemoveFromHistory,
        onClearHistory,
        // ✅ NEW
        getInteraction,
        onToggleReaction,
        getFollow,
        onToggleFollow,
    } = props;
    //    `visibleTracks` may not be populated yet even if the parent has
    //    `tracks`. Force ONE skeleton frame so the user never sees blank.
    //    This is critical on mobile where the layout pass is slower.
    const [firstFrame, setFirstFrame] = useState(true);
    useEffect(() => {
        const id = requestAnimationFrame(() => setFirstFrame(false));
        return () => cancelAnimationFrame(id);
    }, []);

    const showSkeleton =
        firstFrame ||
        (loading && visibleTracks.length === 0) ||
        (visibleTracks.length === 0 && parentLoading === true);
    // ✅ "Continue listening" — shows the last few episodes the user opened
    const continueBlock = useMemo(() => {
        if (showSkeleton) return null;
        if (!history || history.length === 0) return null;

        // Show only the top 5 most-recent — not the full history
        const recent = history.slice(0, 5);

        return (
            <div className="px-3 md:px-4 pt-3 pb-1 shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Headphones size={14} className="text-blue-600 dark:text-blue-400" />
                        <h3 className="text-[11px]   uppercase tracking-widest text-gh-l-muted dark:text-gh-muted">
                            Continue listening
                        </h3>
                    </div>
                    <button
                        onClick={onClearHistory}
                        className="text-[10px] font-bold text-gh-l-muted dark:text-gh-muted hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                        Clear all
                    </button>
                </div>

                {recent.map((entry: HistoryEntry) => (
                    <ContinueListeningRow
                        key={entry.id}
                        entry={entry}
                        onResume={() => onResumeFromHistory(entry)}
                        onRemove={() => onRemoveFromHistory(entry.id)}
                    />
                ))}
            </div>
        );
    }, [history, showSkeleton, onResumeFromHistory, onRemoveFromHistory, onClearHistory]);
    const [chipsTimedOut, setChipsTimedOut] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setChipsTimedOut(true), 3000);
        return () => clearTimeout(t);
    }, []);
    // ✅ Chips-row skeleton — covers the case where `shows` hasn't loaded yet
    //    but we already have episode data. Avoids blank space above the list.
    const chipsSkeletonBlock = useMemo(() => {
        if (showSkeleton) return null;
        if (shows.length > 0) return null;
        if (chipsTimedOut) return null;
        return (
            <div className="px-3 md:px-4 pt-3 pb-3 shrink-0">
                <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="shrink-0 flex flex-col items-center gap-1.5">
                            <div className="w-28 h-28 md:w-32 md:h-32 rounded-xl bg-gh-l-hover dark:bg-gh-hover animate-pulse" />
                            <div className="h-2.5 w-16 rounded-full bg-gh-l-hover dark:bg-gh-hover animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }, [shows.length, showSkeleton, chipsTimedOut]);
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
                        const follow = getFollow?.(s.id) ?? { following: false, followerCount: 0 };
                        return (
                            <div
                                key={s.id}
                                className="shrink-0 flex flex-col items-center gap-1.5 group relative"
                            >
                                <button
                                    onClick={() => onSelectShow(s.id)}
                                    className="flex flex-col items-center gap-1.5 w-full"
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
                                                <div className="w-full h-full flex items-center justify-center text-lg   text-gh-l-muted dark:text-gh-muted">
                                                    {initial}
                                                </div>
                                            )}
                                            {!active && (
                                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                                            )}

                                            {onToggleFollow && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onToggleFollow(s.id);
                                                    }}
                                                    className={`absolute top-1.5 right-1.5 h-8 w-8 md:h-6 md:w-6 rounded-full flex items-center justify-center shadow-sm transition-all ${follow.following
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-white/90 dark:bg-slate-900/90 text-gh-l-text dark:text-gh-text hover:bg-white"
                                                        }`}
                                                    title={follow.following ? "Unfollow" : "Follow"}
                                                    aria-label={follow.following ? "Unfollow" : "Follow"}
                                                >
                                                    {follow.following ? (
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    ) : (
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <line x1="12" y1="5" x2="12" y2="19" />
                                                            <line x1="5" y1="12" x2="19" y2="12" />
                                                        </svg>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        {(s.endorsement_count > 0 || follow.followerCount > 0) && (
                                            <span className={`absolute -bottom-1 -right-1 min-w-[20px] h-[20px] px-1.5 rounded-full text-[9px]   flex items-center justify-center shadow-sm ${active
                                                ? "bg-blue-600 text-white"
                                                : "bg-gh-l-card dark:bg-gh-card text-gh-l-text dark:text-gh-text"
                                                }`}>
                                                {follow.followerCount > 0 ? follow.followerCount : s.endorsement_count}
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
                            </div>
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
    }, [shows, selectedShowId, isAdmin, showSkeleton, onSelectShow, onManage, getFollow, onToggleFollow]);
    const showCardsBlock = useMemo(() => {
        if (showSkeleton || selectedShowId !== null || shows.length === 0) return null;
        return (
            <div className="px-4 md:px-5 pb-3 shrink-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                    {shows.map((s: any) => {
                        const follow = getFollow?.(s.id) ?? { following: false, followerCount: 0 };
                        const initial = (s.title || "?").trim().charAt(0).toUpperCase();

                        return (
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
                                className="group flex gap-3 p-3 rounded-2xl bg-gh-l-card dark:bg-gh-card cursor-pointer transition-colors hover:bg-gh-l-hover dark:hover:bg-gh-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                                {/* ── Big square Spotify-style avatar ── */}
                                <div className="relative shrink-0 w-20 h-20 md:w-[88px] md:h-[88px] rounded-xl overflow-hidden bg-gh-l-hover dark:bg-gh-hover">
                                    {s.artwork_url ? (
                                        <img
                                            src={s.artwork_url}
                                            alt=""
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-2xl   text-gh-l-muted dark:text-gh-muted">
                                            {initial}
                                        </div>
                                    )}
                                </div>

                                {/* ── Text + buttons stacked ── */}
                                <div className="min-w-0 flex-1 flex flex-col justify-between">
                                    <div className="min-w-0">
                                        {/* Title — wraps, doesn't truncate */}
                                        <p className="text-sm font-bold leading-snug text-gh-l-text dark:text-gh-text group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                            {s.title}
                                        </p>
                                        {/* Description line — full width now */}
                                        <p className="text-[11px] text-gh-l-muted dark:text-gh-muted mt-0.5">
                                            {s.episode_count} episodes
                                            {follow.followerCount > 0 && ` · ${follow.followerCount} followers`}
                                            {s.endorsement_count > 0 && ` · ${s.endorsement_count} endorsements`}
                                        </p>
                                    </div>

                                    {/* ── Buttons on their own row ── */}
                                    {/* ── Buttons pinned to the far right ── */}
                                    <div
                                        className="flex items-center justify-end gap-1.5 mt-2"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {onToggleFollow && (
                                            <FollowButton
                                                following={follow.following}
                                                followerCount={follow.followerCount}
                                                onClick={() => onToggleFollow(s.id)}
                                                compact
                                            />
                                        )}
                                        <EndorseButton
                                            endorsed={s.user_endorsed}
                                            count={s.endorsement_count}
                                            onClick={() => onToggleEndorse(s.id)}
                                            compact
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }, [shows, selectedShowId, showSkeleton, onToggleEndorse, onSelectShow, getFollow, onToggleFollow]);
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
                        interaction={t.id ? getInteraction?.("episode", t.id) : undefined}
                        onToggleReaction={
                            t.id && onToggleReaction
                                ? (kind: "like" | "love" | "save") =>
                                    onToggleReaction("episode", t.id, kind)
                                : undefined
                        }
                    />
                );
            })}
        </>
    ), [visibleTracks, currentTrackSrc, isPlaying, progress, showSkeleton, isAdmin, onSelectTrack, onHideEpisode, getInteraction, onToggleReaction]);
    return (
        <div className="h-full flex flex-col min-h-0">
            <div className="md:hidden h-full overflow-y-auto custom-scrollbar">
                {continueBlock}
                {chipsBlock}
                {chipsSkeletonBlock}
                {showCardsBlock}
                <div className="px-3 pb-6">
                    {episodeRows}
                </div>
            </div>
            <div className="hidden md:block md:h-full md:min-h-0 md:overflow-y-auto custom-scrollbar">
                {continueBlock}
                {chipsBlock}
                {chipsSkeletonBlock}
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
                <h3 className="text-sm   tracking-tight text-gh-l-text dark:text-gh-text mb-1">
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
                <h3 className="text-sm   tracking-tight text-gh-l-text dark:text-gh-text mb-3">
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
const EndorseButton = React.memo(function EndorseButton({
    endorsed, count, onClick, compact = false,
}: {
    endorsed: boolean;
    count: number;
    onClick: () => void;
    compact?: boolean;
}) {
    const countLabel =
        count >= 1000
            ? `${(count / 1000).toFixed(1)}K`
            : count > 0
                ? String(count)
                : "";

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className={`
                shrink-0 flex items-center font-bold rounded-full transition-all touch-manipulation select-none
                ${compact
                    ? "gap-1 px-2.5 py-1.5 text-[10px] min-h-[32px]"
                    : "gap-1.5 px-3 py-2 text-xs min-h-[36px]"}
                md:min-h-0
                ${endorsed
                    ? "bg-blue-600 text-white"
                    : "bg-gh-l-hover dark:bg-gh-hover text-gh-l-text dark:text-gh-text hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"}
            `}
            title={endorsed ? "Endorsed — click to remove" : "Endorse this show"}
            aria-pressed={endorsed}
        >
            <ThumbsUp size={compact ? 12 : 13} fill={endorsed ? "currentColor" : "none"} />
            <span>{endorsed ? "Endorsed" : "Endorse"}</span>
            {countLabel && (
                <span
                    className={`text-[10px]   ${endorsed ? "text-white/80" : "text-gh-l-muted dark:text-gh-muted"
                        }`}
                >
                    {countLabel}
                </span>
            )}
        </button>
    );
});
// ════════════════════════════════════════════════════════════
// FOLLOW BUTTON
// ════════════════════════════════════════════════════════════
const FollowButton = React.memo(function FollowButton({
    following,
    followerCount,
    onClick,
    compact = false,
}: {
    following: boolean;
    followerCount: number;
    onClick: () => void;
    compact?: boolean;
}) {
    const countLabel =
        followerCount >= 1000
            ? `${(followerCount / 1000).toFixed(1)}K`
            : followerCount > 0
                ? String(followerCount)
                : "";

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className={`
                shrink-0 flex items-center font-bold rounded-full transition-all touch-manipulation select-none
                relative
                ${compact
                    ? "gap-1 px-2.5 py-1.5 text-[10px] min-h-[32px]"
                    : "gap-1.5 px-3 py-2 text-xs min-h-[36px]"}
                md:min-h-0
                ${following
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    : "bg-gh-l-hover dark:bg-gh-hover text-gh-l-text dark:text-gh-text hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
                }
                before:absolute before:inset-[-4px] before:content-[''] md:before:inset-0
            `}
            title={following ? "Unfollow" : "Follow this show"}
        >
            <Headphones size={compact ? 12 : 13} />
            <span>{following ? "Following" : "Follow"}</span>
            {countLabel && (
                <span
                    className={`text-[10px]   ${following ? "text-white/70 dark:text-slate-900/70" : "text-gh-l-muted dark:text-gh-muted"
                        }`}
                >
                    {countLabel}
                </span>
            )}
        </button>
    );
});
// ════════════════════════════════════════════════════════════
// CONTINUE LISTENING ROW
// ════════════════════════════════════════════════════════════
const ContinueListeningRow = React.memo(function ContinueListeningRow({
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

    // Relative time — "2h ago", "yesterday", "3d ago"
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
            <button
                onClick={onResume}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gh-l-hover dark:hover:bg-gh-hover transition-colors"
            >
                <div className="relative shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gh-l-hover dark:bg-gh-hover">
                    {entry.artwork ? (
                        <img
                            src={entry.artwork}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gh-l-muted dark:text-gh-muted text-[10px]  ">
                            ▶
                        </div>
                    )}

                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={18} fill="white" className="text-white ml-0.5" />
                    </div>

                    {/* Progress bar at bottom */}
                    {pct > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                            <div
                                className="h-full bg-blue-500"
                                style={{ width: `${pct}%` }}
                            />
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

                <span className="shrink-0 text-[10px]   uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    {entry.position > 5 ? "Resume" : "Play"}
                </span>
            </button>

            {/* Remove button — appears on hover (desktop) / always (mobile, subtle) */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 text-gh-l-muted dark:text-gh-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                title="Remove from history"
                aria-label="Remove from history"
            >
                <X size={14} />
            </button>
        </div>
    );
});
// ════════════════════════════════════════════════════════════
// EPISODE ROW — memoized (biggest win: rows skip re-render on
// timeupdate since their props don't change)
// ════════════════════════════════════════════════════════════
const EpisodeRow = React.memo(function EpisodeRow({
    track, index, isActive, isPlaying, onSelect, isAdmin, onHide,
    progress = 0, downloaded = false,
    interaction, onToggleReaction,
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
    interaction?: {
        liked: boolean; loved: boolean; saved: boolean;
        counts: { like: number; love: number; save: number };
    };
    onToggleReaction?: (kind: "like" | "love" | "save") => void;
}) {
    const R = 22;
    const C = 2 * Math.PI * R;
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const dashOffset = C * (1 - clampedProgress);


    return (
        <div
            className={`group w-full rounded-2xl mb-2 overflow-hidden transition-colors duration-150 ${isActive
                ? "bg-blue-50/70 dark:bg-blue-950/30"
                : "bg-gh-l-card dark:bg-gh-card"
                }`}
        >
            {/* ── TOP: everything that was there before, untouched ── */}
            <button
                onClick={onSelect}
                className="w-full flex items-start gap-3 px-3 py-3.5 md:py-3 text-left"
            >
                <div className="relative shrink-0 w-16 h-16 rounded-full overflow-hidden bg-gh-l-hover dark:bg-gh-hover">
                    {track.artwork ? (
                        <img
                            src={track.artwork}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gh-l-muted dark:text-gh-muted text-[10px]  ">
                            {index + 1}
                        </div>
                    )}

                    {isActive && (
                        <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                            <svg
                                className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                                viewBox="0 0 48 48"
                            >
                                <circle cx="24" cy="24" r={R} fill="none"
                                    stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
                                <circle cx="24" cy="24" r={R} fill="none"
                                    stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round"
                                    strokeDasharray={C} strokeDashoffset={dashOffset}
                                    style={{ transition: "stroke-dashoffset 0.25s linear" }} />
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
                    {/* Title — line-clamp-2 so long titles wrap instead of cutting */}
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
                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-[8px]   uppercase tracking-wider">
                                <CheckCircle2 size={8} />
                                Downloaded
                            </span>
                        )}
                        {interaction && interaction.playCount > 0 && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[8px]   uppercase tracking-wider">
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

            {/* ── BOTTOM: reactions only — full width, equal thirds ── */}
            {/* ── BOTTOM: bare action icons — no bg, no pills, just tap targets ── */}
            <div className="flex items-center gap-1 px-1 pb-2 pt-0.5">
                <ReactionIcon
                    kind="like"
                    active={interaction?.liked ?? false}
                    count={interaction?.counts.like ?? 0}
                    onClick={() => onToggleReaction?.("like")}
                />
                <ReactionIcon
                    kind="love"
                    active={interaction?.loved ?? false}
                    count={interaction?.counts.love ?? 0}
                    onClick={() => onToggleReaction?.("love")}
                />
                <ReactionIcon
                    kind="save"
                    active={interaction?.saved ?? false}
                    count={interaction?.counts.save ?? 0}
                    onClick={() => onToggleReaction?.("save")}
                />
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
// ════════════════════════════════════════════════════════════
// REACTION BUTTON — one small pill per reaction
// ════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
const ReactionIcon = React.memo(function ReactionIcon({
    kind, active, count, onClick,
}: {
    kind: "like" | "love" | "save";
    active: boolean;
    count: number;
    onClick: () => void;
}) {
    const Icon = kind === "like" ? ThumbsUp : kind === "love" ? Heart : Bookmark;

    const activeColor =
        kind === "love"
            ? "text-rose-500"
            : kind === "save"
                ? "text-emerald-600"
                : "text-blue-600";

    const display =
        count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count > 0 ? String(count) : "";

    // Bump the key whenever the *value* changes so the pop animation
    // replays on every tap (on → off also pops, feels snappy).
    const bumpKey = `${kind}-${count}-${active ? 1 : 0}`;

    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`
    flex items-center justify-center gap-1
    h-11 px-1.5
    rounded-full
    text-[11px] font-semibold tabular-nums
    transition-colors touch-manipulation select-none
    ${active
                    ? activeColor
                    : "text-gh-l-muted dark:text-gh-muted hover:text-gh-l-text dark:hover:text-gh-text"}
`}
            aria-label={`${kind}${count > 0 ? ` (${count})` : ""}`}
            aria-pressed={active}
        >
            <motion.span
                key={bumpKey}
                initial={{ scale: 0.85 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 600, damping: 18 }}
                className="flex items-center justify-center"
            >
                <Icon
                    size={18}
                    fill={active ? "currentColor" : "none"}
                    strokeWidth={active ? 0 : 2}
                />
            </motion.span>
            {display && (
                <span className="text-[10px] font-medium tabular-nums opacity-80">
                    {display}
                </span>
            )}
        </button>
    );
});