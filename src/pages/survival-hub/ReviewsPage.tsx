import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { cachedSurvivalService } from "../../lib/services/survivalService";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { authManager } from "@/lib/authManager";
import { ReviewCard } from "../../components/survival-hub/ReviewCard";
import { ReviewCardSkeleton } from "../../components/survival-hub/ReviewCardSkeleton";
import {
    ChevronLeft,
    Star,
    Send,
    Loader2,
    MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { playSound } from "@/lib/soundManager";

const tap = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        if (type === "success") navigator.vibrate([15, 30, 15]);
        else if (type === "warning") navigator.vibrate(40);
        else navigator.vibrate(12);
    }
};

const ReviewsPage = () => {
    const { targetId } = useParams();
    const [searchParams] = useSearchParams();
    const targetType = searchParams.get("type") || "housing";
    const navigate = useNavigate();

    const [submitting, setSubmitting] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [triggerRefresh, setTriggerRefresh] = useState(0);

    const { data, loading } = useCachedQuery(
        `reviews-${targetId}-${triggerRefresh}`,
        () => cachedSurvivalService.getReviews(targetId!),
        [targetId, triggerRefresh],
        { ttl: 0 }
    );

    const reviews = Array.isArray(data) ? data : [];

    const handleBack = () => {
        tap();
        navigate(-1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;

        tap("success");
        setSubmitting(true);
        try {
            const user = authManager.getState().user;
            if (!user) throw new Error("Sign in to review");

            await cachedSurvivalService.addReview({
                user_id: user.id,
                target_id: targetId!,
                target_type: targetType,
                rating,
                comment,
            });

            setComment("");
            setTriggerRefresh((prev) => prev + 1);
            toast.success("Review posted");
        } catch (err: any) {
            console.error("Review error:", err);
            toast.error(err.message || "Failed to post review");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-[#0d1117]">
            {/* ── Header ──────────────────────────────────────── */}
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={handleBack}
                    aria-label="Go back"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate
                                   text-slate-900 dark:text-white capitalize">
                        {targetType} reviews
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate tabular-nums">
                        {loading
                            ? "Loading…"
                            : `${reviews.length} review${reviews.length === 1 ? "" : "s"}`}
                    </p>
                </div>
            </header>

            {/* ── Body ────────────────────────────────────────── */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <div className="w-full max-w-xl mx-auto px-4 py-4 pb-24 space-y-3 safe-bottom">
                    {/* Compose card */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider
                                          text-blue-600 dark:text-blue-400 leading-none mb-1">
                                Write a review
                            </p>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                Rate your experience
                            </h3>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((star) => {
                                const active = star <= rating;
                                return (
                                    <button
                                        key={star}
                                        onClick={() => {
                                            tap();
                                            setRating(star);
                                        }}
                                        aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                                        className="h-10 w-10 rounded-lg
                                                   flex items-center justify-center
                                                   active:scale-[0.92] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <Star
                                            className={`h-6 w-6 ${active
                                                ? "fill-amber-400 text-amber-400"
                                                : "text-slate-300 dark:text-white/[0.15]"
                                                }`}
                                            strokeWidth={1.75}
                                        />
                                    </button>
                                );
                            })}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-2">
                            <textarea
                                required
                                placeholder="Share your thoughts with other students…"
                                rows={3}
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="w-full rounded-xl border-0 outline-none resize-none
                                           bg-slate-50 dark:bg-[#0d1117]
                                           px-3.5 py-2.5 text-sm
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           focus:ring-2 focus:ring-blue-500/40"
                                style={{ touchAction: "manipulation" }}
                            />

                            <button
                                type="submit"
                                disabled={submitting || !comment.trim()}
                                className={`w-full h-11 rounded-xl
                                            text-sm font-bold
                                            flex items-center justify-center gap-2
                                            transition-transform
                                            ${submitting || !comment.trim()
                                        ? "bg-slate-200 dark:bg-white/[0.08] text-slate-400 dark:text-slate-500 cursor-not-allowed"
                                        : "bg-blue-600 text-white active:scale-[0.97]"
                                    }`}
                                style={{ touchAction: "manipulation" }}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Posting…
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" />
                                        Post review
                                    </>
                                )}
                            </button>
                        </form>
                    </section>

                    {/* Reviews list */}
                    <div className="flex items-center justify-between px-1 pt-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider
                                      text-slate-500 dark:text-slate-400">
                            Recent feedback
                        </p>
                        {!loading && (
                            <span className="text-[10px] font-bold uppercase tracking-wider
                                             bg-slate-100 dark:bg-white/[0.06]
                                             text-slate-500 dark:text-slate-400
                                             px-1.5 py-0.5 rounded-full tabular-nums">
                                {reviews.length}
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filtered.map((site: any) => (
                                <PlacementCard key={site.id} site={site} onDelete={handleSilentDelete} />
                            ))}
                        </div>
                    ) : reviews.length > 0 ? (
                        <div className="space-y-2">
                            {reviews.map((r: any) => (
                                <ReviewCard
                                    key={r.id}
                                    review={r}
                                    onUpdate={() =>
                                        setTriggerRefresh((prev) => prev + 1)
                                    }
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-8 text-center space-y-3">
                            <div className="h-14 w-14 rounded-full
                                            bg-slate-100 dark:bg-white/[0.06]
                                            flex items-center justify-center mx-auto">
                                <MessageSquare className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    No reviews yet
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[220px] mx-auto leading-snug">
                                    Be the first to share your experience.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ReviewsPage;