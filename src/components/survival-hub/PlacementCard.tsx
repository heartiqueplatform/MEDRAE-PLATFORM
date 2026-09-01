import React, { useState } from 'react';
import {
    Stethoscope, UserCheck, Home, Phone, FileText,
    Trash2, Camera, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { survivalApi } from '../../lib/survivalApi';

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
            onDelete(site.id);
        } catch (err: any) {
            alert("Error: " + err.message);
            setIsDeleting(false);
        }
    };

    return (
        <div className={`overflow-hidden rounded-none md:rounded-2xl border-0 md:border bg-white shadow-none md:shadow-sm dark:bg-muted/30 transition-all border-b md:border-b md:border-slate-100/50 dark:border-slate-800/50 ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>

            {/* Deleting Overlay */}
            {isDeleting && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-none md:rounded-2xl">
                    <div className="flex flex-col items-center gap-2 text-white">
                        <div className="h-8 w-8 md:h-10 md:w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Deleting...</span>
                    </div>
                </div>
            )}

            {/* PHOTO SECTION */}
            {displayImage ? (
                <div
                    className="relative h-48 md:h-56 w-full cursor-pointer overflow-hidden"
                    onClick={() => setIsFullscreen(true)}
                >
                    <img
                        src={displayImage}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:md:scale-110"
                        alt={site.hospital_name}
                        onError={(e) => { e.currentTarget.src = "/placement.png"; }}
                    />
                    {images.length > 1 && (
                        <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 md:px-3 py-0.5 md:py-1 text-[8px] md:text-[9px] text-white backdrop-blur-md">
                            +{images.length - 1} photos
                        </div>
                    )}
                </div>
            ) : (
                /* FALLBACK IMAGE WHEN NO PHOTO EXISTS */
                <div className="h-48 md:h-56 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                        src="/placement.png"
                        className="h-full w-full object-cover"
                        alt="Default placement"
                    />
                </div>
            )}

            <div className="p-4 md:p-5">
                <div className="mb-2 md:mb-3 flex items-center justify-between flex-wrap gap-1">
                    <span className="rounded-full bg-amber-100 px-1.5 md:px-2 py-0.5 md:py-1 text-[8px] md:text-[10px] font-black text-amber-700 uppercase tracking-tighter dark:bg-amber-900/30 dark:text-amber-400">
                        {site.county}
                    </span>
                    <div className="flex items-center gap-1.5 md:gap-2">
                        {site.student_friendly && (
                            <span className="flex items-center gap-0.5 md:gap-1 text-[8px] md:text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                                <UserCheck size={10} className="md:w-3 md:h-3" />
                                <span className="hidden xs:inline">Student Friendly</span>
                            </span>
                        )}
                        {/* DELETE BUTTON - ONLY FOR OWNER */}
                        {site.is_owner && !isDeleting && (
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors"
                            >
                                <Trash2 size={12} className="md:w-3.5 md:h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white leading-tight truncate">{site.hospital_name}</h3>
                <p className="text-[10px] md:text-xs text-slate-500 mb-3 md:mb-4">{site.location}</p>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 md:p-3 rounded-lg md:rounded-xl mb-3 md:mb-4 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-start gap-1.5 md:gap-2">
                        <Stethoscope size={12} className="md:w-3.5 md:h-3.5 mt-0.5 text-blue-500 shrink-0" />
                        <p className="text-[10px] md:text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                            <span className="font-bold">Wards:</span> {site.ward_specialties}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-1.5 md:gap-2 mt-3 md:mt-4">
                    <button
                        onClick={() => navigate(`/survival-hub/placements/${site.id}`)}
                        className="flex items-center justify-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl bg-blue-600 py-2.5 md:py-3.5 text-[10px] md:text-xs font-black uppercase tracking-widest text-white active:scale-95 transition-all"
                    >
                        <FileText size={14} className="md:w-4 md:h-4" />
                        View Intake Rules
                    </button>

                    <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                        <button
                            onClick={() => navigate('/survival-hub/housing')}
                            className="flex items-center justify-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl border border-slate-200 py-2 md:py-2.5 text-[9px] md:text-[10px] font-bold uppercase text-slate-600 dark:border-slate-800 dark:text-slate-400 active:scale-95 transition-all"
                        >
                            <Home size={12} className="md:w-3.5 md:h-3.5" />
                            Housing
                        </button>

                        <a
                            href={contactLink}
                            className="flex items-center justify-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl bg-slate-100 py-2 md:py-2.5 text-[9px] md:text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-400 active:scale-95 transition-all"
                        >
                            <Phone size={12} className="md:w-3.5 md:h-3.5" />
                            Contact
                        </a>
                    </div>
                </div>
            </div>

            {/* FULLSCREEN MODAL - z-index updated to z-[9999] */}
            {isFullscreen && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-md">
                    {/* Close Button */}
                    <button
                        onClick={() => setIsFullscreen(false)}
                        className="absolute top-4 right-4 md:top-6 md:right-6 z-[110] text-white p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={20} className="md:w-6 md:h-6" />
                    </button>

                    {/* Image Area */}
                    <div className="relative flex w-full max-w-4xl items-center justify-center">
                        {images.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentPhotoIndex((prev) => (prev - 1 + images.length) % images.length);
                                }}
                                className="absolute left-0 md:left-2 z-[110] text-white bg-black/50 p-2 md:p-3 rounded-full hover:bg-black transition-colors"
                            >
                                <ChevronLeft size={24} className="md:w-8 md:h-8" />
                            </button>
                        )}

                        <img
                            src={images[currentPhotoIndex]}
                            className="max-h-[70vh] md:max-h-[75vh] w-full rounded-xl md:rounded-2xl object-contain shadow-2xl"
                            alt="Fullscreen View"
                            onError={(e) => { e.currentTarget.src = "/placement.png"; }}
                        />

                        {images.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentPhotoIndex((prev) => (prev + 1) % images.length);
                                }}
                                className="absolute right-0 md:right-2 z-[110] text-white bg-black/50 p-2 md:p-3 rounded-full hover:bg-black transition-colors"
                            >
                                <ChevronRight size={24} className="md:w-8 md:h-8" />
                            </button>
                        )}
                    </div>

                    {/* Photo Counter and Title */}
                    <div className="mt-4 md:mt-6 text-center px-4">
                        <p className="text-xs md:text-sm font-bold text-white tracking-widest uppercase">
                            Photo {currentPhotoIndex + 1} of {images.length}
                        </p>
                        <p className="mt-1 md:mt-2 text-slate-400 text-[10px] md:text-xs font-medium italic">
                            {site.hospital_name} • {site.location}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};