// src/modules/neldes-scroll/components/NeldesScrollScreen.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemesFeed } from "../hooks/useMemesFeed";
import { useViewedFeed } from "../hooks/useViewedFeed";
import { useMyPosts } from "../hooks/useMyPosts";
import { FeedContainer } from "./FeedContainer";
import { ViewedContainer } from "./ViewedContainer";
import { MyPostsContainer } from "./MyPostsContainer";
import { ShareSheet } from "./ShareSheet";
import { CommentSheet } from "./CommentSheet";
import { CreatePostSheet } from "./CreatePostSheet";
import { DesktopCommentsPanel } from "./DesktopCommentsPanel";
import { useSession } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import { PostOwnerSheet } from "./PostOwnerSheet";
import type { FeedPost, ShareTarget } from "../types";
import { NELDES_COLORS } from "../config/constants";
import { ViewedPostViewer } from "./ViewedPostViewer";
import { toast } from "sonner";
export type ShareDispatcher = (
    post: FeedPost,
    target: ShareTarget
) => Promise<void>;

type Tab = "myPosts" | "viewed" | "forYou";

export function NeldesScrollScreen() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>("forYou");

    const session = useSession();
    const currentUserId = session?.user?.id ?? null;

    const forYouFeed = useMemesFeed();
    const viewedFeed = useViewedFeed();
    const myPostsFeed = useMyPosts(currentUserId);

    const [viewedViewerPost, setViewedViewerPost] = useState<FeedPost | null>(null);
    const [sharePost, setSharePost] = useState<FeedPost | null>(null);
    const [commentPost, setCommentPost] = useState<FeedPost | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [activePost, setActivePost] = useState<FeedPost | null>(null);
    const [ownerPost, setOwnerPost] = useState<FeedPost | null>(null);

    const feed =
        tab === "forYou"
            ? forYouFeed
            : tab === "viewed"
                ? viewedFeed
                : myPostsFeed;

    const [isEnrolled, setIsEnrolled] = useState(false);

    useEffect(() => {
        if (!currentUserId) {
            setIsEnrolled(false);
            return;
        }
        let cancelled = false;
        (async () => {
            const { data } = await supabase
                .from("medrae_stu_enrollments")
                .select("status")
                .eq("user_id", currentUserId)
                .maybeSingle();
            if (!cancelled) setIsEnrolled(data?.status === "approved");
        })();
        return () => {
            cancelled = true;
        };
    }, [currentUserId]);

    const [layoutReady, setLayoutReady] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setLayoutReady(true));
        return () => cancelAnimationFrame(id);
    }, []);

    const handleGetApproved = useCallback(() => {
        navigate("/coins/apply");
    }, [navigate]);

    const shareDispatcherRef = useState<{ current: ShareDispatcher | null }>(
        () => ({ current: null })
    )[0];

    const handleOwnerUpdated = useCallback(
        (patch: { title?: string; caption?: string; link_url?: string | null }) => {
            if (!ownerPost) return;
            forYouFeed.updatePost(ownerPost.id, patch);
            viewedFeed.updatePost(ownerPost.id, patch);
            myPostsFeed.updatePost(ownerPost.id, patch);
            setViewedViewerPost((prev) =>
                prev && prev.id === ownerPost.id ? { ...prev, ...patch } : prev
            );
            setOwnerPost(null);
        },
        [ownerPost, forYouFeed, viewedFeed, myPostsFeed]
    );

    const handlePostViewed = useCallback(
        (postId: number) => {
            forYouFeed.updatePost(postId, {
                views_count:
                    (forYouFeed.posts.find((p) => p.id === postId)?.views_count ?? 0) + 1,
            });
            setActivePost((prev) =>
                prev && prev.id === postId
                    ? { ...prev, views_count: (prev.views_count ?? 0) + 1 }
                    : prev
            );
        },
        [forYouFeed]
    );

    const handleOwnerDeleted = useCallback(
        (id: number) => {
            forYouFeed.refresh();
            viewedFeed.refresh();
            myPostsFeed.refresh();
            setViewedViewerPost((prev) => (prev && prev.id === id ? null : prev));
            setOwnerPost(null);
        },
        [forYouFeed, viewedFeed, myPostsFeed]
    );

    const handleVisible = useCallback(
        (index: number) => {
            feed.maybePrefetch?.(index);
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
            if (!sharePost) {
                setSharePost(null);
                return;
            }
            if (!shareDispatcherRef.current) {
                toast.error("Share not ready — scroll to the post and try again.");
                setSharePost(null);
                return;
            }
            try {
                await shareDispatcherRef.current(sharePost, target);
            } catch (e: any) {
                toast.error(e?.message ?? "Share failed");
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

    const tabButtons = (
        <div
            className="flex items-center justify-center gap-0.5 p-0.5 rounded-full"
            style={{
                backgroundColor: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                minWidth: 240,
            }}
        >
            {(
                [
                    { id: "myPosts" as Tab, label: "My Posts" },
                    { id: "viewed" as Tab, label: "Viewed" },
                    { id: "forYou" as Tab, label: "For You" },
                ]
            ).map(({ id, label }) => (
                <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex-1 h-8 rounded-full text-[12px] font-bold text-center transition-colors ${tab === id
                        ? "bg-white text-black"
                        : "text-white/80 hover:text-white"
                        }`}
                    style={{ touchAction: "manipulation" }}
                >
                    {label}
                </button>
            ))}
        </div>
    );

    return (
        <div
            className="fixed inset-0 w-full overflow-hidden"
            style={{ backgroundColor: NELDES_COLORS.bg, height: "100dvh" }}
        >
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

            <div className="md:hidden w-full relative" style={{ height: "100dvh" }}>
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
                    {tabButtons}
                </div>

                {layoutReady && (tab === "forYou" ? (
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
                        onPostViewed={handlePostViewed}
                        onRegisterShare={(fn) => { shareDispatcherRef.current = fn; }}
                        isEnrolled={isEnrolled}
                        onGetApproved={handleGetApproved}
                    />
                ) : tab === "viewed" ? (
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
                ) : (
                    <MyPostsContainer
                        posts={myPostsFeed.posts}
                        loading={myPostsFeed.loading}
                        loadingMore={myPostsFeed.loadingMore}
                        error={myPostsFeed.error}
                        hasMore={myPostsFeed.hasMore}
                        onLoadMore={myPostsFeed.loadMore}
                        onVisible={handleVisible}
                        onUpdate={myPostsFeed.updatePost}
                        onOpenComments={(post) => setCommentPost(post)}
                        onOpenShare={(post) => setSharePost(post)}
                        onRefresh={myPostsFeed.refresh}
                        onRegisterShare={(fn) => { shareDispatcherRef.current = fn; }}
                        onCreate={() => setCreateOpen(true)}
                        onOpenOwnerMenu={(post) => setOwnerPost(post)}
                        onPostViewed={handlePostViewed}
                        currentUserId={currentUserId}
                        isEnrolled={isEnrolled}
                        onGetApproved={handleGetApproved}
                    />
                ))}
            </div>

            <div
                className="hidden md:flex w-full items-center justify-center px-6 py-6 gap-4"
                style={{ height: "100dvh" }}
            >
                <div
                    className="relative rounded-2xl overflow-hidden flex-shrink-0"
                    style={{ aspectRatio: "9 / 16", height: "calc(100dvh - 3rem)", backgroundColor: "#000" }}
                >
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40">
                        {tabButtons}
                    </div>

                    {layoutReady && (tab === "forYou" ? (
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
                            onPostViewed={handlePostViewed}
                            onRegisterShare={(fn) => { shareDispatcherRef.current = fn; }}
                            isEnrolled={isEnrolled}
                            onGetApproved={handleGetApproved}
                        />
                    ) : tab === "viewed" ? (
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
                    ) : (
                        <MyPostsContainer
                            posts={myPostsFeed.posts}
                            loading={myPostsFeed.loading}
                            loadingMore={myPostsFeed.loadingMore}
                            error={myPostsFeed.error}
                            hasMore={myPostsFeed.hasMore}
                            onLoadMore={myPostsFeed.loadMore}
                            onVisible={handleVisible}
                            onUpdate={myPostsFeed.updatePost}
                            onOpenComments={(post) => setCommentPost(post)}
                            onOpenShare={(post) => setSharePost(post)}
                            onRefresh={myPostsFeed.refresh}
                            onRegisterShare={(fn) => { shareDispatcherRef.current = fn; }}
                            onCreate={() => setCreateOpen(true)}
                            onOpenOwnerMenu={(post) => setOwnerPost(post)}
                            onPostViewed={handlePostViewed}
                            currentUserId={currentUserId}
                            isEnrolled={isEnrolled}
                            onGetApproved={handleGetApproved}
                        />
                    ))}
                </div>

                <div
                    className="flex-shrink-0 rounded-2xl overflow-hidden"
                    style={{ width: 380, height: "calc(100dvh - 3rem)", backgroundColor: "#161b22" }}
                >
                    <DesktopCommentsPanel post={displayPost} />
                </div>
            </div>

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
                    setTimeout(() => {
                        forYouFeed.refresh();
                        myPostsFeed.refresh();
                    }, 250);
                }}
            />
        </div>
    );
}