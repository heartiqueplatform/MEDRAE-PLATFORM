import { useState } from "react";
import { authManager } from "@/lib/authManager";
import { cachedSurvivalService } from "@/lib/services/survivalService";
import { Pencil, Trash2, Check, X, Star, Loader2 } from "lucide-react";
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
        tap("success");
        setSaving(true);
        try {
            await cachedSurvivalService.updateReview(
                review.id,
                review.target_id,
                { comment: editedComment }
            );
            setIsEditing(false);
            onUpdate?.();
            toast.success("Review updated");
        } catch (err) {
            console.error("Update review error:", err);
            toast.error("Failed to update review");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Delete this review?")) return;
        tap("warning");
        setDeleting(true);
        try {
            await cachedSurvivalService.deleteReview(
                review.id,
                review.target_id
            );
            onUpdate?.();
            toast.success("Review deleted");
        } catch (err) {
            console.error("Delete review error:", err);
            toast.error("Failed to delete review");
        } finally {
            setDeleting(false);
        }
    };

    const handleCancelEdit = () => {
        tap();
        setEditedComment(review.comment);
        setIsEditing(false);
    };

    return (
        <article
            className={`relative rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2.5
                        ${deleting ? "opacity-50 pointer-events-none" : ""}`}
        >
            {/* Deleting overlay */}
            {deleting && (
                <div className="absolute inset-0 z-10 flex items-center justify-center
                                bg-black/50 rounded-2xl">
                    <div className="flex flex-col items-center gap-2 text-white">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                            Deleting…
                        </span>
                    </div>
                </div>
            )}

            {/* Header row */}
            <div className="flex items-center gap-2.5">
                <img
                    src={reviewer?.avatar_url || "https://via.placeholder.com/150"}
                    className="h-9 w-9 rounded-full object-cover shrink-0
                               bg-slate-100 dark:bg-white/[0.06]
                               ring-2 ring-slate-200 dark:ring-white/[0.08]"
                    alt=""
                />

                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                        {reviewer?.name || "Verified user"}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider
                                  text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {reviewer?.institution || "Student"}
                    </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {isOwner && !isEditing && !deleting && (
                        <>
                            <button
                                onClick={() => {
                                    tap();
                                    setIsEditing(true);
                                }}
                                aria-label="Edit review"
                                className="h-8 w-8 rounded-lg
                                           bg-slate-100 dark:bg-white/[0.06]
                                           text-slate-600 dark:text-slate-300
                                           flex items-center justify-center
                                           active:scale-[0.92] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                aria-label="Delete review"
                                className="h-8 w-8 rounded-lg
                                           bg-rose-50 dark:bg-rose-400/10
                                           text-rose-700 dark:text-rose-400
                                           flex items-center justify-center
                                           active:scale-[0.92] transition-transform
                                           disabled:opacity-50"
                                style={{ touchAction: "manipulation" }}
                            >
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                        key={n}
                        className={`h-3.5 w-3.5 ${n <= review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-200 dark:text-white/[0.1]"
                            }`}
                        strokeWidth={1.75}
                    />
                ))}
            </div>

            {/* Comment / edit form */}
            {isEditing ? (
                <div className="space-y-2">
                    <textarea
                        value={editedComment}
                        onChange={(e) => setEditedComment(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border-0 outline-none resize-none
                                   bg-slate-50 dark:bg-[#0d1117]
                                   px-3 py-2 text-[13px]
                                   text-slate-900 dark:text-white
                                   focus:ring-2 focus:ring-blue-500/40"
                        style={{ touchAction: "manipulation" }}
                    />

                    <div className="flex gap-1.5">
                        <button
                            onClick={handleSave}
                            disabled={saving || !editedComment.trim()}
                            className="flex-1 h-9 rounded-lg
                                       bg-emerald-600 text-white
                                       text-[11px] font-bold
                                       flex items-center justify-center gap-1.5
                                       active:scale-[0.97] transition-transform
                                       disabled:opacity-60"
                            style={{ touchAction: "manipulation" }}
                        >
                            {saving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                            )}
                            {saving ? "Saving…" : "Save"}
                        </button>

                        <button
                            onClick={handleCancelEdit}
                            disabled={saving}
                            className="flex-1 h-9 rounded-lg
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-700 dark:text-slate-200
                                       text-[11px] font-bold
                                       flex items-center justify-center gap-1.5
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-[13px] text-slate-700 dark:text-slate-300
                              leading-relaxed whitespace-pre-wrap">
                    {review.comment}
                </p>
            )}
        </article>
    );
};