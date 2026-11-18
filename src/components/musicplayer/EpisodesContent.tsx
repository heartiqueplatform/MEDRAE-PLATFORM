"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Headphones, Plus, ThumbsUp, Heart, Bookmark } from "lucide-react";
import { EpisodeRow } from "./EpisodeRow";
import { ContinueListeningRow } from "./ContinueListeningRow";
import { SkeletonList } from "./SkeletonList";
import { AppleLogo } from "./AppleLogo";
import { EndorseButton } from "./EndorseButton";
import { FollowButton } from "./FollowButton";
import HeroLottie from "@/components/HeroLottie";

type ViewMode = "episodes" | "shows" | "saved";
type SavedFilter = "liked" | "loved" | "bookmarked";

const TAB_LABEL: Record<ViewMode, string> = {
    episodes: "Episodes",
    shows: "Shows",
    saved: "My Favourites",
};

const SAVED_FILTERS: { key: SavedFilter; label: string; Icon: any }[] = [
    { key: "liked", label: "Liked", Icon: ThumbsUp },
    { key: "loved", label: "Loved", Icon: Heart },
    { key: "bookmarked", label: "Bookmarked", Icon: Bookmark },
];

export const EpisodesContent = React.memo(function EpisodesContent(props: any) {
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
        getInteraction,
        onToggleReaction,
        getFollow,
        onToggleFollow,
        getDownloadState,
        getDownloadProgress,
        onDownload,
        onCancelDownload,
        loadMoreEpisodes,
        hasMoreEpisodes,
        isLoadingMoreEpisodes,
    } = props;

    const [viewMode, setViewMode] = useState<ViewMode>("episodes");
    const [savedFilter, setSavedFilter] = useState<SavedFilter>("liked");

    const showSkeleton =
        (loading && visibleTracks.length === 0) ||
        (visibleTracks.length === 0 && parentLoading === true);

    /* ── Reaction accessor ───────────────────────────────── */
    const getReaction = (id: string) => getInteraction?.("episode", id);

    /* ── Split tracks once per change ─────────────────────── */
    const { reactedTracks, unreactedTracks } = useMemo(() => {
        const reacted: any[] = [];
        const unreacted: any[] = [];
        for (const t of visibleTracks) {
            const it = t.id ? getReaction(t.id) : null;
            if (it && (it.like || it.love || it.save)) reacted.push(t);
            else unreacted.push(t);
        }
        return { reactedTracks: reacted, unreactedTracks: unreacted };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleTracks, getInteraction]);

    /* ── Saved sub-filter list ────────────────────────────── */
    const savedFilteredTracks = useMemo(() => {
        if (viewMode !== "saved") return [];
        return reactedTracks.filter((t: any) => {
            const it = getReaction(t.id);
            if (!it) return false;
            if (savedFilter === "liked") return !!it.like;
            if (savedFilter === "loved") return !!it.love;
            return !!it.save;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reactedTracks, savedFilter, viewMode, getInteraction]);

    const windowedTracks =
        viewMode === "saved"
            ? savedFilteredTracks
            : viewMode === "episodes"
                ? unreactedTracks
                : [];

    /* ── Continue listening ───────────────────────────────── */
    const continueBlock = useMemo(() => {
        if (showSkeleton || !history || history.length === 0) return null;
        return (
            <div className="px-3 md:px-4 pt-3 pb-1 shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Headphones size={14} className="text-blue-600 dark:text-blue-400" />
                        <h3 className="text-[11px] uppercase tracking-widest text-gh-l-muted dark:text-gh-muted">
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
                {history.slice(0, 5).map((entry: any) => (
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

    /* ── Chips skeleton ───────────────────────────────────── */
    const [chipsTimedOut, setChipsTimedOut] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setChipsTimedOut(true), 3000);
        return () => clearTimeout(t);
    }, []);

    const chipsSkeletonBlock = useMemo(() => {
        if (showSkeleton || shows.length > 0 || chipsTimedOut) return null;
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

    /* ── Show chip rail ───────────────────────────────────── */
    const handleSelectShow = (showId: string | null) => {
        onSelectShow(showId);
        if (viewMode !== "saved") setViewMode("episodes");
    };

    const chipsBlock = useMemo(() => {
        if (showSkeleton || shows.length === 0) return null;
        return (
            <div className="px-3 md:px-4 pt-3 pb-3 shrink-0">
                <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                    <button
                        onClick={() => handleSelectShow(null)}
                        className="shrink-0 flex flex-col items-center gap-1.5 group"
                        aria-label="All shows"
                    >
                        <div className={`relative w-28 h-28 md:w-32 md:h-32 rounded-xl p-[2px] transition-all ${selectedShowId === null
                            ? "bg-gradient-to-tr from-blue-500 via-blue-400 to-blue-600"
                            : "bg-gh-l-hover dark:bg-gh-hover group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30"}`}>
                            <div className="w-full h-full rounded-[22px] overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#B150F2] to-[#8927EB]">
                                <AppleLogo className={`w-14 h-14 md:w-16 md:h-16 text-white transition-transform ${selectedShowId === null ? "scale-100" : "scale-95 group-hover:scale-100"}`} />
                            </div>
                        </div>
                        <span className={`text-[10px] font-bold truncate max-w-[72px] ${selectedShowId === null ? "text-blue-600 dark:text-blue-400" : "text-gh-l-text dark:text-gh-text"}`}>
                            All
                        </span>
                    </button>

                    {shows.map((s: any) => {
                        const active = selectedShowId === s.id;
                        const initial = (s.title || "?").trim().charAt(0).toUpperCase();
                        const follow = getFollow?.(s.id) ?? { following: false, followerCount: 0 };
                        return (
                            <div key={s.id} className="shrink-0 flex flex-col items-center gap-1.5 group relative">
                                <button onClick={() => handleSelectShow(s.id)} className="flex flex-col items-center gap-1.5 w-full" aria-label={s.title}>
                                    <div className={`relative w-28 h-28 md:w-32 md:h-32 rounded-xl p-[2px] transition-all ${active ? "bg-gradient-to-tr from-blue-500 via-blue-400 to-blue-600" : "bg-transparent"}`}>
                                        <div className="relative w-full h-full rounded-[14px] overflow-hidden bg-gh-l-hover dark:bg-gh-hover">
                                            {s.artwork_url ? (
                                                <img src={s.artwork_url} alt="" loading="lazy" decoding="async" className={`w-full h-full object-cover transition-transform ${active ? "scale-105" : "group-hover:scale-105"}`} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-lg text-gh-l-muted dark:text-gh-muted">
                                                    {initial}
                                                </div>
                                            )}
                                            {!active && <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />}
                                            {onToggleFollow && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onToggleFollow(s.id); }}
                                                    className={`absolute top-1.5 right-1.5 h-8 w-8 md:h-6 md:w-6 rounded-full flex items-center justify-center transition-all ${follow.following ? "bg-blue-600 text-white" : "bg-white/90 dark:bg-slate-900/90 text-gh-l-text dark:text-gh-text"}`}
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
                                            <span className={`absolute -bottom-1 -right-1 min-w-[20px] h-[20px] px-1.5 rounded-full text-[9px] flex items-center justify-center ${active ? "bg-blue-600 text-white" : "bg-gh-l-card dark:bg-gh-card text-gh-l-text dark:text-gh-text"}`}>
                                                {follow.followerCount > 0 ? follow.followerCount : s.endorsement_count}
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-[10px] font-bold truncate max-w-[72px] text-center leading-tight ${active ? "text-blue-600 dark:text-blue-400" : "text-gh-l-text dark:text-gh-text"}`}>
                                        {s.title}
                                    </span>
                                </button>
                            </div>
                        );
                    })}

                    {isAdmin && (
                        <button onClick={onManage} className="shrink-0 flex flex-col items-center gap-1.5 group" aria-label="Manage podcasts">
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

    /* ── Tab bar (3 tabs) ─────────────────────────────────── */
    const tabBar = useMemo(() => {
        if (showSkeleton) return null;
        return (
            <div className="px-3 md:px-4 pt-1 pb-2 shrink-0">
                <div className="inline-flex items-center gap-1 p-1 rounded-full bg-gh-l-hover dark:bg-gh-hover">
                    {(["episodes", "shows", "saved"] as ViewMode[]).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-colors ${viewMode === mode
                                ? "bg-white dark:bg-gh-card text-gh-l-text dark:text-gh-text shadow-sm"
                                : "text-gh-l-muted dark:text-gh-muted hover:text-gh-l-text dark:hover:text-gh-text"
                                }`}
                        >
                            {TAB_LABEL[mode]}
                        </button>
                    ))}
                </div>
            </div>
        );
    }, [viewMode, showSkeleton]);

    /* ── Saved sub-filter bar (Liked / Loved / Bookmarked) ── */
    const savedFilterBar = useMemo(() => {
        if (viewMode !== "saved") return null;
        return (
            <div className="px-3 md:px-4 pt-1 pb-2 shrink-0">
                <div className="inline-flex items-center gap-1 p-1 rounded-full bg-gh-l-hover dark:bg-gh-hover">
                    {SAVED_FILTERS.map(({ key, label, Icon }) => {
                        const active = savedFilter === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setSavedFilter(key)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${active
                                    ? "bg-white dark:bg-gh-card text-gh-l-text dark:text-gh-text shadow-sm"
                                    : "text-gh-l-muted dark:text-gh-muted hover:text-gh-l-text dark:hover:text-gh-text"
                                    }`}
                            >
                                <Icon size={12} fill={active ? "currentColor" : "none"} strokeWidth={active ? 0 : 2} />
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }, [viewMode, savedFilter]);

    /* ── Show cards grid (Shows tab only) ─────────────────── */
    const showCardsBlock = useMemo(() => {
        if (showSkeleton || viewMode !== "shows" || shows.length === 0) return null;
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
                                onClick={() => handleSelectShow(s.id)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelectShow(s.id); }
                                }}
                                className="group flex gap-3 p-3 rounded-2xl bg-gh-l-card dark:bg-gh-card cursor-pointer transition-colors hover:bg-gh-l-hover dark:hover:bg-gh-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                                <div className="relative shrink-0 w-20 h-20 md:w-[88px] md:h-[88px] rounded-xl overflow-hidden bg-gh-l-hover dark:bg-gh-hover">
                                    {s.artwork_url ? (
                                        <img src={s.artwork_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-2xl text-gh-l-muted dark:text-gh-muted">
                                            {initial}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 flex flex-col justify-between">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold leading-snug text-gh-l-text dark:text-gh-text group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                            {s.title}
                                        </p>
                                        <p className="text-[11px] text-gh-l-muted dark:text-gh-muted mt-0.5">
                                            {s.episode_count} episodes
                                            {follow.followerCount > 0 && ` · ${follow.followerCount} followers`}
                                            {s.endorsement_count > 0 && ` · ${s.endorsement_count} endorsements`}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-end gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                                        {onToggleFollow && (
                                            <FollowButton following={follow.following} followerCount={follow.followerCount} onClick={() => onToggleFollow(s.id)} compact />
                                        )}
                                        <EndorseButton endorsed={s.user_endorsed} count={s.endorsement_count} onClick={() => onToggleEndorse(s.id)} compact />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }, [shows, viewMode, showSkeleton, onToggleEndorse, getFollow, onToggleFollow]);

    /* ── Infinite scroll (Episodes tab only) ──────────────── */
    const canLoadMoreFromServer =
        selectedShowId === null && hasMoreEpisodes && viewMode === "episodes";
    const hasMore = canLoadMoreFromServer;

    useEffect(() => {
        if (!canLoadMoreFromServer || showSkeleton || isLoadingMoreEpisodes || !loadMoreEpisodes) return;

        const targets = document.querySelectorAll<HTMLElement>(
            ".episodes-scroll-container .episodes-infinite-sentinel"
        );
        const observers: IntersectionObserver[] = [];

        targets.forEach((target) => {
            if (!target.getClientRects().length) return;
            const root = target.closest<HTMLElement>(".episodes-scroll-container");
            const observer = new IntersectionObserver(
                (entries) => {
                    if (entries.some((e) => e.isIntersecting)) void loadMoreEpisodes();
                },
                { root, rootMargin: "600px 0px", threshold: 0 }
            );
            observer.observe(target);
            observers.push(observer);
        });

        return () => observers.forEach((o) => o.disconnect());
    }, [canLoadMoreFromServer, showSkeleton, isLoadingMoreEpisodes, loadMoreEpisodes, visibleTracks.length]);

    /* ── Episode list (Episodes + Saved) ──────────────────── */
    const episodeRows = useMemo(() => {
        if (viewMode === "shows") return null;

        const isSavedTab = viewMode === "saved";
        const isEmpty = windowedTracks.length === 0;
        const emptyMessage = isSavedTab
            ? savedFilter === "liked"
                ? "Nothing liked yet tap the thumbs-up on an episode."
                : savedFilter === "loved"
                    ? "Nothing loved yet tap the heart on an episode."
                    : "Nothing bookmarked yet tap the bookmark on an episode."
            : "You're all caught up. Check My Favourites for your reactions.";
        return (
            <>
                {showSkeleton && <SkeletonList count={8} />}

                {!showSkeleton && isEmpty && (
                    isSavedTab ? (
                        <div className="w-full flex flex-col items-center text-center px-6 pt-6 pb-8">
                            <div className="w-full max-w-[140px] mx-auto">
                                <HeroLottie />
                            </div>
                            <p className="mt-1 text-[12px] font-semibold text-gh-l-text dark:text-gh-text">
                                Nothing here yet
                            </p>
                            <p className="text-[11px] text-gh-l-muted dark:text-gh-muted mt-0.5 max-w-[240px]">
                                {emptyMessage}
                            </p>
                        </div>
                    ) : (
                        <div className="py-16 text-center text-gh-l-muted dark:text-gh-muted text-sm px-6">
                            {emptyMessage}
                        </div>
                    )
                )}

                {!showSkeleton && windowedTracks.map((t: any, i: number) => {
                    const isThisActive = currentTrackSrc === t.src;
                    return (
                        <EpisodeRow
                            key={t.id || t.src || i}
                            track={t}
                            index={i}
                            isActive={isThisActive}
                            isPlaying={isPlaying && isThisActive}
                            progress={isThisActive ? progress : 0}
                            downloaded={!!t.downloaded}
                            onSelect={() => onSelectTrack(t)}
                            isAdmin={isAdmin}
                            onHide={() => t.id && onHideEpisode(t.id)}
                            interaction={t.id ? getReaction(t.id) : undefined}
                            onToggleReaction={
                                t.id && onToggleReaction
                                    ? (kind: "like" | "love" | "save") =>
                                        onToggleReaction("episode", t.id, kind)
                                    : undefined
                            }
                            downloadState={t.id ? getDownloadState?.(t.id) : undefined}
                            downloadProgress={t.id ? getDownloadProgress?.(t.id) ?? 0 : 0}
                            onDownload={t.id && onDownload ? () => onDownload(t) : undefined}
                            onCancelDownload={
                                t.id && onCancelDownload
                                    ? () => onCancelDownload(t.id)
                                    : undefined
                            }
                        />
                    );
                })}

                {!showSkeleton && !isSavedTab && hasMore && (
                    <div
                        className="episodes-infinite-sentinel h-16 flex items-center justify-center"
                        aria-label="Loading more episodes"
                    >
                        {isLoadingMoreEpisodes ? (
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse [animation-delay:150ms]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse [animation-delay:300ms]" />
                            </div>
                        ) : (
                            <span className="text-[10px] text-gh-l-muted dark:text-gh-muted">
                                Scroll for more episodes
                            </span>
                        )}
                    </div>
                )}

                {!showSkeleton && !isSavedTab && !hasMore && windowedTracks.length > 0 && (
                    <div className="py-6 text-center text-[11px] text-gh-l-muted dark:text-gh-muted">
                        You've reached the end
                    </div>
                )}
            </>
        );
    }, [
        viewMode,
        savedFilter,
        windowedTracks,
        currentTrackSrc,
        isPlaying,
        progress,
        showSkeleton,
        isAdmin,
        onSelectTrack,
        onHideEpisode,
        getInteraction,
        onToggleReaction,
        getDownloadState,
        getDownloadProgress,
        onDownload,
        onCancelDownload,
        hasMore,
        isLoadingMoreEpisodes,
    ]);

    return (
        <div className="h-full flex flex-col min-h-0">
            {/* Mobile */}
            <div className="md:hidden h-full overflow-y-auto custom-scrollbar episodes-scroll-container">
                {continueBlock}
                {chipsBlock}
                {chipsSkeletonBlock}
                {tabBar}
                {savedFilterBar}
                {showCardsBlock}
                {episodeRows && <div className="pb-6">{episodeRows}</div>}
            </div>

            {/* Desktop */}
            <div className="hidden md:block md:h-full md:min-h-0 md:overflow-y-auto custom-scrollbar episodes-scroll-container">
                {continueBlock}
                {chipsBlock}
                {chipsSkeletonBlock}
                {tabBar}
                {savedFilterBar}
                {showCardsBlock}
                {episodeRows && <div className="px-4 pb-6">{episodeRows}</div>}
            </div>
        </div>
    );
});