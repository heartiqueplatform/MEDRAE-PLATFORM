import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { cachedSurvivalService } from '../../lib/services/survivalService';
import { useCachedQuery } from '../../hooks/useCachedQuery';
import { HospitalCard } from '../../components/survival-hub/HospitalCard';
import { HospitalCardSkeleton } from '../../components/survival-hub/HospitalCardSkeleton';
import { AddHospitalModal } from '../../components/survival-hub/AddHospitalModal';
import { ChevronLeft, Search, Loader2, Activity, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';

const HospitalsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();

    const centerId = searchParams.get('centerId');
    const hospitalId = searchParams.get('hospitalId');
    const placementId = searchParams.get('placementId');

    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHospital, setEditingHospital] = useState<any>(null);
    const [triggerRefresh, setTriggerRefresh] = useState(0);

    const { data: hospitals = [], loading } = useCachedQuery(
        `hospitals-${centerId}-${hospitalId}-${placementId}`,
        () => cachedSurvivalService.getHospitals({
            centerId: centerId || undefined,
            hospitalId: hospitalId || undefined,
            placementId: placementId || undefined
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
                    created_by: user?.id
                });
            }

            setIsModalOpen(false);
            setEditingHospital(null);
            setTriggerRefresh(prev => prev + 1);
        } catch (error: any) {
            console.error("Error saving hospital:", error);
            alert("Error saving: " + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this facility?")) {
            try {
                await cachedSurvivalService.deleteHospital(id);
                setTriggerRefresh(prev => prev + 1);
            } catch (error) {
                alert("Could not delete facility.");
            }
        }
    };

    const handleEdit = (hospital: any) => {
        setEditingHospital(hospital);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingHospital(null);
    };

    const filteredHospitals = Array.isArray(hospitals)
        ? hospitals.filter((h: any) =>
            h.hospital_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (h.hospital_type &&
                h.hospital_type.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        : [];

    const renderSkeletons = () => {
        return Array(6).fill(0).map((_, index) => (
            <HospitalCardSkeleton key={`skeleton-${index}`} />
        ));
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background">
            {/* Header */}
            <div className="sticky -top-4 z-20 bg-white dark:bg-muted/100">
                <div className="flex items-center justify-between gap-3 px-3 py-3 md:px-6 md:py-4">
                    <div className="flex items-center gap-3 md:gap-4">
                        {/* Back button — icon only */}
                        <button
                            onClick={() => navigate('/survival-hub')}
                            aria-label="Go back"
                            className="inline-flex w-fit items-center justify-center p-1.5 -ml-1.5 text-slate-700 dark:text-slate-200 active:opacity-60 transition"
                        >
                            <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.5} />
                        </button>
                        <div>
                            <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-none">Nearby Hospitals</h1>
                            <p className="text-[10px] font-bold text-rose-600  mt-0.5 md:mt-1 tracking-widest">
                                {loading ? 'Loading...' : `${filteredHospitals.length} Facilities Available`}
                            </p>
                        </div>
                    </div>

                    {/* Add button — flat, no shadow */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        aria-label="Add hospital"
                        className="p-2 md:p-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white active:scale-90 transition-all"
                    >
                        <Plus size={18} className="md:w-5 md:h-5" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="px-3 pb-3 md:px-6 md:pb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search hospital name or type..."
                            className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 dark:bg-muted/30 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-rose-500 dark:border-slate-800 dark:text-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Hospital Cards */}
            <div className="px-3 md:px-4 lg:px-6 py-3 md:py-4">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
                        {renderSkeletons()}
                    </div>
                ) : filteredHospitals.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
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
                    <div className="flex flex-col items-center justify-center py-20 text-center px-4 md:px-0">
                        <Activity className="text-rose-300 mb-4" size={40} />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Hospitals Found</h3>
                        <p className="text-slate-500 text-sm mt-1">Be the first to add a facility here!</p>
                    </div>
                )}
            </div>

            {/* Safety Notice */}
            <div className="mx-3 md:mx-4 lg:mx-6 mt-4 md:mt-6 py-3 md:py-4 px-3 md:px-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl">
                <p className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-widest mb-0.5 md:mb-1">Medical Note</p>
                <p className="text-xs text-rose-600/80 dark:text-rose-400/70 leading-relaxed">
                    Carry your student ID and NCK clinical logbook when visiting.
                </p>
            </div>

            {/* The Modal */}
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