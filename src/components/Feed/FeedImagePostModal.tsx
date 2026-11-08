"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";
import FeedMediaPanel from "@/components/Feed/FeedMediaPanel";

interface Props {
    open: boolean;
    groupKey: string | null;
    feedImages: any[];
    onClose: () => void;

    // Pass-through props for FeedMediaPanel (the modal re-uses it)
    loadedImages: Record<string, boolean>;
    setLoadedImages: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    session: any;
    supabase: any;
    user: any;
    openViewer: (img: any) => void;
    handleDeleteImage: (img: any) => void;
    showUpload: boolean;
    setShowUpload: React.Dispatch<React.SetStateAction<boolean>>;
    uploadFiles: File[];
    setUploadFiles: React.Dispatch<React.SetStateAction<File[]>>;
    uploading: boolean;
    handleImageUpload: (isRelated?: boolean) => void;
    imageTitle: string;
    setImageTitle: React.Dispatch<React.SetStateAction<string>>;
    imageDescription: string;
    setImageDescription: React.Dispatch<React.SetStateAction<string>>;
}

export default function FeedImagePostModal({
    open,
    groupKey,
    feedImages,
    onClose,
    ...panelProps
}: Props) {
    // Lock body scroll
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    if (typeof document === "undefined") return null;

    return createPortal(
        <AnimatePresence>
            {open && groupKey && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 z-[2147483647] bg-black/90 backdrop-blur-sm flex items-center justify-center p-0 md:p-6"
                    onClick={onClose}
                >
                    {/* Close button — top right, always visible */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="absolute top-4 right-4 z-20 bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <X size={22} />
                    </button>

                    {/* The panel itself, centered, with a max width */}
                    <motion.div
                        initial={{ scale: 0.94, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.94, y: 20 }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 26,
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md md:max-w-lg max-h-[92vh] overflow-y-auto  custom-scrollbar bg-white dark:bg-zinc-900 rounded-none md:rounded-2xl"
                    >
                        <FeedMediaPanel
                            index={0}
                            groupKey={groupKey}
                            feedImages={feedImages}
                            loadedImages={panelProps.loadedImages}
                            setLoadedImages={panelProps.setLoadedImages}
                            session={panelProps.session}
                            supabase={panelProps.supabase}
                            user={panelProps.user}
                            openViewer={panelProps.openViewer}
                            handleDeleteImage={panelProps.handleDeleteImage}
                            showUpload={false}
                            setShowUpload={panelProps.setShowUpload}
                            uploadFiles={panelProps.uploadFiles}
                            setUploadFiles={panelProps.setUploadFiles}
                            uploading={panelProps.uploading}
                            handleImageUpload={panelProps.handleImageUpload}
                            imageTitle={panelProps.imageTitle}
                            setImageTitle={panelProps.setImageTitle}
                            imageDescription={panelProps.imageDescription}
                            setImageDescription={panelProps.setImageDescription}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}