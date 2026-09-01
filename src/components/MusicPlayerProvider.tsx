"use client";

import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from "react";

export interface Track {
    name: string;
    src: string;
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
    setTracks: (tracks: Track[]) => void;
    setCurrentIndex: (index: number) => void;
    togglePlay: (force?: boolean) => void;
    toggleMute: () => void;
    toggleRepeat: () => void;
    nextTrack: () => void;
    prevTrack: () => void;
    setVolume: (vol: number) => void;
    setIsPlaying: (playing: boolean) => void;
    setMuted: (muted: boolean) => void;
    setRepeatMode: (mode: RepeatMode) => void;
    setProgress: (progress: number) => void;
    audioRef: React.RefObject<HTMLAudioElement>;
}

const MusicPlayerContext = createContext<MusicPlayerContextProps | undefined>(undefined);

export const MusicPlayerProvider = ({ children }: { children: ReactNode }) => {
    const defaultTracks: Track[] = [
        { name: "Lo-Fi Study Beat", src: "/music/lofi1.mp3" },
        { name: "Calm Piano", src: "/music/piano1.mp3" },
    ];

    const [tracks, setTracks] = useState<Track[]>(defaultTracks);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolumeState] = useState(1);
    const [muted, setMuted] = useState(false);
    const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
    const [progress, setProgress] = useState(0);

    const audioRef = useRef<HTMLAudioElement>(null);

    // Play/Pause & Volume effect
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
    const nextTrack = () => setCurrentIndex(prev => (prev + 1) % tracks.length);
    const prevTrack = () => setCurrentIndex(prev => (prev - 1 + tracks.length) % tracks.length);
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
