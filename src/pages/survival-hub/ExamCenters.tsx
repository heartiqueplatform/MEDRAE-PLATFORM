import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cachedSurvivalService } from '../../lib/services/survivalService';
import { useCachedQuery } from '../../hooks/useCachedQuery';
import { ExamCenterCard } from '../../components/survival-hub/ExamCenterCard';
import { AddCenterModal } from '../../components/survival-hub/AddCenterModal'; // Import modal
import { Search, ChevronLeft, MapPin, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider'; // Import auth for created_by

const ExamCenters = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // State
    const [search, setSearch] = useState("");
    const [triggerRefresh, setTriggerRefresh] = useState(0);

    // Modal & Edit State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCenter, setEditingCenter] = useState<any>(null);

    // Use cached query hook - handles loading, caching, and deduplication
    const { data: centers = [], loading, refetch } = useCachedQuery(
        "exam-centers",
        () => cachedSurvivalService.getExamCenters(),
        [triggerRefresh], // Refetch when triggerRefresh changes
        { ttl: 5 * 60 * 1000 } // 5 minute cache
    );

    // Handle Add/Update
    const handleSaveCenter = async (formData: any) => {
        try {
            if (editingCenter) {
                // UPDATE existing
                await cachedSurvivalService.updateExamCenter(editingCenter.id, formData);
            } else {
                // CREATE new
                await cachedSurvivalService.addExamCenter({
                    ...formData,
                    created_by: user?.id // Attach uploader ID
                });
            }
            setIsModalOpen(false);
            setEditingCenter(null);
            // Trigger refetch by invalidating cache
            setTriggerRefresh(prev => prev + 1);
        } catch (error: any) {
            alert("Error saving center: " + error.message);
        }
    };

    // Handle Delete
    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to remove this exam center?")) {
            try {
                await cachedSurvivalService.deleteExamCenter(id);
                // Trigger refetch by invalidating cache
                setTriggerRefresh(prev => prev + 1);
            } catch (error) {
                alert("Could not delete. It might be linked to existing data.");
            }
        }
    };

    // Handle Edit Trigger
    const handleEdit = (center: any) => {
        setEditingCenter(center);
        setIsModalOpen(true);
    };

    // Filter logic: Search by Name, County, or Town
    const filteredCenters = centers.filter((c: any) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.county.toLowerCase().includes(search.toLowerCase()) ||
        (c.town && c.town.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-slate-50 p-4 pb-20 dark:bg-background md:p-8">
            <div className="mx-auto max-w-4xl">

                {/* 1. Header with Back Button and Add Button */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/survival-hub')}
                            className="p-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 active:scale-95 transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">NCK Exam Centers</h1>
                            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-medium">Examination Venues</p>
                        </div>
                    </div>

                    {/* NEW: Plus Button to Add Center */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="p-3 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none active:scale-90 transition-transform"
                    >
                        <Plus size={24} />
                    </button>
                </div>

                {/* 2. Search Bar & Counter */}
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name, county or town..."
                            className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {!loading && (
                        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                {filteredCenters.length} Centers Found
                            </span>
                        </div>
                    )}
                </div>

                {/* 3. Results Area */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
                        <p className="text-slate-500 font-medium animate-pulse">Fetching official venues...</p>
                    </div>
                ) : filteredCenters.length > 0 ? (
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-2">
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
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                        <div className="inline-flex p-4 bg-slate-50 dark:bg-slate-800 rounded-full mb-4">
                            <MapPin size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Centers Found</h3>
                        <p className="text-slate-500 max-w-xs mx-auto mt-1">
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