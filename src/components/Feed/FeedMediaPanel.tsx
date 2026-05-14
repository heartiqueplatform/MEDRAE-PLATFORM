"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Trash2,
    Upload,
    Heart,
    MessageCircle,
    Share2,
    MoreHorizontal,
    ImageIcon,
    X,
    Send,
    Lightbulb
} from "lucide-react";
import { GlobalLoader } from "@/components/GlobalLoader";
import KnowledgeCard from "./KnowledgeCard";

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
    knowledgePosts: any[];
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
}

export default function FeedMediaPanel({
    index,
    feedImages,
    loadedImages,
    setLoadedImages,
    knowledgePosts = [],
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
}: Props) {
    const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
    const [commentsCount, setCommentsCount] = useState(0);
    // Social States
    const [likesCount, setLikesCount] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    // 'image' means file upload, 'knowledge' means text post
    const [uploadMode, setUploadMode] = useState<'image' | 'knowledge'>('image');
    const [knowledgeText, setKnowledgeText] = useState("");
    // Paste this below your other social states
    const [comments, setComments] = useState<any[]>([]);
    const [commentText, setCommentText] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    // 🧠 PRESERVE: Original behavior for seen images
    useEffect(() => {
        const loadSeen = async () => {
            const userId = session?.user?.id;
            if (!userId) return;
            const { data } = await supabase
                .from("seen_images")
                .select("image_id")
                .eq("user_id", userId);
            const ids = new Set<string>((data || []).map((d: any) => d.image_id));
            setSeenIds(ids);
        };
        loadSeen();
    }, [session?.user?.id, supabase]);

    // 🧠 PRESERVE: Image selection and insertion logic
    // ================= SMART SLOT LOGIC =================
    // 🧠 Trigger every 4th item
    // 🧠 Trigger every 4th item
    // ================= SMART SLOT LOGIC =================
    const shouldInject = (index + 1) % 4 === 0;
    if (!shouldInject) return null;

    // Determine if this is an Image slot (4th, 12th, 20th...)
    // or a Knowledge slot (8th, 16th, 24th...)
    const isImageSlot = ((index + 1) / 4) % 2 !== 0;

    // 🖼️ Image Selection
    const availableImages = feedImages.filter((i) => !seenIds.has(i.id));
    let img: FeedImage | null = null;
    if (isImageSlot && availableImages.length > 0) {
        const imagePosition = Math.floor((index + 1) / 8);
        img = availableImages[imagePosition % availableImages.length];
    }

    // 💡 Knowledge Selection (Only 1 tip)
    const tip = (!isImageSlot && knowledgePosts?.length > 0)
        ? knowledgePosts[Math.floor(index / 8) % knowledgePosts.length]
        : null;

    // Safety check: if we have neither, show nothing
    if (!img && !tip) return null;
    // ================= REALTIME & INITIAL LIKES LOGIC =================
    useEffect(() => {
        if (!img?.id) return;

        // Fetch Initial Likes
        const fetchLikes = async () => {
            const { count } = await supabase
                .from('qfeed_images_likes')
                .select('*', { count: 'exact', head: true })
                .eq('image_id', img.id);
            setLikesCount(count || 0);
            const { count: cCount } = await supabase
                .from('qfeed_images_comments')
                .select('*', { count: 'exact', head: true })
                .eq('image_id', img.id);
            setCommentsCount(cCount || 0);

            if (user?.id) {
                const { data } = await supabase
                    .from('qfeed_images_likes')
                    .select('id')
                    .eq('image_id', img.id)
                    .eq('user_id', user.id)
                    .maybeSingle();
                setHasLiked(!!data);
            }
        };

        fetchLikes();

        // Subscribe to Realtime Changes for this specific image
        const channel = supabase
            .channel(`likes-${img.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'qfeed_images_likes',
                filter: `image_id=eq.${img.id}`
            }, () => {
                fetchLikes(); // Refresh count when anyone likes/unlikes
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [img?.id, user?.id, supabase]);


    const handleLikeToggle = async () => {
        if (!user || !img) return;

        // Optimistic UI update
        const currentlyLiked = hasLiked;
        setHasLiked(!currentlyLiked);
        setLikesCount(prev => currentlyLiked ? prev - 1 : prev + 1);

        if (currentlyLiked) {
            await supabase.from('qfeed_images_likes').delete().eq('image_id', img.id).eq('user_id', user.id);
        } else {
            await supabase.from('qfeed_images_likes').insert({ image_id: img.id, user_id: user.id });
        }
    };

    const handleImageClick = async () => {
        if (!img) return;
        openViewer(img);
        const userId = session?.user?.id;
        if (!userId) return;
        const { error } = await supabase.from("seen_images").insert({ user_id: userId, image_id: img.id });
        if (!error) setSeenIds((prev) => new Set(prev).add(img.id));
    };
    // 1. Function to get comments from database
    const fetchComments = useCallback(async () => {
        if (!img?.id) return;
        const { data } = await supabase
            .from("qfeed_images_comments")
            .select("*, profiles(name, avatar_url)")
            .eq("image_id", img.id)
            .order("created_at", { ascending: true });
        setComments(data || []);
        setCommentsCount(data?.length || 0);
    }, [img?.id, supabase]);
    const handleDeleteComment = async (commentId: string) => {
        // Confirmation is always good practice
        if (!confirm("Delete this comment?")) return;

        const { error } = await supabase
            .from("qfeed_images_comments")
            .delete()
            .eq("id", commentId)
            .eq("user_id", user.id); // Security: ensures you can only delete your own

        if (!error) {
            fetchComments(); // Refresh the list and count
        }
    };
    const handleEditComment = async (commentId: string, currentContent: string) => {
        const newContent = prompt("Edit your comment:", currentContent);

        if (newContent === null || newContent.trim() === "" || newContent === currentContent) return;

        const { error } = await supabase
            .from("qfeed_images_comments")
            .update({ content: newContent.trim() })
            .eq("id", commentId)
            .eq("user_id", user.id);

        if (!error) {
            fetchComments();
        }
    };

    const handlePostKnowledge = async () => {
        if (!knowledgeText.trim() || !user) return;

        const { error } = await supabase
            .from("qfeed_knowledge")
            .insert({
                content: knowledgeText.trim(),
                added_by: user.id,
                category: "Clinical Tip"
            });

        if (!error) {
            setKnowledgeText("");
            setShowUpload(false);
            alert("Knowledge Shared!");
            // Optional: window.location.reload() to see the new post if not realtime
        }
    };
    // 2. Effect to load comments and listen for new ones Realtime
    useEffect(() => {
        if (isCommentModalOpen && img?.id) {
            fetchComments();
            const channel = supabase
                .channel(`comm-${img.id}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'qfeed_images_comments',
                    filter: `image_id=eq.${img.id}`
                }, () => fetchComments())
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [isCommentModalOpen, fetchComments, img?.id, supabase]);

    // 3. Function to Send the comment
    const handlePostComment = async () => {
        if (!img || !commentText.trim() || !user || isSubmittingComment) return;
        setIsSubmittingComment(true);
        const { error } = await supabase.from("qfeed_images_comments").insert({
            image_id: img.id,
            user_id: user.id,
            content: commentText.trim()
        });
        if (!error) {
            setCommentText(""); // Clear box
            fetchComments();    // Refresh list
        }
        setIsSubmittingComment(false);
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-2 mb-2">

            {/* ================= 1. UPLOAD SECTION (Only shows once at the top) ================= */}

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border-0 p-4"
            >
                <div className="flex gap-3 items-center">
                    <img
                        src={user?.user_metadata?.avatar_url || "/UsersAvatar.jpg"}
                        className="w-10 h-10 rounded-full object-cover border"
                        alt="User"
                    />
                    <button
                        onClick={() => setShowUpload(!showUpload)}
                        className="flex-1 text-left px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 text-sm transition-colors"
                    >
                        Share something visual, {user?.user_metadata?.full_name?.split(' ')[0] || 'Friend'}?
                    </button>
                </div>

                <div className="flex items-center gap-4 mt-3 pt-3 border-0">
                    <button onClick={() => { setShowUpload(true); setUploadMode('image'); }} className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <ImageIcon className="text-green-500" size={20} />
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Photo/Video</span>
                    </button>
                    <div className="h-6 w-[1px] bg-gray-200 dark:bg-gray-800" />
                    <button
                        onClick={() => { setShowUpload(true); setUploadMode('knowledge'); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${uploadMode === 'knowledge' && showUpload ? 'bg-yellow-50 dark:bg-gray-800' : ''}`}
                    >

                        <div className="p-2 rounded-full bg-gray-50 dark:bg-gray-800 group-hover:scale-110 transition-transform">
                            <Lightbulb className="text-amber-500" size={18} />
                        </div>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Knowledge</span>
                    </button>
                </div>

                <AnimatePresence>
                    {showUpload && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                            <div className="mt-4 p-4 border-0 rounded-xl bg-gray-50 dark:bg-gray-950 relative">
                                {uploadMode === 'image' ? (
                                    <label className="cursor-pointer flex flex-col items-center justify-center min-h-[120px]">
                                        {uploadFiles.length > 0 ? (
                                            <div className="grid grid-cols-3 gap-2 w-full">
                                                {uploadFiles.map((file, i) => (
                                                    <img key={i} src={URL.createObjectURL(file)} className="w-full h-24 object-cover rounded-lg border" />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <Upload size={24} className="text-blue-600 mb-2" />
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tap to select images</span>
                                            </div>
                                        )}
                                        <input type="file" multiple className="hidden" accept="image/*" onChange={(e) => setUploadFiles(Array.from(e.target.files || []))} />
                                    </label>
                                ) : (
                                    <div className="flex flex-col gap-2 min-h-[120px]">
                                        <textarea value={knowledgeText} onChange={(e) => setKnowledgeText(e.target.value)} placeholder="Share a nursing tip..." className="w-full flex-1 bg-transparent border-none focus:ring-0 text-[15px] resize-none text-gray-800 dark:text-gray-100" autoFocus />
                                    </div>
                                )}
                                {(uploadFiles.length > 0 || knowledgeText.trim().length > 0) && (
                                    <Button onClick={uploadMode === 'image' ? handleImageUpload : handlePostKnowledge} disabled={uploading} className="w-full mt-4 bg-blue-600">
                                        {uploading ? "Posting..." : "Post Now"}
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>


            {/* ================= 2. MAIN IMAGE CARD (The Visual) ================= */}
            {isImageSlot && img ? (
                <motion.div key={`image-${img.id}`} className="w-full">
                    <Card className="overflow-hidden bg-white dark:bg-gray-900 border-0 shadow-sm rounded-xl">
                        {/* Header */}
                        <div className="flex items-center justify-between p-3 px-4">
                            <div className="flex items-center gap-3">
                                <img src={img.profiles?.avatar_url || "/UsersAvatar.jpg"} className="w-10 h-10 rounded-full border shadow-sm" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold leading-tight">{img.profiles?.name || "Member"}</span>
                                    <span className="text-[11px] text-gray-500 font-medium uppercase tracking-tight">Shared a Resource</span>
                                </div>
                            </div>
                            <button className="text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors"><MoreHorizontal size={18} /></button>
                        </div>

                        {/* Image Content */}
                        <div className="relative group bg-gray-100 dark:bg-gray-900 min-h-[300px] flex items-center justify-center overflow-hidden">
                            {!loadedImages[img.id] && <div className="absolute inset-0 flex items-center justify-center scale-50"><GlobalLoader /></div>}
                            <img
                                src={img.image_url.includes('cloudinary')
                                    ? img.image_url.replace('/upload/', '/upload/w_800,f_auto,q_auto/')
                                    : img.image_url}
                                onLoad={() => setLoadedImages((prev) => ({ ...prev, [img.id]: true }))}
                                onClick={handleImageClick}
                                className={`w-full h-auto max-h-[600px] object-contain cursor-pointer transition-all duration-700 ${loadedImages[img.id] ? "opacity-100" : "opacity-0"}`}
                            />
                            {img.added_by === user?.id && (
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteImage(img); }} className="absolute top-3 right-3 bg-black/50 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>

                        {/* Engagement UI */}
                        <div className="p-4 pt-3">
                            {img.description && <p className="text-[15px] mb-3 text-gray-800 dark:text-gray-200">{img.description}</p>}
                            <div className="flex items-center justify-between pb-3 border-b dark:border-gray-800">
                                <div className="flex items-center gap-1.5">
                                    <div className="bg-blue-500 rounded-full p-1"><Heart size={10} className="text-white fill-current" /></div>
                                    <span className="text-sm text-gray-500 font-medium">{likesCount} Likes</span>
                                </div>
                                <button onClick={() => setIsCommentModalOpen(true)} className="text-sm text-gray-500 hover:underline">{commentsCount} Comments</button>
                            </div>
                            <div className="flex gap-1 pt-1">
                                <button onClick={handleLikeToggle} className={`flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-semibold transition-colors ${hasLiked ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`}><Heart size={20} className={hasLiked ? "fill-current" : ""} /> Like</button>
                                <button onClick={() => setIsCommentModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 py-2 font-semibold text-gray-600 dark:text-gray-400"><MessageCircle size={20} /> Comment</button>
                                <button
                                    onClick={() => {
                                        const message = "Join to learn with visuals and high-quality questions on Medrae! https://medrae.vercel.app";
                                        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
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
                                    Share to WhatsApp
                                </button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            ) : tip ? (
                <div className="space-y-2">
                    <KnowledgeCard item={tip} user={user} supabase={supabase} />
                </div>
            ) : null}

            {/* Separator Banner */}
            <div className="flex items-center gap-1 py-2 opacity-40">
                <div className="h-[1px] flex-1 bg-gray-300 dark:bg-gray-800" />
                <span className="text-[10px] font-bold tracking-widest uppercase">Community Spotlight</span>
                <div className="h-[1px] flex-1 bg-gray-300 dark:bg-gray-800" />
            </div>

            {/* (Keep Comment Modal code here) */}


            {/* ================= COMMENT MODAL FOUNDATION ================= */}
            <AnimatePresence>
                {isCommentModalOpen && img && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="bg-white dark:bg-gray-900 w-full max-w-4xl h-[70vh] sm:h-[70vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col sm:flex-row"
                        >
                            {/* Image Part (Hidden on small mobile if needed, but usually visible) */}
                            <div className="hidden sm:flex flex-[1.5] bg-white items-center justify-center border-r dark:border-gray-800">
                                <img src={img.image_url} className="max-h-full object-contain" />
                            </div>

                            {/* Comments Part */}
                            <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900">
                                <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
                                    <h3 className="font-bold">Comments</h3>
                                    <button onClick={() => setIsCommentModalOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X size={20} /></button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
                                    {comments.length > 0 ? comments.map((c) => (
                                        <div key={c.id} className="flex gap-2">
                                            <img src={c.profiles?.avatar_url || "/UsersAvatar.jpg"} className="w-8 h-8 rounded-full object-cover" />
                                            <div className="group relative bg-white dark:bg-gray-800 p-2 px-3 rounded-2xl shadow-sm border dark:border-gray-700 max-w-[85%]">
                                                <p className="text-[11px] font-bold text-blue-600">{c.profiles?.name || "User"}</p>
                                                <p className="text-sm">{c.content}</p>

                                                {/* Only show trash icon if the logged-in user is the author */}
                                                {c.user_id === user?.id && (
                                                    <button
                                                        onClick={() => handleDeleteComment(c.id)}
                                                        className="absolute -right-8 top-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>

                                                )}
                                                {c.user_id === user?.id && (
                                                    <div className="absolute -right-14 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEditComment(c.id, c.content)}
                                                            className="p-1 text-gray-400 hover:text-blue-500"
                                                        >
                                                            <MoreHorizontal size={14} /> {/* Or an edit icon */}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteComment(c.id)}
                                                            className="p-1 text-gray-400 hover:text-red-500"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-center text-gray-500 text-sm mt-10">No comments yet. Start the conversation!</p>
                                    )}
                                </div>
                                <div className="p-4 border-t dark:border-gray-800 bg-white dark:bg-gray-900">
                                    <div className="flex gap-2">
                                        <input
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                                            placeholder="Write a comment..."
                                            className="flex-1 bg-gray-100 dark:bg-gray-800 border-none rounded-full px-4 py-2 text-sm focus:ring-2 ring-blue-500 outline-none"
                                        />
                                        <button
                                            onClick={handlePostComment}
                                            disabled={!commentText.trim() || isSubmittingComment}
                                            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full disabled:opacity-50 transition-all"
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}