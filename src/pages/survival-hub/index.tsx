import React, { useEffect, useState } from 'react';
import { MapPin, Home, Hospital, Briefcase, Star, Loader2 } from 'lucide-react';
import { HubCard } from '../../components/survival-hub/HubCard';
import { survivalApi } from '../../lib/survivalApi';

const SurvivalHubDashboard = () => {
    const [stats, setStats] = useState({ centersCount: 0, housingCount: 0, hospitalsCount: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            try {
                setLoading(true);
                const data = await survivalApi.getDashboardStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to load stats:", error);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 p-4 pb-24 dark:bg-background md:p-8">
            {/* 1. Header Section */}
            <header className="mb-8 mt-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        NCK Survival Guide
                    </span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Student Survival Hub 🇰🇪
                </h1>
                <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-md">
                    Helping nursing students navigate exams and clinical placements with ease.
                </p>
            </header>

            {/* 2. Main Navigation Grid */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <HubCard
                    title="Exam Centers"
                    description="Official venues, maps, and important center notes."
                    icon={MapPin}
                    href="/survival-hub/exam-centers"
                    color="bg-blue-600"
                    count={loading ? undefined : stats.centersCount}
                />
                <HubCard
                    title="Student Housing"
                    description="Verified and affordable rooms near exam venues."
                    icon={Home}
                    href="/survival-hub/housing"
                    color="bg-emerald-600"
                    count={loading ? undefined : stats.housingCount}
                />
                <HubCard
                    title="Nearby Hospitals"
                    description="Emergency contacts and student-friendly facilities."
                    icon={Hospital}
                    href="/survival-hub/hospitals"
                    color="bg-rose-600"
                    count={loading ? undefined : stats.hospitalsCount}
                />
                <HubCard
                    title="Placements"
                    description="Insights on clinical placement sites across Kenya."
                    icon={Briefcase}
                    href="/survival-hub/placements"
                    color="bg-amber-600"
                />
            </div>

            {/* 3. Loading Indicator (Optional Subtle View) */}
            {loading && (
                <div className="mt-2 flex items-center justify-center gap-2 text-slate-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs font-medium uppercase tracking-widest">Syncing with database...</span>
                </div>
            )}

            {/* 4. Pro-Tip Section */}
            {!loading && (
                <section className="mt-4 rounded-xl bg-white border-0 p-6 shadow-sm dark:bg-muted/30 ">
                    <div className="flex items-start gap-4">
                        <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/30">
                            <Star className="text-amber-600 dark:text-amber-400" size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white">Pro Tip for NCK Exams</h4>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                Did you know? Most students prefer housing within a 1km radius of the center to avoid morning traffic.
                                Check the "Distance" field in the housing section before booking!
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* 5. Quick Support Footer */}
            <footer className="mt-12 text-center opacity-50">
                <p className="text-[10px] uppercase tracking-[0.2em] dark:text-slate-500">
                    Crowdsourced by Nursing Students for Nursing Students
                </p>
            </footer>
        </div>
    );
};

export default SurvivalHubDashboard;