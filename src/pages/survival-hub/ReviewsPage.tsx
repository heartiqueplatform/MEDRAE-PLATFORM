import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { survivalApi } from '../../lib/survivalApi';
import { supabase } from '@/lib/supabaseClient';
import { ReviewCard } from '../../components/survival-hub/ReviewCard';
import { ChevronLeft, Star, Send, Loader2, MessageSquare } from 'lucide-react';

const ReviewsPage = () => {
    const { targetId } = useParams(); // The ID of the House
    const [searchParams] = useSearchParams();
    const targetType = searchParams.get('type') || 'housing';
    const navigate = useNavigate();

    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");

    const loadReviews = async () => {
        setLoading(true);
        try {
            const data = await survivalApi.getReviews(targetId!);
            setReviews(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadReviews(); }, [targetId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;

        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Log in to review!");

            await survivalApi.addReview({
                user_id: user.id,
                target_id: targetId!,
                target_type: targetType,
                rating: rating,
                comment: comment
            });

            setComment(""); // Clear form
            loadReviews(); // Refresh list
            alert("Review posted!");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-10 dark:bg-background">
            {/* 1. Header */}
            <div className="sticky top-0 z-20 bg-white/90 p-4 backdrop-blur-md dark:bg-slate-900/90 border-b dark:border-slate-800 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-lg font-bold dark:text-white capitalize">{targetType} Reviews</h1>
            </div>

            <div className="mx-auto max-w-xl p-4 space-y-6">

                {/* 2. WRITE A REVIEW FORM */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Rate your experience</h3>

                    <div className="flex gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                className="transition-transform active:scale-125"
                            >
                                <Star
                                    size={28}
                                    className={star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-700"}
                                />
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        <textarea
                            required
                            placeholder="Share your thoughts with other students..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            rows={3}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                        <button
                            disabled={submitting}
                            type="submit"
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-all active:scale-95 disabled:bg-slate-400"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={18} /> : <><Send size={16} /> Post Review</>}
                        </button>
                    </form>
                </div>

                {/* 3. REVIEWS LIST */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest px-1">
                        Recent Feedback ({reviews.length})
                    </h3>

                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-300" /></div>
                    ) : reviews.length > 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-800 px-4">
                            {reviews.map((r: any) => (
                                <ReviewCard key={r.id} review={r} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed dark:border-slate-800">
                            <MessageSquare className="mx-auto text-slate-200 mb-2" size={40} />
                            <p className="text-sm text-slate-500">No reviews yet. Be the first!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReviewsPage;