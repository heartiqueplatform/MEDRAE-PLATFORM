"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import FeedImagesGrid from "@/components/Feed/FeedImagesGrid";
import FeedImagePostModal from "@/components/Feed/FeedImagePostModal";
import FeedMediaPanel from "@/components/Feed/FeedMediaPanel";
import { playSound } from "@/lib/soundManager";

interface Props {
    feedImages: any[];
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
    hasMoreImages: boolean;
    isLoadingImages: boolean;
    onLoadMore: () => void;
}

const vibrate = (p: number | number[] = 12) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};

const tap = () => {
    playSound("ui-tap");
    vibrate(12);
};

export default function FeedImagesTab(props: Props) {
    const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* ── COMPOSER PROMPT ─────────────────────────── */}
            <div className="px-1 pt-2">
                <button
                    onClick={() => {
                        tap();
                        props.setShowUpload(true);
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-2xl
                               bg-white dark:bg-[#161b22]
                               active:scale-[0.99] transition-transform"
                    style={{ touchAction: "manipulation" }}
                >
                    <img
                        src={
                            props.user?.user_metadata?.avatar_url ||
                            "/UsersAvatar.jpg"
                        }
                        className="w-9 h-9 rounded-full object-cover shrink-0
                                   ring-2 ring-slate-200 dark:ring-white/[0.08]"
                        alt="User"
                        loading="lazy"
                    />
                    <div className="flex-1 flex items-center gap-1.5
                                    h-10 px-3.5 rounded-full
                                    bg-slate-100 dark:bg-white/[0.06]">
                        <ImagePlus
                            size={15}
                            className="text-slate-500 dark:text-slate-400 shrink-0"
                        />
                        <span className="text-[12.5px] font-medium
                                         text-slate-500 dark:text-slate-400 truncate">
                            Share a photo
                        </span>
                    </div>
                </button>
            </div>

            {/* ── COMPOSER MODAL (mounted, but visually hidden until showUpload=true) ── */}
            <FeedMediaPanel
                index={0}
                groupKey="__upload__"
                feedImages={[]}
                loadedImages={props.loadedImages}
                setLoadedImages={props.setLoadedImages}
                session={props.session}
                supabase={props.supabase}
                user={props.user}
                openViewer={props.openViewer}
                handleDeleteImage={props.handleDeleteImage}
                showUpload={props.showUpload}
                setShowUpload={props.setShowUpload}
                uploadFiles={props.uploadFiles}
                setUploadFiles={props.setUploadFiles}
                uploading={props.uploading}
                handleImageUpload={props.handleImageUpload}
                imageTitle={props.imageTitle}
                setImageTitle={props.setImageTitle}
                imageDescription={props.imageDescription}
                setImageDescription={props.setImageDescription}
            />

            {/* ── GRID ────────────────────────────────────── */}
            <div className="pt-2">
                <FeedImagesGrid
                    feedImages={props.feedImages}
                    loadedImages={props.loadedImages}
                    setLoadedImages={props.setLoadedImages}
                    user={props.user}
                    hasMoreImages={props.hasMoreImages}
                    isLoadingImages={props.isLoadingImages}
                    onLoadMore={props.onLoadMore}
                    onOpenPost={(groupKey) => setOpenGroupKey(groupKey)}
                />
            </div>

            {/* ── POST MODAL ──────────────────────────────── */}
            <FeedImagePostModal
                open={!!openGroupKey}
                groupKey={openGroupKey}
                feedImages={props.feedImages}
                onClose={() => setOpenGroupKey(null)}
                loadedImages={props.loadedImages}
                setLoadedImages={props.setLoadedImages}
                session={props.session}
                supabase={props.supabase}
                user={props.user}
                openViewer={props.openViewer}
                handleDeleteImage={props.handleDeleteImage}
                showUpload={props.showUpload}
                setShowUpload={props.setShowUpload}
                uploadFiles={props.uploadFiles}
                setUploadFiles={props.setUploadFiles}
                uploading={props.uploading}
                handleImageUpload={props.handleImageUpload}
                imageTitle={props.imageTitle}
                setImageTitle={props.setImageTitle}
                imageDescription={props.imageDescription}
                setImageDescription={props.setImageDescription}
            />
        </div>
    );
}