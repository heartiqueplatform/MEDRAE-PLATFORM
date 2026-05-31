"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown, SkipBack, Play, Pause, SkipForward,
    Repeat, Volume2, VolumeX, FilePlus, Music4
} from 'lucide-react';
import { useMusicPlayer } from "./MusicPlayerProvider";
import { useState, useEffect } from "react";


import { supabase } from "@/lib/supabaseClient";

interface Track {
    name: string;
    src: string; // Base64 or URL
    fromStorage?: boolean; // mark tracks loaded from localStorage
}

const LOCAL_STORAGE_KEY = "savedTracks";

export const MusicPlayer = () => {


    // -------------------- UI State --------------------
    const [showTrackList, setShowTrackList] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // -------------------- Context State --------------------
    const {
        tracks,
        currentIndex,
        isPlaying,
        volume,
        muted,
        repeatMode,
        progress,
        audioRef,
        setTracks,
        setCurrentIndex,
        togglePlay,      // <-- updated
        setVolume,
        setMuted,
        setRepeatMode,
        setProgress,
    } = useMusicPlayer();

    const fetchDefaultTracks = async (): Promise<Track[]> => {
        const { data, error } = await supabase
            .from("music_tracks")
            .select("title, audio_url")
            .eq("is_active", true)
            .order("order_index", { ascending: true });

        if (error) {
            console.error("Failed to load music tracks:", error);
            return [];
        }

        return data.map((t) => ({
            name: t.title,
            src: t.audio_url,
        }));
    };

    // -------------------- Load saved tracks --------------------
    useEffect(() => {
        const loadTracks = async () => {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
            let savedTracks: Track[] = [];

            if (saved) {
                try {
                    savedTracks = JSON.parse(saved).map((t: Track) => ({
                        ...t,
                        fromStorage: true,
                    }));
                } catch { }
            }

            const dbTracks = await fetchDefaultTracks();

            const combinedTracks = [...savedTracks];

            dbTracks.forEach((t) => {
                if (!combinedTracks.some((st) => st.src === t.src)) {
                    combinedTracks.push(t);
                }
            });

            setTracks(combinedTracks);
        };

        loadTracks();
    }, []);

    useEffect(() => {
        // Save only tracks added by the user (fromStorage)
        const userTracks = tracks.filter((t) => t.fromStorage);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userTracks));
    }, [tracks]);

    // -------------------- Play/Pause & Volume --------------------
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

    // -------------------- Progress & Track End --------------------
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => setProgress(audio.currentTime / (audio.duration || 1));

        const handleEnded = () => {
            if (repeatMode === "one") {
                audio.currentTime = 0;
                audio.play();
            } else if (repeatMode === "all") {
                setCurrentIndex((prev) => (prev + 1) % tracks.length);
            } else {
                if (currentIndex < tracks.length - 1) setCurrentIndex((prev) => prev + 1);
                else togglePlay(false);   // <-- updated
            }
        };

        audio.addEventListener("timeupdate", updateProgress);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("timeupdate", updateProgress);
            audio.removeEventListener("ended", handleEnded);
        };
    }, [currentIndex, repeatMode, tracks]);

    // -------------------- Handlers --------------------
    const handleNext = () => setCurrentIndex((prev) => (prev + 1) % tracks.length);
    const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    const handleTogglePlay = () => togglePlay();         // <-- updated
    const handleToggleMute = () => setMuted((prev) => !prev);
    const handleCycleRepeat = () =>
        setRepeatMode((prev) => (prev === "off" ? "all" : prev === "all" ? "one" : "off"));
    const handleSelectTrack = (index: number) => {
        setCurrentIndex(index);
        togglePlay(true);           // <-- updated
        setShowTrackList(false);
    };

    // -------------------- Upload multiple tracks --------------------
    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        Array.from(e.target.files)
            .filter((f) => f.type.startsWith("audio/"))
            .forEach((file) => {
                if (file.size <= 2 * 1024 * 1024) {
                    // small files → localStorage
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const base64 = ev.target?.result as string;
                        const track: Track = { name: file.name, src: base64, fromStorage: true };
                        setTracks((prev) => {
                            const existingIndex = prev.findIndex(
                                (t) => t.name === file.name
                            );

                            let updated;

                            if (existingIndex !== -1) {
                                updated = [...prev];
                                updated[existingIndex] = track;
                                setCurrentIndex(existingIndex);
                            } else {
                                updated = [...prev, track];
                                setCurrentIndex(prev.length);
                            }

                            localStorage.setItem(
                                LOCAL_STORAGE_KEY,
                                JSON.stringify(updated.filter((t) => t.fromStorage))
                            );

                            togglePlay(true);
                            return updated;
                        });
                    };
                    reader.readAsDataURL(file);
                } else {
                    // large files → object URL (temporary)
                    const url = URL.createObjectURL(file);
                    setTracks((prev) => {
                        const newTrack = { name: file.name, src: url };

                        const existingIndex = prev.findIndex(
                            (t) => t.name === file.name
                        );

                        let updated;

                        if (existingIndex !== -1) {
                            updated = [...prev];
                            updated[existingIndex] = newTrack;
                            setCurrentIndex(existingIndex);
                        } else {
                            updated = [...prev, newTrack];
                            setCurrentIndex(prev.length);
                        }

                        togglePlay(true);
                        return updated;
                    });
                }
            });
    };

    // -------------------- Progress click --------------------
    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (!audioRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const newTime = (clickX / rect.width) * (audioRef.current.duration || 1);
        audioRef.current.currentTime = newTime;
        setProgress(newTime / (audioRef.current.duration || 1));
    };

    const repeatColor =
        repeatMode === "off" ? "hover:bg-blue-200 dark:hover:bg-blue-700" : "bg-blue-300 dark:bg-blue-600";

    // -------------------- JSX --------------------
    return (
        <>
            {/* Audio stays alive */}
            <audio ref={audioRef} src={tracks[currentIndex]?.src} />

            {/* --- 1. FLOATING MINIMALIST TRIGGER --- */}
            {/* --- 1. FLOATING SMART TRIGGER (Vertical Middle & Side-Docked) --- */}
            {/* --- 1. SIDE-DOCKED SMART TRIGGER --- */}
            <div className="fixed top-1/4 -translate-y-1/2 right-0 z-40 group">
                <motion.div
                    initial={{ x: "85%" }} // Tucked almost entirely off-screen
                    whileHover={{ x: "0%" }} // Slides out fully on hover
                    animate={{ x: isPlaying ? "10%" : "85%" }} // Peeks out slightly more when playing
                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                    className="relative flex items-center"
                >
                    {/* Track Info Pill - Only shows when playing + hovered, or just playing */}
                    <AnimatePresence>
                        {isPlaying && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: -12 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="absolute right-full hidden md:block"
                            >
                                <div className="bg-white dark:bg-gray-900 backdrop-blur-xl border-0 px-4 py-2 rounded-xl shadow-2xl min-w-[150px]">
                                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest block mb-1">Now Playing</span>
                                    <div className="w-28 overflow-hidden">
                                        <div className="animate-marquee text-[10px] font-bold text-black dark:text-white whitespace-nowrap">
                                            {tracks[currentIndex]?.name}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* The Tab Body */}
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex items-center bg-gray-400 dark:bg-muted/30 border-l border-0 p-2 rounded-l-3xl shadow-[-10px_0_30px_rgba(0,0,0,0.3)] transition-colors hover:bg-gray-300 hover:dark:bg-gray-900"
                    >
                        {/* The Vinyl / Progress Circle */}
                        <div className="relative h-14 w-14 flex items-center justify-center">
                            {/* SVG Progress Ring */}
                            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/5" />
                                <motion.circle
                                    cx="50" cy="50" r="46"
                                    fill="none" stroke="currentColor" strokeWidth="6"
                                    strokeDasharray="290"
                                    style={{ strokeDashoffset: 290 - (290 * progress) }}
                                    className="text-blue-500"
                                />
                            </svg>

                            {/* Vinyl Image */}
                            <div
                                className={`h-11 w-11 rounded-full overflow-hidden relative ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}
                            >
                                <div className="absolute inset-0 bg-[radial-gradient(circle,_transparent_40%,_rgba(0,0,0,0.4)_100%)] z-10" />
                                <img src="/music.png" alt="Music" className="w-full h-full object-cover" />
                            </div>

                            {/* Status Indicator Dot */}
                            {isPlaying && (
                                <span className="absolute -top-1 -left-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                </span>
                            )}
                        </div>

                        {/* Pull Handle (The 3 dots or "Chevron") */}
                        <div className="ml-2 flex flex-col gap-1 pr-1 opacity-40 group-hover:opacity-100 transition-opacity">
                            <div className="w-1 h-1 bg-white rounded-full"></div>
                            <div className="w-1 h-1 bg-white rounded-full"></div>
                            <div className="w-1 h-1 bg-white rounded-full"></div>
                        </div>
                    </button>
                </motion.div>
            </div>
            {/* --- 2. THE PLAYER OVERLAY --- */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[2147483647] bg-slate-950/40 backdrop-blur-sm flex items-center  justify-center p-4"
                        onClick={() => setIsOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-sm bg-white dark:bg-slate-900/90 backdrop-blur-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] rounded-[2.5rem] border border-slate-200 dark:border-white/10 p-8 flex flex-col items-center overflow-hidden"
                        >
                            {/* Header */}
                            <div className="w-full flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="bg-blue-600 p-1.5 rounded-lg">
                                        <Music4 size={18} className="text-white" />
                                    </div>
                                    <h2 className="text-lg font-black tracking-tighter dark:text-white">STUDIFY</h2>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"
                                >
                                    <ChevronDown />
                                </button>
                            </div>

                            {/* Album Art / Visualizer Placeholder */}
                            {/* --- Cinematic Alan Walker Style Album Art --- */}
                            <div className="relative w-56 h-56 rounded-[2rem] bg-slate-900 mb-1 shadow-2xl overflow-hidden border border-white/10 group">

                                {/* Background Image: Nurse with Alan Walker Vibe */}
                                <img
                                    src="https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?q=80&w=800&auto=format&fit=crop"
                                    alt="Nurse focus"
                                    className={`
            absolute inset-0 w-full h-full object-cover transition-transform duration-5000
            ${isPlaying ? 'scale-110' : 'scale-100'}
            brightness-[0.4] contrast-[1.2] grayscale-[30%]
        `}
                                />

                                {/* Alan Walker Themed Neon Overlay (Blue Glow) */}
                                <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-transparent to-slate-950/20" />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />

                                {/* Content Container */}
                                <div className="relative h-full w-full flex flex-col items-center justify-center p-4">

                                    {/* Visualizer Overlay */}
                                    {isPlaying ? (
                                        <div className="flex items-end gap-1.5 h-16 mb-2">
                                            {[...Array(8)].map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    animate={{
                                                        height: [10, 50, 20, 45, 15],
                                                        opacity: [0.5, 1, 0.7, 1, 0.5]
                                                    }}
                                                    transition={{
                                                        repeat: Infinity,
                                                        duration: 0.7,
                                                        delay: i * 0.1,
                                                        ease: "easeInOut"
                                                    }}
                                                    className="w-1.5 bg-blue-400 rounded-full shadow-[0_0_15px_rgba(96,165,250,0.8)]"
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="p-4 rounded-full bg-white/5 backdrop-blur-md border border-white/10">
                                                <Music4 size={32} className="text-blue-400/50" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400/40">Paused</span>
                                        </div>
                                    )}

                                    {/* Alan Walker Style Tag - Subtle Branding */}
                                    <div className="absolute bottom-4 flex flex-col items-center">
                                        <div className="h-[1px] w-8 bg-blue-500/50 mb-1" />
                                        <span className="text-[8px] font-bold text-blue-300/60 uppercase tracking-widest">Studify x Medrae</span>
                                    </div>
                                </div>

                                {/* Decorative Scanline Effect */}
                                <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
                            </div>
                            {/* Track Info */}
                            <div className="w-full text-center mb-6 overflow-hidden">
                                <h3 className="text-xl font-bold dark:text-white truncate px-2">
                                    {tracks[currentIndex]?.name || "No Track Selected"}
                                </h3>
                                <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mt-1">Medrae Study Radio</p>
                            </div>

                            {/* Track Selector Drawer */}
                            <div className="w-full mb-1">
                                <button
                                    onClick={() => setShowTrackList(!showTrackList)}
                                    className="w-full py-2 px-4 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-bold flex justify-between items-center hover:bg-slate-200 transition-colors"
                                >
                                    View Playlist
                                    <ChevronDown size={14} className={`transition-transform ${showTrackList ? 'rotate-180' : ''}`} />
                                </button>
                                {showTrackList && (
                                    <motion.div
                                        initial={{ height: 0 }} animate={{ height: 'auto' }}
                                        className="mt-0 max-h-16 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-100 dark:border-white/5 p-1"
                                    >
                                        {tracks.map((t, i) => (
                                            <div
                                                key={i} onClick={() => handleSelectTrack(i)}
                                                className={`px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors ${i === currentIndex ? 'bg-blue-500 text-white font-bold' : 'hover:bg-slate-200 dark:hover:bg-white/5 dark:text-slate-300'}`}
                                            >
                                                {t.name}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </div>

                            {/* Timeline */}
                            <div className="w-full space-y-2 mb-6">
                                <div
                                    className="group relative w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full cursor-pointer overflow-hidden"
                                    onClick={handleProgressClick}
                                >
                                    <div
                                        className="absolute h-full bg-blue-500 transition-all duration-150"
                                        style={{ width: `${progress * 100}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                                    <span>Live</span>
                                    <span>Focus Mode</span>
                                </div>
                            </div>

                            {/* Main Controls */}
                            <div className="flex items-center justify-between w-full mb-8">
                                <button onClick={handleCycleRepeat} className={`p-2 rounded-lg transition-colors ${repeatColor}`}>
                                    <Repeat size={20} />
                                    {repeatMode === "one" && <span className="absolute text-[8px] font-black">1</span>}
                                </button>

                                <div className="flex items-center gap-4">
                                    <button onClick={handlePrev} className="p-2 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full">
                                        <SkipBack fill="currentColor" size={24} />
                                    </button>
                                    <button
                                        onClick={handleTogglePlay}
                                        className="h-16 w-16 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-blue-500/40 transition-transform active:scale-90"
                                    >
                                        {isPlaying ? <Pause fill="white" size={32} /> : <Play fill="white" size={32} className="ml-1" />}
                                    </button>
                                    <button onClick={handleNext} className="p-2 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full">
                                        <SkipForward fill="currentColor" size={24} />
                                    </button>
                                </div>

                                <button onClick={handleToggleMute} className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                                    {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                </button>
                            </div>

                            {/* Volume & Upload Footer */}
                            <div className="w-full flex items-center justify-between pt-6 border-t border-slate-100 dark:border-white/5">
                                <input
                                    type="range" min={0} max={1} step={0.01} value={volume}
                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    className="accent-blue-500 w-24 h-1 cursor-pointer"
                                />
                                <label className="flex items-center gap-2 text-slate-400 hover:text-blue-500 cursor-pointer transition-colors">
                                    <FilePlus size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Add Audio</span>
                                    <input type="file" accept="audio/*" multiple onChange={handleUpload} className="hidden" />
                                </label>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <style>{`
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-marquee {
    display: inline-block;
    white-space: nowrap;
    padding-left: 100%;
    animation: marquee 8s linear infinite;
  }
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-100%); }
  }
`}</style>


        </>
    );
};
