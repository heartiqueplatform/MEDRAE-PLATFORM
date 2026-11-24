// src/modules/neldes-scroll/components/NeldesScrollScreen.tsx
import { useCallback, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemesFeed } from "../hooks/useMemesFeed";
import { useViewedFeed } from "../hooks/useViewedFeed";
import { FeedContainer } from "./FeedContainer";
import { ViewedContainer } from "./ViewedContainer";
import { ShareSheet } from "./ShareSheet";
import { CommentSheet } from "./CommentSheet";
import { CreatePostSheet } from "./CreatePostSheet";
import { DesktopCommentsPanel } from "./DesktopCommentsPanel";
import { useSession } from "@supabase/auth-helpers-react";
import { PostOwnerSheet } from "./PostOwnerSheet";
import type { FeedPost, ShareTarget } from "../types";
import { NELDES_COLORS } from "../config/constants";
import { ViewedPostViewer } from "./ViewedPostViewer";
export type ShareDispatcher = (
    post: FeedPost,
    target: ShareTarget
) => Promise<void>;

type Tab = "forYou" | "viewed";

export function NeldesScrollScreen() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>("forYou");

    const forYouFeed = useMemesFeed();
    const viewedFeed = useViewedFeed();
    const [viewedViewerPost, setViewedViewerPost] = useState<FeedPost | null>(null);
    const feed = tab === "forYou" ? forYouFeed : viewedFeed;

    const [sharePost, setSharePost] = useState<FeedPost | null>(null);
    const [commentPost, setCommentPost] = useState<FeedPost | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [activePost, setActivePost] = useState<FeedPost | null>(null);
    const session = useSession();
    const currentUserId = session?.user?.id ?? null;
    const [ownerPost, setOwnerPost] = useState<FeedPost | null>(null);

    const shareDispatcherRef = useState<{ current: ShareDispatcher | null }>(
        () => ({ current: null })
    )[0];
    const handleOwnerUpdated = useCallback(
        (patch: { title?: string; caption?: string; link_url?: string | null }) => {
            if (!ownerPost) return;
            forYouFeed.updatePost(ownerPost.id, patch);
            viewedFeed.updatePost(ownerPost.id, patch);
            setViewedViewerPost((prev) =>
                prev && prev.id === ownerPost.id ? { ...prev, ...patch } : prev
            );
            setOwnerPost(null);
        },
        [ownerPost, forYouFeed, viewedFeed]
    );

    const handleOwnerDeleted = useCallback(
        (id: number) => {
            forYouFeed.refresh();
            viewedFeed.refresh();
            setViewedViewerPost((prev) => (prev && prev.id === id ? null : prev));
            setOwnerPost(null);
        },
        [forYouFeed, viewedFeed]
    );

    const handleVisible = useCallback(
        (index: number) => {
            feed.maybePrefetch(index);
            const post = feed.posts[index];
            if (post) setActivePost(post);
        },
        [feed]
    );

    const displayPost = useMemo(
        () => activePost ?? feed.posts[0] ?? null,
        [activePost, feed.posts]
    );

    const handleShareTarget = useCallback(
        async (target: ShareTarget) => {
            if (!shareDispatcherRef.current || !sharePost) {
                setSharePost(null);
                return;
            }
            try {
                await shareDispatcherRef.current(sharePost, target);
            } finally {
                setSharePost(null);
            }
        },
        [sharePost, shareDispatcherRef]
    );

    const handleBack = useCallback(() => {
        if (window.history.length > 1) navigate(-1);
        else navigate("/");
    }, [navigate]);

    // Shared tab button markup — For You on right, Viewed on left
    const tabButtons = (
        <div
            className="flex items-center gap-1 p-1 rounded-full"
            style={{
                backgroundColor: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
            }}
        >
            <button
                onClick={() => setTab("viewed")}
                className={`px-4 h-8 rounded-full text-[12px] font-bold transition-colors ${tab === "viewed"
                    ? "bg-white text-black"
                    : "text-white/80 hover:text-white"
                    }`}
                style={{ touchAction: "manipulation" }}
            >
                Viewed
            </button>
            <button
                onClick={() => setTab("forYou")}
                className={`px-4 h-8 rounded-full text-[12px] font-bold transition-colors ${tab === "forYou"
                    ? "bg-white text-black"
                    : "text-white/80 hover:text-white"
                    }`}
                style={{ touchAction: "manipulation" }}
            >
                For You
            </button>
        </div>
    );

    return (
        <div
            className="fixed inset-0 w-full h-full overflow-hidden"
            style={{ backgroundColor: NELDES_COLORS.bg }}
        >
            {/* ── BACK BUTTON (top-left) ─────────────────────────── */}
            <button
                onClick={handleBack}
                aria-label="Go back"
                className="fixed top-3 left-3 z-40 w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ backgroundColor: "transparent", touchAction: "manipulation" }}
            >
                <ChevronLeft
                    className="w-6 h-6 text-white"
                    strokeWidth={2.4}
                    style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))" }}
                />
            </button>

            {/* ── MOBILE: full-screen feed with tabs overlaid ─────── */}
            <div className="md:hidden w-full h-full relative">
                {/* Tabs — centered over the feed */}
                <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40">
                    {tabButtons}
                </div>

                {tab === "forYou" ? (
                    <FeedContainer
                        posts={forYouFeed.posts}
                        loading={forYouFeed.loading}
                        loadingMore={forYouFeed.loadingMore}
                        error={forYouFeed.error}
                        hasMore={forYouFeed.hasMore}
                        onLoadMore={forYouFeed.loadMore}
                        onVisible={handleVisible}
                        currentUserId={currentUserId}
                        onOpenOwnerMenu={(post) => setOwnerPost(post)}
                        onUpdate={forYouFeed.updatePost}
                        onOpenComments={(post) => setCommentPost(post)}
                        onOpenShare={(post) => setSharePost(post)}
                        onRefresh={forYouFeed.refresh}
                        onCreate={() => setCreateOpen(true)}
                        onRegisterShare={(fn) => {
                            shareDispatcherRef.current = fn;
                        }}
                    />
                ) : (
                    <ViewedContainer
                        posts={viewedFeed.posts}
                        loading={viewedFeed.loading}
                        loadingMore={viewedFeed.loadingMore}
                        error={viewedFeed.error}
                        hasMore={viewedFeed.hasMore}
                        onLoadMore={viewedFeed.loadMore}
                        onRefresh={viewedFeed.refresh}
                        onOpenComments={(post) => setCommentPost(post)}
                        onOpenShare={(post) => setSharePost(post)}
                        onOpenPost={(post) => setViewedViewerPost(post)}
                    />
                )}
            </div>

            {/* ── DESKTOP: centered feed panel with tabs ON the panel ─ */}
            <div className="hidden md:flex h-full w-full items-center justify-center px-6 py-6 gap-4">
                {/* Feed panel — 9:16 */}
                <div
                    className="relative h-full max-h-[calc(100vh-3rem)] rounded-2xl overflow-hidden flex-shrink-0"
                    style={{ aspectRatio: "9 / 16", backgroundColor: "#000" }}
                >
                    {/* Tabs — centered over the feed panel */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40">
                        {tabButtons}
                    </div>

                    {tab === "forYou" ? (
                        <FeedContainer
                            posts={forYouFeed.posts}
                            loading={forYouFeed.loading}
                            loadingMore={forYouFeed.loadingMore}
                            error={forYouFeed.error}
                            hasMore={forYouFeed.hasMore}
                            onLoadMore={forYouFeed.loadMore}
                            onVisible={handleVisible}
                            currentUserId={currentUserId}
                            onOpenOwnerMenu={(post) => setOwnerPost(post)}
                            onUpdate={forYouFeed.updatePost}
                            onOpenComments={(post) => setCommentPost(post)}
                            onOpenShare={(post) => setSharePost(post)}
                            onRefresh={forYouFeed.refresh}
                            onCreate={() => setCreateOpen(true)}
                            onRegisterShare={(fn) => {
                                shareDispatcherRef.current = fn;
                            }}
                        />
                    ) : (
                        <ViewedContainer
                            posts={viewedFeed.posts}
                            loading={viewedFeed.loading}
                            loadingMore={viewedFeed.loadingMore}
                            error={viewedFeed.error}
                            hasMore={viewedFeed.hasMore}
                            onLoadMore={viewedFeed.loadMore}
                            onRefresh={viewedFeed.refresh}
                            onOpenComments={(post) => setCommentPost(post)}
                            onOpenShare={(post) => setSharePost(post)}
                            onOpenPost={(post) => setViewedViewerPost(post)}
                        />
                    )}
                </div>

                {/* Comments panel — right side */}
                <div
                    className="h-full max-h-[calc(100vh-3rem)] flex-shrink-0 rounded-2xl overflow-hidden"
                    style={{ width: 380, backgroundColor: "#161b22" }}
                >
                    <DesktopCommentsPanel post={displayPost} />
                </div>
            </div>

            {/* ── Sheets ──────────────────────────────────────────── */}
            <ShareSheet
                open={!!sharePost}
                post={sharePost}
                onClose={() => setSharePost(null)}
                onShare={handleShareTarget}
            />
            <ViewedPostViewer
                post={viewedViewerPost}
                onClose={() => setViewedViewerPost(null)}
                onUpdate={(id, patch) => {
                    viewedFeed.updatePost(id, patch);
                    setViewedViewerPost((prev) =>
                        prev && prev.id === id ? { ...prev, ...patch } : prev
                    );
                }}
                onOpenComments={setCommentPost}
                onOpenShare={setSharePost}
                onOpenOwnerMenu={setOwnerPost}
                onCreate={() => setCreateOpen(true)}
                onRegisterShare={(fn) => { shareDispatcherRef.current = fn; }}
            />
            <div className="md:hidden">
                <CommentSheet
                    open={!!commentPost}
                    post={commentPost}
                    onClose={() => setCommentPost(null)}
                />
            </div>
            <PostOwnerSheet
                open={!!ownerPost}
                post={ownerPost}
                onClose={() => setOwnerPost(null)}
                onUpdated={handleOwnerUpdated}
                onDeleted={handleOwnerDeleted}
            />
            <CreatePostSheet
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={() => {
                    setTimeout(() => forYouFeed.refresh(), 250);
                }}
            />
        </div>
    );
}