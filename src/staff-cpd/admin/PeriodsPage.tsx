// src/staff-cpd/admin/PeriodsPage.tsx
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Plus, ArrowRight, CalendarDays } from "lucide-react";
import { useAdminPeriods, useCreatePeriod } from "../lib/admin-hooks";
import { fmtDate } from "../lib";

// Period status tones — mirrors the other admin pages
const STATUS_TONES: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    upcoming: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    archived: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const getStatusTone = (status?: string) =>
    STATUS_TONES[(status ?? "").toLowerCase()] ?? STATUS_TONES.closed;

// Shared input styling — matches the rest of the admin suite
const inputCls =
    "h-11 md:h-12 rounded-lg md:rounded-2xl bg-gray-100 dark:bg-gray-900 border-2 border-transparent text-sm md:text-base font-medium focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none shadow-inner";

export default function PeriodsPage() {
    const q = useAdminPeriods();
    const create = useCreatePeriod();
    const [form, setForm] = useState({ name: "", start_date: "", end_date: "" });

    const submit = async () => {
        await create.mutateAsync(form);
        setForm({ name: "", start_date: "", end_date: "" });
    };

    const canSubmit = form.name && form.start_date && form.end_date && !create.isPending;

    return (
        <div className="min-h-screen w-full flex flex-col items-center">
            <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-4 md:space-y-5 px-0 sm:px-6 pt-4 sm:pt-8 pb-8">

                {/* HERO HEADER CARD */}
                <Card className="relative overflow-hidden md:shadow-xl md:shadow-blue-500/5 transition-all rounded-none md:rounded-xl border-0 bg-transparent dark:bg-transparent border-b border-gray-100 dark:border-gray-800 md:border-b-0">
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-48 md:w-64 h-48 md:h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative px-4 md:px-6 pt-4 md:pt-6 pb-4 md:pb-6">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
                                <Calendar className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={2.4} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                                    CPD <span className="text-amber-600">Periods</span>
                                </h1>
                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    Professional development cycles (e.g. CPD 2026, CPD 2027). Only one should be active.
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* CREATE FORM CARD */}
                <div className="px-[4px] md:px-0">
                    <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70">
                        <CardContent className="p-4 md:p-6 space-y-4">

                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
                                    <Plus className="w-4 h-4 text-white" strokeWidth={2.6} />
                                </div>
                                <p className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100">
                                    Create a new period
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                                <div>
                                    <label className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Name
                                    </label>
                                    <Input
                                        value={form.name}
                                        onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="CPD 2026"
                                        className={`mt-1.5 ${inputCls}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Start date
                                    </label>
                                    <Input
                                        type="date"
                                        value={form.start_date}
                                        onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
                                        className={`mt-1.5 ${inputCls}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        End date
                                    </label>
                                    <Input
                                        type="date"
                                        value={form.end_date}
                                        onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))}
                                        className={`mt-1.5 ${inputCls}`}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-1">
                                <Button
                                    onClick={submit}
                                    disabled={!canSubmit}
                                    className="h-11 md:h-12 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/20 px-5 disabled:opacity-40 disabled:shadow-none flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    {create.isPending ? "Creating…" : "Create Period"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* LIST */}
                {q.isLoading ? (
                    <div className="space-y-[8px] sm:space-y-2 px-[4px] md:px-0">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-20 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                        ))}
                    </div>
                ) : q.data?.length ? (
                    <div className="space-y-[8px] sm:space-y-2 px-[4px] md:px-0">
                        {q.data.map((p) => (
                            <Card
                                key={p.id}
                                className="group relative overflow-hidden transition-all duration-300 rounded-xl border-0 bg-white dark:bg-muted/70 shadow-sm hover:shadow-xl p-0"
                            >
                                <CardContent className="p-3 md:p-4 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        {/* Icon tile */}
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/20 flex-shrink-0">
                                            <CalendarDays className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={2.4} />
                                        </div>

                                        {/* Meta */}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
                                                {p.name}
                                            </p>
                                            <div className="flex items-center gap-1.5 md:gap-2 mt-1 text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                <span>{fmtDate(p.start_date)}</span>
                                                <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                <span>{fmtDate(p.end_date)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status pill */}
                                    <span
                                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${getStatusTone(p.status)}`}
                                    >
                                        {p.status}
                                    </span>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="px-[4px] md:px-0">
                        <div className="text-center py-12 px-4 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/20 mb-3">
                                <Calendar className="w-6 h-6 text-white" strokeWidth={2.4} />
                            </div>
                            <p className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100">
                                No periods defined
                            </p>
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Create one above to start tracking CPD cycles.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}