// src/staff-cpd/components/CpdCommentPreviewSheet.tsx
import { useState } from "react";
import { X, MessageCircle, Send, Loader2 } from "lucide-react";
import { useActivityComments, usePostComment } from "../hooks";
import { type CpdActivity, fmtDate } from "../lib";

type OptimisticComment = {
    id: string;
    body: string;
    created_at: string;
    user: { name: string | null; avatar_url: string | null } | null;
    __optimistic?: boolean;
};

export function CpdCommentPreviewSheet({
    activity,
    onClose,
    onOpenDetail,
}: {
    activity: CpdActivity;
    onClose: () => void;
    onOpenDetail: () => void;
}) {
    const comments = useActivityComments(activity.id);
    const postComment = usePostComment();
    const [draft, setDraft] = useState("");
    const [optimisticPosts, setOptimisticPosts] = useState<OptimisticComment[]>([]);

    const serverItems = comments.data?.pages.flatMap(p => p.items) ?? [];

    // Drop optimistic posts once the real server comment with matching body arrives
    const reconciled = optimisticPosts.filter(
        op => !serverItems.some(s => s.body === op.body)
    );

    const items: OptimisticComment[] = [
        ...reconciled,
        ...serverItems.map(s => ({
            id: s.id,
            body: s.body,
            created_at: s.created_at,
            user: s.user ?? null,
        })),
    ].slice(0, 30);

    const handlePost = async () => {
        const body = draft.trim();
        if (!body || postComment.isPending) return;

        const tempId = `optimistic-${Date.now()}`;
        const op: OptimisticComment = {
            id: tempId,
            body,
            created_at: new Date().toISOString(),
            user: null,
            __optimistic: true,
        };

        // Instant UI
        setOptimisticPosts(prev => [op, ...prev]);
        setDraft("");

        try {
            await postComment.mutateAsync({ activityId: activity.id, body });
        } catch {
            // Roll back
            setOptimisticPosts(prev => prev.filter(p => p.id !== tempId));
            setDraft(body);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                className="relative w-full max-h-[80vh] rounded-t-3xl bg-white dark:bg-[#161b22]
                           flex flex-col shadow-2xl
                           animate-in slide-in-from-bottom duration-200"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
                {/* Handle + header */}
                <div className="shrink-0 pt-2">
                    <div className="h-1 w-10 mx-auto rounded-full bg-slate-300 dark:bg-white/20" />
                    <div className="flex items-start justify-between gap-2 px-4 pt-3 pb-2">
                        <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Comments · {items.length}{comments.hasNextPage ? "+" : ""}
                            </p>
                            <h3 className="text-[13px] font-bold text-slate-900 dark:text-white truncate mt-0.5">
                                {activity.title}
                            </h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="h-8 w-8 rounded-full flex items-center justify-center
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-500 dark:text-slate-300
                                       active:scale-90 transition-transform shrink-0"
                            style={{ touchAction: "manipulation" }}
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-2 min-h-0">
                    {comments.isLoading && items.length === 0 ? (
                        <div className="space-y-2 py-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-white/[0.06] animate-pulse" />
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-10">
                            <MessageCircle className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                            <p className="text-[12px] font-bold text-slate-900 dark:text-white">
                                No comments yet
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Be the first to share your thoughts.
                            </p>
                        </div>
                    ) : (
                        items.map((c) => (
                            <div
                                key={c.id}
                                className={`rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-1 ${c.__optimistic ? "opacity-70" : ""
                                    }`}
                            >
                                <div className="flex items-start gap-2">
                                    <div className="h-7 w-7 rounded-full overflow-hidden bg-slate-200 dark:bg-white/[0.08]
                                                    flex items-center justify-center shrink-0">
                                        {c.user?.avatar_url ? (
                                            <img src={c.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                                {(c.user?.name ?? "?").charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                                                {c.user?.name ?? "You"}
                                            </p>
                                            <span className="text-[9px] text-slate-400 dark:text-slate-500">
                                                {c.__optimistic ? "Sending…" : fmtDate(c.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-[12px] text-slate-700 dark:text-slate-300 mt-1 leading-snug whitespace-pre-wrap">
                                            {c.body}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {comments.hasNextPage && (
                        <button
                            onClick={() => comments.fetchNextPage()}
                            disabled={comments.isFetchingNextPage}
                            className="w-full h-9 rounded-xl
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-700 dark:text-slate-200
                                       text-[11px] font-bold
                                       active:scale-[0.97] transition-transform
                                       disabled:opacity-50"
                            style={{ touchAction: "manipulation" }}
                        >
                            {comments.isFetchingNextPage ? "Loading…" : "Load more"}
                        </button>
                    )}
                </div>

                {/* Composer + open-detail CTA */}
                <div className="shrink-0 border-t border-slate-100 dark:border-white/[0.04] p-3 space-y-2">
                    <div className="flex items-start gap-2">
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Add a comment…"
                            rows={2}
                            maxLength={2000}
                            className="flex-1 rounded-xl bg-slate-50 dark:bg-[#0d1117]
                                       px-3 py-2 text-[12px]
                                       text-slate-900 dark:text-white
                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                       outline-none resize-none"
                        />
                        <button
                            onClick={handlePost}
                            disabled={!draft.trim() || postComment.isPending}
                            className="h-10 w-10 rounded-xl bg-blue-600 text-white
                                       flex items-center justify-center shrink-0
                                       active:scale-[0.97] transition-transform
                                       disabled:opacity-40"
                            style={{ touchAction: "manipulation" }}
                            aria-label="Post comment"
                        >
                            {postComment.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                    <button
                        onClick={onOpenDetail}
                        className="w-full h-10 rounded-xl
                                   bg-slate-900 dark:bg-white
                                   text-white dark:text-slate-900
                                   text-[12px] font-bold
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        Open full activity →
                    </button>
                </div>
            </div>
        </div>
    );
}