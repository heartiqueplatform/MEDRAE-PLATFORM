import React, { useEffect, useState } from 'react';
import { MapPin, Home, Hospital, Briefcase, Star } from 'lucide-react';
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
        <div className="min-h-screen bg-slate-50 dark:bg-background p-0 md:p-6 pb-24">
            {/* 1. Header Section - Centered on Mobile & Desktop */}
            <header className="mb-6 md:mb-8 mt-4 md:mt-0 px-4 md:px-0">
                <div className="flex flex-col items-center md:items-start gap-1.5 md:gap-2 mb-1">

                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white text-center md:text-left">
                        Student Survival Hub 🇰🇪
                    </h1>
                    <p className="mt-1.5 md:mt-2 text-slate-600 dark:text-slate-400 max-w-md text-center md:text-left text-xs md:text-sm">
                        Helping nursing students navigate exams and clinical placements with ease.
                    </p>
                </div>
            </header>

            {/* 2. Main Navigation Grid - edge-to-edge on mobile */}
            <div className="grid grid-cols-1 gap-0 md:gap-4 sm:grid-cols-2 lg:grid-cols-4 px-0 md:px-0">
                <HubCard
                    title="Exam Centers"
                    description="Official venues, maps, and important center notes."
                    icon={MapPin}
                    href="/survival-hub/exam-centers"
                    color="bg-blue-600"
                    count={loading ? undefined : stats.centersCount}
                    loading={loading}
                />
                <HubCard
                    title="Student Housing"
                    description="Verified and affordable rooms near exam venues."
                    icon={Home}
                    href="/survival-hub/housing"
                    color="bg-emerald-600"
                    count={loading ? undefined : stats.housingCount}
                    loading={loading}
                />
                <HubCard
                    title="Nearby Hospitals"
                    description="Emergency contacts and student-friendly facilities."
                    icon={Hospital}
                    href="/survival-hub/hospitals"
                    color="bg-rose-600"
                    count={loading ? undefined : stats.hospitalsCount}
                    loading={loading}
                />
                <HubCard
                    title="Placements"
                    description="Insights on clinical placement sites across Kenya."
                    icon={Briefcase}
                    href="/survival-hub/placements"
                    color="bg-amber-600"
                    loading={loading}
                />
            </div>

            {/* 3. Loading State for Pro-Tip Section */}
            {loading ? (
                <section className="mt-4 md:mt-6 rounded-none md:rounded-xl bg-white md:border-0 md:p-6 md:shadow-sm dark:bg-muted/30 p-4 mx-0 md:mx-0 border-0 md:border md:border-slate-100 dark:border-slate-800 animate-pulse">
                    <div className="flex items-start gap-3 md:gap-4">
                        <div className="rounded-full bg-slate-200 dark:bg-slate-700 p-2 md:p-3 flex-shrink-0">
                            <div className="h-4 w-4 md:h-5 md:w-5 rounded bg-slate-300 dark:bg-slate-600" />
                        </div>
                        <div className="flex-1">
                            <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-700 mb-1" />
                            <div className="space-y-1.5">
                                <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
                                <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
                                <div className="h-3 w-4/6 rounded bg-slate-200 dark:bg-slate-700" />
                            </div>
                        </div>
                    </div>
                </section>
            ) : (
                <section className="mt-4 md:mt-6 rounded-none md:rounded-xl bg-white md:border-0 md:p-6 md:shadow-sm dark:bg-muted/30 p-4 mx-0 md:mx-0 border-0 md:border md:border-slate-100 dark:border-slate-800">
                    <div className="flex items-start gap-3 md:gap-4">
                        <div className="rounded-full bg-amber-100 p-2 md:p-3 dark:bg-amber-900/30 flex-shrink-0">
                            <Star className="text-amber-600 dark:text-amber-400 md:w-5 md:h-5" size={18} />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">Pro Tip for NCK Exams</h4>
                            <p className="mt-0.5 md:mt-1 text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                Did you know? Most students prefer housing within a 1km radius of the center to avoid morning traffic.
                                Check the "Distance" field in the housing section before booking!
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* 4. Quick Support Footer */}
            <footer className="mt-10 md:mt-12 text-center opacity-50 px-4 md:px-0">
                <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] dark:text-slate-500">
                    Crowdsourced by Nursing Students for Nursing Students
                </p>
            </footer>
        </div>
    );
};

export default SurvivalHubDashboard;