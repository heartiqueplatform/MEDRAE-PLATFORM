import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { survivalApi } from "../../lib/survivalApi";
import { PlacementCard } from "../../components/survival-hub/PlacementCard";
import { PlacementCardSkeleton } from "../../components/survival-hub/PlacementCardSkeleton";
import { Search, Briefcase, ChevronLeft, Info, Plus } from "lucide-react";
import { playSound } from "@/lib/soundManager";

const tap = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        if (type === "success") navigator.vibrate([15, 30, 15]);
        else if (type === "warning") navigator.vibrate(40);
        else navigator.vibrate(12);
    }
};

const GRID_CLASSES =
    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3";

const PlacementsPage = () => {
    const navigate = useNavigate();
    const [sites, setSites] = useState<any[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadPlacements() {
            try {
                setLoading(true);
                const data = await survivalApi.getPlacements();
                setSites(data);
            } catch (error) {
                console.error("Error:", error);
            } finally {
                setLoading(false);
            }
        }
        loadPlacements();
    }, []);

    const handleSilentDelete = (deletedId: string) => {
        setSites((prev) => prev.filter((item) => item.id !== deletedId));
    };

    const handleBack = () => {
        tap();
        navigate("/survival-hub", { replace: true });
    };

    const filtered = sites.filter(
        (s) =>
            s.hospital_name?.toLowerCase().includes(query.toLowerCase()) ||
            s.ward_specialties?.toLowerCase().includes(query.toLowerCase()) ||
            s.county?.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-[#0d1117]">
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
                        Clinical placements
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate tabular-nums">
                        {loading
                            ? "Loading…"
                            : `${filtered.length} rotation site${filtered.length === 1 ? "" : "s"}`}
                    </p>
                </div>
            </header>

            {/* ── Body ────────────────────────────────────────── */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <div className="w-full max-w-7xl mx-auto px-4 py-4 pb-32 space-y-3 safe-bottom">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2
                                          h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search hospital, county or specialty…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full h-11 rounded-xl border-0 outline-none
                                       bg-white dark:bg-[#161b22]
                                       pl-10 pr-3.5 text-sm
                                       text-slate-900 dark:text-white
                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                       focus:ring-2 focus:ring-amber-500/40"
                            style={{ touchAction: "manipulation" }}
                        />
                    </div>

                    {/* Results */}
                    {loading ? (
                        <div className={GRID_CLASSES}>
                            {Array.from({ length: 8 }).map((_, i) => (
                                <PlacementCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : filtered.length > 0 ? (
                        <div className={GRID_CLASSES}>
                            {filtered.map((site: any) => (
                                <PlacementCard
                                    key={site.id}
                                    site={site}
                                    onDelete={handleSilentDelete}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-8 text-center space-y-3">
                            <div className="h-14 w-14 rounded-full
                                            bg-amber-50 dark:bg-amber-400/10
                                            flex items-center justify-center mx-auto">
                                <Briefcase className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {query ? "No matches" : "No placements yet"}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[260px] mx-auto leading-snug">
                                    {query
                                        ? `Nothing matches "${query}"`
                                        : "Be the first to add a clinical placement site."}
                                </p>
                            </div>
                            {!query && (
                                <button
                                    onClick={() => {
                                        tap("success");
                                        navigate("/survival-hub/add-placement");
                                    }}
                                    className="h-10 px-4 rounded-xl
                                               bg-amber-500 text-white
                                               text-[12px] font-bold
                                               inline-flex items-center gap-1.5
                                               active:scale-[0.97] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                                    Add site
                                </button>
                            )}
                        </div>
                    )}

                    {/* Clinical tip */}
                    <div className="rounded-2xl bg-amber-50 dark:bg-amber-400/10 p-3
                                    flex items-start gap-2">
                        <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400
                                          shrink-0 mt-0.5" strokeWidth={2.25} />
                        <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 leading-snug">
                            <strong className="text-amber-800 dark:text-amber-300">
                                Clinical tip:
                            </strong>{" "}
                            Confirm intake capacity with the hospital supervisor
                            before traveling for a self-placement.
                        </p>
                    </div>
                </div>
            </main>

            {/* ── Floating add FAB ────────────────────────────── */}
            <button
                onClick={() => {
                    tap("success");
                    navigate("/survival-hub/add-placement");
                }}
                aria-label="Add placement site"
                className="fixed bottom-24 right-5 z-40
                           h-14 w-14 rounded-full
                           bg-amber-500 text-white
                           flex items-center justify-center
                           active:scale-[0.92] transition-transform"
                style={{
                    touchAction: "manipulation",
                    boxShadow: "0 8px 24px rgba(245,158,11,0.35)",
                }}
            >
                <Plus className="h-6 w-6" strokeWidth={2.5} />
            </button>
        </div>
    );
};

export default PlacementsPage;