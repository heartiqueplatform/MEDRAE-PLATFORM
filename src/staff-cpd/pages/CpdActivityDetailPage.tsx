// src/staff-cpd/pages/CpdActivityDetailPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import {
    Award, Clock, CheckCircle2, ArrowRight, Sparkles, Lock, ShieldCheck, User,
    Trophy, Send, Trash2, Loader2,
} from "lucide-react";
import {
    useActivityTree, useMyEnrollment, useEnroll, useProgressForEnrollment,
    useMyRating, useUpsertRating, useMyBookmark, useToggleBookmark,
    useMyMastery, useMarkMastered,
    useActivityComments, usePostComment, useDeleteComment,
} from "../hooks";
import {
    ContentTypeChip, CpdEmptyState, RatingStars,
    ActivitySocialBar, MasteredBadge,
} from "../components";
import { fmtHours, fmtPoints, fmtDuration, fmtDate } from "../lib";
import type { CpdContentItem } from "../lib";
import { FullScreen, PageHeader, ScrollBody, tap, getStatusTone } from "./shared";

export function CpdActivityDetailPage() {
    const { id = "" } = useParams();
    const nav = useNavigate();
    const tree = useActivityTree(id);
    const enrollment = useMyEnrollment(id);
    const enroll = useEnroll();
    const progress = useProgressForEnrollment(enrollment.data?.id);

    const myRating = useMyRating(id);
    const upsertRating = useUpsertRating();
    const myBookmark = useMyBookmark(id);
    const toggleBookmark = useToggleBookmark();
    const myMastery = useMyMastery(id);
    const markMastered = useMarkMastered();

    const [optimisticEnrolled, setOptimisticEnrolled] = useState(false);
    const [pendingStars, setPendingStars] = useState<number | null>(null);
    const [optimisticBookmark, setOptimisticBookmark] = useState<boolean | null>(null);
    const [optimisticMastered, setOptimisticMastered] = useState(false);
    const [draftComment, setDraftComment] = useState("");

    /* ✅ Clear optimistic flags in effects (NOT during render) */
    useEffect(() => {
        if (optimisticEnrolled && enrollment.data) setOptimisticEnrolled(false);
    }, [optimisticEnrolled, enrollment.data]);

    useEffect(() => {
        if (optimisticMastered && myMastery.data) setOptimisticMastered(false);
    }, [optimisticMastered, myMastery.data]);

    useEffect(() => {
        if (optimisticBookmark !== null && !!myBookmark.data === optimisticBookmark) {
            setOptimisticBookmark(null);
        }
    }, [optimisticBookmark, myBookmark.data]);

    const handleBackToList = useCallback(() => {
        tap();
        nav("/cpd/catalog");
    }, [nav]);

    /* ── Loading ── */
    if (tree.isLoading) {
        return (
            <FullScreen>
                <PageHeader title="Loading…" onBack={handleBackToList} />
                <ScrollBody>
                    {/* ✅ No px-* — ScrollBody owns gutter */}
                    <div className="pt-3 space-y-3">
                        <DetailSkeleton />
                    </div>
                </ScrollBody>
            </FullScreen>
        );
    }

    /* ── Not found ── */
    if (!tree.data) {
        return (
            <FullScreen>
                <PageHeader title="Activity" onBack={handleBackToList} />
                <ScrollBody>
                    <div className="pt-3">
                        <CpdEmptyState title="Activity not found" hint="The activity may have been removed." />
                    </div>
                </ScrollBody>
            </FullScreen>
        );
    }

    const { activity, modules, contentByModule, assessments } = tree.data;
    const author = (activity as any).author as
        | { user_id: string; name: string | null; avatar_url: string | null; is_verified_contributor: boolean; contributor_tier: string }
        | null | undefined;

    const progressByItem = new Map((progress.data ?? []).map(p => [p.content_item_id, p]));

    const allRequired: CpdContentItem[] = modules.flatMap(m =>
        (contentByModule[m.id] ?? []).filter(c => c.is_required)
    );
    const doneRequired = allRequired.filter(c => progressByItem.get(c.id)?.status === "completed").length;
    const allDone = allRequired.length === 0 || doneRequired === allRequired.length;

    const totalItems = modules.reduce((n, m) => n + (contentByModule[m.id]?.length ?? 0), 0);
    const doneItems = modules.reduce(
        (n, m) => n + (contentByModule[m.id] ?? []).filter(c => progressByItem.get(c.id)?.status === "completed").length,
        0
    );
    const fallbackProgress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
    const shownProgress = enrollment.data ? Math.max(enrollment.data.progress_percentage, fallbackProgress) : 0;

    const isEnrolled = !!enrollment.data || optimisticEnrolled;
    const currentStars = pendingStars !== null ? pendingStars : myRating.data?.rating ?? 0;
    const isBookmarked = optimisticBookmark !== null ? optimisticBookmark : !!myBookmark.data;
    const isMastered = !!myMastery.data || optimisticMastered;
    const canMaster = allDone && isEnrolled && !isMastered;

    /* ── Handlers ── */
    const handleEnroll = async () => {
        if (isEnrolled || enroll.isPending) return;
        tap("success");
        setOptimisticEnrolled(true);
        try {
            await enroll.mutateAsync(activity.id);
        } catch {
            setOptimisticEnrolled(false);
        }
    };

    const submitRating = async (stars: number) => {
        if (upsertRating.isPending || stars === currentStars) return;
        setPendingStars(stars);
        tap("success");
        try {
            await upsertRating.mutateAsync({ activityId: activity.id, rating: stars });
            setPendingStars(null);
        } catch {
            setPendingStars(null);
        }
    };

    const handleToggleBookmark = () => {
        if (toggleBookmark.isPending) return;
        const next = !isBookmarked;
        tap();
        setOptimisticBookmark(next);
        toggleBookmark.mutate(
            { activityId: activity.id, isBookmarked: next },
            { onError: () => setOptimisticBookmark(!next) }
        );
    };

    const handleMaster = () => {
        if (isMastered || markMastered.isPending) return;
        tap("success");
        setOptimisticMastered(true);
        markMastered.mutate(activity.id, {
            onError: () => setOptimisticMastered(false),
        });
    };

    return (
        <FullScreen>
            <PageHeader
                title={activity.title}
                subtitle={activity.category || "CPD Activity"}
                onBack={handleBackToList}
            />

            <ScrollBody>
                {/* ✅ No px-* — ScrollBody owns the gutter */}
                <div className="pt-3 space-y-3">
                    {/* ── Hero card ── */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">
                        {activity.thumbnail_url && (
                            <div className="relative aspect-[16/9] bg-slate-100 dark:bg-white/[0.06]">
                                <img
                                    src={activity.thumbnail_url}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                        <div className="p-4 space-y-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                                {activity.category && (
                                    <span className="inline-flex items-center rounded-full px-2 py-0.5
                                                     text-[10px] font-bold
                                                     bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                                        {activity.category}
                                    </span>
                                )}
                                {activity.difficulty && (
                                    <span className="inline-flex items-center rounded-full px-2 py-0.5
                                                     text-[10px] font-bold capitalize
                                                     bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                                        {activity.difficulty}
                                    </span>
                                )}
                                {isEnrolled && (
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5
                                                      text-[10px] font-bold capitalize ${enrollment.data
                                            ? getStatusTone(enrollment.data.status)
                                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400"
                                        }`}>
                                        {(enrollment.data?.status ?? "enrolled").replace("_", " ")}
                                    </span>
                                )}
                                {isMastered && <MasteredBadge compact />}
                            </div>

                            <div className="flex items-center gap-3 text-[11px] font-medium
                                            text-slate-500 dark:text-slate-400">
                                <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {fmtHours(activity.learning_hours)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <Award className="h-3 w-3" />
                                    {fmtPoints(activity.configured_cpd_points)} pts
                                </span>
                            </div>

                            {/* Author */}
                            <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                <p className="text-[9px] font-bold uppercase tracking-wider
                                              text-slate-500 dark:text-slate-400 mb-1.5">
                                    Created by
                                </p>
                                {author ? (
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-9 w-9 rounded-full overflow-hidden shrink-0
                                                        bg-slate-200 dark:bg-white/[0.08]
                                                        flex items-center justify-center">
                                            {author.avatar_url ? (
                                                <img
                                                    src={author.avatar_url}
                                                    alt={author.name ?? ""}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : author.name ? (
                                                <span className="text-[13px] font-bold text-slate-600 dark:text-slate-300">
                                                    {author.name.charAt(0).toUpperCase()}
                                                </span>
                                            ) : (
                                                <User className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                                                {author.name ?? "Unknown contributor"}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                {author.is_verified_contributor && (
                                                    <span className="inline-flex items-center gap-0.5 rounded-full
                                                                     px-1.5 py-0.5 text-[9px] font-bold
                                                                     bg-emerald-50 text-emerald-700
                                                                     dark:bg-emerald-400/10 dark:text-emerald-400">
                                                        <ShieldCheck className="h-2.5 w-2.5" />
                                                        Verified
                                                    </span>
                                                )}
                                                <span className="inline-flex items-center rounded-full
                                                                 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider
                                                                 bg-slate-100 text-slate-600
                                                                 dark:bg-white/[0.06] dark:text-slate-300">
                                                    {(author.contributor_tier ?? "contributor")
                                                        .replace(/_/g, " ")
                                                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-[11px]
                                                    text-slate-500 dark:text-slate-400">
                                        <User className="h-3.5 w-3.5" />
                                        <span>Contributor details unavailable</span>
                                    </div>
                                )}
                            </div>

                            {activity.description && (
                                <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                                    {activity.description}
                                </p>
                            )}

                            {!isEnrolled ? (
                                <button
                                    onClick={handleEnroll}
                                    disabled={enroll.isPending}
                                    className="w-full h-11 rounded-xl bg-blue-600 text-white
                                               text-[13px] font-bold
                                               active:scale-[0.97] transition-transform
                                               disabled:opacity-60"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    {enroll.isPending ? "Enrolling…" : "Enrol in this activity"}
                                </button>
                            ) : (
                                <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Progress
                                        </span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                                            {shownProgress}%
                                        </span>
                                    </div>
                                    <Progress value={shownProgress} className="h-1.5" />
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                        {doneItems} of {totalItems} items completed
                                        {allRequired.length > 0 && ` · ${doneRequired}/${allRequired.length} required`}
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ── Social bar ── */}
                    <ActivitySocialBar
                        activity={activity}
                        isBookmarked={isBookmarked}
                        onToggleBookmark={handleToggleBookmark}
                        onOpenComments={() => {
                            tap();
                            document.getElementById("comments-section")?.scrollIntoView({ behavior: "smooth" });
                        }}
                    />

                    {/* ── Rating card ── */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h2 className="text-[10px] font-bold uppercase tracking-wider
                                           text-slate-500 dark:text-slate-400">
                                Rate this activity
                            </h2>
                            {currentStars > 0 && (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    You rated {currentStars}/5
                                </span>
                            )}
                        </div>
                        <RatingStars value={currentStars} onChange={submitRating} size="lg" />
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                            {currentStars > 0
                                ? "Tap a star to change your rating."
                                : "Tap a star — takes 2 seconds, helps other nurses find good content."}
                        </p>
                    </section>

                    {/* ── Mastery CTA ── */}
                    {isMastered ? (
                        <MasteredBadge />
                    ) : canMaster ? (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
                            <div className="flex items-center gap-2.5">
                                <div className="h-10 w-10 rounded-xl bg-violet-600 text-white
                                                flex items-center justify-center shrink-0">
                                    <Trophy className="h-5 w-5" strokeWidth={2.4} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[12px] font-bold text-slate-900 dark:text-white">
                                        Ready to master this activity?
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                        You've completed all required content. Mastery adds a badge and lets you revisit anytime.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleMaster}
                                disabled={markMastered.isPending}
                                className="w-full h-11 rounded-xl bg-violet-600 text-white
                                           text-[12px] font-bold
                                           flex items-center justify-center gap-1.5
                                           active:scale-[0.97] transition-transform
                                           disabled:opacity-50"
                                style={{ touchAction: "manipulation" }}
                            >
                                {markMastered.isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Trophy className="h-3.5 w-3.5" />
                                )}
                                Mark as mastered
                            </button>
                        </section>
                    ) : null}

                    {/* ── Modules ── */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <h2 className="text-[10px] font-bold uppercase tracking-wider
                                       text-slate-500 dark:text-slate-400">
                            Modules ({modules.length})
                        </h2>
                        {modules.length === 0 && (
                            <CpdEmptyState title="No modules yet" hint="Content hasn't been added yet." />
                        )}
                        {modules.map((m) => {
                            const items = contentByModule[m.id] ?? [];
                            return (
                                <div key={m.id} className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                                            Module {m.position + 1} · {m.title}
                                        </h3>
                                        {m.estimated_minutes && (
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                                                {m.estimated_minutes} min
                                            </span>
                                        )}
                                    </div>
                                    {m.description && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                            {m.description}
                                        </p>
                                    )}
                                    <div className="space-y-1">
                                        {items.length === 0 && (
                                            <p className="text-[11px] text-slate-400 px-2 py-1">No content yet.</p>
                                        )}
                                        {items.map((c) => {
                                            const p = progressByItem.get(c.id);
                                            const done = p?.status === "completed";
                                            const started = p?.status === "in_progress";
                                            return (
                                                <Link
                                                    key={c.id}
                                                    to={`/cpd/activity/${activity.id}/module/${m.id}?item=${c.id}`}
                                                    onClick={() => tap()}
                                                    className="flex items-center justify-between gap-2 rounded-xl
                                                               bg-slate-50 dark:bg-[#0d1117] px-3 py-2.5
                                                               active:bg-slate-100 dark:active:bg-white/[0.08]
                                                               transition-colors"
                                                    style={{ touchAction: "manipulation" }}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <ContentTypeChip type={c.content_type} />
                                                        <span className={`text-[12px] font-medium truncate ${done ? "text-slate-400 line-through" : "text-slate-900 dark:text-white"}`}>
                                                            {c.title}
                                                        </span>
                                                        {c.is_required && !done && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full
                                                                             bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400 shrink-0">
                                                                REQ
                                                            </span>
                                                        )}
                                                        {started && !done && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full
                                                                             bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400 shrink-0">
                                                                IN
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {c.duration_seconds && (
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                                                {fmtDuration(c.duration_seconds)}
                                                            </span>
                                                        )}
                                                        {done ? (
                                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2.6} />
                                                        ) : (
                                                            <ArrowRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                                                        )}
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </section>

                    {/* ── Assessments ── */}
                    {assessments.length > 0 && (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                            <h2 className="text-[10px] font-bold uppercase tracking-wider
                                           text-slate-500 dark:text-slate-400">
                                Assessments
                            </h2>
                            {assessments.map((a) => (
                                <div key={a.id} className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3
                                                          flex items-center justify-between gap-2 flex-wrap">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate">
                                            {a.title}
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            Pass mark: {a.pass_mark}%
                                            {a.attempt_limit ? ` · max ${a.attempt_limit} attempt${a.attempt_limit > 1 ? "s" : ""}` : ""}
                                        </p>
                                    </div>
                                    <button
                                        disabled={!isEnrolled || !allDone}
                                        onClick={() => { tap("success"); nav(`/cpd/activity/${activity.id}/assessment?assessment=${a.id}`); }}
                                        className="h-10 px-3 rounded-xl shrink-0
                                                   bg-blue-600 text-white text-[11px] font-bold
                                                   flex items-center gap-1.5
                                                   active:scale-[0.97] transition-transform
                                                   disabled:opacity-40"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {allDone ? (
                                            <><Sparkles className="h-3.5 w-3.5" /> Start</>
                                        ) : (
                                            <><Lock className="h-3.5 w-3.5" /> Locked</>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </section>
                    )}

                    {/* ── Comments ── */}
                    <CommentsSection
                        activityId={activity.id}
                        draftComment={draftComment}
                        setDraftComment={setDraftComment}
                    />
                </div>
            </ScrollBody>
        </FullScreen>
    );
}

/* ═══════════════════════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════════════════════ */
function DetailSkeleton() {
    return (
        <div className="space-y-3 animate-pulse">
            <div className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">
                <div className="aspect-[16/9] bg-slate-200 dark:bg-white/[0.06]" />
                <div className="p-4 space-y-3">
                    <div className="flex gap-1.5">
                        <div className="h-5 w-20 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                        <div className="h-5 w-16 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                    </div>
                    <div className="h-11 rounded-xl bg-slate-100 dark:bg-white/[0.04]" />
                </div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
                <div className="h-2 w-32 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                <div className="h-8 rounded-xl bg-slate-100 dark:bg-white/[0.04]" />
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                <div className="h-3 w-24 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 rounded-xl bg-slate-100 dark:bg-white/[0.04]" />
                ))}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   COMMENTS
   ═══════════════════════════════════════════════════════════════ */
type OptimisticComment = {
    id: string;
    body: string;
    created_at: string;
    user: { name: string | null; avatar_url: string | null } | null;
    __optimistic?: boolean;
};

function CommentsSection({
    activityId, draftComment, setDraftComment,
}: {
    activityId: string;
    draftComment: string;
    setDraftComment: (v: string) => void;
}) {
    const comments = useActivityComments(activityId);
    const postComment = usePostComment();
    const deleteComment = useDeleteComment();

    const [optimisticPosts, setOptimisticPosts] = useState<OptimisticComment[]>([]);
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

    const serverItems = comments.data?.pages.flatMap(p => p.items) ?? [];

    const reconciledPosts = optimisticPosts.filter(
        op => !serverItems.some(
            s => s.body === op.body && !deletedIds.has(s.id)
        )
    );

    const items: OptimisticComment[] = [
        ...reconciledPosts,
        ...serverItems.filter(s => !deletedIds.has(s.id)),
    ];

    const handlePost = async () => {
        const body = draftComment.trim();
        if (!body || postComment.isPending) return;

        const tempId = `optimistic-${Date.now()}`;
        const optimistic: OptimisticComment = {
            id: tempId,
            body,
            created_at: new Date().toISOString(),
            user: null,
            __optimistic: true,
        };

        setOptimisticPosts(prev => [optimistic, ...prev]);
        setDraftComment("");
        tap("success");

        try {
            await postComment.mutateAsync({ activityId, body });
        } catch {
            setOptimisticPosts(prev => prev.filter(p => p.id !== tempId));
            setDraftComment(body);
        }
    };

    const handleDelete = (commentId: string) => {
        if (!confirm("Delete this comment?")) return;
        tap("warning");
        setDeletedIds(prev => {
            const next = new Set(prev);
            next.add(commentId);
            return next;
        });
        deleteComment.mutate(
            { commentId, activityId },
            {
                onError: () => {
                    setDeletedIds(prev => {
                        const next = new Set(prev);
                        next.delete(commentId);
                        return next;
                    });
                },
            }
        );
    };

    return (
        <section id="comments-section" className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-wider
                           text-slate-500 dark:text-slate-400">
                Comments {items.length > 0 && `(${items.length}${comments.hasNextPage ? "+" : ""})`}
            </h2>

            {/* Composer */}
            <div className="flex items-start gap-2">
                <textarea
                    value={draftComment}
                    onChange={(e) => setDraftComment(e.target.value)}
                    placeholder="Share your thoughts on this activity…"
                    rows={2}
                    maxLength={2000}
                    className="flex-1 rounded-xl bg-slate-50 dark:bg-[#0d1117]
                               px-3 py-2 text-[12px]
                               text-slate-900 dark:text-white
                               placeholder:text-slate-400 dark:placeholder:text-slate-500
                               outline-none resize-y"
                    style={{ touchAction: "manipulation" }}
                />
                <button
                    onClick={handlePost}
                    disabled={!draftComment.trim() || postComment.isPending}
                    className="h-11 w-11 rounded-xl bg-blue-600 text-white
                               flex items-center justify-center shrink-0
                               active:scale-[0.97] transition-transform
                               disabled:opacity-40"
                    style={{ touchAction: "manipulation" }}
                >
                    {postComment.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                </button>
            </div>

            {/* List */}
            {comments.isLoading && items.length === 0 ? (
                <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-white/[0.06] animate-pulse" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center py-6">
                    No comments yet — be the first to share your thoughts.
                </p>
            ) : (
                <div className="space-y-2">
                    {items.map((c) => (
                        <div
                            key={c.id}
                            className={`rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-1.5 ${c.__optimistic ? "opacity-70" : ""}`}
                        >
                            <div className="flex items-start gap-2">
                                <div className="h-7 w-7 rounded-full overflow-hidden bg-slate-200 dark:bg-white/[0.08]
                                                flex items-center justify-center shrink-0">
                                    {c.user?.avatar_url ? (
                                        <img
                                            src={c.user.avatar_url}
                                            alt=""
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-cover"
                                        />
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
                                {!c.__optimistic && (
                                    <button
                                        onClick={() => handleDelete(c.id)}
                                        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0
                                                   text-slate-400 active:bg-rose-50 dark:active:bg-rose-400/10
                                                   active:text-rose-600 dark:active:text-rose-400
                                                   active:scale-[0.92] transition-colors"
                                        style={{ touchAction: "manipulation" }}
                                        aria-label="Delete your comment"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {comments.hasNextPage && (
                        <button
                            onClick={() => { tap(); comments.fetchNextPage(); }}
                            disabled={comments.isFetchingNextPage}
                            className="w-full h-11 rounded-xl
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-700 dark:text-slate-200
                                       text-[11px] font-bold
                                       active:scale-[0.97] transition-transform
                                       disabled:opacity-50"
                            style={{ touchAction: "manipulation" }}
                        >
                            {comments.isFetchingNextPage ? "Loading…" : "Load more comments"}
                        </button>
                    )}
                </div>
            )}
        </section>
    );
}