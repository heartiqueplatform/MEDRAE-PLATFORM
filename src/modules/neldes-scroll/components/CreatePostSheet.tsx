// src/modules/neldes-scroll/components/CreatePostSheet.tsx
import { useRef, useState } from "react";
import {
    Upload, Loader2, X, Check, Image as ImageIcon, AlertCircle,
} from "lucide-react";
import {
    uploadMemeImages,
    type UploadProgress,
} from "../lib/cloudinary";
import { createPost } from "../lib/supabase-memes";
import { NELDES_COLORS } from "../config/constants";
import { POST_TYPES, type PostType } from "../config/postTypes";
import { NeldesModal } from "./NeldesModal";

const MAX_FILES = 20;

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

    const [files, setFiles] = useState<File[]>([]);
    const [progress, setProgress] = useState<UploadProgress[]>([]);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setType("meme");
        setTitle("");
        setCaption("");
        setLinkUrl("");
        setFiles([]);
        setProgress([]);
        setError(null);
        setPublishing(false);
    };

    const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files ?? []).filter((f) =>
            f.type.startsWith("image/")
        );
        if (!picked.length) return;

        const combined = [...files, ...picked].slice(0, MAX_FILES);
        if (files.length + picked.length > MAX_FILES) {
            setError(`Maximum ${MAX_FILES} images per post`);
        } else {
            setError(null);
        }
        setFiles(combined);
        e.target.value = "";
    };

    const removeFile = (i: number) => {
        setFiles((prev) => prev.filter((_, idx) => idx !== i));
    };

    const handlePublish = async () => {
        if (!files.length) return setError("Add at least one image");
        if (!caption.trim() && !title.trim()) return setError("Add a title or caption");

        setPublishing(true);
        setError(null);
        setProgress([]);

        try {
            // 1. Upload all files in parallel
            const { uploaded, failed } = await uploadMemeImages(files, {
                onProgress: setProgress,
                concurrency: 3,
                retries: 3,
            });

            if (uploaded.length === 0) {
                setError("All uploads failed. Check your connection and try again.");
                return;
            }

            // 2. Insert one row per uploaded image — same caption for all
            let inserted = 0;
            for (const img of uploaded) {
                try {
                    await createPost({
                        type,
                        title: title.trim(),
                        caption: caption.trim(),
                        image_url: img.secure_url,
                        image_public_id: img.public_id,
                        link_url: linkUrl.trim() || null,
                    });
                    inserted++;
                } catch {
                    // one row failed — keep going
                }
            }

            if (inserted === 0) {
                setError("Upload succeeded but saving to feed failed. Try again.");
                return;
            }

            if (failed.length > 0 || inserted < uploaded.length) {
                setError(
                    `Posted ${inserted}. ${files.length - inserted} image(s) failed.`
                );
            }

            onCreated();
            reset();
            onClose();
        } catch (e: any) {
            setError(e?.message ?? "Publish failed");
        } finally {
            setPublishing(false);
        }
    };

    const handleClose = () => {
        if (publishing) {
            if (!confirm("Uploads are in progress. Close anyway?")) return;
        }
        reset();
        onClose();
    };

    const doneCount = progress.filter((p) => p.status === "done").length;
    const totalPercent = progress.length
        ? Math.round(progress.reduce((s, p) => s + p.percent, 0) / progress.length)
        : 0;

    const footer = (
        <button
            onClick={handlePublish}
            disabled={publishing || files.length === 0}
            className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
            style={{ backgroundColor: NELDES_COLORS.accent, touchAction: "manipulation" }}
        >
            {publishing ? (
                <>
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                    <span className="text-[13px] font-bold text-white">
                        Uploading {doneCount}/{files.length} · {totalPercent}%
                    </span>
                </>
            ) : (
                <>
                    <Upload className="w-4 h-4 text-white" />
                    <span className="text-[13px] font-bold text-white">
                        Post {files.length || ""}{" "}
                        {files.length > 1 ? "posts" : "post"}
                    </span>
                </>
            )}
        </button>
    );

    return (
        <NeldesModal
            open={open}
            onClose={handleClose}
            title={`New post${files.length ? ` · ${files.length}/${MAX_FILES}` : ""}`}
            maxWidthClass="max-w-lg"
            maxHeight="90vh"
            footer={footer}
            locked={publishing}
            forceDark
        >
            <div className="px-5 py-4 space-y-4">
                {/* Type picker — horizontal scroll (10 categories) */}
                <div
                    className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1"
                    style={{ touchAction: "pan-x" }}
                >
                    {POST_TYPES.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setType(t.key)}
                            disabled={publishing}
                            className={`shrink-0 h-9 px-4 rounded-full text-[12px] font-bold active:scale-95 transition-transform ${type === t.key
                                ? "bg-[#58a6ff] text-white"
                                : "bg-[#21262d] text-[#c9d1d9]"
                                }`}
                            style={{ touchAction: "manipulation" }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Multi-image picker */}
                <div>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePick}
                        className="hidden"
                    />

                    {files.length === 0 ? (
                        <button
                            onClick={() => fileRef.current?.click()}
                            disabled={publishing}
                            className="w-full h-32 rounded-2xl bg-[#21262d] flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
                            style={{ touchAction: "manipulation" }}
                        >
                            <Upload className="w-6 h-6 text-[#58a6ff]" />
                            <span className="text-[12px] font-semibold text-[#c9d1d9]">
                                Pick up to {MAX_FILES} images
                            </span>
                            <span className="text-[10px] text-[#6e7681]">
                                Each image becomes its own post with the same caption
                            </span>
                        </button>
                    ) : (
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            {files.map((f, i) => {
                                const p = progress.find((x) => x.index === i);
                                const done = p?.status === "done";
                                const errored = p?.status === "error";
                                return (
                                    <div
                                        key={i}
                                        className="relative aspect-square rounded-xl overflow-hidden bg-[#161b22]"
                                    >
                                        <img
                                            src={URL.createObjectURL(f)}
                                            alt={`preview ${i + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        {publishing && p && !done && !errored && (
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1">
                                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                                                <span className="text-[10px] font-bold text-white">
                                                    {p.status === "compressing" ? "Compress" : `${p.percent}%`}
                                                </span>
                                            </div>
                                        )}
                                        {done && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <Check className="w-5 h-5 text-emerald-400" />
                                            </div>
                                        )}
                                        {errored && (
                                            <div className="absolute inset-0 bg-rose-500/40 flex items-center justify-center">
                                                <AlertCircle className="w-5 h-5 text-white" />
                                            </div>
                                        )}
                                        {!publishing && (
                                            <button
                                                onClick={() => removeFile(i)}
                                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center active:scale-90"
                                                aria-label="Remove"
                                            >
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            {files.length < MAX_FILES && !publishing && (
                                <button
                                    onClick={() => fileRef.current?.click()}
                                    className="aspect-square rounded-xl bg-[#21262d] flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
                                >
                                    <ImageIcon className="w-5 h-5 text-[#58a6ff]" />
                                    <span className="text-[10px] font-semibold text-[#c9d1d9]">
                                        Add
                                    </span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Title */}
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={type === "job" ? "Job title (e.g. Nurse — Eldoret)" : "Title (optional)"}
                    maxLength={120}
                    disabled={publishing}
                    className="w-full h-11 rounded-xl bg-[#21262d] border-0 outline-none px-4 text-[13px] placeholder:text-[#6e7681] disabled:opacity-60"
                    style={{ color: NELDES_COLORS.textPrimary }}
                />

                {/* Caption — shared across all rows */}
                <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Caption (applied to every image)"
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
                    placeholder="Link (optional)"
                    disabled={publishing}
                    className="w-full h-11 rounded-xl bg-[#21262d] border-0 outline-none px-4 text-[13px] placeholder:text-[#6e7681] disabled:opacity-60"
                    style={{ color: NELDES_COLORS.textPrimary }}
                />

                {error && (
                    <div className="px-3 py-2 rounded-xl bg-rose-500/10 text-[12px] font-semibold text-[#f85149]">
                        {error}
                    </div>
                )}

                {/* Overall progress */}
                {publishing && progress.length > 0 && (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#8b949e]">
                            <span>{doneCount} / {progress.length} uploaded</span>
                            <span>{totalPercent}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[#21262d] overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{
                                    width: `${totalPercent}%`,
                                    backgroundColor: NELDES_COLORS.accent,
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </NeldesModal>
    );
}