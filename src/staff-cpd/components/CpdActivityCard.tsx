// src/staff-cpd/components/CpdActivityCard.tsx
import {
    BookOpen, Clock, Award, Users, Star, MessageCircle,
    Bookmark, BookmarkCheck, ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { type CpdActivity, fmtHours, fmtPoints } from "../lib";

export function CpdActivityCard({
    activity,
    isBookmarked = false,
    myRating = 0,
    onToggleBookmark,
    onOpenComments,
    onQuickRate,
    onPressStart,
}: {
    activity: CpdActivity;
    isBookmarked?: boolean;
    myRating?: number;
    onToggleBookmark?: () => void;
    onOpenComments?: () => void;
    onQuickRate?: () => void;
    onPressStart?: () => void;
}) {
    const author = activity.author;
    const ratingAvg = Number(activity.rating_avg ?? 0);
    const ratingCount = activity.rating_count ?? 0;
    const enrolledCount = activity.enrolled_count ?? 0;
    const commentCount = activity.comment_count ?? 0;

    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden active:scale-[0.995] transition-transform">
            <Link
                to={`/cpd/activity/${activity.id}`}
                onPointerDown={onPressStart}
                className="block"
                style={{ touchAction: "manipulation" }}
            >
                {/* Cover */}
                <div className="aspect-video relative overflow-hidden bg-slate-100 dark:bg-white/[0.06]">
                    {activity.thumbnail_url ? (
                        <img
                            src={activity.thumbnail_url}
                            alt={activity.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <BookOpen className="h-10 w-10 text-slate-400 dark:text-slate-600" strokeWidth={2.2} />
                        </div>
                    )}

                    {activity.category && (
                        <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider
                                         px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
                            {activity.category}
                        </span>
                    )}
                    {activity.difficulty && (
                        <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider
                                         px-2 py-0.5 rounded-full capitalize bg-black/60 text-white backdrop-blur-sm">
                            {activity.difficulty}
                        </span>
                    )}

                    {/* Bookmark overlay */}
                    {onToggleBookmark && (
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleBookmark(); }}
                            className="absolute bottom-2 right-2 h-8 w-8 rounded-full
                                       bg-black/60 backdrop-blur-sm
                                       flex items-center justify-center
                                       active:scale-90 transition-transform"
                            style={{ touchAction: "manipulation" }}
                            aria-label={isBookmarked ? "Remove bookmark" : "Save activity"}
                        >
                            {isBookmarked ? (
                                <BookmarkCheck className="h-4 w-4 text-blue-400 fill-blue-400" />
                            ) : (
                                <Bookmark className="h-4 w-4 text-white" />
                            )}
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="p-3 space-y-2">
                    <h3 className="text-[13px] font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 min-h-[2.25rem]">
                        {activity.title}
                    </h3>

                    {activity.short_description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                            {activity.short_description}
                        </p>
                    )}

                    {/* Meta chips */}
                    <div className="flex items-center gap-2.5 pt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            <Clock className="h-3 w-3" /> {fmtHours(activity.learning_hours)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            <Award className="h-3 w-3" /> {fmtPoints(activity.configured_cpd_points)} pts
                        </span>
                    </div>

                    {/* Social row */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" /> {enrolledCount.toLocaleString()}
                        </span>

                        <button
                            onClick={(e) => {
                                e.preventDefault(); e.stopPropagation();
                                onQuickRate?.();
                            }}
                            disabled={!onQuickRate}
                            className="inline-flex items-center gap-1 active:scale-[0.94] transition-transform disabled:cursor-default"
                            style={{ touchAction: "manipulation" }}
                        >
                            <Star className={`h-3 w-3 ${myRating > 0 || ratingCount > 0
                                ? "fill-amber-500 text-amber-500"
                                : "text-slate-400"}`} />
                            <span className="tabular-nums">
                                {ratingCount > 0 ? ratingAvg.toFixed(1) : "Rate"}
                            </span>
                            {ratingCount > 0 && (
                                <span className="text-slate-400 dark:text-slate-500">({ratingCount})</span>
                            )}
                        </button>

                        <button
                            onClick={(e) => {
                                e.preventDefault(); e.stopPropagation();
                                onOpenComments?.();
                            }}
                            disabled={!onOpenComments}
                            className="inline-flex items-center gap-1 active:scale-[0.94] transition-transform disabled:cursor-default"
                            style={{ touchAction: "manipulation" }}
                        >
                            <MessageCircle className="h-3 w-3" /> {commentCount}
                        </button>
                    </div>

                    {/* Author row */}
                    {author && (
                        <div className="flex items-center gap-2 pt-2 mt-1 border-t border-slate-100 dark:border-white/[0.04]">
                            <div className="h-6 w-6 rounded-full overflow-hidden bg-slate-200 dark:bg-white/[0.08] shrink-0 flex items-center justify-center">
                                {author.avatar_url ? (
                                    <img src={author.avatar_url} alt={author.name ?? ""} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                        {(author.name ?? "?").charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                                    {author.name ?? "Unknown contributor"}
                                </p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    {author.is_verified_contributor && (
                                        <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold
                                                         bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
                                            <ShieldCheck className="h-2 w-2" /> Verified
                                        </span>
                                    )}
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        {(author.contributor_tier ?? "contributor")
                                            .replace(/_/g, " ")
                                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Link>
        </div>
    );
}