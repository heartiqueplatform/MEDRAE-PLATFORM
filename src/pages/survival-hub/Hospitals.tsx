import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { cachedSurvivalService } from "../../lib/services/survivalService";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { HospitalCard } from "../../components/survival-hub/HospitalCard";
import { HospitalCardSkeleton } from "../../components/survival-hub/HospitalCardSkeleton";
import { AddHospitalModal } from "../../components/survival-hub/AddHospitalModal";
import { ChevronLeft, Search, Activity, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { playSound } from "@/lib/soundManager";

const tap = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        if (type === "success") navigator.vibrate([15, 30, 15]);
        else if (type === "warning") navigator.vibrate(40);
        else navigator.vibrate(12);
    }
};

const HospitalsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();

    const centerId = searchParams.get("centerId");
    const hospitalId = searchParams.get("hospitalId");
    const placementId = searchParams.get("placementId");

    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHospital, setEditingHospital] = useState<any>(null);
    const [triggerRefresh, setTriggerRefresh] = useState(0);

    const { data: hospitals = [], loading } = useCachedQuery(
        `hospitals-${centerId}-${hospitalId}-${placementId}`,
        () =>
            cachedSurvivalService.getHospitals({
                centerId: centerId || undefined,
                hospitalId: hospitalId || undefined,
                placementId: placementId || undefined,
            }),
        [centerId, hospitalId, placementId, triggerRefresh],
        { ttl: 5 * 60 * 1000 }
    );

    const handleSaveHospital = async (formData: any) => {
        try {
            if (editingHospital) {
                await cachedSurvivalService.updateHospital(editingHospital.id, formData);
            } else {
                await cachedSurvivalService.addHospital({
                    ...formData,
                    created_by: user?.id,
                });
            }
            setIsModalOpen(false);
            setEditingHospital(null);
            setTriggerRefresh((prev) => prev + 1);
        } catch (error: any) {
            console.error("Error saving hospital:", error);
            alert("Error saving: " + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this facility?")) return;
        tap("warning");
        try {
            await cachedSurvivalService.deleteHospital(id);
            setTriggerRefresh((prev) => prev + 1);
        } catch {
            alert("Could not delete facility.");
        }
    };

    const handleEdit = (hospital: any) => {
        tap();
        setEditingHospital(hospital);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingHospital(null);
    };

    const handleBack = () => {
        tap();
        navigate("/survival-hub", { replace: true });
    };

    const filteredHospitals = Array.isArray(hospitals)
        ? hospitals.filter(
            (h: any) =>
                h.hospital_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (h.hospital_type &&
                    h.hospital_type.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        : [];

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
                        Nearby hospitals
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate tabular-nums">
                        {loading
                            ? "Loading…"
                            : `${filteredHospitals.length} facilit${filteredHospitals.length === 1 ? "y" : "ies"}`}
                    </p>
                </div>
            </header>

            {/* ── Body ────────────────────────────────────────── */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <div className="w-full max-w-3xl mx-auto px-4 py-4 pb-32 space-y-3 safe-bottom">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2
                                          h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search hospital name or type…"
                            className="w-full h-11 rounded-xl border-0 outline-none
                                       bg-white dark:bg-[#161b22]
                                       pl-10 pr-3.5 text-sm
                                       text-slate-900 dark:text-white
                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                       focus:ring-2 focus:ring-rose-500/40"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ touchAction: "manipulation" }}
                        />
                    </div>

                    {/* Results */}
                    {loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <HospitalCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : filteredHospitals.length > 0 ? (
                        <div className="space-y-2">
                            {filteredHospitals.map((h: any) => (
                                <HospitalCard
                                    key={h.id}
                                    hospital={h}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-8 text-center space-y-3">
                            <div className="h-14 w-14 rounded-full
                                            bg-rose-50 dark:bg-rose-400/10
                                            flex items-center justify-center mx-auto">
                                <Activity className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {searchQuery ? "No matches" : "No hospitals yet"}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[260px] mx-auto leading-snug">
                                    {searchQuery
                                        ? `Nothing matches "${searchQuery}"`
                                        : "Be the first to add a facility here."}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Safety notice */}
                    <div className="rounded-2xl bg-rose-50 dark:bg-rose-400/10 p-3 space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider
                                      text-rose-700 dark:text-rose-400 leading-none">
                            Medical note
                        </p>
                        <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 leading-snug">
                            Carry your student ID and NCK clinical logbook when
                            visiting.
                        </p>
                    </div>
                </div>
            </main>

            {/* ── Floating add FAB ────────────────────────────── */}
            <button
                onClick={() => {
                    tap("success");
                    setIsModalOpen(true);
                }}
                aria-label="Add hospital"
                className="fixed bottom-24 right-5 z-40
                           h-14 w-14 rounded-full
                           bg-rose-600 text-white
                           flex items-center justify-center
                           active:scale-[0.92] transition-transform"
                style={{
                    touchAction: "manipulation",
                    boxShadow: "0 8px 24px rgba(225,29,72,0.35)",
                }}
            >
                <Plus className="h-6 w-6" strokeWidth={2.5} />
            </button>

            {/* ── Modal ───────────────────────────────────────── */}
            <AddHospitalModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={handleSaveHospital}
                centerId={centerId}
                initialData={editingHospital}
            />
        </div>
    );
};

export default HospitalsPage;