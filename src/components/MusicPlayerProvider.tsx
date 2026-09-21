"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    studifyDb,
    putEpisodes,
    getLatestEpisodes,
    getEpisodesForShow,
    type DbEpisode,
} from "@/lib/studifyDb";

export interface Track {
    id?: string;
    name: string;
    src: string;
    artwork?: string;
    duration?: number;
    showTitle?: string;
    showId?: string;
    publishedAt?: string;
}

type RepeatMode = "off" | "one" | "all";

interface MusicPlayerContextProps {
    tracks: Track[];
    currentIndex: number;
    isPlaying: boolean;
    volume: number;
    muted: boolean;
    repeatMode: RepeatMode;
    progress: number;
    loading: boolean;
    setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
    setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
    togglePlay: (force?: boolean) => void;
    toggleMute: () => void;
    toggleRepeat: () => void;
    nextTrack: () => void;
    prevTrack: () => void;
    setVolume: (vol: number) => void;
    setIsPlaying: (playing: boolean) => void;
    setMuted: React.Dispatch<React.SetStateAction<boolean>>;
    setRepeatMode: React.Dispatch<React.SetStateAction<RepeatMode>>;
    setProgress: (progress: number) => void;
    audioRef: React.RefObject<HTMLAudioElement>;
    refreshEpisodes: (opts?: { silent?: boolean }) => Promise<void>;
    fetchShowEpisodes: (showId: string) => Promise<Track[]>;
}

const MusicPlayerContext = createContext<MusicPlayerContextProps | undefined>(undefined);

const MAIN_FETCH_LIMIT = 200;
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 min

// ── Mapping helpers ──
function rowToDbEpisode(e: any): DbEpisode {
    const show = Array.isArray(e.podcast_shows) ? e.podcast_shows[0] : e.podcast_shows;
    return {
        id: e.id,
        showId: e.show_id,
        showTitle: show?.title ?? undefined,
        showArtwork: show?.artwork_url ?? undefined,
        title: e.title,
        audioUrl: e.audio_url,
        duration: e.duration ?? undefined,
        publishedAt: e.published_at ?? undefined,
        isHidden: false,
        cachedAt: Date.now(),
    };
}

function dbToTrack(e: DbEpisode): Track {
    return {
        id: e.id,
        name: e.title,
        src: e.audioUrl,
        artwork: e.showArtwork,
        duration: e.duration,
        showTitle: e.showTitle,
        showId: e.showId,
        publishedAt: e.publishedAt,
    };
}

export const MusicPlayerProvider = ({ children }: { children: ReactNode }) => {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolumeState] = useState(1);
    const [muted, setMuted] = useState(false);
    const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
    const [progress, setProgress] = useState(0);

    const audioRef = useRef<HTMLAudioElement>(null);
    const lastRefreshRef = useRef<number>(0);
    const currentSrcRef = useRef<string | undefined>(undefined);

    // ── 1. Hydrate from Dexie INSTANTLY (before any network call) ──
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const cached = await getLatestEpisodes(MAIN_FETCH_LIMIT);
                if (cancelled) return;
                if (cached.length > 0) {
                    setTracks(cached.map(dbToTrack));
                    setLoading(false);
                    lastRefreshRef.current = cached[0].cachedAt;
                }
            } catch (e) {
                console.error("Dexie hydrate failed:", e);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // ── 2. Fetch fresh from Supabase ──
    const refreshEpisodes = useCallback(async (opts?: { silent?: boolean }) => {
        const silent = opts?.silent ?? false;
        const now = Date.now();
        const stale = now - lastRefreshRef.current > CACHE_TTL_MS;

        if (silent && !stale) return;

        if (!silent) setLoading(true);

        const { data: epRows, error: epErr } = await supabase
            .from("podcast_episodes")
            .select(`
                id, title, audio_url, duration, published_at, show_id, is_hidden,
                podcast_shows ( title, artwork_url )
            `)
            .eq("is_hidden", false)
            .order("published_at", { ascending: false, nullsFirst: false })
            .limit(MAIN_FETCH_LIMIT);

        if (epErr) {
            console.error("Failed to load episodes:", epErr);
            if (!silent) setLoading(false);
            return;
        }

        await putEpisodes((epRows ?? []).map(rowToDbEpisode));

        const episodeTracks: Track[] = (epRows ?? []).map(rowToDbEpisode).map(dbToTrack);
        setTracks(episodeTracks);
        setCurrentIndex((prev) => (prev < episodeTracks.length ? prev : 0));
        lastRefreshRef.current = Date.now();
        setLoading(false);
    }, []);

    // ── 3. On-demand fetch for a specific show (unlimited) ──
    const fetchShowEpisodes = useCallback(async (showId: string): Promise<Track[]> => {
        const { data, error } = await supabase
            .from("podcast_episodes")
            .select(`
                id, title, audio_url, duration, published_at, show_id, is_hidden,
                podcast_shows ( title, artwork_url )
            `)
            .eq("is_hidden", false)
            .eq("show_id", showId)
            .order("published_at", { ascending: false, nullsFirst: false });

        if (error) {
            console.error("Failed to load show episodes:", error);
            const cached = await getEpisodesForShow(showId);
            return cached.map(dbToTrack);
        }

        const dbEps = (data ?? []).map(rowToDbEpisode);
        await putEpisodes(dbEps);
        return dbEps.map(dbToTrack);
    }, []);

    // ── 4. Initial kick ──
    useEffect(() => {
        (async () => {
            const count = await studifyDb.episodes.count();
            if (count === 0) {
                await refreshEpisodes({ silent: false });
            } else {
                await refreshEpisodes({ silent: true });
            }
        })();
    }, [refreshEpisodes]);

    // ═══════════════════════════════════════════════════════════
    // ── 5. IMPERATIVE AUDIO SRC ──
    // Only sets `audio.src` when it actually changes → no remount,
    // no CORS preflight on every track tap, instant playback start.
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const next = tracks[currentIndex]?.src;
        if (!next) return;
        if (currentSrcRef.current === next) return;
        currentSrcRef.current = next;
        audio.src = next;
        audio.load();
    }, [tracks, currentIndex]);

    // ── 6. Play / pause / volume ──
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = volume;
        audio.muted = muted;

        if (isPlaying && tracks[currentIndex]?.src) {
            audio.play().catch(() => { });
        } else {
            audio.pause();
        }
    }, [isPlaying, currentIndex, volume, muted, tracks]);

    // ═══════════════════════════════════════════════════════════
    // ── 7. PREFETCH NEXT TRACK ──
    // When <10s remain, warm the browser cache for the next episode
    // so track transitions are gapless.
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        let primedFor: string | undefined;

        const onTime = () => {
            if (!audio.duration) return;
            const remaining = audio.duration - audio.currentTime;
            if (remaining > 10 || remaining < 0) return;

            const next = tracks[currentIndex + 1];
            if (!next?.src) return;
            if (next.src === primedFor) return;
            if (next.src === currentSrcRef.current) return;

            primedFor = next.src;
            // Silent prefetch — browser caches the bytes, we don't play them.
            const pre = new Audio();
            pre.preload = "auto";
            pre.src = next.src;
        };

        audio.addEventListener("timeupdate", onTime);
        return () => audio.removeEventListener("timeupdate", onTime);
    }, [tracks, currentIndex]);

    // ── 8. Stable action callbacks ──
    const togglePlay = useCallback((force?: boolean) => {
        setIsPlaying(prev => (force !== undefined ? force : !prev));
    }, []);

    const toggleMute = useCallback(() => setMuted(prev => !prev), []);

    const toggleRepeat = useCallback(() =>
        setRepeatMode(prev => (prev === "off" ? "all" : prev === "all" ? "one" : "off")),
        []);

    const nextTrack = useCallback(
        () => setCurrentIndex(prev => (prev + 1) % Math.max(tracks.length, 1)),
        [tracks.length]
    );

    const prevTrack = useCallback(
        () => setCurrentIndex(prev => (prev - 1 + tracks.length) % Math.max(tracks.length, 1)),
        [tracks.length]
    );

    const setVolume = useCallback((vol: number) => setVolumeState(vol), []);

    return (
        <MusicPlayerContext.Provider
            value={{
                tracks,
                currentIndex,
                isPlaying,
                volume,
                muted,
                repeatMode,
                progress,
                loading,
                setTracks,
                setCurrentIndex,
                togglePlay,
                toggleMute,
                toggleRepeat,
                nextTrack,
                prevTrack,
                setVolume,
                setIsPlaying,
                setMuted,
                setRepeatMode,
                setProgress,
                audioRef,
                refreshEpisodes,
                fetchShowEpisodes,
            }}
        >
            {children}
        </MusicPlayerContext.Provider>
    );
};

export const useMusicPlayer = () => {
    const context = useContext(MusicPlayerContext);
    if (!context) throw new Error("useMusicPlayer must be used within MusicPlayerProvider");
    return context;
};