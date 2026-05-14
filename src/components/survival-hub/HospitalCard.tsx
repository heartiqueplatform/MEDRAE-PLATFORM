import React from 'react';
import { Hospital, MapPin, CheckCircle2, Phone, Edit2, Trash2, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider'; // Import your auth hook

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
        <div className="rounded-xl border-0 bg-white p-5 dark:bg-slate-900 shadow-sm">
            <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/20">
                    <Hospital size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-slate-900 dark:text-white">{hospital.hospital_name}</h3>
                    <p className="text-xs font-medium text-slate-500 uppercase">{hospital.hospital_type}</p>

                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <MapPin size={14} />
                        <span>{hospital.distance || 'Near center'}</span>
                    </div>

                    {hospital.student_acceptance && (
                        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={14} />
                            <span>Student Friendly</span>
                        </div>
                    )}

                    <div className="mt-4 flex gap-2">
                        <Link
                            to={`/survival-hub/housing?hospitalId=${hospital.id}`}
                            className="flex-1 rounded-xl bg-gray-200 dark:bg-gray-800 dark:text-white py-2.5 text-center text-xs font-bold uppercase tracking-wider text-black shadow-sm active:scale-95 transition-all"
                        >
                            Find Housing Nearby
                        </Link>

                        {hospital.contact && (
                            <a
                                href={`tel:${hospital.contact}`}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-slate-600 dark:border-slate-800 dark:text-slate-400"
                            >
                                <Phone size={16} />
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Departments Section */}
            {hospital.department_availability && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-50 pt-4 dark:border-slate-800">
                    {hospital.department_availability.split(',').map((dept: string) => (
                        <span key={dept} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {dept.trim()}
                        </span>
                    ))}
                </div>
            )}

            {/* NEW: Uploader Info & Owner Actions */}
            <div className="mt-4 pt-4 border-t border-dashed border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {/* User who uploaded it */}
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                        {hospital.uploader?.avatar_url ? (
                            <img src={hospital.uploader.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <User size={12} className="text-slate-400" />
                        )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium tracking-tight">
                        By <span className="text-rose-600 dark:text-rose-400">{hospital.uploader?.name || 'Student'}</span>
                    </p>
                </div>

                {/* Show Edit/Delete only if user is the owner */}
                {isOwner && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onEdit?.(hospital)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit"
                        >
                            <Edit2 size={14} />
                        </button>
                        <button
                            onClick={() => onDelete?.(hospital.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};