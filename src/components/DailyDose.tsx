"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Headphones, Podcast, Sparkles, Clock, Calendar } from 'lucide-react';
import { useMusicPlayer } from './MusicPlayerProvider';
import type { Track } from './MusicPlayerProvider';

// ── helpers ─────────────────────────────────────────────
function fmtTime(seconds?: number) {
    if (!seconds || !isFinite(seconds)) return '--:--';
    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

function daySeed() {
    return Math.floor(Date.now() / 86400000);
}

// deterministic shuffle using a seed (mulberry32)
function seededShuffle<T>(arr: T[], seed: number): T[] {
    const a = [...arr];
    let s = seed || 1;
    const rng = () => {
        s |= 0; s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ── props ───────────────────────────────────────────────
interface DailyDoseProps {
    /** Called when a user taps an episode. Parent should open the Studify overlay. */
    onOpenPlayer?: () => void;
}

export const DailyDose: React.FC<DailyDoseProps> = ({ onOpenPlayer }) => {
    const { tracks, setCurrentIndex, togglePlay, refreshEpisodes } = useMusicPlayer();
    const [refreshed, setRefreshed] = useState(false);

    // Ensure we have episodes even if the provider hasn't fetched yet
    useEffect(() => {
        if (!refreshed && tracks.length === 0) {
            refreshEpisodes({ silent: true }).then(() => setRefreshed(true));
        }
    }, [tracks.length, refreshed, refreshEpisodes]);

    // Featured = deterministic per day; Top = deterministic shuffle of everything else
    const { featured, topPicks } = useMemo(() => {
        if (!tracks.length) return { featured: null as Track | null, topPicks: [] as Track[] };
        const seed = daySeed();
        const shuffled = seededShuffle(tracks, seed);
        const feat = shuffled[0] ?? null;
        // Top 10 excluding the featured episode
        const top = shuffled.slice(1, 8);
        return { featured: feat, topPicks: top };
    }, [tracks]);

    if (!featured) {
        return <DailyDoseSkeleton />;
    }

    const handlePlay = (track: Track) => {
        const idx = tracks.findIndex((t) => t.src === track.src);
        if (idx >= 0) {
            setCurrentIndex(idx);
            togglePlay(true);
            onOpenPlayer?.();
        }
    };

    return (
        <section className="w-full max-w-5xl mx-auto">
            {/* ── header row ── */}
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">

                    <div>
                        <h2 className="text-sm font-black tracking-tight text-gh-l-text dark:text-gh-text leading-none">
                            Studify Daily Pulse
                        </h2>
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400  tracking-widest mt-0.5">
                            Curated for you · Today
                        </p>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-gh-l-muted dark:text-gh-muted uppercase tracking-widest">
                    <Calendar size={11} />
                    {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
            </div>

            {/* ── FEATURED EPISODE — premium hero card ── */}
            <motion.button
                onClick={() => handlePlay(featured)}
                whileHover={{ scale: 1.008 }}
                whileTap={{ scale: 0.995 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className="relative w-full overflow-hidden rounded-xl bg-gh-l-card dark:bg-gh-card shadow-none p-4 md:p-5 mb-5 text-left"
            >
                {/* blurred artwork background */}
                {featured.artwork && (
                    <div className="absolute inset-0 -z-10 opacity-25">
                        <img src={featured.artwork} alt="" className="w-full h-full object-cover scale-125 blur-2xl" />
                        <div className="absolute inset-0 bg-gradient-to-r from-gh-l-card/90 via-gh-l-card/70 to-transparent dark:from-gh-card/90 dark:via-gh-card/70" />
                    </div>
                )}


                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                    {/* artwork */}
                    <div className="relative shrink-0 w-full md:w-44 md:h-44 lg:w-52 lg:h-52 aspect-square md:aspect-auto rounded-xl overflow-hidden shadow-none">
                        {featured.artwork ? (
                            <img src={featured.artwork} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gh-l-hover dark:bg-gh-hover flex items-center justify-center">
                                <Headphones size={48} className="text-gh-l-muted dark:text-gh-muted" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-14 h-14 rounded-full bg-blue-600 shadow-none flex items-center justify-center">
                                <Play size={22} fill="white" className="text-white ml-0.5" />
                            </div>
                        </div>
                    </div>

                    {/* meta */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                                <Sparkles size={9} />
                                Today's pick
                            </span>
                            {featured.showTitle && (
                                <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest text-gh-l-muted dark:text-gh-muted truncate">
                                    · {featured.showTitle}
                                </span>
                            )}
                        </div>

                        <h3 className="text-base md:text-lg font-black tracking-tight text-gh-l-text dark:text-gh-text leading-snug line-clamp-2">
                            {featured.name}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] font-semibold text-gh-l-muted dark:text-gh-muted">
                            {featured.duration && (
                                <span className="inline-flex items-center gap-1">
                                    <Clock size={10} />
                                    {fmtTime(featured.duration)}
                                </span>
                            )}
                            {featured.publishedAt && (
                                <span className="inline-flex items-center gap-1">
                                    <Calendar size={10} />
                                    {new Date(featured.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            )}
                        </div>

                        {/* play CTA row */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-none">
                                <Play size={12} fill="white" className="ml-0.5" />
                                Play now
                            </span>
                            {/* Apple Podcasts attribution — "premium" cue */}
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gh-l-muted dark:text-gh-muted">
                                <ApplePodcastsIcon className="w-3.5 h-3.5" />
                                via Apple Podcasts
                            </span>
                        </div>
                    </div>
                </div>
            </motion.button>

            {/* ── TOP 10 RANDOM PICKS ── */}
            <div className="mb-2 px-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black tracking-tight text-gh-l-text dark:text-gh-text ">
                        Top 8~Eight for today
                    </h3>
                </div>
                <span className="text-[9px] font-bold text-gh-l-muted dark:text-gh-muted  tracking-widest">
                    Shuffled daily
                </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {topPicks.map((t, i) => (
                    <TopPickCard key={t.id || i} track={t} index={i} onClick={() => handlePlay(t)} />
                ))}
                <ApplePodcastsTile onClick={() => window.__studifyOpen?.("episodes")} />
            </div>
        </section>
    );
};

// ── Top Pick Card ──────────────────────────────────────
function TopPickCard({ track, index, onClick }: { track: Track; index: number; onClick: () => void }) {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="group w-full text-left rounded-xl bg-gh-l-card dark:bg-gh-card shadow-none overflow-hidden hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/50 transition-shadow"
        >
            {/* ── Big artwork on top, edge to edge ── */}
            <div className="relative w-full aspect-square overflow-hidden">
                {track.artwork ? (
                    <img
                        src={track.artwork}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gh-l-hover dark:bg-gh-hover flex items-center justify-center">
                        <Headphones size={40} className="text-gh-l-muted dark:text-gh-muted" />
                    </div>
                )}
                {/* play overlay on hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-blue-600 shadow-none flex items-center justify-center">
                        <Play size={20} fill="white" className="text-white ml-0.5" />
                    </div>
                </div>
            </div>

            {/* ── Meta row below ── */}
            <div className="p-3">
                <p className="text-[13px] font-bold truncate text-gh-l-text dark:text-gh-text">
                    {track.name}
                </p>
                <p className="mt-1 text-[10px] truncate text-gh-l-muted dark:text-gh-muted">
                    {track.showTitle ? `${track.showTitle} · ` : ''}
                    {track.duration ? fmtTime(track.duration) : '—'}
                </p>
            </div>

            {/* ── Full-width counter strip at the bottom ── */}
            <div className="w-full flex items-center justify-between px-3 py-2 bg-gh-l-hover dark:bg-gh-hover">
                <span className="text-[10px] font-black  tracking-widest text-gh-l-muted dark:text-gh-muted">
                    Pick {index + 1}
                </span>
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">
                    {index + 1}
                </span>
            </div>
        </motion.button>
    );
}

// ── Skeleton ───────────────────────────────────────────
function DailyDoseSkeleton() {
    return (
        <section className="w-full max-w-5xl mx-auto animate-pulse">
            <div className="h-5 w-32 rounded-full bg-gh-l-hover dark:bg-gh-hover mb-4" />
            <div className="w-full rounded-xl bg-gh-l-card dark:bg-gh-card shadow-none p-5 mb-5">
                <div className="flex items-center gap-4">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-gh-l-hover dark:bg-gh-hover" />
                    <div className="flex-1 space-y-3">
                        <div className="h-3 w-24 rounded-full bg-gh-l-hover dark:bg-gh-hover" />
                        <div className="h-4 w-4/5 rounded-full bg-gh-l-hover dark:bg-gh-hover" />
                        <div className="h-3 w-1/3 rounded-full bg-gh-l-hover dark:bg-gh-hover" />
                        <div className="h-8 w-32 rounded-full bg-gh-l-hover dark:bg-gh-hover" />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl bg-gh-l-card dark:bg-gh-card p-3 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gh-l-hover dark:bg-gh-hover" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 rounded-full bg-gh-l-hover dark:bg-gh-hover" style={{ width: '80%' }} />
                            <div className="h-2.5 rounded-full bg-gh-l-hover dark:bg-gh-hover" style={{ width: '50%' }} />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

// ── Apple Podcasts SVG icon (tiny, official-looking) ──
// ── Apple logo (bitten apple) ──────────────────────────
function ApplePodcastsIcon({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
            {/* Apple's bitten-apple silhouette */}
            <path d="M17.05 12.54c-.03-2.8 2.29-4.14 2.4-4.2-1.31-1.91-3.35-2.17-4.07-2.2-1.73-.18-3.38 1.02-4.25 1.02-.88 0-2.23-.99-3.66-.97-1.88.03-3.62 1.09-4.59 2.78-1.96 3.4-.5 8.42 1.41 11.18.93 1.35 2.05 2.86 3.51 2.8 1.41-.05 1.94-.91 3.65-.91 1.7 0 2.18.91 3.66.88 1.5-.02 2.48-1.37 3.4-2.72 1.07-1.55 1.5-3.04 1.53-3.12-.03-.02-2.94-1.13-2.97-4.5zM14.29 4.51c.77-.93 1.29-2.23 1.15-3.51-1.11.04-2.44.74-3.23 1.66-.71.82-1.32 2.14-1.15 3.39 1.23.1 2.49-.62 3.23-1.54z" />
        </svg>
    );
}
// ── 11th card: Apple Podcasts tile ─────────────────────
function ApplePodcastsTile({ onClick }: { onClick: () => void }) {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="group w-full text-left rounded-xl overflow-hidden shadow-none hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/50 transition-shadow bg-gh-l-card dark:bg-gh-card"
        >
            {/* Top block — purple gradient with Apple logo, same height as episode artwork */}
            <div className="relative w-full aspect-square bg-gradient-to-br from-[#B150F2] to-[#8927EB] flex items-center justify-center">
                {/* soft radial highlight for depth */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.25),transparent_60%)]" />

                <ApplePodcastsIcon className="w-20 h-20 md:w-28 md:h-28 text-white relative z-10 drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white shadow-none flex items-center justify-center">
                        <Play size={20} className="text-[#8927EB] ml-0.5" />
                    </div>
                </div>
            </div>

            {/* Meta row — matches episode cards */}
            <div className="p-3">
                <p className="text-[13px] font-bold truncate text-gh-l-text dark:text-gh-text">
                    Browse library
                </p>
                <p className="mt-1 text-[10px] truncate text-gh-l-muted dark:text-gh-muted">
                    Open all episodes
                </p>
            </div>

            {/* Bottom strip — matches episode cards */}
            <div className="w-full flex items-center justify-between px-3 py-2 bg-gh-l-hover dark:bg-gh-hover">
                <span className="text-[10px] font-black  tracking-widest text-gh-l-muted dark:text-gh-muted">
                    Apple Podcasts
                </span>
                <span className="w-5 h-5 rounded-full bg-[#8927EB] text-white text-[10px] font-black flex items-center justify-center">
                    →
                </span>
            </div>
        </motion.button>
    );
}
export default DailyDose;