import React, { useState } from 'react'; // Added useState
import {
    User, ShieldCheck, Wifi, Phone, School, Droplets, Star,
    MessageSquare, Building2, Hospital, Briefcase, X, ChevronRight, ChevronLeft,
    Trash2
} from 'lucide-react'; // Added X and Chevrons
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/lib/supabaseClient";
export const HousingCard = ({
    house,
    onDelete
}: {
    house: any;
    onDelete?: (id: string) => void;
}) => {
    const navigate = useNavigate();

    // --- NEW: STATE FOR FULLSCREEN VIEW ---
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    const contributor = house.contributor;
    const images = house.images || []; // The array of 1-3 photos

    const linkedLocation =
        house.oriented_exam_centers?.name ||
        house.oriented_nearby_hospitals?.hospital_name ||
        house.oriented_placement_sites?.hospital_name ||
        "Unknown Location";

    const displayImage = images.length > 0
        ? images[0]
        : 'https://via.placeholder.com/400x300?text=No+Photo+Available';

    const LocationIcon = house.exam_center_id ? Building2 : house.nearby_hospital_id ? Hospital : Briefcase;
    const safetyStars = house.safety_rating || 3;

    // --- NEW: FUNCTIONS TO MOVE THROUGH PHOTOS ---
    const nextPhoto = (e: any) => {
        e.stopPropagation();
        setCurrentPhotoIndex((prev) => (prev + 1) % images.length);
    };

    const prevPhoto = (e: any) => {
        e.stopPropagation();
        setCurrentPhotoIndex((prev) => (prev - 1 + images.length) % images.length);
    };
    const handleDelete = async () => {
        const confirmDelete = window.confirm("Are you sure you want to delete this listing? This cannot be undone.");
        if (!confirmDelete) return;

        try {
            const { error } = await supabase
                .from('oriented_student_housing')
                .delete()
                .eq('id', house.id);

            if (error) throw error;

            if (onDelete) {
                onDelete(house.id);
            }
        } catch (error: any) {
            alert("Error deleting: " + error.message);
        }
    };
    return (
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">

            {/* 1. Header Color */}
            <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />

            {/* 2. Photo Area (Clickable) */}
            <div
                className="relative h-48 w-full cursor-pointer overflow-hidden"
                onClick={() => images.length > 0 && setIsFullscreen(true)}
            >
                <img
                    // If displayImage is null/undefined, it uses /housing.png
                    src={displayImage || "/housing.png"}
                    alt={house.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    // If the image fails to load (404), it switches to /housing.png
                    onError={(e) => {
                        e.currentTarget.src = "/housing.png";
                    }}
                />

                {images.length > 1 && (
                    <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/20">
                        1 / {images.length} Photos
                    </span>
                )}
            </div>

            <div className="p-5">
                {/* 3. TAGGED LOCATION BADGE */}
                <div className="flex items-center gap-1.5 bg-slate-50 px-4 py-2 border-b border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 -mx-5 -mt-5 mb-4">
                    <LocationIcon size={12} className="text-blue-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                        Near {linkedLocation}
                    </span>
                </div>

                {/* 4. Title & Verification */}
                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                        {house.name}
                    </h3>
                    {house.verified && (
                        <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">
                            <ShieldCheck size={10} />
                            Verified
                        </div>
                    )}
                </div>

                {/* 5. Distance & Safety */}
                <div className="flex items-center gap-3 mb-4">
                    <p className="text-xs text-slate-500 font-medium">{house.distance_to_center} from center</p>
                    <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                            <Star
                                key={i}
                                size={10}
                                className={i < safetyStars ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-700"}
                            />
                        ))}
                    </div>
                </div>

                {/* 6. Amenities & Price */}
                <div className="flex items-center justify-between mt-6 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                        <p className="text-[9px] uppercase text-slate-400 font-black tracking-widest">Price / Night</p>
                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                            KSh {house.price_per_night.toLocaleString()}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        {house.has_wifi && <Wifi size={16} className="text-blue-500" />}
                        {house.has_water && <Droplets size={16} className="text-cyan-500" />}
                        {house.has_security && <ShieldCheck size={16} className="text-indigo-500" />}
                    </div>
                </div>

                {/* 7. Quick Actions */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                    <a
                        href={`tel:${house.contact_phone}`}
                        className="flex items-center justify-center gap-2 rounded-xl bg-slate-200 py-2.5 text-xs font-bold text-black   hover:bg-black transition-all active:scale-95 dark:bg-gray-800 dark:text-white"
                    >
                        <Phone size={14} />
                        Call Host
                    </a>
                    <button
                        onClick={() => navigate(`/survival-hub/reviews/${house.id}?type=housing`)}
                        className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                        <MessageSquare size={14} />
                        Reviews
                    </button>

                </div>
                {/* 6. Contributor Profile Bar */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                    <button
                        onClick={() => navigate(`/profile/${contributor?.username || house.created_by}`)}
                        className="flex items-center gap-2.5 text-left"
                    >
                        {/* ... (Your existing profile avatar and name code) ... */}
                    </button>

                    {/* NEW: DELETE BUTTON (Only shows for the owner) */}
                    {house.is_owner && (
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                        >
                            <Trash2 size={12} />
                            Delete
                        </button>
                    )}
                </div>
            </div>

            {/* 8. Contributor Profile Bar */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                <button
                    onClick={() => navigate(`/profile/${contributor?.username || house.created_by}`)}
                    className="flex items-center gap-2.5 text-left"
                >
                    <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-white bg-slate-200 shadow-sm dark:border-slate-700">
                        {contributor?.avatar_url ? (
                            <img src={contributor.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <User size={16} />
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 leading-none">
                            {contributor?.name || 'Verified Student'}
                        </p>
                    </div>
                </button>
            </div>

            {/* --- NEW: FULLSCREEN VIEWPORT MODAL --- */}
            {isFullscreen && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl p-4">
                    {/* Close Button */}
                    <button
                        onClick={() => setIsFullscreen(false)}
                        className="absolute top-6 right-6 z-[110] rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
                    >
                        <X size={24} />
                    </button>

                    {/* Image Display */}
                    <div className="relative flex w-full max-w-4xl items-center justify-center">
                        {images.length > 1 && (
                            <button
                                onClick={prevPhoto}
                                className="absolute left-0 z-[110] rounded-full bg-black/50 p-3 text-white hover:bg-black"
                            >
                                <ChevronLeft size={30} />
                            </button>
                        )}

                        <img
                            src={images[currentPhotoIndex]}
                            className="max-h-[80vh] w-full rounded-2xl object-contain shadow-2xl"
                            alt="Housing view"
                        />

                        {images.length > 1 && (
                            <button
                                onClick={nextPhoto}
                                className="absolute right-0 z-[110] rounded-full bg-black/50 p-3 text-white hover:bg-black"
                            >
                                <ChevronRight size={30} />
                            </button>
                        )}
                    </div>

                    {/* Photo Counter */}
                    <p className="mt-6 text-sm font-bold text-white tracking-widest uppercase">
                        Photo {currentPhotoIndex + 1} of {images.length}
                    </p>
                    <p className="mt-2 text-slate-400 text-xs font-medium italic">
                        {house.name} • {linkedLocation}
                    </p>
                </div>
            )}
        </div>
    );
};