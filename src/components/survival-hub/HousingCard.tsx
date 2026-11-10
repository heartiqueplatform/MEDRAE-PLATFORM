import React, { useState } from "react";
import {
    User,
    ShieldCheck,
    Wifi,
    Phone,
    Droplets,
    Star,
    MessageSquare,
    Building2,
    Hospital,
    Briefcase,
    X,
    ChevronRight,
    ChevronLeft,
    Trash2,
    Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { CenteredModal } from "@/components/ui/CenteredModal";
import { playSound } from "@/lib/soundManager";

const tap = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        if (type === "success") navigator.vibrate([15, 30, 15]);
        else if (type === "warning") navigator.vibrate(40);
        else navigator.vibrate(12);
    }
};

export const HousingCard = ({
    house,
    onDelete,
    isDeleting = false,
}: {
    house: any;
    onDelete?: (id: string) => void;
    isDeleting?: boolean;
}) => {
    const navigate = useNavigate();

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

    const displayImage = images.length > 0 ? images[0] : "/housing.png";

    const LocationIcon = house.exam_center_id
        ? Building2
        : house.nearby_hospital_id
            ? Hospital
            : Briefcase;
    const safetyStars = house.safety_rating || 3;

    const nextPhoto = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (images.length === 0) return;
        tap();
        setCurrentPhotoIndex((prev) => (prev + 1) % images.length);
    };

    const prevPhoto = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (images.length === 0) return;
        tap();
        setCurrentPhotoIndex(
            (prev) => (prev - 1 + images.length) % images.length
        );
    };

    const handleDelete = async () => {
        if (!house.is_owner) {
            toast.error("You can only delete your own listings");
            return;
        }
        if (!window.confirm("Delete this listing? This cannot be undone.")) return;
        tap("warning");
        setLocalDeleting(true);

        try {
            const { error } = await supabase
                .from("oriented_student_housing")
                .delete()
                .eq("id", house.id);
            if (error) throw error;
            toast.success("Housing listing deleted");
            if (onDelete) onDelete(house.id);
        } catch (error: any) {
            console.error("Error deleting housing:", error);
            toast.error(error.message || "Failed to delete housing listing");
            setLocalDeleting(false);
        }
    };

    const showDeleting = isDeleting || localDeleting;

    return (
        <>
            <article
                className={`rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden
                            ${showDeleting ? "opacity-50 pointer-events-none" : ""}`}
            >
                {/* Deleting overlay */}
                {showDeleting && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center
                                    bg-black/50 rounded-2xl">
                        <div className="flex flex-col items-center gap-2 text-white">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                Deleting…
                            </span>
                        </div>
                    </div>
                )}

                {/* Photo */}
                <button
                    onClick={() => {
                        if (images.length > 0) {
                            tap();
                            setIsFullscreen(true);
                        }
                    }}
                    className="relative block w-full aspect-[4/3] overflow-hidden
                               bg-slate-100 dark:bg-white/[0.06]"
                    style={{ touchAction: "manipulation" }}
                    aria-label="View photos"
                >
                    <img
                        src={displayImage}
                        alt={house.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                            e.currentTarget.src = "/housing.png";
                        }}
                    />
                    {images.length > 1 && (
                        <span className="absolute bottom-2 right-2
                                         bg-black/60 backdrop-blur-md text-white
                                         text-[9px] font-bold uppercase tracking-wider
                                         px-2 py-0.5 rounded-full tabular-nums">
                            {currentPhotoIndex + 1} / {images.length}
                        </span>
                    )}
                </button>

                <div className="p-3 space-y-2.5">
                    {/* Location + delete */}
                    <div className="flex items-center justify-between gap-2
                                    rounded-lg bg-slate-50 dark:bg-[#0d1117] px-2.5 py-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <LocationIcon className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="text-[9px] font-bold uppercase tracking-wider
                                             text-slate-500 dark:text-slate-400 truncate">
                                Near {linkedLocation}
                            </span>
                        </div>
                        {house.is_owner && !showDeleting && (
                            <button
                                onClick={handleDelete}
                                aria-label="Delete listing"
                                className="shrink-0 h-6 px-2 rounded-md
                                           bg-rose-50 dark:bg-rose-400/10
                                           text-rose-700 dark:text-rose-400
                                           text-[9px] font-bold uppercase tracking-wider
                                           flex items-center gap-1
                                           active:scale-[0.92] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                <Trash2 className="h-2.5 w-2.5" />
                                Delete
                            </button>
                        )}
                    </div>

                    {/* Title + verified */}
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[14px] font-bold
                                       text-slate-900 dark:text-white
                                       leading-snug line-clamp-2 min-w-0 flex-1">
                            {house.name}
                        </h3>
                        {house.verified && (
                            <span className="shrink-0 inline-flex items-center gap-1
                                             bg-emerald-50 dark:bg-emerald-400/10
                                             text-emerald-700 dark:text-emerald-400
                                             text-[9px] font-bold uppercase tracking-wider
                                             px-1.5 py-0.5 rounded-full">
                                <ShieldCheck className="h-2.5 w-2.5" />
                                Verified
                            </span>
                        )}
                    </div>

                    {/* Distance + safety */}
                    <div className="flex items-center gap-2.5 flex-wrap
                                    text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        <span>{house.distance_to_center} from center</span>
                        <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    className={`h-2.5 w-2.5 ${i < safetyStars
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-slate-200 dark:text-white/[0.1]"
                                        }`}
                                    strokeWidth={1.75}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Price + amenities */}
                    <div className="flex items-center justify-between gap-2
                                    rounded-xl bg-slate-50 dark:bg-[#0d1117] p-2.5">
                        <div className="min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-wider
                                          text-slate-500 dark:text-slate-400 leading-none mb-1">
                                Price / night
                            </p>
                            <p className="text-[15px] font-bold tabular-nums
                                          text-emerald-600 dark:text-emerald-400 leading-none">
                                KSh {house.price_per_night?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {house.has_wifi && (
                                <Wifi className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            )}
                            {house.has_water && (
                                <Droplets className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                            )}
                            {house.has_security && (
                                <ShieldCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-1.5">
                        <a
                            href={`tel:${house.contact_phone}`}
                            onClick={() => tap()}
                            className="h-9 rounded-lg
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-700 dark:text-slate-200
                                       text-[11px] font-bold
                                       flex items-center justify-center gap-1.5
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <Phone className="h-3.5 w-3.5" strokeWidth={2.25} />
                            Call host
                        </a>
                        <button
                            onClick={() => {
                                tap();
                                navigate(`/survival-hub/reviews/${house.id}?type=housing`);
                            }}
                            className="h-9 rounded-lg
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-700 dark:text-slate-200
                                       text-[11px] font-bold
                                       flex items-center justify-center gap-1.5
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.25} />
                            Reviews
                        </button>
                    </div>
                </div>

                {/* Contributor bar */}
                <div className="flex items-center justify-between gap-2
                                bg-slate-50 dark:bg-[#0d1117] px-3 py-2
                                border-t border-slate-100 dark:border-white/[0.04]">
                    <button
                        onClick={() => {
                            tap();
                            navigate(
                                `/profile/${contributor?.username || house.created_by}`
                            );
                        }}
                        className="flex items-center gap-2 text-left flex-1 min-w-0"
                        style={{ touchAction: "manipulation" }}
                    >
                        <div className="h-7 w-7 rounded-full overflow-hidden shrink-0
                                        bg-slate-100 dark:bg-white/[0.06]
                                        flex items-center justify-center">
                            {contributor?.avatar_url ? (
                                <img
                                    src={contributor.avatar_url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <User className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold
                                          text-slate-900 dark:text-white truncate leading-tight">
                                {contributor?.name || "Verified Student"}
                            </p>
                            <p className="text-[9px] font-bold uppercase tracking-wider
                                          text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                                {house.is_owner ? "You" : "Contributor"}
                            </p>
                        </div>
                    </button>
                </div>
            </article>

            {/* Fullscreen viewer */}
            <CenteredModal
                open={isFullscreen}
                onClose={() => setIsFullscreen(false)}
                hideHeader
                noScrollBody
                maxWidthClass="max-w-2xl"
                maxHeight="92dvh"
                className="bg-black dark:bg-black"
            >
                <div className="relative flex-1 flex items-center justify-center p-2">
                    <button
                        onClick={() => {
                            tap();
                            setIsFullscreen(false);
                        }}
                        aria-label="Close image"
                        className="absolute top-2 right-2 z-10
                                   h-10 w-10 rounded-full
                                   bg-white/[0.12] text-white
                                   flex items-center justify-center
                                   active:scale-[0.92] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        <X className="h-5 w-5" strokeWidth={2.5} />
                    </button>

                    <div className="relative w-full flex items-center justify-center">
                        {images.length > 1 && (
                            <button
                                onClick={prevPhoto}
                                aria-label="Previous photo"
                                className="absolute left-2 z-10
                                           h-10 w-10 rounded-full
                                           bg-white/[0.12] text-white
                                           flex items-center justify-center
                                           active:scale-[0.92] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                            </button>
                        )}

                        <img
                            src={images[currentPhotoIndex] || displayImage}
                            className="max-h-[70dvh] w-full object-contain rounded-xl"
                            alt="Housing view"
                            onError={(e) => {
                                e.currentTarget.src = "/housing.png";
                            }}
                        />

                        {images.length > 1 && (
                            <button
                                onClick={nextPhoto}
                                aria-label="Next photo"
                                className="absolute right-2 z-10
                                           h-10 w-10 rounded-full
                                           bg-white/[0.12] text-white
                                           flex items-center justify-center
                                           active:scale-[0.92] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
                            </button>
                        )}
                    </div>

                    <div className="absolute bottom-3 left-0 right-0 text-center px-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/80 tabular-nums">
                            Photo {currentPhotoIndex + 1} of {images.length}
                        </p>
                        <p className="text-[10px] text-white/60 mt-0.5 truncate">
                            {house.name} · {linkedLocation}
                        </p>
                    </div>
                </div>
            </CenteredModal>
        </>
    );
};