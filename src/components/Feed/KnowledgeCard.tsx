"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
    Heart, MessageCircle, Share2, Trash2,
    MoreHorizontal, Quote, X, Send, Edit2,
    Sparkles, BookOpen, Brain, Lightbulb, Target, Star
} from "lucide-react";

// Enhanced cache with longer TTLs
const knowledgeDataCache = new Map();
const pendingKnowledgeRequests = new Map();
const commentsCache = new Map();

// Color palette for different cards
const cardColors = [
    { bg: "from-purple-50 to-pink-50", border: "border-purple-200", icon: Sparkles, accent: "text-purple-600" },
    { bg: "from-blue-50 to-cyan-50", border: "border-blue-200", icon: Brain, accent: "text-blue-600" },
    { bg: "from-emerald-50 to-teal-50", border: "border-emerald-200", icon: Lightbulb, accent: "text-emerald-600" },
    { bg: "from-amber-50 to-orange-50", border: "border-amber-200", icon: Target, accent: "text-amber-600" },
    { bg: "from-rose-50 to-red-50", border: "border-rose-200", icon: Star, accent: "text-rose-600" },
    { bg: "from-indigo-50 to-violet-50", border: "border-indigo-200", icon: BookOpen, accent: "text-indigo-600" },
];

// Classic bullet symbols for different positions
const bulletSymbols = ['◆', '◇', '✦', '►', '▪', '▸'];

async function fetchKnowledgeDataWithDedupe(supabase: any, knowledgeId: string, userId?: string) {
    const cacheKey = `knowledge_${knowledgeId}_${userId || 'anon'}`;

    if (knowledgeDataCache.has(cacheKey)) {
        const { data, timestamp } = knowledgeDataCache.get(cacheKey);
        if (Date.now() - timestamp < 30000) {
            return data;
        }
        knowledgeDataCache.delete(cacheKey);
    }

    if (pendingKnowledgeRequests.has(cacheKey)) {
        return pendingKnowledgeRequests.get(cacheKey);
    }

    const promise = (async () => {
        const [likesResult, userLikeResult, commentsResult] = await Promise.all([
            supabase.from('qfeed_knowledge_likes').select('id', { count: 'exact', head: true }).eq('knowledge_id', knowledgeId),
            userId ? supabase.from('qfeed_knowledge_likes').select('id').eq('knowledge_id', knowledgeId).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null }),
            supabase.from('qfeed_knowledge_comments').select('id', { count: 'exact', head: true }).eq('knowledge_id', knowledgeId)
        ]);

        const result = {
            likesCount: likesResult.count || 0,
            hasLiked: !!userLikeResult?.data,
            commentsCount: commentsResult.count || 0
        };

        knowledgeDataCache.set(cacheKey, { data: result, timestamp: Date.now() });

        setTimeout(() => {
            if (knowledgeDataCache.has(cacheKey)) {
                knowledgeDataCache.delete(cacheKey);
            }
        }, 60000);

        return result;
    })();

    pendingKnowledgeRequests.set(cacheKey, promise);
    const result = await promise;
    pendingKnowledgeRequests.delete(cacheKey);
    return result;
}

async function fetchCommentsWithCache(supabase: any, knowledgeId: string) {
    const cacheKey = `knowledge_comments_${knowledgeId}`;

    if (commentsCache.has(cacheKey)) {
        const { data, timestamp } = commentsCache.get(cacheKey);
        if (Date.now() - timestamp < 120000) {
            return data;
        }
        commentsCache.delete(cacheKey);
    }

    const { data } = await supabase
        .from('qfeed_knowledge_comments')
        .select('*, profiles(name, avatar_url)')
        .eq('knowledge_id', knowledgeId)
        .order('created_at', { ascending: true })
        .limit(100);

    const comments = data || [];

    commentsCache.set(cacheKey, { data: comments, timestamp: Date.now() });

    setTimeout(() => {
        if (commentsCache.has(cacheKey)) {
            commentsCache.delete(cacheKey);
        }
    }, 300000);

    return comments;
}

// Helper function to format content into points
const formatContentToPoints = (content: string) => {
    const points = content.split(/[.;\n]|(?:\d+\.\s*)/)
        .map(point => point.trim())
        .filter(point => point.length > 10);

    if (points.length > 1) {
        return points.map(point => point.replace(/^[•\-]\s*/, ''));
    }

    const subPoints = content.split(',').map(p => p.trim()).filter(p => p.length > 5);
    if (subPoints.length > 1) {
        return subPoints;
    }

    return [content];
};

export default function KnowledgeCard({ item, user, supabase, index = 0 }: { item: any, user: any, supabase: any, index?: number }) {
    if (!item) return null;

    const colorScheme = cardColors[index % cardColors.length];
    const IconComponent = colorScheme.icon;

    const [likes, setLikes] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [commentCount, setCommentCount] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCommentsLoaded, setIsCommentsLoaded] = useState(false);

    const contentPoints = formatContentToPoints(item.content);
    const isPointForm = contentPoints.length > 1;

    const isMounted = useRef(true);
    const refreshTimeout = useRef<NodeJS.Timeout>();
    const lastRefreshTime = useRef<number>(0);

    const fetchSocialData = useCallback(async () => {
        if (!item?.id) return;
        const data = await fetchKnowledgeDataWithDedupe(supabase, item.id, user?.id);
        if (isMounted.current) {
            setLikes(data.likesCount);
            setHasLiked(data.hasLiked);
            setCommentCount(data.commentsCount);
        }
    }, [item?.id, user?.id, supabase]);

    const fetchComments = useCallback(async () => {
        if (!item?.id || isCommentsLoaded) return;
        const commentsData = await fetchCommentsWithCache(supabase, item.id);
        if (isMounted.current) {
            setComments(commentsData);
            setIsCommentsLoaded(true);
        }
    }, [item?.id, supabase, isCommentsLoaded]);

    useEffect(() => {
        isMounted.current = true;
        fetchSocialData();
        return () => {
            isMounted.current = false;
            if (refreshTimeout.current) {
                clearTimeout(refreshTimeout.current);
            }
        };
    }, [fetchSocialData]);

    useEffect(() => {
        if (!item?.id) return;
        let isActive = true;
        let focusTimer: NodeJS.Timeout;
        const handleFocus = () => {
            if (!isActive) return;
            if (focusTimer) clearTimeout(focusTimer);
            focusTimer = setTimeout(async () => {
                const now = Date.now();
                if (now - lastRefreshTime.current < 60000) return;
                lastRefreshTime.current = now;
                if (isActive) {
                    await fetchSocialData();
                }
            }, 500);
        };
        window.addEventListener('focus', handleFocus);
        return () => {
            isActive = false;
            window.removeEventListener('focus', handleFocus);
            if (focusTimer) clearTimeout(focusTimer);
        };
    }, [item?.id, fetchSocialData]);

    useEffect(() => {
        if (isModalOpen && !isCommentsLoaded) {
            fetchComments();
        }
    }, [isModalOpen, fetchComments, isCommentsLoaded]);

    const handleLike = async () => {
        if (!user || !item?.id) return;
        const prevLiked = hasLiked;
        setHasLiked(!prevLiked);
        setLikes(prev => prevLiked ? prev - 1 : prev + 1);
        try {
            if (prevLiked) {
                await supabase.from('qfeed_knowledge_likes').delete().eq('knowledge_id', item.id).eq('user_id', user.id);
            } else {
                await supabase.from('qfeed_knowledge_likes').insert({ knowledge_id: item.id, user_id: user.id });
            }
            const cacheKey = `knowledge_${item.id}_${user.id}`;
            knowledgeDataCache.delete(cacheKey);
        } catch (error) {
            setHasLiked(prevLiked);
            setLikes(prev => prevLiked ? prev + 1 : prev - 1);
            console.error("Like failed:", error);
        }
    };

    const handlePostComment = async () => {
        if (!newComment.trim() || !user || isSubmitting) return;
        setIsSubmitting(true);
        const { error } = await supabase.from('qfeed_knowledge_comments').insert({
            knowledge_id: item.id,
            user_id: user.id,
            content: newComment.trim()
        });
        if (!error) {
            setNewComment("");
            const cacheKey = `knowledge_comments_${item.id}`;
            commentsCache.delete(cacheKey);
            setIsCommentsLoaded(false);
            await fetchComments();
            await fetchSocialData();
        }
        setIsSubmitting(false);
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm("Delete this comment?")) return;
        const { error } = await supabase.from('qfeed_knowledge_comments').delete().eq('id', commentId);
        if (!error) {
            const cacheKey = `knowledge_comments_${item.id}`;
            commentsCache.delete(cacheKey);
            setIsCommentsLoaded(false);
            await fetchComments();
            await fetchSocialData();
        }
    };

    const handleEditComment = async (commentId: string, currentContent: string) => {
        const newContent = prompt("Edit your comment:", currentContent);
        if (!newContent || newContent.trim() === currentContent) return;
        const { error } = await supabase
            .from('qfeed_knowledge_comments')
            .update({ content: newContent.trim() })
            .eq('id', commentId);
        if (!error) {
            const cacheKey = `knowledge_comments_${item.id}`;
            commentsCache.delete(cacheKey);
            setIsCommentsLoaded(false);
            await fetchComments();
        }
    };

    const handleWhatsAppShare = () => {
        const text = `💡 Nursing Tip: "${item.content}" \n\nShared via MedareNursing. Join us for more tips!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    };

    const handleDelete = async () => {
        if (!confirm("Delete this post?")) return;
        await supabase.from('qfeed_knowledge').delete().eq('id', item.id);
        knowledgeDataCache.delete(`knowledge_${item.id}_${user?.id}`);
        knowledgeDataCache.delete(`knowledge_${item.id}_anon`);
        commentsCache.delete(`knowledge_comments_${item.id}`);
        window.location.reload();
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="w-full max-w-full mx-auto mb-4"
            >
                <Card className={`
                    bg-gradient-to-br ${colorScheme.bg}
                    border-0 ${colorScheme.border}
                    shadow-lg hover:shadow-xl
                    transition-all duration-300
                    rounded-2xl overflow-hidden
                    backdrop-blur-sm
                    dark:bg-gradient-to-br dark:from-gray-800/30 dark:to-gray-900/30
                    dark:border-gray-700/30
                `}>
                    {/* Instagram Style Header */}
                    <div className="flex items-center justify-between p-4 px-5 bg-white/60 backdrop-blur-sm dark:bg-gray-800/30">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <img
                                    src={item.profiles?.avatar_url || "/UsersAvatar.jpg"}
                                    className="w-10 h-10 rounded-full border-2 border-white shadow-md object-cover dark:border-gray-700"
                                    alt="Profile"
                                    loading="lazy"
                                />
                                <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${colorScheme.accent} bg-white shadow-sm dark:bg-gray-800`}>
                                    <IconComponent size={12} className="text-current" />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold leading-tight text-gray-900 dark:text-gray-100">{item.profiles?.name || "Nurse"}</span>
                                <span className={`text-[10px] ${colorScheme.accent} font-bold uppercase tracking-tighter dark:text-gray-300`}>
                                    ✦ Clinical Wisdom
                                </span>
                            </div>
                        </div>
                        {user?.id === item.added_by && (
                            <button
                                onClick={handleDelete}
                                className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full dark:hover:bg-red-900/20"
                                aria-label="More options"
                            >
                                <MoreHorizontal size={20} />
                            </button>
                        )}
                    </div>

                    {/* Content Area - Quote with Points pushed down */}
                    <div className="px-6 py-8 bg-white/40 backdrop-blur-sm flex flex-col items-start justify-center relative border-y border-white/50 dark:bg-gray-800/20 dark:border-gray-700/30">
                        {/* Quote icon stays in background */}
                        <Quote className={`${colorScheme.accent}/20 absolute top-4 left-6 dark:text-gray-400/20`} size={48} />

                        {/* Content pushed down with pt-12 to avoid quote icon masking */}
                        <div className="w-full z-10 pt-12 space-y-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-1 h-6 rounded-full ${colorScheme.accent}`} />
                                    <span className={`text-sm font-semibold ${colorScheme.accent} dark:text-gray-300`}>
                                        {isPointForm ? 'Key Points' : 'Insight'}
                                    </span>
                                </div>
                                {/* Point Count Badge */}
                                <div className={`px-3 py-1 rounded-full bg-white/70 ${colorScheme.accent} text-xs font-bold shadow-sm dark:bg-gray-700/30 dark:text-gray-300`}>
                                    {contentPoints.length} {contentPoints.length === 1 ? 'Point' : 'Points'}
                                </div>
                            </div>

                            {isPointForm ? (
                                <ul className="space-y-3 w-full">
                                    {contentPoints.map((point, idx) => (
                                        <motion.li
                                            key={idx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="flex items-start gap-3 text-gray-800 dark:text-gray-200"
                                        >
                                            {/* Classic bullet symbols - different for each position */}
                                            <span className={`${colorScheme.accent} font-bold text-xl leading-none mt-0.5 min-w-[1.2rem] text-center dark:text-gray-400`}>
                                                {bulletSymbols[idx % bulletSymbols.length]}
                                            </span>
                                            <span className="text-base font-medium leading-relaxed">{point}</span>
                                        </motion.li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-lg md:text-xl font-medium text-gray-800 dark:text-gray-200 italic leading-relaxed">
                                    "{item.content}"
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Interaction Row (Insta Style) */}
                    <div className="p-4 px-5 bg-white/60 backdrop-blur-sm dark:bg-gray-800/30">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-5">
                                <button
                                    onClick={handleLike}
                                    className={`${hasLiked ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'} hover:scale-110 transition-transform`}
                                    aria-label={hasLiked ? "Unlike" : "Like"}
                                >
                                    <Heart size={26} className={hasLiked ? "fill-current" : ""} />
                                </button>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="text-gray-700 dark:text-gray-300 hover:scale-110 transition-transform"
                                    aria-label="View comments"
                                >
                                    <MessageCircle size={26} />
                                </button>
                                <button
                                    onClick={handleWhatsAppShare}
                                    className="text-gray-700 dark:text-gray-300 hover:scale-110 transition-transform"
                                    aria-label="Share on WhatsApp"
                                >
                                    <Share2 size={24} />
                                </button>
                            </div>
                            <div className={`px-3 py-1 rounded-full bg-white/50 ${colorScheme.accent} text-xs font-bold dark:bg-gray-700/30 dark:text-gray-300`}>
                                #{index + 1}
                            </div>
                        </div>

                        {/* Likes & Comments Count */}
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{likes.toLocaleString()} likes</p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="text-sm text-gray-500 hover:text-gray-700 transition-colors dark:text-gray-400 dark:hover:text-gray-300"
                            >
                                View all {commentCount} comments
                            </button>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* ================= FULL SCREEN COMMENT OVERLAY ================= */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md dark:bg-black/90"
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className={`absolute inset-0 bg-gradient-to-br ${colorScheme.bg} flex flex-col dark:bg-gradient-to-br dark:from-gray-800/30 dark:to-gray-900/30`}
                        >
                            {/* Header - Full width */}
                            <div className={`p-4 border-b border-white/20 flex justify-between items-center bg-white/70 backdrop-blur-sm sticky top-0 z-10 dark:bg-gray-800/30 dark:border-gray-700/30`}>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="p-1 hover:bg-white/50 rounded-full transition-colors dark:hover:bg-gray-700/30"
                                        aria-label="Close"
                                    >
                                        <X size={24} className="text-gray-700 dark:text-gray-300" />
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <IconComponent size={18} className={colorScheme.accent} />
                                        <h3 className="font-bold text-gray-800 dark:text-gray-100">Comments</h3>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full bg-white/70 ${colorScheme.accent} text-xs font-bold shadow-sm dark:bg-gray-700/30 dark:text-gray-300`}>
                                    {comments.length}
                                </div>
                            </div>

                            {/* Comment List - Full height, scrollable */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/30 backdrop-blur-sm custom-scrollbar dark:bg-gray-800/20">
                                {comments.length > 0 ? comments.map((c) => (
                                    <div key={c.id} className="flex gap-3 group bg-white/80 p-3 rounded-xl backdrop-blur-sm shadow-sm dark:bg-gray-800/40 dark:shadow-gray-900/20">
                                        <img
                                            src={c.profiles?.avatar_url || "/UsersAvatar.jpg"}
                                            className="w-9 h-9 rounded-full object-cover mt-1 border-2 border-white shadow-sm dark:border-gray-700"
                                            alt="Avatar"
                                            loading="lazy"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="text-sm">
                                                    <span className="font-bold mr-2 text-gray-800 dark:text-gray-100">{c.profiles?.name || "User"}</span>
                                                    <span className="text-gray-700 dark:text-gray-300 break-words">{c.content}</span>
                                                </div>

                                                {c.user_id === user?.id && (
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEditComment(c.id, c.content)}
                                                            className="text-gray-400 hover:text-blue-500 transition-colors dark:hover:text-blue-400"
                                                            aria-label="Edit comment"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteComment(c.id)}
                                                            className="text-gray-400 hover:text-red-500 transition-colors dark:hover:text-red-400"
                                                            aria-label="Delete comment"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 font-medium dark:text-gray-400">
                                                <span>{new Date(c.created_at).toLocaleDateString()}</span>
                                                <button
                                                    onClick={() => setNewComment(`@${c.profiles?.name || 'User'} `)}
                                                    className="hover:text-gray-700 transition-colors dark:hover:text-gray-200"
                                                >
                                                    Reply
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20 dark:text-gray-500">
                                        <MessageCircle size={48} className="mb-4 opacity-20" />
                                        <p className="text-sm font-medium">No comments yet.</p>
                                        <p className="text-xs mt-1">Be the first to share your thoughts</p>
                                    </div>
                                )}
                            </div>

                            {/* Comment Input - Full width sticky bottom */}
                            <div className={`p-4 border-t border-white/20 bg-white/80 backdrop-blur-sm sticky bottom-0 z-10 dark:bg-gray-800/30 dark:border-gray-700/30`}>
                                <div className="flex gap-3 items-center max-w-2xl mx-auto">
                                    <img
                                        src={user?.user_metadata?.avatar_url || "/UsersAvatar.jpg"}
                                        className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0 dark:border-gray-700"
                                        alt="Your avatar"
                                        loading="lazy"
                                    />
                                    <div className="flex-1 flex items-center gap-2 bg-white rounded-full px-4 py-1 shadow-sm border border-gray-200 dark:bg-gray-800/50 dark:border-gray-700/50">
                                        <input
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                                            placeholder="Write a comment..."
                                            className="flex-1 bg-transparent py-2 text-sm focus:outline-none placeholder:text-gray-400 text-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                                            aria-label="Write a comment"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handlePostComment}
                                            disabled={!newComment.trim() || isSubmitting}
                                            className={`${colorScheme.accent} font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed px-2 hover:opacity-80 transition-opacity whitespace-nowrap dark:text-gray-300`}
                                        >
                                            {isSubmitting ? "..." : "Post"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}