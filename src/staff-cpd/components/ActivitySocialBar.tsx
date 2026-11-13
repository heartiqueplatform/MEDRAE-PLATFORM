// src/staff-cpd/components/ActivitySocialBar.tsx
import { Users, Star, MessageCircle, Bookmark, BookmarkCheck } from "lucide-react";
import type { CpdActivity } from "../lib";

export function ActivitySocialBar({ activity, isBookmarked, onToggleBookmark, onOpenComments }: {
    activity: CpdActivity;
    isBookmarked: boolean;
    onToggleBookmark: () => void;
    onOpenComments?: () => void;
}) {
    const enrolledCount = Number(activity.enrolled_count ?? 0);
    const ratingAvg = Number(activity.rating_avg ?? 0);
    const ratingCount = Number(activity.rating_count ?? 0);
    const commentCount = Number(activity.comment_count ?? 0);

    return (
        <div className="grid grid-cols-4 gap-2 rounded-2xl bg-white dark:bg-[#161b22] p-3">
            <div className="text-center">
                <Users className="h-4 w-4 mx-auto text-slate-400 dark:text-slate-500 mb-1" />
                <p className="text-[13px] font-bold text-slate-900 dark:text-white tabular-nums leading-tight">
                    {enrolledCount.toLocaleString()}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">Enrolled</p>
            </div>

            <div className="text-center">
                <Star className="h-4 w-4 mx-auto text-amber-500 fill-amber-500 mb-1" />
                <p className="text-[13px] font-bold text-slate-900 dark:text-white tabular-nums leading-tight">
                    {ratingCount > 0 ? ratingAvg.toFixed(1) : "—"}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
                    {ratingCount > 0 ? `${ratingCount} rating${ratingCount === 1 ? "" : "s"}` : "No ratings"}
                </p>
            </div>

            <button onClick={onOpenComments} className="text-center active:scale-[0.97] transition-transform" style={{ touchAction: "manipulation" }}>
                <MessageCircle className="h-4 w-4 mx-auto text-slate-400 dark:text-slate-500 mb-1" />
                <p className="text-[13px] font-bold text-slate-900 dark:text-white tabular-nums leading-tight">{commentCount}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">Comments</p>
            </button>

            <button onClick={onToggleBookmark} className="text-center active:scale-[0.97] transition-transform" style={{ touchAction: "manipulation" }}>
                {isBookmarked
                    ? <BookmarkCheck className="h-4 w-4 mx-auto text-blue-600 dark:text-blue-400 fill-blue-600 dark:fill-blue-400 mb-1" />
                    : <Bookmark className="h-4 w-4 mx-auto text-slate-400 dark:text-slate-500 mb-1" />}
                <p className={`text-[13px] font-bold tabular-nums leading-tight ${isBookmarked ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white"}`}>
                    {isBookmarked ? "Saved" : "Save"}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">Bookmark</p>
            </button>
        </div>
    );
}