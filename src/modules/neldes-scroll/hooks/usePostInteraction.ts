// ============================================================
// Neldes Scroll — like / save / share / download for ONE post.
// Optimistic UI: flip immediately, revert on error.
// ============================================================

import { useCallback, useState } from "react";
import {
    recordInteraction,
    removeInteraction,
    incrementShare,
} from "../lib/supabase-memes";
import { watermarkImage, downloadBlob } from "../lib/image-watermark";
import { shareImageUrl } from "../lib/cloudinary";
import type { FeedPost, ShareTarget } from "../types";

interface UsePostInteractionArgs {
    post: FeedPost;
    onUpdate: (id: number, patch: Partial<FeedPost>) => void;
}

const ALLOWED_TARGETS: ShareTarget[] = [
    "whatsapp_status",
    "whatsapp",
    "instagram",
    "tiktok",
    "copy_link",
];

function normalizeTarget(input: unknown): ShareTarget {
    if (typeof input === "string" && (ALLOWED_TARGETS as string[]).includes(input)) {
        return input as ShareTarget;
    }
    if (input && typeof input === "object" && "key" in (input as any)) {
        const k = (input as any).key;
        if (typeof k === "string" && (ALLOWED_TARGETS as string[]).includes(k)) {
            return k as ShareTarget;
        }
    }
    return "copy_link";
}

function postUrl(postId: number): string {
    return `${window.location.origin}/neldes/${postId}`;
}

export function usePostInteraction({ post, onUpdate }: UsePostInteractionArgs) {
    const [sharing, setSharing] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── LIKE ────────────────────────────────────────────────────
    const toggleLike = useCallback(async () => {
        const prevLiked = post.is_liked;
        const prevCount = post.likes_count;
        const nextLiked = !prevLiked;
        const nextCount = prevCount + (nextLiked ? 1 : -1);

        onUpdate(post.id, { is_liked: nextLiked, likes_count: nextCount });

        try {
            if (nextLiked) await recordInteraction(post.id, "like");
            else await removeInteraction(post.id, "like");
        } catch (e: any) {
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
        async (
            postOrTarget: FeedPost | ShareTarget,
            maybeTarget?: ShareTarget
        ) => {
            const postArg: FeedPost =
                maybeTarget !== undefined ? (postOrTarget as FeedPost) : post;
            const rawTarget =
                maybeTarget !== undefined
                    ? maybeTarget
                    : (postOrTarget as ShareTarget);

            const target = normalizeTarget(rawTarget);
            const link = postUrl(postArg.id);

            if (!postArg.image_url) return;
            setSharing(true);
            setError(null);

            // ── Optimistic: bump shares_count immediately ──
            const prevShares = postArg.shares_count ?? 0;
            onUpdate(postArg.id, { shares_count: prevShares + 1 });

            // ── Analytics (fire-and-forget, ignore 23505/409) ──
            recordInteraction(postArg.id, "share", target).catch((err) => {
                console.warn("[share] analytics failed:", err);
            });

            // ── DB counter bump (every tap counts) ──
            incrementShare(postArg.id).catch((err) => {
                // Revert the optimistic bump on failure
                onUpdate(postArg.id, { shares_count: prevShares });
                console.warn("[share] counter bump failed:", err);
            });

            try {
                const src = shareImageUrl(postArg.image_url);

                // ── WhatsApp Status: bake caption into the image ──
                if (target === "whatsapp_status") {
                    const blob = await watermarkImage(src, {
                        title: postArg.title,
                        caption: postArg.caption,
                        linkUrl: link,
                    });
                    downloadBlob(blob, `medrae-${postArg.id}.jpg`);
                    window.open(
                        "https://wa.me/?text=" +
                        encodeURIComponent(`Shared from Medrae — ${link}`),
                        "_blank"
                    );
                    return;
                }

                // ── WhatsApp chat: text only (web deep link limitation) ──
                if (target === "whatsapp") {
                    const parts = [
                        postArg.title?.trim(),
                        postArg.caption?.trim(),
                        link,
                    ].filter(Boolean);
                    window.open(
                        `https://wa.me/?text=${encodeURIComponent(parts.join("\n\n"))}`,
                        "_blank"
                    );
                    return;
                }

                // ── Copy link ──
                if (target === "copy_link") {
                    try {
                        await navigator.clipboard.writeText(link);
                    } catch { }
                    return;
                }

                // ── Instagram / TikTok: native share sheet with image file ──
                if (typeof navigator !== "undefined" && (navigator as any).share) {
                    try {
                        let files: File[] | undefined;
                        try {
                            const blob = await watermarkImage(src, {
                                title: postArg.title,
                                caption: postArg.caption,
                                linkUrl: link,
                            });
                            const file = new File(
                                [blob],
                                `medrae-${postArg.id}.jpg`,
                                { type: "image/jpeg" }
                            );
                            if (
                                !(navigator as any).canShare ||
                                (navigator as any).canShare({ files: [file] })
                            ) {
                                files = [file];
                            }
                        } catch { }

                        await (navigator as any).share({
                            title: postArg.title ?? "Medrae",
                            text: postArg.caption ?? undefined,
                            url: link,
                            ...(files ? { files } : {}),
                        });
                        return;
                    } catch { }
                }

                try {
                    await navigator.clipboard.writeText(link);
                } catch { }
            } catch (e: any) {
                setError(e?.message ?? "Could not share");
            } finally {
                setSharing(false);
            }
        },
        [post, onUpdate]
    );

    // ── DOWNLOAD ────────────────────────────────────────────────
    const download = useCallback(async () => {
        if (!post.image_url) return;
        setDownloading(true);
        setError(null);
        try {
            const blob = await watermarkImage(shareImageUrl(post.image_url), {
                title: post.title,
                caption: post.caption,
                linkUrl: postUrl(post.id),
            });
            downloadBlob(blob, `medrae-${post.id}.jpg`);
            recordInteraction(post.id, "download").catch((err) => {
                console.warn("[download] analytics failed:", err);
            });
        } catch (e: any) {
            setError(e?.message ?? "Could not download");
        } finally {
            setDownloading(false);
        }
    }, [post.id, post.image_url, post.title, post.caption]);

    return {
        toggleLike,
        toggleSave,
        share,
        download,
        sharing,
        downloading,
        error,
    };
}