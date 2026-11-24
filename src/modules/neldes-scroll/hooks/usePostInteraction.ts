// ============================================================
// Neldes Scroll — like / save / share / download for ONE post.
// Optimistic UI: flip immediately, revert on error.
// ============================================================

import { useCallback, useState } from "react";
import {
    recordInteraction,
    removeInteraction,
} from "../lib/supabase-memes";
import { watermarkImage, downloadBlob } from "../lib/image-watermark";
import { shareImageUrl } from "../lib/cloudinary";
import { WATERMARK_TEXT } from "../config/constants";
import type { FeedPost, ShareTarget } from "../types";

interface UsePostInteractionArgs {
    post: FeedPost;
    onUpdate: (id: number, patch: Partial<FeedPost>) => void;
}

export function usePostInteraction({ post, onUpdate }: UsePostInteractionArgs) {
    const [sharing, setSharing] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── LIKE ────────────────────────────────────────────────────
    const toggleLike = useCallback(async () => {
        // Capture previous state BEFORE the optimistic flip so revert is exact.
        const prevLiked = post.is_liked;
        const prevCount = post.likes_count;
        const nextLiked = !prevLiked;
        const nextCount = prevCount + (nextLiked ? 1 : -1);

        // Optimistic update
        onUpdate(post.id, { is_liked: nextLiked, likes_count: nextCount });

        try {
            if (nextLiked) await recordInteraction(post.id, "like");
            else await removeInteraction(post.id, "like");
        } catch (e: any) {
            // Revert to the exact values captured before the flip
            onUpdate(post.id, { is_liked: prevLiked, likes_count: prevCount });
            setError(e?.message ?? "Could not update like");
        }
    }, [post.id, post.is_liked, post.likes_count, onUpdate]);

    // ── SAVE ────────────────────────────────────────────────────
    const toggleSave = useCallback(async () => {
        const prevSaved = post.is_saved;
        const nextSaved = !prevSaved;

        onUpdate(post.id, { is_saved: nextSaved });

        try {
            if (nextSaved) await recordInteraction(post.id, "save");
            else await removeInteraction(post.id, "save");
        } catch (e: any) {
            onUpdate(post.id, { is_saved: prevSaved });
            setError(e?.message ?? "Could not update save");
        }
    }, [post.id, post.is_saved, onUpdate]);

    // ── SHARE ───────────────────────────────────────────────────
    const share = useCallback(
        async (target: ShareTarget) => {
            if (!post.image_url) return;
            setSharing(true);
            setError(null);
            try {
                const src = shareImageUrl(post.image_url);

                if (target === "whatsapp_status") {
                    const blob = await watermarkImage(src);
                    downloadBlob(blob, `medrae-${post.id}.jpg`);
                    await recordInteraction(post.id, "share", "whatsapp_status");
                    // WhatsApp doesn't allow programmatic status post — user posts manually
                    window.open(
                        "https://wa.me/?text=" + encodeURIComponent("Shared from Medrae"),
                        "_blank"
                    );
                    return;
                }

                if (target === "whatsapp") {
                    const text = encodeURIComponent(
                        `${post.title || "Medrae"}\n\n${post.caption}\n\nSee more on Medrae`
                    );
                    window.open(`https://wa.me/?text=${text}`, "_blank");
                }

                await recordInteraction(post.id, "share", target);
            } catch (e: any) {
                setError(e?.message ?? "Could not share");
            } finally {
                setSharing(false);
            }
        },
        [post.id, post.image_url, post.title, post.caption]
    );

    // ── DOWNLOAD ────────────────────────────────────────────────
    const download = useCallback(async () => {
        if (!post.image_url) return;
        setDownloading(true);
        setError(null);
        try {
            const blob = await watermarkImage(shareImageUrl(post.image_url));
            downloadBlob(blob, `medrae-${post.id}.jpg`);
            await recordInteraction(post.id, "download");
        } catch (e: any) {
            setError(e?.message ?? "Could not download");
        } finally {
            setDownloading(false);
        }
    }, [post.id, post.image_url]);

    return { toggleLike, toggleSave, share, download, sharing, downloading, error };
}