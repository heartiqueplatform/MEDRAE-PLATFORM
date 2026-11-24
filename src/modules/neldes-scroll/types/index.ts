// ============================================================
// Neldes Scroll — shared types
// ============================================================

export type PostType = "meme" | "news" | "job" | "promo";

export type InteractionAction = "like" | "save" | "share" | "download" | "view";

export type ShareTarget =
    | "whatsapp_status"
    | "whatsapp"
    | "tiktok"
    | "instagram"
    | "copy_link";

export interface FeedPost {
    id: number;
    type: PostType;
    title: string;
    caption: string;
    image_url: string | null;
    video_url: string | null;
    link_url: string | null;
    author_id: string | null;         // ← NEW
    author_name: string;
    author_avatar: string | null;
    likes_count: number;
    comments_count: number;
    shares_count: number;
    downloads_count: number;
    views_count: number;
    is_liked: boolean;
    is_saved: boolean;
    published_at: string;
}

export interface PostInteractionState {
    liked: boolean;
    saved: boolean;
    likes: number;
    saves: number;
    sharing?: boolean;
    downloading?: boolean;
}

export interface MemeComment {
    id: number;
    post_id: number;
    user_id: string;
    user_name: string;
    user_avatar: string | null;
    body: string;
    created_at: string;
}

export interface MemesFeedResult {
    posts: FeedPost[];
    loading: boolean;
    loadingMore: boolean;
    error: string | null;
    hasMore: boolean;
    refresh: () => Promise<void>;
    loadMore: () => Promise<void>;
}