"use client";

import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    studifyDb,
    putEpisodes,
    putShows,
    getLatestEpisodes,
    getEpisodesForShow,
    type DbEpisode,
    type DbShow,
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
    const refreshEpisodes = React.useCallback(async (opts?: { silent?: boolean }) => {
        const silent = opts?.silent ?? false;
        const now = Date.now();
        const stale = now - lastRefreshRef.current > CACHE_TTL_MS;

        // Skip if silent + fresh cache
        if (silent && !stale) return;

        if (!silent) setLoading(true);

        // ── Pull shows (small, always refresh) ──
        const { data: showRows, error: showErr } = await supabase
            .from("podcast_shows")
            .select("id, apple_id, title, author, artwork_url, description, is_active")
            .eq("is_active", true);

        if (showErr) {
            console.error("Failed to load shows:", showErr);
            if (!silent) setLoading(false);
            return;
        }

        // ── Pull episodes (capped at 200) ──
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

        // ── Persist to Dexie (async, off main thread) ──
        await putEpisodes((epRows ?? []).map(rowToDbEpisode));

        // ── Compute episode counts per show ──
        const counts = new Map<string, number>();
        (epRows ?? []).forEach((e: any) => {
            counts.set(e.show_id, (counts.get(e.show_id) ?? 0) + 1);
        });

        await putShows(
            (showRows ?? []).map((s: any): DbShow => ({
                id: s.id,
                appleId: s.apple_id,
                title: s.title,
                author: s.author ?? undefined,
                artwork: s.artwork_url ?? undefined,
                description: s.description ?? undefined,
                episodeCount: counts.get(s.id) ?? 0,
                endorsementCount: 0, // updated by usePodcastShows separately
                cachedAt: Date.now(),
            }))
        );

        // ── Map to Track[] and set state ──
        const episodeTracks: Track[] = (epRows ?? []).map(rowToDbEpisode).map(dbToTrack);
        setTracks(episodeTracks);
        setCurrentIndex((prev) => (prev < episodeTracks.length ? prev : 0));
        lastRefreshRef.current = Date.now();
        setLoading(false);
    }, []);

    // ── 3. On-demand fetch for a specific show (unlimited) ──
    const fetchShowEpisodes = React.useCallback(async (showId: string): Promise<Track[]> => {
        // Check Dexie first — do we have episodes for this show cached?
        const cached = await getEpisodesForShow(showId);
        const isFresh = cached.length > 0 &&
            Date.now() - (cached[0]?.cachedAt ?? 0) < CACHE_TTL_MS;

        if (isFresh) return cached.map(dbToTrack);

        // Otherwise fetch from Supabase
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
            return cached.map(dbToTrack);
        }

        const dbEps = (data ?? []).map(rowToDbEpisode);
        await putEpisodes(dbEps);
        return dbEps.map(dbToTrack);
    }, []);

    // ── 4. Initial kick: hydrate then refresh silently ──
    useEffect(() => {
        (async () => {
            // If Dexie had nothing, do a loud fetch
            const count = await studifyDb.episodes.count();
            if (count === 0) {
                await refreshEpisodes({ silent: false });
            } else {
                await refreshEpisodes({ silent: true });
            }
        })();
    }, [refreshEpisodes]);

    // Play/Pause & Volume
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

    const togglePlay = (force?: boolean) => {
        setIsPlaying(prev => (force !== undefined ? force : !prev));
    };
    const toggleMute = () => setMuted(prev => !prev);
    const toggleRepeat = () =>
        setRepeatMode(prev => (prev === "off" ? "all" : prev === "all" ? "one" : "off"));
    const nextTrack = () => setCurrentIndex(prev => (prev + 1) % Math.max(tracks.length, 1));
    const prevTrack = () => setCurrentIndex(prev => (prev - 1 + tracks.length) % Math.max(tracks.length, 1));
    const setVolume = (vol: number) => setVolumeState(vol);

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