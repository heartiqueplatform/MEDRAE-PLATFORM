"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Trash2,
    Upload,
    Heart,
    MessageCircle,
    MoreHorizontal,
    ImageIcon,
    X,
    Send,
    CheckCircle,
} from "lucide-react";
import { GlobalLoader } from "@/components/GlobalLoader";

type FeedImage = {
    id: string;
    image_url: string;
    title?: string;
    description?: string;
    added_by?: string;
    profiles?: {
        name?: string;
        avatar_url?: string;
    };
};

interface Props {
    index: number;
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
    handleImageUpload: () => void;
    imageTitle: string;
    setImageTitle: React.Dispatch<React.SetStateAction<string>>;
    imageDescription: string;
    setImageDescription: React.Dispatch<React.SetStateAction<string>>;
}

// ============================================================
// CONSTANTS
// ============================================================
const STATS_TIMEOUT_MS = 6000;
const COMMENTS_TIMEOUT_MS = 6000;

// ============================================================
// HELPERS
// ============================================================
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), ms)
        ),
    ]);
}

// ============================================================
// MODULE-LEVEL CACHES
// Cleared by clearMediaPanelCaches() on user change / feed refresh.
// Never trust these across user boundaries.
// ============================================================
const statsCache = new Map<
    string,
    { likes: number; comments: number; hasLiked: boolean; at: number }
>();
const commentsCache = new Map<string, { data: any[]; at: number }>();
const pendingRequests = new Map<string, Promise<any>>();

export function clearMediaPanelCaches() {
    statsCache.clear();
    commentsCache.clear();
    pendingRequests.clear();
}

function getStatsCacheKey(userId: string, imageId: string) {
    return `${userId}_${imageId}`;
}

// ============================================================
// DATA LAYER
// ============================================================

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

/**
 * Mark image as "seen" so it never appears in this user's feed again.
 * Fire-and-forget — failure doesn't affect UX. Idempotent via upsert.
 */
function markImageSeen(supabase: any, userId: string, imageId: string) {
    supabase
        .from("seen_images")
        .upsert(
            { user_id: userId, image_id: imageId },
            { onConflict: "user_id,image_id", ignoreDuplicates: true }
        )
        .then(({ error }: any) => {
            if (error && error.code !== "23505") {
                console.warn("[MediaPanel] mark seen failed:", error.message);
            }
        });
}

// ============================================================
// COMPONENT
// ============================================================

export default function FeedMediaPanel({
    index,
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
    // ── NOTE: We no longer track `seenIds` here. The parent Feed is
    // expected to fetch only unseen images via the RPC
    // `get_unseen_feed_images`. This panel trusts that contract.
    const [commentsCount, setCommentsCount] = useState(0);
    const [likesCount, setLikesCount] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

    const [uploadProgress, setUploadProgress] = useState(0);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [comments, setComments] = useState<any[]>([]);
    const [commentText, setCommentText] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isCommentsLoaded, setIsCommentsLoaded] = useState(false);

    const isMounted = useRef(true);

    // ── Pick the image for this slot ─────────────────────────
    // Simple round-robin over whatever the parent gave us.
    let img: FeedImage | null = null;
    const showImage = index % 2 === 0;
    if (showImage && feedImages.length > 0) {
        const imageCounter = Math.floor(index / 2);
        const imageIndex = imageCounter % feedImages.length;
        img = feedImages[imageIndex];
    }

    // ── Fetch stats for the currently-displayed image ────────
    useEffect(() => {
        if (!img?.id || !user?.id) {
            setIsLoadingData(false);
            return;
        }
        isMounted.current = true;

        const load = async () => {
            setIsLoadingData(true);
            try {
                const cached = statsCache.get(
                    getStatsCacheKey(user.id, img!.id)
                );
                if (cached) {
                    setLikesCount(cached.likes);
                    setCommentsCount(cached.comments);
                    setHasLiked(cached.hasLiked);
                    setIsLoadingData(false);
                }

                const map = await fetchStatsBatch(supabase, user.id, [img!.id]);
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

    // ── Upload progress animation ─────────────────────────────
    useEffect(() => {
        if (uploading) {
            setUploadProgress(0);
            const interval = setInterval(() => {
                setUploadProgress((prev) => {
                    if (prev >= 95) {
                        clearInterval(interval);
                        return 95;
                    }
                    return prev + 5;
                });
            }, 200);
            return () => clearInterval(interval);
        } else {
            setUploadProgress(0);
        }
    }, [uploading]);

    // ── Reset upload form when closed ─────────────────────────
    useEffect(() => {
        if (!showUpload) {
            setImageTitle("");
            setImageDescription("");
            setUploadFiles([]);
        }
    }, [showUpload, setImageTitle, setImageDescription, setUploadFiles]);

    // ── Load comments on modal open ───────────────────────────
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

    // ── LIKE — optimistic + mark seen ────────────────────────
    const handleLikeToggle = async () => {
        if (!user || !img) return;
        const currentlyLiked = hasLiked;

        // Optimistic UI
        setHasLiked(!currentlyLiked);
        setLikesCount((prev) =>
            currentlyLiked ? Math.max(0, prev - 1) : prev + 1
        );

        // Update cache so remounts reflect it
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
                // Unlike — do NOT touch seen_images. They already saw it.
                await supabase
                    .from("qfeed_images_likes")
                    .delete()
                    .eq("image_id", img.id)
                    .eq("user_id", user.id);
            } else {
                // Like — insert + mark as seen (never show again)
                await supabase
                    .from("qfeed_images_likes")
                    .insert({ image_id: img.id, user_id: user.id });
                markImageSeen(supabase, user.id, img.id);
            }
        } catch {
            // Revert
            setHasLiked(currentlyLiked);
            setLikesCount((prev) =>
                currentlyLiked ? prev + 1 : Math.max(0, prev - 1)
            );
            if (existing) statsCache.set(cacheKey, existing);
        }
    };

    // ── Full-screen tap — mark seen ──────────────────────────
    const handleImageClick = async () => {
        if (!img?.image_url) return;
        openViewer({
            ...img,
            image_url: img.image_url,
            title: img.title || "Image",
            description: img.description || "",
        });
        const userId = session?.user?.id;
        if (!userId) return;
        markImageSeen(supabase, userId, img.id);
    };

    // ── Comment actions ──────────────────────────────────────
    const handleDeleteComment = async (commentId: string) => {
        if (!confirm("Delete this comment?")) return;
        const { error } = await supabase
            .from("qfeed_images_comments")
            .delete()
            .eq("id", commentId)
            .eq("user_id", user.id);
        if (!error && img?.id) {
            commentsCache.delete(`comments_${img.id}`);
            setIsCommentsLoaded(false);
            loadComments();
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

    const handleImageUploadWithMetadata = async () => {
        if (uploadFiles.length === 0) {
            alert("Please select at least one image");
            return;
        }
        if (handleImageUpload && typeof handleImageUpload === "function") {
            handleImageUpload();
        }
    };

    // ── POST COMMENT — also marks seen ───────────────────────
    const handlePostComment = async () => {
        if (!img || !commentText.trim() || !user || isSubmittingComment)
            return;
        setIsSubmittingComment(true);
        const { error } = await supabase
            .from("qfeed_images_comments")
            .insert({
                image_id: img.id,
                user_id: user.id,
                content: commentText.trim(),
            });
        if (!error && img?.id) {
            // The moment they comment, they've seen it. Never show again.
            markImageSeen(supabase, user.id, img.id);

            setCommentText("");
            commentsCache.delete(`comments_${img.id}`);
            setIsCommentsLoaded(false);
            loadComments();
            setCommentsCount((prev) => prev + 1);
        }
        setIsSubmittingComment(false);
    };

    // ── Loading skeleton ─────────────────────────────────────
    if (isLoadingData && img) {
        return (
            <div className="w-full max-w-2xl mx-auto mb-2">
                <Card className="overflow-hidden bg-white dark:bg-muted/95 border-0 shadow-sm rounded-xl">
                    <div className="p-4">
                        <div className="animate-pulse">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                                </div>
                            </div>
                            <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="w-full max-w-full mx-auto space-y-2 mb-2">
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2"
                    >
                        <CheckCircle size={20} />
                        <span className="font-medium">{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Upload Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-muted/95 rounded-xl shadow-sm border-0 p-4"
            >
                <div className="flex gap-3 items-center">
                    <img
                        src={user?.user_metadata?.avatar_url || "/UsersAvatar.jpg"}
                        className="w-10 h-10 rounded-full object-cover border"
                        alt="User"
                        loading="lazy"
                    />
                    <button
                        onClick={() => setShowUpload(!showUpload)}
                        className="flex-1 text-left px-4 py-2.5 bg-gray-100 dark:bg-muted/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 text-sm transition-colors"
                    >
                        Share something visual,{" "}
                        {user?.user_metadata?.full_name?.split(" ")[0] || "Friend"}?
                    </button>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-0">
                    <button
                        onClick={() => setShowUpload(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <ImageIcon className="text-green-500" size={20} />
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Photo/Video
                        </span>
                    </button>
                </div>
                <AnimatePresence>
                    {showUpload && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                        >
                            <div className="mt-4 p-4 border-0 rounded-xl bg-gray-50 dark:bg-muted/50 relative">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Title (optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={imageTitle}
                                            onChange={(e) => setImageTitle(e.target.value)}
                                            placeholder="Give your image a title..."
                                            className="w-full px-3 py-2 bg-white dark:bg-muted/50 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Description (optional)
                                        </label>
                                        <textarea
                                            value={imageDescription}
                                            onChange={(e) => setImageDescription(e.target.value)}
                                            placeholder="Write a description..."
                                            rows={3}
                                            className="w-full px-3 py-2 bg-white dark:bg-muted/50 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm resize-none"
                                        />
                                    </div>
                                    <label className="cursor-pointer flex flex-col items-center justify-center min-h-[120px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500 transition-colors">
                                        {uploadFiles.length > 0 ? (
                                            <div className="grid grid-cols-3 gap-2 w-full p-2">
                                                {uploadFiles.map((file, i) => (
                                                    <div key={i} className="relative">
                                                        <img
                                                            src={URL.createObjectURL(file)}
                                                            className="w-full h-24 object-cover rounded-lg border"
                                                            alt={`Preview ${i}`}
                                                            loading="lazy"
                                                        />
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setUploadFiles(
                                                                    uploadFiles.filter(
                                                                        (_, idx) => idx !== i
                                                                    )
                                                                );
                                                            }}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center p-6">
                                                <Upload size={24} className="text-blue-600 mb-2" />
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                    Tap to select images
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                    You can select multiple images
                                                </span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) =>
                                                setUploadFiles(
                                                    Array.from(e.target.files || [])
                                                )
                                            }
                                        />
                                    </label>
                                    {uploading && uploadProgress > 0 && (
                                        <div className="mt-3">
                                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                <span>Uploading...</span>
                                                <span>{uploadProgress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                                <motion.div
                                                    className="bg-blue-600 h-full rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${uploadProgress}%` }}
                                                    transition={{ duration: 0.3 }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                                                Please don't close the page
                                            </p>
                                        </div>
                                    )}
                                </div>
                                {uploadFiles.length > 0 && (
                                    <Button
                                        onClick={handleImageUploadWithMetadata}
                                        disabled={uploading}
                                        className="w-full mt-4 bg-blue-600"
                                    >
                                        {uploading
                                            ? `Uploading... ${uploadProgress}%`
                                            : "Post Now"}
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Main Content - Images Only */}
            {img ? (
                <motion.div key={`image-${img.id}`} className="w-full">
                    <Card className="overflow-hidden bg-white dark:bg-muted/95 border-0 shadow-sm rounded-xl">
                        <div className="flex items-center justify-between p-3 px-4">
                            <div className="flex items-center gap-3">
                                <img
                                    src={img.profiles?.avatar_url || "/UsersAvatar.jpg"}
                                    className="w-10 h-10 rounded-full border shadow-sm"
                                    alt="Profile"
                                    loading="lazy"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold leading-tight">
                                        {img.profiles?.name || "Member"}
                                    </span>
                                    <span className="text-[11px] text-gray-500 font-medium uppercase tracking-tight">
                                        Shared a Resource
                                    </span>
                                </div>
                            </div>
                            <button className="text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors">
                                <MoreHorizontal size={18} />
                            </button>
                        </div>
                        {img.title && (
                            <div className="px-4 pt-2">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    {img.title}
                                </h3>
                            </div>
                        )}
                        <div className="relative group bg-gray-100 dark:bg-gray-900 min-h-[300px] flex items-center justify-center overflow-hidden">
                            {!loadedImages[img.id] && (
                                <div className="absolute inset-0 flex items-center justify-center scale-50">
                                    <GlobalLoader />
                                </div>
                            )}
                            <img
                                src={
                                    img.image_url.includes("cloudinary")
                                        ? img.image_url.replace(
                                            "/upload/",
                                            "/upload/w_800,f_auto,q_auto/"
                                        )
                                        : img.image_url
                                }
                                onLoad={() =>
                                    setLoadedImages((prev) => ({
                                        ...prev,
                                        [img!.id]: true,
                                    }))
                                }
                                onClick={handleImageClick}
                                className={`w-full h-auto max-h-[600px] object-contain cursor-pointer transition-all duration-700 ${loadedImages[img.id]
                                    ? "opacity-100"
                                    : "opacity-0"
                                    }`}
                                alt={img.title || "Feed image"}
                                loading="lazy"
                            />
                            {img.added_by === user?.id && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteImage(img!);
                                    }}
                                    className="absolute top-3 right-3 bg-black/50 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                        <div className="p-4 pt-3">
                            {img.description && (
                                <p className="text-[15px] mb-3 text-gray-800 dark:text-gray-200">
                                    {img.description}
                                </p>
                            )}
                            <div className="flex items-center justify-between pb-3 border-b dark:border-gray-800">
                                <div className="flex items-center gap-1.5">
                                    <div className="bg-blue-500 rounded-full p-1">
                                        <Heart
                                            size={10}
                                            className="text-white fill-current"
                                        />
                                    </div>
                                    <span className="text-sm text-gray-500 font-medium">
                                        {likesCount} Likes
                                    </span>
                                </div>
                                <button
                                    onClick={() => setIsCommentModalOpen(true)}
                                    className="text-sm text-gray-500 hover:underline"
                                >
                                    {commentsCount} Comments
                                </button>
                            </div>
                            <div className="flex gap-1 pt-1">
                                <button
                                    onClick={handleLikeToggle}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-semibold transition-colors ${hasLiked
                                        ? "text-blue-600"
                                        : "text-gray-600 dark:text-gray-400"
                                        }`}
                                >
                                    <Heart
                                        size={20}
                                        className={hasLiked ? "fill-current" : ""}
                                    />{" "}
                                    Like
                                </button>
                                <button
                                    onClick={() => setIsCommentModalOpen(true)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 font-semibold text-gray-600 dark:text-gray-400"
                                >
                                    <MessageCircle size={20} /> Comment
                                </button>
                                <button
                                    onClick={() => {
                                        const message =
                                            "Join to learn with visuals and high-quality questions on Medrae! https://medrae.vercel.app";
                                        window.open(
                                            `https://wa.me/?text=${encodeURIComponent(
                                                message
                                            )}`,
                                            "_blank"
                                        );
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 font-semibold text-gray-600 dark:text-gray-400 hover:text-[#25D366] transition-colors"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        width="20"
                                        height="20"
                                        fill="currentColor"
                                    >
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.395 0 .01 5.385.008 12.04c0 2.13.547 4.21 1.587 6.083L0 24l6.117-1.605a11.845 11.845 0 005.925 1.585h.005c6.654 0 12.034-5.385 12.036-12.041a11.77 11.77 0 00-3.528-8.414z" />
                                    </svg>
                                    Share
                                </button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            ) : null}

            <div className="flex items-center gap-1 py-2 opacity-40">
                <div className="h-[1px] flex-1 bg-gray-300 dark:bg-gray-800" />
                <span className="text-[10px] font-bold tracking-widest uppercase">
                    Community Spotlight
                </span>
                <div className="h-[1px] flex-1 bg-gray-300 dark:bg-gray-800" />
            </div>

            {/* Comment Modal */}
            <AnimatePresence>
                {isCommentModalOpen && img && (
                    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{
                                type: "spring",
                                damping: 25,
                                stiffness: 300,
                            }}
                            className="bg-white dark:bg-zinc-900 w-full md:w-[90vw] lg:w-[85vw] xl:max-w-6xl h-[92vh] md:h-[85vh] rounded-t-2xl md:rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl"
                        >
                            <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
                                <div className="w-8 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                            </div>

                            <div className="hidden md:flex flex-1 bg-gray-50 dark:bg-zinc-800/30 items-center justify-center border-r dark:border-gray-800 p-4">
                                <img
                                    src={
                                        img.image_url?.includes("cloudinary")
                                            ? img.image_url.replace(
                                                "/upload/",
                                                "/upload/f_auto,q_auto/"
                                            )
                                            : img.image_url
                                    }
                                    className="max-h-full max-w-full object-contain rounded-lg"
                                    alt={img.title || "Image"}
                                    loading="lazy"
                                    onError={(e) => {
                                        e.currentTarget.src = "/fallback-image.jpg";
                                    }}
                                />
                            </div>

                            <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-900 min-h-0">
                                <div className="p-3 md:p-4 border-b dark:border-gray-800 flex justify-between items-center bg-white dark:bg-zinc-900 flex-shrink-0">
                                    <div>
                                        <h3 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                            Comments
                                        </h3>
                                        {img.title && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                                                {img.title}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setIsCommentModalOpen(false)}
                                        className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                                    >
                                        <X
                                            size={18}
                                            className="text-gray-500 dark:text-gray-400"
                                        />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-gray-50 dark:bg-zinc-800/20 custom-scrollbar">
                                    {comments.length > 0 ? (
                                        comments.map((c) => (
                                            <div
                                                key={c.id}
                                                className="flex gap-2 md:gap-3 group"
                                            >
                                                <img
                                                    src={
                                                        c.profiles?.avatar_url ||
                                                        "/UsersAvatar.jpg"
                                                    }
                                                    className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700 flex-shrink-0"
                                                    alt="avatar"
                                                    loading="lazy"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="bg-white dark:bg-gray-800 p-2.5 md:p-3 rounded-2xl shadow-sm border dark:border-gray-700">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                                                {c.profiles?.name || "User"}
                                                            </p>
                                                            <span className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500">
                                                                {new Date(
                                                                    c.created_at
                                                                ).toLocaleDateString(
                                                                    undefined,
                                                                    {
                                                                        month: "short",
                                                                        day: "numeric",
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                    }
                                                                )}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                                                            {c.content}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-3 mt-1 ml-2">
                                                        <button
                                                            onClick={() =>
                                                                setCommentText(
                                                                    `@${c.profiles
                                                                        ?.name || "User"
                                                                    } `
                                                                )
                                                            }
                                                            className="text-[10px] md:text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                                                        >
                                                            Reply
                                                        </button>
                                                        {c.user_id === user?.id && (
                                                            <>
                                                                <button
                                                                    onClick={() =>
                                                                        handleEditComment(
                                                                            c.id,
                                                                            c.content
                                                                        )
                                                                    }
                                                                    className="text-[10px] md:text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() =>
                                                                        handleDeleteComment(
                                                                            c.id
                                                                        )
                                                                    }
                                                                    className="text-[10px] md:text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-center py-10 md:py-12">
                                            <div className="w-14 h-14 md:w-16 md:h-16 mb-3 md:mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                <svg
                                                    className="w-7 h-7 md:w-8 md:h-8 text-gray-400"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={1.5}
                                                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                                    />
                                                </svg>
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm md:text-base">
                                                No comments yet
                                            </p>
                                            <p className="text-xs md:text-sm text-gray-400 dark:text-gray-500 mt-1">
                                                Be the first to start the conversation
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 md:p-4 border-t dark:border-gray-800 bg-white dark:bg-zinc-900 flex-shrink-0">
                                    <div className="flex gap-2">
                                        <input
                                            value={commentText}
                                            onChange={(e) =>
                                                setCommentText(e.target.value)
                                            }
                                            onKeyDown={(e) =>
                                                e.key === "Enter" &&
                                                handlePostComment()
                                            }
                                            placeholder="Write a comment..."
                                            className="flex-1 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        />
                                        <button
                                            onClick={handlePostComment}
                                            disabled={
                                                !commentText.trim() ||
                                                isSubmittingComment
                                            }
                                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-2 md:p-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center min-w-[40px] md:min-w-[42px]"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                    <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mt-1.5 md:mt-2 text-center">
                                        Press Enter to send
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}