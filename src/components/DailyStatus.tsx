// components/DailyStatus.jsx
import { useState, useEffect, useRef } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import {
    Globe,
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
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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

export default function DailyStatus() {
    const user = useUser();
    const [isOpen, setIsOpen] = useState(false);
    const [dailyContent, setDailyContent] = useState("");
    const [dailyDuration, setDailyDuration] = useState("24h");
    const [dailyImage, setDailyImage] = useState(null);
    const [dailyPosts, setDailyPosts] = useState([]);
    const [loading, setLoading] = useState(true);
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

    // Track if we're currently fetching to prevent duplicates
    const isFetchingRef = useRef(false);

    // Fetch current user's profile (only once on mount)
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

    // Fetch daily posts - ONLY when explicitly called
    const fetchDailyPosts = async () => {
        if (!user?.id) return;

        // Prevent multiple simultaneous calls
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        try {
            const { data: posts, error } = await supabase
                .from("valid_daily_posts")
                .select("id, user_id, content, image_url, expires_at, created_at")
                .order("created_at", { ascending: false })
                .limit(10);

            if (error) throw error;

            if (!posts || posts.length === 0) {
                setDailyPosts([]);
                setLoading(false);
                return;
            }

            const userIds = [...new Set(posts.map((p) => p.user_id).filter(Boolean))];

            const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, username, name, avatar_url")
                .in("user_id", userIds);

            const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

            const mergedPosts = posts.map((p) => ({
                ...p,
                profiles: profileMap.get(p.user_id) || {
                    username: "Unknown",
                    name: "Unknown",
                    avatar_url: null,
                    institution: "N/A",
                    county: "N/A",
                },
            }));

            setDailyPosts(mergedPosts);
        } catch (err) {
            console.error("Error fetching daily posts:", err);
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    };

    // ONLY fetch once when component mounts
    useEffect(() => {
        if (user?.id) {
            fetchDailyPosts();
        }
    }, [user?.id]); // Only depends on user.id, not the whole user object

    // Refresh ONLY when user returns to the tab (NO POLLING!)
    useEffect(() => {
        const handleVisibilityChange = () => {
            // When tab becomes visible AND user is logged in, refresh
            if (!document.hidden && user?.id) {
                console.log("🟢 Tab became visible - refreshing posts");
                fetchDailyPosts();
            }
        };

        // Also refresh when window gets focus (for desktop apps)
        const handleWindowFocus = () => {
            if (user?.id) {
                console.log("🟢 Window focused - refreshing posts");
                fetchDailyPosts();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleWindowFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleWindowFocus);
        };
    }, [user?.id]); // Only depends on user.id

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

            const { data: post, error: insertError } = await supabase
                .from("daily_posts")
                .insert({
                    user_id: user.id,
                    content: dailyContent,
                    image_url,
                    duration: dailyDuration,
                })
                .select()
                .single();

            if (insertError) throw insertError;

            const postWithProfile = {
                ...post,
                profiles: {
                    username: profileData?.username || "You",
                    name: profileData?.name || "You",
                    avatar_url: profileData?.avatar_url || null,
                    institution: profileData?.institution || "N/A",
                    county: profileData?.county || "N/A",
                },
            };

            setDailyPosts((prev) => [postWithProfile, ...prev]);
            setDailyContent("");
            setDailyImage(null);
            setIsOpen(false);
            toast.success("Posted successfully!", {
                description: "Your daily status has been shared.",
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

    const handleDeletePost = async (postId, postUserId) => {
        if (user?.id !== postUserId) {
            toast.error("Permission denied", {
                description: "You can only delete your own posts",
            });
            return;
        }

        if (!confirm("Are you sure you want to delete this post?")) return;

        const { error } = await supabase.from("daily_posts").delete().eq("id", postId);
        if (error) {
            toast.error("Error", { description: "Could not delete the post." });
            return;
        }

        setDailyPosts((prev) => prev.filter((post) => post.id !== postId));
        toast.success("Deleted", { description: "Your post was successfully deleted." });
    };

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

    return (
        <>
            <Card className="w-full border-0 bg-white dark:bg-muted/30 shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <Globe className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black tracking-tight dark:text-white">
                                Community Pulse
                            </CardTitle>
                            <CardDescription className="text-xs font-medium dark:text-slate-400">
                                Share clinical insights, study wins, or daily nursing inspiration.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0 sm:p-6 pt-0">
                    <div className="space-y-6">
                        {/* Status Composer */}
                        <div className="px-4 sm:px-0">
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
                                                    onValueChange={(value) =>
                                                        setDailyDuration(value)
                                                    }
                                                >
                                                    <SelectTrigger className="h-8 w-[120px] border-0 bg-transparent text-xs font-bold shadow-none">
                                                        <SelectValue placeholder="Duration" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="24h">24 Hours</SelectItem>
                                                        <SelectItem value="1w">1 Week</SelectItem>
                                                        <SelectItem value="1m">1 Month</SelectItem>
                                                        <SelectItem value="3m">3 Months</SelectItem>
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

                        {/* Posts Feed */}
                        <div className="space-y-4">
                            {loading ? (
                                <div className="space-y-4 px-4 sm:px-0">
                                    {[1, 2].map((i) => (
                                        <div
                                            key={i}
                                            className="h-32 rounded-2xl bg-slate-100 dark:bg-muted/30 animate-pulse"
                                        />
                                    ))}
                                </div>
                            ) : dailyPosts.length > 0 ? (
                                dailyPosts.map((post) => (
                                    <motion.div
                                        key={post.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="group relative bg-white dark:bg-muted/30 border-b border-slate-100 dark:border-white/5 last:border-0 overflow-hidden"
                                    >
                                        <div className="flex flex-col">
                                            <div className="flex items-center justify-between p-4 pb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <button
                                                            onClick={() =>
                                                                setOpenProfileId(openProfileId === post.id ? null : post.id)
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
                                                                    {post.profiles?.username?.charAt(0).toUpperCase()}
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
                                                                        <p className="font-black text-sm dark:text-white truncate">
                                                                            {post.profiles?.name}
                                                                        </p>
                                                                        <p className="text-[10px] font-bold text-blue-500 uppercase">
                                                                            @{post.profiles?.username}
                                                                        </p>
                                                                        <div className="pt-2 space-y-1.5">
                                                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                                                                                <School className="w-3 h-3" />{" "}
                                                                                {post.profiles?.institution || "Medical Student"}
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
                                                        <span className="text-sm font-black dark:text-white leading-tight">
                                                            {post.profiles?.name}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                            {formatDistanceToNow(new Date(post.created_at), {
                                                                addSuffix: true,
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>

                                                {user?.id === post.user_id && (
                                                    <button
                                                        onClick={() => handleDeletePost(post.id, post.user_id)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            {post.content && (
                                                <div className="px-4 pb-3">
                                                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                                                        {post.content}
                                                    </p>
                                                </div>
                                            )}

                                            {post.image_url && (
                                                <div className="relative -mx-0 overflow-hidden bg-slate-50 dark:bg-muted/30 flex items-center justify-center border-0">
                                                    <img
                                                        src={post.image_url}
                                                        className="w-full h-auto max-h-[70vh] object-contain cursor-zoom-in"
                                                        alt="status"
                                                        onClick={() => setFullscreenImage(post.image_url)}
                                                    />
                                                </div>
                                            )}

                                            <div className="p-4 flex items-center gap-2">
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-white/5 rounded-full">
                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                                        Expires {new Date(post.expires_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
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

            {/* Crop Modal */}
            <AnimatePresence>
                {showCropModal && imageToCrop && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4"
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

            {/* Fullscreen Image Modal */}
            <AnimatePresence>
                {fullscreenImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/95 z-[100] flex items-center justify-center p-4"
                        onClick={() => setFullscreenImage(null)}
                    >
                        <img
                            src={fullscreenImage}
                            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
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