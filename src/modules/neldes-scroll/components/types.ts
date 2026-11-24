import type { FeedPost } from "../types";
import type { ShareDispatcher } from "./NeldesScrollScreen";

export interface FeedCardProps {
    post: FeedPost;
    onUpdate: (id: number, patch: Partial<FeedPost>) => void;
    onOpenComments: (post: FeedPost) => void;
    onOpenShare: (post: FeedPost) => void;
    onVisible: (index: number) => void;
    onRegisterShare?: (fn: ShareDispatcher) => void;
    onOpenOwnerMenu: (post: FeedPost) => void;
    currentUserId: string | null;
    index: number;
    onPostViewed?: (postId: number) => void;   // ← ADD THIS
}