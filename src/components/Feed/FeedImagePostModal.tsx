"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import FeedMediaPanel from "@/components/Feed/FeedMediaPanel";
import { playSound } from "@/lib/soundManager";

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

const tap = () => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
    }
};

export default function FeedImagePostModal({
    open,
    groupKey,
    feedImages,
    onClose,
    ...panelProps
}: Props) {
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
                    className="fixed inset-0 z-[2147483647] bg-black/70
                               flex items-end sm:items-center justify-center sm:p-6"
                    onClick={onClose}
                >
                    {/* Close button — always visible, tap-safe */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            tap();
                            onClose();
                        }}
                        className="absolute top-3 right-3 z-20
                                   h-10 w-10 rounded-full
                                   bg-white/[0.12] text-white
                                   flex items-center justify-center
                                   active:scale-[0.92] transition-transform
                                   backdrop-blur-sm"
                        style={{ touchAction: "manipulation" }}
                        aria-label="Close"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>

                    {/* Post card — panel with composer disabled */}
                    <motion.div
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 30, opacity: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 320,
                            damping: 30,
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full sm:max-w-lg
                                   max-h-[92dvh] sm:max-h-[90vh]
                                   overflow-y-auto no-scrollbar overscroll-contain
                                   bg-white dark:bg-[#161b22]
                                   rounded-t-2xl sm:rounded-2xl
                                   pb-[env(safe-area-inset-bottom)] sm:pb-0"
                        style={{ WebkitOverflowScrolling: "touch" }}
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