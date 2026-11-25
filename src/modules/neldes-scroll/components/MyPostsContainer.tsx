// src/modules/neldes-scroll/components/MyPostsContainer.tsx
// ============================================================
// My Posts tab — reuses FeedContainer + a CreatePostCard empty state.
// ============================================================

import { FeedContainer } from "./FeedContainer";
import { EmptyFeed } from "./EmptyFeed";
import type { FeedPost, ShareTarget } from "../types";
import type { ShareDispatcher } from "./NeldesScrollScreen";

interface MyPostsContainerProps {
    posts: FeedPost[];
    loading: boolean;
    loadingMore: boolean;
    error: string | null;
    hasMore: boolean;
    onLoadMore: () => void;
    onVisible: (index: number) => void;
    onUpdate: (id: number, patch: Partial<FeedPost>) => void;
    onOpenComments: (post: FeedPost) => void;
    onOpenShare: (post: FeedPost) => void;
    onRefresh: () => void;
    onRegisterShare: (fn: ShareDispatcher) => void;
    onCreate: () => void;
    onOpenOwnerMenu: (post: FeedPost) => void;
    onPostViewed?: (postId: number) => void;
    currentUserId: string | null;
    isEnrolled: boolean;
    onGetApproved: () => void;
}

export function MyPostsContainer({
    posts,
    loading,
    loadingMore,
    error,
    hasMore,
    onLoadMore,
    onVisible,
    onUpdate,
    onOpenComments,
    onOpenShare,
    onRefresh,
    onRegisterShare,
    onCreate,
    onOpenOwnerMenu,
    onPostViewed,
    currentUserId,
    isEnrolled,
    onGetApproved,
}: MyPostsContainerProps) {
    // No posts at all: show the empty state with a Create CTA.
    if (!loading && !error && posts.length === 0) {
        return (
            <EmptyFeed
                kind="empty"
                message="You haven't posted yet. Be the first to make Medspite Scroll."
                onRetry={onRefresh}
                onCreate={onCreate}
            />
        );
    }

    return (
        <FeedContainer
            posts={posts}
            loading={loading}
            loadingMore={loadingMore}
            error={error}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
            onVisible={onVisible}
            onUpdate={onUpdate}
            onOpenComments={onOpenComments}
            onOpenShare={onOpenShare}
            onRefresh={onRefresh}
            onRegisterShare={onRegisterShare}
            onCreate={onCreate}
            onOpenOwnerMenu={onOpenOwnerMenu}
            onPostViewed={onPostViewed}
            currentUserId={currentUserId}
            isEnrolled={isEnrolled}
            onGetApproved={onGetApproved}
        />
    );
}