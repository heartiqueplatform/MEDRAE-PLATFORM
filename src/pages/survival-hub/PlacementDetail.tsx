import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { survivalApi } from '../../lib/survivalApi';
import { ChevronLeft, FileText, AlertTriangle, ShieldCheck, Mail, MessageSquare, Loader2 } from 'lucide-react';

const PlacementDetailPage = () => {
    const { id } = useParams(); // Gets the ID from the URL
    const navigate = useNavigate();
    const [site, setSite] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            survivalApi.getPlacementById(id).then(setSite).finally(() => setLoading(false));
        }
    }, [id]);

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-background">
            <Loader2 className="animate-spin text-amber-600 mb-2" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Official Rules...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background">
            {/* Header */}
            <div className="bg-white rounded-xl dark:bg-slate-900 border-0 p-4 flex items-center gap-2">
                <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-sm font-black uppercase tracking-widest dark:text-white">Clinical Intake Rules</h1>
            </div>

            <div className="max-w-2xl mx-auto p-4 space-y-2">
                {/* 1. Hospital Identity Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border-0 shadow-sm text-center">
                    <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="text-blue-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{site?.hospital_name}</h2>
                    <p className="text-sm text-slate-500">{site?.county} County • {site?.location}</p>
                </div>

                {/* 2. THE RULES (Intake Notes) */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border-0 overflow-hidden shadow-xl">
                    <div className="bg-white dark:bg-gray-800 p-4 flex items-center gap-2">
                        <FileText size={18} className="text-amber-400" />
                        <h3 className="text-xs font-black uppercase tracking-[0.2em]  text-black dark:text-white">Intake Requirements & Rules</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex gap-3 items-start">
                            <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={16} />
                            <div className="space-y-4">
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                    The following information has been provided for students planning to rotate at this facility:
                                </p>
                                {/* 📝 This is the Intake Notes column from your DB */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-0 text-slate-600 dark:text-slate-300 text-sm italic leading-loose">
                                    {site?.intake_notes || "No specific rules provided. Please contact the supervisor for clinical induction details."}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t dark:border-slate-800">
                            <p className="text-[10px] text-slate-400 uppercase font-bold mb-2 tracking-widest">Wards & Specialties</p>
                            <p className="text-sm font-bold text-blue-600">{site?.ward_specialties}</p>
                        </div>
                    </div>
                </div>

                {/* 3. Action Logic */}
                <div className="grid grid-cols-1 gap-2">
                    <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">Contact Supervisor to confirm</p>
                    <a
                        href={site?.supervisor_contact?.includes('@') ? `mailto:${site.supervisor_contact}` : `https://wa.me/${site.supervisor_contact}`}
                        className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-900 dark:text-white text-black p-4 rounded-2xl font-bold transition-transform active:scale-95"
                    >
                        {site?.supervisor_contact?.includes('@') ? <Mail size={18} /> : <MessageSquare size={18} />}
                        Send Official Inquiry
                    </a>
                </div>
            </div>
        </div>
    );
};

export default PlacementDetailPage;