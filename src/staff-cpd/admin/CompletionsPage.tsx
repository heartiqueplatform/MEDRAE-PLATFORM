// src/staff-cpd/admin/CompletionsPage.tsx
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Ban, ClipboardList, Calendar, Award, User as UserIcon, Mail } from "lucide-react";
import { useAdminCompletions, useRevokeCompletion } from "../lib/admin-hooks";
import { fmtDate, fmtPoints } from "../lib";

// Completion status tones — mirrors ActivitiesListPage
const STATUS_TONES: Record<string, string> = {
    verified: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    revoked: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const getStatusTone = (status?: string) =>
    STATUS_TONES[(status ?? "").toLowerCase()] ?? STATUS_TONES.pending;

// Shared input styling — matches ActivitiesListPage
const inputCls =
    "h-11 md:h-12 rounded-lg md:rounded-2xl bg-gray-100 dark:bg-gray-900 border-2 border-transparent text-sm md:text-base font-medium focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none shadow-inner";

export default function CompletionsPage() {
    const [status, setStatus] = useState<string>("");
    const [search, setSearch] = useState("");
    const q = useAdminCompletions({ status: status || undefined });
    const revoke = useRevokeCompletion();

    const items = (q.data?.pages.flatMap(p => p.items) ?? []).filter(c => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            c.activity?.title?.toLowerCase().includes(s) ||
            c.nurse?.name?.toLowerCase().includes(s) ||
            c.nurse?.email?.toLowerCase().includes(s)
        );
    });

    return (
        <div className="min-h-screen w-full flex flex-col items-center">
            <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-4 md:space-y-5 px-0 sm:px-6 pt-4 sm:pt-8 pb-8">

                {/* HERO HEADER CARD */}
                <Card className="relative overflow-hidden md:shadow-xl md:shadow-blue-500/5 transition-all rounded-none md:rounded-xl border-0 bg-transparent dark:bg-transparent border-b border-gray-100 dark:border-gray-800 md:border-b-0">
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-48 md:w-64 h-48 md:h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative px-4 md:px-6 pt-4 md:pt-6 pb-4 md:pb-6">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
                                <ClipboardList className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={2.4} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                                    CPD <span className="text-emerald-600">Completions</span>
                                </h1>
                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    The authoritative record of every verified CPD completion.
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* FILTER BAR */}
                <div className="px-[4px] md:px-0">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                        <div className="relative flex-1 min-w-0 group">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search activity or nurse…"
                                className={`w-full pl-9 md:pl-11 pr-4 ${inputCls}`}
                            />
                            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                        </div>

                        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
                            <SelectTrigger className={`w-full sm:w-44 ${inputCls}`}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-0 shadow-xl">
                                <SelectItem value="all">All statuses</SelectItem>
                                <SelectItem value="verified">Verified</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="revoked">Revoked</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* LIST */}
                {q.isLoading ? (
                    <div className="space-y-[8px] sm:space-y-2 px-[4px] md:px-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-24 md:h-20 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                        ))}
                    </div>
                ) : items.length ? (
                    <div className="space-y-[8px] sm:space-y-2 px-[4px] md:px-0">
                        {items.map((c: any) => (
                            <Card
                                key={c.id}
                                className="group relative overflow-hidden transition-all duration-300 rounded-xl border-0 bg-white dark:bg-muted/70 shadow-sm hover:shadow-xl p-0"
                            >
                                <CardContent className="p-3 md:p-4 flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        {/* Activity title */}
                                        <p className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
                                            {c.activity?.title ?? "Activity"}
                                        </p>

                                        {/* Nurse row */}
                                        <div className="flex items-center gap-1.5 mt-1 min-w-0">
                                            <UserIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                            <p className="text-[11px] md:text-xs text-gray-600 dark:text-gray-300 font-medium truncate">
                                                {c.nurse?.name ?? c.nurse_id}
                                            </p>
                                            {c.nurse?.email && (
                                                <>
                                                    <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">·</span>
                                                    <Mail className="w-3 h-3 text-gray-400 flex-shrink-0 hidden sm:block" />
                                                    <p className="text-[10px] md:text-[11px] text-gray-400 dark:text-gray-500 truncate hidden sm:block">
                                                        {c.nurse.email}
                                                    </p>
                                                </>
                                            )}
                                        </div>

                                        {/* Meta chips */}
                                        <div className="flex items-center gap-2 md:gap-3 mt-1.5 flex-wrap">
                                            <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                                <Calendar className="w-3 h-3" />
                                                {fmtDate(c.completed_at)}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                                <Award className="w-3 h-3" />
                                                {fmtPoints(c.points_awarded)} pts
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                                <span className="w-3 h-3 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                </span>
                                                score{" "}
                                                {c.assessment_score != null
                                                    ? `${Math.round(c.assessment_score)}%`
                                                    : "—"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                                        <span
                                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${getStatusTone(c.completion_status)}`}
                                        >
                                            {c.completion_status}
                                        </span>
                                        {c.completion_status === "verified" && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-9 w-9 p-0 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                onClick={() => {
                                                    if (confirm("Revoke this completion? Points will stop counting.")) {
                                                        revoke.mutate(c.id);
                                                    }
                                                }}
                                            >
                                                <Ban className="h-4 w-4 text-rose-600" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {q.hasNextPage && (
                            <div className="flex justify-center pt-3">
                                <Button
                                    variant="outline"
                                    onClick={() => q.fetchNextPage()}
                                    disabled={q.isFetchingNextPage}
                                    className="h-11 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 font-bold text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 transition-all px-6"
                                >
                                    {q.isFetchingNextPage ? "Loading…" : "Load more"}
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="px-[4px] md:px-0">
                        <div className="text-center py-12 px-4 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20 mb-3">
                                <ClipboardList className="w-6 h-6 text-white" strokeWidth={2.4} />
                            </div>
                            <p className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100">
                                No completions match
                            </p>
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Try adjusting your search or filter.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}