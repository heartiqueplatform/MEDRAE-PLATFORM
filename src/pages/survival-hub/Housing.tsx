import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { cachedSurvivalService } from '../../lib/services/survivalService';
import { useCachedQuery } from '../../hooks/useCachedQuery';
import { HousingCard } from '../../components/survival-hub/HousingCard';
import { HousingCardSkeleton } from '../../components/survival-hub/HousingCardSkeleton';
import { ChevronLeft, Filter, Plus, Building2, Search, Loader2 } from 'lucide-react';
import SmartSelect from '@/components/ui/SmartSelect';
import { toast } from 'sonner';

const HousingPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const centerId = searchParams.get('centerId') || '';
    const hospitalId = searchParams.get('hospitalId') || '';
    const placementId = searchParams.get('placementId') || '';

    const [searchTerm, setSearchTerm] = useState('');
    const [triggerRefresh, setTriggerRefresh] = useState(0);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const { data: housing = [], loading: housingLoading, refetch: refetchHousing } = useCachedQuery(
        `housing-${centerId}-${hospitalId}-${placementId}`,
        () => cachedSurvivalService.getHousing({
            centerId: centerId || undefined,
            hospitalId: hospitalId || undefined,
            placementId: placementId || undefined
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
    const selectedCenter = (centers || []).find(c => c.id === centerId);

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
            subtext: c.county
        }))
    ];

    const handleDeleteHousing = async (id: string) => {
        if (!confirm('Are you sure you want to delete this housing listing?')) return;
        setDeletingId(id);
        try {
            await cachedSurvivalService.deleteHousing(id);
            toast.success('Housing listing deleted successfully!');
            setTriggerRefresh(prev => prev + 1);
            await refetchHousing();
        } catch (error) {
            console.error("Error deleting housing:", error);
            toast.error('Failed to delete housing listing. Please try again.');
        } finally {
            setDeletingId(null);
        }
    };

    // Render skeleton cards
    const renderSkeletons = () => {
        return Array(6).fill(0).map((_, index) => (
            <HousingCardSkeleton key={`skeleton-${index}`} />
        ));
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20 dark:bg-background">
            {/* 1. Header Area */}
            <div className="sticky -top-4 z-20 bg-white/90 p-3 md:p-4 backdrop-blur-md dark:bg-muted/100">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                    <div className="flex items-center gap-2 md:gap-3">
                        {/* Back button — icon only, no chrome */}
                        <button
                            onClick={() => navigate('/survival-hub')}
                            aria-label="Go back"
                            className="inline-flex w-fit items-center justify-center p-1.5 -ml-1.5 text-slate-700 dark:text-slate-200 active:opacity-60 transition"
                        >
                            <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.5} />
                        </button>
                        <div>
                            <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-none">Student Housing</h1>
                            <p className="text-[9px] md:text-[10px] text-emerald-600 dark:text-emerald-400 font-bold  mt-0.5 md:mt-1 tracking-widest">
                                {loading ? 'Loading...' : `${displayHousing.length} Rooms Available`}
                            </p>
                        </div>
                    </div>

                    <Link
                        to="/survival-hub/add-housing"
                        className="flex items-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl bg-blue-600 hover:bg-blue-700 px-3 md:px-4 py-2 md:py-2.5 text-[10px] md:text-xs font-bold text-white transition-transform active:scale-95"
                    >
                        <Plus size={14} />
                        <span className="hidden sm:inline">Add Listing</span>
                    </Link>
                </div>

                {/* 2. Filter Bar & Search */}
                <div className="space-y-2 md:space-y-3">
                    <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto pb-1 no-scrollbar">
                        <div className="flex shrink-0 items-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl bg-slate-100 px-2.5 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            <Filter size={12} />
                            <span>Filter</span>
                        </div>
                        <div className="flex-1 min-w-[180px] md:min-w-[200px]">
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

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search by name, owner, hospital..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-lg md:rounded-xl border-0 bg-slate-50 dark:bg-slate-800 p-2 md:p-2.5 pl-9 md:pl-10 text-xs md:text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            autoComplete="off"
                        />
                    </div>
                </div>
            </div>

            {/* 3. Context Indicator */}
            {selectedCenter && (
                <div className="px-3 md:px-4 py-2.5 md:py-3 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-between">
                    <p className="text-[10px] md:text-xs text-blue-700 dark:text-blue-300">
                        Showing results for <span className="font-bold">{selectedCenter.name}</span>
                    </p>
                    <button
                        onClick={() => setSearchParams({})}
                        className="text-[9px] md:text-[10px] font-bold text-blue-600 underline"
                    >
                        Clear Filter
                    </button>
                </div>
            )}

            {/* 4. Results Grid */}
            <div className="p-0 md:p-4">
                {loading ? (
                    <div className="grid gap-3 md:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 px-3 md:px-0">
                        {renderSkeletons()}
                    </div>
                ) : (
                    <>
                        <div className="grid gap-3 mt-3 md:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 px-3 md:px-0">
                            {displayHousing.map(item => (
                                <HousingCard
                                    key={item.id}
                                    house={item}
                                    onDelete={handleDeleteHousing}
                                    isDeleting={deletingId === item.id}
                                />
                            ))}
                        </div>

                        {/* Empty State */}
                        {displayHousing.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 md:py-20 text-center mx-3 md:mx-0">
                                <div className="h-14 w-14 md:h-16 md:w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3 md:mb-4">
                                    <Search className="text-slate-300" size={28} />
                                </div>
                                <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                                    {searchTerm ? "No matches found" : "No Housing Found"}
                                </h3>
                                <p className="text-slate-500 text-xs md:text-sm max-w-xs mt-1">
                                    {searchTerm
                                        ? `We couldn't find anything matching "${searchTerm}"`
                                        : "No student has added housing for this center yet. Be the hero and add the first one!"}
                                </p>
                                {(housing || []).length === 0 && (
                                    <Link
                                        to="/survival-hub/add-housing"
                                        className="mt-5 md:mt-6 rounded-lg md:rounded-xl bg-slate-900 px-5 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-bold text-white dark:bg-white dark:text-black transition-transform active:scale-95"
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