"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, Layers } from "lucide-react";

interface Props {
    feedImages: any[];
    loadedImages: Record<string, boolean>;
    setLoadedImages: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    user: any;
    hasMoreImages: boolean;
    isLoadingImages: boolean;
    onLoadMore: () => void;
    onOpenPost: (groupKey: string, images: any[]) => void;
}

export default function FeedImagesGrid({
    feedImages,
    loadedImages,
    setLoadedImages,
    user,
    hasMoreImages,
    isLoadingImages,
    onLoadMore,
    onOpenPost,
}: Props) {
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Group images into "posts" (one post = one carousel group).
    // Grid shows ONE thumbnail per post — the first image.
    const posts = useMemo(() => {
        const groups = new Map<string, any[]>();
        for (const im of feedImages) {
            const key = im.post_group_id || `single_${im.id}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(im);
        }
        // Sort within each group by post_group_order
        for (const [, imgs] of groups) {
            imgs.sort(
                (a, b) =>
                    (a.post_group_order ?? 0) - (b.post_group_order ?? 0)
            );
        }
        return Array.from(groups.entries()).map(([key, imgs]) => ({
            key,
            images: imgs,
            cover: imgs[0],
        }));
    }, [feedImages]);

    // Infinite scroll
    useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return;
        const obs = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0].isIntersecting &&
                    hasMoreImages &&
                    !isLoadingImages
                ) {
                    onLoadMore();
                }
            },
            { rootMargin: "600px 0px", threshold: 0 }
        );
        obs.observe(node);
        return () => obs.disconnect();
    }, [hasMoreImages, isLoadingImages, onLoadMore]);

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* ── THE GRID ──────────────────────────────────────── */}
            {/* 3 columns, 2px gaps, tiny padding — Instagram Explore */}
            <div className="grid grid-cols-3 gap-[2px] px-[2px] pt-[2px]">
                {posts.map((post, i) => {
                    const cover = post.cover;
                    const isMulti = post.images.length > 1;
                    const isLoaded = loadedImages[cover.id];
                    // Cloudinary: use small thumb for grid (fast), full
                    // size only when the user taps into the modal.
                    const thumbSrc = cover.image_url?.includes("cloudinary")
                        ? cover.image_url.replace(
                            "/upload/",
                            "/upload/w_400,h_400,c_fill,f_auto,q_auto/"
                        )
                        : cover.image_url;

                    return (
                        <button
                            key={post.key}
                            onClick={() => onOpenPost(post.key, post.images)}
                            className="relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden active:opacity-70 transition-opacity"
                            aria-label={`Open post ${i + 1}`}
                        >
                            {/* Skeleton while loading */}
                            {!isLoaded && (
                                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
                            )}

                            <img
                                src={thumbSrc}
                                alt={cover.title || "Feed image"}
                                loading="lazy"
                                decoding="async"
                                draggable={false}
                                onLoad={() =>
                                    setLoadedImages((prev) => ({
                                        ...prev,
                                        [cover.id]: true,
                                    }))
                                }
                                className={`w-full h-full object-cover transition-opacity duration-200 ${isLoaded ? "opacity-100" : "opacity-0"
                                    }`}
                            />

                            {/* ── Multi-image badge (top right) ────── */}
                            {isMulti && (
                                <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                    <Layers size={10} strokeWidth={2.5} />
                                    <span>{post.images.length}</span>
                                </div>
                            )}

                            {/* ── Stats bar (bottom) — only on tap/hover ── */}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1 opacity-0 hover:opacity-100 sm:group-hover:opacity-100 transition-opacity pointer-events-none">
                                <div className="flex items-center gap-2 text-white text-[10px] font-semibold">
                                    <span className="flex items-center gap-0.5">
                                        <Heart size={10} className="fill-white" />
                                        {cover.likes_count ?? ""}
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                        <MessageCircle size={10} />
                                        {cover.comments_count ?? ""}
                                    </span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* ── Empty state ─────────────────────────────────── */}
            {posts.length === 0 && !isLoadingImages && (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                        <svg
                            className="w-7 h-7 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        No images yet
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Be the first to share a visual
                    </p>
                </div>
            )}

            {/* ── Loading skeleton row (while fetching next page) ── */}
            {isLoadingImages && (
                <div className="grid grid-cols-3 gap-[2px] px-[2px] pt-[2px]">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="aspect-square bg-gray-200 dark:bg-gray-700 animate-pulse"
                        />
                    ))}
                </div>
            )}

            {/* ── Infinite scroll sentinel ─────────────────────── */}
            <div ref={sentinelRef} className="h-16" />
        </div>
    );
}