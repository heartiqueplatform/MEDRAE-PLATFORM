import React from "react";
import {
    MapPin,
    Building2,
    Hospital,
    ExternalLink,
    Home,
    User,
    Edit2,
    Trash2,
    Users,
    Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { playSound } from "@/lib/soundManager";

interface ExamCenterCardProps {
    center: any;
    onEdit?: (center: any) => void;
    onDelete?: (id: string) => void;
}

const tap = () => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
    }
};

export const ExamCenterCard = ({
    center,
    onEdit,
    onDelete,
}: ExamCenterCardProps) => {
    const { user } = useAuth();
    const isOwner = user?.id === center.created_by;

    return (
        <article className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2.5">
            {/* Header — badges + title + venue icon */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="inline-flex items-center gap-1
                                         bg-blue-50 dark:bg-blue-400/10
                                         text-blue-700 dark:text-blue-400
                                         text-[9px] font-bold uppercase tracking-wider
                                         px-2 py-0.5 rounded-full">
                            <span className="h-1 w-1 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                            {center.county}
                        </span>
                        {center.venue_type && (
                            <span className="bg-slate-100 dark:bg-white/[0.06]
                                             text-slate-600 dark:text-slate-300
                                             text-[9px] font-bold uppercase tracking-wider
                                             px-2 py-0.5 rounded-full">
                                {center.venue_type}
                            </span>
                        )}
                    </div>
                    <h3 className="text-[14px] font-bold text-slate-900 dark:text-white leading-snug">
                        {center.name}
                    </h3>
                </div>

                <div className="h-9 w-9 rounded-xl
                                bg-slate-100 dark:bg-white/[0.06]
                                flex items-center justify-center
                                text-slate-500 dark:text-slate-400 shrink-0">
                    <Building2 className="h-4 w-4" strokeWidth={2.25} />
                </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-1.5
                            text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <MapPin className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">
                    {center.town || "Location details pending"}
                </span>
            </div>

            {/* Find buddies CTA */}
            <Link
                to={`/survival-hub/buddies?centerId=${center.id}&name=${encodeURIComponent(
                    center.name
                )}`}
                onClick={tap}
                className="flex items-center justify-between gap-2
                           bg-slate-900 dark:bg-white
                           text-white dark:text-slate-900
                           p-2.5 rounded-xl
                           active:scale-[0.97] transition-transform"
                style={{ touchAction: "manipulation" }}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-lg
                                    bg-white/[0.12] dark:bg-slate-900/[0.08]
                                    flex items-center justify-center shrink-0">
                        <Users className="h-3.5 w-3.5" strokeWidth={2.25} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-wider opacity-80 leading-none mb-0.5">
                            Community
                        </p>
                        <p className="text-[12px] font-bold leading-tight truncate">
                            Find exam buddies
                        </p>
                    </div>
                </div>
                <Sparkles className="h-4 w-4 opacity-60 shrink-0" strokeWidth={2.25} />
            </Link>

            {/* Housing + Hospitals row */}
            <div className="grid grid-cols-2 gap-1.5">
                <Link
                    to={`/survival-hub/housing?centerId=${center.id}`}
                    onClick={tap}
                    className="h-9 rounded-lg
                               bg-emerald-50 dark:bg-emerald-400/10
                               text-emerald-700 dark:text-emerald-400
                               text-[10px] font-bold uppercase tracking-wider
                               flex items-center justify-center gap-1.5
                               active:scale-[0.97] transition-transform"
                    style={{ touchAction: "manipulation" }}
                >
                    <Home className="h-3 w-3 shrink-0" strokeWidth={2.25} />
                    Housing
                </Link>

                <Link
                    to={`/survival-hub/hospitals?centerId=${center.id}`}
                    onClick={tap}
                    className="h-9 rounded-lg
                               bg-rose-50 dark:bg-rose-400/10
                               text-rose-700 dark:text-rose-400
                               text-[10px] font-bold uppercase tracking-wider
                               flex items-center justify-center gap-1.5
                               active:scale-[0.97] transition-transform"
                    style={{ touchAction: "manipulation" }}
                >
                    <Hospital className="h-3 w-3 shrink-0" strokeWidth={2.25} />
                    Hospitals
                </Link>

                {center.map_link && (
                    <a
                        href={center.map_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={tap}
                        className="col-span-2 h-9 rounded-lg
                                   bg-slate-100 dark:bg-white/[0.06]
                                   text-slate-700 dark:text-slate-300
                                   text-[10px] font-bold uppercase tracking-wider
                                   flex items-center justify-center gap-1.5
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={2.25} />
                        View center map
                    </a>
                )}
            </div>

            {/* Footer — contributor + owner actions */}
            <div className="flex items-center justify-between gap-2 pt-1
                            border-t border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-6 w-6 rounded-full overflow-hidden shrink-0
                                    bg-slate-100 dark:bg-white/[0.06]
                                    flex items-center justify-center">
                        {center.uploader?.avatar_url ? (
                            <img
                                src={center.uploader.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <User className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-wider
                                      text-slate-500 dark:text-slate-400 leading-none">
                            Contributor
                        </p>
                        <p className="text-[11px] font-bold
                                      text-slate-700 dark:text-slate-200 truncate mt-0.5">
                            {center.uploader?.name || "Nursing Student"}
                        </p>
                    </div>
                </div>

                {isOwner && (
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={() => {
                                tap();
                                onEdit?.(center);
                            }}
                            aria-label="Edit center"
                            className="h-8 w-8 rounded-lg
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-600 dark:text-slate-300
                                       flex items-center justify-center
                                       active:scale-[0.92] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <Edit2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </button>
                        <button
                            onClick={() => {
                                tap();
                                onDelete?.(center.id);
                            }}
                            aria-label="Delete center"
                            className="h-8 w-8 rounded-lg
                                       bg-rose-50 dark:bg-rose-400/10
                                       text-rose-700 dark:text-rose-400
                                       flex items-center justify-center
                                       active:scale-[0.92] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </button>
                    </div>
                )}
            </div>
        </article>
    );
};