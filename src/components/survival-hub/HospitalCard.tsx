import React from "react";
import {
    Hospital,
    MapPin,
    CheckCircle2,
    Phone,
    Edit2,
    Trash2,
    User,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { playSound } from "@/lib/soundManager";

interface HospitalCardProps {
    hospital: any;
    onEdit?: (hospital: any) => void;
    onDelete?: (id: string) => void;
}

const tap = () => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
    }
};

export const HospitalCard = ({
    hospital,
    onEdit,
    onDelete,
}: HospitalCardProps) => {
    const { user } = useAuth();
    const isOwner = user?.id === hospital.created_by;

    return (
        <article className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2.5">
            {/* Header row */}
            <div className="flex items-start gap-2.5">
                <div className="h-10 w-10 rounded-xl
                                bg-rose-50 dark:bg-rose-400/10
                                text-rose-600 dark:text-rose-400
                                flex items-center justify-center shrink-0">
                    <Hospital className="h-4 w-4" strokeWidth={2.25} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-bold text-slate-900 dark:text-white leading-snug truncate">
                        {hospital.hospital_name}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-wider
                                  text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {hospital.hospital_type}
                    </p>
                </div>
            </div>

            {/* Location + acceptance */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5
                                text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    <MapPin className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>{hospital.distance || "Near center"}</span>
                </div>
                {hospital.student_acceptance && (
                    <div className="flex items-center gap-1
                                    text-[10px] font-bold uppercase tracking-wider
                                    text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        Student friendly
                    </div>
                )}
            </div>

            {/* Departments */}
            {hospital.department_availability && (
                <div className="flex flex-wrap gap-1.5">
                    {hospital.department_availability
                        .split(",")
                        .map((dept: string) => (
                            <span
                                key={dept}
                                className="rounded-lg bg-slate-100 dark:bg-white/[0.06]
                                           text-slate-600 dark:text-slate-300
                                           text-[10px] font-bold uppercase tracking-wider
                                           px-2 py-0.5"
                            >
                                {dept.trim()}
                            </span>
                        ))}
                </div>
            )}

            {/* Action row */}
            <div className="flex items-center gap-1.5">
                <Link
                    to={`/survival-hub/housing?hospitalId=${hospital.id}`}
                    onClick={tap}
                    className="flex-1 h-9 rounded-lg
                               bg-slate-100 dark:bg-white/[0.06]
                               text-slate-700 dark:text-slate-200
                               text-[10px] font-bold uppercase tracking-wider
                               flex items-center justify-center
                               active:scale-[0.97] transition-transform"
                    style={{ touchAction: "manipulation" }}
                >
                    Find housing nearby
                </Link>
                {hospital.contact && (
                    <a
                        href={`tel:${hospital.contact}`}
                        onClick={tap}
                        aria-label="Call hospital"
                        className="h-9 w-9 rounded-lg
                                   bg-slate-100 dark:bg-white/[0.06]
                                   text-slate-600 dark:text-slate-300
                                   flex items-center justify-center shrink-0
                                   active:scale-[0.92] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        <Phone className="h-3.5 w-3.5" strokeWidth={2.25} />
                    </a>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 pt-1
                            border-t border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-6 w-6 rounded-full
                                    bg-slate-100 dark:bg-white/[0.06]
                                    flex items-center justify-center overflow-hidden shrink-0">
                        {hospital.uploader?.avatar_url ? (
                            <img
                                src={hospital.uploader.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <User className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                        )}
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                        By{" "}
                        <span className="text-rose-600 dark:text-rose-400">
                            {hospital.uploader?.name || "Student"}
                        </span>
                    </p>
                </div>

                {isOwner && (
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={() => {
                                tap();
                                onEdit?.(hospital);
                            }}
                            aria-label="Edit hospital"
                            className="h-7 w-7 rounded-lg
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-600 dark:text-slate-300
                                       flex items-center justify-center
                                       active:scale-[0.92] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <Edit2 className="h-3 w-3" strokeWidth={2.25} />
                        </button>
                        <button
                            onClick={() => {
                                tap();
                                onDelete?.(hospital.id);
                            }}
                            aria-label="Delete hospital"
                            className="h-7 w-7 rounded-lg
                                       bg-rose-50 dark:bg-rose-400/10
                                       text-rose-700 dark:text-rose-400
                                       flex items-center justify-center
                                       active:scale-[0.92] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <Trash2 className="h-3 w-3" strokeWidth={2.25} />
                        </button>
                    </div>
                )}
            </div>
        </article>
    );
};