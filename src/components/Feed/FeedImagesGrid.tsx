"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, Layers, WifiOff, ImageOff } from "lucide-react";

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

    // ── Online/offline tracking ─────────────────────────────────────
    const [isOnline, setIsOnline] = useState<boolean>(
        typeof navigator !== "undefined" ? navigator.onLine : true
    );

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        // Also sync on mount in case navigator changed before hydration
        setIsOnline(navigator.onLine);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    // Group images into "posts" (one post = one carousel group).
    const posts = useMemo(() => {
        const groups = new Map<string, any[]>();
        for (const im of feedImages) {
            const key = im.post_group_id || `single_${im.id}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(im);
        }
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
            <div className="grid grid-cols-3 gap-[2px] px-[2px] pt-[2px]">
                {posts.map((post, i) => {
                    const cover = post.cover;
                    const isMulti = post.images.length > 1;
                    const isLoaded = loadedImages[cover.id];
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

                            {isMulti && (
                                <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                    <Layers size={10} strokeWidth={2.5} />
                                    <span>{post.images.length}</span>
                                </div>
                            )}

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

            {/* ── Empty state: 3 possible messages ────────────────
                1. Offline → "Check your internet"
                2. Online + done loading + truly empty → "No images yet"
                3. Online + still loading → nothing (skeleton row below)
            ──────────────────────────────────────────────────────── */}
            {posts.length === 0 && !isLoadingImages && (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                        {!isOnline ? (
                            <WifiOff className="w-7 h-7 text-gray-400" />
                        ) : (
                            <ImageOff className="w-7 h-7 text-gray-400" />
                        )}
                    </div>

                    {!isOnline ? (
                        <>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                You're offline
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Check your internet connection and try again
                            </p>
                            <button
                                onClick={() => onLoadMore()}
                                className="mt-4 px-4 py-2 rounded-full bg-blue-500 text-white text-xs font-semibold active:scale-95 transition-transform"
                            >
                                Retry
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                No images yet
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Be the first to share a visual
                            </p>
                        </>
                    )}
                </div>
            )}

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

            <div ref={sentinelRef} className="h-16" />
        </div>
    );
}