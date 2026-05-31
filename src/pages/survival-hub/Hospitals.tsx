import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { cachedSurvivalService } from '../../lib/services/survivalService';
import { useCachedQuery } from '../../hooks/useCachedQuery';
import { HospitalCard } from '../../components/survival-hub/HospitalCard';
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

    // Use cached query for hospitals
    const { data: hospitals = [], loading } = useCachedQuery(
        `hospitals-${centerId}-${hospitalId}-${placementId}`,
        () => cachedSurvivalService.getHospitals({
            centerId: centerId || undefined,
            hospitalId: hospitalId || undefined,
            placementId: placementId || undefined
        }),
        [centerId, hospitalId, placementId, triggerRefresh],
        { ttl: 5 * 60 * 1000 } // 5 minute cache for static data
    );

    // Combined Save Function (Handles both Add and Update)
    const handleSaveHospital = async (formData: any) => {
        try {
            if (editingHospital) {
                // Update existing
                await cachedSurvivalService.updateHospital(editingHospital.id, formData);
            } else {
                // Add new (include the uploader's ID)
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

    // Handle Delete
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

    // Handle Edit Click
    const handleEdit = (hospital: any) => {
        setEditingHospital(hospital);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingHospital(null);
    };

    // Filter Logic
    const filteredHospitals = Array.isArray(hospitals)
        ? hospitals.filter((h: any) =>
            h.hospital_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (h.hospital_type &&
                h.hospital_type.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        : [];

    return (
        <div className="min-h-screen bg-slate-50 pb-20 dark:bg-background">
            {/* Header */}
            <div className=" rounded-2xl sticky -top-4 z-20 bg-white/90 p-4 backdrop-blur-md dark:bg-slate-900/90 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/survival-hub')}
                            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-95"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">Nearby Hospitals</h1>
                            <p className="text-[10px] font-bold text-rose-600 uppercase mt-1 tracking-widest">
                                Emergency & Clinical Support
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="p-2.5 rounded-xl bg-rose-600 text-white shadow-lg active:scale-90 transition-transform"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search hospital name or type..."
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-rose-500 dark:border-slate-800 dark:bg-muted/30 dark:text-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Hospital Cards List */}
            <div className="p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-rose-600 mb-4" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Locating facilities...</p>
                    </div>
                ) : filteredHospitals.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
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
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Activity className="text-rose-300 mb-4" size={40} />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Hospitals Found</h3>
                        <p className="text-slate-500 text-sm mt-1">Be the first to add a facility here!</p>
                    </div>
                )}
            </div>

            {/* Safety Notice */}
            <div className="mx-4 mt-4 rounded-2xl bg-rose-50 p-4 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30">
                <p className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-widest mb-1">Medical Note</p>
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