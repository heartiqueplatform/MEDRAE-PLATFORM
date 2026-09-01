import React from 'react';
import { MapPin, Building2, Hospital, ExternalLink, Home, User, Edit2, Trash2, Users, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';

interface ExamCenterCardProps {
    center: any;
    onEdit?: (center: any) => void;
    onDelete?: (id: string) => void;
}

export const ExamCenterCard = ({ center, onEdit, onDelete }: ExamCenterCardProps) => {
    const { user } = useAuth();
    const isOwner = user?.id === center.created_by;

    return (
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-none md:rounded-[2rem] border-0 md:border bg-white px-4 py-4 md:p-5 shadow-none md:shadow-sm transition-all hover:md:shadow-xl hover:md:-translate-y-1 dark:bg-muted/30 md:border md:border-transparent hover:md:border-blue-100 dark:hover:md:border-blue-900/30 border-b md:border-b md:border-slate-100/50 dark:border-slate-800/50">

            {/* 1. Header: Badge & Status */}
            <div className="flex justify-between items-start mb-3 md:mb-4">
                <div className="flex flex-col gap-0.5 md:gap-1">
                    <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                        <div className="flex items-center gap-1 rounded-full bg-blue-50 px-1.5 md:px-2 py-0.5 md:py-1 dark:bg-blue-900/20">
                            <span className="h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                {center.county}
                            </span>
                        </div>
                        {center.venue_type && (
                            <span className="rounded-full bg-slate-100 px-1.5 md:px-2 py-0.5 md:py-1 text-[8px] md:text-[9px] font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {center.venue_type}
                            </span>
                        )}
                    </div>
                    <h3 className="mt-1 text-lg md:text-xl font-bold text-slate-900 dark:text-white group-hover:md:text-blue-600 transition-colors leading-tight">
                        {center.name}
                    </h3>
                </div>
                <div className="rounded-xl md:rounded-2xl bg-slate-50 p-2 md:p-3 text-slate-400 group-hover:md:bg-blue-600 group-hover:md:text-white transition-all duration-300 dark:bg-slate-800">
                    <Building2 size={18} className="md:w-5 md:h-5" />
                </div>
            </div>

            {/* 2. Location Info */}
            <div className="flex items-center gap-2 mb-4 md:mb-5 px-0 md:px-1">
                <div className="flex -space-x-1.5 md:-space-x-2 mr-1.5 md:mr-2">
                    {/* Visual hint of community */}
                    <div className="h-5 w-5 md:h-6 md:w-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 flex items-center justify-center">
                        <User size={8} className="md:w-2.5 md:h-2.5" />
                    </div>
                    <div className="h-5 w-5 md:h-6 md:w-6 rounded-full border-2 border-white dark:border-slate-900 bg-blue-100 flex items-center justify-center">
                        <Users size={8} className="md:w-2.5 md:h-2.5 text-blue-600" />
                    </div>
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-300">
                        <MapPin size={12} className="md:w-3.5 md:h-3.5 text-blue-500" />
                        <span>{center.town || 'Location details pending'}</span>
                    </div>
                </div>
            </div>

            {/* 3. THE AMAZING FEATURE: EXAM BUDDIES BUTTON */}
            <Link
                to={`/survival-hub/buddies?centerId=${center.id}&name=${encodeURIComponent(center.name)}`}
                className="relative mb-3 flex items-center justify-between overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-3 md:p-4 text-white shadow-lg shadow-blue-200 transition-all active:scale-95 dark:shadow-none group/buddy"
            >
                <div className="relative z-10 flex items-center gap-2 md:gap-3">
                    <div className="rounded-lg md:rounded-xl bg-white/20 p-1.5 md:p-2 backdrop-blur-md">
                        <Users size={16} className="md:w-[18px] md:h-[18px]" />
                    </div>
                    <div>
                        <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest opacity-80">Community</p>
                        <p className="text-xs md:text-sm font-black">Find Exam Buddies</p>
                    </div>
                </div>
                <Sparkles className="relative z-10 opacity-50 group-hover/buddy:rotate-12 transition-transform" size={18} className="md:w-5 md:h-5" />

                {/* Decorative background element */}
                <div className="absolute -right-3 md:-right-4 -top-3 md:-top-4 h-14 w-14 md:h-16 md:w-16 rounded-full bg-white/10 transition-transform group-hover/buddy:scale-150" />
            </Link>

            {/* 4. Action Grid */}
            <div className="grid grid-cols-2 gap-1.5 md:gap-2 mb-3 md:mb-4">
                <Link
                    to={`/survival-hub/housing?centerId=${center.id}`}
                    className="flex items-center justify-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl bg-emerald-50 dark:bg-emerald-900/10 py-2 md:py-3 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 hover:md:bg-emerald-600 hover:md:text-white transition-all active:scale-95"
                >
                    <Home size={12} className="md:w-3.5 md:h-3.5" />
                    Housing
                </Link>

                <Link
                    to={`/survival-hub/hospitals?centerId=${center.id}`}
                    className="flex items-center justify-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl bg-rose-50 dark:bg-rose-900/10 py-2 md:py-3 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 hover:md:bg-rose-600 hover:md:text-white transition-all active:scale-95"
                >
                    <Hospital size={12} className="md:w-3.5 md:h-3.5" />
                    Hospitals
                </Link>

                {center.map_link && (
                    <a
                        href={center.map_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="col-span-2 flex items-center justify-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl border border-slate-100 py-2 md:py-2.5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:md:bg-slate-50 dark:border-slate-800 dark:text-slate-500 dark:hover:md:bg-slate-800 transition-all"
                    >
                        <ExternalLink size={10} className="md:w-3 md:h-3" />
                        View Center Map
                    </a>
                )}
            </div>

            {/* 5. Footer: Uploader & Meta */}
            <div className="pt-3 md:pt-4 border-t border-slate-100/50 md:border-t md:border-dashed md:border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 md:gap-2">
                    <div className="h-6 w-6 md:h-7 md:w-7 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 p-0.5 border border-white dark:border-slate-800 shadow-sm overflow-hidden">
                        {center.uploader?.avatar_url ? (
                            <img src={center.uploader.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-400">
                                <User size={10} className="md:w-3 md:h-3" />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Contributor</span>
                        <span className="text-[10px] md:text-[11px] font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                            {center.uploader?.name || 'Nursing Student'}
                        </span>
                    </div>
                </div>

                {isOwner && (
                    <div className="flex items-center gap-0.5 md:gap-1 bg-slate-50 dark:bg-slate-800 p-0.5 md:p-1 rounded-lg">
                        <button
                            onClick={() => onEdit?.(center)}
                            className="p-1 md:p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                            <Edit2 size={11} className="md:w-3.5 md:h-3.5" />
                        </button>
                        <div className="w-px md:w-[1px] h-2.5 md:h-3 bg-slate-200 dark:bg-slate-700"></div>
                        <button
                            onClick={() => onDelete?.(center.id)}
                            className="p-1 md:p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                            <Trash2 size={11} className="md:w-3.5 md:h-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};