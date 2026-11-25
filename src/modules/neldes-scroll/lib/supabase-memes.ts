// ============================================================
// Neldes Scroll — typed Supabase wrappers.
// No React here. Pure functions. Easy to console.log / test.
// ============================================================
import type { FeedCursor } from "../types";

import { supabase } from "@/lib/supabaseClient";
import type {
    FeedPost,
    InteractionAction,
    MemeComment,
    ShareTarget,
} from "../types";

/** Pull one page from memes_get_feed. */

/** Pull one page from memes_get_feed using stable pagination. */
export async function fetchFeedPage(
    cursor: FeedCursor | null = null,
    limit = 10
): Promise<FeedPost[]> {
    const { data, error } = await supabase.rpc("memes_get_feed", {
        p_limit: limit,
        p_cursor_pinned: cursor?.is_pinned ?? null,
        p_cursor: cursor?.published_at ?? null,
        p_cursor_id: cursor?.id ?? null,
    });

    if (error) throw new Error(error.message);

    return (data ?? []) as FeedPost[];
}

/** Record a like / save / share / download action. */
export async function recordInteraction(
    postId: number,
    action: InteractionAction,
    shareTo?: ShareTarget
): Promise<void> {
    const { error } = await supabase.from("memes_interactions").insert({
        post_id: postId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action,
        share_to: shareTo ?? null,
    });
    // Ignore duplicate-key (already liked) — safe.
    if (error && error.code !== "23505") throw new Error(error.message);
}

/** Remove a like or save. */
export async function removeInteraction(
    postId: number,
    action: "like" | "save"
): Promise<void> {
    const { error } = await supabase
        .from("memes_interactions")
        .delete()
        .eq("post_id", postId)
        .eq("action", action)
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id);
    if (error) throw new Error(error.message);
}

/** Mark post as seen (called once per card when in view 1s). */

/** Mark post as seen. Throws if Supabase fails so it can be retried. */
export async function markSeen(postId: number): Promise<void> {
    const { data: { user }, error: authError } =
        await supabase.auth.getUser();

    if (authError) throw new Error(authError.message);
    if (!user) throw new Error("Cannot mark post as seen: user not authenticated");

    const { error } = await supabase.rpc("memes_mark_seen", {
        p_post_id: postId,
    });

    if (error) {
        throw new Error(error.message);
    }
}

/** Fetch comments for a post. */
export async function fetchComments(postId: number): Promise<MemeComment[]> {
    const { data, error } = await supabase
        .from("memes_comments")
        .select("id, post_id, user_id, user_name, user_avatar, body, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as MemeComment[];
}

/** Post a comment. */
export async function postComment(
    postId: number,
    body: string,
    user: { id: string; name: string; avatar: string | null }
): Promise<MemeComment> {
    const { data, error } = await supabase
        .from("memes_comments")
        .insert({
            post_id: postId,
            user_id: user.id,
            user_name: user.name,
            user_avatar: user.avatar,
            body,
        })
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data as MemeComment;
}
// ============================================================
// User post creation — any authenticated user
// ============================================================

export interface CreatePostInput {
    type: "meme" | "news" | "job" | "promo";
    title: string;
    caption: string;
    image_url: string | null;
    image_public_id: string | null;
    link_url?: string | null;
}

export async function createPost(
    input: CreatePostInput
): Promise<{ id: number }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Please log in to post");

    const { data: profile } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

    const { data, error } = await supabase
        .from("memes_posts")
        .insert({
            type: input.type,
            title: input.title,
            caption: input.caption,
            image_url: input.image_url,
            image_public_id: input.image_public_id,
            link_url: input.link_url ?? null,
            author_id: user.id,
            author_name: profile?.name ?? user.email?.split("@")[0] ?? "User",
            author_avatar: profile?.avatar_url ?? null,
            published_at: new Date().toISOString(),
            is_active: true,
        })
        .select("id")
        .single();

    if (error) throw new Error(error.message);
    return data;
}

// ============================================================
// Owner edit / delete
// ============================================================

export interface UpdatePostInput {
    title?: string;
    caption?: string;
    link_url?: string | null;
}

export async function updateOwnPost(
    id: number,
    patch: UpdatePostInput
): Promise<void> {
    const { error } = await supabase
        .from("memes_posts")
        .update({
            ...patch,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    if (error) throw new Error(error.message);
}

export async function deleteOwnPost(id: number): Promise<void> {
    const { error } = await supabase
        .from("memes_posts")
        .delete()
        .eq("id", id);
    if (error) throw new Error(error.message);
}
// ============================================================
// Viewed feed
// ============================================================

export interface ViewedPost extends FeedPost {
    last_interacted: string;
}

export async function fetchViewedPage(
    cursor: string = new Date().toISOString(),
    limit = 20
): Promise<ViewedPost[]> {
    const { data, error } = await supabase.rpc("memes_get_viewed", {
        p_limit: limit,
        p_cursor: cursor,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as ViewedPost[];
}