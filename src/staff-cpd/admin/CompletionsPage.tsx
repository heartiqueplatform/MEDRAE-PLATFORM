// src/staff-cpd/admin/CompletionsPage.tsx
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    Search, Ban, ClipboardList, Calendar, Award,
    Mail, Building2, ShieldCheck, Clock, Target, User, Coins, User as UserIcon,
} from "lucide-react";
import { useAdminCompletions, useRevokeCompletion } from "../lib/admin-hooks";
import { fmtDate, fmtPoints, fmtHours } from "../lib";
import { CpdEmptyState } from "../components";
import { tap } from "../pages/shared";
import SelectField from "@/components/ui/SelectField";

/* ── Status tones ───────────────────────────────────────────── */
const STATUS_TONES: Record<string, string> = {
    verified: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
    pending: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
    revoked: "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400",
};
const getStatusTone = (status?: string) =>
    STATUS_TONES[(status ?? "").toLowerCase()] ?? STATUS_TONES.pending;

/* ── Styles ─────────────────────────────────────────────────── */
const InputBase =
    "w-full h-11 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium " +
    "text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none";
const SecondaryBtn =
    "h-11 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 " +
    "text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

const IconBtn = "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 active:scale-[0.92] transition-transform";

/* ═══════════════════════════════════════════════════════════════
   NURSE STRIP
   ═══════════════════════════════════════════════════════════════ */
function NurseStrip({ nurse, activityTitle }: { nurse: any; activityTitle: string }) {
    if (!nurse) {
        return (
            <div className="flex items-center gap-1.5 mt-1">
                <UserIcon className="h-3 w-3 text-slate-400" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Unknown nurse</span>
            </div>
        );
    }

    const name = nurse.name ?? "Unknown nurse";
    const initial = name.charAt(0).toUpperCase();

    return (
        <div className="flex items-center gap-2 mt-1.5 min-w-0">
            <div className="h-8 w-8 rounded-full overflow-hidden shrink-0
                            bg-slate-200 dark:bg-white/[0.08]
                            flex items-center justify-center">
                {nurse.avatar_url ? (
                    <img src={nurse.avatar_url} alt={name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {initial}
                    </span>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                        to={`/profile/${nurse.user_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-bold text-slate-900 dark:text-white truncate leading-tight"
                        style={{ touchAction: "manipulation" }}
                    >
                        {name}
                    </Link>
                    {nurse.is_verified_contributor && (
                        <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5
                                         text-[9px] font-bold
                                         bg-emerald-50 text-emerald-700
                                         dark:bg-emerald-400/10 dark:text-emerald-400">
                            <ShieldCheck className="h-2.5 w-2.5" /> Contributor
                        </span>
                    )}
                    {nurse.contributor_tier && nurse.contributor_tier !== "member" && (
                        <span className="text-[9px] font-bold uppercase tracking-wider
                                         text-slate-400 dark:text-slate-500">
                            {nurse.contributor_tier.replace(/_/g, " ")}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap
                                text-[9px] text-slate-500 dark:text-slate-400">
                    {nurse.workplace && (
                        <span className="inline-flex items-center gap-0.5 truncate">
                            <Building2 className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate max-w-[140px]">{nurse.workplace}</span>
                        </span>
                    )}
                    {nurse.nck_number && (
                        <>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <span className="truncate">NCK {nurse.nck_number}</span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
                {nurse.email && (
                    <a
                        href={`mailto:${nurse.email}?subject=${encodeURIComponent(`Medrae · ${activityTitle}`)}`}
                        onClick={(e) => { e.stopPropagation(); tap(); }}
                        title={`Email ${name}`}
                        className={`${IconBtn} bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300`}
                        style={{ touchAction: "manipulation" }}
                    >
                        <Mail className="h-4 w-4" />
                    </a>
                )}
                <Link
                    to={`/profile/${nurse.user_id}`}
                    title={`View ${name}'s profile`}
                    onClick={(e) => e.stopPropagation()}
                    className={`${IconBtn} bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300`}
                    style={{ touchAction: "manipulation" }}
                >
                    <User className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════════════════════ */
function CompletionSkeleton() {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2 animate-pulse">
            <div className="flex items-start gap-2.5">
                <div className="h-10 w-14 rounded-lg bg-slate-200 dark:bg-white/[0.06] shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-3 w-3/4 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
                    <div className="h-4 w-16 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                </div>
                <div className="h-5 w-16 rounded-full bg-slate-100 dark:bg-white/[0.04] shrink-0" />
            </div>
            <div className="flex items-center gap-2 pt-1">
                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
                <div className="flex-1 space-y-1">
                    <div className="h-2.5 w-32 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
                    <div className="h-2 w-24 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="space-y-1">
                        <div className="h-2 w-14 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                        <div className="h-3 w-16 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════ */
export default function CompletionsPage() {
    const [status, setStatus] = useState<string>("");
    const [search, setSearch] = useState("");
    const q = useAdminCompletions({ status: status || undefined });
    const revoke = useRevokeCompletion();

    const items = useMemo(() => {
        const all = q.data?.pages.flatMap(p => p.items) ?? [];
        if (!search) return all;
        const s = search.toLowerCase();
        return all.filter((c: any) =>
            c.activity?.title?.toLowerCase().includes(s) ||
            c.nurse?.name?.toLowerCase().includes(s) ||
            c.nurse?.email?.toLowerCase().includes(s) ||
            c.nurse?.workplace?.toLowerCase().includes(s)
        );
    }, [q.data, search]);

    const statusOptions = useMemo(() => ([
        { value: "", label: "All statuses" },
        { value: "verified", label: "Verified" },
        { value: "pending", label: "Pending" },
        { value: "revoked", label: "Revoked" },
    ]), []);

    const handleRevoke = useCallback((c: any) => {
        tap("warning");
        if (confirm(
            `Revoke this completion?\n\n` +
            `${c.nurse?.name ?? "This nurse"} will lose the certificate and points.\n\n` +
            `Verification code ${c.verification_code ?? ""} will be invalidated.`
        )) {
            revoke.mutate(c.id);
        }
    }, [revoke]);

    return (
        // ✅ Gutter restored (bare-mounted page)
        <div className="w-full max-w-[880px] mx-auto px-1.5 sm:px-4 pt-3 pb-16 space-y-3">
            {/* Intro */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                <div className="flex items-start gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <ClipboardList className="h-4 w-4" strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight">
                            CPD Completions
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                            Every verified completion — tap a nurse to view profile or email
                        </p>
                    </div>
                </div>
            </section>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 min-w-0">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search activity, nurse, email, workplace…"
                        className={InputBase + " pl-10"}
                        style={{ touchAction: "manipulation" }}
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2
                                       h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                <div className="sm:w-44 shrink-0">
                    <SelectField
                        value={status || "all"}
                        onValueChange={(v) => { tap(); setStatus(v === "all" ? "" : v); }}
                        options={[{ value: "all", label: "All statuses" }, ...statusOptions.slice(1)]}
                    />
                </div>
            </div>

            {/* List */}
            {q.isLoading && !items.length ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => <CompletionSkeleton key={i} />)}
                </div>
            ) : items.length ? (
                <>
                    <div className="space-y-2">
                        {items.map((c: any) => {
                            const activity = c.activity;
                            const nurse = c.nurse;
                            const enrollment = c.enrollment;
                            const certificate = c.certificate;
                            const activityTitle = activity?.title ?? "Activity";

                            return (
                                <div key={c.id} className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2">

                                    {/* Activity row */}
                                    <div className="flex items-start gap-2.5">
                                        {activity?.thumbnail_url ? (
                                            <img
                                                src={activity.thumbnail_url}
                                                alt=""
                                                loading="lazy"
                                                decoding="async"
                                                className="h-10 w-14 rounded-lg object-cover shrink-0 bg-slate-100 dark:bg-white/[0.06]"
                                            />
                                        ) : (
                                            <div className="h-10 w-14 rounded-lg shrink-0
                                                            bg-slate-100 dark:bg-white/[0.06]
                                                            flex items-center justify-center">
                                                <ClipboardList className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <Link
                                                to={`/cpd/activity/${activity?.id}`}
                                                onClick={() => tap()}
                                                className="block text-[13px] font-bold text-slate-900 dark:text-white
                                                           truncate leading-tight"
                                                style={{ touchAction: "manipulation" }}
                                            >
                                                {activityTitle}
                                            </Link>
                                            {activity?.category && (
                                                <span className="inline-flex items-center rounded-full px-1.5 py-0.5
                                                                 text-[9px] font-bold uppercase tracking-wider
                                                                 bg-slate-100 text-slate-600
                                                                 dark:bg-white/[0.06] dark:text-slate-300 mt-0.5">
                                                    {activity.category}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5
                                                          text-[10px] font-bold capitalize shrink-0
                                                          ${getStatusTone(c.completion_status)}`}>
                                            {c.completion_status}
                                        </span>
                                    </div>

                                    {/* Nurse strip */}
                                    <NurseStrip nurse={nurse} activityTitle={activityTitle} />

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2
                                                    border-t border-slate-100 dark:border-white/[0.04]">
                                        <Stat icon={Calendar} label="Completed" value={fmtDate(c.completed_at)} />
                                        <Stat icon={Clock} label="Hours" value={fmtHours(c.learning_hours_completed)} />
                                        <Stat icon={Award} label="CPD Points" value={`${fmtPoints(c.points_awarded)} pts`} tone="emerald" />
                                        <Stat icon={Coins} label="MedraeCoins" value={`+${c.medrae_coins_awarded ?? 0} MC`} tone="amber" />
                                    </div>

                                    {/* Score row */}
                                    <div className="flex items-center gap-2 flex-wrap pt-1
                                                    text-[10px] font-medium
                                                    text-slate-500 dark:text-slate-400">
                                        <span className="inline-flex items-center gap-0.5">
                                            <Target className="h-3 w-3" />
                                            Score{" "}
                                            <span className={`font-bold tabular-nums ${c.assessment_score == null
                                                ? "text-slate-400"
                                                : c.assessment_score >= 70
                                                    ? "text-emerald-600 dark:text-emerald-400"
                                                    : "text-rose-600 dark:text-rose-400"}`}>
                                                {c.assessment_score != null
                                                    ? `${Math.round(c.assessment_score)}%`
                                                    : "—"}
                                            </span>
                                        </span>
                                        {enrollment?.attempts_count != null && enrollment.attempts_count > 0 && (
                                            <>
                                                <span className="text-slate-300 dark:text-slate-600">·</span>
                                                <span className="inline-flex items-center gap-0.5">
                                                    <Target className="h-3 w-3" />
                                                    {enrollment.attempts_count} attempt{enrollment.attempts_count === 1 ? "" : "s"}
                                                </span>
                                            </>
                                        )}
                                        {enrollment?.started_at && (
                                            <>
                                                <span className="text-slate-300 dark:text-slate-600">·</span>
                                                <span className="inline-flex items-center gap-0.5">
                                                    <Clock className="h-3 w-3" />
                                                    Started {fmtDate(enrollment.started_at)}
                                                </span>
                                            </>
                                        )}
                                        {certificate && (
                                            <>
                                                <span className="text-slate-300 dark:text-slate-600">·</span>
                                                <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                                    <Award className="h-3 w-3" />
                                                    {certificate.certificate_number}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Revoke */}
                                    {c.completion_status === "verified" && (
                                        <button
                                            onClick={() => handleRevoke(c)}
                                            className="w-full h-10 rounded-xl
                                                       bg-rose-50 dark:bg-rose-400/10
                                                       text-rose-600 dark:text-rose-400
                                                       text-[11px] font-bold
                                                       flex items-center justify-center gap-1.5
                                                       active:scale-[0.97] transition-transform"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            <Ban className="h-3.5 w-3.5" />
                                            Revoke completion
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {q.hasNextPage && (
                        <div className="flex justify-center pt-2 pb-4">
                            <button
                                onClick={() => { tap(); q.fetchNextPage(); }}
                                disabled={q.isFetchingNextPage}
                                className={SecondaryBtn}
                                style={{ touchAction: "manipulation" }}
                            >
                                {q.isFetchingNextPage ? "Loading…" : "Load more"}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <CpdEmptyState
                    title="No completions match"
                    hint="Try adjusting your search or filter."
                    icon={ClipboardList}
                />
            )}
        </div>
    );
}

/* ── Small stat tile ─────────────────────────────────────────── */
function Stat({
    icon: Icon, label, value, tone = "slate",
}: {
    icon: React.ComponentType<any>; label: string; value: string;
    tone?: "slate" | "emerald" | "amber" | "rose";
}) {
    const toneCls = {
        slate: "text-slate-900 dark:text-white",
        emerald: "text-emerald-600 dark:text-emerald-400",
        amber: "text-amber-600 dark:text-amber-400",
        rose: "text-rose-600 dark:text-rose-400",
    }[tone];

    return (
        <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-wider
                          text-slate-400 dark:text-slate-500 leading-none">
                {label}
            </p>
            <p className={`text-[11px] font-bold tabular-nums mt-0.5 truncate ${toneCls}`}>
                {value}
            </p>
        </div>
    );
}