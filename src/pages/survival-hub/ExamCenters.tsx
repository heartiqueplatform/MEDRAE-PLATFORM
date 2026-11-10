import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { cachedSurvivalService } from "../../lib/services/survivalService";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { ExamCenterCard } from "../../components/survival-hub/ExamCenterCard";
import { ExamCenterCardSkeleton } from "../../components/survival-hub/ExamCenterCardSkeleton";
import { AddCenterModal } from "../../components/survival-hub/AddCenterModal";
import { Search, ChevronLeft, MapPin, Plus } from "lucide-react";
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

const ExamCenters = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [search, setSearch] = useState("");
    const [triggerRefresh, setTriggerRefresh] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCenter, setEditingCenter] = useState<any>(null);

    const { data: centers = [], loading, refetch } = useCachedQuery(
        "exam-centers",
        () => cachedSurvivalService.getExamCenters(),
        [triggerRefresh],
        { ttl: 5 * 60 * 1000 }
    );

    const handleSaveCenter = async (formData: any) => {
        try {
            if (editingCenter) {
                await cachedSurvivalService.updateExamCenter(editingCenter.id, formData);
            } else {
                await cachedSurvivalService.addExamCenter({
                    ...formData,
                    created_by: user?.id,
                });
            }
            setIsModalOpen(false);
            setEditingCenter(null);
            setTriggerRefresh((prev) => prev + 1);
        } catch (error: any) {
            alert("Error saving center: " + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Remove this exam center?")) return;
        tap("warning");
        try {
            await cachedSurvivalService.deleteExamCenter(id);
            setTriggerRefresh((prev) => prev + 1);
        } catch {
            alert("Could not delete. It might be linked to existing data.");
        }
    };

    const handleEdit = (center: any) => {
        tap();
        setEditingCenter(center);
        setIsModalOpen(true);
    };

    const handleBack = () => {
        tap();
        navigate("/survival-hub", { replace: true });
    };

    const safeCenters = Array.isArray(centers) ? centers : [];

    const filteredCenters = safeCenters.filter(
        (c: any) =>
            c.name?.toLowerCase().includes(search.toLowerCase()) ||
            c.county?.toLowerCase().includes(search.toLowerCase()) ||
            c.town?.toLowerCase().includes(search.toLowerCase())
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
                        Exam centers
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
                            placeholder="Search by name, county or town…"
                            className="w-full h-11 rounded-xl border-0 outline-none
                                       bg-white dark:bg-[#161b22]
                                       pl-10 pr-3.5 text-sm
                                       text-slate-900 dark:text-white
                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                       focus:ring-2 focus:ring-blue-500/40"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoComplete="off"
                            style={{ touchAction: "manipulation" }}
                        />
                    </div>

                    {/* Results */}
                    {loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <ExamCenterCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : filteredCenters.length > 0 ? (
                        <div className="space-y-2">
                            {filteredCenters.map((center: any) => (
                                <ExamCenterCard
                                    key={center.id}
                                    center={center}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />
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
                                    No centers found
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[260px] mx-auto leading-snug">
                                    {search
                                        ? "Try a different search term"
                                        : "Be the first to add an exam center"}
                                </p>
                            </div>
                            {!search && (
                                <button
                                    onClick={() => {
                                        tap("success");
                                        setIsModalOpen(true);
                                    }}
                                    className="h-10 px-4 rounded-xl
                                               bg-blue-600 text-white
                                               text-[12px] font-bold
                                               inline-flex items-center gap-1.5
                                               active:scale-[0.97] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                                    Add center
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </main>
            <button
                onClick={() => {
                    tap("success");
                    setIsModalOpen(true);
                }}
                aria-label="Add exam center"
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
            </button>
            {/* ── Modal ───────────────────────────────────────── */}
            <AddCenterModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingCenter(null);
                }}
                onSubmit={handleSaveCenter}
                initialData={editingCenter}
            />
        </div>
    );
};

export default ExamCenters;