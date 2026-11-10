import React, { useState } from "react";
import {
    Stethoscope,
    UserCheck,
    Home,
    Phone,
    FileText,
    Trash2,
    X,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { survivalApi } from "../../lib/survivalApi";
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

export const PlacementCard = ({
    site,
    onDelete,
}: {
    site: any;
    onDelete: (id: string) => void;
}) => {
    const navigate = useNavigate();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    const images = site.images || [];
    const displayImage = images.length > 0 ? images[0] : null;

    const contact = site.supervisor_contact || "";
    const isEmail = contact.includes("@");
    const contactLink = isEmail
        ? `mailto:${contact}`
        : `https://wa.me/${contact.replace(/\s/g, "")}`;

    const handleDelete = async () => {
        if (!window.confirm("Delete this placement site?")) return;
        tap("warning");
        setIsDeleting(true);
        try {
            await survivalApi.deletePlacement(site.id);
            onDelete(site.id);
        } catch (err: any) {
            alert("Error: " + err.message);
            setIsDeleting(false);
        }
    };

    const prevPhoto = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (images.length === 0) return;
        tap();
        setCurrentPhotoIndex(
            (prev) => (prev - 1 + images.length) % images.length
        );
    };

    const nextPhoto = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (images.length === 0) return;
        tap();
        setCurrentPhotoIndex((prev) => (prev + 1) % images.length);
    };

    return (
        <>
            <article
                className={`relative rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden
                w-full max-w-sm mx-auto
                ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
            >
                {/* Deleting overlay */}
                {isDeleting && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center
                                    bg-black/50 rounded-2xl">
                        <div className="flex flex-col items-center gap-2 text-white">
                            <div className="h-8 w-8 animate-spin rounded-full
                                            border-4 border-white border-t-transparent" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                Deleting…
                            </span>
                        </div>
                    </div>
                )}

                {/* Photo */}
                <button
                    onClick={() => {
                        if (displayImage) {
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
                        src={displayImage || "/placement.png"}
                        className="h-full w-full object-cover"
                        alt={site.hospital_name}
                        onError={(e) => {
                            e.currentTarget.src = "/placement.png";
                        }}
                    />
                    {images.length > 1 && (
                        <span className="absolute bottom-2 right-2
                                         bg-black/60 backdrop-blur-md text-white
                                         text-[9px] font-bold uppercase tracking-wider
                                         px-2 py-0.5 rounded-full tabular-nums">
                            +{images.length - 1} photo{images.length - 1 === 1 ? "" : "s"}
                        </span>
                    )}
                </button>

                <div className="p-3 space-y-2.5">
                    {/* County + status row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="inline-flex items-center
                                         bg-amber-50 dark:bg-amber-400/10
                                         text-amber-700 dark:text-amber-400
                                         text-[9px] font-bold uppercase tracking-wider
                                         px-2 py-0.5 rounded-full">
                            {site.county}
                        </span>
                        <div className="flex items-center gap-1.5">
                            {site.student_friendly && (
                                <span className="inline-flex items-center gap-1
                                                 text-[9px] font-bold uppercase tracking-wider
                                                 text-emerald-700 dark:text-emerald-400">
                                    <UserCheck className="h-2.5 w-2.5" />
                                    Student friendly
                                </span>
                            )}
                            {site.is_owner && !isDeleting && (
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    aria-label="Delete placement"
                                    className="h-6 w-6 rounded-md
                                               bg-rose-50 dark:bg-rose-400/10
                                               text-rose-700 dark:text-rose-400
                                               flex items-center justify-center
                                               active:scale-[0.92] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <Trash2 className="h-2.5 w-2.5" strokeWidth={2.25} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Title + location */}
                    <div>
                        <h3 className="text-[14px] font-bold text-slate-900 dark:text-white
                                       leading-snug line-clamp-2">
                            {site.hospital_name}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {site.location}
                        </p>
                    </div>

                    {/* Wards */}
                    <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-2.5
                                    flex items-start gap-2">
                        <Stethoscope className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                            <strong className="font-bold text-slate-900 dark:text-white">
                                Wards:
                            </strong>{" "}
                            {site.ward_specialties}
                        </p>
                    </div>

                    {/* Primary CTA */}
                    <button
                        onClick={() => {
                            tap();
                            navigate(`/survival-hub/placements/${site.id}`);
                        }}
                        className="w-full h-10 rounded-xl
                                   bg-blue-600 text-white
                                   text-[11px] font-bold uppercase tracking-wider
                                   flex items-center justify-center gap-1.5
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        <FileText className="h-3.5 w-3.5" strokeWidth={2.25} />
                        View intake rules
                    </button>

                    {/* Secondary row */}
                    <div className="grid grid-cols-2 gap-1.5">
                        <button
                            onClick={() => {
                                tap();
                                navigate("/survival-hub/housing");
                            }}
                            className="h-9 rounded-lg
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-700 dark:text-slate-200
                                       text-[10px] font-bold uppercase tracking-wider
                                       flex items-center justify-center gap-1.5
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <Home className="h-3 w-3" strokeWidth={2.25} />
                            Housing
                        </button>

                        <a
                            href={contactLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => tap()}
                            className="h-9 rounded-lg
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-700 dark:text-slate-200
                                       text-[10px] font-bold uppercase tracking-wider
                                       flex items-center justify-center gap-1.5
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <Phone className="h-3 w-3" strokeWidth={2.25} />
                            Contact
                        </a>
                    </div>
                </div>
            </article>

            {/* Fullscreen photo viewer */}
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
                            src={images[currentPhotoIndex] || "/placement.png"}
                            className="max-h-[70dvh] w-full object-contain rounded-xl"
                            alt="Placement view"
                            onError={(e) => {
                                e.currentTarget.src = "/placement.png";
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
                            {site.hospital_name} · {site.location}
                        </p>
                    </div>
                </div>
            </CenteredModal>
        </>
    );
};