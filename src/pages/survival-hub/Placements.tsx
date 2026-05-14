import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 Helps us move between pages
import { survivalApi } from '../../lib/survivalApi';
import { PlacementCard } from '../../components/survival-hub/PlacementCard';
import { Search, Briefcase, ChevronLeft, Loader2, Info, Plus } from 'lucide-react';

const PlacementsPage = () => {
    const navigate = useNavigate(); // This is our "steering wheel" for the app
    const [sites, setSites] = useState([]); // This stores the list from the database
    const [query, setQuery] = useState(""); // This stores what the user types in search
    const [loading, setLoading] = useState(true); // This tells us if the data is still traveling from Supabase
    const [placements, setPlacements] = useState([]);


    useEffect(() => {
        // This runs only ONCE when the page opens
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
    // 2. Add this simple function:
    const handleSilentDelete = (deletedId) => {
        setSites(prev => prev.filter(item => item.id !== deletedId));
    };
    // This logic filters the list as you type
    const filtered = sites.filter(s =>
        s.hospital_name.toLowerCase().includes(query.toLowerCase()) ||
        s.ward_specialties?.toLowerCase().includes(query.toLowerCase()) ||
        s.county?.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-20 dark:bg-background">

            {/* 1. Header Section */}
            <div className=" rounded-2xl sticky -top-4 z-20 bg-white/90 p-4 backdrop-blur-md dark:bg-slate-900/90 border-0">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={() => navigate('/survival-hub')}
                        className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">Clinical Placements</h1>
                        <p className="text-[10px] font-bold text-amber-600 uppercase mt-1 tracking-widest">
                            Official NCK Rotation Sites
                        </p>
                    </div>
                </div>

                {/* 2. Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search hospital, county or specialty..."
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white transition-all"
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* 3. Results Counter */}
            {!loading && (
                <div className="px-4 py-2 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {filtered.length} sites found
                    </span>
                </div>
            )}

            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/survival-hub')} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold dark:text-white">Clinical Placements</h1>
                        <p className="text-[10px] font-bold text-amber-600 uppercase mt-1">Rotation Directory</p>
                    </div>
                </div>

                {/* 🎯 THE NEW ADD BUTTON */}
                <button
                    onClick={() => navigate('/survival-hub/add-placement')}
                    className="flex items-center gap-1 bg-amber-600 text-white px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95"
                >
                    <Plus size={14} /> Add Site
                </button>
            </div>
            {/* 4. Main List Area */}
            <div className="p-4 space-y-2">
                {loading ? (
                    // What to show while waiting
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-amber-600 mb-4" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fetching placement data...</p>
                    </div>
                ) : filtered.length > 0 ? (
                    // Show the cards if we have them
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-2">
                        {filtered.map(site => (
                            <PlacementCard
                                key={site.id}
                                site={site}
                                onDelete={handleSilentDelete}
                            />
                        ))}
                    </div>
                ) : (
                    // What to show if search finds NOTHING
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                        <Briefcase size={40} className="mx-auto text-slate-200 mb-2" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No sites found</h3>
                        <p className="text-sm text-slate-500">Try searching for a county like "Kiambu".</p>
                    </div>
                )}
            </div>

            {/* 5. Helpful Insight Tip */}
            {!loading && (
                <div className="mx-4 mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 flex gap-3">
                    <Info size={20} className="text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/70 leading-relaxed">
                        <span className="font-bold">Clinical Tip:</span> Make sure to confirm the intake capacity with the hospital supervisor before traveling for a self-placement.
                    </p>
                </div>
            )}
        </div>
    );
};

export default PlacementsPage;