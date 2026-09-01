import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cachedSurvivalService } from '../../lib/services/survivalService';
import { useCachedQuery } from '../../hooks/useCachedQuery';
import { ExamCenterCard } from '../../components/survival-hub/ExamCenterCard';
import { ExamCenterCardSkeleton } from '../../components/survival-hub/ExamCenterCardSkeleton';
import { AddCenterModal } from '../../components/survival-hub/AddCenterModal';
import { Search, ChevronLeft, MapPin, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';

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
                    created_by: user?.id
                });
            }
            setIsModalOpen(false);
            setEditingCenter(null);
            setTriggerRefresh(prev => prev + 1);
        } catch (error: any) {
            alert("Error saving center: " + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to remove this exam center?")) {
            try {
                await cachedSurvivalService.deleteExamCenter(id);
                setTriggerRefresh(prev => prev + 1);
            } catch (error) {
                alert("Could not delete. It might be linked to existing data.");
            }
        }
    };

    const handleEdit = (center: any) => {
        setEditingCenter(center);
        setIsModalOpen(true);
    };

    const safeCenters = Array.isArray(centers) ? centers : [];

    const filteredCenters = safeCenters.filter((c: any) =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.county?.toLowerCase().includes(search.toLowerCase()) ||
        c.town?.toLowerCase().includes(search.toLowerCase())
    );

    // Render skeleton cards
    const renderSkeletons = () => {
        return Array(6).fill(0).map((_, index) => (
            <ExamCenterCardSkeleton key={`skeleton-${index}`} />
        ));
    };

    return (
        <div className="min-h-screen bg-slate-50 p-0 md:p-8 pb-20 dark:bg-background">
            <div className="mx-auto max-w-full">

                {/* 1. Header - full width on mobile */}
                <div className="flex items-center justify-between mb-3 md:mb-4 px-4 md:px-0 pt-4 md:pt-0">
                    <div className="flex items-center gap-2 md:gap-2">
                        <button
                            onClick={() => navigate('/survival-hub')}
                            className="p-1.5 md:p-2 rounded-full bg-white dark:bg-muted/30 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 active:scale-95 transition-all"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-none">NCK Exam Centers</h1>
                            <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1 uppercase tracking-widest font-medium">
                                {loading ? 'Loading...' : `${filteredCenters.length} Examination Venues`}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none active:scale-90 transition-transform"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {/* 2. Search Bar & Counter - full width on mobile */}
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-2 mb-2 md:mb-3 px-3 md:px-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, county or town..."
                            className="w-full rounded-xl md:rounded-2xl border border-slate-200 bg-white py-3 md:py-4 pl-10 md:pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm dark:border-slate-800 dark:bg-muted/30 dark:text-white transition-all text-sm md:text-base"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoComplete="off"
                        />
                    </div>
                    {!loading && (
                        <div className="px-3 md:px-4 py-1.5 md:py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg md:rounded-xl border border-blue-100 dark:border-blue-800/50 w-fit">
                            <span className="text-xs md:text-sm font-bold text-blue-600 dark:text-blue-400">
                                {filteredCenters.length} Centers
                            </span>
                        </div>
                    )}
                </div>

                {/* 3. Results Area - full width on mobile */}
                {loading ? (
                    <div className="grid gap-0 md:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 px-3 md:px-0">
                        {renderSkeletons()}
                    </div>
                ) : filteredCenters.length > 0 ? (
                    <div className="grid gap-0 md:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 px-3 md:px-0">
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
                    <div className="text-center py-16 md:py-20 bg-white dark:bg-muted/30 md:rounded-3xl md:border md:border-dashed md:border-slate-200 md:dark:border-slate-800 mx-3 md:mx-0 rounded-xl">
                        <div className="inline-flex p-3 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-full mb-3 md:mb-4">
                            <MapPin size={28} className="text-slate-300" />
                        </div>
                        <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">No Centers Found</h3>
                        <p className="text-slate-500 max-w-xs mx-auto mt-1 text-xs md:text-sm">
                            Try searching for a county or be the first to add a center here.
                        </p>
                    </div>
                )}
            </div>

            {/* 4. The Modal */}
            <AddCenterModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingCenter(null); }}
                onSubmit={handleSaveCenter}
                initialData={editingCenter}
            />
        </div>
    );
};

export default ExamCenters;