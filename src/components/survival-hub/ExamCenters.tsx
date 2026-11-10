import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { survivalApi } from "../../lib/survivalApi";
import { ExamCenterCard } from "../../components/survival-hub/ExamCenterCard";
import { Search, ChevronLeft, MapPin } from "lucide-react";
import { playSound } from "@/lib/soundManager";

const tap = () => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
    }
};

const ExamCenters = () => {
    const navigate = useNavigate();
    const [centers, setCenters] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        survivalApi
            .getExamCenters()
            .then((data) => {
                setCenters(data || []);
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const handleBack = () => {
        tap();
        navigate("/survival-hub", { replace: true });
    };

    const filteredCenters = centers.filter(
        (c) =>
            c.name?.toLowerCase().includes(search.toLowerCase()) ||
            c.county?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
            {/* ── Header ──────────────────────────────────────── */}
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={handleBack}
                    aria-label="Back to survival hub"
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
                        NCK exam centers
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate tabular-nums">
                        {loading
                            ? "Loading…"
                            : `${filteredCenters.length} venue${filteredCenters.length === 1 ? "" : "s"}`}
                    </p>
                </div>
            </header>

            {/* ── Body ────────────────────────────────────────── */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <div className="w-full max-w-3xl mx-auto px-4 py-4 pb-24 space-y-3 safe-bottom">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2
                                          h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search center or county…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-11 rounded-xl border-0 outline-none
                                       bg-white dark:bg-[#161b22]
                                       pl-10 pr-3.5 text-sm
                                       text-slate-900 dark:text-white
                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                       focus:ring-2 focus:ring-blue-500/40"
                            style={{ touchAction: "manipulation" }}
                        />
                    </div>

                    {/* Results */}
                    {loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2.5 animate-pulse"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex gap-1.5">
                                                <div className="h-4 w-16 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                                                <div className="h-4 w-12 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                                            </div>
                                            <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-white/[0.06]" />
                                        </div>
                                        <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                                    </div>
                                    <div className="h-3 w-40 rounded bg-slate-100 dark:bg-white/[0.06]" />
                                </div>
                            ))}
                        </div>
                    ) : filteredCenters.length > 0 ? (
                        <div className="space-y-2">
                            {filteredCenters.map((center) => (
                                <ExamCenterCard key={center.id} center={center} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-8 text-center space-y-3">
                            <div className="h-14 w-14 rounded-full
                                            bg-slate-100 dark:bg-white/[0.06]
                                            flex items-center justify-center mx-auto">
                                <MapPin className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {search ? "No matches" : "No centers yet"}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[260px] mx-auto leading-snug">
                                    {search
                                        ? `Nothing matches "${search}"`
                                        : "Check back soon — centers are added regularly."}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ExamCenters;