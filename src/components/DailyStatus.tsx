// components/DailyStatus.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import {
    User,
    ChevronDown,
    ChevronUp,
    Send,
    Clock,
    Camera,
    X,
    Trash2,
    School,
    MapPin,
    Loader2,
    Heart,
    MessageCircle,
    Eye,
    Infinity as InfinityIcon,
    RefreshCw,
    Sparkles,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CenteredModal } from "./ui/CenteredModal";

/* ─────────────────────────────  helpers  ───────────────────────────── */

const uploadToCloudinary = async (file) => {
    const cloudName = "dpj5vprwf";
    const uploadPreset = "js1gxxdv";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
    );
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message);
    }
    const data = await response.json();
    return data.secure_url;
};

const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2d context");
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            if (!blob) return;
            const file = new File([blob], "cropped_image.jpg", { type: "image/jpeg" });
            resolve(file);
        }, "image/jpeg");
    });
};
const prettyDuration = (d) => {
    switch (d) {
        case "24h": return "24 hours";
        case "1w": return "1 week";
        case "1m": return "1 month";
        case "3m": return "3 months";
        case "forever": return "forever";
        default: return d;
    }
};
const formatCount = (n) => {
    const num = Number(n) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return String(num);
};

const normalizePost = (p) => ({
    ...p,
    id: Number(p.id),
    like_count: Number(p.like_count) || 0,
    comment_count: Number(p.comment_count) || 0,
    view_count: Number(p.view_count) || 0,
    liked_by_me: Boolean(p.liked_by_me),
    is_forever: Boolean(p.is_forever) || p.duration === "forever",
});

/* ───────────────────────────  Skeleton  ─────────────────────────── */

function PostSkeleton({ hasImage = true }) {
    return (
        <div className="relative bg-white dark:bg-muted/30 sm:bg-transparent sm:dark:bg-transparent border-b border-slate-100 dark:border-white/5 sm:border-0 last:border-0 overflow-hidden">
            <div className="flex flex-col">
                {/* Header skeleton */}
                <div className="flex items-center justify-between p-4 pb-2">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                        <div className="flex flex-col gap-1.5">
                            <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                            <div className="h-2 w-16 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Body skeleton */}
                <div className="px-4 pb-3 space-y-2">
                    <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-3 w-4/5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                </div>

                {/* Image skeleton — matches real image card sizing */}
                {hasImage && (
                    <div className="flex items-center justify-center py-2 sm:py-3">
                        <div className="w-full sm:max-w-[600px] h-64 sm:h-80 rounded-2xl sm:rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    </div>
                )}

                {/* Action bar skeleton */}
                <div className="px-4 py-2 flex items-center gap-2">
                    <div className="h-7 w-14 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-7 w-14 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-7 w-14 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="flex-1" />
                    <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                </div>
            </div>
        </div>
    );
}

/* ───────────────────────────  Comments Drawer  ─────────────────────────── */

function CommentsDrawer({ post, onClose, currentUser, currentProfile, onCountChange }) {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const listRef = useRef(null);
    const channelRef = useRef(null);

    const loadComments = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("daily_post_comments")
                .select("id, content, created_at, user_id")
                .eq("post_id", post.id)
                .order("created_at", { ascending: true });

            if (error) throw error;

            const userIds = [...new Set((data || []).map((c) => c.user_id).filter(Boolean))];
            let profileMap = new Map();
            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("user_id, username, name, avatar_url")
                    .in("user_id", userIds);
                profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
            }

            setComments(
                (data || []).map((c) => ({
                    ...c,
                    profile: profileMap.get(c.user_id) || {
                        username: "Unknown",
                        name: "Unknown",
                        avatar_url: null,
                    },
                }))
            );
        } catch (err) {
            console.error("Load comments failed:", err);
            toast.error("Couldn't load comments");
        } finally {
            setLoading(false);
        }
    }, [post.id]);

    useEffect(() => {
        loadComments();
    }, [loadComments]);

    // Realtime new comments on this post
    useEffect(() => {
        if (!post.id) return;
        const ch = supabase
            .channel(`comments:${post.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "daily_post_comments",
                    filter: `post_id=eq.${post.id}`,
                },
                () => {
                    loadComments();
                }
            )
            .subscribe();
        channelRef.current = ch;
        return () => {
            supabase.removeChannel(ch);
        };
    }, [post.id, loadComments]);

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [comments.length]);

    const handleSend = async () => {
        const text = draft.trim();
        if (!text || !currentUser?.id || sending) return;

        setSending(true);
        const optimistic = {
            id: `temp-${Date.now()}`,
            content: text,
            created_at: new Date().toISOString(),
            user_id: currentUser.id,
            profile: {
                username: currentProfile?.username || "You",
                name: currentProfile?.name || "You",
                avatar_url: currentProfile?.avatar_url || null,
            },
            __pending: true,
        };
        setComments((prev) => [...prev, optimistic]);
        setDraft("");

        try {
            const { data, error } = await supabase
                .from("daily_post_comments")
                .insert({
                    post_id: post.id,
                    user_id: currentUser.id,
                    content: text,
                })
                .select()
                .single();

            if (error) throw error;

            setComments((prev) =>
                prev.map((c) =>
                    c.id === optimistic.id
                        ? { ...optimistic, id: data.id, created_at: data.created_at, __pending: false }
                        : c
                )
            );
            onCountChange?.(post.id, +1);
        } catch (err) {
            console.error("Add comment failed:", err);
            toast.error("Failed to post comment");
            setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
            setDraft(text);
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (commentId) => {
        if (!confirm("Delete this comment?")) return;
        const prev = comments;
        setComments((c) => c.filter((x) => x.id !== commentId));
        try {
            const { error } = await supabase
                .from("daily_post_comments")
                .delete()
                .eq("id", commentId);
            if (error) throw error;
            onCountChange?.(post.id, -1);
        } catch (err) {
            console.error("Delete comment failed:", err);
            toast.error("Couldn't delete comment");
            setComments(prev);
        }
    };

    return (
        <CenteredModal
            open={true}
            onClose={onClose}
            maxWidthClass="max-w-lg"
        >
            <div className="flex flex-col max-h-[75vh] rounded-2xl overflow-hidden bg-white dark:bg-[#161b22]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/10 shrink-0">
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-blue-500" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Comments ({comments.length})
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        aria-label="Close comments"
                    >
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                {/* List */}
                <div
                    ref={listRef}
                    className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]"
                >
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="h-12 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse"
                                />
                            ))}
                        </div>
                    ) : comments.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-8">
                            No comments yet. Be the first to say something.
                        </p>
                    ) : (
                        comments.map((c) => (
                            <div key={c.id} className="flex gap-2.5 group">
                                <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                                    {c.profile?.avatar_url ? (
                                        <img
                                            src={c.profile.avatar_url}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-500">
                                            {c.profile?.username?.charAt(0)?.toUpperCase() || "?"}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[12px] font-bold text-slate-900 dark:text-white truncate">
                                            {c.profile?.name || "Unknown"}
                                        </span>
                                        <span className="text-[10px] text-slate-400 shrink-0">
                                            {formatDistanceToNow(new Date(c.created_at), {
                                                addSuffix: true,
                                            })}
                                        </span>
                                        {c.__pending && (
                                            <span className="text-[9px] text-slate-400">…</span>
                                        )}
                                    </div>
                                    <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-snug break-words">
                                        {c.content}
                                    </p>
                                </div>
                                {currentUser?.id === c.user_id && !c.__pending && (
                                    <button
                                        onClick={() => handleDelete(c.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-red-500"
                                        aria-label="Delete comment"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Composer */}
                <div className="border-t border-slate-100 dark:border-white/10 p-3 flex items-center gap-2 shrink-0">
                    <input
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Write a comment…"
                        maxLength={2000}
                        className="flex-1 px-3 py-2 rounded-full bg-slate-100 dark:bg-white/5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!draft.trim() || sending}
                        className="h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center transition-colors"
                        aria-label="Send comment"
                    >
                        {sending ? (
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : (
                            <Send className="w-4 h-4 text-white" />
                        )}
                    </button>
                </div>
            </div>
        </CenteredModal>
    );
}

/* ───────────────────────────  Main Component  ─────────────────────────── */

export default function DailyStatus() {
    const user = useUser();
    const [isOpen, setIsOpen] = useState(false);
    const [dailyContent, setDailyContent] = useState("");
    const [dailyDuration, setDailyDuration] = useState("24h");
    const [dailyImage, setDailyImage] = useState(null);
    const [dailyPosts, setDailyPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [openProfileId, setOpenProfileId] = useState(null);
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [showCropModal, setShowCropModal] = useState(false);
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [profileData, setProfileData] = useState(null);
    const [myAvatarUrl, setMyAvatarUrl] = useState(null);
    const [commentsForPost, setCommentsForPost] = useState(null);
    const [newPostsBanner, setNewPostsBanner] = useState(0);
    const [editingDurationPostId, setEditingDurationPostId] = useState(null);
    const [savingDuration, setSavingDuration] = useState(false);
    const isFetchingRef = useRef(false);
    const viewedRef = useRef(new Set());       // ← session-level dedupe for views
    const pendingLikesRef = useRef(new Set());
    const observerRef = useRef(null);
    const latestCreatedAtRef = useRef(null);
    const realtimeRef = useRef(null);
    const hasLoadedOnceRef = useRef(false);

    // ── Fetch current user's profile ──
    useEffect(() => {
        if (user?.id) {
            supabase
                .from("profiles")
                .select("username, name, avatar_url, institution, county")
                .eq("user_id", user.id)
                .single()
                .then(({ data }) => {
                    if (data) {
                        setProfileData(data);
                        setMyAvatarUrl(data.avatar_url);
                    }
                });
        }
    }, [user]);

    // ── Load algorithmically ranked feed ──
    const loadRankedFeed = useCallback(async () => {
        if (!user?.id) return;
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        try {
            const { data, error } = await supabase.rpc("get_daily_feed", {
                p_limit: 20,
            });
            if (error) throw error;

            const list = (data || []).map(normalizePost);
            setDailyPosts(list);

            const newest = list.reduce(
                (acc, p) => (!acc || p.created_at > acc ? p.created_at : acc),
                null
            );
            if (newest) latestCreatedAtRef.current = newest;

            hasLoadedOnceRef.current = true;
            setNewPostsBanner(0);
        } catch (err) {
            console.error("Ranked feed load failed:", err);
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    }, [user?.id]);

    // ── Pull only genuinely new posts ──
    const pullNewPosts = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase.rpc("get_latest_daily_posts", {
                p_since: latestCreatedAtRef.current,
                p_limit: 20,
            });
            if (error) throw error;
            const incoming = (data || []).map(normalizePost);
            if (incoming.length === 0) return;

            setDailyPosts((prev) => {
                const existingIds = new Set(prev.map((p) => p.id));
                const fresh = incoming.filter((p) => !existingIds.has(p.id));
                if (fresh.length === 0) return prev;
                setNewPostsBanner((n) => n + fresh.length);
                return [...fresh, ...prev];
            });

            const newest = incoming.reduce(
                (acc, p) => (!acc || p.created_at > acc ? p.created_at : acc),
                latestCreatedAtRef.current
            );
            latestCreatedAtRef.current = newest;
        } catch (err) {
            console.error("Pull new posts failed:", err);
        }
    }, [user?.id]);

    const handleManualRefresh = useCallback(async () => {
        setRefreshing(true);
        setNewPostsBanner(0);
        await loadRankedFeed();
        setRefreshing(false);
        toast.success("Feed refreshed");
    }, [loadRankedFeed]);

    // ── Initial load ──
    useEffect(() => {
        if (user?.id) loadRankedFeed();
    }, [user?.id, loadRankedFeed]);

    // ── Refresh on focus / visibility ──
    useEffect(() => {
        const onFocus = () => {
            if (!user?.id || !hasLoadedOnceRef.current) return;
            if (document.hidden) return;
            if (document.visibilityState === "visible") {
                pullNewPosts();
            }
        };
        const onVis = () => {
            if (!document.hidden && user?.id && hasLoadedOnceRef.current) {
                pullNewPosts();
            }
        };
        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onVis);
        return () => {
            window.removeEventListener("focus", onFocus);
            document.removeEventListener("visibilitychange", onVis);
        };
    }, [user?.id, pullNewPosts]);

    // ── Realtime: new posts + counter updates ──
    useEffect(() => {
        if (!user?.id) return;
        if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);

        const ch = supabase
            .channel("daily-feed-realtime")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "daily_posts" },
                (payload) => {
                    const newRow = payload.new;
                    if (!newRow) return;
                    if (newRow.user_id === user.id) return;
                    setNewPostsBanner((n) => n + 1);
                }
            )
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "daily_posts" },
                (payload) => {
                    const updated = payload.new;
                    if (!updated) return;
                    setDailyPosts((prev) =>
                        prev.map((p) =>
                            p.id === Number(updated.id)
                                ? {
                                    ...p,
                                    // ✅ Use typeof guards so 0 values don't fall through to stale
                                    like_count:
                                        typeof updated.like_count === "number"
                                            ? updated.like_count
                                            : p.like_count,
                                    comment_count:
                                        typeof updated.comment_count === "number"
                                            ? updated.comment_count
                                            : p.comment_count,
                                    view_count:
                                        typeof updated.view_count === "number"
                                            ? updated.view_count
                                            : p.view_count,
                                }
                                : p
                        )
                    );
                }
            )
            .on(
                "postgres_changes",
                { event: "DELETE", schema: "public", table: "daily_posts" },
                (payload) => {
                    const oldId = Number(payload.old?.id);
                    if (!oldId) return;
                    setDailyPosts((prev) => prev.filter((p) => p.id !== oldId));
                }
            )
            .subscribe();

        realtimeRef.current = ch;
        return () => {
            supabase.removeChannel(ch);
            realtimeRef.current = null;
        };
    }, [user?.id]);

    // ── IntersectionObserver: record views once per session, NO optimistic bump ──
    useEffect(() => {
        if (!user?.id) return;
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const id = entry.target.getAttribute("data-post-id");
                    if (!id) return;
                    const numericId = Number(id);
                    if (!numericId) return;
                    if (viewedRef.current.has(numericId)) return;

                    // ✅ Mark as sent BEFORE RPC so re-entry can't double-fire
                    viewedRef.current.add(numericId);

                    // ✅ NO local +1 — DB is the single source of truth.
                    // The trigger on daily_post_views will UPDATE daily_posts.view_count,
                    // and the realtime UPDATE handler will deliver the new count.
                    // If the insert was a duplicate (unique index), no trigger fires
                    // and no realtime event arrives — UI stays correct.
                    supabase
                        .rpc("record_daily_post_view", { p_post_id: numericId })
                        .then(({ error }) => {
                            if (error) {
                                // Rollback marker so a retry can happen on next scroll
                                viewedRef.current.delete(numericId);
                                console.warn("View record failed:", error.message);
                            }
                        });
                });
            },
            { threshold: 0.5 }
        );

        return () => observerRef.current?.disconnect();
    }, [user?.id]);

    const setPostRef = useCallback((el) => {
        if (!el) return;
        if (!observerRef.current) return;
        observerRef.current.observe(el);
    }, []);

    // ── Like toggle ──
    const handleToggleLike = async (postId, currentlyLiked) => {
        if (!user?.id) {
            toast.error("Sign in to like posts");
            return;
        }
        const idNum = Number(postId);
        if (pendingLikesRef.current.has(idNum)) return;
        pendingLikesRef.current.add(idNum);

        const delta = currentlyLiked ? -1 : 1;
        setDailyPosts((prev) =>
            prev.map((p) =>
                p.id === idNum
                    ? {
                        ...p,
                        liked_by_me: !currentlyLiked,
                        like_count: Math.max((p.like_count || 0) + delta, 0),
                    }
                    : p
            )
        );

        try {
            const { data: nowLiked, error } = await supabase.rpc("toggle_daily_post_like", {
                p_post_id: idNum,
            });
            if (error) throw error;

            if (Boolean(nowLiked) !== !currentlyLiked) {
                setDailyPosts((prev) =>
                    prev.map((p) =>
                        p.id === idNum ? { ...p, liked_by_me: Boolean(nowLiked) } : p
                    )
                );
            }
        } catch (err) {
            console.error("Like toggle failed:", err);
            setDailyPosts((prev) =>
                prev.map((p) =>
                    p.id === idNum
                        ? {
                            ...p,
                            liked_by_me: currentlyLiked,
                            like_count: Math.max((p.like_count || 0) - delta, 0),
                        }
                        : p
                )
            );
            toast.error("Couldn't update like");
        } finally {
            pendingLikesRef.current.delete(idNum);
        }
    };

    // ── Create post ──
    const handlePost = async () => {
        if (!dailyContent.trim() && !dailyImage) {
            toast.error("Cannot post empty content", {
                description: "Please write something or attach an image before posting.",
            });
            return;
        }

        setUploading(true);
        try {
            let image_url = null;
            if (dailyImage) {
                image_url = await uploadToCloudinary(dailyImage);
            }

            const isForever = dailyDuration === "forever";

            const { data: post, error: insertError } = await supabase
                .from("daily_posts")
                .insert({
                    user_id: user.id,
                    content: dailyContent,
                    image_url,
                    duration: dailyDuration,
                    is_forever: isForever,
                })
                .select()
                .single();

            if (insertError) throw insertError;

            const postWithProfile = {
                ...post,
                like_count: 0,
                comment_count: 0,
                view_count: 0,
                liked_by_me: false,
                is_forever: isForever,
                expires_at: isForever ? null : post.expires_at,
                profiles: {
                    username: profileData?.username || "You",
                    name: profileData?.name || "You",
                    avatar_url: profileData?.avatar_url || null,
                    institution: profileData?.institution || "N/A",
                    county: profileData?.county || "N/A",
                },
            };

            setDailyPosts((prev) => [postWithProfile, ...prev]);
            latestCreatedAtRef.current = post.created_at || new Date().toISOString();
            setDailyContent("");
            setDailyImage(null);
            setIsOpen(false);
            toast.success("Posted successfully!", {
                description: "Your status has been shared.",
            });
        } catch (err) {
            console.error("Error posting:", err);
            toast.error("Upload failed", {
                description: "Could not save your post. Please check your connection.",
            });
        } finally {
            setUploading(false);
        }
    };

    // ── Delete post ──
    const handleDeletePost = async (postId, postUserId) => {
        if (user?.id !== postUserId) {
            toast.error("Permission denied", {
                description: "You can only delete your own posts",
            });
            return;
        }
        if (!confirm("Are you sure you want to delete this post?")) return;

        const prev = dailyPosts;
        setDailyPosts((p) => p.filter((x) => x.id !== postId));

        const { error } = await supabase.from("daily_posts").delete().eq("id", postId);
        if (error) {
            toast.error("Error", { description: "Could not delete the post." });
            setDailyPosts(prev);
            return;
        }
        toast.success("Deleted", { description: "Your post was successfully deleted." });
    };

    // ── Image crop ──
    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setImageToCrop(reader.result);
            setShowCropModal(true);
        };
        reader.readAsDataURL(file);
    };

    const handleCropComplete = async () => {
        if (imageToCrop && croppedAreaPixels) {
            try {
                const croppedFile = await getCroppedImg(imageToCrop, croppedAreaPixels);
                setDailyImage(croppedFile);
                setShowCropModal(false);
                setImageToCrop(null);
                toast.success("Image cropped successfully!");
            } catch (e) {
                console.error("Crop error:", e);
                toast.error("Failed to crop image");
            }
        }
    };

    const handleCommentCountChange = useCallback((postId, delta) => {
        setDailyPosts((prev) =>
            prev.map((p) =>
                p.id === postId
                    ? { ...p, comment_count: Math.max(0, (p.comment_count || 0) + delta) }
                    : p
            )
        );
    }, []);
    // ── Update duration of my own post ──
    const handleDurationChange = useCallback(async (post, newDuration) => {
        if (!user?.id) return;
        if (post.user_id !== user.id) return;
        if (newDuration === post.duration) {
            setEditingDurationPostId(null);
            return;
        }

        setSavingDuration(true);
        const prevPosts = dailyPosts;
        const isForever = newDuration === "forever";

        // Optimistic update
        setDailyPosts((prev) =>
            prev.map((p) => {
                if (p.id !== post.id) return p;

                // Recompute expires_at locally (mirrors what the view does server-side)
                let newExpiresAt = null;
                if (!isForever) {
                    const base = new Date(p.created_at).getTime();
                    const ms = {
                        "24h": 24 * 60 * 60 * 1000,
                        "1w": 7 * 24 * 60 * 60 * 1000,
                        "1m": 30 * 24 * 60 * 60 * 1000,
                        "3m": 90 * 24 * 60 * 60 * 1000,
                    }[newDuration] || 24 * 60 * 60 * 1000;
                    newExpiresAt = new Date(base + ms).toISOString();
                }

                return {
                    ...p,
                    duration: newDuration,
                    is_forever: isForever,
                    expires_at: newExpiresAt,
                };
            })
        );

        try {
            const { error } = await supabase
                .from("daily_posts")
                .update({
                    duration: newDuration,
                    is_forever: isForever,
                })
                .eq("id", post.id)
                .eq("user_id", user.id);   // ← safety: only your own

            if (error) throw error;

            toast.success("Duration updated", {
                description: isForever
                    ? "This post will stay forever."
                    : `Post will now expire in ${prettyDuration(newDuration)}.`,
            });
            setEditingDurationPostId(null);
        } catch (err) {
            console.error("Duration update failed:", err);
            toast.error("Couldn't update duration");
            setDailyPosts(prevPosts);   // rollback
        } finally {
            setSavingDuration(false);
        }
    }, [user?.id, dailyPosts]);
    /* ───────────────────────────  Render  ─────────────────────────── */
    return (
        <>
            <Card className="w-full border-0 bg-white dark:bg-muted/30 sm:bg-transparent sm:dark:bg-transparent shadow-sm sm:shadow-none rounded-xl sm:rounded-none overflow-hidden sm:overflow-visible">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <CardTitle className="text-xl tracking-tight dark:text-white">
                                Community Pulse
                            </CardTitle>
                        </div>
                        <button
                            onClick={handleManualRefresh}
                            disabled={refreshing}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 transition"
                        >
                            <RefreshCw
                                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
                            />
                            Refresh
                        </button>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="space-y-4">
                        {/* ── Composer ── */}
                        <div className="px-4 sm:px-0 sm:max-w-[680px] sm:mx-auto">
                            <div
                                onClick={() => setIsOpen(!isOpen)}
                                className={`flex items-center justify-between p-4 cursor-pointer rounded-2xl border transition-all ${isOpen
                                    ? "bg-slate-50 dark:bg-muted/30 border-0"
                                    : "bg-white dark:bg-slate-800 border-0 hover:border-blue-500/30"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                        {myAvatarUrl ? (
                                            <img
                                                src={myAvatarUrl}
                                                alt="avatar"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <User className="w-4 h-4 text-slate-500" />
                                        )}
                                    </div>
                                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                                        {isOpen ? "Drafting your status..." : "What's happening today?"}
                                    </span>
                                </div>
                                {isOpen ? (
                                    <ChevronUp className="w-4 h-4 text-blue-500" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                )}
                            </div>

                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-muted/30 border border-slate-200 dark:border-white/10 space-y-4">
                                    <textarea
                                        className="w-full min-h-[100px] p-0 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none text-sm resize-none"
                                        placeholder="Educate, inspire, or grow together..."
                                        value={dailyContent}
                                        onChange={(e) => setDailyContent(e.target.value)}
                                    />

                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10">
                                                <Clock className="w-3.5 h-3.5 text-blue-500" />
                                                <Select
                                                    value={dailyDuration}
                                                    onValueChange={setDailyDuration}
                                                >
                                                    <SelectTrigger className="h-8 w-[130px] border-0 bg-transparent text-xs font-bold shadow-none">
                                                        <SelectValue placeholder="Duration" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="24h">24 Hours</SelectItem>
                                                        <SelectItem value="1w">1 Week</SelectItem>
                                                        <SelectItem value="1m">1 Month</SelectItem>
                                                        <SelectItem value="3m">3 Months</SelectItem>
                                                        <SelectItem value="forever">
                                                            <span className="inline-flex items-center gap-1">
                                                                <InfinityIcon className="w-3 h-3" /> Forever
                                                            </span>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <input
                                                id="dailyImageUpload"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                            <label
                                                htmlFor="dailyImageUpload"
                                                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                <Camera className="w-3.5 h-3.5 text-emerald-500" />
                                                <span className="text-xs font-bold dark:text-white">Photo</span>
                                            </label>
                                        </div>

                                        <Button
                                            onClick={handlePost}
                                            disabled={uploading}
                                            className="rounded-xl bg-blue-600 hover:bg-blue-700 px-6 font-bold text-xs h-9"
                                        >
                                            {uploading ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Send className="w-3.5 h-3.5 mr-2" /> Post
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {dailyImage && (
                                        <div className="relative mt-2 w-24 h-24 group">
                                            <img
                                                src={URL.createObjectURL(dailyImage)}
                                                className="w-full h-full object-cover rounded-xl border border-white/20 shadow-md"
                                                alt="Preview"
                                            />
                                            <button
                                                onClick={() => setDailyImage(null)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>

                        {/* ── New posts banner ── */}
                        <AnimatePresence>
                            {newPostsBanner > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="px-4 sm:px-0 sm:max-w-[680px] sm:mx-auto"
                                >
                                    <button
                                        onClick={handleManualRefresh}
                                        className="w-full py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        {newPostsBanner} new post{newPostsBanner === 1 ? "" : "s"} —
                                        tap to refresh
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── Feed ── */}
                        <div className="space-y-4">
                            {loading ? (
                                // ✅ Sized skeletons matching real post cards, 4 total
                                <div className="space-y-4">
                                    <PostSkeleton hasImage />
                                    <PostSkeleton hasImage />
                                    <PostSkeleton hasImage={false} />
                                    <PostSkeleton hasImage />
                                </div>
                            ) : dailyPosts.length > 0 ? (
                                dailyPosts.map((post) => {
                                    const isForever =
                                        post.is_forever || post.duration === "forever";
                                    return (
                                        <motion.div
                                            key={post.id}
                                            ref={setPostRef}
                                            data-post-id={post.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="group relative bg-white dark:bg-muted/30 sm:bg-transparent sm:dark:bg-transparent border-b border-slate-100 dark:border-white/5 sm:border-0 last:border-0 overflow-hidden sm:overflow-visible"
                                        >
                                            <div className="flex flex-col">
                                                {/* Header */}
                                                <div className="flex items-center justify-between p-4 pb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <button
                                                                onClick={() =>
                                                                    setOpenProfileId(
                                                                        openProfileId === post.id
                                                                            ? null
                                                                            : post.id
                                                                    )
                                                                }
                                                                className="block h-10 w-10 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm"
                                                            >
                                                                {post.profiles?.avatar_url ? (
                                                                    <img
                                                                        src={post.profiles.avatar_url}
                                                                        className="h-full w-full object-cover"
                                                                        alt="avatar"
                                                                    />
                                                                ) : (
                                                                    <div className="h-full w-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 text-xs">
                                                                        {post.profiles?.username
                                                                            ?.charAt(0)
                                                                            .toUpperCase()}
                                                                    </div>
                                                                )}
                                                            </button>

                                                            <AnimatePresence>
                                                                {openProfileId === post.id && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: 10 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: 10 }}
                                                                        className="absolute left-0 top-full mt-2 z-50 w-56 p-4 rounded-2xl bg-white/95 dark:bg-muted/70 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl"
                                                                    >
                                                                        <div className="space-y-2">
                                                                            <p className="text-sm dark:text-white truncate">
                                                                                {post.profiles?.name}
                                                                            </p>
                                                                            <p className="text-[10px] font-bold text-blue-500 uppercase">
                                                                                @{post.profiles?.username}
                                                                            </p>
                                                                            <div className="pt-2 space-y-1.5">
                                                                                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                                                                                    <School className="w-3 h-3" />{" "}
                                                                                    {post.profiles?.institution ||
                                                                                        "Medical Student"}
                                                                                </div>
                                                                                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                                                                                    <MapPin className="w-3 h-3" />{" "}
                                                                                    {post.profiles?.county || "Kenya"}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>

                                                        <div className="flex flex-col">
                                                            <span className="text-sm dark:text-white leading-tight">
                                                                {post.profiles?.name}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                                {formatDistanceToNow(
                                                                    new Date(post.created_at),
                                                                    { addSuffix: true }
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {user?.id === post.user_id && (
                                                        <button
                                                            onClick={() =>
                                                                handleDeletePost(post.id, post.user_id)
                                                            }
                                                            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Body */}
                                                {post.content && (
                                                    <div className="px-4 pb-3">
                                                        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                                            {post.content}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Image */}
                                                {post.image_url && (
                                                    <div className="relative overflow-hidden bg-transparent flex items-center justify-center py-2 sm:py-3">
                                                        <img
                                                            src={post.image_url}
                                                            className="w-full h-auto max-h-[70vh] object-contain cursor-zoom-in rounded-2xl sm:max-h-[60vh] sm:max-w-[600px] sm:rounded-lg"
                                                            alt="status"
                                                            onClick={() =>
                                                                setFullscreenImage(post.image_url)
                                                            }
                                                        />
                                                    </div>
                                                )}

                                                {/* Action bar */}
                                                <div className="px-4 py-2 flex items-center gap-1">
                                                    <button
                                                        onClick={() =>
                                                            handleToggleLike(post.id, post.liked_by_me)
                                                        }
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all active:scale-95 ${post.liked_by_me
                                                            ? "text-red-500 bg-red-500/10"
                                                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                                                            }`}
                                                        aria-label={post.liked_by_me ? "Unlike" : "Like"}
                                                    >
                                                        <Heart
                                                            className={`w-4 h-4 transition-transform ${post.liked_by_me
                                                                ? "fill-current scale-110"
                                                                : ""
                                                                }`}
                                                        />
                                                        <span className="text-xs font-bold tabular-nums">
                                                            {formatCount(post.like_count)}
                                                        </span>
                                                    </button>

                                                    <button
                                                        onClick={() => setCommentsForPost(post)}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all active:scale-95"
                                                        aria-label="Comments"
                                                    >
                                                        <MessageCircle className="w-4 h-4" />
                                                        <span className="text-xs font-bold tabular-nums">
                                                            {formatCount(post.comment_count)}
                                                        </span>
                                                    </button>

                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-slate-500 dark:text-slate-400">
                                                        <Eye className="w-4 h-4" />
                                                        <span className="text-xs font-bold tabular-nums">
                                                            {formatCount(post.view_count)}
                                                        </span>
                                                    </div>

                                                    <div className="flex-1" />

                                                    {user?.id === post.user_id ? (
                                                        // Your own post — tappable to change duration
                                                        <div className="relative">
                                                            <button
                                                                onClick={() =>
                                                                    setEditingDurationPostId(
                                                                        editingDurationPostId === post.id ? null : post.id
                                                                    )
                                                                }
                                                                className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors"
                                                                aria-label="Change post duration"
                                                            >
                                                                {isForever ? (
                                                                    <>
                                                                        <InfinityIcon className="w-3 h-3 text-emerald-500" />
                                                                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                                                            Forever
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Clock className="w-3 h-3 text-slate-400" />
                                                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                                                            Expires{" "}
                                                                            {post.expires_at
                                                                                ? new Date(post.expires_at).toLocaleDateString()
                                                                                : "—"}
                                                                        </span>
                                                                    </>
                                                                )}
                                                                <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                                                            </button>

                                                            <AnimatePresence>
                                                                {editingDurationPostId === post.id && (
                                                                    <>
                                                                        {/* click-catcher */}
                                                                        <div
                                                                            className="fixed inset-0 z-40"
                                                                            onClick={() => setEditingDurationPostId(null)}
                                                                        />
                                                                        <motion.div
                                                                            initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                            exit={{ opacity: 0, y: -6, scale: 0.96 }}
                                                                            transition={{ duration: 0.15 }}
                                                                            className="absolute right-0 bottom-full mb-1.5 z-50 w-44 rounded-xl bg-white dark:bg-[#1f2630] shadow-xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden"
                                                                        >
                                                                            <div className="px-3 py-2 border-b border-slate-100 dark:border-white/10">
                                                                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                                                    Change duration
                                                                                </p>
                                                                            </div>
                                                                            {[
                                                                                { v: "24h", label: "24 Hours" },
                                                                                { v: "1w", label: "1 Week" },
                                                                                { v: "1m", label: "1 Month" },
                                                                                { v: "3m", label: "3 Months" },
                                                                                { v: "forever", label: "Forever" },
                                                                            ].map((opt) => {
                                                                                const isActive = post.duration === opt.v;
                                                                                return (
                                                                                    <button
                                                                                        key={opt.v}
                                                                                        onClick={() =>
                                                                                            !savingDuration && handleDurationChange(post, opt.v)
                                                                                        }
                                                                                        disabled={savingDuration}
                                                                                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs font-semibold transition-colors ${isActive
                                                                                            ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
                                                                                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                                                                                            } disabled:opacity-50`}
                                                                                    >
                                                                                        <span className="flex items-center gap-1.5">
                                                                                            {opt.v === "forever" ? (
                                                                                                <InfinityIcon className="w-3 h-3" />
                                                                                            ) : (
                                                                                                <Clock className="w-3 h-3" />
                                                                                            )}
                                                                                            {opt.label}
                                                                                        </span>
                                                                                        {isActive && <span className="text-[9px]">Current</span>}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </motion.div>
                                                                    </>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    ) : (
                                                        // Someone else's post — read-only chip (unchanged)
                                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-full">
                                                            {isForever ? (
                                                                <>
                                                                    <InfinityIcon className="w-3 h-3 text-emerald-500" />
                                                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                                                        Forever
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                                                        Expires{" "}
                                                                        {post.expires_at
                                                                            ? new Date(post.expires_at).toLocaleDateString()
                                                                            : "—"}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-10">
                                    <p className="text-sm font-medium text-slate-400">
                                        The pulse is quiet. Start the conversation.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Comments Drawer */}
            <AnimatePresence>
                {commentsForPost && (
                    <CommentsDrawer
                        post={commentsForPost}
                        onClose={() => setCommentsForPost(null)}
                        currentUser={user}
                        currentProfile={profileData}
                        onCountChange={handleCommentCountChange}
                    />
                )}
            </AnimatePresence>

            {/* Crop Modal */}
            <AnimatePresence>
                {showCropModal && imageToCrop && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-0"
                    >
                        <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-muted/30 p-4 shadow-2xl">
                            <div className="relative h-80 w-full rounded-2xl overflow-hidden bg-black">
                                <Cropper
                                    image={imageToCrop}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={(_, croppedPixels) =>
                                        setCroppedAreaPixels(croppedPixels)
                                    }
                                />
                            </div>
                            <div className="mt-4 space-y-4">
                                <input
                                    type="range"
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    value={zoom}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full"
                                />
                                <div className="flex justify-end gap-3">
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setShowCropModal(false);
                                            setImageToCrop(null);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleCropComplete}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        Done Cropping
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Fullscreen Image */}
            <AnimatePresence>
                {fullscreenImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/95 z-[999999] flex items-center justify-center p-0"
                        onClick={() => setFullscreenImage(null)}
                    >
                        <img
                            src={fullscreenImage}
                            className="max-w-full max-h-full object-contain rounded-none shadow-2xl"
                            alt="fullscreen"
                        />
                        <button className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-8 h-8" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}