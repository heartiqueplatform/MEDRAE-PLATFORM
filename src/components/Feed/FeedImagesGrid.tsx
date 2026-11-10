"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Layers, WifiOff, ImageOff } from "lucide-react";
import { playSound } from "@/lib/soundManager";

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

const vibrate = (p: number | number[] = 12) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};

const tap = () => {
    playSound("ui-tap");
    vibrate(12);
};

export default function FeedImagesGrid({
    feedImages,
    loadedImages,
    setLoadedImages,
    hasMoreImages,
    isLoadingImages,
    onLoadMore,
    onOpenPost,
}: Props) {
    const sentinelRef = useRef<HTMLDivElement>(null);

    const [isOnline, setIsOnline] = useState<boolean>(
        typeof navigator !== "undefined" ? navigator.onLine : true
    );

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        setIsOnline(navigator.onLine);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

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
        <div className="w-full max-w-4xl mx-auto px-1">
            {/* ── Grid ──────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-1">
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
                            onClick={() => {
                                tap();
                                onOpenPost(post.key, post.images);
                            }}
                            className="relative aspect-square overflow-hidden rounded-lg
                                       bg-slate-100 dark:bg-white/[0.06]
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                            aria-label={`Open post ${i + 1}`}
                        >
                            {!isLoaded && (
                                <div className="absolute inset-0 bg-slate-100 dark:bg-white/[0.06] animate-pulse" />
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

                            {/* Multi-image count — always visible, no hover dependency */}
                            {isMulti && (
                                <div className="absolute top-1.5 right-1.5
                                                inline-flex items-center gap-0.5
                                                bg-black/60 text-white
                                                text-[10px] font-bold tabular-nums
                                                px-1.5 py-0.5 rounded">
                                    <Layers size={10} strokeWidth={2.5} />
                                    <span>{post.images.length}</span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── Empty state ───────────────────────────────── */}
            {posts.length === 0 && !isLoadingImages && (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="h-14 w-14 rounded-full
                                    bg-slate-100 dark:bg-white/[0.06]
                                    flex items-center justify-center mb-3">
                        {!isOnline ? (
                            <WifiOff className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                        ) : (
                            <ImageOff className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                        )}
                    </div>

                    {!isOnline ? (
                        <>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                You're offline
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[240px] leading-snug">
                                Check your internet connection and try again
                            </p>
                            <button
                                onClick={() => {
                                    tap();
                                    onLoadMore();
                                }}
                                className="mt-4 h-10 px-4 rounded-xl
                                           bg-blue-600 text-white
                                           text-[12px] font-bold
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                Retry
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                No images yet
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[240px] leading-snug">
                                Be the first to share a visual
                            </p>
                        </>
                    )}
                </div>
            )}

            {/* ── Skeleton row ──────────────────────────────── */}
            {isLoadingImages && (
                <div className="grid grid-cols-3 gap-1 mt-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="aspect-square rounded-lg
                                       bg-slate-100 dark:bg-white/[0.06]
                                       animate-pulse"
                        />
                    ))}
                </div>
            )}

            <div ref={sentinelRef} className="h-16" />
        </div>
    );
}