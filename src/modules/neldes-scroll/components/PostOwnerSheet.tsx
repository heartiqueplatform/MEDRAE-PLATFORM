// src/modules/neldes-scroll/components/PostOwnerSheet.tsx
// ============================================================
// Neldes Scroll — owner-only actions sheet.
// Uses CenteredModal for mobile-sheet + desktop-modal behavior.
// Locks the sheet while saving / deleting.
// ============================================================

import { useEffect, useState } from "react";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { CenteredModal } from "@/components/ui/CenteredModal";
import { updateOwnPost, deleteOwnPost } from "../lib/supabase-memes";
import type { FeedPost } from "../types";
import { NELDES_COLORS } from "../config/constants";
import { NeldesModal } from "./NeldesModal";

interface PostOwnerSheetProps {
    open: boolean;
    post: FeedPost | null;
    onClose: () => void;
    onUpdated: (patch: { title?: string; caption?: string; link_url?: string | null }) => void;
    onDeleted: (id: number) => void;
}

export function PostOwnerSheet({
    open,
    post,
    onClose,
    onUpdated,
    onDeleted,
}: PostOwnerSheetProps) {
    const [mode, setMode] = useState<"actions" | "edit" | "confirmDelete">("actions");
    const [title, setTitle] = useState("");
    const [caption, setCaption] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !post) return;
        setMode("actions");
        setTitle(post.title);
        setCaption(post.caption);
        setLinkUrl(post.link_url ?? "");
        setBusy(false);
        setError(null);
    }, [open, post]);

    const handleSave = async () => {
        if (!post) return;
        setBusy(true);
        setError(null);
        try {
            const patch = {
                title: title.trim(),
                caption: caption.trim(),
                link_url: linkUrl.trim() || null,
            };
            await updateOwnPost(post.id, patch);
            onUpdated(patch);
            onClose();
        } catch (e: any) {
            setError(e.message || "Could not save");
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!post) return;
        setBusy(true);
        setError(null);
        try {
            await deleteOwnPost(post.id);
            onDeleted(post.id);
            onClose();
        } catch (e: any) {
            setError(e.message || "Could not delete");
        } finally {
            setBusy(false);
        }
    };

    const handleClose = () => {
        if (busy) return;
        onClose();
    };

    const titleText =
        mode === "edit"
            ? "Edit post"
            : mode === "confirmDelete"
                ? "Delete post?"
                : "Your post";

    const footer =
        mode === "edit" ? (
            <div className="flex gap-2">
                <button
                    onClick={() => setMode("actions")}
                    disabled={busy}
                    className="flex-1 h-11 rounded-xl bg-[#21262d] text-[13px] font-bold text-[#c9d1d9] active:scale-[0.97] transition-transform disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={busy}
                    className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-70"
                    style={{ backgroundColor: NELDES_COLORS.accent }}
                >
                    {busy ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                        <span className="text-[13px] font-bold text-white">Save changes</span>
                    )}
                </button>
            </div>
        ) : mode === "confirmDelete" ? (
            <div className="flex gap-2">
                <button
                    onClick={() => setMode("actions")}
                    disabled={busy}
                    className="flex-1 h-11 rounded-xl bg-[#21262d] text-[13px] font-bold text-[#c9d1d9] active:scale-[0.97] transition-transform disabled:opacity-50"
                >
                    Keep post
                </button>
                <button
                    onClick={handleDelete}
                    disabled={busy}
                    className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-70"
                    style={{ backgroundColor: NELDES_COLORS.heart }}
                >
                    {busy ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                        <span className="text-[13px] font-bold text-white">Delete</span>
                    )}
                </button>
            </div>
        ) : undefined;

    return (
        <NeldesModal
            open={open}
            onClose={handleClose}
            title={titleText}
            maxWidthClass="max-w-md"
            footer={footer}
            locked={busy}
            forceDark
        >
            <div className="px-4 py-3">
                {mode === "actions" && (
                    <div className="space-y-2">
                        <button
                            onClick={() => setMode("edit")}
                            className="w-full h-12 rounded-xl bg-[#21262d] flex items-center gap-3 px-4 active:scale-[0.98] transition-transform"
                        >
                            <Pencil className="w-4 h-4" color={NELDES_COLORS.accent} />
                            <span
                                className="text-[13px] font-semibold"
                                style={{ color: NELDES_COLORS.textPrimary }}
                            >
                                Edit caption
                            </span>
                        </button>
                        <button
                            onClick={() => setMode("confirmDelete")}
                            className="w-full h-12 rounded-xl bg-[#2d1418] flex items-center gap-3 px-4 active:scale-[0.98] transition-transform"
                        >
                            <Trash2 className="w-4 h-4" color={NELDES_COLORS.heart} />
                            <span
                                className="text-[13px] font-semibold"
                                style={{ color: NELDES_COLORS.heart }}
                            >
                                Delete post
                            </span>
                        </button>
                    </div>
                )}

                {mode === "edit" && (
                    <div className="space-y-3">
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Title (optional)"
                            maxLength={120}
                            className="w-full h-11 rounded-xl bg-[#21262d] border-0 outline-none px-4 text-[13px] placeholder:text-[#6e7681]"
                            style={{ color: NELDES_COLORS.textPrimary }}
                        />
                        <textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="Caption"
                            maxLength={500}
                            rows={4}
                            className="w-full rounded-xl bg-[#21262d] border-0 outline-none px-4 py-3 text-[13px] placeholder:text-[#6e7681] resize-none"
                            style={{ color: NELDES_COLORS.textPrimary }}
                        />
                        <input
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="Link (optional)"
                            className="w-full h-11 rounded-xl bg-[#21262d] border-0 outline-none px-4 text-[13px] placeholder:text-[#6e7681]"
                            style={{ color: NELDES_COLORS.textPrimary }}
                        />
                        {error && (
                            <div className="px-3 py-2 rounded-xl bg-rose-500/10 text-[12px] font-semibold text-[#f85149]">
                                {error}
                            </div>
                        )}
                    </div>
                )}

                {mode === "confirmDelete" && (
                    <div className="space-y-3">
                        <p
                            className="text-[13px] leading-snug px-1"
                            style={{ color: NELDES_COLORS.textSecondary }}
                        >
                            This will permanently remove your post. Likes, comments and
                            shares on it will be deleted too. This cannot be undone.
                        </p>
                        {error && (
                            <div className="px-3 py-2 rounded-xl bg-rose-500/10 text-[12px] font-semibold text-[#f85149]">
                                {error}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </NeldesModal>
    );
}