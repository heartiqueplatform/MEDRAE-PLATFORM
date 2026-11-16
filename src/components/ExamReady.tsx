// pages/exam/tutor/ExamReady.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    FileText,
    Users,
    PlayCircle,
    CheckCircle,
    BarChart3,
    Monitor,
    Send,
    Eye,
    XCircle,
    Clock,
    ShieldCheck,
    Lock,
    Settings2,
    Loader2,
    PlusCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { toast } from "sonner";
import { tap, tapSuccess, tapError } from "@/lib/tutor/tap";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
interface Exam {
    id: string;
    title: string;
    description: string | null;
    course: string | null;
    block: string | null;
    duration: number;
    is_active: boolean;
    is_released: boolean;
    results_released: boolean;
    closed_at: string | null;
    scheduled_start: string | null;
    scheduled_end: string | null;
    strict_mode: boolean;
    max_tab_switch: number;
    max_violation_limit: number;
    // enriched
    questions: number;
    sessions: number;
    active: number;
    completed: number;
    results: number;
    instructions: { id: string; content: string }[];
}

const PAGE_LIMIT = 20;

// ---------------------------------------------------------------
// Page
// ---------------------------------------------------------------
export default function ExamReady() {
    const user = useUser();
    const navigate = useNavigate();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const handleBack = useCallback(() => {
        tap();
        navigate("/dashboard/tutor", { replace: true });
    }, [navigate]);

    const fetchExams = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("exam_papers")
                .select("*")
                .eq("created_by", user.id)
                .order("created_at", { ascending: false })
                .limit(PAGE_LIMIT);
            if (error) throw error;

            // Batch the 5 counts per exam using Promise.all on the whole list.
            // For N=20 this is 5*20 = 100 tiny head-count queries — acceptable.
            // TODO(rpc): get_tutor_exam_stats(p_tutor_id) — single RPC returns
            // { paper_id, questions, sessions, active, completed, results }[].
            const ids = (data ?? []).map((e) => e.id);

            // Aggregate counts via grouped queries: one query per metric, scoped to all ids
            const [
                { data: qs },
                { data: sess },
                { data: done },
                { data: res },
                { data: instr },
            ] = await Promise.all([
                supabase
                    .from("exam_questions")
                    .select("paper_id")
                    .in("paper_id", ids),
                supabase
                    .from("exam_sessions")
                    .select("paper_id, status")
                    .in("paper_id", ids),
                supabase
                    .from("exam_sessions")
                    .select("paper_id, status")
                    .in("paper_id", ids),
                supabase
                    .from("exam_results")
                    .select("paper_id")
                    .in("paper_id", ids),
                supabase
                    .from("exam_instructions")
                    .select("id, paper_id, content")
                    .in("paper_id", ids),
            ]);

            const qCount = new Map<string, number>();
            for (const r of qs ?? []) {
                const k = (r as any).paper_id;
                qCount.set(k, (qCount.get(k) ?? 0) + 1);
            }
            const sessCount = new Map<string, number>();
            const activeCount = new Map<string, number>();
            const completedCount = new Map<string, number>();
            for (const r of sess ?? []) {
                const k = (r as any).paper_id;
                const status = (r as any).status;
                sessCount.set(k, (sessCount.get(k) ?? 0) + 1);
                if (status === "started")
                    activeCount.set(k, (activeCount.get(k) ?? 0) + 1);
                if (status === "completed")
                    completedCount.set(k, (completedCount.get(k) ?? 0) + 1);
            }
            const rCount = new Map<string, number>();
            for (const r of res ?? []) {
                const k = (r as any).paper_id;
                rCount.set(k, (rCount.get(k) ?? 0) + 1);
            }
            const instrByPaper = new Map<string, { id: string; content: string }[]>();
            for (const r of instr ?? []) {
                const k = (r as any).paper_id;
                const list = instrByPaper.get(k) ?? [];
                list.push({ id: (r as any).id, content: (r as any).content });
                instrByPaper.set(k, list);
            }

            const enriched: Exam[] = (data ?? []).map((e) => ({
                ...e,
                questions: qCount.get(e.id) ?? 0,
                sessions: sessCount.get(e.id) ?? 0,
                active: activeCount.get(e.id) ?? 0,
                completed: completedCount.get(e.id) ?? 0,
                results: rCount.get(e.id) ?? 0,
                instructions: instrByPaper.get(e.id) ?? [],
            }));

            setExams(enriched);
        } catch (e: any) {
            toast.error(e?.message || "Failed to load exams");
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchExams();
    }, [fetchExams]);

    const updateExam = async (id: string, updates: Record<string, unknown>) => {
        setBusyId(id);
        const prev = exams;
        // optimistic
        setExams((cur) =>
            cur.map((x) => (x.id === id ? { ...x, ...updates } : x))
        );
        try {
            const { error } = await supabase
                .from("exam_papers")
                .update(updates)
                .eq("id", id);
            if (error) throw error;
            tapSuccess();
            toast.success("Updated");
        } catch (e: any) {
            tapError();
            setExams(prev);
            toast.error(e?.message || "Failed to update");
        } finally {
            setBusyId(null);
        }
    };

    const stats = useMemo(
        () => ({
            total: exams.length,
            live: exams.filter((e) => e.is_released && !e.closed_at).length,
            drafts: exams.filter((e) => !e.is_released && !e.closed_at).length,
            closed: exams.filter((e) => !!e.closed_at).length,
        }),
        [exams]
    );

    if (loading) {
        return (
            <div className="fixed inset-0 flex flex-col bg-transparent">
                <Header
                    onBack={handleBack}
                    title="Assessments"
                    subtitle="Loading…"
                />
                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-3 space-y-3">
                    {[0, 1].map((i) => (
                        <div
                            key={i}
                            className="h-40 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse"
                        />
                    ))}
                </main>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 flex flex-col bg-transparent">
            <Header
                onBack={handleBack}
                title="Assessments"
                subtitle={
                    exams.length === 0
                        ? "No exams yet"
                        : `${stats.total} total · ${stats.live} live · ${stats.drafts} draft`
                }
            />

            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
                <div className="max-w-3xl mx-auto px-4 py-3 pb-24 space-y-3">
                    {/* Empty state */}
                    {exams.length === 0 && (
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center">
                            <FileText
                                className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2"
                                strokeWidth={1.5}
                            />
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                No exams yet
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Create your first exam to get started
                            </p>
                            <button
                                onClick={() => {
                                    tap();
                                    navigate("/tutor/exams");
                                }}
                                className="mt-3 h-9 px-4 rounded-xl bg-violet-600 text-white text-xs font-bold active:scale-[0.97] inline-flex items-center gap-1.5"
                                style={{ touchAction: "manipulation" }}
                            >
                                <PlusCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                                Create exam
                            </button>
                        </div>
                    )}

                    {/* Exam cards */}
                    {exams.map((exam) => {
                        const isClosed = !exam.is_active && !!exam.closed_at;
                        const isLive = exam.is_released && !isClosed;
                        const isDraft = !exam.is_released && !isClosed;
                        const isExpanded = expanded === exam.id;
                        const isBusy = busyId === exam.id;

                        return (
                            <div
                                key={exam.id}
                                className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden"
                            >
                                <div className="p-3 space-y-3">
                                    {/* Top row: status + title */}
                                    <div className="flex items-start gap-2">
                                        <span
                                            className={`mt-1 h-2 w-2 rounded-full shrink-0 ${isClosed
                                                ? "bg-slate-400"
                                                : isLive
                                                    ? "bg-emerald-500"
                                                    : "bg-amber-500"
                                                }`}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                {exam.title}
                                            </h3>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                {[
                                                    exam.course,
                                                    exam.block,
                                                    `${exam.duration}m`,
                                                ]
                                                    .filter(Boolean)
                                                    .join(" · ")}
                                            </p>
                                        </div>
                                        <StatusChip
                                            label={
                                                isClosed ? "Closed" : isLive ? "Live" : "Draft"
                                            }
                                            tone={
                                                isClosed ? "slate" : isLive ? "emerald" : "amber"
                                            }
                                        />
                                    </div>

                                    {/* Stats row */}
                                    <div className="grid grid-cols-5 gap-1.5">
                                        <Stat n={exam.questions} label="Questions" />
                                        <Stat n={exam.sessions} label="Enrolled" />
                                        <Stat n={exam.active} label="Live" tone="violet" />
                                        <Stat n={exam.completed} label="Done" tone="emerald" />
                                        <Stat n={exam.results} label="Evaluated" />
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-1.5">
                                        <ActionBtn
                                            icon={<Monitor className="h-3.5 w-3.5" />}
                                            label="Monitor"
                                            tone="violet"
                                            onClick={() => {
                                                tap();
                                                navigate(`/tutor/exams/${exam.id}/live`);
                                            }}
                                        />
                                        <ActionBtn
                                            icon={<BarChart3 className="h-3.5 w-3.5" />}
                                            label="Results"
                                            tone="slate"
                                            onClick={() => {
                                                tap();
                                                navigate(`/tutor/exams/${exam.id}/results`);
                                            }}
                                        />
                                        {isDraft && (
                                            <ActionBtn
                                                icon={<Send className="h-3.5 w-3.5" />}
                                                label="Release"
                                                tone="emerald"
                                                onClick={() =>
                                                    updateExam(exam.id, {
                                                        is_released: true,
                                                        released_at: new Date().toISOString(),
                                                    })
                                                }
                                                loading={isBusy}
                                            />
                                        )}
                                        {isLive && !exam.results_released && (
                                            <ActionBtn
                                                icon={<Eye className="h-3.5 w-3.5" />}
                                                label="Post results"
                                                tone="violet"
                                                onClick={() =>
                                                    updateExam(exam.id, { results_released: true })
                                                }
                                                loading={isBusy}
                                            />
                                        )}
                                        {!isClosed && (
                                            <ActionBtn
                                                icon={<XCircle className="h-3.5 w-3.5" />}
                                                label="Close"
                                                tone="rose"
                                                onClick={() =>
                                                    updateExam(exam.id, {
                                                        closed_at: new Date().toISOString(),
                                                        is_active: false,
                                                    })
                                                }
                                                loading={isBusy}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Expand toggle — divider is structural (inside same card) */}
                                <button
                                    onClick={() => {
                                        tap();
                                        setExpanded(isExpanded ? null : exam.id);
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2.5 border-t border-slate-100 dark:border-white/[0.04] active:bg-slate-50 dark:active:bg-white/[0.03]"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        <Settings2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                                        Configuration
                                    </span>
                                    {isExpanded ? (
                                        <ChevronUp
                                            className="h-4 w-4 text-slate-400"
                                            strokeWidth={2.5}
                                        />
                                    ) : (
                                        <ChevronDown
                                            className="h-4 w-4 text-slate-400"
                                            strokeWidth={2.5}
                                        />
                                    )}
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-slate-100 dark:border-white/[0.04] p-3 space-y-3">
                                        {/* Description */}
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                                Description
                                            </p>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                                {exam.description || "—"}
                                            </p>
                                        </div>

                                        {/* Config grid */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <ConfigItem
                                                icon={<Clock className="h-3.5 w-3.5" />}
                                                label="Duration"
                                                value={`${exam.duration}m`}
                                            />
                                            <ConfigItem
                                                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                                                label="Strict mode"
                                                value={exam.strict_mode ? "On" : "Off"}
                                            />
                                            <ConfigItem
                                                icon={<Monitor className="h-3.5 w-3.5" />}
                                                label="Tab limit"
                                                value={String(exam.max_tab_switch)}
                                            />
                                            <ConfigItem
                                                icon={<Lock className="h-3.5 w-3.5" />}
                                                label="Violation cap"
                                                value={String(exam.max_violation_limit)}
                                            />
                                        </div>

                                        {/* Schedule */}
                                        <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-2">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                Schedule
                                            </p>
                                            <Row
                                                label="Start"
                                                value={fmt(exam.scheduled_start) || "Manual"}
                                            />
                                            <Row
                                                label="End"
                                                value={fmt(exam.scheduled_end) || "Manual"}
                                            />
                                        </div>

                                        {/* Instructions */}
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                                Instructions
                                            </p>
                                            {exam.instructions.length === 0 ? (
                                                <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                                                    None added
                                                </p>
                                            ) : (
                                                <ul className="space-y-1">
                                                    {exam.instructions.map((i) => (
                                                        <li
                                                            key={i.id}
                                                            className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed flex gap-1.5"
                                                        >
                                                            <span className="text-violet-500 shrink-0">
                                                                •
                                                            </span>
                                                            {i.content}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}

// ---------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------

function Header({
    onBack,
    title,
    subtitle,
}: {
    onBack: () => void;
    title: string;
    subtitle: string;
}) {
    return (
        <header className="shrink-0 bg-transparent backdrop-blur-xl border-b border-slate-200/70 dark:border-white/[0.06] z-30">
            <div className="flex items-center gap-2 px-2 h-14 max-w-3xl mx-auto">
                <button
                    onClick={onBack}
                    className="h-10 w-10 rounded-full flex items-center justify-center active:bg-slate-100 dark:active:bg-white/5 text-slate-900 dark:text-white"
                    style={{ touchAction: "manipulation" }}
                    aria-label="Back"
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {title}
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {subtitle}
                    </p>
                </div>
            </div>
        </header>
    );
}

function StatusChip({
    label,
    tone,
}: {
    label: string;
    tone: "slate" | "emerald" | "amber";
}) {
    const cls =
        tone === "emerald"
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : tone === "amber"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-slate-500/10 text-slate-600 dark:text-slate-300";
    return (
        <span
            className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${cls}`}
        >
            {label}
        </span>
    );
}

function Stat({
    n,
    label,
    tone = "slate",
}: {
    n: number;
    label: string;
    tone?: "slate" | "violet" | "emerald";
}) {
    const cls =
        tone === "violet"
            ? "text-violet-600 dark:text-violet-400"
            : tone === "emerald"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-900 dark:text-white";
    return (
        <div className="text-center">
            <div className={`text-sm font-bold tabular-nums ${cls}`}>{n}</div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                {label}
            </div>
        </div>
    );
}

function ActionBtn({
    icon,
    label,
    tone,
    onClick,
    loading,
}: {
    icon: React.ReactNode;
    label: string;
    tone: "violet" | "emerald" | "rose" | "slate";
    onClick: () => void;
    loading?: boolean;
}) {
    const cls =
        tone === "violet"
            ? "bg-violet-600 text-white"
            : tone === "emerald"
                ? "bg-emerald-600 text-white"
                : tone === "rose"
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200";
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`flex-1 min-w-[88px] h-9 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 active:scale-[0.97] disabled:opacity-50 ${cls}`}
            style={{ touchAction: "manipulation" }}
        >
            {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
                icon
            )}
            {label}
        </button>
    );
}

function ConfigItem({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-slate-400 shrink-0">{icon}</span>
            <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none">
                    {label}
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight mt-0.5 truncate">
                    {value}
                </div>
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {label}
            </span>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                {value}
            </span>
        </div>
    );
}

function fmt(iso: string | null): string | null {
    if (!iso) return null;
    try {
        return new Date(iso).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return iso;
    }
}