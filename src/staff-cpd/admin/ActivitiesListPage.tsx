// src/staff-cpd/admin/ActivitiesListPage.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Trash2, BookOpen, Calendar, Clock, Award, Archive } from "lucide-react";
import { useAdminActivities, useCreateActivity, useRemoveActivity } from "../lib/admin-hooks";
import { CpdEmptyState } from "../components";
import { fmtDate, fmtHours, fmtPoints } from "../lib";

// Status pill styling
const STATUS_TONES: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    archived: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const getStatusTone = (status?: string) =>
    STATUS_TONES[(status ?? "").toLowerCase()] ?? STATUS_TONES.draft;

export default function ActivitiesListPage() {
    const [status, setStatus] = useState<string>("");
    const [search, setSearch] = useState("");
    const q = useAdminActivities(status || undefined);
    const create = useCreateActivity();
    const remove = useRemoveActivity();
    const nav = useNavigate();

    const items = (q.data?.pages.flatMap(p => p.items) ?? [])
        .filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="min-h-screen w-full flex flex-col items-center">
            <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-4 md:space-y-5 px-0 sm:px-6 pt-4 sm:pt-8 pb-8">

                {/* HERO HEADER CARD */}
                <Card className="relative overflow-hidden md:shadow-xl md:shadow-blue-500/5 transition-all rounded-none md:rounded-xl border-0 bg-transparent dark:bg-transparent border-b border-gray-100 dark:border-gray-800 md:border-b-0">
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-48 md:w-64 h-48 md:h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative px-4 md:px-6 pt-4 md:pt-6 pb-4 md:pb-6">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                                    <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={2.4} />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                                        CPD <span className="text-blue-600">Activities</span>
                                    </h1>
                                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                        Create and publish CPD activities
                                    </p>
                                </div>
                            </div>

                            <Button
                                onClick={async () => {
                                    const a = await create.mutateAsync({ title: "Untitled Activity" });
                                    nav(`/cpd/admin/activities/${a.id}`);
                                }}
                                disabled={create.isPending}
                                className="h-11 md:h-12 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/20 px-4 md:px-5 flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                New Activity
                            </Button>
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
                                placeholder="Search title…"
                                className="w-full h-11 md:h-12 pl-9 md:pl-11 pr-4 rounded-lg md:rounded-2xl bg-gray-100 dark:bg-gray-900 border-2 border-transparent text-sm md:text-base text-gray-900 dark:text-white placeholder-gray-400 font-medium focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none shadow-inner"
                            />
                            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                        </div>

                        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
                            <SelectTrigger className="w-full sm:w-44 h-11 md:h-12 rounded-lg md:rounded-2xl bg-gray-100 dark:bg-gray-900 border-2 border-transparent text-sm md:text-base font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50">
                                <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-0 shadow-xl">
                                <SelectItem value="all">All statuses</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="review">Review</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* LIST */}
                {q.isLoading ? (
                    <div className="space-y-[8px] sm:space-y-2 px-[4px] md:px-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-20 md:h-16 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                        ))}
                    </div>
                ) : items.length ? (
                    <div className="space-y-[8px] sm:space-y-2 px-[4px] md:px-0">
                        {items.map(a => (
                            <Card
                                key={a.id}
                                className="group relative overflow-hidden transition-all duration-300 rounded-xl border-0 bg-white dark:bg-muted/70 shadow-sm hover:shadow-xl p-0"
                            >
                                <CardContent className="p-3 md:p-4 flex items-center justify-between gap-3">
                                    <Link
                                        to={`/cpd/admin/activities/${a.id}`}
                                        className="flex items-center gap-3 min-w-0 flex-1"
                                    >
                                        {/* Thumbnail */}
                                        {a.thumbnail_url ? (
                                            <img
                                                src={a.thumbnail_url}
                                                alt=""
                                                className="h-14 w-20 md:h-12 md:w-16 rounded-lg object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="h-14 w-20 md:h-12 md:w-16 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                                <BookOpen className="w-5 h-5 text-white/80" />
                                            </div>
                                        )}

                                        {/* Meta */}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
                                                {a.title}
                                            </p>
                                            <div className="flex items-center gap-2 md:gap-3 mt-1 flex-wrap">
                                                <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                                    <Clock className="w-3 h-3" />
                                                    {fmtHours(a.learning_hours)}
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                                    <Award className="w-3 h-3" />
                                                    {fmtPoints(a.configured_cpd_points)} pts
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                                    <Calendar className="w-3 h-3" />
                                                    {fmtDate(a.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>

                                    <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                                        <span
                                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${getStatusTone(a.status)}`}
                                        >
                                            {a.status}
                                        </span>

                                        {/* Archive (visible only when not already archived) */}
                                        {a.status !== "archived" && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                title="Archive (safe — nurses keep their records)"
                                                disabled={remove.isPending}
                                                className="h-9 w-9 p-0 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                                onClick={() => {
                                                    const ok = confirm(
                                                        `Archive "${a.title}"?\n\n` +
                                                        `It will disappear from the nurse catalog, but every nurse who completed it keeps their certificate, points, and verification code.`
                                                    );
                                                    if (!ok) return;
                                                    remove.mutate(a.id, {
                                                        onSuccess: () => {
                                                            alert(`"${a.title}" was archived.`);
                                                        },
                                                        onError: (e: any) => {
                                                            alert(`Couldn't archive "${a.title}":\n${e?.message ?? "Unknown error"}`);
                                                        },
                                                    });
                                                }}
                                            >
                                                <Archive className="h-4 w-4 text-amber-600" />
                                            </Button>
                                        )}

                                        {/* Remove (intelligently archives or deletes) */}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            title="Remove activity"
                                            disabled={remove.isPending}
                                            className="h-9 w-9 p-0 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                            onClick={() => {
                                                const ok = confirm(
                                                    `Remove "${a.title}"?\n\n` +
                                                    `• If nurses have completed it → the activity is ARCHIVED (their records are preserved).\n` +
                                                    `• If nobody has completed it → the activity is PERMANENTLY DELETED.`
                                                );
                                                if (!ok) return;
                                                remove.mutate(a.id, {
                                                    onSuccess: (res) => {
                                                        if (res.action === "archived") {
                                                            alert(`"${a.title}" was archived.\n\nNurses who completed it keep their certificates and points.`);
                                                        } else {
                                                            alert(`"${a.title}" was permanently deleted.`);
                                                        }
                                                    },
                                                    onError: (e: any) => {
                                                        alert(`Couldn't remove "${a.title}":\n${e?.message ?? "Unknown error"}`);
                                                    },
                                                });
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4 text-rose-600" />
                                        </Button>
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
                        <CpdEmptyState
                            title="No activities yet"
                            hint="Click 'New Activity' to create your first one."
                        />
                    </div>
                )}
            </div>
        </div>
    );
}