import React, { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { cachedSurvivalService } from "../../lib/services/survivalService";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { HousingCard } from "../../components/survival-hub/HousingCard";
import { HousingCardSkeleton } from "../../components/survival-hub/HousingCardSkeleton";
import { ChevronLeft, Filter, Plus, Search } from "lucide-react";
import SmartSelect from "@/components/ui/SmartSelect";
import { toast } from "sonner";
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

const HousingPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const centerId = searchParams.get("centerId") || "";
    const hospitalId = searchParams.get("hospitalId") || "";
    const placementId = searchParams.get("placementId") || "";

    const [searchTerm, setSearchTerm] = useState("");
    const [triggerRefresh, setTriggerRefresh] = useState(0);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const {
        data: housing = [],
        loading: housingLoading,
        refetch: refetchHousing,
    } = useCachedQuery(
        `housing-${centerId}-${hospitalId}-${placementId}`,
        () =>
            cachedSurvivalService.getHousing({
                centerId: centerId || undefined,
                hospitalId: hospitalId || undefined,
                placementId: placementId || undefined,
            }),
        [centerId, hospitalId, placementId, triggerRefresh],
        { ttl: 2 * 60 * 1000 }
    );

    const { data: centers = [], loading: centersLoading } = useCachedQuery(
        "exam-centers-housing",
        () => cachedSurvivalService.getExamCenters(),
        [triggerRefresh],
        { ttl: 5 * 60 * 1000 }
    );

    const loading = housingLoading || centersLoading;
    const selectedCenter = (centers || []).find((c) => c.id === centerId);

    const displayHousing = (housing || []).filter(
        (item) =>
            item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const centerOptions = [
        {
            id: "",
            name: "All Kenya Centers",
            subtext: "View all available housing",
        },
        ...(centers || []).map((c) => ({
            id: c.id,
            name: c.name,
            subtext: c.county,
        })),
    ];

    const handleDeleteHousing = async (id: string) => {
        if (!confirm("Delete this housing listing?")) return;
        tap("warning");
        setDeletingId(id);
        try {
            await cachedSurvivalService.deleteHousing(id);
            toast.success("Housing listing deleted");
            setTriggerRefresh((prev) => prev + 1);
            await refetchHousing();
        } catch (error) {
            console.error("Error deleting housing:", error);
            toast.error("Failed to delete housing listing");
        } finally {
            setDeletingId(null);
        }
    };

    const handleBack = () => {
        tap();
        navigate("/survival-hub", { replace: true });
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
                        Student housing
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate tabular-nums">
                        {loading
                            ? "Loading…"
                            : `${displayHousing.length} listing${displayHousing.length === 1 ? "" : "s"}`}
                    </p>
                </div>
            </header>

            {/* ── Body ────────────────────────────────────────── */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <div className="w-full max-w-7xl mx-auto px-4 py-4 pb-32 space-y-3 safe-bottom">
                    {/* Filter + search row */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                            <div className="h-10 px-3 rounded-xl shrink-0
                                            bg-slate-100 dark:bg-white/[0.06]
                                            flex items-center gap-1.5
                                            text-[10px] font-bold uppercase tracking-wider
                                            text-slate-500 dark:text-slate-400">
                                <Filter className="h-3 w-3" />
                                Filter
                            </div>
                            <div className="flex-1 min-w-0">
                                <SmartSelect
                                    label=""
                                    categoryName="Center"
                                    placeholder="All Kenya Centers"
                                    options={centerOptions}
                                    value={centerId}
                                    onChange={(id) => {
                                        tap();
                                        setSearchParams({ centerId: id });
                                    }}
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2
                                              h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search by name, owner, hospital…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-11 rounded-xl border-0 outline-none
                                           bg-white dark:bg-[#161b22]
                                           pl-10 pr-3.5 text-sm
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           focus:ring-2 focus:ring-blue-500/40"
                                autoComplete="off"
                                style={{ touchAction: "manipulation" }}
                            />
                        </div>
                    </div>

                    {/* Active filter chip */}
                    {selectedCenter && (
                        <div className="flex items-center justify-between gap-2
                                        rounded-xl bg-blue-50 dark:bg-blue-400/10 p-3">
                            <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-snug min-w-0">
                                Showing results for{" "}
                                <strong className="font-bold truncate">
                                    {selectedCenter.name}
                                </strong>
                            </p>
                            <button
                                onClick={() => {
                                    tap();
                                    setSearchParams({});
                                }}
                                className="shrink-0 h-7 px-2.5 rounded-lg
                                           bg-white dark:bg-white/[0.08]
                                           text-blue-700 dark:text-blue-400
                                           text-[10px] font-bold uppercase tracking-wider
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                Clear
                            </button>
                        </div>
                    )}

                    {/* Results */}
                    {loading ? (
                        <div className={GRID_CLASSES}>
                            {Array.from({ length: 8 }).map((_, i) => (
                                <HousingCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : displayHousing.length > 0 ? (
                        <div className={GRID_CLASSES}>
                            {displayHousing.map((item) => (
                                <HousingCard
                                    key={item.id}
                                    house={item}
                                    onDelete={handleDeleteHousing}
                                    isDeleting={deletingId === item.id}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-8 text-center space-y-3">
                            <div className="h-14 w-14 rounded-full
                                            bg-slate-100 dark:bg-white/[0.06]
                                            flex items-center justify-center mx-auto">
                                <Search className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {searchTerm ? "No matches" : "No housing yet"}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[260px] mx-auto leading-snug">
                                    {searchTerm
                                        ? `Nothing matches "${searchTerm}"`
                                        : "Be the first to add housing for this center."}
                                </p>
                            </div>
                            {(housing || []).length === 0 && (
                                <Link
                                    to="/survival-hub/add-housing"
                                    onClick={() => tap("success")}
                                    className="inline-flex items-center gap-1.5
                                               h-10 px-4 rounded-xl
                                               bg-blue-600 text-white
                                               text-[12px] font-bold
                                               active:scale-[0.97] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                                    Add first listing
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* ── Floating add FAB ────────────────────────────── */}
            <Link
                to="/survival-hub/add-housing"
                onClick={() => tap("success")}
                aria-label="Add housing listing"
                className="fixed bottom-24 right-5 z-40
                           h-14 w-14 rounded-full
                           bg-blue-600 text-white
                           flex items-center justify-center
                           active:scale-[0.92] transition-transform"
                style={{
                    touchAction: "manipulation",
                    boxShadow: "0 8px 24px rgba(37,99,235,0.35)",
                }}
            >
                <Plus className="h-6 w-6" strokeWidth={2.5} />
            </Link>
        </div>
    );
};

export default HousingPage;