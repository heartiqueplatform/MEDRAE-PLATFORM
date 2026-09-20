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

    const renderSkeletons = () => {
        return Array(6).fill(0).map((_, index) => (
            <PlacementCardSkeleton key={`skeleton-${index}`} />
        ));
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background">

            {/* 1. Header */}
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
                            <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-none">Clinical Placements</h1>
                            <p className="text-[10px] font-bold text-amber-600  mt-0.5 md:mt-1 tracking-widest">
                                {loading ? 'Loading...' : `${filtered.length} Official NCK Rotation Sites`}
                            </p>
                        </div>
                    </div>

                    {/* Add button — flat */}
                    <button
                        onClick={() => navigate('/survival-hub/add-placement')}
                        className="flex items-center gap-1 md:gap-2 bg-amber-600 hover:bg-amber-700 text-white px-2.5 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all"
                    >
                        <Plus size={14} className="md:w-4 md:h-4" />
                        <span className="hidden md:inline">Add Site</span>
                        <span className="md:hidden">Add</span>
                    </button>
                </div>

                {/* 2. Search Bar */}
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

            {/* 3. Results Counter */}
            {!loading && (
                <div className="px-3 md:px-6 py-2 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {filtered.length} sites found
                    </span>
                </div>
            )}

            {/* 4. Main List Area */}
            <div className="px-3 md:px-4 lg:px-6 py-3 md:py-4">
                {loading ? (
                    <div className="grid gap-3 md:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {renderSkeletons()}
                    </div>
                ) : filtered.length > 0 ? (
                    <div className="grid gap-3 md:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {filtered.map((site) => (
                            <PlacementCard
                                key={site.id}
                                site={site}
                                onDelete={handleSilentDelete}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 md:py-20 bg-white dark:bg-muted/30 rounded-2xl mx-0">
                        <Briefcase size={36} className="md:w-10 md:h-10 mx-auto text-slate-200 mb-2" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No sites found</h3>
                        <p className="text-sm text-slate-500">Try searching for a county like "Kiambu".</p>
                    </div>
                )}
            </div>

            {/* 5. Helpful Insight Tip */}
            {!loading && (
                <div className="mx-3 md:mx-4 lg:mx-6 mt-4 md:mt-6 py-3 md:py-4 px-3 md:px-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl flex gap-3">
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