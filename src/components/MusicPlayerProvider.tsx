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
    searchEpisodesRemote: (query: string) => Promise<Track[]>;

    // ✅ history API
    history: HistoryEntry[];
    clearHistory: () => void;
    removeFromHistory: (id: string) => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextProps | undefined>(
    undefined
);

const MAIN_FETCH_LIMIT = 200;
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 min

// ✅ Synchronous localStorage snapshot — paints the episode list in the
//    same frame the app mounts, before Dexie (async IDB) can resolve.
const SNAPSHOT_KEY = "medrae_podcast_snapshot_v1";
const SNAPSHOT_MAX_AGE = 1000 * 60 * 60 * 24; // 24h

// ─────────────────────────────────────────────────────────────
// CANONICAL ORDER
// Must match:
//   • Supabase's ORDER BY (published_at DESC, id ASC)
//   • Dexie's compareEpisodes (publishedAt DESC, id ASC)
// If they disagree, the list visibly reorders on every
// snapshot → Dexie → Supabase handoff.
// ─────────────────────────────────────────────────────────────
function sortTracks(list: Track[]): Track[] {
    return [...list].sort((a, b) => {
        const ap = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const bp = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        if (ap !== bp) return bp - ap;             // newest first
        return (a.id ?? a.src).localeCompare(b.id ?? b.src); // stable tiebreak
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
        // Only the last 60 tracks — keeps localStorage under the 5MB cap.
        const slice = tracks.slice(0, 60);
        localStorage.setItem(
            SNAPSHOT_KEY,
            JSON.stringify({ tracks: slice, ts: Date.now() })
        );
    } catch {
        /* quota exceeded — ignore */
    }
}

// ═══════════════════════════════════════════════════════════
// PLAYBACK HISTORY — "Continue listening"
// ═══════════════════════════════════════════════════════════
const HISTORY_KEY = "medrae_play_history_v1";
const HISTORY_MAX = 30;

export interface HistoryEntry {
    id: string;           // episode id (stable, unique)
    src: string;          // audio url
    name: string;         // episode title
    artwork?: string;
    showTitle?: string;
    showId?: string;
    duration?: number;
    publishedAt?: string;
    position: number;     // seconds — where the user left off
    lastPlayedAt: number; // ms timestamp
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
        /* quota — ignore */
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
    // Remove any prior entry for the same id, then unshift the new one
    const filtered = existing.filter((e) => e.id !== id);
    return [entry, ...filtered].slice(0, HISTORY_MAX);
}

// ── Mapping helpers ──
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
    // ✅ Seed from the synchronous localStorage snapshot so the first render
    //    already has tracks. Dexie will overwrite with a slightly fresher
    //    version on the next tick, then Supabase refreshes in the background.
    const snapshot = typeof window !== "undefined" ? readSnapshot() : null;
    const [tracks, setTracks] = useState<Track[]>(() => sortTracks(snapshot ?? []));
    const [loading, setLoading] = useState(snapshot === null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolumeState] = useState(1);
    const [muted, setMuted] = useState(false);
    const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
    const [progress, setProgress] = useState(0);

    // ✅ Playback history — reads synchronously from localStorage
    const [history, setHistory] = useState<HistoryEntry[]>(() => readHistory());
    const historyRef = useRef<HistoryEntry[]>(history);
    useEffect(() => {
        historyRef.current = history;
    }, [history]);

    const audioRef = useRef<HTMLAudioElement>(null);
    const lastRefreshRef = useRef<number>(0);
    const currentSrcRef = useRef<string | undefined>(undefined);

    // ✅ Persist a synchronous snapshot every time tracks change.
    //    Cheap (only 60 items), sync, quota-safe.
    useEffect(() => {
        if (tracks.length === 0) return;
        writeSnapshot(tracks);
    }, [tracks]);

    // ── 1. Hydrate from Dexie (indexedDB) as a fallback layer ──
    //    If we already painted from the localStorage snapshot, use Dexie
    //    only to seed `lastRefreshRef` (so we don't hit the network too early).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const cached = await getLatestEpisodes(MAIN_FETCH_LIMIT);
                if (cancelled) return;

                if (cached.length > 0) {
                    // ✅ Only overwrite tracks if Dexie has STRICTLY more than
                    //    we already have. Prevents a "flash back" to old data.
                    setTracks((prev) =>
                        cached.length > prev.length
                            ? sortTracks(cached.map(dbToTrack))
                            : prev
                    );
                    setLoading(false);
                    lastRefreshRef.current = cached[0].cachedAt;
                } else if (snapshot === null) {
                    // No snapshot AND no Dexie data → still loading.
                    setLoading(true);
                }
            } catch (e) {
                console.error("Dexie hydrate failed:", e);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            .select(
                `
                id, title, audio_url, duration, published_at, show_id, is_hidden,
                podcast_shows ( title, artwork_url )
            `
            )
            .eq("is_hidden", false)
            .order("published_at", { ascending: false, nullsFirst: false })
            .order("id", { ascending: true })           // ✅ unique tiebreaker
            .limit(MAIN_FETCH_LIMIT);

        if (epErr) {
            console.error("Failed to load episodes:", epErr);
            if (!silent) setLoading(false);
            return;
        }

        await putEpisodes((epRows ?? []).map(rowToDbEpisode));

        const episodeTracks: Track[] = sortTracks(
            (epRows ?? []).map(rowToDbEpisode).map(dbToTrack)
        );
        setTracks(episodeTracks);
        setCurrentIndex((prev) => (prev < episodeTracks.length ? prev : 0));
        lastRefreshRef.current = Date.now();
        setLoading(false);
    }, []);

    // ✅ Re-fetch episodes when auth settles so personalized data lands.
    //    NOTE: must live BELOW the refreshEpisodes useCallback — const
    //    declarations are not hoisted, so referencing it earlier crashes
    //    with "Cannot access 'refreshEpisodes' before initialization".
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

    // ── 3. On-demand fetch for a specific show (unlimited) ──
    const fetchShowEpisodes = useCallback(
        async (showId: string): Promise<Track[]> => {
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
                .order("id", { ascending: true });           // ✅ unique tiebreaker

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
    /**
     * Search episodes server-side. Used as the final layer of the
     * search stack — only fires when the query is 2+ chars and the
     * user has paused typing for ~150 ms.
     */
    const searchEpisodesRemote = useCallback(async (query: string): Promise<Track[]> => {
        const q = query.trim();
        if (q.length < 2) return [];

        // PostgREST .or() with ilike — matches title OR show title
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
    // ── 4. Initial kick ──
    useEffect(() => {
        // ✅ If we already painted from snapshot, we never show a loader — go silent.
        //    If we have nothing, show a proper load.
        const hasAnything = tracks.length > 0;
        refreshEpisodes({ silent: hasAnything });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshEpisodes]);



    // ═══════════════════════════════════════════════════════════
    // ── 5b. Record playback into history whenever the current
    //        track changes or periodically during playback.
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // Whenever the current track changes → seed a history entry at position 0
        const current = tracks[currentIndex];
        if (current?.src) {
            const id = current.id || current.src;
            setHistory((prev) => {
                const existing = prev.find((e) => e.id === id);
                // Only update if it's not already the top entry — avoids infinite loops
                if (existing && prev[0]?.id === id && existing.position === 0)
                    return prev;
                const next = upsertHistory(current, existing?.position ?? 0, prev);
                writeHistory(next);
                return next;
            });
        }

        let lastSaved = -1;
        const onTime = () => {
            // Save every 5 seconds of playback — cheap write, keeps position current
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

    // ── 6. Play / pause / volume ──
    // ═══════════════════════════════════════════════════════════
    // ── 5. AUDIO SRC + PLAY/PAUSE + VOLUME ──
    // One effect handles everything. Setting `src` and calling
    // `play()` in the same commit is what makes streaming work:
    // the browser begins buffering from the src assignment, and
    // play() resolves as soon as the first chunks arrive.
    //
    // Do NOT call audio.load() — it resets readyState to 0 and
    // forces a full re-buffer, which on a 60 MB podcast means
    // the play() waits 20+ seconds before starting.
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const next = tracks[currentIndex]?.src;
        if (!next) return;

        // ── 1. Swap the source only when it actually changed ──
        if (currentSrcRef.current !== next) {
            currentSrcRef.current = next;
            audio.src = next;
            // NOTE: no audio.load() here — see comment above.
        }

        // ── 2. Apply volume + mute every time ──
        audio.volume = volume;
        audio.muted = muted;

        // ── 3. Drive play/pause ──
        if (isPlaying) {
            audio.play().catch((err: any) => {
                if (err?.name === "AbortError") return; // normal race
                console.warn("[MusicPlayer] play() failed:", err?.name, err?.message, {
                    src: next?.slice(0, 80),
                    readyState: audio.readyState,
                    networkState: audio.networkState,
                });
                setLoading(false); // don't leave the spinner stuck
            });
        } else {
            audio.pause();
        }
    }, [tracks, currentIndex, isPlaying, volume, muted]);
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
        setIsPlaying((prev) => (force !== undefined ? force : !prev));
    }, []);

    // ✅ Attach lifecycle listeners to the <audio> element once so
    //    `loading` flips off the moment audio is actually outputting,
    //    not when the entire buffer is downloaded.
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onPlaying = () => setLoading(false);
        const onPlay = () => setLoading(false);
        // Belt-and-suspenders: if the browser refuses to fire events,
        // a 3-second timer after play() guarantees we drop the spinner.
        let safetyTimer: ReturnType<typeof setTimeout> | null = null;
        const onPlayStart = () => {
            if (safetyTimer) clearTimeout(safetyTimer);
            safetyTimer = setTimeout(() => setLoading(false), 3000);
        };

        audio.addEventListener("playing", onPlaying);
        audio.addEventListener("play", onPlayStart);
        audio.addEventListener("play", onPlay);
        audio.addEventListener("error", onPlaying);   // hide spinner on error too

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
                // ✅ history
                history,
                clearHistory,
                removeFromHistory,
                searchEpisodesRemote,
            }}
        >
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