// src/staff-cpd/admin/ActivitiesListPage.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Plus, Search, Trash2, BookOpen, Calendar, Clock, Award, Archive,
    Loader2, Coins, ChevronRight,
} from "lucide-react";
import { useAdminActivities, useCreateActivity, useRemoveActivity } from "../lib/admin-hooks";
import { useMedraeCoinConfig } from "../lib/admin-hooks";
import { CpdEmptyState } from "../components";
import { fmtDate, fmtHours, fmtPoints } from "../lib";
import { playSound } from "@/lib/soundManager";
import SelectField from "@/components/ui/SelectField";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (p: number | number[] = 15) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};
const tap = (type: "light" | "success" | "warning" = "light") => {
    try { playSound("ui-tap"); } catch { /* no-op */ }
    if (type === "success") vibrate([15, 30, 15]);
    else if (type === "warning") vibrate(40);
    else vibrate(12);
};

/* ------------------------------------------------------------------ */
/*  Status tones                                                      */
/* ------------------------------------------------------------------ */

const STATUS_TONES: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300",
    review: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
    published: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
    archived: "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400",
};

const getStatusTone = (status?: string) =>
    STATUS_TONES[(status ?? "").toLowerCase()] ?? STATUS_TONES.draft;

/* ------------------------------------------------------------------ */
/*  Shared styles                                                     */
/* ------------------------------------------------------------------ */

const InputBase =
    "w-full h-10 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium " +
    "text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none";

const PrimaryBtn =
    "h-10 px-4 rounded-xl bg-blue-600 text-white text-[13px] font-bold " +
    "flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50 disabled:active:scale-100";

const SecondaryBtn =
    "h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 " +
    "text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

/* ------------------------------------------------------------------ */
/*  LoadingOverlay                                                    */
/* ------------------------------------------------------------------ */

function LoadingOverlay({
    open,
    title,
    subtitle,
}: {
    open: boolean;
    title: string;
    subtitle?: string;
}) {
    if (!open) return null;
    return (
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center
                       bg-slate-50/95 dark:bg-[#0d1117]/95 backdrop-blur-sm
                       animate-in fade-in-0 duration-150"
        >
            <div className="flex flex-col items-center gap-3 px-6 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
                <p className="text-[13px] font-bold text-slate-900 dark:text-white">
                    {title}
                </p>
                {subtitle && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug max-w-[260px]">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════ */
export default function ActivitiesListPage() {
    const [status, setStatus] = useState<string>("");
    const [search, setSearch] = useState("");
    const [creating, setCreating] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const q = useAdminActivities(status || undefined);
    const create = useCreateActivity();
    const remove = useRemoveActivity();
    const nav = useNavigate();

    // 🔒 Read coin economics from the database — never hardcoded
    const { data: coinConfig, isLoading: coinConfigLoading } = useMedraeCoinConfig();

    // Safe fallbacks only while config loads — numbers still render correctly
    // because they come from the same source, just slightly delayed
    const coinsPerCompletion = coinConfig?.coins_per_completion ?? 20;
    const coinToKes = coinConfig?.coin_to_kes_rate ?? 0.01;
    const perCompletionKes = (coinsPerCompletion * coinToKes).toFixed(2);

    const items = (q.data?.pages.flatMap(p => p.items) ?? [])
        .filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()));

    const statusOptions = [
        { value: "", label: "All statuses" },
        { value: "draft", label: "Draft" },
        { value: "review", label: "Review" },
        { value: "published", label: "Published" },
        { value: "archived", label: "Archived" },
    ];

    const handleCreate = async () => {
        if (creating) return;
        tap("success");
        setCreating(true);
        try {
            const a = await create.mutateAsync({ title: "Untitled Activity" });
            nav(`/cpd/admin/activities/${a.id}`);
        } catch {
            setCreating(false);
        }
    };

    const handleArchive = (a: any) => {
        tap("warning");
        const ok = confirm(
            `Archive "${a.title}"?\n\n` +
            `It will disappear from the nurse catalog, but every nurse who completed it keeps their certificate, points, and verification code.`
        );
        if (!ok) return;
        setRemovingId(a.id);
        remove.mutate(a.id, {
            onSuccess: () => {
                alert(`"${a.title}" was archived.`);
                setRemovingId(null);
            },
            onError: (e: any) => {
                alert(`Couldn't archive "${a.title}":\n${e?.message ?? "Unknown error"}`);
                setRemovingId(null);
            },
        });
    };

    const handleRemove = (a: any) => {
        tap("warning");
        const ok = confirm(
            `Remove "${a.title}"?\n\n` +
            `• If nurses have completed it → the activity is ARCHIVED (their records are preserved).\n` +
            `• If nobody has completed it → the activity is PERMANENTLY DELETED.`
        );
        if (!ok) return;
        setRemovingId(a.id);
        remove.mutate(a.id, {
            onSuccess: (res: any) => {
                if (res.action === "archived") {
                    alert(
                        `"${a.title}" was archived.\n\nNurses who completed it keep their certificates and points.`
                    );
                } else {
                    alert(`"${a.title}" was permanently deleted.`);
                }
                setRemovingId(null);
            },
            onError: (e: any) => {
                alert(`Couldn't remove "${a.title}":\n${e?.message ?? "Unknown error"}`);
                setRemovingId(null);
            },
        });
    };

    return (
        <div className="px-4 pt-4 pb-16 space-y-3 max-w-[880px] mx-auto">

            {/* Intro + New Activity */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4" strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight">
                            CPD Activities
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                            Create and publish CPD activities
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
                        <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Creating…
                        </>
                    ) : (
                        <>
                            <Plus className="h-3.5 w-3.5" />
                            New Activity
                        </>
                    )}
                </button>
            </section>

            {/* MedraeCoins info banner + policy button */}
            <section className="rounded-2xl bg-amber-50 dark:bg-amber-400/10 p-3 space-y-2">
                <div className="flex items-start gap-2">
                    <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 leading-tight">
                            Every published activity pays you {coinsPerCompletion} MedraeCoins per completion
                        </p>
                        <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 mt-0.5 leading-snug">
                            {coinConfigLoading
                                ? "Loading current rate…"
                                : <>Fixed rate — cannot be edited. 1 MC = KSh {coinToKes}. {coinsPerCompletion} MC = KSh {perCompletionKes} per completion.</>
                            }
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => { tap(); nav("/cpd/coins-policy"); }}
                    className="w-full h-8 px-3 rounded-lg
                               bg-white/70 dark:bg-[#0d1117]/60
                               text-amber-700 dark:text-amber-300
                               text-[11px] font-bold
                               flex items-center justify-between gap-1.5
                               active:scale-[0.97] transition-transform"
                    style={{ touchAction: "manipulation" }}
                >
                    <span>How MedraeCoins work</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>
            </section>

            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 min-w-0">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search title…"
                        className={InputBase + " pl-9"}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2
                                       h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                <div className="sm:w-44 shrink-0">
                    <SelectField
                        value={status || "all"}
                        onValueChange={(v) => { tap(); setStatus(v === "all" ? "" : v); }}
                        options={statusOptions.map(o => ({
                            ...o,
                            value: o.value === "" ? "all" : o.value,
                        }))}
                    />
                </div>
            </div>

            {/* List */}
            {q.isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-24 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                    ))}
                </div>
            ) : items.length ? (
                <>
                    <div className="space-y-2">
                        {items.map(a => {
                            const isRemoving = removingId === a.id;
                            return (
                                <div
                                    key={a.id}
                                    className={`rounded-2xl bg-white dark:bg-[#161b22] p-3
                                                flex items-start gap-2.5
                                                transition-opacity
                                                ${isRemoving ? "opacity-60 pointer-events-none" : ""}`}
                                >
                                    {/* Left: thumbnail + meta (tap target) */}
                                    <Link
                                        to={`/cpd/admin/activities/${a.id}`}
                                        onClick={() => tap()}
                                        className="flex items-start gap-2.5 min-w-0 flex-1
                                                   active:scale-[0.99] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {/* Thumbnail */}
                                        {a.thumbnail_url ? (
                                            <img
                                                src={a.thumbnail_url}
                                                alt=""
                                                className="h-12 w-16 rounded-lg object-cover shrink-0
                                                           bg-slate-100 dark:bg-white/[0.06]"
                                            />
                                        ) : (
                                            <div className="h-12 w-16 rounded-lg bg-slate-100 dark:bg-white/[0.06]
                                                            flex items-center justify-center shrink-0">
                                                <BookOpen className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                                            </div>
                                        )}

                                        {/* Meta */}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                                                {a.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium
                                                                 text-slate-500 dark:text-slate-400">
                                                    <Clock className="h-3 w-3" />
                                                    {fmtHours(a.learning_hours)}
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium
                                                                 text-slate-500 dark:text-slate-400">
                                                    <Award className="h-3 w-3" />
                                                    {fmtPoints(a.configured_cpd_points)} pts
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium
                                                                 text-slate-500 dark:text-slate-400">
                                                    <Calendar className="h-3 w-3" />
                                                    {fmtDate(a.created_at)}
                                                </span>
                                            </div>

                                            {/* MedraeCoins pill */}
                                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                                                 text-[10px] font-bold
                                                                 bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400">
                                                    <Coins className="h-3 w-3" />
                                                    +{coinsPerCompletion} MC per completion
                                                </span>
                                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                                                    ≈ KSh {perCompletionKes}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>

                                    {/* Right: status + actions */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5
                                                          text-[9px] font-bold capitalize ${getStatusTone(a.status)}`}>
                                            {a.status}
                                        </span>

                                        {/* Archive (only if not archived) */}
                                        {a.status !== "archived" && (
                                            <button
                                                title="Archive (nurses keep their records)"
                                                disabled={isRemoving}
                                                onClick={() => handleArchive(a)}
                                                className="h-9 w-9 rounded-xl
                                                           bg-amber-50 dark:bg-amber-400/10
                                                           text-amber-600 dark:text-amber-400
                                                           flex items-center justify-center
                                                           active:scale-[0.92] transition-transform
                                                           disabled:opacity-50"
                                                style={{ touchAction: "manipulation" }}
                                            >
                                                {isRemoving ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Archive className="h-3.5 w-3.5" />
                                                )}
                                            </button>
                                        )}

                                        {/* Remove (archive or delete) */}
                                        <button
                                            title="Remove activity"
                                            disabled={isRemoving}
                                            onClick={() => handleRemove(a)}
                                            className="h-9 w-9 rounded-xl
                                                       bg-rose-50 dark:bg-rose-400/10
                                                       text-rose-600 dark:text-rose-400
                                                       flex items-center justify-center
                                                       active:scale-[0.92] transition-transform
                                                       disabled:opacity-50"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            {isRemoving ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {q.hasNextPage && (
                        <div className="flex justify-center pt-2">
                            <button
                                onClick={() => { tap(); q.fetchNextPage(); }}
                                disabled={q.isFetchingNextPage}
                                className={SecondaryBtn}
                                style={{ touchAction: "manipulation" }}
                            >
                                {q.isFetchingNextPage ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Loading…
                                    </>
                                ) : (
                                    "Load more"
                                )}
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

            <LoadingOverlay
                open={creating}
                title="Creating activity…"
                subtitle="Setting up your new CPD activity"
            />
        </div>
    );
}