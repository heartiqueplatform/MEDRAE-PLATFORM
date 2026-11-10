"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Upload, Trash2, X, Image as ImageIcon, Loader2, Crown,
    Lock, Sparkles, Eye,
} from "lucide-react";
import { useUser } from "@supabase/auth-helpers-react";
import { toast } from "@/hooks/use-toast";
import { usePremiumFeature } from "@/hooks/usePremiumFeature";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { playSound } from "@/lib/soundManager";

// Cache helpers
import {
    getCachedImage, cacheImage, pruneCache, deleteCachedImage,
} from "@/lib/imageCache";
import {
    fetchUnitImages, getCachedList, invalidateListCache, UnitImage,
} from "@/lib/unitImagesCache";

// Global event bus
import { onImagesChanged, emitImagesChanged } from "@/lib/imageEvents";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (type === "success") vibrate([15, 30, 15]);
    else if (type === "warning") vibrate(60);
    else vibrate(12);
};

interface UnitPicsProps {
    position: number;
}

/* ============================================================
   PROGRESSIVE IMAGE — unchanged logic, token colors
   ============================================================ */
const ProgressiveImage = ({
    src, alt, className, style, onClick,
}: {
    src: string;
    alt: string;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
}) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [isInView, setIsInView] = useState(false);
    const [lowQualitySrc, setLowQualitySrc] = useState<string>("");
    const [highQualityLoaded, setHighQualityLoaded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const objectUrlRef = useRef<string | null>(null);

    const getLowQualityUrl = useCallback((originalUrl: string) => {
        if (!originalUrl) return "";
        if (originalUrl.includes("cloudinary.com")) {
            return originalUrl.replace("/upload/", "/upload/w_100,q_10/");
        }
        return originalUrl;
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.unobserve(entry.target);
                    }
                });
            },
            { rootMargin: "200px", threshold: 0.1 }
        );
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isInView || !src) return;
        let cancelled = false;
        setLowQualitySrc(getLowQualityUrl(src));
        setHighQualityLoaded(false);
        setObjectUrl(null);

        (async () => {
            const cached = await getCachedImage(src);
            if (cancelled) return;
            if (cached) {
                const url = URL.createObjectURL(cached);
                objectUrlRef.current = url;
                setObjectUrl(url);
                setHighQualityLoaded(true);
                return;
            }
            try {
                const res = await fetch(src, { cache: "force-cache" });
                if (!res.ok) throw new Error("Fetch failed");
                const blob = await res.blob();
                if (cancelled) return;
                const url = URL.createObjectURL(blob);
                objectUrlRef.current = url;
                setObjectUrl(url);
                setHighQualityLoaded(true);
                cacheImage(src, blob).catch(() => { });
            } catch {
                if (!cancelled) {
                    setObjectUrl(src);
                    setHighQualityLoaded(true);
                }
            }
        })();

        return () => {
            cancelled = true;
            if (
                objectUrlRef.current &&
                objectUrlRef.current.startsWith("blob:")
            ) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        };
    }, [isInView, src, getLowQualityUrl]);

    if (!src) return null;
    const displaySrc = objectUrl || lowQualitySrc || src;

    return (
        <div
            ref={containerRef}
            className="relative w-full bg-slate-100 dark:bg-white/[0.06]"
            style={{ aspectRatio: "4/3" }}
        >
            {!isInView ? (
                <div className="w-full h-full bg-slate-200 dark:bg-white/[0.08]" />
            ) : (
                <>
                    {!highQualityLoaded && (
                        <img
                            src={lowQualitySrc || src}
                            alt={alt}
                            className={`${className || ""} absolute inset-0 w-full h-full`}
                            style={{
                                ...style,
                                objectFit: "cover",
                                filter: "blur(20px)",
                                transform: "scale(1.02)",
                                transition: "filter 0.8s ease-out, transform 0.8s ease-out",
                                width: "100%",
                                height: "100%",
                            }}
                            loading="lazy"
                            decoding="async"
                        />
                    )}
                    <img
                        src={displaySrc}
                        alt={alt}
                        className={`${className || ""} absolute inset-0 w-full h-full transition-opacity duration-700 ${highQualityLoaded ? "opacity-100" : "opacity-0"
                            }`}
                        style={{
                            ...style,
                            objectFit: "cover",
                            width: "100%",
                            height: "100%",
                        }}
                        onClick={onClick}
                        loading="lazy"
                        decoding="async"
                    />
                </>
            )}
        </div>
    );
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export function UnitPics({ position }: UnitPicsProps) {
    const user = useUser();
    const { isPremium } = usePremiumFeature();
    const [image, setImage] = useState<UnitImage | null>(null);
    const [loading, setLoading] = useState(true);
    const [allImages, setAllImages] = useState<UnitImage[]>([]);
    const [usedIndices, setUsedIndices] = useState<number[]>([]);
    const [showUpload, setShowUpload] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [caption, setCaption] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [uploadQueue, setUploadQueue] = useState<File[]>([]);
    const [isUploadingMultiple, setIsUploadingMultiple] = useState(false);

    const usedIndicesRef = useRef<number[]>([]);
    useEffect(() => {
        usedIndicesRef.current = usedIndices;
    }, [usedIndices]);

    const shouldShow = position % 4 === 0;
    const canUpload = isPremium && user;

    const pickRandomFrom = useCallback(
        (
            images: UnitImage[],
            used: number[]
        ): { image: UnitImage | null; used: number[] } => {
            if (images.length === 0) return { image: null, used: [] };
            const available = images
                .map((_, i) => i)
                .filter((i) => !used.includes(i));
            if (available.length === 0) {
                const idx = Math.floor(Math.random() * images.length);
                return { image: images[idx], used: [idx] };
            }
            const idx = available[Math.floor(Math.random() * available.length)];
            return { image: images[idx], used: [...used, idx] };
        },
        []
    );

    const fetchAllImages = useCallback(
        async (forceRefresh = false) => {
            const cached = getCachedList();
            if (cached && cached.length > 0) {
                setAllImages(cached);
                const { image: picked, used } = pickRandomFrom(
                    cached,
                    usedIndicesRef.current
                );
                setImage(picked);
                setUsedIndices(used);
                setLoading(false);
            } else {
                setLoading(true);
            }
            try {
                const data = await fetchUnitImages(forceRefresh);
                if (data.length > 0) {
                    setAllImages(data);
                    const { image: picked, used } = pickRandomFrom(data, []);
                    setImage(picked);
                    setUsedIndices(used);
                } else if (!cached || cached.length === 0) {
                    setAllImages([]);
                    setImage(null);
                }
            } catch (error) {
                console.error("Error fetching images:", error);
                if (!cached || cached.length === 0) {
                    setAllImages([]);
                    setImage(null);
                }
            } finally {
                setLoading(false);
            }
        },
        [pickRandomFrom]
    );

    useEffect(() => {
        if (!shouldShow) return;
        fetchAllImages();
        pruneCache().catch(() => { });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldShow]);

    useEffect(() => {
        if (!shouldShow) return;
        const unsubscribe = onImagesChanged(() => {
            usedIndicesRef.current = [];
            setUsedIndices([]);
            fetchAllImages(true);
        });
        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldShow, fetchAllImages]);

    useEffect(() => {
        if (shouldShow && allImages.length > 0) {
            const { image: picked, used } = pickRandomFrom(
                allImages,
                usedIndicesRef.current
            );
            setImage(picked);
            setUsedIndices(used);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [position, shouldShow]);

    useEffect(() => {
        if (!showFullscreen) return;
        const originalOverflow = document.body.style.overflow;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setShowFullscreen(false);
        };
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [showFullscreen]);

    const handleMultipleUpload = async (files: File[]) => {
        if (files.length === 0) {
            toast({ title: "Error", description: "Please select images" });
            return;
        }
        if (!canUpload) {
            toast({
                title: "Premium Required",
                description: "Only premium members can upload images",
            });
            return;
        }
        tap("success");
        setIsUploadingMultiple(true);
        let successCount = 0;
        let failCount = 0;
        const cloudName = "dpj5vprwf";
        const uploadPreset = "medrae_uploads";

        for (const f of files) {
            try {
                const formData = new FormData();
                formData.append("file", f);
                formData.append("upload_preset", uploadPreset);
                formData.append("folder", "unit_images");
                const res = await fetch(
                    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                    { method: "POST", body: formData }
                );
                if (!res.ok) throw new Error("Upload failed");
                const data = await res.json();
                const { error } = await supabase.from("unit_images").insert({
                    unit_code: "GENERAL",
                    image_url: data.secure_url,
                    cloudinary_public_id: data.public_id,
                    caption: caption || "Medrae Nursing Platform",
                    user_id: user?.id,
                });
                if (error) throw error;
                successCount++;
            } catch (error: any) {
                failCount++;
                console.error("Upload error:", error);
            }
        }

        setIsUploadingMultiple(false);
        setUploadQueue([]);

        if (successCount > 0) {
            invalidateListCache();
            emitImagesChanged();
            usedIndicesRef.current = [];
            setUsedIndices([]);
            toast({
                title: "Success",
                description: `${successCount} image${successCount > 1 ? "s" : ""
                    } uploaded${failCount > 0 ? `, ${failCount} failed` : ""}`,
            });
            setShowUpload(false);
            await fetchAllImages(true);
        } else {
            toast({ title: "Error", description: "All uploads failed" });
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast({ title: "Error", description: "Please select an image" });
            return;
        }
        if (!canUpload) {
            toast({
                title: "Premium Required",
                description: "Only premium members can upload images",
            });
            return;
        }
        tap("success");
        setUploading(true);
        try {
            const cloudName = "dpj5vprwf";
            const uploadPreset = "medrae_uploads";
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", uploadPreset);
            formData.append("folder", "unit_images");
            const res = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                { method: "POST", body: formData }
            );
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error?.message || "Upload failed");
            }
            const data = await res.json();
            const { error } = await supabase.from("unit_images").insert({
                unit_code: "GENERAL",
                image_url: data.secure_url,
                cloudinary_public_id: data.public_id,
                caption: caption || "Medrae Nursing Platform",
                user_id: user?.id,
            });
            if (error) throw error;
            invalidateListCache();
            emitImagesChanged();
            usedIndicesRef.current = [];
            setUsedIndices([]);
            toast({ title: "Success", description: "Image uploaded!" });
            setFile(null);
            setCaption("");
            setShowUpload(false);
            setUploadQueue([]);
            await fetchAllImages(true);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.message || "Upload failed",
            });
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const fileArray = Array.from(files);
            setUploadQueue((prev) => [...prev, ...fileArray]);
            if (fileArray.length > 1) {
                handleMultipleUpload(fileArray);
            } else {
                setFile(fileArray[0]);
            }
        }
        e.target.value = "";
    };

    const handleDelete = async (imageId: string) => {
        if (!confirm("Delete this image?")) return;
        tap("warning");
        setDeleting(true);
        try {
            const deleted = allImages.find((img) => img.id === imageId);
            const { error } = await supabase
                .from("unit_images")
                .delete()
                .eq("id", imageId);
            if (error) throw error;
            if (deleted?.image_url) {
                deleteCachedImage(deleted.image_url).catch(() => { });
            }
            invalidateListCache();
            emitImagesChanged();
            usedIndicesRef.current = [];
            setUsedIndices([]);
            toast({ title: "Deleted", description: "Image removed" });
            const remaining = allImages.filter((img) => img.id !== imageId);
            setAllImages(remaining);
            if (remaining.length > 0) {
                const { image: picked, used } = pickRandomFrom(remaining, []);
                setImage(picked);
                setUsedIndices(used);
            } else {
                setImage(null);
            }
        } catch {
            toast({ title: "Error", description: "Failed to delete" });
        } finally {
            setDeleting(false);
        }
    };

    const toggleUpload = () => {
        if (!canUpload) {
            toast({
                title: "Premium Feature",
                description:
                    "Upgrade to Premium to share promotions and study images",
                duration: 5000,
            });
            return;
        }
        tap();
        setShowUpload(!showUpload);
    };

    if (!shouldShow) return null;

    if (loading) {
        return (
            <div className="col-span-1 sm:col-span-2 lg:col-span-1 my-2 px-0 h-full">
                <div className="rounded-2xl overflow-hidden
                                bg-white dark:bg-[#161b22]
                                animate-pulse h-full">
                    <div
                        className="w-full h-full bg-slate-100 dark:bg-white/[0.06]"
                        style={{ aspectRatio: "4/3" }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="col-span-1 sm:col-span-2 lg:col-span-1 mt-0 mb-6 px-0 relative group h-full flex flex-col">
            {/* ─── UPLOAD PROMPT ─────────────────────────────── */}
            {user && (
                <div className="mb-3 max-w-full flex-shrink-0">
                    <button
                        onClick={toggleUpload}
                        className="w-full flex items-center gap-3 p-3 rounded-xl
                                   bg-white dark:bg-[#161b22]
                                   active:scale-[0.99] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        <img
                            src="/pwa-192x192.png"
                            alt="Medrae Logo"
                            className="w-10 h-10 rounded-full object-cover shrink-0
                                       ring-2 ring-slate-200 dark:ring-white/[0.08]"
                        />
                        <div className="flex-1 text-left min-w-0">
                            {isPremium ? (
                                <p className="text-sm font-medium
                                              text-slate-700 dark:text-slate-200
                                              flex items-center gap-1.5 flex-wrap">
                                    <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                    <span className="truncate">
                                        Share a promotion
                                    </span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider
                                                     bg-amber-50 dark:bg-amber-400/10
                                                     text-amber-700 dark:text-amber-400
                                                     px-1.5 py-0.5 rounded-full">
                                        Pro
                                    </span>
                                </p>
                            ) : (
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400
                                              flex items-center gap-1.5">
                                    <Lock className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">
                                        Premium feature — upgrade to share
                                    </span>
                                </p>
                            )}
                        </div>
                        <Upload className="h-5 w-5 text-slate-400 shrink-0" />
                    </button>
                </div>
            )}

            {/* ─── UPLOAD CARD ───────────────────────────────── */}
            <AnimatePresence>
                {showUpload && canUpload && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-4 rounded-2xl overflow-hidden flex-shrink-0
                                   bg-white dark:bg-[#161b22] shadow-sm"
                    >
                        <div className="flex items-center justify-between px-4 py-3
                                        border-b border-slate-100 dark:border-white/[0.04]">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-violet-600
                                                flex items-center justify-center
                                                text-white text-xs font-bold shrink-0">
                                    {user?.email?.[0]?.toUpperCase() || "U"}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                        Create post
                                    </p>
                                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider
                                                    text-amber-600 dark:text-amber-400 mt-0.5">
                                        <Crown className="h-3 w-3" />
                                        Premium member
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    tap();
                                    setShowUpload(false);
                                    setFile(null);
                                    setCaption("");
                                    setUploadQueue([]);
                                }}
                                className="h-9 w-9 rounded-full flex items-center justify-center
                                           text-slate-600 dark:text-slate-300
                                           active:bg-slate-100 dark:active:bg-white/5"
                                style={{ touchAction: "manipulation" }}
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="p-4 space-y-3">
                            <Input
                                placeholder="What promotion or opportunity would you like to share?"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                className="text-sm
                                           bg-slate-50 dark:bg-[#0d1117]
                                           border-0 rounded-xl
                                           focus-visible:ring-2 focus-visible:ring-blue-500/30"
                            />

                            {uploadQueue.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                    {uploadQueue.map((f, index) => (
                                        <div
                                            key={index}
                                            className="relative aspect-square rounded-xl overflow-hidden
                                                       bg-slate-100 dark:bg-white/[0.06]"
                                        >
                                            <img
                                                src={URL.createObjectURL(f)}
                                                alt={`Preview ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                onClick={() => {
                                                    tap();
                                                    setUploadQueue(
                                                        uploadQueue.filter(
                                                            (_, i) => i !== index
                                                        )
                                                    );
                                                }}
                                                className="absolute top-1 right-1 h-6 w-6 rounded-full
                                                           bg-rose-600 text-white
                                                           flex items-center justify-center
                                                           active:scale-[0.92] transition-transform"
                                                style={{ touchAction: "manipulation" }}
                                                aria-label="Remove image"
                                            >
                                                <X className="h-3 w-3" strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between gap-2">
                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileSelection}
                                        multiple
                                        className="hidden"
                                    />
                                    <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl
                                                    bg-slate-100 dark:bg-white/[0.06]
                                                    text-slate-700 dark:text-slate-200
                                                    text-[12px] font-bold
                                                    active:scale-[0.97] transition-transform"
                                        style={{ touchAction: "manipulation" }}>
                                        <ImageIcon className="h-3.5 w-3.5" />
                                        Add photos
                                    </div>
                                </label>

                                <div className="flex items-center gap-2">
                                    {uploadQueue.length > 1 && (
                                        <Button
                                            onClick={() => handleMultipleUpload(uploadQueue)}
                                            disabled={isUploadingMultiple}
                                            size="sm"
                                            className="h-9 rounded-xl bg-blue-600 hover:bg-blue-600 text-white text-[12px] font-bold"
                                        >
                                            {isUploadingMultiple ? (
                                                <>
                                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                                    Uploading…
                                                </>
                                            ) : (
                                                `Post all (${uploadQueue.length})`
                                            )}
                                        </Button>
                                    )}
                                    {file && uploadQueue.length === 1 && (
                                        <Button
                                            onClick={handleUpload}
                                            disabled={uploading}
                                            size="sm"
                                            className="h-9 rounded-xl bg-blue-600 hover:bg-blue-600 text-white text-[12px] font-bold"
                                        >
                                            {uploading ? (
                                                <>
                                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                                    Posting…
                                                </>
                                            ) : (
                                                "Post"
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── IMAGE CARD ────────────────────────────────── */}
            {image ? (
                <Card className="overflow-hidden border-0
                                  bg-white dark:bg-[#161b22]
                                  shadow-sm
                                  flex-1 flex flex-col rounded-2xl">
                    <div
                        className="relative overflow-hidden flex-shrink-0 w-full"
                        style={{ aspectRatio: "4/3" }}
                    >
                        <button
                            className="block w-full h-full cursor-zoom-in"
                            onClick={() => {
                                tap();
                                setShowFullscreen(true);
                            }}
                            type="button"
                            aria-label="View image full screen"
                            style={{ touchAction: "manipulation" }}
                        >
                            <ProgressiveImage
                                src={image.image_url}
                                alt={image.caption || "Medrae Nursing Platform"}
                                className="block w-full h-full"
                            />
                        </button>

                        <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                            <span className="inline-flex items-center gap-1
                                             bg-white/90 dark:bg-[#0d1117]/90
                                             backdrop-blur-md
                                             text-blue-700 dark:text-blue-400
                                             text-[10px] font-bold
                                             px-2 py-0.5 rounded-lg">
                                <ImageIcon className="h-3 w-3" />
                                Promotion
                            </span>
                            {image.user_id === user?.id && (
                                <span className="inline-flex items-center gap-1
                                                 bg-white/90 dark:bg-[#0d1117]/90
                                                 backdrop-blur-md
                                                 text-amber-700 dark:text-amber-400
                                                 text-[10px] font-bold
                                                 px-2 py-0.5 rounded-lg">
                                    <Crown className="h-3 w-3" />
                                    Your post
                                </span>
                            )}
                        </div>

                        {user && image.user_id === user.id && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(image.id);
                                }}
                                disabled={deleting}
                                className="absolute top-3 right-3 h-8 w-8 rounded-full
                                           bg-rose-600 text-white
                                           flex items-center justify-center
                                           active:scale-[0.92] transition-transform
                                           z-10 disabled:opacity-60"
                                type="button"
                                aria-label="Delete post"
                                style={{ touchAction: "manipulation" }}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        )}

                        <div className="absolute bottom-3 right-3
                                        bg-black/50 text-white
                                        text-[10px] font-medium
                                        px-2.5 py-1 rounded-full
                                        backdrop-blur-sm
                                        flex items-center gap-1.5 z-10">
                            <Eye className="h-3 w-3" />
                            Tap to view
                        </div>
                    </div>

                    {image.caption && (
                        <CardContent className="p-3 flex-1">
                            <p className="text-sm text-slate-800 dark:text-slate-200 font-medium line-clamp-2">
                                {image.caption}
                            </p>
                        </CardContent>
                    )}

                    <CardFooter className="px-3 py-2
                                           border-t border-slate-100 dark:border-white/[0.04]
                                           flex justify-between items-center mt-auto gap-2">
                        <Badge
                            variant="outline"
                            className="text-[9px] font-bold uppercase tracking-wider
                                       border-0
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-600 dark:text-slate-300
                                       gap-1"
                        >
                            <Sparkles className="h-2.5 w-2.5" />
                            Medrae community
                        </Badge>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                            {image.user_id === user?.id
                                ? "Posted by you"
                                : "Community member"}
                        </span>
                    </CardFooter>
                </Card>
            ) : (
                /* ─── EMPTY STATE ────────────────────────────── */
                <Card className="overflow-hidden border-0
                                  bg-slate-50 dark:bg-[#0d1117]
                                  flex-1 flex flex-col rounded-2xl">
                    <div
                        className="flex flex-col items-center justify-center flex-1 p-6 text-center"
                        style={{ aspectRatio: "4/3" }}
                    >
                        <div className="h-12 w-12 rounded-full
                                        bg-slate-100 dark:bg-white/[0.06]
                                        flex items-center justify-center mb-3">
                            <ImageIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            No promotions yet
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">
                            {isPremium
                                ? "Share your first promotion"
                                : "Premium members can post promotions"}
                        </p>
                        {user && (
                            <button
                                onClick={toggleUpload}
                                className="mt-3 inline-flex items-center gap-1.5 h-9 px-3 rounded-xl
                                           bg-blue-600 text-white
                                           text-[12px] font-bold
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                <Upload className="h-3.5 w-3.5" />
                                {isPremium ? "Post promotion" : "Upgrade to post"}
                            </button>
                        )}
                    </div>
                </Card>
            )}

            {/* ─── FULLSCREEN VIEWER ─────────────────────────── */}
            {image && showFullscreen && (
                <div
                    className="fixed inset-0 z-[99999] flex items-center justify-center
                               bg-black p-0 sm:p-6"
                    onClick={() => setShowFullscreen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Full screen image viewer"
                >
                    <button
                        onClick={() => {
                            tap();
                            setShowFullscreen(false);
                        }}
                        className="absolute top-3 right-3 sm:top-5 sm:right-5
                                   h-10 w-10 rounded-full
                                   bg-white/[0.12] text-white
                                   flex items-center justify-center
                                   active:scale-[0.92] transition-transform
                                   z-10"
                        type="button"
                        aria-label="Close"
                        style={{ touchAction: "manipulation" }}
                    >
                        <X className="h-5 w-5" strokeWidth={2.5} />
                    </button>

                    <div
                        className="w-full h-full flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={image.image_url}
                            alt={image.caption || "Medrae Nursing Platform"}
                            className="w-full h-full object-contain"
                            style={{ maxHeight: "100vh", maxWidth: "100vw" }}
                        />
                    </div>

                    {image.caption && (
                        <div className="absolute bottom-0 left-0 right-0
                                        bg-black/70 backdrop-blur-sm
                                        px-4 py-3 text-center
                                        text-sm font-medium text-white">
                            {image.caption}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}