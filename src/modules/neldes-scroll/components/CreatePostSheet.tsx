// src/modules/neldes-scroll/components/CreatePostSheet.tsx
// ============================================================
// Neldes Scroll — user post composer.
// Uses CenteredModal for mobile-sheet + desktop-modal behavior.
// Locks the sheet while uploading / publishing.
// ============================================================

import { useState, useRef } from "react";
import { Upload, Loader2, Image as ImageIcon, X, Check } from "lucide-react";
import { CenteredModal } from "@/components/ui/CenteredModal";
import { uploadMemeImage, UploadedImage } from "../lib/cloudinary";
import { createPost } from "../lib/supabase-memes";
import { NELDES_COLORS } from "../config/constants";
import type { PostType } from "../types";
import { NeldesModal } from "./NeldesModal";

const TYPES: { key: PostType; label: string }[] = [
    { key: "meme", label: "Meme" },
    { key: "news", label: "News" },
    { key: "job", label: "Job" },
    { key: "promo", label: "Promo" },
];

interface CreatePostSheetProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export function CreatePostSheet({ open, onClose, onCreated }: CreatePostSheetProps) {
    const [type, setType] = useState<PostType>("meme");
    const [title, setTitle] = useState("");
    const [caption, setCaption] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    const [image, setImage] = useState<UploadedImage | null>(null);
    const [uploading, setUploading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setType("meme");
        setTitle("");
        setCaption("");
        setLinkUrl("");
        setImage(null);
        setError(null);
        setUploading(false);
        setPublishing(false);
    };

    const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("Please pick an image file");
            return;
        }
        setError(null);
        setUploading(true);
        try {
            const uploaded = await uploadMemeImage(file);
            setImage(uploaded);
        } catch (e: any) {
            setError(e.message || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handlePublish = async () => {
        if (!image) return setError("Add an image first");
        if (!caption.trim() && !title.trim()) return setError("Add a title or caption");
        setPublishing(true);
        setError(null);
        try {
            await createPost({
                type,
                title: title.trim(),
                caption: caption.trim(),
                image_url: image.secure_url,
                image_public_id: image.public_id,
                link_url: linkUrl.trim() || null,
            });
            onCreated();
            reset();
            onClose();
        } catch (e: any) {
            setError(e.message || "Publish failed");
        } finally {
            setPublishing(false);
        }
    };

    const handleClose = () => {
        if (uploading || publishing) return;
        reset();
        onClose();
    };

    const footer = (
        <button
            onClick={handlePublish}
            disabled={publishing || uploading || !image}
            className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
            style={{
                backgroundColor: NELDES_COLORS.accent,
                touchAction: "manipulation",
            }}
        >
            {publishing ? (
                <>
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                    <span className="text-[13px] font-bold text-white">Publishing…</span>
                </>
            ) : (
                <>
                    <ImageIcon className="w-4 h-4 text-white" />
                    <span className="text-[13px] font-bold text-white">Publish post</span>
                </>
            )}
        </button>
    );

    return (
        <NeldesModal
            open={open}
            onClose={handleClose}
            title="New post"
            maxWidthClass="max-w-lg"
            maxHeight="90vh"
            footer={footer}
            locked={uploading || publishing}
            forceDark
        >
            <div className="px-5 py-4 space-y-4">
                {/* Type picker */}
                <div className="flex gap-2">
                    {TYPES.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setType(t.key)}
                            className={`flex-1 h-9 rounded-full text-[12px] font-bold active:scale-95 transition-transform ${type === t.key
                                ? "bg-[#58a6ff] text-white"
                                : "bg-[#21262d] text-[#c9d1d9]"
                                }`}
                            style={{ touchAction: "manipulation" }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Image picker */}
                <div>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePickFile}
                        className="hidden"
                    />
                    {image ? (
                        <div className="relative">
                            <img
                                src={image.secure_url}
                                alt="Upload preview"
                                className="w-full rounded-2xl object-cover max-h-[300px]"
                            />
                            <button
                                onClick={() => {
                                    setImage(null);
                                    if (fileRef.current) fileRef.current.value = "";
                                }}
                                disabled={publishing}
                                aria-label="Remove image"
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                            <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/70 text-[10px] font-bold text-white flex items-center gap-1">
                                <Check className="w-3 h-3" /> Uploaded
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="w-full h-32 rounded-2xl bg-[#21262d] flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
                            style={{ touchAction: "manipulation" }}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-6 h-6 text-[#58a6ff] animate-spin" />
                                    <span className="text-[12px] font-semibold text-[#8b949e]">
                                        Compressing & uploading…
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-6 h-6 text-[#58a6ff]" />
                                    <span className="text-[12px] font-semibold text-[#c9d1d9]">
                                        Pick an image
                                    </span>
                                    <span className="text-[10px] text-[#6e7681]">
                                        Auto-compressed before upload
                                    </span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Title */}
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                        type === "job" ? "Job title (e.g. Nurse — Eldoret)" : "Title (optional)"
                    }
                    maxLength={120}
                    disabled={publishing}
                    className="w-full h-11 rounded-xl bg-[#21262d] border-0 outline-none px-4 text-[13px] placeholder:text-[#6e7681] disabled:opacity-60"
                    style={{ color: NELDES_COLORS.textPrimary }}
                />

                {/* Caption */}
                <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Caption…"
                    maxLength={500}
                    rows={3}
                    disabled={publishing}
                    className="w-full rounded-xl bg-[#21262d] border-0 outline-none px-4 py-3 text-[13px] placeholder:text-[#6e7681] resize-none disabled:opacity-60"
                    style={{ color: NELDES_COLORS.textPrimary }}
                />

                {/* Link */}
                <input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Link (optional — e.g. apply URL)"
                    disabled={publishing}
                    className="w-full h-11 rounded-xl bg-[#21262d] border-0 outline-none px-4 text-[13px] placeholder:text-[#6e7681] disabled:opacity-60"
                    style={{ color: NELDES_COLORS.textPrimary }}
                />

                {error && (
                    <div className="px-3 py-2 rounded-xl bg-rose-500/10 text-[12px] font-semibold text-[#f85149]">
                        {error}
                    </div>
                )}
            </div>
        </NeldesModal>
    );
}