"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, X, Image, Loader2, Crown, Lock, Sparkles, Eye } from "lucide-react";
import { useUser } from "@supabase/auth-helpers-react";
import { toast } from "@/hooks/use-toast";
import { usePremiumFeature } from "@/hooks/usePremiumFeature";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

// 🔥 Cache helpers
import {
    getCachedImage,
    cacheImage,
    pruneCache,
    deleteCachedImage,
} from "@/lib/imageCache";
import {
    fetchUnitImages,
    getCachedList,
    invalidateListCache,
    UnitImage,
} from "@/lib/unitImagesCache";

// 🔥 Global event bus — keeps all UnitPics instances in sync
import { onImagesChanged, emitImagesChanged } from "@/lib/imageEvents";

interface UnitPicsProps {
    position: number;
}

/* ============================================================
   PROGRESSIVE IMAGE — IndexedDB-backed
   ============================================================ */
const ProgressiveImage = ({
    src,
    alt,
    className,
    style,
    onClick
}: {
    src: string;
    alt: string;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
}) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [isInView, setIsInView] = useState(false);
    const [lowQualitySrc, setLowQualitySrc] = useState<string>('');
    const [highQualityLoaded, setHighQualityLoaded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const objectUrlRef = useRef<string | null>(null);

    const getLowQualityUrl = useCallback((originalUrl: string) => {
        if (!originalUrl) return '';
        if (originalUrl.includes('cloudinary.com')) {
            return originalUrl.replace('/upload/', '/upload/w_100,q_10/');
        }
        return originalUrl;
    }, []);

    // Intersection Observer — lazy load when near viewport
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.unobserve(entry.target);
                    }
                });
            },
            { rootMargin: '200px', threshold: 0.1 }
        );

        observer.observe(containerRef.current);

        return () => {
            observer.disconnect();
        };
    }, []);

    // 🔥 Cache-aware image loading: IndexedDB → network → fallback
    useEffect(() => {
        if (!isInView || !src) return;
        let cancelled = false;

        setLowQualitySrc(getLowQualityUrl(src));
        setHighQualityLoaded(false);
        setObjectUrl(null);

        (async () => {
            // 1. Try IndexedDB blob cache
            const cached = await getCachedImage(src);
            if (cancelled) return;

            if (cached) {
                const url = URL.createObjectURL(cached);
                objectUrlRef.current = url;
                setObjectUrl(url);
                setHighQualityLoaded(true);
                return;
            }

            // 2. Cache miss → fetch once, then store
            try {
                const res = await fetch(src, { cache: 'force-cache' });
                if (!res.ok) throw new Error('Fetch failed');
                const blob = await res.blob();
                if (cancelled) return;

                const url = URL.createObjectURL(blob);
                objectUrlRef.current = url;
                setObjectUrl(url);
                setHighQualityLoaded(true);

                // Store in background
                cacheImage(src, blob).catch(() => { });
            } catch {
                // Fallback: raw URL (browser HTTP cache handles it)
                if (!cancelled) {
                    setObjectUrl(src);
                    setHighQualityLoaded(true);
                }
            }
        })();

        return () => {
            cancelled = true;
            if (objectUrlRef.current && objectUrlRef.current.startsWith('blob:')) {
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
            className="relative w-full bg-gray-100 dark:bg-muted/30"
            style={{ aspectRatio: '4/3' }}
        >
            {!isInView ? (
                <div className="w-full h-full bg-gray-200 dark:bg-muted/20" />
            ) : (
                <>
                    {/* Blurred low-quality placeholder */}
                    {!highQualityLoaded && (
                        <img
                            src={lowQualitySrc || src}
                            alt={alt}
                            className={`${className || ''} absolute inset-0 w-full h-full`}
                            style={{
                                ...style,
                                objectFit: 'cover',
                                filter: 'blur(20px)',
                                transform: 'scale(1.02)',
                                transition: 'filter 0.8s ease-out, transform 0.8s ease-out',
                                width: '100%',
                                height: '100%',
                            }}
                            loading="lazy"
                            decoding="async"
                        />
                    )}

                    {/* High quality (cached blob or direct URL) */}
                    <img
                        src={displaySrc}
                        alt={alt}
                        className={`${className || ''} absolute inset-0 w-full h-full transition-opacity duration-700 ${highQualityLoaded ? 'opacity-100' : 'opacity-0'
                            }`}
                        style={{
                            ...style,
                            objectFit: 'cover',
                            width: '100%',
                            height: '100%',
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
    const [caption, setCaption] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [uploadQueue, setUploadQueue] = useState<File[]>([]);
    const [isUploadingMultiple, setIsUploadingMultiple] = useState(false);

    // Ref mirror of usedIndices so fetchAllImages can read fresh value
    const usedIndicesRef = useRef<number[]>([]);
    useEffect(() => {
        usedIndicesRef.current = usedIndices;
    }, [usedIndices]);

    const shouldShow = position % 4 === 0;
    const canUpload = isPremium && user;

    /* ============================================================
       RANDOM IMAGE PICKER — pure function on given list + used set
       ============================================================ */
    const pickRandomFrom = useCallback(
        (images: UnitImage[], used: number[]): { image: UnitImage | null; used: number[] } => {
            if (images.length === 0) {
                return { image: null, used: [] };
            }

            const availableIndices = images
                .map((_, i) => i)
                .filter((i) => !used.includes(i));

            if (availableIndices.length === 0) {
                // Cycle complete → reset and pick fresh
                const idx = Math.floor(Math.random() * images.length);
                return { image: images[idx], used: [idx] };
            }

            const idx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
            return { image: images[idx], used: [...used, idx] };
        },
        []
    );

    /* ============================================================
       FETCH — cache-aware, event-driven
       - Instant paint from localStorage
       - Background staleness check (only if >6h old)
       - Full refetch only when data actually changed or forced
       ============================================================ */
    const fetchAllImages = useCallback(
        async (forceRefresh = false) => {
            // ⚡ 1. Instant paint from localStorage
            const cached = getCachedList();
            if (cached && cached.length > 0) {
                setAllImages(cached);
                const { image: picked, used } = pickRandomFrom(cached, usedIndicesRef.current);
                setImage(picked);
                setUsedIndices(used);
                setLoading(false);
            } else {
                setLoading(true);
            }

            try {
                // ⚡ 2. Smart fetch — cache / minimal-check / full-fetch
                const data = await fetchUnitImages(forceRefresh);

                if (data.length > 0) {
                    setAllImages(data);
                    // Re-pick whenever data changes (upload/delete/refresh)
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

    /* ============================================================
       INITIAL MOUNT + LRU prune
       ============================================================ */
    useEffect(() => {
        if (!shouldShow) return;
        fetchAllImages();
        pruneCache().catch(() => { });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldShow]);

    /* ============================================================
       🌐 GLOBAL SYNC — listen for changes from OTHER UnitPics
       When position 0 uploads → position 4 & 8 get notified → refetch
       ============================================================ */
    useEffect(() => {
        if (!shouldShow) return;

        const unsubscribe = onImagesChanged(() => {
            // Reset usedIndices so the new/removed image can surface
            usedIndicesRef.current = [];
            setUsedIndices([]);
            fetchAllImages(true);
        });

        return () => {
            unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldShow, fetchAllImages]);

    /* ============================================================
       Re-pick when `position` changes (new slot scrolled into view)
       ============================================================ */
    useEffect(() => {
        if (shouldShow && allImages.length > 0) {
            const { image: picked, used } = pickRandomFrom(allImages, usedIndicesRef.current);
            setImage(picked);
            setUsedIndices(used);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [position, shouldShow]);

    /* ============================================================
       FULLSCREEN body lock + ESC handler
       ============================================================ */
    useEffect(() => {
        if (!showFullscreen) return;

        const originalOverflow = document.body.style.overflow;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setShowFullscreen(false);
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [showFullscreen]);

    /* ============================================================
       MULTIPLE UPLOAD — invalidate list, notify global bus
       ============================================================ */
    const handleMultipleUpload = async (files: File[]) => {
        if (files.length === 0) {
            toast({ title: "Error", description: "Please select images" });
            return;
        }

        if (!canUpload) {
            toast({
                title: "Premium Required",
                description: "Only premium members can upload images"
            });
            return;
        }

        setIsUploadingMultiple(true);
        let successCount = 0;
        let failCount = 0;

        const cloudName = 'dpj5vprwf';
        const uploadPreset = 'medrae_uploads';

        for (const f of files) {
            try {
                const formData = new FormData();
                formData.append('file', f);
                formData.append('upload_preset', uploadPreset);
                formData.append('folder', 'unit_images');

                const res = await fetch(
                    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                    { method: 'POST', body: formData }
                );

                if (!res.ok) throw new Error('Upload failed');

                const data = await res.json();

                const { error } = await supabase
                    .from('unit_images')
                    .insert({
                        unit_code: 'GENERAL',
                        image_url: data.secure_url,
                        cloudinary_public_id: data.public_id,
                        caption: caption || 'Medrae Nursing Platform',
                        user_id: user?.id
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
            // 🔥 1. Wipe localStorage list
            invalidateListCache();
            // 🔥 2. Notify ALL UnitPics instances
            emitImagesChanged();
            // 🔥 3. Reset local picker
            usedIndicesRef.current = [];
            setUsedIndices([]);

            toast({
                title: "Success",
                description: `${successCount} image${successCount > 1 ? 's' : ''} uploaded successfully${failCount > 0 ? `, ${failCount} failed` : ''}`
            });
            setShowUpload(false);
            await fetchAllImages(true);
        } else {
            toast({ title: "Error", description: "All uploads failed" });
        }
    };

    /* ============================================================
       SINGLE UPLOAD — invalidate list, notify global bus
       ============================================================ */
    const handleUpload = async () => {
        if (!file) {
            toast({ title: "Error", description: "Please select an image" });
            return;
        }

        if (!canUpload) {
            toast({
                title: "Premium Required",
                description: "Only premium members can upload images"
            });
            return;
        }

        setUploading(true);
        try {
            const cloudName = 'dpj5vprwf';
            const uploadPreset = 'medrae_uploads';

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);
            formData.append('folder', 'unit_images');

            const res = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                { method: 'POST', body: formData }
            );

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error?.message || 'Upload failed');
            }

            const data = await res.json();

            const { error } = await supabase
                .from('unit_images')
                .insert({
                    unit_code: 'GENERAL',
                    image_url: data.secure_url,
                    cloudinary_public_id: data.public_id,
                    caption: caption || 'Medrae Nursing Platform',
                    user_id: user?.id
                });

            if (error) throw error;

            // 🔥 Invalidate + broadcast + reset picker
            invalidateListCache();
            emitImagesChanged();
            usedIndicesRef.current = [];
            setUsedIndices([]);

            toast({ title: "Success", description: "Image uploaded!" });
            setFile(null);
            setCaption('');
            setShowUpload(false);
            setUploadQueue([]);
            await fetchAllImages(true);

        } catch (error: any) {
            toast({ title: "Error", description: error?.message || "Upload failed" });
        } finally {
            setUploading(false);
        }
    };

    /* ============================================================
       FILE SELECTION
       ============================================================ */
    const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const fileArray = Array.from(files);
            setUploadQueue(prev => [...prev, ...fileArray]);
            if (fileArray.length > 1) {
                handleMultipleUpload(fileArray);
            } else {
                setFile(fileArray[0]);
            }
        }
        e.target.value = '';
    };

    /* ============================================================
       DELETE — invalidate + broadcast + eager blob cleanup
       ============================================================ */
    const handleDelete = async (imageId: string) => {
        if (!confirm('Delete this image?')) return;

        setDeleting(true);
        try {
            // Find the image we're about to delete (for blob cleanup)
            const deleted = allImages.find(img => img.id === imageId);

            const { error } = await supabase
                .from('unit_images')
                .delete()
                .eq('id', imageId);

            if (error) throw error;

            // 🔥 1. Eagerly drop the blob from IndexedDB (free space instantly)
            if (deleted?.image_url) {
                deleteCachedImage(deleted.image_url).catch(() => { });
            }

            // 🔥 2. Wipe list cache
            invalidateListCache();
            // 🔥 3. Notify all UnitPics instances
            emitImagesChanged();
            // 🔥 4. Reset local picker
            usedIndicesRef.current = [];
            setUsedIndices([]);

            toast({ title: "Deleted", description: "Image removed" });

            const remaining = allImages.filter(img => img.id !== imageId);
            setAllImages(remaining);

            if (remaining.length > 0) {
                const { image: picked, used } = pickRandomFrom(remaining, []);
                setImage(picked);
                setUsedIndices(used);
            } else {
                setImage(null);
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete" });
        } finally {
            setDeleting(false);
        }
    };

    const toggleUpload = () => {
        if (!canUpload) {
            toast({
                title: "Premium Feature",
                description: "Upgrade to Premium to share promotions and study images",
                duration: 5000,
            });
            return;
        }
        setShowUpload(!showUpload);
    };

    if (!shouldShow) return null;

    if (loading) {
        return (
            <div className="col-span-1 sm:col-span-2 lg:col-span-1 my-2 px-0 h-full">
                <div className="rounded-xl overflow-hidden bg-white dark:bg-muted/30 border-0 shadow-sm animate-pulse h-full">
                    <div className="w-full h-full" style={{ aspectRatio: '4/3', background: '#e5e7eb' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="col-span-1 sm:col-span-2 lg:col-span-1 my-2 px-0 relative group h-full flex flex-col">
            {/* Facebook-style Upload Button */}
            {user && (
                <div className="mb-3 max-w-full flex-shrink-0">
                    <div
                        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        onClick={toggleUpload}
                    >
                        <img
                            src="/pwa-192x192.png"
                            alt="Medrae Logo"
                            className="w-10 h-10 rounded-full flex-shrink-0 object-cover border-2 border-gray-200 dark:border-gray-600"
                        />

                        <div className="flex-1">
                            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                                {isPremium ? (
                                    <span className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-amber-500" />
                                        Share a promotion or study image
                                        <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold ml-1">
                                            PRO
                                        </span>
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2 text-gray-400">
                                        <Lock className="w-4 h-4" />
                                        Premium feature - Upgrade to share
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                            <Upload className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            )}

            {/* Facebook-style Upload Card */}
            <AnimatePresence>
                {showUpload && canUpload && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-0 overflow-hidden flex-shrink-0"
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                                    {user?.email?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        Create Post
                                    </p>
                                    <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                        <Crown className="w-3 h-3" />
                                        <span>Premium Member</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowUpload(false);
                                    setFile(null);
                                    setCaption('');
                                    setUploadQueue([]);
                                }}
                                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                type="button"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-4">
                            <Input
                                placeholder="What promotion or opportunity would you like to share?"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                className="text-sm border-0 bg-gray-50 dark:bg-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500/20"
                            />

                            {uploadQueue.length > 0 && (
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    {uploadQueue.map((f, index) => (
                                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                                            <img
                                                src={URL.createObjectURL(f)}
                                                alt={`Preview ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                onClick={() => {
                                                    const newQueue = uploadQueue.filter((_, i) => i !== index);
                                                    setUploadQueue(newQueue);
                                                }}
                                                className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-600 rounded-full text-white transition-colors"
                                                type="button"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <label className="cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileSelection}
                                            multiple
                                            className="hidden"
                                        />
                                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm text-gray-700 dark:text-gray-300">
                                            <Image className="w-4 h-4" />
                                            Add Photos
                                        </div>
                                    </label>
                                    {uploadQueue.length > 0 && (
                                        <span className="text-xs text-gray-500">
                                            {uploadQueue.length} selected
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {uploadQueue.length > 1 && (
                                        <Button
                                            onClick={() => handleMultipleUpload(uploadQueue)}
                                            disabled={isUploadingMultiple}
                                            size="sm"
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            {isUploadingMultiple ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Uploading...
                                                </>
                                            ) : (
                                                `Post All (${uploadQueue.length})`
                                            )}
                                        </Button>
                                    )}
                                    {file && uploadQueue.length === 1 && (
                                        <Button
                                            onClick={handleUpload}
                                            disabled={uploading}
                                            size="sm"
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            {uploading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Posting...
                                                </>
                                            ) : (
                                                'Post'
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Professional Card Style Image Display */}
            {image ? (
                <Card className="overflow-hidden border-0 bg-white dark:bg-muted/30 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer flex-1 flex flex-col">
                    <div className="relative overflow-hidden flex-shrink-0 w-full" style={{ aspectRatio: '4/3' }}>
                        <button
                            className="block w-full h-full cursor-zoom-in"
                            onClick={() => setShowFullscreen(true)}
                            type="button"
                            aria-label="View image full screen"
                        >
                            <ProgressiveImage
                                src={image.image_url}
                                alt={image.caption || "Medrae Nursing Platform"}
                                className="block w-full h-full"
                            />
                        </button>

                        {/* Badge Overlay */}
                        <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                            <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-0 font-bold text-[10px] px-2.5 py-0.5">
                                <Image className="w-3 h-3 mr-1" />
                                Promotion
                            </Badge>
                            {image.user_id === user?.id && (
                                <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-0 font-bold text-[10px] px-2.5 py-0.5">
                                    <Crown className="w-3 h-3 mr-1" />
                                    Your Post
                                </Badge>
                            )}
                        </div>

                        {/* Delete Button */}
                        {user && image.user_id === user.id && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(image.id);
                                }}
                                disabled={deleting}
                                className="absolute top-3 right-3 bg-red-500/90 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity border-0 z-10"
                                type="button"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}

                        {/* View indicator */}
                        <div className="absolute bottom-3 right-3 bg-black/50 dark:bg-black/60 text-white text-[10px] px-2.5 py-1 rounded-full backdrop-blur-sm font-medium border-0 flex items-center gap-1.5 z-10">
                            <Eye className="w-3 h-3" />
                            Tap to view
                        </div>
                    </div>

                    {image.caption && (
                        <CardContent className="p-3 flex-1">
                            <p className="text-sm text-gray-800 dark:text-gray-200 font-medium line-clamp-2">
                                {image.caption}
                            </p>
                        </CardContent>
                    )}

                    <CardFooter className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center mt-auto">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] font-medium">
                                <Sparkles className="w-2.5 h-2.5 mr-1" />
                                Medrae Community
                            </Badge>
                        </div>
                        <div className="text-[10px] text-gray-400">
                            <span>Posted by {image.user_id === user?.id ? 'You' : 'Community Member'}</span>
                        </div>
                    </CardFooter>
                </Card>
            ) : (
                <Card className="overflow-hidden border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-muted/20 shadow-sm hover:shadow-md transition-all duration-300 group flex-1 flex flex-col">
                    <div className="flex flex-col items-center justify-center flex-1 p-8" style={{ aspectRatio: '4/3' }}>
                        <Image className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium text-center">
                            No promotions yet
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 text-center">
                            {isPremium ? 'Share your first promotion!' : 'Premium members can post promotions'}
                        </p>
                        {user && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-4 border-0 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                onClick={toggleUpload}
                                type="button"
                            >
                                <Upload className="w-3 h-3 mr-1" />
                                {isPremium ? 'Post Promotion' : 'Upgrade to Post'}
                            </Button>
                        )}
                    </div>
                </Card>
            )}

            {/* Fullscreen View */}
            {image && showFullscreen && (
                <div
                    className="fixed inset-0 z-[99999] flex items-center justify-center bg-black p-0 sm:p-6"
                    onClick={() => setShowFullscreen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Full screen image viewer"
                >
                    <button
                        className="absolute right-3 top-3 sm:right-5 sm:top-5 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20 z-10"
                        onClick={() => setShowFullscreen(false)}
                        type="button"
                        aria-label="Close full screen image"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div
                        className="w-full h-full flex items-center justify-center"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <img
                            src={image.image_url}
                            alt={image.caption || "Medrae Nursing Platform"}
                            className="w-full h-full object-contain"
                            style={{
                                maxHeight: '100vh',
                                maxWidth: '100vw'
                            }}
                        />
                    </div>

                    {image.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-5 pt-12 text-center text-sm font-medium text-white sm:text-base">
                            {image.caption}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}