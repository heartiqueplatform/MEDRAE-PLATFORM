"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, History } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { CenteredModal } from "@/components/ui/CenteredModal";

type ResultRow = {
    id: string;
    score_correct: number;
    score_total: number;
    score_pct: number;
    topics_json: Record<string, { seen: number; missed: number }>;
    coach_line: string | null;
    created_at: string;
};

type Props = {
    open: boolean;
    paperId: string | null;
    onClose: () => void;
    onOpenResult: () => void;
};

function relTime(iso: string): string {
    const then = new Date(iso).getTime();
    const diff = Date.now() - then;
    const min = Math.floor(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
}

export default function PastResultsPanel({ open, paperId, onClose }: Props) {
    const [rows, setRows] = useState<ResultRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !paperId) return;
        let live = true;
        setLoading(true);
        setErr(null);
        (async () => {
            const { data, error } = await supabase.rpc("lm_list_my_results", {
                p_paper_id: paperId,
            });
            if (!live) return;
            if (error) setErr(error.message);
            else setRows((data ?? []) as ResultRow[]);
            setLoading(false);
        })();
        return () => { live = false; };
    }, [open, paperId]);

    return (
        <CenteredModal
            open={open}
            onClose={onClose}
            title="Your attempts"
            subtitle={rows.length > 0 ? `${rows.length} finished attempt${rows.length === 1 ? "" : "s"}` : "No attempts yet"}
            maxWidthClass="max-w-md"
            maxHeight="90dvh"
        >
            <div className="px-3 pb-4 pt-1">
                {loading ? (
                    <div className="py-10 text-center">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </div>
                ) : err ? (
                    <div className="py-8 text-center">
                        <AlertCircle className="h-6 w-6 text-rose-500 mx-auto mb-2" />
                        <p className="text-xs text-rose-600 dark:text-rose-400">{err}</p>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="py-10 text-center">
                        <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
                            <History className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-semibold text-muted-foreground">
                            No finished attempts yet.
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1">
                            Finish a paper to see your breakdown here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {rows.map((r) => {
                            const topWeak = Object.entries(r.topics_json ?? {})
                                .filter(([, v]) => v.missed > 0)
                                .sort((a, b) => b[1].missed - a[1].missed)[0];

                            return (
                                <div
                                    key={r.id}
                                    className="rounded-xl bg-muted/40 px-3.5 py-3"
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <span className="text-[11px] text-muted-foreground font-semibold">
                                            {relTime(r.created_at)}
                                        </span>
                                        <span
                                            className={cn(
                                                "text-[11px] font-black tabular-nums px-2 py-0.5 rounded-md",
                                                r.score_pct >= 80 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                                    : r.score_pct >= 60 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                            )}
                                        >
                                            {r.score_pct}%
                                        </span>
                                    </div>
                                    <p className="text-sm font-black tabular-nums">
                                        {r.score_correct}<span className="text-muted-foreground/50"> / </span>{r.score_total}
                                    </p>
                                    {topWeak && (
                                        <p className="mt-1 text-[11px] text-muted-foreground truncate">
                                            Weaker in <strong className="text-foreground">{topWeak[0]}</strong>
                                            {" "}({topWeak[1].missed} missed)
                                        </p>
                                    )}
                                    {r.coach_line && (
                                        <p className="mt-1 text-[11px] text-muted-foreground/80 line-clamp-2 leading-snug">
                                            {r.coach_line}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </CenteredModal>
    );
}