"use client";

import { useState, useMemo } from "react";
import { ImagePlus } from "lucide-react";
import FeedImagesGrid from "@/components/Feed/FeedImagesGrid";
import FeedImagePostModal from "@/components/Feed/FeedImagePostModal";
import FeedMediaPanel from "@/components/Feed/FeedMediaPanel";

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

export default function FeedImagesTab(props: Props) {
    const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* ── TOP BAR: upload button only (not a feed card) ── */}
            <div className="bg-white dark:bg-gray-900 px-2 py-2 flex items-center gap-2">
                <img
                    src={
                        props.user?.user_metadata?.avatar_url ||
                        "/UsersAvatar.jpg"
                    }
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                    alt="User"
                    loading="lazy"
                />
                <button
                    onClick={() => props.setShowUpload(!props.showUpload)}
                    className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 text-sm transition-colors"
                >
                    <ImagePlus size={16} />
                    <span className="font-medium">
                        Share a photo
                    </span>
                </button>
            </div>

            {/* ── UPLOAD PANEL (full FeedMediaPanel ONLY when uploading) ── */}
            {props.showUpload && (
                <div className="bg-white dark:bg-gray-900 px-2 pb-2">
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
                </div>
            )}

            {/* ── THE GRID ── */}
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

            {/* ── POST MODAL (opens on thumbnail tap) ── */}
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