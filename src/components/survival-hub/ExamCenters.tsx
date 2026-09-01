import React, { useEffect, useState } from 'react';
import { survivalApi } from '../../lib/survivalApi';
import { ExamCenterCard } from '../../components/survival-hub/ExamCenterCard';
import { Search } from 'lucide-react';

const ExamCenters = () => {
    const [centers, setCenters] = useState([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        survivalApi.getExamCenters().then(setCenters);
    }, []);

    const filteredCenters = centers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.county.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black pb-20">
            <div className="mx-auto max-w-4xl">
                {/* Header - Mobile Native Style */}
                <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-slate-200/50 dark:border-slate-800/50">
                    <div className="px-3 py-4 md:px-6 md:py-6">
                        <h1 className="text-xl md:text-2xl font-bold dark:text-white">NCK Exam Centers</h1>

                        {/* Search Bar - Full Width Mobile */}
                        <div className="relative mt-3 md:mt-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search center or county..."
                                className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-white py-2.5 md:py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-muted/30 dark:text-white"
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Results Counter - Mobile Native */}
                {filteredCenters.length > 0 && (
                    <div className="px-3 md:px-6 py-2 md:py-3 border-b border-slate-100/50 dark:border-slate-800/50">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {filteredCenters.length} centers found
                        </span>
                    </div>
                )}

                {/* Centers Grid - Mobile Feed Style */}
                <div className="px-0 md:px-6 py-0 md:py-4">
                    {filteredCenters.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-6">
                            {filteredCenters.map((center, index) => (
                                <div key={center.id}>
                                    <ExamCenterCard center={center} />
                                    {/* Mobile Feed Separator */}
                                    {index < filteredCenters.length - 1 && (
                                        <div className="block md:hidden h-px bg-slate-200/50 dark:bg-slate-800/50 mx-3" />
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        // Empty State - Mobile Native
                        <div className="flex flex-col items-center justify-center py-20 md:py-32 px-4 md:px-0">
                            <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                <Search size={28} className="md:w-8 md:h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">No centers found</h3>
                            <p className="text-sm text-slate-500 mt-1 text-center">Try adjusting your search or county filter</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExamCenters;