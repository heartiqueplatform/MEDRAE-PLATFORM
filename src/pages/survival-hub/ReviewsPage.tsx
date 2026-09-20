import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { cachedSurvivalService } from '../../lib/services/survivalService';
import { useCachedQuery } from '../../hooks/useCachedQuery';
import { authManager } from '@/lib/authManager';
import { ReviewCard } from '../../components/survival-hub/ReviewCard';
import { ReviewCardSkeleton } from '../../components/survival-hub/ReviewCardSkeleton';
import { ChevronLeft, Star, Send, Loader2, MessageSquare } from 'lucide-react';

const ReviewsPage = () => {
    const { targetId } = useParams();
    const [searchParams] = useSearchParams();
    const targetType = searchParams.get('type') || 'housing';
    const navigate = useNavigate();

    const [submitting, setSubmitting] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [triggerRefresh, setTriggerRefresh] = useState(0);

    const { data, loading, refetch } = useCachedQuery(
        `reviews-${targetId}-${triggerRefresh}`,
        () => cachedSurvivalService.getReviews(targetId!),
        [targetId, triggerRefresh],
        { ttl: 0 }
    );

    const reviews = Array.isArray(data) ? data : [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;

        setSubmitting(true);
        try {
            const user = authManager.getState().user;
            if (!user) throw new Error("Log in to review!");

            await cachedSurvivalService.addReview({
                user_id: user.id,
                target_id: targetId!,
                target_type: targetType,
                rating,
                comment
            });

            setComment("");
            setTriggerRefresh(prev => prev + 1);

            alert("Review posted!");
        } catch (err: any) {
            console.error("Review error:", err);

            alert(
                JSON.stringify(
                    {
                        message: err.message,
                        details: err.details,
                        hint: err.hint,
                        code: err.code
                    },
                    null,
                    2
                )
            );
        }
        finally {
            setSubmitting(false);
        }
    };

    const renderSkeletons = () => {
        return Array(4).fill(0).map((_, index) => (
            <ReviewCardSkeleton key={`skeleton-${index}`} />
        ));
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background pb-20">

            {/* ============ STICKY HEADER — sits on top, no border ============ */}
            <div className="sticky top-0 z-20 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3 px-3 py-3 md:px-6 md:py-4">
                    {/* Back button — pure chevron icon */}
                    <button
                        onClick={() => navigate(-1)}
                        aria-label="Go back"
                        className="inline-flex w-fit items-center justify-center p-1.5 -ml-1.5 text-slate-700 dark:text-slate-200 active:opacity-60 transition"
                    >
                        <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.5} />
                    </button>
                    <h1 className="text-lg md:text-xl font-bold dark:text-white capitalize">
                        {loading ? 'Loading...' : `${targetType} Reviews (${reviews.length})`}
                    </h1>
                </div>
            </div>

            <div className="mx-auto max-w-xl px-3 md:px-4 py-3 md:py-4 space-y-3 md:space-y-6">

                {/* 2. WRITE A REVIEW FORM */}
                <div className="bg-white dark:bg-muted/30 p-4 md:p-5 rounded-2xl">
                    <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-white mb-3 md:mb-4">Rate your experience</h3>

                    <div className="flex gap-1.5 md:gap-2 mb-3 md:mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                className="transition-transform active:scale-125"
                            >
                                <Star
                                    size={24}
                                    className={`md:w-7 md:h-7 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-700"}`}
                                />
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-2.5 md:space-y-3">
                        <textarea
                            required
                            placeholder="Share your thoughts with other students..."
                            className="w-full rounded-lg md:rounded-xl bg-slate-50 dark:bg-slate-800 p-3 md:p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            rows={3}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                        <button
                            disabled={submitting}
                            type="submit"
                            className="flex w-full items-center justify-center gap-2 rounded-lg md:rounded-xl bg-blue-600 py-2.5 md:py-3 text-sm font-bold text-white transition-all active:scale-95 disabled:bg-slate-400 hover:bg-blue-700"
                        >
                            {submitting ? <Loader2 className="animate-spin md:w-[18px] md:h-[18px]" size={16} /> : <><Send size={16} className="md:w-[18px] md:h-[18px]" /> Post Review</>}
                        </button>
                    </form>
                </div>

                {/* 3. REVIEWS LIST */}
                <div className="space-y-3 md:space-y-4">
                    <div className="px-1 py-2 md:py-0">
                        <h3 className="text-[9px] md:text-xs font-black uppercase text-slate-400 tracking-widest">
                            Recent Feedback {!loading && `(${reviews.length})`}
                        </h3>
                    </div>

                    {loading ? (
                        <div className="space-y-3 md:space-y-4">
                            {renderSkeletons()}
                        </div>
                    ) : reviews.length > 0 ? (
                        <div className="space-y-3 md:space-y-4">
                            {reviews.map((r: any) => (
                                <ReviewCard
                                    key={r.id}
                                    review={r}
                                    onUpdate={() => setTriggerRefresh(prev => prev + 1)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 md:py-20 bg-white dark:bg-muted/30 rounded-2xl">
                            <MessageSquare className="mx-auto text-slate-200 mb-2 md:w-10 md:h-10" size={32} />
                            <p className="text-sm text-slate-500">
                                No reviews yet. Be the first!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReviewsPage;