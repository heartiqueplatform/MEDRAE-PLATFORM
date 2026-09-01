import React, { useState } from 'react';
import {
    User, ShieldCheck, Wifi, Phone, School, Droplets, Star,
    MessageSquare, Building2, Hospital, Briefcase, X, ChevronRight, ChevronLeft,
    Trash2, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/lib/supabaseClient";
import { toast } from 'sonner';

export const HousingCard = ({
    house,
    onDelete,
    isDeleting = false
}: {
    house: any;
    onDelete?: (id: string) => void;
    isDeleting?: boolean;
}) => {
    const navigate = useNavigate();

    // State for fullscreen view
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [localDeleting, setLocalDeleting] = useState(false);

    const contributor = house.contributor;
    const images = house.images || [];

    const linkedLocation =
        house.oriented_exam_centers?.name ||
        house.oriented_nearby_hospitals?.hospital_name ||
        house.oriented_placement_sites?.hospital_name ||
        "Unknown Location";

    const displayImage = images.length > 0
        ? images[0]
        : '/housing.png';

    const LocationIcon = house.exam_center_id ? Building2 : house.nearby_hospital_id ? Hospital : Briefcase;
    const safetyStars = house.safety_rating || 3;

    // Functions to move through photos
    const nextPhoto = (e: any) => {
        e.stopPropagation();
        setCurrentPhotoIndex((prev) => (prev + 1) % images.length);
    };

    const prevPhoto = (e: any) => {
        e.stopPropagation();
        setCurrentPhotoIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    // UPDATED: Delete handler with proper loading state
    const handleDelete = async () => {
        if (!house.is_owner) {
            toast.error('You can only delete your own listings');
            return;
        }

        const confirmDelete = window.confirm("Are you sure you want to delete this listing? This cannot be undone.");
        if (!confirmDelete) return;

        setLocalDeleting(true);

        try {
            const { error } = await supabase
                .from('oriented_student_housing')
                .delete()
                .eq('id', house.id);

            if (error) throw error;

            toast.success('Housing listing deleted successfully!');

            if (onDelete) {
                onDelete(house.id);
            }

        } catch (error: any) {
            console.error("Error deleting housing:", error);
            toast.error(error.message || "Failed to delete housing listing");
            setLocalDeleting(false);
        }
    };

    const showDeleting = isDeleting || localDeleting;

    return (
        <div className={`group relative overflow-hidden rounded-none md:rounded-2xl border-0 md:border border-slate-200 bg-white transition-all hover:md:shadow-lg dark:border-slate-800 dark:bg-muted/30 border-b md:border-b md:border-slate-100/50 dark:border-slate-800/50 ${showDeleting ? 'opacity-50 pointer-events-none' : ''}`}>

            {/* Deleting Overlay */}
            {showDeleting && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-none md:rounded-2xl">
                    <div className="flex flex-col items-center gap-2 text-white">
                        <Loader2 className="h-8 w-8 md:h-10 md:w-10 animate-spin" />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Deleting...</span>
                    </div>
                </div>
            )}

            {/* 1. Header Color */}
            <div className="h-1.5 md:h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />

            {/* 2. Photo Area (Clickable) */}
            <div
                className="relative h-48 md:h-56 w-full cursor-pointer overflow-hidden"
                onClick={() => images.length > 0 && setIsFullscreen(true)}
            >
                <img
                    src={displayImage}
                    alt={house.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:md:scale-110"
                    onError={(e) => {
                        e.currentTarget.src = "/housing.png";
                    }}
                />

                {images.length > 1 && (
                    <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[8px] md:text-[10px] font-bold px-2 md:px-3 py-0.5 md:py-1 rounded-full border border-white/20">
                        {currentPhotoIndex + 1} / {images.length} Photos
                    </span>
                )}
            </div>

            <div className="p-4 md:p-5">
                {/* 3. TAGGED LOCATION BADGE */}
                <div className="flex items-center justify-between gap-1 bg-slate-50 px-3 md:px-4 py-1.5 md:py-2 border-b border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 -mx-4 md:-mx-5 -mt-4 md:-mt-5 mb-3 md:mb-4">
                    <div className="flex items-center gap-1 md:gap-1.5 min-w-0 flex-1">
                        <LocationIcon size={10} className="md:w-3 md:h-3 text-blue-500 shrink-0" />
                        <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
                            Near {linkedLocation}
                        </span>
                    </div>

                    {/* Delete button moved to top right */}
                    {house.is_owner && !showDeleting && (
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-0.5 md:gap-1 rounded-lg bg-red-50 px-1.5 md:px-2 py-0.5 md:py-1 text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-red-600 hover:bg-red-100 transition-colors dark:bg-red-900/20 dark:text-red-400 shrink-0"
                            title="Delete listing"
                        >
                            <Trash2 size={10} className="md:w-3 md:h-3" />
                            <span className="hidden xs:inline">Delete</span>
                        </button>
                    )}
                </div>

                {/* 4. Title & Verification */}
                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-white group-hover:md:text-emerald-600 transition-colors truncate">
                        {house.name}
                    </h3>
                    {house.verified && (
                        <div className="flex items-center gap-0.5 md:gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[8px] md:text-[9px] font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-full uppercase tracking-tighter shrink-0 ml-2">
                            <ShieldCheck size={8} className="md:w-2.5 md:h-2.5" />
                            Verified
                        </div>
                    )}
                </div>

                {/* 5. Distance & Safety */}
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <p className="text-[10px] md:text-xs text-slate-500 font-medium">{house.distance_to_center} from center</p>
                    <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                            <Star
                                key={i}
                                size={8} className="md:w-2.5 md:h-2.5"
                                className={i < safetyStars ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-700"}
                            />
                        ))}
                    </div>
                </div>

                {/* 6. Amenities & Price */}
                <div className="flex items-center justify-between mt-4 md:mt-6 bg-slate-50 dark:bg-slate-800/50 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                        <p className="text-[8px] md:text-[9px] uppercase text-slate-400 font-black tracking-widest">Price / Night</p>
                        <p className="text-base md:text-xl font-black text-emerald-600 dark:text-emerald-400">
                            KSh {house.price_per_night?.toLocaleString() || 0}
                        </p>
                    </div>

                    <div className="flex gap-2 md:gap-3">
                        {house.has_wifi && <Wifi size={14} className="md:w-4 md:h-4 text-blue-500" />}
                        {house.has_water && <Droplets size={14} className="md:w-4 md:h-4 text-cyan-500" />}
                        {house.has_security && <ShieldCheck size={14} className="md:w-4 md:h-4 text-indigo-500" />}
                    </div>
                </div>

                {/* 7. Quick Actions */}
                <div className="grid grid-cols-2 gap-1.5 md:gap-2 mt-3 md:mt-4">
                    <a
                        href={`tel:${house.contact_phone}`}
                        className="flex items-center justify-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl bg-slate-200 py-2 md:py-2.5 text-[10px] md:text-xs font-bold text-black hover:md:bg-slate-300 transition-all active:scale-95 dark:bg-gray-800 dark:text-white dark:hover:md:bg-gray-700"
                    >
                        <Phone size={12} className="md:w-3.5 md:h-3.5" />
                        Call Host
                    </a>
                    <button
                        onClick={() => navigate(`/survival-hub/reviews/${house.id}?type=housing`)}
                        className="flex items-center justify-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl border border-slate-200 py-2 md:py-2.5 text-[10px] md:text-xs font-bold text-slate-600 hover:md:bg-slate-50 transition-all active:scale-95 dark:border-slate-800 dark:text-slate-400 dark:hover:md:bg-slate-800"
                    >
                        <MessageSquare size={12} className="md:w-3.5 md:h-3.5" />
                        Reviews
                    </button>
                </div>
            </div>

            {/* 8. Contributor Profile Bar */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 p-3 md:p-4 dark:border-slate-800 dark:bg-slate-800/30">
                <button
                    onClick={() => navigate(`/profile/${contributor?.username || house.created_by}`)}
                    className="flex items-center gap-2 md:gap-2.5 text-left flex-1 min-w-0"
                >
                    <div className="h-7 w-7 md:h-9 md:w-9 overflow-hidden rounded-full border-2 border-white bg-slate-200 shadow-sm dark:border-slate-700 shrink-0">
                        {contributor?.avatar_url ? (
                            <img src={contributor.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <User size={12} className="md:w-4 md:h-4" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] md:text-xs font-extrabold text-slate-800 dark:text-slate-200 leading-none truncate">
                            {contributor?.name || 'Verified Student'}
                        </p>
                        <p className="text-[8px] md:text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                            {house.is_owner ? 'You' : 'Contributor'}
                        </p>
                    </div>
                </button>
            </div>

            {/* FULLSCREEN VIEWPORT MODAL */}
            {isFullscreen && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl p-4">
                    {/* Close Button */}
                    <button
                        onClick={() => setIsFullscreen(false)}
                        className="absolute top-4 right-4 md:top-6 md:right-6 z-[110] rounded-full bg-white/10 p-2 md:p-3 text-white hover:bg-white/20 transition-colors"
                    >
                        <X size={20} className="md:w-6 md:h-6" />
                    </button>

                    {/* Image Display */}
                    <div className="relative flex w-full max-w-4xl items-center justify-center">
                        {images.length > 1 && (
                            <button
                                onClick={prevPhoto}
                                className="absolute left-0 z-[110] rounded-full bg-black/50 p-2 md:p-3 text-white hover:bg-black transition-colors"
                            >
                                <ChevronLeft size={24} className="md:w-8 md:h-8" />
                            </button>
                        )}

                        <img
                            src={images[currentPhotoIndex]}
                            className="max-h-[70vh] md:max-h-[80vh] w-full rounded-xl md:rounded-2xl object-contain shadow-2xl"
                            alt="Housing view"
                            onError={(e) => {
                                e.currentTarget.src = "/housing.png";
                            }}
                        />

                        {images.length > 1 && (
                            <button
                                onClick={nextPhoto}
                                className="absolute right-0 z-[110] rounded-full bg-black/50 p-2 md:p-3 text-white hover:bg-black transition-colors"
                            >
                                <ChevronRight size={24} className="md:w-8 md:h-8" />
                            </button>
                        )}
                    </div>

                    {/* Photo Counter */}
                    <p className="mt-4 md:mt-6 text-xs md:text-sm font-bold text-white tracking-widest uppercase">
                        Photo {currentPhotoIndex + 1} of {images.length}
                    </p>
                    <p className="mt-1 md:mt-2 text-slate-400 text-[10px] md:text-xs font-medium italic text-center px-4">
                        {house.name} • {linkedLocation}
                    </p>
                </div>
            )}
        </div>
    );
};