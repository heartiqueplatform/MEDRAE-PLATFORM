// src/staff-cpd/admin/CompletionsPage.tsx
import { useState } from "react";
import {
    Search, Ban, ClipboardList, Calendar, Award, User as UserIcon, Mail,
} from "lucide-react";
import { useAdminCompletions, useRevokeCompletion } from "../lib/admin-hooks";
import { fmtDate, fmtPoints } from "../lib";
import { CpdEmptyState } from "../components";
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
    verified: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
    pending: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
    revoked: "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400",
};

const getStatusTone = (status?: string) =>
    STATUS_TONES[(status ?? "").toLowerCase()] ?? STATUS_TONES.pending;

/* ------------------------------------------------------------------ */
/*  Shared styles                                                     */
/* ------------------------------------------------------------------ */

const InputBase =
    "w-full h-10 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium " +
    "text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none";

const SecondaryBtn =
    "h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 " +
    "text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

/* ═══════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════ */
export default function CompletionsPage() {
    const [status, setStatus] = useState<string>("");
    const [search, setSearch] = useState("");
    const q = useAdminCompletions({ status: status || undefined });
    const revoke = useRevokeCompletion();

    const items = (q.data?.pages.flatMap(p => p.items) ?? []).filter((c: any) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            c.activity?.title?.toLowerCase().includes(s) ||
            c.nurse?.name?.toLowerCase().includes(s) ||
            c.nurse?.email?.toLowerCase().includes(s)
        );
    });

    const statusOptions = [
        { value: "", label: "All statuses" },
        { value: "verified", label: "Verified" },
        { value: "pending", label: "Pending" },
        { value: "revoked", label: "Revoked" },
    ];

    return (
        <div className="px-4 pt-4 pb-16 space-y-3 max-w-[880px] mx-auto">

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
                            Authoritative record of every verified completion
                        </p>
                    </div>
                </div>
            </section>

            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 min-w-0">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search activity or nurse…"
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
                        <div key={i} className="h-24 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                    ))}
                </div>
            ) : items.length ? (
                <>
                    <div className="space-y-2">
                        {items.map((c: any) => (
                            <div
                                key={c.id}
                                className="rounded-2xl bg-white dark:bg-[#161b22] p-3
                                           flex items-start gap-2.5"
                            >
                                <div className="min-w-0 flex-1">
                                    {/* Activity title */}
                                    <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                                        {c.activity?.title ?? "Activity"}
                                    </p>

                                    {/* Nurse row */}
                                    <div className="flex items-center gap-1.5 mt-1 min-w-0">
                                        <UserIcon className="h-3 w-3 text-slate-400 shrink-0" />
                                        <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
                                            {c.nurse?.name ?? c.nurse_id}
                                        </p>
                                        {c.nurse?.email && (
                                            <>
                                                <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">·</span>
                                                <Mail className="h-3 w-3 text-slate-400 shrink-0 hidden sm:block" />
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate hidden sm:block">
                                                    {c.nurse.email}
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    {/* Meta chips */}
                                    <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium
                                                         text-slate-500 dark:text-slate-400">
                                            <Calendar className="h-3 w-3" />
                                            {fmtDate(c.completed_at)}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium
                                                         text-slate-500 dark:text-slate-400">
                                            <Award className="h-3 w-3" />
                                            {fmtPoints(c.points_awarded)} pts
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium
                                                         text-slate-500 dark:text-slate-400">
                                            Score{" "}
                                            <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                                                {c.assessment_score != null
                                                    ? `${Math.round(c.assessment_score)}%`
                                                    : "—"}
                                            </span>
                                        </span>
                                    </div>
                                </div>

                                {/* Status + action */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5
                                                      text-[9px] font-bold capitalize ${getStatusTone(c.completion_status)}`}>
                                        {c.completion_status}
                                    </span>
                                    {c.completion_status === "verified" && (
                                        <button
                                            title="Revoke this completion"
                                            onClick={() => {
                                                tap("warning");
                                                if (confirm("Revoke this completion? Points will stop counting.")) {
                                                    revoke.mutate(c.id);
                                                }
                                            }}
                                            className="h-9 w-9 rounded-xl
                                                       bg-rose-50 dark:bg-rose-400/10
                                                       text-rose-600 dark:text-rose-400
                                                       flex items-center justify-center
                                                       active:scale-[0.92] transition-transform"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            <Ban className="h-3.5 w-3.5" />
                                        </button>
                                    )}
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
                    title="No completions match"
                    hint="Try adjusting your search or filter."
                    icon={ClipboardList}
                />
            )}
        </div>
    );
}