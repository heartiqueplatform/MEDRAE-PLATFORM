import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { survivalApi } from '../../lib/survivalApi';
import { ChevronLeft, FileText, AlertTriangle, ShieldCheck, Mail, MessageSquare, Loader2 } from 'lucide-react';

// Skeleton component for the placement detail page
const PlacementDetailSkeleton = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background animate-pulse">
            {/* Header Skeleton */}
            <div className="sticky -top-4 z-20 bg-white dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-center gap-3 px-3 py-3 md:px-6 md:py-4">
                    <div className="p-1.5 md:p-2 rounded-full bg-slate-200 dark:bg-slate-700 h-9 w-9 md:h-10 md:w-10" />
                    <div className="h-5 md:h-6 w-48 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-0 md:px-4 py-0 md:py-4 space-y-0 md:space-y-4">
                {/* Hospital Identity Card Skeleton */}
                <div className="bg-white dark:bg-muted/30 px-4 py-6 md:p-6 border-b md:border md:rounded-2xl md:border-slate-100 dark:md:border-slate-800 md:shadow-sm text-center">
                    <div className="h-14 w-14 md:h-16 md:w-16 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                        <div className="h-7 w-7 md:h-8 md:w-8 rounded bg-slate-300 dark:bg-slate-600" />
                    </div>
                    <div className="h-7 md:h-8 w-48 rounded bg-slate-200 dark:bg-slate-700 mx-auto mb-2" />
                    <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700 mx-auto" />
                </div>

                {/* Rules Section Skeleton */}
                <div className="bg-white dark:bg-muted/30 border-b md:border md:rounded-xl md:border-slate-100 dark:md:border-slate-800 md:shadow-xl">
                    <div className="bg-white dark:bg-gray-800 px-4 py-3.5 md:p-4 flex items-center gap-2">
                        <div className="h-4 w-4 md:h-[18px] md:w-[18px] rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3.5 w-48 rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                    <div className="px-4 py-5 md:p-6 space-y-4">
                        <div className="flex gap-3 items-start">
                            <div className="h-3.5 w-3.5 rounded bg-slate-200 dark:bg-slate-700 shrink-0 mt-0.5" />
                            <div className="space-y-3 md:space-y-4 flex-1">
                                <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
                                <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
                                <div className="p-3 md:p-4 bg-slate-200 dark:bg-slate-700 rounded-lg md:rounded-xl">
                                    <div className="space-y-2">
                                        <div className="h-3 w-full rounded bg-slate-300 dark:bg-slate-600" />
                                        <div className="h-3 w-5/6 rounded bg-slate-300 dark:bg-slate-600" />
                                        <div className="h-3 w-4/6 rounded bg-slate-300 dark:bg-slate-600" />
                                        <div className="h-3 w-3/6 rounded bg-slate-300 dark:bg-slate-600" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 md:pt-4 border-t dark:border-slate-800">
                            <div className="h-2.5 w-32 rounded bg-slate-200 dark:bg-slate-700 mb-1.5" />
                            <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-700" />
                        </div>
                    </div>
                </div>

                {/* Action Button Skeleton */}
                <div className="px-4 md:px-0 pb-4 md:pb-0 space-y-2">
                    <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-700 mx-auto" />
                    <div className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-slate-200 dark:bg-slate-700" />
                </div>
            </div>
        </div>
    );
};

const PlacementDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [site, setSite] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            survivalApi.getPlacementById(id).then(setSite).finally(() => setLoading(false));
        }
    }, [id]);

    if (loading) {
        return <PlacementDetailSkeleton />;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background">
            {/* Header - Mobile Native Style */}
            <div className="sticky -top-4 z-20 bg-white dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-center gap-3 px-3 py-3 md:px-6 md:py-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-1.5 md:p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-90 transition-transform"
                    >
                        <ChevronLeft size={20} className="md:w-5 md:h-5" />
                    </button>
                    <h1 className="text-sm md:text-base font-black uppercase tracking-widest dark:text-white">Clinical Intake Rules</h1>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-0 md:px-4 py-0 md:py-4 space-y-0 md:space-y-4">
                {/* 1. Hospital Identity Card - Mobile Native */}
                <div className="bg-white dark:bg-muted/30 px-4 py-6 md:p-6 border-b md:border md:rounded-2xl md:border-slate-100 dark:md:border-slate-800 md:shadow-sm text-center">
                    <div className="h-14 w-14 md:h-16 md:w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                        <ShieldCheck className="text-blue-600 md:w-8 md:h-8" size={28} />
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{site?.hospital_name}</h2>
                    <p className="text-xs md:text-sm text-slate-500">{site?.county} County • {site?.location}</p>
                </div>

                {/* 2. THE RULES (Intake Notes) - Mobile Native */}
                <div className="bg-white dark:bg-muted/30 border-b md:border md:rounded-xl md:border-slate-100 dark:md:border-slate-800 md:shadow-xl">
                    <div className="bg-white dark:bg-gray-800 px-4 py-3.5 md:p-4 flex items-center gap-2">
                        <FileText size={16} className="md:w-[18px] md:h-[18px] text-amber-400" />
                        <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-black dark:text-white">Intake Requirements & Rules</h3>
                    </div>
                    <div className="px-4 py-5 md:p-6 space-y-4">
                        <div className="flex gap-3 items-start">
                            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5 md:mt-1 md:w-4 md:h-4" size={14} />
                            <div className="space-y-3 md:space-y-4">
                                <p className="text-xs md:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                    The following information has been provided for students planning to rotate at this facility:
                                </p>
                                {/* 📝 This is the Intake Notes column from your DB */}
                                <div className="p-3 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg md:rounded-xl border-0 text-slate-600 dark:text-slate-300 text-xs md:text-sm italic leading-relaxed md:leading-loose">
                                    {site?.intake_notes || "No specific rules provided. Please contact the supervisor for clinical induction details."}
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 md:pt-4 border-t dark:border-slate-800">
                            <p className="text-[9px] md:text-[10px] text-slate-400 uppercase font-bold mb-1.5 md:mb-2 tracking-widest">Wards & Specialties</p>
                            <p className="text-sm md:text-base font-bold text-blue-600">{site?.ward_specialties}</p>
                        </div>
                    </div>
                </div>

                {/* 3. Action Logic - Mobile Native */}
                <div className="px-4 md:px-0 pb-4 md:pb-0 space-y-2">
                    <p className="text-[9px] md:text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">Contact Supervisor to confirm</p>
                    <a
                        href={site?.supervisor_contact?.includes('@') ? `mailto:${site.supervisor_contact}` : `https://wa.me/${site.supervisor_contact}`}
                        className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-900 dark:text-white text-black p-3.5 md:p-4 rounded-xl md:rounded-2xl font-bold transition-transform active:scale-95"
                    >
                        {site?.supervisor_contact?.includes('@') ? <Mail size={16} className="md:w-[18px] md:h-[18px]" /> : <MessageSquare size={16} className="md:w-[18px] md:h-[18px]" />}
                        <span className="text-sm md:text-base">Send Official Inquiry</span>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default PlacementDetailPage;