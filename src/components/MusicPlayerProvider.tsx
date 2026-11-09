"use client";

import React, {
    createContext,
    useContext,
    useState,
    useRef,
    useEffect,
    useCallback,
    ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase, isReallyOnline } from "@/lib/supabaseClient";
import { getAudioBlob } from "@/lib/studifyDb";
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
    audioRef: React.RefObject<HTMLAudioElement | null>;
    refreshEpisodes: (opts?: { silent?: boolean }) => Promise<void>;
    fetchShowEpisodes: (showId: string) => Promise<Track[]>;
    searchEpisodesRemote: (query: string) => Promise<Track[]>;
    prefetchAudio: (src: string, priority?: number) => void;
    history: HistoryEntry[];
    clearHistory: () => void;
    removeFromHistory: (id: string) => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextProps | undefined>(
    undefined
);

const MAIN_FETCH_LIMIT = 200;
const CACHE_TTL_MS = 1000 * 60 * 15;

const SNAPSHOT_KEY = "medrae_podcast_snapshot_v1";
const SNAPSHOT_MAX_AGE = 1000 * 60 * 60 * 24;

function sortTracks(list: Track[]): Track[] {
    return [...list].sort((a, b) => {
        const ap = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const bp = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        if (ap !== bp) return bp - ap;
        return (a.id ?? a.src).localeCompare(b.id ?? b.src);
    });
}

function readSnapshot(): Track[] | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(SNAPSHOT_KEY);
        if (!raw) return null;
        const { tracks, ts } = JSON.parse(raw);
        if (!Array.isArray(tracks) || tracks.length === 0) return null;
        if (Date.now() - ts > SNAPSHOT_MAX_AGE) return null;
        return tracks as Track[];
    } catch {
        return null;
    }
}

function writeSnapshot(tracks: Track[]) {
    if (typeof window === "undefined") return;
    try {
        const slice = tracks.slice(0, 60);
        localStorage.setItem(
            SNAPSHOT_KEY,
            JSON.stringify({ tracks: slice, ts: Date.now() })
        );
    } catch {
        /* quota */
    }
}

// ═══════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════
const HISTORY_KEY = "medrae_play_history_v1";
const HISTORY_MAX = 30;

export interface HistoryEntry {
    id: string;
    src: string;
    name: string;
    artwork?: string;
    showTitle?: string;
    showId?: string;
    duration?: number;
    publishedAt?: string;
    position: number;
    lastPlayedAt: number;
}

function readHistory(): HistoryEntry[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (e: any) => e && typeof e.id === "string" && typeof e.src === "string"
        );
    } catch {
        return [];
    }
}

function writeHistory(entries: HistoryEntry[]) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(
            HISTORY_KEY,
            JSON.stringify(entries.slice(0, HISTORY_MAX))
        );
    } catch {
        /* quota */
    }
}

function upsertHistory(
    track: Track,
    position: number,
    existing: HistoryEntry[]
): HistoryEntry[] {
    const id = track.id || track.src;
    const entry: HistoryEntry = {
        id,
        src: track.src,
        name: track.name,
        artwork: track.artwork,
        showTitle: track.showTitle,
        showId: track.showId,
        duration: track.duration,
        publishedAt: track.publishedAt,
        position: Math.max(0, Math.floor(position || 0)),
        lastPlayedAt: Date.now(),
    };
    const filtered = existing.filter((e) => e.id !== id);
    return [entry, ...filtered].slice(0, HISTORY_MAX);
}

function rowToDbEpisode(e: any): DbEpisode {
    const show = Array.isArray(e.podcast_shows)
        ? e.podcast_shows[0]
        : e.podcast_shows;
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
    const snapshot = typeof window !== "undefined" ? readSnapshot() : null;
    const [tracks, setTracks] = useState<Track[]>(() => sortTracks(snapshot ?? []));
    // ✅ loading = TRUE only when we have literally nothing to show.
    //    If we painted from snapshot, we are NOT loading.
    const [loading, setLoading] = useState<boolean>(() => {
        if (typeof window === "undefined") return true;
        // Only show skeleton if we truly have no snapshot. Even then,
        // a timer below clears it after 800ms so the UI is never blank.
        return (snapshot?.length ?? 0) === 0;
    });
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolumeState] = useState(1);
    const [muted, setMuted] = useState(false);
    const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
    const [progress, setProgress] = useState(0);

    const [history, setHistory] = useState<HistoryEntry[]>(() => readHistory());
    const historyRef = useRef<HistoryEntry[]>(history);
    useEffect(() => {
        historyRef.current = history;
    }, [history]);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastRefreshRef = useRef<number>(0);
    const currentSrcRef = useRef<string | undefined>(undefined);
    const prefetchedSrcsRef = useRef<Set<string>>(new Set());
    const prefetchQueueRef = useRef<{ src: string; priority: number }[]>([]);
    const prefetchRunningRef = useRef(false);

    useEffect(() => {
        if (tracks.length === 0) return;
        writeSnapshot(tracks);
    }, [tracks]);
    // 🚨 SAFETY NET: never let loading block the UI for more than 800ms.
    //    If the network probe (isReallyOnline) or the Supabase fetch hangs,
    //    the player still renders with whatever tracks it has (possibly 0).
    //    A skeleton for half a second is acceptable — forever is not.
    useEffect(() => {
        if (!loading) return;
        const t = setTimeout(() => {
            setLoading(false);
        }, 800);
        return () => clearTimeout(t);
    }, [loading]);
    // ── 1. Hydrate from Dexie ──
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const cached = await getLatestEpisodes(MAIN_FETCH_LIMIT);
                if (cancelled) return;

                if (cached.length > 0) {
                    setTracks((prev) =>
                        cached.length > prev.length
                            ? sortTracks(cached.map(dbToTrack))
                            : prev
                    );
                    setLoading(false);
                    lastRefreshRef.current = cached[0].cachedAt;
                } else if (snapshot === null) {
                    // No snapshot, no Dexie → genuinely nothing. Keep loading=true
                    // so the skeleton shows while Supabase fetches.
                    setLoading(true);
                }
            } catch (e) {
                console.error("Dexie hydrate failed:", e);
                // ✅ Still clear loading so we never hang on a broken IndexedDB
                if (snapshot === null) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── 2. Fetch from Supabase ──
    const refreshEpisodes = useCallback(async (opts?: { silent?: boolean }) => {
        const silent = opts?.silent ?? false;
        const now = Date.now();
        const stale = now - lastRefreshRef.current > CACHE_TTL_MS;

        if (silent && !stale) return;

        // ✅ Only show skeleton if we truly have nothing to show.
        //    Never flip loading=true when we already painted from cache.
        let showedSkeleton = false;
        if (!silent) {
            setLoading((prev) => {
                // We only set true if tracks is currently empty. We read
                // tracks via a ref trick — but here we can just check
                // using the closure's current `tracks` snapshot.
                return prev && tracks.length > 0 ? false : prev;
            });
            // Instead, decide based on the tracks we have RIGHT NOW:
            showedSkeleton = tracks.length === 0;
            if (showedSkeleton) setLoading(true);
        }

        try {
            // ✅ Short-circuit offline: no network, no skeleton, no waiting.
            // ✅ Try the fetch regardless. isReallyOnline can be wrong on
            //    iOS Safari (adblock, low-power mode, flaky probes). If the
            //    fetch fails, we fall through to the catch and keep cache.
            const online = await isReallyOnline().catch(() => true);
            if (!online && navigator.onLine === false) {
                // Only skip when the browser itself says offline.
                if (tracks.length > 0) setLoading(false);
                if (showedSkeleton) setLoading(false);
                return;
            }

            const { data: epRows, error: epErr } = await supabase
                .from("podcast_episodes")
                .select(
                    `
                    id, title, audio_url, duration, published_at, show_id, is_hidden,
                    podcast_shows ( title, artwork_url )
                `
                )
                .eq("is_hidden", false)
                .order("published_at", { ascending: false, nullsFirst: false })
                .order("id", { ascending: true })
                .limit(MAIN_FETCH_LIMIT);

            if (epErr) {
                console.error("Failed to load episodes:", epErr);
                return; // finally will clear loading
            }

            await putEpisodes((epRows ?? []).map(rowToDbEpisode));

            const episodeTracks: Track[] = sortTracks(
                (epRows ?? []).map(rowToDbEpisode).map(dbToTrack)
            );
            setTracks(episodeTracks);
            setCurrentIndex((prev) => (prev < episodeTracks.length ? prev : 0));
            lastRefreshRef.current = Date.now();
        } catch (err) {
            console.error("refreshEpisodes threw:", err);
        } finally {
            // ✅ ALWAYS clears. This is the bug that used to hang offline.
            setLoading(false);
        }
    }, [tracks.length]);

    useEffect(() => {
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
            if (
                event === "SIGNED_IN" ||
                event === "TOKEN_REFRESHED" ||
                event === "INITIAL_SESSION"
            ) {
                refreshEpisodes({ silent: true });
            }
        });
        return () => sub.subscription.unsubscribe();
    }, [refreshEpisodes]);

    // ── Prefetch ──
    const prefetchAudio = useCallback((src: string, priority = 0) => {
        if (!src) return;
        if (prefetchedSrcsRef.current.has(src)) return;
        if (currentSrcRef.current === src) return;

        prefetchQueueRef.current.push({ src, priority });
        prefetchQueueRef.current.sort((a, b) => a.priority - b.priority);

        if (prefetchRunningRef.current) return;
        prefetchRunningRef.current = true;

        const run = async () => {
            while (prefetchQueueRef.current.length > 0) {
                const { src } = prefetchQueueRef.current.shift()!;
                if (prefetchedSrcsRef.current.has(src)) continue;
                prefetchedSrcsRef.current.add(src);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                try {
                    const res = await fetch(src, {
                        method: "GET",
                        headers: { Range: "bytes=0-262143" },
                        cache: "force-cache",
                        signal: controller.signal,
                    });
                    if (res.status === 200) {
                        try { await res.body?.cancel(); } catch { }
                    } else {
                        try { await res.arrayBuffer(); } catch { }
                    }
                } catch { }
                finally {
                    clearTimeout(timeoutId);
                }
                await new Promise((r) => setTimeout(r, 120));
            }
            prefetchRunningRef.current = false;
        };
        run();
    }, []);

    useEffect(() => {
        const current = tracks[currentIndex];
        if (!current?.src) return;
        prefetchedSrcsRef.current.add(current.src);
        for (let i = 1; i <= 5; i++) {
            const next = tracks[currentIndex + i];
            if (next?.src) prefetchAudio(next.src, i);
        }
    }, [tracks, currentIndex, prefetchAudio]);

    // ── Fetch a specific show's episodes ──
    const fetchShowEpisodes = useCallback(
        async (showId: string): Promise<Track[]> => {
            // ✅ Offline → return Dexie cache immediately.
            const online = await isReallyOnline();
            if (!online) {
                const cached = await getEpisodesForShow(showId);
                return sortTracks(cached.map(dbToTrack));
            }

            const { data, error } = await supabase
                .from("podcast_episodes")
                .select(
                    `
                    id, title, audio_url, duration, published_at, show_id, is_hidden,
                    podcast_shows ( title, artwork_url )
                `
                )
                .eq("is_hidden", false)
                .eq("show_id", showId)
                .order("published_at", { ascending: false, nullsFirst: false })
                .order("id", { ascending: true });

            if (error) {
                console.error("Failed to load show episodes:", error);
                const cached = await getEpisodesForShow(showId);
                return sortTracks(cached.map(dbToTrack));
            }

            const dbEps = (data ?? []).map(rowToDbEpisode);
            await putEpisodes(dbEps);
            return sortTracks(dbEps.map(dbToTrack));
        },
        []
    );

    const searchEpisodesRemote = useCallback(async (query: string): Promise<Track[]> => {
        const q = query.trim();
        if (q.length < 2) return [];

        const online = await isReallyOnline();
        if (!online) return [];

        const pattern = `%${q}%`;
        const { data, error } = await supabase
            .from("podcast_episodes")
            .select(`
                id, title, audio_url, duration, published_at, show_id, is_hidden,
                podcast_shows ( title, artwork_url )
            `)
            .eq("is_hidden", false)
            .or(`title.ilike.${pattern}`)
            .order("published_at", { ascending: false, nullsFirst: false })
            .order("id", { ascending: true })
            .limit(40);

        if (error) {
            console.error("searchEpisodesRemote:", error);
            return [];
        }

        const dbEps = (data ?? []).map(rowToDbEpisode);
        return sortTracks(dbEps.map(dbToTrack));
    }, []);

    useEffect(() => {
        const hasAnything = tracks.length > 0;
        refreshEpisodes({ silent: hasAnything });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshEpisodes]);

    // ── History recording ──
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const current = tracks[currentIndex];
        if (current?.src) {
            const id = current.id || current.src;
            setHistory((prev) => {
                const existing = prev.find((e) => e.id === id);
                if (existing && prev[0]?.id === id && existing.position === 0)
                    return prev;
                const next = upsertHistory(current, existing?.position ?? 0, prev);
                writeHistory(next);
                return next;
            });
        }

        let lastSaved = -1;
        const onTime = () => {
            const t = Math.floor(audio.currentTime);
            if (t === lastSaved || t % 5 !== 0) return;
            lastSaved = t;

            const cur = tracks[currentIndex];
            if (!cur?.src) return;

            setHistory((prev) => {
                const next = upsertHistory(cur, t, prev);
                writeHistory(next);
                return next;
            });
        };

        audio.addEventListener("timeupdate", onTime);
        return () => audio.removeEventListener("timeupdate", onTime);
    }, [tracks, currentIndex]);

    // ── PLAY / PAUSE / VOLUME (with offline guard + blob playback) ──
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const next = tracks[currentIndex]?.src;
        if (!next) return;

        let cancelled = false;

        void (async () => {
            if (currentSrcRef.current !== next) {
                currentSrcRef.current = next;

                // ✅ If this episode was downloaded, play from blob: URL.
                const trackId = tracks[currentIndex]?.id;
                if (trackId) {
                    try {
                        const row = await getAudioBlob(trackId);
                        if (cancelled) return;
                        if (row?.blob) {
                            const blobUrl = URL.createObjectURL(row.blob);
                            audio.src = blobUrl;
                            audio.volume = volume;
                            audio.muted = muted;
                            if (isPlaying) {
                                audio.play().catch(() => setLoading(false));
                            } else {
                                audio.pause();
                            }
                            return;
                        }
                    } catch { /* fall through to remote */ }
                }
                if (cancelled) return;
                audio.src = next;
            }

            audio.volume = volume;
            audio.muted = muted;

            if (isPlaying) {
                // ✅ Offline guard — allow blob or already-buffered.
                const offline =
                    typeof navigator !== "undefined" && navigator.onLine === false;
                if (offline) {
                    const isBlob = audio.src.startsWith("blob:");
                    const buffered = audio.readyState >= 2;
                    if (!isBlob && !buffered) {
                        toast.error("You're offline", {
                            description: "This episode isn't downloaded. Reconnect to play it.",
                            id: "offline-play-block",
                        });
                        setIsPlaying(false);
                        setLoading(false);
                        return;
                    }
                }

                audio.play().catch((err: any) => {
                    if (err?.name === "AbortError") return;
                    console.warn("[MusicPlayer] play() failed:", err?.name, err?.message);
                    setLoading(false);
                });
            } else {
                audio.pause();
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [tracks, currentIndex, isPlaying, volume, muted]);
    // ── Prefetch next track at <10s remaining ──
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
            const pre = new Audio();
            pre.preload = "auto";
            pre.src = next.src;
        };

        audio.addEventListener("timeupdate", onTime);
        return () => audio.removeEventListener("timeupdate", onTime);
    }, [tracks, currentIndex]);

    // ── Actions ──
    const togglePlay = useCallback((force?: boolean) => {
        setIsPlaying((prev) => (force !== undefined ? force : !prev));
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onPlaying = () => setLoading(false);
        const onPlay = () => setLoading(false);
        let safetyTimer: ReturnType<typeof setTimeout> | null = null;
        const onPlayStart = () => {
            if (safetyTimer) clearTimeout(safetyTimer);
            safetyTimer = setTimeout(() => setLoading(false), 3000);
        };

        audio.addEventListener("playing", onPlaying);
        audio.addEventListener("play", onPlayStart);
        audio.addEventListener("play", onPlay);
        audio.addEventListener("error", onPlaying);

        return () => {
            audio.removeEventListener("playing", onPlaying);
            audio.removeEventListener("play", onPlayStart);
            audio.removeEventListener("play", onPlay);
            audio.removeEventListener("error", onPlaying);
            if (safetyTimer) clearTimeout(safetyTimer);
        };
    }, []);

    const toggleMute = useCallback(() => setMuted((prev) => !prev), []);
    const toggleRepeat = useCallback(
        () =>
            setRepeatMode((prev) =>
                prev === "off" ? "all" : prev === "all" ? "one" : "off"
            ),
        []
    );

    const nextTrack = useCallback(
        () => setCurrentIndex((prev) => (prev + 1) % Math.max(tracks.length, 1)),
        [tracks.length]
    );
    const prevTrack = useCallback(
        () =>
            setCurrentIndex(
                (prev) => (prev - 1 + tracks.length) % Math.max(tracks.length, 1)
            ),
        [tracks.length]
    );
    const setVolume = useCallback((vol: number) => setVolumeState(vol), []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        writeHistory([]);
    }, []);

    const removeFromHistory = useCallback((id: string) => {
        setHistory((prev) => {
            const next = prev.filter((e) => e.id !== id);
            writeHistory(next);
            return next;
        });
    }, []);

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
                history,
                clearHistory,
                removeFromHistory,
                searchEpisodesRemote,
                prefetchAudio,
            }}
        >
            <audio ref={audioRef} crossOrigin="anonymous" preload="metadata" />
            {children}
        </MusicPlayerContext.Provider>
    );
};

export const useMusicPlayer = () => {
    const context = useContext(MusicPlayerContext);
    if (!context)
        throw new Error("useMusicPlayer must be used within MusicPlayerProvider");
    return context;
};