// src/staff-cpd/admin/ActivitiesListPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Plus, Search, Trash2, BookOpen, Calendar, Clock, Award, Archive,
    Loader2, Coins, ChevronRight, RotateCcw, ShieldAlert, ShieldCheck,
    Mail, User, Building2,
} from "lucide-react";
import {
    useAdminActivities,
    useCreateActivity,
    useRemoveActivity,
    useUnarchiveActivity,
    useMedraeCoinConfig,
    type AuthorProfile,
} from "../lib/admin-hooks";
import { useStaffProfile } from "../lib/contributor-hooks";
import { useAuth } from "@/context/AuthProvider";
import { CpdEmptyState } from "../components";
import { fmtDate, fmtHours, fmtPoints } from "../lib";
import { tap } from "../pages/shared";
import SelectField from "@/components/ui/SelectField";

const ADMIN_IDS = [
    "25f37970-c9b9-4c15-b8a2-514a912e3261",
    "731974f9-5af2-44c3-bf13-547fc4c89209",
];

const STATUS_TONES: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300",
    review: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
    published: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
    archived: "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400",
};
const getStatusTone = (status?: string) =>
    STATUS_TONES[(status ?? "").toLowerCase()] ?? STATUS_TONES.draft;

const InputBase =
    "w-full h-11 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium " +
    "text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none";
const PrimaryBtn =
    "h-11 px-4 rounded-xl bg-blue-600 text-white text-[13px] font-bold " +
    "flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50 disabled:active:scale-100";
const SecondaryBtn =
    "h-11 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 " +
    "text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

const IconBtn = "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 active:scale-[0.92] transition-transform disabled:opacity-50";

function LoadingOverlay({ open, title, subtitle }: {
    open: boolean; title: string; subtitle?: string;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center
                       bg-slate-50/95 dark:bg-[#0d1117]/95 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 px-6 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
                <p className="text-[13px] font-bold text-slate-900 dark:text-white">{title}</p>
                {subtitle && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[260px]">{subtitle}</p>
                )}
            </div>
        </div>
    );
}

function GateSkeleton() {
    return (
        <div className="w-full max-w-[880px] mx-auto px-1.5 sm:px-4 pt-3 pb-16 space-y-3">
            <div className="h-28 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
            <div className="h-24 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
            <div className="h-11 rounded-xl bg-white dark:bg-[#161b22] animate-pulse" />
        </div>
    );
}

function ActivityRowSkeleton() {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 animate-pulse">
            <div className="flex items-start gap-2.5">
                <div className="h-12 w-16 rounded-lg bg-slate-200 dark:bg-white/[0.06] shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-3 w-3/4 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
                    <div className="h-2 w-1/2 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                    <div className="h-4 w-40 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                </div>
                <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-white/[0.04]" />
            </div>
        </div>
    );
}

/* ── Author strip ─────────────────────────────────────────────── */
function AuthorStrip({
    author, isOwn, activityTitle,
}: {
    author: AuthorProfile;
    isOwn: boolean;
    activityTitle: string;
}) {
    const name = author.name ?? "Unknown contributor";
    const tier = (author.contributor_tier ?? "contributor")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    return (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
            <div className="h-7 w-7 rounded-full overflow-hidden shrink-0 bg-slate-200 dark:bg-white/[0.08] flex items-center justify-center">
                {author.avatar_url ? (
                    <img src={author.avatar_url} alt={name} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {name.charAt(0).toUpperCase()}
                    </span>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                        {name}
                    </p>
                    {isOwn && (
                        <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold
                                         bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400">
                            You
                        </span>
                    )}
                    {author.is_verified_contributor && (
                        <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold
                                         bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
                            <ShieldCheck className="h-2.5 w-2.5" /> Verified
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {tier}
                    </span>
                    {author.workplace && (
                        <>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-500 dark:text-slate-400">
                                <Building2 className="h-2.5 w-2.5" />
                                <span className="truncate max-w-[120px]">{author.workplace}</span>
                            </span>
                        </>
                    )}
                </div>
            </div>

            {!isOwn && (
                <div className="flex items-center gap-1 shrink-0">
                    {author.email && (
                        <a
                            href={`mailto:${author.email}?subject=${encodeURIComponent(`Medrae · Re: ${activityTitle}`)}`}
                            onClick={(e) => { e.stopPropagation(); tap(); }}
                            title={`Email ${name}`}
                            className={`${IconBtn} bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300`}
                            style={{ touchAction: "manipulation" }}
                        >
                            <Mail className="h-4 w-4" />
                        </a>
                    )}
                    <Link
                        to={`/profile/${author.user_id}`}
                        onClick={(e) => e.stopPropagation()}
                        title={`View ${name}'s profile`}
                        className={`${IconBtn} bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300`}
                        style={{ touchAction: "manipulation" }}
                    >
                        <User className="h-4 w-4" />
                    </Link>
                </div>
            )}
        </div>
    );
}

/* ── Main ─────────────────────────────────────────────────────── */
export default function ActivitiesListPage() {
    const nav = useNavigate();
    const { user } = useAuth();
    const userId = user?.id ?? null;
    const isAdmin = !!userId && ADMIN_IDS.includes(userId);

    const { data: profile, isLoading: profileLoading } = useStaffProfile(userId);
    const isContributor = isAdmin || !!profile?.is_verified_contributor;

    useEffect(() => {
        if (profileLoading || !userId) return;
        if (!isContributor) {
            const t = setTimeout(() => nav("/cpd/apply", { replace: true }), 50);
            return () => clearTimeout(t);
        }
    }, [isContributor, profileLoading, userId, nav]);

    const [status, setStatus] = useState<string>("");
    const [search, setSearch] = useState("");
    const [creating, setCreating] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);

    const q = useAdminActivities(status || undefined);
    const create = useCreateActivity();
    const remove = useRemoveActivity();
    const unarchive = useUnarchiveActivity();

    const { data: coinConfig, isLoading: coinConfigLoading } = useMedraeCoinConfig();
    const coinsPerCompletion = coinConfig?.coins_per_completion ?? 20;
    const coinToKes = coinConfig?.coin_to_kes_rate ?? 0.01;
    const perCompletionKes = (coinsPerCompletion * coinToKes).toFixed(2);

    const items = useMemo(() => {
        const all = q.data?.pages.flatMap(p => p.items) ?? [];
        if (!search) return all;
        const s = search.toLowerCase();
        return all.filter(a => a.title.toLowerCase().includes(s));
    }, [q.data, search]);

    const statusOptions = useMemo(() => ([
        { value: "all", label: "All statuses" },
        { value: "draft", label: "Draft" },
        { value: "review", label: "Review" },
        { value: "published", label: "Published" },
        { value: "archived", label: "Archived" },
    ]), []);

    const handleCreate = useCallback(async () => {
        if (creating || create.isPending) return;
        if (!isContributor) { tap("warning"); nav("/cpd/apply"); return; }
        tap("success");
        setCreating(true);
        try {
            const a = await create.mutateAsync({ title: "Untitled Activity" });
            nav(`/cpd/admin/activities/${a.id}`);
        } catch (e: any) {
            setCreating(false);
            alert(`Couldn't create activity:\n${e?.message ?? "Unknown error"}`);
        }
    }, [creating, create, isContributor, nav]);

    const handleArchive = useCallback((a: any) => {
        tap("warning");
        if (!confirm(
            `Archive "${a.title}"?\n\n` +
            `It will disappear from the nurse catalog, but every nurse who completed it keeps their certificate, points, and verification code.`
        )) return;
        setRemovingId(a.id);
        remove.mutate(a.id, {
            onSuccess: () => { alert(`"${a.title}" was archived.`); setRemovingId(null); },
            onError: (e: any) => { alert(`Couldn't archive: ${e?.message ?? "Unknown error"}`); setRemovingId(null); },
        });
    }, [remove]);

    const handleUnarchive = useCallback((a: any) => {
        tap("success");
        if (!confirm(
            `Unarchive "${a.title}"?\n\n` +
            `It will go back to DRAFT status. You'll need to publish it again before nurses can see it.`
        )) return;
        setRemovingId(a.id);
        unarchive.mutate(a.id, {
            onSuccess: () => { alert(`"${a.title}" was unarchived → draft.`); setRemovingId(null); },
            onError: (e: any) => { alert(`Couldn't unarchive: ${e?.message ?? "Unknown error"}`); setRemovingId(null); },
        });
    }, [unarchive]);

    const handleRemove = useCallback((a: any) => {
        tap("warning");
        if (!confirm(
            `Remove "${a.title}"?\n\n` +
            `• If nurses have completed it → the activity is ARCHIVED.\n` +
            `• If nobody has completed it → the activity is PERMANENTLY DELETED.`
        )) return;
        setRemovingId(a.id);
        remove.mutate(a.id, {
            onSuccess: (res: any) => {
                alert(res.action === "archived"
                    ? `"${a.title}" was archived. Nurses keep their records.`
                    : `"${a.title}" was permanently deleted.`);
                setRemovingId(null);
            },
            onError: (e: any) => { alert(`Couldn't remove: ${e?.message ?? "Unknown error"}`); setRemovingId(null); },
        });
    }, [remove]);

    if (profileLoading || !userId) return <GateSkeleton />;
    if (!isContributor) {
        return (
            <div className="w-full max-w-[880px] mx-auto px-1.5 sm:px-4 pt-3 pb-16">
                <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 flex items-start gap-2.5">
                    <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-slate-900 dark:text-white">
                            Contributor access required
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Redirecting you to the application…
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        // ✅ Gutter restored (bare-mounted page)
        <div className="w-full max-w-[880px] mx-auto px-1.5 sm:px-4 pt-3 pb-16 space-y-3">

            {/* Header + New Activity */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4" strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight">
                            {isAdmin ? "All CPD Activities" : "My CPD Activities"}
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                            {isAdmin
                                ? "You see every contributor's activities — tap the mail icon to contact an author"
                                : "Activities you've authored"}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleCreate}
                    disabled={creating || create.isPending}
                    className={PrimaryBtn + " w-full"}
                    style={{ touchAction: "manipulation" }}
                >
                    {creating ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating…</>
                    ) : (
                        <><Plus className="h-3.5 w-3.5" /> New Activity</>
                    )}
                </button>
            </section>

            {/* MedraeCoins info — neutral surface, amber only on the icon */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2">
                <div className="flex items-start gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <Coins className="h-4 w-4" strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight">
                            Every published activity pays you {coinsPerCompletion} MedraeCoins per completion
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            {coinConfigLoading
                                ? "Loading current rate…"
                                : <>Fixed rate. 1 MC = KSh {coinToKes}. {coinsPerCompletion} MC = KSh {perCompletionKes} per completion.</>}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => { tap(); nav("/cpd/coins-policy"); }}
                    className="w-full h-10 px-3 rounded-xl
                               bg-slate-100 dark:bg-white/[0.06]
                               text-slate-700 dark:text-slate-200 text-[11px] font-bold
                               flex items-center justify-between gap-1.5
                               active:scale-[0.97] transition-transform"
                    style={{ touchAction: "manipulation" }}
                >
                    <span>How MedraeCoins work</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>
            </section>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 min-w-0">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={isAdmin ? "Search title or author…" : "Search title…"}
                        className={InputBase + " pl-10"}
                        style={{ touchAction: "manipulation" }}
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
                <div className="sm:w-44 shrink-0">
                    <SelectField
                        value={status || "all"}
                        onValueChange={(v) => { tap(); setStatus(v === "all" ? "" : v); }}
                        options={statusOptions}
                    />
                </div>
            </div>

            {/* List */}
            {q.isLoading && !items.length ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => <ActivityRowSkeleton key={i} />)}
                </div>
            ) : items.length ? (
                <>
                    <div className="space-y-2">
                        {items.map(a => {
                            const isRemoving = removingId === a.id;
                            const author = (a as any).author as AuthorProfile | null | undefined;
                            const isOwn = a.created_by === userId;

                            return (
                                <div
                                    key={a.id}
                                    className={`rounded-2xl bg-white dark:bg-[#161b22] p-3 flex items-start gap-2.5 transition-opacity
                                                ${isRemoving ? "opacity-60 pointer-events-none" : ""}`}
                                >
                                    {/* Left: clickable link region */}
                                    <Link
                                        to={`/cpd/admin/activities/${a.id}`}
                                        onClick={() => tap()}
                                        className="flex items-start gap-2.5 min-w-0 flex-1 active:scale-[0.99] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {a.thumbnail_url ? (
                                            <img
                                                src={a.thumbnail_url}
                                                alt=""
                                                loading="lazy"
                                                decoding="async"
                                                className="h-12 w-16 rounded-lg object-cover shrink-0 bg-slate-100 dark:bg-white/[0.06]"
                                            />
                                        ) : (
                                            <div className="h-12 w-16 rounded-lg bg-slate-100 dark:bg-white/[0.06]
                                                            flex items-center justify-center shrink-0">
                                                <BookOpen className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                                            </div>
                                        )}

                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                                                {a.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                    <Clock className="h-3 w-3" /> {fmtHours(a.learning_hours)}
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                    <Award className="h-3 w-3" /> {fmtPoints(a.configured_cpd_points)} pts
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                    <Calendar className="h-3 w-3" /> {fmtDate(a.created_at)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                                                 text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400">
                                                    <Coins className="h-3 w-3" /> +{coinsPerCompletion} MC per completion
                                                </span>
                                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                                                    ≈ KSh {perCompletionKes}
                                                </span>
                                            </div>

                                            {isAdmin && author && (
                                                <AuthorStrip
                                                    author={author}
                                                    isOwn={isOwn}
                                                    activityTitle={a.title}
                                                />
                                            )}
                                        </div>
                                    </Link>

                                    {/* Right: status + action icons */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${getStatusTone(a.status)}`}>
                                            {a.status}
                                        </span>

                                        {a.status === "archived" && (
                                            <button
                                                title="Unarchive (back to draft)"
                                                disabled={isRemoving}
                                                onClick={() => handleUnarchive(a)}
                                                className={`${IconBtn} bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400`}
                                                style={{ touchAction: "manipulation" }}
                                            >
                                                {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                            </button>
                                        )}

                                        {a.status !== "archived" && (
                                            <button
                                                title="Archive (nurses keep their records)"
                                                disabled={isRemoving}
                                                onClick={() => handleArchive(a)}
                                                className={`${IconBtn} bg-amber-50 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400`}
                                                style={{ touchAction: "manipulation" }}
                                            >
                                                {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                                            </button>
                                        )}

                                        <button
                                            title="Remove activity"
                                            disabled={isRemoving}
                                            onClick={() => handleRemove(a)}
                                            className={`${IconBtn} bg-rose-50 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400`}
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </button>
                                    </div>
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
                                {q.isFetchingNextPage
                                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</>
                                    : "Load more"}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <CpdEmptyState
                    title="No activities yet"
                    hint="Tap 'New Activity' to create your first one."
                />
            )}

            <LoadingOverlay open={creating} title="Creating activity…" subtitle="Setting up your new CPD activity" />
        </div>
    );
}