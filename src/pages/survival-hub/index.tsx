import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    MapPin,
    Home,
    Hospital,
    Briefcase,
    Star,
    ChevronLeft,
    Sparkles,
} from "lucide-react";
import { HubCard } from "../../components/survival-hub/HubCard";
import { survivalApi } from "../../lib/survivalApi";
import { playSound } from "@/lib/soundManager";

const tap = () => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
    }
};

const SurvivalHubDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        centersCount: 0,
        housingCount: 0,
        hospitalsCount: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            try {
                setLoading(true);
                const data = await survivalApi.getDashboardStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to load stats:", error);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, []);

    const handleBack = () => {
        tap();
        navigate("/dashboard", { replace: true });
    };

    return (
        <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-[#0d1117]">
            {/* ── Header ──────────────────────────────────────── */}
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={handleBack}
                    aria-label="Back to dashboard"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate
                                   text-slate-900 dark:text-white">
                        Survival Hub
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        Exams, housing, placements
                    </p>
                </div>
            </header>

            {/* ── Body ────────────────────────────────────────── */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <div className="w-full max-w-3xl mx-auto px-4 py-4 pb-6 space-y-3 safe-bottom">
                    {/* Hero intro */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-8 w-8 rounded-lg
                                            bg-blue-50 dark:bg-blue-400/10
                                            flex items-center justify-center shrink-0">
                                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-wider
                                          text-blue-600 dark:text-blue-400">
                                Your companion
                            </p>
                        </div>
                        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white leading-snug">
                            Student Survival Hub 🇰🇪
                        </h2>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            Helping nursing students navigate exams and clinical
                            placements with ease.
                        </p>
                    </section>

                    {/* Navigation cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <HubCard
                            title="Exam Centers"
                            description="Official venues, maps, and important center notes."
                            icon={MapPin}
                            href="/survival-hub/exam-centers"
                            color="bg-blue-600"
                            count={loading ? undefined : stats.centersCount}
                            loading={loading}
                        />
                        <HubCard
                            title="Student Housing"
                            description="Verified and affordable rooms near exam venues."
                            icon={Home}
                            href="/survival-hub/housing"
                            color="bg-emerald-600"
                            count={loading ? undefined : stats.housingCount}
                            loading={loading}
                        />
                        <HubCard
                            title="Nearby Hospitals"
                            description="Emergency contacts and student-friendly facilities."
                            icon={Hospital}
                            href="/survival-hub/hospitals"
                            color="bg-rose-600"
                            count={loading ? undefined : stats.hospitalsCount}
                            loading={loading}
                        />
                        <HubCard
                            title="Placements"
                            description="Insights on clinical placement sites across Kenya."
                            icon={Briefcase}
                            href="/survival-hub/placements"
                            color="bg-amber-600"
                            loading={loading}
                        />
                    </div>

                    {/* Pro tip */}
                    {loading ? (
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 animate-pulse">
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-40 rounded bg-slate-100 dark:bg-white/[0.06]" />
                                    <div className="h-3 w-full rounded bg-slate-100 dark:bg-white/[0.06]" />
                                    <div className="h-3 w-5/6 rounded bg-slate-100 dark:bg-white/[0.06]" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-xl
                                                bg-amber-50 dark:bg-amber-400/10
                                                flex items-center justify-center shrink-0">
                                    <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider
                                                  text-amber-700 dark:text-amber-400 leading-none mb-1">
                                        Pro tip
                                    </p>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                        NCK exam day prep
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Most students prefer housing within a 1km
                                        radius of the exam center to avoid morning
                                        traffic. Check the "Distance" field before
                                        booking.
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Footer */}
                    <div className="pt-2 pb-2 text-center">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em]
                                      text-slate-400 dark:text-slate-500">
                            Crowdsourced by nursing students, for nursing students
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SurvivalHubDashboard;