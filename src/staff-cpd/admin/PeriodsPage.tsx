// src/staff-cpd/admin/PeriodsPage.tsx
import { useState } from "react";
import { Calendar, Plus, ArrowRight, CalendarDays } from "lucide-react";
import { useAdminPeriods, useCreatePeriod } from "../lib/admin-hooks";
import { fmtDate } from "../lib";
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
    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
    upcoming: "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400",
    closed: "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300",
    archived: "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400",
};

const getStatusTone = (status?: string) =>
    STATUS_TONES[(status ?? "").toLowerCase()] ?? STATUS_TONES.closed;

/* ------------------------------------------------------------------ */
/*  Shared styles                                                     */
/* ------------------------------------------------------------------ */

const InputBase =
    "w-full h-10 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium " +
    "text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none";

const PrimaryBtn =
    "h-10 px-4 rounded-xl bg-blue-600 text-white text-[13px] font-bold " +
    "flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
        {children}
    </label>
);

/* ═══════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════ */
export default function PeriodsPage() {
    const q = useAdminPeriods();
    const create = useCreatePeriod();
    const [form, setForm] = useState({ name: "", start_date: "", end_date: "" });

    const submit = async () => {
        tap("success");
        await create.mutateAsync(form);
        setForm({ name: "", start_date: "", end_date: "" });
    };

    const canSubmit = form.name && form.start_date && form.end_date && !create.isPending;

    return (
        <div className="px-4 pt-4 pb-16 space-y-3 max-w-[880px] mx-auto">

            {/* Intro */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                <div className="flex items-start gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4" strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight">
                            CPD Periods
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                            Professional development cycles — only one active
                        </p>
                    </div>
                </div>
            </section>

            {/* Create form */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Create a new period
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                        <Label>Name</Label>
                        <input
                            value={form.name}
                            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="CPD 2026"
                            className={InputBase}
                        />
                    </div>
                    <div>
                        <Label>Start date</Label>
                        <input
                            type="date"
                            value={form.start_date}
                            onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
                            className={InputBase}
                        />
                    </div>
                    <div>
                        <Label>End date</Label>
                        <input
                            type="date"
                            value={form.end_date}
                            onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))}
                            className={InputBase}
                        />
                    </div>
                </div>

                <button
                    onClick={submit}
                    disabled={!canSubmit}
                    className={PrimaryBtn + " w-full"}
                    style={{ touchAction: "manipulation" }}
                >
                    <Plus className="h-3.5 w-3.5" />
                    {create.isPending ? "Creating…" : "Create Period"}
                </button>
            </section>

            {/* List */}
            {q.isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-20 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                    ))}
                </div>
            ) : q.data?.length ? (
                <div className="space-y-2">
                    {q.data.map((p) => (
                        <div
                            key={p.id}
                            className="rounded-2xl bg-white dark:bg-[#161b22] p-3
                                       flex items-center gap-2.5"
                        >
                            <div className="h-11 w-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                                <CalendarDays className="h-4 w-4" strokeWidth={2.4} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                                    {p.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-medium
                                                text-slate-500 dark:text-slate-400">
                                    <span>{fmtDate(p.start_date)}</span>
                                    <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                                    <span>{fmtDate(p.end_date)}</span>
                                </div>
                            </div>

                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 shrink-0
                                              text-[9px] font-bold capitalize ${getStatusTone(p.status)}`}>
                                {p.status}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <CpdEmptyState
                    title="No periods defined"
                    hint="Create one above to start tracking CPD cycles."
                    icon={Calendar}
                />
            )}
        </div>
    );
}