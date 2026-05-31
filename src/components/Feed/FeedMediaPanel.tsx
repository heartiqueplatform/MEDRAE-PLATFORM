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
    Lightbulb,
    CheckCircle
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
    imageTitle: string;
    setImageTitle: React.Dispatch<React.SetStateAction<string>>;
    imageDescription: string;
    setImageDescription: React.Dispatch<React.SetStateAction<string>>;
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
    imageTitle,
    setImageTitle,
    imageDescription,
    setImageDescription,
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
    // Upload progress state
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

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
    const shouldInject = (index + 1) % 4 === 0;
    if (!shouldInject) return null;

    const isImageSlot = ((index + 1) / 4) % 2 !== 0;

    // 🖼️ Image Selection
    const availableImages = feedImages.filter((i) => !seenIds.has(i.id));
    let img: FeedImage | null = null;
    if (isImageSlot && availableImages.length > 0) {
        const imagePosition = Math.floor((index + 1) / 8);
        img = availableImages[imagePosition % availableImages.length];
    }

    // 💡 Knowledge Selection
    const tip = (!isImageSlot && knowledgePosts?.length > 0)
        ? knowledgePosts[Math.floor(index / 8) % knowledgePosts.length]
        : null;

    if (!img && !tip) return null;

    // ================= REALTIME & INITIAL LIKES LOGIC =================
    useEffect(() => {
        if (!img?.id) return;

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

        const channel = supabase
            .channel(`likes-${img.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'qfeed_images_likes',
                filter: `image_id=eq.${img.id}`
            }, () => {
                fetchLikes();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [img?.id, user?.id, supabase]);

    // Simulate upload progress when uploading is true
    useEffect(() => {
        if (uploading) {
            setUploadProgress(0);
            const interval = setInterval(() => {
                setUploadProgress(prev => {
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


    const handleLikeToggle = async () => {
        if (!user || !img) return;

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
        if (!confirm("Delete this comment?")) return;

        const { error } = await supabase
            .from("qfeed_images_comments")
            .delete()
            .eq("id", commentId)
            .eq("user_id", user.id);

        if (!error) {
            fetchComments();
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

    const handleImageUploadWithMetadata = async () => {
        if (uploadFiles.length === 0) {
            alert("Please select at least one image");
            return;
        }

        if (handleImageUpload && typeof handleImageUpload === 'function') {
            handleImageUpload();
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
            setToastMessage("💡 Knowledge shared successfully!");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
    };

    useEffect(() => {
        if (!showUpload) {
            setImageTitle("");
            setImageDescription("");
            setKnowledgeText("");
            setUploadFiles([]);
        }
    }, [showUpload]);

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

    const handlePostComment = async () => {
        if (!img || !commentText.trim() || !user || isSubmittingComment) return;
        setIsSubmittingComment(true);
        const { error } = await supabase.from("qfeed_images_comments").insert({
            image_id: img.id,
            user_id: user.id,
            content: commentText.trim()
        });
        if (!error) {
            setCommentText("");
            fetchComments();
        }
        setIsSubmittingComment(false);
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-2 mb-2">
            {/* Custom Toast Notification */}
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

            {/* ================= 1. UPLOAD SECTION ================= */}
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
                    />
                    <button
                        onClick={() => setShowUpload(!showUpload)}
                        className="flex-1 text-left px-4 py-2.5 bg-gray-100 dark:bg-muted/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 text-sm transition-colors"
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
                            <div className="mt-4 p-4 border-0 rounded-xl bg-gray-50 dark:bg-muted/50 relative">
                                {uploadMode === 'image' ? (
                                    <div className="space-y-4">
                                        {/* Title Input - dark:bg-muted/50 */}
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

                                        {/* Description Input - dark:bg-muted/50 */}
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

                                        {/* Image Upload Area */}
                                        <label className="cursor-pointer flex flex-col items-center justify-center min-h-[120px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500 transition-colors">
                                            {uploadFiles.length > 0 ? (
                                                <div className="grid grid-cols-3 gap-2 w-full p-2">
                                                    {uploadFiles.map((file, i) => (
                                                        <div key={i} className="relative">
                                                            <img src={URL.createObjectURL(file)} className="w-full h-24 object-cover rounded-lg border" />
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setUploadFiles(uploadFiles.filter((_, idx) => idx !== i));
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
                                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tap to select images</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">You can select multiple images</span>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                multiple
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                                            />
                                        </label>

                                        {/* Real Progress Bar - shows inside the panel */}
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
                                ) : (
                                    <div className="flex flex-col gap-2 min-h-[120px]">
                                        <textarea
                                            value={knowledgeText}
                                            onChange={(e) => setKnowledgeText(e.target.value)}
                                            placeholder="Share a nursing tip..."
                                            className="w-full flex-1 bg-transparent border-none focus:ring-0 text-[15px] resize-none text-gray-800 dark:text-gray-100"
                                            autoFocus
                                        />
                                    </div>
                                )}
                                {(uploadFiles.length > 0 || knowledgeText.trim().length > 0) && (
                                    <Button
                                        onClick={uploadMode === 'image' ? handleImageUploadWithMetadata : handlePostKnowledge}
                                        disabled={uploading}
                                        className="w-full mt-4 bg-blue-600"
                                    >
                                        {uploading ? `Uploading... ${uploadProgress}%` : "Post Now"}
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* ================= 2. MAIN IMAGE CARD ================= */}
            {isImageSlot && img ? (
                <motion.div key={`image-${img.id}`} className="w-full">
                    <Card className="overflow-hidden bg-white dark:bg-muted/95 border-0 shadow-sm rounded-xl">
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

                        {/* Title Display */}
                        {img.title && (
                            <div className="px-4 pt-2">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    {img.title}
                                </h3>
                            </div>
                        )}

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
                                alt={img.title || "Feed image"}
                            />
                            {img.added_by === user?.id && (
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteImage(img); }} className="absolute top-3 right-3 bg-black/50 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>

                        {/* Description and Engagement UI */}
                        <div className="p-4 pt-3">
                            {img.description && (
                                <p className="text-[15px] mb-3 text-gray-800 dark:text-gray-200">
                                    {img.description}
                                </p>
                            )}
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

            {/* ================= COMMENT MODAL ================= */}
            <AnimatePresence>
                {isCommentModalOpen && img && (
                    <div className="fixed inset-0 z-[100] bottom-20 flex items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="
                    bg-white dark:bg-muted/100
                    w-[95vw]
                    sm:w-[90vw]
                    md:w-[85vw]
                    lg:w-[80vw]
                    xl:max-w-6xl
                    h-[85vh]
sm:h-[80vh]
md:h-[85vh]
                    rounded-t-2xl sm:rounded-2xl
                    overflow-hidden
                    flex flex-col
                    md:flex-row
                    shadow-2xl
                "
                        >
                            {/* Left Side - Image */}
                            <div className="
                    hidden md:flex
                    flex-1
                    bg-gray-50 dark:bg-muted/20
                    items-center justify-center
                    border-r dark:border-gray-800
                    p-4
                ">
                                <img
                                    src={img.image_url}
                                    className="max-h-full max-w-full object-contain rounded-lg"
                                    alt={img.title || "Image"}
                                />
                            </div>

                            {/* Right Side - Comments Section */}
                            <div className="flex-1 flex flex-col h-full bg-white dark:bg-transparent">
                                {/* Header */}
                                <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center bg-white dark:bg-muted/30">
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
                                        <X size={20} className="text-gray-500 dark:text-gray-400" />
                                    </button>
                                </div>

                                {/* Comments List */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-muted/10 custom-scrollbar">
                                    {comments.length > 0 ? (
                                        comments.map((c) => (
                                            <div key={c.id} className="flex gap-3 group">
                                                <img
                                                    src={c.profiles?.avatar_url || "/UsersAvatar.jpg"}
                                                    className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
                                                    alt="avatar"
                                                />
                                                <div className="flex-1">
                                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border dark:border-gray-700">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                                                {c.profiles?.name || "User"}
                                                            </p>
                                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                                {new Date(c.created_at).toLocaleDateString(undefined, {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                                                            {c.content}
                                                        </p>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex gap-3 mt-1 ml-2">
                                                        <button
                                                            onClick={() => {
                                                                // You can add reply functionality here if needed
                                                                setCommentText(`@${c.profiles?.name || 'User'} `);
                                                            }}
                                                            className="text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                                                        >
                                                            Reply
                                                        </button>
                                                        {c.user_id === user?.id && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleEditComment(c.id, c.content)}
                                                                    className="text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteComment(c.id)}
                                                                    className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
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
                                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                            <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                </svg>
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400 font-medium">No comments yet</p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Be the first to start the conversation</p>
                                        </div>
                                    )}
                                </div>

                                {/* Comment Input */}
                                <div className="p-4 border-t dark:border-gray-800 bg-white dark:bg-muted/30">
                                    <div className="flex gap-2">
                                        <input
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                                            placeholder="Write a comment..."
                                            className="
                                    flex-1
                                    bg-gray-100 dark:bg-gray-800/50
                                    border border-gray-200 dark:border-gray-700
                                    rounded-xl
                                    px-4 py-2.5
                                    text-sm
                                    focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                    outline-none
                                    transition-all
                                "
                                        />
                                        <button
                                            onClick={handlePostComment}
                                            disabled={!commentText.trim() || isSubmittingComment}
                                            className="
                                    bg-gradient-to-r from-blue-600 to-purple-600
                                    hover:from-blue-700 hover:to-purple-700
                                    text-white
                                    p-2.5 rounded-xl
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    transition-all duration-200
                                    flex items-center justify-center
                                    min-w-[42px]
                                "
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
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