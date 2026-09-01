import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { survivalApi } from '../../lib/survivalApi';
import { PlacementCard } from '../../components/survival-hub/PlacementCard';
import { PlacementCardSkeleton } from '../../components/survival-hub/PlacementCardSkeleton';
import { Search, Briefcase, ChevronLeft, Loader2, Info, Plus } from 'lucide-react';

const PlacementsPage = () => {
    const navigate = useNavigate();
    const [sites, setSites] = useState([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [placements, setPlacements] = useState([]);

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

    const handleSilentDelete = (deletedId) => {
        setSites(prev => prev.filter(item => item.id !== deletedId));
    };

    const filtered = sites.filter(s =>
        s.hospital_name.toLowerCase().includes(query.toLowerCase()) ||
        s.ward_specialties?.toLowerCase().includes(query.toLowerCase()) ||
        s.county?.toLowerCase().includes(query.toLowerCase())
    );

    // Render skeleton cards
    const renderSkeletons = () => {
        return Array(6).fill(0).map((_, index) => (
            <PlacementCardSkeleton key={`skeleton-${index}`} />
        ));
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background">

            {/* 1. Header - Mobile Native Style */}
            <div className="sticky -top-4 z-20 bg-white dark:bg-muted/100 border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-center justify-between gap-3 px-3 py-3 md:px-6 md:py-4">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button
                            onClick={() => navigate('/survival-hub')}
                            className="p-1.5 md:p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
                        >
                            <ChevronLeft size={20} className="md:w-5 md:h-5" />
                        </button>
                        <div>
                            <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-none">Clinical Placements</h1>
                            <p className="text-[10px] font-bold text-amber-600 uppercase mt-0.5 md:mt-1 tracking-widest">
                                {loading ? 'Loading...' : `${filtered.length} Official NCK Rotation Sites`}
                            </p>
                        </div>
                    </div>

                    {/* 🎯 Add Button - Mobile Native */}
                    <button
                        onClick={() => navigate('/survival-hub/add-placement')}
                        className="flex items-center gap-1 md:gap-2 bg-amber-600 text-white px-2.5 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-transform"
                    >
                        <Plus size={14} className="md:w-4 md:h-4" />
                        <span className="hidden md:inline">Add Site</span>
                        <span className="md:hidden">Add</span>
                    </button>
                </div>

                {/* 2. Search Bar - Full Width Mobile */}
                <div className="px-3 pb-3 md:px-6 md:pb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search hospital, county or specialty..."
                            className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 dark:bg-muted/30 py-2.5 md:py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-800 dark:text-white transition-all"
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* 3. Results Counter - Clean Mobile Style */}
            {!loading && (
                <div className="px-3 md:px-6 py-2 flex justify-between items-center border-b border-slate-100/50 dark:border-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {filtered.length} sites found
                    </span>
                </div>
            )}

            {/* 4. Main List Area - Mobile Feed Style */}
            <div className="px-0 md:px-4 lg:px-6 py-0 md:py-4 space-y-0 md:space-y-3">
                {loading ? (
                    <div className="grid gap-0 md:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {renderSkeletons()}
                    </div>
                ) : filtered.length > 0 ? (
                    <div className="grid gap-0 md:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {filtered.map((site, index) => (
                            <div key={site.id}>
                                <PlacementCard
                                    site={site}
                                    onDelete={handleSilentDelete}
                                />
                                {/* Mobile Feed Separator */}
                                {index < filtered.length - 1 && (
                                    <div className="block md:hidden h-px bg-slate-200/50 dark:bg-slate-800/50 mx-3" />
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 md:py-20 bg-white dark:bg-muted/30 rounded-2xl md:rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 mx-3 md:mx-0">
                        <Briefcase size={36} className="md:w-10 md:h-10 mx-auto text-slate-200 mb-2" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No sites found</h3>
                        <p className="text-sm text-slate-500">Try searching for a county like "Kiambu".</p>
                    </div>
                )}
            </div>

            {/* 5. Helpful Insight Tip - Mobile Native Style */}
            {!loading && (
                <div className="mx-3 md:mx-4 lg:mx-6 mt-4 md:mt-6 py-3 md:py-4 px-3 md:px-4 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100/50 dark:border-amber-900/30 md:rounded-2xl flex gap-3">
                    <Info size={18} className="md:w-5 md:h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/70 leading-relaxed">
                        <span className="font-bold">Clinical Tip:</span> Make sure to confirm the intake capacity with the hospital supervisor before traveling for a self-placement.
                    </p>
                </div>
            )}
        </div>
    );
};

export default PlacementsPage;