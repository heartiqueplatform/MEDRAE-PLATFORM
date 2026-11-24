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

    const toggleLike = useCallback(async () => {
        const nextLiked = !post.is_liked;
        const nextCount = post.likes_count + (nextLiked ? 1 : -1);
        onUpdate(post.id, { is_liked: nextLiked, likes_count: nextCount });
        try {
            if (nextLiked) await recordInteraction(post.id, "like");
            else await removeInteraction(post.id, "like");
        } catch (e: any) {
            onUpdate(post.id, { is_liked: !nextLiked, likes_count: post.likes_count });
            setError(e.message);
        }
    }, [post, onUpdate]);

    const toggleSave = useCallback(async () => {
        const nextSaved = !post.is_saved;
        onUpdate(post.id, { is_saved: nextSaved });
        try {
            if (nextSaved) await recordInteraction(post.id, "save");
            else await removeInteraction(post.id, "save");
        } catch (e: any) {
            onUpdate(post.id, { is_saved: !nextSaved });
            setError(e.message);
        }
    }, [post, onUpdate]);

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
                    window.open("https://wa.me/?text=" + encodeURIComponent("Shared from Medrae"), "_blank");
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
                setError(e.message);
            } finally {
                setSharing(false);
            }
        },
        [post]
    );

    const download = useCallback(async () => {
        if (!post.image_url) return;
        setDownloading(true);
        setError(null);
        try {
            const blob = await watermarkImage(shareImageUrl(post.image_url));
            downloadBlob(blob, `medrae-${post.id}.jpg`);
            await recordInteraction(post.id, "download");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setDownloading(false);
        }
    }, [post]);

    return { toggleLike, toggleSave, share, download, sharing, downloading, error };
}