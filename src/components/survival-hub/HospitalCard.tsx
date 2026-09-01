import React from 'react';
import { Hospital, MapPin, CheckCircle2, Phone, Edit2, Trash2, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';

interface HospitalCardProps {
    hospital: any;
    onEdit?: (hospital: any) => void;
    onDelete?: (id: string) => void;
}

export const HospitalCard = ({ hospital, onEdit, onDelete }: HospitalCardProps) => {
    const { user } = useAuth();

    // Check if current logged-in user created this card
    const isOwner = user?.id === hospital.created_by;

    return (
        <div className="rounded-none md:rounded-xl border-0 md:border bg-white px-4 py-4 md:p-5 dark:bg-muted/30 shadow-none md:shadow-sm border-b md:border-b md:border-slate-100/50 dark:border-slate-800/50">
            <div className="flex gap-3 md:gap-4">
                <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/20">
                    <Hospital size={20} className="md:w-6 md:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white truncate">{hospital.hospital_name}</h3>
                    <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase">{hospital.hospital_type}</p>

                    <div className="mt-2 md:mt-3 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-slate-600 dark:text-slate-400">
                        <MapPin size={12} className="md:w-3.5 md:h-3.5" />
                        <span>{hospital.distance || 'Near center'}</span>
                    </div>

                    {hospital.student_acceptance && (
                        <div className="mt-2 md:mt-3 flex items-center gap-1 text-[10px] md:text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={12} className="md:w-3.5 md:h-3.5" />
                            <span>Student Friendly</span>
                        </div>
                    )}

                    <div className="mt-3 md:mt-4 flex gap-1.5 md:gap-2">
                        <Link
                            to={`/survival-hub/housing?hospitalId=${hospital.id}`}
                            className="flex-1 rounded-lg md:rounded-xl bg-gray-200 dark:bg-gray-800 dark:text-white py-2 md:py-2.5 text-center text-[9px] md:text-xs font-bold uppercase tracking-wider text-black shadow-sm active:scale-95 transition-all"
                        >
                            Find Housing Nearby
                        </Link>

                        {hospital.contact && (
                            <a
                                href={`tel:${hospital.contact}`}
                                className="rounded-lg md:rounded-xl border border-slate-200 px-2.5 md:px-3 py-2 text-slate-600 dark:border-slate-800 dark:text-slate-400 active:scale-95 transition-transform"
                            >
                                <Phone size={14} className="md:w-4 md:h-4" />
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Departments Section */}
            {hospital.department_availability && (
                <div className="mt-3 md:mt-4 flex flex-wrap gap-1.5 md:gap-2 border-t border-slate-50 pt-3 md:pt-4 dark:border-slate-800">
                    {hospital.department_availability.split(',').map((dept: string) => (
                        <span key={dept} className="rounded-md bg-slate-100 px-1.5 md:px-2 py-0.5 md:py-1 text-[8px] md:text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {dept.trim()}
                        </span>
                    ))}
                </div>
            )}

            {/* Uploader Info & Owner Actions */}
            <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-dashed border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {/* User who uploaded it */}
                <div className="flex items-center gap-1.5 md:gap-2">
                    <div className="h-5 w-5 md:h-6 md:w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                        {hospital.uploader?.avatar_url ? (
                            <img src={hospital.uploader.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <User size={10} className="md:w-3 md:h-3 text-slate-400" />
                        )}
                    </div>
                    <p className="text-[8px] md:text-[10px] text-slate-500 font-medium tracking-tight">
                        By <span className="text-rose-600 dark:text-rose-400">{hospital.uploader?.name || 'Student'}</span>
                    </p>
                </div>

                {/* Show Edit/Delete only if user is the owner */}
                {isOwner && (
                    <div className="flex items-center gap-0.5 md:gap-1">
                        <button
                            onClick={() => onEdit?.(hospital)}
                            className="p-1.5 md:p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit"
                        >
                            <Edit2 size={12} className="md:w-3.5 md:h-3.5" />
                        </button>
                        <button
                            onClick={() => onDelete?.(hospital.id)}
                            className="p-1.5 md:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={12} className="md:w-3.5 md:h-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};