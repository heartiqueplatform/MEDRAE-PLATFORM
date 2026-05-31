import React, { useState } from 'react';
import {
    Stethoscope, UserCheck, Home, Phone, FileText,
    Trash2, Camera, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { survivalApi } from '../../lib/survivalApi';

// Notice we added onDelete here
export const PlacementCard = ({ site, onDelete }: { site: any, onDelete: (id: string) => void }) => {
    const navigate = useNavigate();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    const images = site.images || [];
    const displayImage = images.length > 0 ? images[0] : null;

    const contact = site.supervisor_contact || "";
    const isEmail = contact.includes('@');
    const contactLink = isEmail
        ? `mailto:${contact}`
        : `https://wa.me/${contact.replace(/\s/g, '')}`;

    const handleDelete = async () => {
        if (!window.confirm("Delete this placement site?")) return;

        setIsDeleting(true);
        try {
            await survivalApi.deletePlacement(site.id);
            // 🎯 This is the "No Drama" part:
            // We tell the parent to remove this ID from the list
            onDelete(site.id);
        } catch (err: any) {
            alert("Error: " + err.message);
            setIsDeleting(false);
        }
    };

    return (
        <div className="overflow-hidden rounded-2xl border-0 bg-white shadow-sm dark:bg-muted/30 transition-all">

            {/* PHOTO SECTION */}
            {displayImage ? (
                <div
                    className="relative h-40 w-full cursor-pointer overflow-hidden"
                    onClick={() => setIsFullscreen(true)}
                >
                    <img
                        src={displayImage}
                        className="h-full w-full object-cover"
                        alt={site.hospital_name}

                        onError={(e) => { e.currentTarget.src = "/placement.png"; }}
                    />
                    {images.length > 1 && (
                        <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-1 text-[9px] text-white backdrop-blur-md">
                            +{images.length - 1} photos
                        </div>
                    )}
                </div>
            ) : (
                /* FALLBACK IMAGE WHEN NO PHOTO EXISTS */
                <div className="h-40 w-full overflow-hidden">
                    <img
                        src="/placement.png"
                        className="h-full w-full object-cover"
                        alt="Default placement"
                    />
                </div>
            )}
            <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700 uppercase tracking-tighter dark:bg-amber-900/30 dark:text-amber-400">
                        {site.county}
                    </span>
                    <div className="flex gap-2">
                        {site.student_friendly && (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                                <UserCheck size={12} /> Student Friendly
                            </span>
                        )}
                        {/* DELETE BUTTON - ONLY FOR OWNER */}
                        {site.is_owner && (
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{site.hospital_name}</h3>
                <p className="text-xs text-slate-500 mb-4">{site.location}</p>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl mb-4 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-start gap-2">
                        <Stethoscope size={14} className="mt-0.5 text-blue-500" />
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                            <span className="font-bold">Wards:</span> {site.ward_specialties}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2 mt-4">
                    <button
                        onClick={() => navigate(`/survival-hub/placements/${site.id}`)}
                        className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-xs font-black uppercase tracking-widest text-white active:scale-95 transition-all"
                    >
                        <FileText size={16} />
                        View Intake Rules
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => navigate('/survival-hub/housing')}
                            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-[10px] font-bold uppercase text-slate-600 dark:border-slate-800 dark:text-slate-400"
                        >
                            <Home size={14} />
                            Housing
                        </button>

                        <a
                            href={contactLink}
                            className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        >
                            <Phone size={14} />
                            Contact
                        </a>
                    </div>
                </div>
            </div>

            {/* FULLSCREEN MODAL */}
            {isFullscreen && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-md">
                    {/* Close Button */}
                    <button
                        onClick={() => setIsFullscreen(false)}
                        className="absolute top-6 right-6 z-[110] text-white p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>

                    {/* Image Area */}
                    <div className="relative flex w-full max-w-4xl items-center justify-center">
                        {images.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentPhotoIndex((prev) => (prev - 1 + images.length) % images.length);
                                }}
                                className="absolute left-2 z-[110] text-white bg-black/50 p-2 rounded-full hover:bg-black transition-colors"
                            >
                                <ChevronLeft size={30} />
                            </button>
                        )}

                        <img
                            src={images[currentPhotoIndex]}
                            className="max-h-[75vh] w-full rounded-2xl object-contain shadow-2xl"
                            alt="Fullscreen View"
                        />

                        {images.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentPhotoIndex((prev) => (prev + 1) % images.length);
                                }}
                                className="absolute right-2 z-[110] text-white bg-black/50 p-2 rounded-full hover:bg-black transition-colors"
                            >
                                <ChevronRight size={30} />
                            </button>
                        )}
                    </div>

                    {/* 🎯 ADDED: PHOTO COUNTER AND TITLE */}
                    <div className="mt-6 text-center">
                        <p className="text-sm font-bold text-white tracking-widest uppercase">
                            Photo {currentPhotoIndex + 1} of {images.length}
                        </p>
                        <p className="mt-2 text-slate-400 text-xs font-medium italic">
                            {site.hospital_name} • {site.location}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};