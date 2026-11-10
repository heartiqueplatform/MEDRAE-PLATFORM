"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Trash2,
    Upload,
    Heart,
    MessageCircle,
    MoreHorizontal,
    ImageIcon,
    X,
    Loader2,
} from "lucide-react";
import { GlobalLoader } from "@/components/GlobalLoader";
import CommentsModal from "@/components/Feed/CommentsModal";
import { CenteredModal } from "@/components/ui/CenteredModal";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type FeedImage = {
    id: string;
    image_url: string;
    title?: string;
    description?: string;
    added_by?: string;
    post_group_id?: string | null;
    post_group_order?: number | null;
    profiles?: {
        name?: string;
        avatar_url?: string;
    };
};

interface Props {
    index: number;
    groupKey: string;
    feedImages: FeedImage[];
    loadedImages: Record<string, boolean>;
    setLoadedImages: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    session: any;
    supabase: any;
    user: any;
    openViewer: (img: FeedImage) => void;
    handleDeleteImage: (img: FeedImage) => void;
    showUpload: boolean;
    setShowUpload: React.Dispatch<React.SetStateAction<boolean>>;
    uploadFiles: File[];
    setUploadFiles: React.Dispatch<React.SetStateAction<File[]>>;
    uploading: boolean;
    handleImageUpload: (isRelated: boolean) => void;
    imageTitle: string;
    setImageTitle: React.Dispatch<React.SetStateAction<string>>;
    imageDescription: string;
    setImageDescription: React.Dispatch<React.SetStateAction<string>>;
}

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (p: number | number[] = 15) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};

const tap = () => {
    playSound("ui-tap");
    vibrate(12);
};

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                               */
/* ------------------------------------------------------------------ */

const STATS_TIMEOUT_MS = 6000;
const COMMENTS_TIMEOUT_MS = 6000;
const MAX_FILES = 10;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), ms)
        ),
    ]);
}

/* ------------------------------------------------------------------ */
/*  Caches                                                            */
/* ------------------------------------------------------------------ */

const statsCache = new Map<
    string,
    { likes: number; comments: number; hasLiked: boolean; at: number }
>();
const commentsCache = new Map<string, { data: any[]; at: number }>();
const pendingRequests = new Map<string, Promise<any>>();
const groupAspectCache = new Map<string, number>();

export function clearMediaPanelCaches() {
    statsCache.clear();
    commentsCache.clear();
    pendingRequests.clear();
    groupAspectCache.clear();
}

function getStatsCacheKey(userId: string, imageId: string) {
    return `${userId}_${imageId}`;
}

/* ------------------------------------------------------------------ */
/*  Data layer                                                        */
/* ------------------------------------------------------------------ */

async function fetchStatsBatch(
    supabase: any,
    userId: string,
    imageIds: string[]
) {
    if (!userId || imageIds.length === 0) return new Map();
    const key = `stats_batch_${userId}_${imageIds.join(",")}`;
    if (pendingRequests.has(key)) return pendingRequests.get(key);

    const promise = (async () => {
        try {
            const { data, error } = await withTimeout(
                Promise.resolve(
                    supabase.rpc("get_image_stats_batch", {
                        p_user_id: userId,
                        p_image_ids: imageIds,
                    })
                ),
                STATS_TIMEOUT_MS
            );

            const map = new Map<
                string,
                { likes: number; comments: number; hasLiked: boolean }
            >();
            if (!error && data) {
                for (const row of data) {
                    const stats = {
                        likes: Number(row.likes_count ?? 0),
                        comments: Number(row.comments_count ?? 0),
                        hasLiked: !!row.has_liked,
                    };
                    map.set(row.image_id, stats);
                    statsCache.set(getStatsCacheKey(userId, row.image_id), {
                        ...stats,
                        at: Date.now(),
                    });
                }
            }
            return map;
        } catch {
            const fallback = new Map();
            for (const id of imageIds) {
                const cached = statsCache.get(getStatsCacheKey(userId, id));
                if (cached) {
                    fallback.set(id, {
                        likes: cached.likes,
                        comments: cached.comments,
                        hasLiked: cached.hasLiked,
                    });
                }
            }
            return fallback;
        } finally {
            pendingRequests.delete(key);
        }
    })();

    pendingRequests.set(key, promise);
    return promise;
}

async function fetchComments(supabase: any, imageId: string): Promise<any[]> {
    const cacheKey = `comments_${imageId}`;
    const cached = commentsCache.get(cacheKey);
    if (cached && Date.now() - cached.at < 60000) return cached.data;

    try {
        const { data } = await withTimeout(
            Promise.resolve(
                supabase
                    .from("qfeed_images_comments")
                    .select(
                        "id, content, created_at, user_id, profiles(name, avatar_url)"
                    )
                    .eq("image_id", imageId)
                    .order("created_at", { ascending: true })
                    .limit(50)
            ),
            COMMENTS_TIMEOUT_MS
        );
        const rows = data || [];
        commentsCache.set(cacheKey, { data: rows, at: Date.now() });
        return rows;
    } catch {
        return [];
    }
}

function markImageSeen(supabase: any, userId: string, imageId: string) {
    supabase
        .rpc("mark_feed_group_seen", {
            p_user_id: userId,
            p_image_id: imageId,
        })
        .then(({ error }: any) => {
            if (error) {
                console.warn(
                    "[MediaPanel] mark_feed_group_seen failed:",
                    error.message
                );
            }
        });
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function FeedMediaPanel({
    index,
    groupKey,
    feedImages,
    loadedImages,
    setLoadedImages,
    session,
    supabase,
    user,
    openViewer,
    handleDeleteImage,
    showUpload,
    setShowUpload,
    uploadFiles,
    setUploadFiles,
    uploading,
    handleImageUpload,
    imageTitle,
    setImageTitle,
    imageDescription,
    setImageDescription,
}: Props) {
    const [commentsCount, setCommentsCount] = useState(0);
    const [likesCount, setLikesCount] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [imageReplyTo, setImageReplyTo] = useState<string | null>(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [comments, setComments] = useState<any[]>([]);
    const [commentText, setCommentText] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isCommentsLoaded, setIsCommentsLoaded] = useState(false);
    const [isRelated, setIsRelated] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [lockedAspect, setLockedAspect] = useState<number | null>(null);

    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const touchDeltaX = useRef<number>(0);
    const [swipeOffset, setSwipeOffset] = useState<number>(0);
    const isMounted = useRef(true);

    /* ── Group slice ────────────────────────────────────── */
    const group = useMemo<FeedImage[] | null>(() => {
        if (!groupKey) return null;
        const imgs = feedImages.filter((im) => {
            const key = im.post_group_id || `single_${im.id}`;
            return key === groupKey;
        });
        if (imgs.length === 0) return null;
        return imgs.sort(
            (a, b) =>
                (a.post_group_order ?? 0) - (b.post_group_order ?? 0)
        );
    }, [feedImages, groupKey]);

    const img: FeedImage | null = group
        ? group[currentSlide] || group[0]
        : null;
    const totalSlides = group?.length || 0;

    useEffect(() => {
        if (!groupKey) {
            setLockedAspect(null);
            return;
        }
        const cached = groupAspectCache.get(groupKey);
        setLockedAspect(cached ?? null);
    }, [groupKey]);

    useEffect(() => {
        setCurrentSlide(0);
    }, [groupKey]);

    /* ── Preload all slides ─────────────────────────────── */
    useEffect(() => {
        if (!group || group.length <= 1) return;

        let cancelled = false;
        const preloaders: HTMLImageElement[] = [];

        group.forEach((g, i) => {
            if (i === 0) return;
            const im = new Image();
            im.decoding = "async";
            im.src = g.image_url.includes("cloudinary")
                ? g.image_url.replace(
                    "/upload/",
                    "/upload/w_800,f_auto,q_auto/"
                )
                : g.image_url;
            im.onload = () => {
                if (!cancelled && isMounted.current) {
                    setLoadedImages((prev) => ({ ...prev, [g.id]: true }));
                }
            };
            preloaders.push(im);
        });

        return () => {
            cancelled = true;
            preloaders.forEach((im) => {
                im.onload = null;
            });
        };
    }, [group, setLoadedImages]);

    /* ── Stats ─────────────────────────────────────────── */
    useEffect(() => {
        if (!img?.id || !user?.id) {
            setIsLoadingData(false);
            return;
        }
        isMounted.current = true;

        const load = async () => {
            const cached = statsCache.get(
                getStatsCacheKey(user.id, img!.id)
            );
            if (cached) {
                setLikesCount(cached.likes);
                setCommentsCount(cached.comments);
                setHasLiked(cached.hasLiked);
                setIsLoadingData(false);
            } else {
                setIsLoadingData(true);
            }

            try {
                const map = await fetchStatsBatch(supabase, user.id, [
                    img!.id,
                ]);
                const stats = map.get(img!.id);
                if (stats && isMounted.current) {
                    setLikesCount(stats.likes);
                    setCommentsCount(stats.comments);
                    setHasLiked(stats.hasLiked);
                }
            } finally {
                if (isMounted.current) setIsLoadingData(false);
            }
        };
        load();

        return () => {
            isMounted.current = false;
        };
    }, [img?.id, user?.id, supabase]);

    /* ── Prefetch stats for all slides ──────────────────── */
    useEffect(() => {
        if (!group || group.length <= 1 || !user?.id) return;

        const ids = group.map((g) => g.id);
        const uncached = ids.filter(
            (id) => !statsCache.get(getStatsCacheKey(user.id, id))
        );
        if (uncached.length === 0) return;

        let cancelled = false;
        (async () => {
            try {
                await fetchStatsBatch(supabase, user.id, uncached);
            } catch {
                /* ignore */
            }
            if (cancelled) return;
        })();

        return () => {
            cancelled = true;
        };
    }, [group, user?.id, supabase]);

    /* ── Reset composer when closed ─────────────────────── */
    useEffect(() => {
        if (!showUpload) {
            setImageTitle("");
            setImageDescription("");
            setUploadFiles([]);
            setIsRelated(false);
        }
    }, [showUpload, setImageTitle, setImageDescription, setUploadFiles]);

    /* ── Comments ───────────────────────────────────────── */
    const loadComments = useCallback(async () => {
        if (!img?.id) return;
        if (isCommentsLoaded) return;
        const rows = await fetchComments(supabase, img.id);
        if (isMounted.current) {
            setComments(rows);
            setCommentsCount(rows.length);
            setIsCommentsLoaded(true);
        }
    }, [img?.id, supabase, isCommentsLoaded]);

    useEffect(() => {
        if (isCommentModalOpen && img?.id && !isCommentsLoaded) loadComments();
    }, [isCommentModalOpen, img?.id, loadComments, isCommentsLoaded]);

    /* ── Like ───────────────────────────────────────────── */
    const handleLikeToggle = async () => {
        if (!user || !img) return;
        tap();
        const currentlyLiked = hasLiked;

        setHasLiked(!currentlyLiked);
        setLikesCount((prev) =>
            currentlyLiked ? Math.max(0, prev - 1) : prev + 1
        );

        const cacheKey = getStatsCacheKey(user.id, img.id);
        const existing = statsCache.get(cacheKey);
        if (existing) {
            statsCache.set(cacheKey, {
                ...existing,
                likes: currentlyLiked
                    ? Math.max(0, existing.likes - 1)
                    : existing.likes + 1,
                hasLiked: !currentlyLiked,
                at: Date.now(),
            });
        }

        try {
            if (currentlyLiked) {
                await supabase
                    .from("qfeed_images_likes")
                    .delete()
                    .eq("image_id", img.id)
                    .eq("user_id", user.id);
            } else {
                await supabase
                    .from("qfeed_images_likes")
                    .insert({ image_id: img.id, user_id: user.id });
                markImageSeen(supabase, user.id, img.id);
            }
        } catch {
            setHasLiked(currentlyLiked);
            setLikesCount((prev) =>
                currentlyLiked ? prev + 1 : Math.max(0, prev - 1)
            );
            if (existing) statsCache.set(cacheKey, existing);
        }
    };

    const handleImageClick = () => {
        if (!img?.image_url) return;
        tap();
        openViewer({
            ...img,
            image_url: img.image_url,
            title: img.title || "Image",
            description: img.description || "",
        });
    };

    /* ── Swipe ──────────────────────────────────────────── */
    const SWIPE_THRESHOLD = 60;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (totalSlides <= 1) return;
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        touchDeltaX.current = 0;
        setSwipeOffset(0);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartX.current === null || totalSlides <= 1) return;
        const dx = e.touches[0].clientX - touchStartX.current;
        const dy = e.touches[0].clientY - (touchStartY.current ?? 0);
        if (Math.abs(dy) > Math.abs(dx) * 1.5) return;
        touchDeltaX.current = dx;
        const capped = Math.max(-80, Math.min(80, dx));
        setSwipeOffset(capped);
    };

    const handleTouchEnd = () => {
        if (touchStartX.current === null || totalSlides <= 1) {
            setSwipeOffset(0);
            return;
        }
        const dx = touchDeltaX.current;
        if (dx <= -SWIPE_THRESHOLD && currentSlide < totalSlides - 1) {
            setCurrentSlide((s) => Math.min(totalSlides - 1, s + 1));
        } else if (dx >= SWIPE_THRESHOLD && currentSlide > 0) {
            setCurrentSlide((s) => Math.max(0, s - 1));
        }
        touchStartX.current = null;
        touchStartY.current = null;
        touchDeltaX.current = 0;
        setSwipeOffset(0);
    };

    /* ── Comment actions ────────────────────────────────── */
    const handleDeleteComment = async (commentId: string) => {
        const { error } = await supabase
            .from("qfeed_images_comments")
            .delete()
            .eq("id", commentId)
            .eq("user_id", user.id);
        if (error) throw error;
        if (img?.id) {
            commentsCache.delete(`comments_${img.id}`);
            setComments((prev) =>
                prev.filter(
                    (c) => c.id !== commentId && c.parent_id !== commentId
                )
            );
            setCommentsCount((prev) => Math.max(0, prev - 1));
        }
    };

    const handleEditComment = async (
        commentId: string,
        currentContent: string
    ) => {
        const newContent = prompt("Edit your comment:", currentContent);
        if (
            newContent === null ||
            newContent.trim() === "" ||
            newContent === currentContent
        )
            return;
        const { error } = await supabase
            .from("qfeed_images_comments")
            .update({ content: newContent.trim() })
            .eq("id", commentId)
            .eq("user_id", user.id);
        if (!error && img?.id) {
            commentsCache.delete(`comments_${img.id}`);
            setIsCommentsLoaded(false);
            loadComments();
        }
    };

    const handleImageUploadWithMetadata = () => {
        if (uploadFiles.length === 0) return;
        if (handleImageUpload && typeof handleImageUpload === "function") {
            const related = uploadFiles.length > 1 ? isRelated : false;
            handleImageUpload(related);
        }
    };

    const handlePostComment = async () => {
        if (!img || !commentText.trim() || !user || isSubmittingComment) return;
        setIsSubmittingComment(true);
        try {
            const { data: inserted, error } = await supabase
                .from("qfeed_images_comments")
                .insert({
                    image_id: img.id,
                    user_id: user.id,
                    content: commentText.trim(),
                })
                .select(
                    "id, content, created_at, user_id, parent_id, profiles:user_id(name, avatar_url)"
                )
                .single();

            if (error) throw error;

            if (inserted) {
                setComments((prev) => [...prev, inserted]);
                setCommentsCount((prev) => prev + 1);
                setCommentText("");
                markImageSeen(supabase, user.id, img.id);
                commentsCache.delete(`comments_${img.id}`);
            }
        } catch (err) {
            console.warn("[MediaPanel] post comment failed:", err);
        } finally {
            setIsSubmittingComment(false);
        }
    };

    /* ── Locked aspect ──────────────────────────────────── */
    const containerAspect =
        lockedAspect ?? groupAspectCache.get(groupKey ?? "");

    const handleFirstSlideLoad = (
        e: React.SyntheticEvent<HTMLImageElement>,
        slideId: string
    ) => {
        const el = e.currentTarget;
        setLoadedImages((prev) => ({ ...prev, [slideId]: true }));

        if (
            currentSlide === 0 &&
            !containerAspect &&
            el.naturalWidth &&
            el.naturalHeight
        ) {
            const ratio = el.naturalWidth / el.naturalHeight;
            groupAspectCache.set(groupKey ?? "", ratio);
            setLockedAspect(ratio);
        }
    };

    /* ── Loading skeleton ───────────────────────────────── */
    if (isLoadingData && img) {
        return (
            <div className="w-full mb-2">
                <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#161b22] animate-pulse">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                            <div className="flex flex-col gap-1.5">
                                <div className="h-3 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
                                <div className="h-2.5 w-32 rounded bg-slate-100 dark:bg-white/[0.06]" />
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                    </div>
                    {/* Image */}
                    <div
                        className="w-full bg-slate-100 dark:bg-white/[0.06]"
                        style={{
                            aspectRatio:
                                containerAspect !== undefined &&
                                    containerAspect !== null
                                    ? String(containerAspect)
                                    : "1 / 1",
                            maxHeight: "600px",
                        }}
                    />
                    {/* Actions */}
                    <div className="p-3 space-y-3">
                        <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-white/[0.06]" />
                        <div className="flex gap-2 pt-1">
                            <div className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                            <div className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                            <div className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* ── Toast ──────────────────────────────────────── */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 z-50
                               bg-emerald-600 text-white
                               px-4 py-2 rounded-full
                               text-[12px] font-bold
                               shadow-sm"
                    >
                        {toastMessage}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════════ */}
            {/* FEED CONTENT — only when there's an actual post   */}
            {/* ═══════════════════════════════════════════════════ */}
            {img && (
                <>
                    {/* ── Composer prompt (Facebook-style) ───────────── */}
                    <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 mb-3">
                        <div className="flex gap-2.5 items-center">
                            <img
                                src={
                                    user?.user_metadata?.avatar_url ||
                                    "/UsersAvatar.jpg"
                                }
                                className="w-9 h-9 rounded-full object-cover shrink-0
                                       ring-2 ring-slate-200 dark:ring-white/[0.08]"
                                alt="User"
                                loading="lazy"
                            />
                            <button
                                onClick={() => {
                                    tap();
                                    setShowUpload(!showUpload);
                                }}
                                className="flex-1 text-left px-3.5 h-10 rounded-full
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-500 dark:text-slate-400
                                       text-[12.5px] font-medium
                                       active:scale-[0.98] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                Share something visual,{" "}
                                {user?.user_metadata?.full_name?.split(" ")[0] ||
                                    "Friend"}
                            </button>
                        </div>
                        <div className="flex items-center gap-1 mt-2 pt-2
                                    border-t border-slate-100 dark:border-white/[0.04]">
                            <button
                                onClick={() => {
                                    tap();
                                    setShowUpload(true);
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5
                                       h-9 rounded-lg
                                       text-[12px] font-bold
                                       text-slate-600 dark:text-slate-300
                                       active:bg-slate-100 dark:active:bg-white/5
                                       transition-colors"
                                style={{ touchAction: "manipulation" }}
                            >
                                <ImageIcon
                                    className="text-emerald-600 dark:text-emerald-400"
                                    size={16}
                                />
                                Photo / Video
                            </button>
                        </div>
                    </div>

                    {/* ── Post card ──────────────────────────────────── */}
                    <article className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-3 py-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                    src={
                                        img.profiles?.avatar_url ||
                                        "/UsersAvatar.jpg"
                                    }
                                    className="w-9 h-9 rounded-full object-cover shrink-0
                                           ring-2 ring-slate-200 dark:ring-white/[0.08]"
                                    alt="Profile"
                                    loading="lazy"
                                />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[13px] font-bold leading-tight text-slate-900 dark:text-white truncate">
                                        {img.profiles?.name || "Member"}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider
                                                 text-slate-500 dark:text-slate-400 leading-none mt-1">
                                        Shared a resource
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    tap();
                                    if (img.added_by === user?.id) {
                                        handleDeleteImage(img);
                                    }
                                }}
                                className="h-9 w-9 rounded-full flex items-center justify-center
                                       text-slate-400 dark:text-slate-500
                                       active:bg-slate-100 dark:active:bg-white/5
                                       transition-colors shrink-0"
                                style={{ touchAction: "manipulation" }}
                                aria-label={
                                    img.added_by === user?.id
                                        ? "Delete post"
                                        : "More"
                                }
                            >
                                {img.added_by === user?.id ? (
                                    <Trash2
                                        size={16}
                                        strokeWidth={2.25}
                                    />
                                ) : (
                                    <MoreHorizontal
                                        size={16}
                                        strokeWidth={2.25}
                                    />
                                )}
                            </button>
                        </div>

                        {/* Title */}
                        {img.title && (
                            <div className="px-3 pb-2">
                                <h3 className="text-[14px] font-bold text-slate-900 dark:text-white leading-snug">
                                    {img.title}
                                </h3>
                            </div>
                        )}

                        {/* Image stage */}
                        <div
                            className="relative w-full bg-black flex items-center justify-center overflow-hidden touch-pan-y"
                            style={{
                                aspectRatio:
                                    containerAspect !== undefined &&
                                        containerAspect !== null
                                        ? String(containerAspect)
                                        : "4 / 5",
                                maxHeight: "600px",
                            }}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            {group && totalSlides > 1 ? (
                                <div
                                    className="absolute inset-0 flex"
                                    style={{
                                        width: `${totalSlides * 100}%`,
                                        transform: `translateX(-${(currentSlide * 100) / totalSlides
                                            }%) translateX(${totalSlides > 1
                                                ? swipeOffset * (1 / totalSlides)
                                                : 0
                                            }px)`,
                                        transition:
                                            touchStartX.current === null
                                                ? "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)"
                                                : "none",
                                        willChange: "transform",
                                    }}
                                >
                                    {group.map((g, i) => {
                                        const src = g.image_url.includes(
                                            "cloudinary"
                                        )
                                            ? g.image_url.replace(
                                                "/upload/",
                                                "/upload/w_800,f_auto,q_auto/"
                                            )
                                            : g.image_url;
                                        return (
                                            <div
                                                key={g.id}
                                                className="relative flex items-center justify-center"
                                                style={{
                                                    width: `${100 / totalSlides
                                                        }%`,
                                                    flex: `0 0 ${100 / totalSlides
                                                        }%`,
                                                }}
                                            >
                                                <img
                                                    src={src}
                                                    alt={
                                                        g.title ||
                                                        `Slide ${i + 1}`
                                                    }
                                                    draggable={false}
                                                    loading={
                                                        i === 0
                                                            ? "eager"
                                                            : "lazy"
                                                    }
                                                    decoding="async"
                                                    onLoad={(e) =>
                                                        handleFirstSlideLoad(
                                                            e,
                                                            g.id
                                                        )
                                                    }
                                                    onClick={(e) => {
                                                        if (
                                                            Math.abs(
                                                                touchDeltaX.current
                                                            ) > 10
                                                        )
                                                            return;
                                                        if (
                                                            i === currentSlide
                                                        ) {
                                                            handleImageClick();
                                                        }
                                                    }}
                                                    className="max-w-full max-h-full object-contain cursor-pointer select-none"
                                                />

                                                {!loadedImages[g.id] && (
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <GlobalLoader />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <img
                                        src={
                                            img.image_url.includes("cloudinary")
                                                ? img.image_url.replace(
                                                    "/upload/",
                                                    "/upload/w_800,f_auto,q_auto/"
                                                )
                                                : img.image_url
                                        }
                                        alt={img.title || "Feed image"}
                                        draggable={false}
                                        decoding="async"
                                        onLoad={(e) =>
                                            handleFirstSlideLoad(e, img.id)
                                        }
                                        onClick={handleImageClick}
                                        className="max-w-full max-h-full object-contain cursor-pointer select-none"
                                    />
                                    {!loadedImages[img.id] && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <GlobalLoader />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Carousel chrome */}
                            {totalSlides > 1 && (
                                <>
                                    <div className="absolute top-3 left-3 z-20
                                                bg-black/60 text-white
                                                text-[10px] font-bold tabular-nums
                                                px-2 py-1 rounded-full">
                                        {currentSlide + 1}/{totalSlides}
                                    </div>

                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20
                                                flex items-center gap-1 pointer-events-none">
                                        {group!.map((_, i) => (
                                            <div
                                                key={i}
                                                className={`h-1 rounded-full transition-all ${i === currentSlide
                                                    ? "bg-white w-5"
                                                    : "bg-white/50 w-1"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}

                            {img.added_by === user?.id && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        tap();
                                        handleDeleteImage(img!);
                                    }}
                                    className="absolute top-3 right-3 z-20
                                           h-9 w-9 rounded-full
                                           bg-black/60 text-white
                                           flex items-center justify-center
                                           active:scale-[0.92] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                    aria-label="Delete image"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>

                        {/* Meta + actions */}
                        <div className="p-3 space-y-2">
                            {img.description && (
                                <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {img.description}
                                </p>
                            )}

                            {/* Stats row */}
                            <div className="flex items-center justify-between
                                        text-[11px] font-medium
                                        text-slate-500 dark:text-slate-400
                                        py-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center justify-center
                                                 h-4 w-4 rounded-full bg-rose-600 text-white">
                                        <Heart size={9} className="fill-current" />
                                    </span>
                                    <span className="tabular-nums">
                                        {likesCount}
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        tap();
                                        setIsCommentModalOpen(true);
                                    }}
                                    className="tabular-nums active:opacity-70 transition-opacity"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    {commentsCount} comment
                                    {commentsCount === 1 ? "" : "s"}
                                </button>
                            </div>

                            {/* Action row */}
                            <div className="grid grid-cols-3 gap-1
                                        pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                                <ActionButton
                                    active={hasLiked}
                                    activeColor="rose"
                                    icon={
                                        <Heart
                                            size={16}
                                            strokeWidth={2.25}
                                            className={
                                                hasLiked ? "fill-current" : ""
                                            }
                                        />
                                    }
                                    label={hasLiked ? "Liked" : "Like"}
                                    onClick={handleLikeToggle}
                                />
                                <ActionButton
                                    icon={
                                        <MessageCircle
                                            size={16}
                                            strokeWidth={2.25}
                                        />
                                    }
                                    label="Comment"
                                    onClick={() => {
                                        tap();
                                        setIsCommentModalOpen(true);
                                    }}
                                />
                                <ActionButton
                                    icon={
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.25"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                            <polyline points="16 6 12 2 8 6" />
                                            <line
                                                x1="12"
                                                y1="2"
                                                x2="12"
                                                y2="15"
                                            />
                                        </svg>
                                    }
                                    label="Share"
                                    onClick={() => {
                                        tap();
                                        const message =
                                            "Join to learn with visuals and high-quality questions on Medrae! https://medrae.vercel.app";
                                        window.open(
                                            `https://wa.me/?text=${encodeURIComponent(
                                                message
                                            )}`,
                                            "_blank"
                                        );
                                    }}
                                />
                            </div>
                        </div>
                    </article>

                    {/* Section divider */}
                    <div className="flex items-center gap-2 py-3 opacity-60">
                        <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.06]" />
                        <span className="text-[9px] font-bold uppercase tracking-widest
                                     text-slate-500 dark:text-slate-400">
                            Community spotlight
                        </span>
                        <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.06]" />
                    </div>
                </>
            )}

            {/* ═══════════════════════════════════════════════════ */}
            {/* COMPOSER MODAL — always mounted                     */}
            {/* ═══════════════════════════════════════════════════ */}
            <CenteredModal
                open={showUpload}
                onClose={() => {
                    if (uploading) return;
                    setShowUpload(false);
                }}
                title="New post"
                subtitle={
                    uploadFiles.length > 0
                        ? `${uploadFiles.length} selected`
                        : "Share photos with the community"
                }
                maxWidthClass="max-w-md"
                maxHeight="92dvh"
                locked={uploading}
                footer={
                    <div className="px-4 py-3">
                        <button
                            onClick={handleImageUploadWithMetadata}
                            disabled={uploadFiles.length === 0 || uploading}
                            className={`w-full h-11 rounded-xl text-sm font-bold
                        flex items-center justify-center gap-2
                        transition-transform
                        ${uploadFiles.length === 0 || uploading
                                    ? "bg-slate-200 dark:bg-white/[0.08] text-slate-400 dark:text-slate-500 cursor-not-allowed"
                                    : "bg-blue-600 text-white active:scale-[0.97]"
                                }`}
                            style={{ touchAction: "manipulation" }}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Uploading…
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4" />
                                    Post{" "}
                                    {uploadFiles.length > 0
                                        ? `${uploadFiles.length} ${uploadFiles.length === 1
                                            ? "photo"
                                            : "photos"
                                        }`
                                        : "now"}
                                </>
                            )}
                        </button>
                    </div>
                }
            >
                <div className="px-4 py-4 space-y-3">
                    {/* Title */}
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider
                          text-slate-500 dark:text-slate-400">
                            Title{" "}
                            <span className="normal-case tracking-normal opacity-70">
                                (optional)
                            </span>
                        </label>
                        <input
                            type="text"
                            value={imageTitle}
                            onChange={(e) => setImageTitle(e.target.value)}
                            placeholder="Give your post a title"
                            className="w-full h-11 px-3 rounded-xl
                       bg-slate-50 dark:bg-[#0d1117]
                       text-sm text-slate-900 dark:text-white
                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                       border-0 outline-none
                       focus:ring-2 focus:ring-blue-500/40"
                            style={{ touchAction: "manipulation" }}
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider
                          text-slate-500 dark:text-slate-400">
                            Description{" "}
                            <span className="normal-case tracking-normal opacity-70">
                                (optional)
                            </span>
                        </label>
                        <textarea
                            value={imageDescription}
                            onChange={(e) =>
                                setImageDescription(e.target.value)
                            }
                            placeholder="Say something about this post…"
                            rows={3}
                            className="w-full px-3 py-2.5 rounded-xl
                       bg-slate-50 dark:bg-[#0d1117]
                       text-sm text-slate-900 dark:text-white
                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                       border-0 outline-none resize-none
                       focus:ring-2 focus:ring-blue-500/40"
                            style={{ touchAction: "manipulation" }}
                        />
                    </div>

                    {/* Image picker */}
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider
                          text-slate-500 dark:text-slate-400">
                            Photos ({uploadFiles.length}/{MAX_FILES})
                        </label>

                        {uploadFiles.length > 0 && (
                            <div className="grid grid-cols-3 gap-1.5">
                                {uploadFiles.map((file, i) => (
                                    <div
                                        key={i}
                                        className="relative aspect-square rounded-xl overflow-hidden
                                   bg-slate-100 dark:bg-white/[0.06]"
                                    >
                                        <img
                                            src={URL.createObjectURL(file)}
                                            className="w-full h-full object-cover"
                                            alt={`Preview ${i}`}
                                            loading="lazy"
                                        />
                                        <button
                                            onClick={() => {
                                                tap();
                                                setUploadFiles(
                                                    uploadFiles.filter(
                                                        (_, idx) => idx !== i
                                                    )
                                                );
                                            }}
                                            disabled={uploading}
                                            className="absolute top-1 right-1
                                       h-6 w-6 rounded-full
                                       bg-black/60 text-white
                                       flex items-center justify-center
                                       active:scale-[0.92] transition-transform
                                       disabled:opacity-40"
                                            style={{
                                                touchAction: "manipulation",
                                            }}
                                            aria-label="Remove"
                                        >
                                            <X
                                                className="h-3 w-3"
                                                strokeWidth={2.75}
                                            />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <label
                            className="cursor-pointer flex flex-col items-center justify-center
                       min-h-[100px] rounded-xl
                       border border-dashed
                       border-slate-200 dark:border-white/[0.1]
                       active:bg-slate-50 dark:active:bg-white/[0.03]
                       transition-colors"
                            style={{ touchAction: "manipulation" }}
                        >
                            <div className="flex flex-col items-center p-4">
                                <div className="h-9 w-9 rounded-full
                                bg-blue-50 dark:bg-blue-400/10
                                flex items-center justify-center mb-2">
                                    <Upload
                                        size={16}
                                        className="text-blue-600 dark:text-blue-400"
                                    />
                                </div>
                                <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                                    {uploadFiles.length > 0
                                        ? "Add more photos"
                                        : "Tap to select photos"}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Up to {MAX_FILES} images
                                </span>
                            </div>
                            <input
                                type="file"
                                multiple
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                    const picked = Array.from(
                                        e.target.files || []
                                    );
                                    const remaining =
                                        MAX_FILES - uploadFiles.length;
                                    const limited = picked.slice(
                                        0,
                                        remaining
                                    );
                                    setUploadFiles((prev) =>
                                        [...prev, ...limited].slice(
                                            0,
                                            MAX_FILES
                                        )
                                    );
                                    e.target.value = "";
                                }}
                            />
                        </label>
                    </div>

                    {/* Related toggle */}
                    {uploadFiles.length > 1 && (
                        <button
                            onClick={() => {
                                tap();
                                setIsRelated((v) => !v);
                            }}
                            className={`w-full flex items-center justify-between gap-3
                        p-3 rounded-xl transition-colors
                        ${isRelated
                                    ? "bg-blue-50 dark:bg-blue-400/10"
                                    : "bg-slate-50 dark:bg-[#0d1117]"
                                }`}
                            style={{ touchAction: "manipulation" }}
                        >
                            <div className="text-left min-w-0">
                                <p
                                    className={`text-[12px] font-bold ${isRelated
                                        ? "text-blue-700 dark:text-blue-300"
                                        : "text-slate-900 dark:text-white"
                                        }`}
                                >
                                    Related post
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Show as one carousel post
                                </p>
                            </div>
                            <span
                                className={`relative h-6 w-11 rounded-full shrink-0 transition-colors ${isRelated
                                    ? "bg-blue-600"
                                    : "bg-slate-200 dark:bg-white/[0.12]"
                                    }`}
                            >
                                <span
                                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white
                                transition-transform
                                ${isRelated
                                            ? "translate-x-5"
                                            : "translate-x-0.5"
                                        }`}
                                />
                            </span>
                        </button>
                    )}
                </div>
            </CenteredModal>

            {/* ═══════════════════════════════════════════════════ */}
            {/* COMMENTS MODAL — only when there's a post          */}
            {/* ═══════════════════════════════════════════════════ */}
            {isCommentModalOpen && img && (
                <CommentsModal
                    variant="image"
                    entityId={img.id}
                    activeQuestion={img.id}
                    setActiveQuestion={(v: any) => setIsCommentModalOpen(!!v)}
                    questions={[
                        {
                            id: img.id,
                            question_text: img.title || "Shared image",
                            quiz_title: img.profiles?.name || "Community",
                        },
                    ]}
                    comments={comments}
                    user={user}
                    replyTo={imageReplyTo}
                    setReplyTo={setImageReplyTo}
                    toggleCommentLike={() => { }}
                    newComment={commentText}
                    setNewComment={setCommentText}
                    addComment={handlePostComment}
                    deleteComment={handleDeleteComment}
                    leftPanel={
                        <img
                            src={
                                img.image_url?.includes("cloudinary")
                                    ? img.image_url.replace(
                                        "/upload/",
                                        "/upload/w_1200,f_auto,q_auto/"
                                    )
                                    : img.image_url
                            }
                            alt={img.title || "Image"}
                            className="max-w-full max-h-full object-contain"
                            draggable={false}
                        />
                    }
                />
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Action button — reusable, breathable spacing                      */
/* ------------------------------------------------------------------ */

function ActionButton({
    icon,
    label,
    active,
    activeColor = "blue",
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    activeColor?: "blue" | "rose";
    onClick: () => void;
}) {
    const activeClass =
        activeColor === "rose"
            ? "text-rose-600 dark:text-rose-400"
            : "text-blue-600 dark:text-blue-400";

    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center gap-1.5
                        h-10 rounded-xl
                        text-[12px] font-bold
                        active:scale-[0.97] transition-all
                        ${active
                    ? activeClass
                    : "text-slate-600 dark:text-slate-300"
                }`}
            style={{ touchAction: "manipulation" }}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}