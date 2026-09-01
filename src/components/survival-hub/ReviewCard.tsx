import { useState } from "react";
import { authManager } from "@/lib/authManager";
import { cachedSurvivalService } from "@/lib/services/survivalService";
import { Pencil, Trash2, Check, X } from "lucide-react";

export const ReviewCard = ({
    review,
    onUpdate,
}: {
    review: any;
    onUpdate?: () => void;
}) => {
    const reviewer = review.reviewer;
    const currentUser = authManager.getUser();

    const isOwner = currentUser?.id === review.user_id;

    const [isEditing, setIsEditing] = useState(false);
    const [editedComment, setEditedComment] = useState(review.comment);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleSave = async () => {
        if (!editedComment.trim()) return;

        setSaving(true);

        try {
            await cachedSurvivalService.updateReview(
                review.id,
                review.target_id,
                {
                    comment: editedComment,
                }
            );

            setIsEditing(false);
            onUpdate?.();
        } catch (err) {
            console.error("Update review error:", err);
            alert("Failed to update review.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this review?"
        );

        if (!confirmed) return;

        setDeleting(true);

        try {
            await cachedSurvivalService.deleteReview(
                review.id,
                review.target_id
            );

            onUpdate?.();
        } catch (err) {
            console.error("Delete review error:", err);
            alert("Failed to delete review.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className={`px-4 py-4 md:px-0 md:py-4 border-b border-slate-100/50 dark:border-slate-800/50 last:border-0 ${deleting ? 'opacity-50 pointer-events-none' : ''}`}>

            {/* Deleting Overlay */}
            {deleting && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-none md:rounded-xl">
                    <div className="flex flex-col items-center gap-2 text-white">
                        <div className="h-6 w-6 md:h-8 md:w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Deleting...</span>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2.5 md:gap-3">
                <img
                    src={reviewer?.avatar_url || "https://via.placeholder.com/150"}
                    className="h-8 w-8 md:h-9 md:w-9 rounded-full object-cover bg-slate-100 shrink-0"
                    alt=""
                />

                <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {reviewer?.name || "Verified User"}
                    </p>

                    <p className="text-[9px] md:text-[10px] text-slate-500 truncate">
                        {reviewer?.institution}
                    </p>
                </div>

                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    <div className="flex text-amber-400 text-[10px] md:text-xs">
                        {[...Array(review.rating)].map((_, i) => (
                            <span key={i}>★</span>
                        ))}
                    </div>

                    {isOwner && !isEditing && !deleting && (
                        <div className="flex items-center gap-0.5 md:gap-1">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1 md:p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                title="Edit review"
                            >
                                <Pencil size={14} className="md:w-4 md:h-4" />
                            </button>

                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="p-1 md:p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                title="Delete review"
                            >
                                <Trash2 size={14} className="md:w-4 md:h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isEditing ? (
                <div className="mt-3 md:mt-4 space-y-2.5 md:space-y-3">
                    <textarea
                        value={editedComment}
                        onChange={(e) => setEditedComment(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 p-2.5 md:p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />

                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-1.5 md:gap-2 rounded-lg bg-green-600 px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold text-white disabled:opacity-50 hover:bg-green-700 transition-colors active:scale-95"
                        >
                            <Check size={14} className="md:w-4 md:h-4" />
                            {saving ? "Saving..." : "Save"}
                        </button>

                        <button
                            onClick={() => {
                                setEditedComment(review.comment);
                                setIsEditing(false);
                            }}
                            className="flex items-center gap-1.5 md:gap-2 rounded-lg bg-slate-200 px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors active:scale-95"
                        >
                            <X size={14} className="md:w-4 md:h-4" />
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <p className="mt-2 md:mt-3 text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                    {review.comment}
                </p>
            )}
        </div>
    );
};