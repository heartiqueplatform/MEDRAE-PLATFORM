// src/staff-cpd/admin/ActivitiesListPage.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Plus, Search, Trash2, BookOpen, Calendar, Clock, Award, Archive,
} from "lucide-react";
import { useAdminActivities, useCreateActivity, useRemoveActivity } from "../lib/admin-hooks";
import { CpdEmptyState } from "../components";
import { fmtDate, fmtHours, fmtPoints } from "../lib";
import { playSound } from "@/lib/soundManager";

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
    "flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

const SecondaryBtn =
    "h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 " +
    "text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

/* ═══════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════ */
export default function ActivitiesListPage() {
    const [status, setStatus] = useState<string>("");
    const [search, setSearch] = useState("");
    const q = useAdminActivities(status || undefined);
    const create = useCreateActivity();
    const remove = useRemoveActivity();
    const nav = useNavigate();

    const items = (q.data?.pages.flatMap(p => p.items) ?? [])
        .filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()));

    const statusOptions = [
        { value: "", label: "All statuses" },
        { value: "draft", label: "Draft" },
        { value: "review", label: "Review" },
        { value: "published", label: "Published" },
        { value: "archived", label: "Archived" },
    ];

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
                    onClick={async () => {
                        tap("success");
                        const a = await create.mutateAsync({ title: "Untitled Activity" });
                        nav(`/cpd/admin/activities/${a.id}`);
                    }}
                    disabled={create.isPending}
                    className={PrimaryBtn + " w-full"}
                    style={{ touchAction: "manipulation" }}
                >
                    <Plus className="h-3.5 w-3.5" />
                    New Activity
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

                <select
                    value={status}
                    onChange={(e) => { tap(); setStatus(e.target.value); }}
                    className={InputBase + " sm:w-44 shrink-0"}
                    style={{ touchAction: "manipulation" }}
                >
                    {statusOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* List */}
            {q.isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-20 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                    ))}
                </div>
            ) : items.length ? (
                <>
                    <div className="space-y-2">
                        {items.map(a => (
                            <div
                                key={a.id}
                                className="rounded-2xl bg-white dark:bg-[#161b22] p-3
                                           flex items-center gap-2.5"
                            >
                                {/* Left: thumbnail + meta (tap target) */}
                                <Link
                                    to={`/cpd/admin/activities/${a.id}`}
                                    onClick={() => tap()}
                                    className="flex items-center gap-2.5 min-w-0 flex-1
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
                                            disabled={remove.isPending}
                                            onClick={() => {
                                                tap("warning");
                                                const ok = confirm(
                                                    `Archive "${a.title}"?\n\n` +
                                                    `It will disappear from the nurse catalog, but every nurse who completed it keeps their certificate, points, and verification code.`
                                                );
                                                if (!ok) return;
                                                remove.mutate(a.id, {
                                                    onSuccess: () => alert(`"${a.title}" was archived.`),
                                                    onError: (e: any) =>
                                                        alert(`Couldn't archive "${a.title}":\n${e?.message ?? "Unknown error"}`),
                                                });
                                            }}
                                            className="h-9 w-9 rounded-xl
                                                       bg-amber-50 dark:bg-amber-400/10
                                                       text-amber-600 dark:text-amber-400
                                                       flex items-center justify-center
                                                       active:scale-[0.92] transition-transform
                                                       disabled:opacity-50"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            <Archive className="h-3.5 w-3.5" />
                                        </button>
                                    )}

                                    {/* Remove (archive or delete) */}
                                    <button
                                        title="Remove activity"
                                        disabled={remove.isPending}
                                        onClick={() => {
                                            tap("warning");
                                            const ok = confirm(
                                                `Remove "${a.title}"?\n\n` +
                                                `• If nurses have completed it → the activity is ARCHIVED (their records are preserved).\n` +
                                                `• If nobody has completed it → the activity is PERMANENTLY DELETED.`
                                            );
                                            if (!ok) return;
                                            remove.mutate(a.id, {
                                                onSuccess: (res: any) => {
                                                    if (res.action === "archived") {
                                                        alert(
                                                            `"${a.title}" was archived.\n\nNurses who completed it keep their certificates and points.`
                                                        );
                                                    } else {
                                                        alert(`"${a.title}" was permanently deleted.`);
                                                    }
                                                },
                                                onError: (e: any) =>
                                                    alert(`Couldn't remove "${a.title}":\n${e?.message ?? "Unknown error"}`),
                                            });
                                        }}
                                        className="h-9 w-9 rounded-xl
                                                   bg-rose-50 dark:bg-rose-400/10
                                                   text-rose-600 dark:text-rose-400
                                                   flex items-center justify-center
                                                   active:scale-[0.92] transition-transform
                                                   disabled:opacity-50"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {q.hasNextPage && (
                        <div className="flex justify-center pt-2">
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
                    title="No activities yet"
                    hint="Tap 'New Activity' to create your first one."
                />
            )}
        </div>
    );
}