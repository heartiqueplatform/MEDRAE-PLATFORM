"use client";
import React from "react";
import { Download } from "lucide-react";
import { EpisodeRow } from "./EpisodeRow";

export const DownloadsContent = React.memo(function DownloadsContent(props: any) {
    const {
        items, tracks, currentTrackSrc, isPlaying, progress,
        onSelectTrack, onRemove, getInteraction, onToggleReaction, onBrowse,
    } = props;

    return (
        <div className="w-full rounded-xl bg-gh-l-card dark:bg-gh-card p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gh-l-text dark:text-gh-text">
                    Offline Downloads
                </h2>
                <span className="text-[10px] font-bold text-gh-l-muted dark:text-gh-muted">
                    {items.length} episode{items.length === 1 ? "" : "s"}
                </span>
            </div>

            {items.length === 0 && (
                <div className="py-10 text-center">
                    <Download size={36} className="mx-auto text-gh-l-muted dark:text-gh-muted mb-3 opacity-50" />
                    <p className="text-sm text-gh-l-text dark:text-gh-text font-bold mb-1">
                        No downloads yet
                    </p>
                    <p className="text-xs text-gh-l-muted dark:text-gh-muted mb-4">
                        Save episodes to listen without internet.
                    </p>
                    <button
                        onClick={onBrowse}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                    >
                        Browse episodes
                    </button>
                </div>
            )}

            <div className="space-y-2">
                {tracks.map((t: any) => {
                    const isThisActive = currentTrackSrc === t.src;
                    const item = items.find((x: any) => x.episodeId === t.id);
                    return (
                        <EpisodeRow
                            key={t.id}
                            track={t}
                            index={0}
                            isActive={isThisActive}
                            isPlaying={isPlaying && isThisActive}
                            progress={isThisActive ? progress : 0}
                            downloaded={true}
                            onSelect={() => onSelectTrack(t)}
                            isAdmin={false}
                            onHide={() => { }}
                            interaction={t.id ? getInteraction?.("episode", t.id) : undefined}
                            onToggleReaction={
                                t.id && onToggleReaction
                                    ? (kind: "like" | "love" | "save") =>
                                        onToggleReaction("episode", t.id, kind)
                                    : undefined
                            }
                            downloadState="downloaded"
                            downloadProgress={1}
                            onDownload={undefined}
                            onRemoveDownload={t.id ? () => onRemove(t.id!) : undefined}
                            downloadSize={item?.size}
                        />
                    );
                })}
            </div>
        </div>
    );
});