"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
    Heart, MessageCircle, Share2, Trash2,
    MoreHorizontal, Quote, X, Send, Edit2
} from "lucide-react";

export default function KnowledgeCard({ item, user, supabase }: { item: any, user: any, supabase: any }) {
    if (!item) return null;

    // Social States
    const [likes, setLikes] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [commentCount, setCommentCount] = useState(0);

    // Modal & Comment States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ================= DATA FETCHING =================
    const fetchSocialData = useCallback(async () => {
        if (!item?.id) return;

        const { count: lCount } = await supabase
            .from('qfeed_knowledge_likes')
            .select('*', { count: 'exact', head: true })
            .eq('knowledge_id', item.id);
        setLikes(lCount || 0);

        if (user?.id) {
            const { data } = await supabase
                .from('qfeed_knowledge_likes')
                .select('id')
                .eq('knowledge_id', item.id)
                .eq('user_id', user.id)
                .single();
            setHasLiked(!!data);
        }

        const { count: cCount } = await supabase
            .from('qfeed_knowledge_comments')
            .select('*', { count: 'exact', head: true })
            .eq('knowledge_id', item.id);
        setCommentCount(cCount || 0);
    }, [item?.id, user?.id, supabase]);

    const fetchComments = useCallback(async () => {
        if (!item?.id) return;
        const { data } = await supabase
            .from('qfeed_knowledge_comments')
            .select('*, profiles(name, avatar_url)')
            .eq('knowledge_id', item.id)
            .order('created_at', { ascending: true });
        setComments(data || []);
    }, [item?.id, supabase]);

    // ================= REALTIME SUBSCRIPTIONS =================
    useEffect(() => {
        fetchSocialData();
        const channel = supabase
            .channel(`know-social-${item.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'qfeed_knowledge_likes',
                filter: `knowledge_id=eq.${item.id}`
            }, () => fetchSocialData())
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'qfeed_knowledge_comments',
                filter: `knowledge_id=eq.${item.id}`
            }, () => {
                fetchSocialData();
                if (isModalOpen) fetchComments();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [item?.id, fetchSocialData, fetchComments, isModalOpen, supabase]);

    useEffect(() => {
        if (isModalOpen) fetchComments();
    }, [isModalOpen, fetchComments]);

    // ================= ACTIONS =================
    const handleLike = async () => {
        if (!user || !item?.id) return;
        const prevLiked = hasLiked;
        setHasLiked(!prevLiked);
        setLikes(prev => prevLiked ? prev - 1 : prev + 1);

        if (prevLiked) {
            await supabase.from('qfeed_knowledge_likes').delete().eq('knowledge_id', item.id).eq('user_id', user.id);
        } else {
            await supabase.from('qfeed_knowledge_likes').insert({ knowledge_id: item.id, user_id: user.id });
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
            fetchComments();
        }
        setIsSubmitting(false);
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm("Delete this comment?")) return;
        const { error } = await supabase.from('qfeed_knowledge_comments').delete().eq('id', commentId);
        if (!error) fetchComments();
    };

    const handleEditComment = async (commentId: string, currentContent: string) => {
        const newContent = prompt("Edit your comment:", currentContent);
        if (!newContent || newContent.trim() === currentContent) return;

        const { error } = await supabase
            .from('qfeed_knowledge_comments')
            .update({ content: newContent.trim() })
            .eq('id', commentId);
        if (!error) fetchComments();
    };

    const handleWhatsAppShare = () => {
        const text = `💡 Nursing Tip: "${item.content}" \n\nShared via MedareNursing. Join us for more tips!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    };

    const handleDelete = async () => {
        if (!confirm("Delete this post?")) return;
        await supabase.from('qfeed_knowledge').delete().eq('id', item.id);
        window.location.reload();
    };

    return (
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-2xl mx-auto mb-2">
                <Card className="bg-white dark:bg-gray-900 border-0 shadow-sm rounded-xl overflow-hidden">

                    {/* Instagram Style Header */}
                    <div className="flex items-center justify-between p-3 px-4">
                        <div className="flex items-center gap-3">
                            <img src={item.profiles?.avatar_url || "/UsersAvatar.jpg"} className="w-9 h-9 rounded-full border object-cover" />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold leading-tight">{item.profiles?.name || "Nurse"}</span>
                                <span className="text-[11px] text-blue-600 font-bold uppercase tracking-tighter">Clinical Wisdom</span>
                            </div>
                        </div>
                        <button onClick={handleDelete} className="text-gray-400 hover:text-red-500 transition-colors">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>

                    {/* Content Area - Quote Block */}
                    <div className="px-6 py-12 bg-gray-50 dark:bg-gray-950/50 flex flex-col items-center justify-center text-center relative border-y dark:border-gray-800">
                        <Quote className="text-blue-500/20 absolute top-4 left-6" size={48} />
                        <p className="text-lg md:text-xl font-medium text-gray-800 dark:text-gray-200 italic leading-relaxed z-10">
                            "{item.content}"
                        </p>
                    </div>

                    {/* Interaction Row (Insta Style) */}
                    <div className="p-3 px-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-4">
                                <button onClick={handleLike} className={`${hasLiked ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'} hover:scale-110 transition-transform`}>
                                    <Heart size={26} className={hasLiked ? "fill-current" : ""} />
                                </button>
                                <button onClick={() => setIsModalOpen(true)} className="text-gray-800 dark:text-gray-200 hover:scale-110 transition-transform">
                                    <MessageCircle size={26} />
                                </button>
                                <button onClick={handleWhatsAppShare} className="text-gray-800 dark:text-gray-200 hover:scale-110 transition-transform">
                                    <Share2 size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Likes & Comments Count */}
                        <div className="space-y-1">
                            <p className="text-sm font-bold">{likes.toLocaleString()} likes</p>
                            <button onClick={() => setIsModalOpen(true)} className="text-sm text-gray-500 hover:text-gray-400 transition-colors">
                                View all {commentCount} comments
                            </button>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* ================= COMMENT MODAL OVERLAY ================= */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white dark:bg-gray-900 w-full max-w-lg h-[70vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">

                            <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0">
                                <h3 className="font-bold text-center flex-1">Comments</h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-1"><X size={24} /></button>
                            </div>

                            {/* Comment List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-white dark:bg-gray-900">
                                {comments.length > 0 ? comments.map((c) => (
                                    <div key={c.id} className="flex gap-3 group">
                                        <img src={c.profiles?.avatar_url || "/UsersAvatar.jpg"} className="w-8 h-8 rounded-full object-cover mt-1" />
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="text-sm">
                                                    <span className="font-bold mr-2">{c.profiles?.name || "User"}</span>
                                                    <span className="text-gray-800 dark:text-gray-200">{c.content}</span>
                                                </div>

                                                {/* Edit/Delete Actions for Owner */}
                                                {c.user_id === user?.id && (
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEditComment(c.id, c.content)} className="text-gray-400 hover:text-blue-500">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={() => handleDeleteComment(c.id)} className="text-gray-400 hover:text-red-500">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 font-medium">
                                                <span>{new Date(c.created_at).toLocaleDateString()}</span>
                                                <button className="hover:text-black dark:hover:text-white">Reply</button>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
                                        <MessageCircle size={48} className="mb-4 opacity-20" />
                                        <p className="text-sm font-medium">No comments yet.</p>
                                    </div>
                                )}
                            </div>

                            {/* Instagram Style Comment Input */}
                            <div className="p-3 border-t dark:border-gray-800 bg-white dark:bg-gray-900 sticky bottom-0">
                                <div className="flex gap-3 items-center">
                                    <img src={user?.user_metadata?.avatar_url || "/UsersAvatar.jpg"} className="w-8 h-8 rounded-full object-cover" />
                                    <div className="flex-1 flex items-center gap-2">
                                        <input
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                                            placeholder={`Add a comment for ${item.profiles?.name?.split(' ')[0] || 'Nurse'}...`}
                                            className="flex-1 bg-transparent py-2 text-sm focus:outline-none"
                                        />
                                        <button
                                            onClick={handlePostComment}
                                            disabled={!newComment.trim() || isSubmitting}
                                            className="text-blue-500 font-bold text-sm disabled:opacity-30 px-2"
                                        >
                                            Post
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}