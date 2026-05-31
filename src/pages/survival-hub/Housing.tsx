import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { cachedSurvivalService } from '../../lib/services/survivalService';
import { useCachedQuery } from '../../hooks/useCachedQuery';
import { HousingCard } from '../../components/survival-hub/HousingCard';
import { ChevronLeft, Filter, Plus, Building2, Search, Loader2 } from 'lucide-react';
import SmartSelect from '@/components/ui/SmartSelect'; // Adjust path if needed

const HousingPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const centerId = searchParams.get('centerId') || '';
    const hospitalId = searchParams.get('hospitalId') || '';
    const placementId = searchParams.get('placementId') || '';

    const [searchTerm, setSearchTerm] = useState(''); // Search state
    const [triggerRefresh, setTriggerRefresh] = useState(0);

    // Use cached query for housing data
    const { data: housing = [], loading: housingLoading } = useCachedQuery(
        `housing-${centerId}-${hospitalId}-${placementId}`,
        () => cachedSurvivalService.getHousing({
            centerId: centerId || undefined,
            hospitalId: hospitalId || undefined,
            placementId: placementId || undefined
        }),
        [centerId, hospitalId, placementId, triggerRefresh],
        { ttl: 2 * 60 * 1000 } // 2 minute cache for user data
    );

    // Use cached query for exam centers
    const { data: centers = [], loading: centersLoading } = useCachedQuery(
        "exam-centers-housing",
        () => cachedSurvivalService.getExamCenters(),
        [triggerRefresh],
        { ttl: 5 * 60 * 1000 } // 5 minute cache for static data
    );

    const loading = housingLoading || centersLoading;

    // Find the name of the currently selected center for the UI
    const selectedCenter = (centers || []).find(c => c.id === centerId);

    // PRESERVED LOGIC: Filter housing based on search term
    const displayHousing = (housing || []).filter(item =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const centerOptions = [
        { id: '', name: 'All Kenya Centers', subtext: 'View all available housing' },
        ...(centers || []).map(c => ({
            id: c.id,
            name: c.name,
            subtext: c.county // This makes it look like a pro app (e.g. "Nairobi Center (Nairobi County)")
        }))
    ];

    const handleDeleteHousing = async (id: string) => {
        try {
            await cachedSurvivalService.deleteHousing(id);
            setTriggerRefresh(prev => prev + 1);
        } catch (error) {
            console.error("Error deleting housing:", error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20 dark:bg-background">
            {/* 1. Header Area - PRESERVED */}
            <div className="rounded-2xl sticky -top-4 z-20 bg-white/90 p-4 backdrop-blur-md dark:bg-slate-900/90 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/survival-hub')}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">Student Housing</h1>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase mt-1 tracking-widest">
                                {loading ? 'Loading...' : `${displayHousing.length} Rooms Available`}
                            </p>
                        </div>
                    </div>

                    <Link
                        to="/survival-hub/add-housing"
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-200 dark:shadow-none transition-transform active:scale-95"
                    >
                        <Plus size={16} />
                        <span className="hidden sm:inline">Add Listing</span>
                    </Link>
                </div>

                {/* 2. Filter Bar - PRESERVED + SEARCH ADDED */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        <div className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            <Filter size={14} />
                            <span>Filter by Center</span>
                        </div>
                        {/* THE UPGRADED FILTER SELECT */}
                        <div className="flex-1 min-w-[200px]">
                            <SmartSelect
                                label=""
                                categoryName="Center"
                                placeholder="All Kenya Centers"
                                options={centerOptions}
                                value={centerId}
                                onChange={(id) => setSearchParams({ centerId: id })}
                            />
                        </div>
                    </div>

                    {/* 🔍 THE SEARCH BAR TOOL */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by place name,owner,hospital,school..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border-0 bg-slate-50 dark:bg-slate-800 p-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {/* 3. Context Indicator - PRESERVED */}
            {selectedCenter && (
                <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        Showing results for <span className="font-bold">{selectedCenter.name}</span>
                    </p>
                    <button
                        onClick={() => setSearchParams({})}
                        className="text-[10px] font-bold text-blue-600 underline"
                    >
                        Clear Filter
                    </button>
                </div>
            )}

            {/* 4. Results Grid - PRESERVED & FIXED FILTER */}
            <div className="p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <p className="mt-4 text-sm font-medium text-slate-400 uppercase tracking-widest">Searching Hostels...</p>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2">
                            {displayHousing.map(item => (
                                <HousingCard
                                    key={item.id}
                                    house={item}
                                    onDelete={handleDeleteHousing}
                                />
                            ))}
                        </div>

                        {/* EMPTY STATE - PRESERVED & IMPROVED */}
                        {displayHousing.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                    <Search className="text-slate-300" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {searchTerm ? "No matches found" : "No Housing Found"}
                                </h3>
                                <p className="text-slate-500 text-sm max-w-xs mt-1">
                                    {searchTerm
                                        ? `We couldn't find anything matching "${searchTerm}"`
                                        : "No student has added housing for this center yet. Be the hero and add the first one!"}
                                </p>
                                {(housing || []).length === 0 && (
                                    <Link
                                        to="/survival-hub/add-housing"
                                        className="mt-6 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white dark:bg-white dark:text-black transition-transform active:scale-95"
                                    >
                                        Add First Listing
                                    </Link>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default HousingPage;