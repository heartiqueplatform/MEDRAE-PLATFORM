"use client";

import { useMusicPlayer } from "./MusicPlayerProvider";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Repeat,
    Volume2,
    VolumeX,
    ChevronDown,
    FilePlus,
} from "lucide-react";

interface Track {
    name: string;
    src: string; // Base64 or URL
    fromStorage?: boolean; // mark tracks loaded from localStorage
}

const LOCAL_STORAGE_KEY = "savedTracks";

export const MusicPlayer = () => {
    const defaultTracks: Track[] = [
        { name: "Lo-Fi Study Beat", src: "/sounds/Medrae_studify_music (1).mp3" },
        { name: "Calm Piano", src: "/sounds/Medrae_studify_music track1.mp3" },
        { name: "Focus Flow", src: "/sounds/Medrae_studify_music track 3.mp3" },
        { name: "Chill Vibes", src: "/sounds/Medrae_studify_music track 2.mp3" },
        { name: "Morning Study", src: "/sounds/Medrae_studify_music track 4.mp3" },
        { name: "Evening Calm", src: "/sounds/Medrae_studify_music (2).mp3" },
    ];

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

    // -------------------- Load saved tracks --------------------
    useEffect(() => {
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

        // Only append default tracks that are not already in savedTracks
        const combinedTracks = [...savedTracks];
        defaultTracks.forEach((t) => {
            if (!combinedTracks.some((st) => st.src === t.src)) {
                combinedTracks.push(t);
            }
        });

        setTracks(combinedTracks);
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
                            const updated = [...prev, track];
                            localStorage.setItem(
                                LOCAL_STORAGE_KEY,
                                JSON.stringify(updated.filter((t) => t.fromStorage))
                            );
                            setCurrentIndex(prev.length);
                            togglePlay(true);      // <-- updated
                            return updated;
                        });
                    };
                    reader.readAsDataURL(file);
                } else {
                    // large files → object URL (temporary)
                    const url = URL.createObjectURL(file);
                    setTracks((prev) => {
                        const updated = [...prev, { name: file.name, src: url }];
                        setCurrentIndex(prev.length);
                        togglePlay(true);      // <-- updated
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

            {/* 🔵 CIRCULAR AVATAR */}
            {/* 🔵 CIRCULAR AVATAR + NOW PLAYING */}
            <>
                <div className="fixed bottom-16 p-2 right-68 z-50 flex items-center gap-2">
                    {/* Avatar button */}
                    <button
                        onClick={() => setIsOpen(true)}
                        className="
        w-14 h-14 rounded-full
        bg-gray-800 dark:bg-gray-700
        flex items-center justify-center
        shadow-lg
        hover:scale-110 active:scale-95 transition-transform
        overflow-visible
      "
                    >
                        <img
                            src="/music.png"
                            alt="Music player"
                            className="w-16 h-16 object-contain pointer-events-none"
                            draggable={false}
                        />
                    </button>

                    {/* Now playing marquee */}
                    {isPlaying && tracks[currentIndex]?.name && (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-md text-sm px-2 py-1 rounded shadow-md max-w-[120px] overflow-hidden relative text-blue-900 dark:text-white"
                        >
                            <div className="animate-marquee whitespace-nowrap">
                                {tracks[currentIndex].name}
                            </div>
                        </motion.div>
                    )}
                </div>
            </>



            {/* 🌑 OVERLAY + CENTER PLAYER */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center"
                    onClick={() => setIsOpen(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white/90 dark:bg-blue-900/90 backdrop-blur-md shadow-lg rounded-xl p-2 flex flex-col gap-2 items-center w-[90%] max-w-md"
                    >
                        {/* 🌟 STUDIFY TITLE WITH ICON */}
                        <div className="flex items-center gap-2 mb-2 select-none">
                            {/* Music Icon */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-6 h-6 text-blue-900 dark:text-white"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 9l10.5-3v10.553a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66A2.25 2.25 0 0019.5 16.553V2.25L9 5.25v10.303a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
                                />
                            </svg>

                            {/* Title */}
                            <h2 className="text-2xl font-bold text-blue-900 dark:text-white">
                                STUDIFY
                            </h2>
                        </div>

                        {/* 🔴 EVERYTHING BELOW IS YOUR ORIGINAL CARD — UNCHANGED */}

                        {/* Track name & drawer */}
                        <div className="flex justify-between items-center w-full">
                            <span className="font-semibold text-blue-900 dark:text-white truncate">
                                {tracks[currentIndex]?.name}
                            </span>
                            <button
                                onClick={() => setShowTrackList((prev) => !prev)}
                                className="p-1 rounded hover:bg-blue-200 dark:hover:bg-blue-700"
                            >
                                <ChevronDown size={18} />
                            </button>
                        </div>

                        {/* Track list */}
                        {showTrackList && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-blue-800 rounded shadow-md w-full max-h-40 overflow-y-auto custom-scrollbar mt-1"
                            >
                                {tracks.map((t, i) => (
                                    <div
                                        key={i}
                                        onClick={() => handleSelectTrack(i)}
                                        className={`px-3 py-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-600 ${i === currentIndex
                                            ? "bg-blue-200 dark:bg-blue-700 font-semibold"
                                            : ""
                                            }`}
                                    >
                                        {t.name}
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {/* Progress bar */}
                        <div
                            className="w-full h-1 bg-gray-300 dark:bg-gray-600 rounded cursor-pointer"
                            onClick={handleProgressClick}
                        >
                            <div
                                className="h-1 bg-blue-500 rounded"
                                style={{ width: `${progress * 100}%` }}
                            />
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-between w-full mt-1">
                            <div className="flex items-center gap-2">
                                <button onClick={handlePrev} className="p-2 rounded hover:bg-blue-200 dark:hover:bg-blue-700">
                                    <SkipBack size={20} />
                                </button>
                                <button onClick={handleTogglePlay} className="p-2 rounded bg-blue-500 text-white hover:opacity-90">
                                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                                </button>
                                <button onClick={handleNext} className="p-2 rounded hover:bg-blue-200 dark:hover:bg-blue-700">
                                    <SkipForward size={20} />
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <button onClick={handleCycleRepeat} className={`p-2 rounded ${repeatColor} relative`}>
                                    <Repeat size={18} />
                                    {repeatMode === "one" && (
                                        <span className="absolute top-0 right-0 text-[10px] font-bold text-white">1</span>
                                    )}
                                </button>

                                <button onClick={handleToggleMute} className="p-2 rounded hover:bg-blue-200 dark:hover:bg-blue-700">
                                    {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                </button>

                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={volume}
                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    className="accent-blue-500 w-20"
                                />
                            </div>
                        </div>

                        {/* Upload */}
                        <label className="flex items-center gap-2 text-blue-900 dark:text-white cursor-pointer mt-2">
                            <FilePlus size={18} />
                            <span className="text-xs">Add Music</span>
                            <input type="file" accept="audio/*" multiple onChange={handleUpload} className="hidden" />
                        </label>

                    </motion.div>
                </motion.div>
            )}
        </>
    );
};
