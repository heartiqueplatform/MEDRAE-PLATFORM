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
        <div className="min-h-screen bg-slate-50 p-4 dark:bg-black">
            <div className="mx-auto max-w-4xl">
                <h1 className="text-2xl font-bold dark:text-white">NCK Exam Centers</h1>

                {/* Search Bar */}
                <div className="relative mt-4 mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search center or county..."
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {filteredCenters.map(center => (
                        <ExamCenterCard key={center.id} center={center} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ExamCenters;