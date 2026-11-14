// src/staff-cpd/pages/CpdDashboard.tsx
import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Award, BookOpen, Clock, CheckCircle2, TrendingUp, GraduationCap, ArrowRight,
} from "lucide-react";
import { useDashboardStats } from "../hooks";
import {
    CpdStatTile, CpdCompletionRow, CpdEmptyState,
} from "../components";
import { fmtDate, fmtHours, fmtPoints } from "../lib";
import { ContributorEarningsCard } from "../components/ContributorEarningsCard";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import { FullScreen, PageHeader, ScrollBody, tap } from "./shared";

export function CpdDashboard() {
    const { data, isLoading } = useDashboardStats();
    const nav = useNavigate();
    const home = useHomeRoute();

    const handleBack = useCallback(() => {
        tap();
        nav(home);
    }, [nav, home]);

    return (
        <FullScreen>
            <PageHeader
                title="My CPD"
                subtitle={
                    data?.current_period
                        ? `${data.current_period.name} · ends ${fmtDate(data.current_period.end_date)}`
                        : "Continuing Professional Development"
                }
                onBack={handleBack}
                rightSlot={
                    <Link
                        to="/cpd/catalog"
                        onClick={() => tap()}
                        className="h-10 px-3 rounded-xl shrink-0
                                   bg-blue-600 text-white text-[11px] font-bold
                                   flex items-center gap-1.5
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        <BookOpen className="h-3.5 w-3.5" />
                        Catalog
                    </Link>
                }
            />

            <ScrollBody>
                {/* ← no px-* here; ScrollBody handles the gutter */}
                <div className="pt-3 space-y-3">

                    <section className="grid grid-cols-2 gap-2">
                        <CpdStatTile label="CPD Points" value={isLoading ? "…" : fmtPoints(data?.total_points)} icon={Award} tone="amber" />
                        <CpdStatTile label="Learning Hours" value={isLoading ? "…" : fmtHours(data?.total_hours)} icon={Clock} tone="blue" />
                        <CpdStatTile label="Completed" value={isLoading ? "…" : data?.completed_count ?? 0} icon={CheckCircle2} tone="green" />
                        <CpdStatTile label="In Progress" value={isLoading ? "…" : data?.in_progress_count ?? 0} icon={TrendingUp} tone="violet" />
                        <CpdStatTile label="Certificates" value={isLoading ? "…" : data?.certificates_count ?? 0} icon={GraduationCap} tone="rose" />
                    </section>

                    <ContributorEarningsCard />

                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-[10px] font-bold uppercase tracking-wider
                                           text-slate-500 dark:text-slate-400">
                                Recent Completions
                            </h2>
                            <Link
                                to="/cpd/progress"
                                onClick={() => tap()}
                                className="inline-flex items-center gap-1 text-[11px] font-bold
                                           text-blue-600 dark:text-blue-400
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                View all <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>
                        {data?.recent_completions?.length ? (
                            <div className="space-y-2">
                                {data.recent_completions.map((c) => (
                                    <CpdCompletionRow key={c.id} completion={c} />
                                ))}
                            </div>
                        ) : (
                            <CpdEmptyState
                                title="No completions yet"
                                hint="Enroll in a CPD activity from the catalog to get started."
                            />
                        )}
                    </section>
                </div>
            </ScrollBody>
        </FullScreen>
    );
}