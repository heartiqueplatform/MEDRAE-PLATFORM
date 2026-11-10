import React, { useState, useEffect } from "react";
import {
    Save,
    Hospital as HospitalIcon,
    MapPin,
    Phone,
    Building2,
    Clock,
    Stethoscope,
    MessageSquare,
    CheckCircle2,
} from "lucide-react";
import { CenteredModal } from "@/components/ui/CenteredModal";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { playSound } from "@/lib/soundManager";

const tap = () => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
    }
};

interface AddHospitalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    centerId: string | null;
}

const EMPTY_FORM = {
    hospital_name: "",
    location: "",
    distance: "",
    hospital_type: "Public",
    department_availability: "",
    student_acceptance: true,
    contact: "",
    notes: "",
};

export const AddHospitalModal = ({
    isOpen,
    onClose,
    onSubmit,
    centerId,
}: AddHospitalModalProps) => {
    const [formData, setFormData] = useState(EMPTY_FORM);

    useEffect(() => {
        if (isOpen) setFormData(EMPTY_FORM);
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        tap();
        onSubmit({ ...formData, exam_center_id: centerId });
    };

    const isValid = formData.hospital_name.trim().length > 0;

    return (
        <CenteredModal
            open={isOpen}
            onClose={onClose}
            title="Add hospital"
            subtitle="Help students find care facilities"
            maxWidthClass="max-w-md"
            maxHeight="92dvh"
            footer={
                <div className="px-4 py-3">
                    <button
                        type="submit"
                        form="add-hospital-form"
                        disabled={!isValid}
                        className={`w-full h-11 rounded-xl
                                    text-sm font-bold
                                    flex items-center justify-center gap-2
                                    transition-transform
                                    ${isValid
                                ? "bg-rose-600 text-white active:scale-[0.97]"
                                : "bg-slate-200 dark:bg-white/[0.08] text-slate-400 dark:text-slate-500 cursor-not-allowed"
                            }`}
                        style={{ touchAction: "manipulation" }}
                    >
                        <Save className="h-4 w-4" />
                        Save facility
                    </button>
                </div>
            }
        >
            <form
                id="add-hospital-form"
                onSubmit={handleSubmit}
                className="px-4 py-4 space-y-3"
            >
                {/* Hospital name */}
                <Field label="Hospital name" required>
                    <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2
                                              h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            required
                            type="text"
                            placeholder="e.g. Mater Hospital"
                            value={formData.hospital_name}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    hospital_name: e.target.value,
                                })
                            }
                            className="w-full h-11 rounded-xl border-0 outline-none
                                       bg-slate-50 dark:bg-[#0d1117]
                                       pl-10 pr-3.5 text-sm
                                       text-slate-900 dark:text-white
                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                       focus:ring-2 focus:ring-rose-500/40"
                            style={{ touchAction: "manipulation" }}
                        />
                    </div>
                </Field>

                {/* Location + Distance */}
                <div className="grid grid-cols-2 gap-2">
                    <Field label="Location">
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2
                                              h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Area/street"
                                value={formData.location}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        location: e.target.value,
                                    })
                                }
                                className="w-full h-11 rounded-xl border-0 outline-none
                                           bg-slate-50 dark:bg-[#0d1117]
                                           pl-9 pr-3 text-sm
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           focus:ring-2 focus:ring-rose-500/40"
                                style={{ touchAction: "manipulation" }}
                            />
                        </div>
                    </Field>

                    <Field label="Distance">
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2
                                             h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="e.g. 5 mins"
                                value={formData.distance}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        distance: e.target.value,
                                    })
                                }
                                className="w-full h-11 rounded-xl border-0 outline-none
                                           bg-slate-50 dark:bg-[#0d1117]
                                           pl-9 pr-3 text-sm
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           focus:ring-2 focus:ring-rose-500/40"
                                style={{ touchAction: "manipulation" }}
                            />
                        </div>
                    </Field>
                </div>

                {/* Category + Phone */}
                <div className="grid grid-cols-2 gap-2">
                    <Field label="Category">
                        <Select
                            value={formData.hospital_type}
                            onValueChange={(v) => {
                                tap();
                                setFormData({ ...formData, hospital_type: v });
                            }}
                        >
                            <SelectTrigger
                                className="h-11 rounded-xl border-0
                                           bg-slate-50 dark:bg-[#0d1117]
                                           text-sm font-semibold
                                           text-slate-900 dark:text-white
                                           px-3
                                           focus:ring-2 focus:ring-rose-500/40"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent
                                className="rounded-xl
                                           bg-white dark:bg-[#161b22]
                                           border-slate-200/70 dark:border-white/[0.06]"
                            >
                                <SelectItem
                                    value="Public"
                                    className="text-[13px] font-semibold"
                                >
                                    Public
                                </SelectItem>
                                <SelectItem
                                    value="Private"
                                    className="text-[13px] font-semibold"
                                >
                                    Private
                                </SelectItem>
                                <SelectItem
                                    value="Mission"
                                    className="text-[13px] font-semibold"
                                >
                                    Mission
                                </SelectItem>
                                <SelectItem
                                    value="Clinic"
                                    className="text-[13px] font-semibold"
                                >
                                    Clinic
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field label="Phone">
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2
                                             h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                            <input
                                type="tel"
                                inputMode="tel"
                                placeholder="0712…"
                                value={formData.contact}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        contact: e.target.value,
                                    })
                                }
                                className="w-full h-11 rounded-xl border-0 outline-none
                                           bg-slate-50 dark:bg-[#0d1117]
                                           pl-9 pr-3 text-sm tabular-nums
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           focus:ring-2 focus:ring-rose-500/40"
                                style={{ touchAction: "manipulation" }}
                            />
                        </div>
                    </Field>
                </div>

                {/* Departments */}
                <Field
                    label="Available departments"
                    hint="Comma-separated"
                >
                    <div className="relative">
                        <Stethoscope className="absolute left-3.5 top-1/2 -translate-y-1/2
                                               h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="e.g. Maternity, OPD, Pediatrics"
                            value={formData.department_availability}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    department_availability: e.target.value,
                                })
                            }
                            className="w-full h-11 rounded-xl border-0 outline-none
                                       bg-slate-50 dark:bg-[#0d1117]
                                       pl-10 pr-3.5 text-sm
                                       text-slate-900 dark:text-white
                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                       focus:ring-2 focus:ring-rose-500/40"
                            style={{ touchAction: "manipulation" }}
                        />
                    </div>
                </Field>

                {/* Student acceptance toggle */}
                <button
                    type="button"
                    role="switch"
                    aria-checked={formData.student_acceptance}
                    onClick={() => {
                        tap();
                        setFormData({
                            ...formData,
                            student_acceptance: !formData.student_acceptance,
                        });
                    }}
                    className={`w-full flex items-center justify-between gap-3
                                p-2.5 rounded-xl
                                transition-colors
                                ${formData.student_acceptance
                            ? "bg-emerald-50 dark:bg-emerald-400/10"
                            : "bg-slate-50 dark:bg-[#0d1117]"
                        }`}
                    style={{ touchAction: "manipulation" }}
                >
                    <div className="flex items-center gap-2.5 min-w-0 text-left">
                        <CheckCircle2
                            className={`h-4 w-4 shrink-0 ${formData.student_acceptance
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-slate-400 dark:text-slate-500"
                                }`}
                            strokeWidth={2.25}
                        />
                        <div className="min-w-0">
                            <p
                                className={`text-[12px] font-bold leading-tight ${formData.student_acceptance
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-slate-900 dark:text-white"
                                    }`}
                            >
                                Student friendly
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Facility accepts nursing students
                            </p>
                        </div>
                    </div>

                    {/* Toggle — same pattern as composer */}
                    <span
                        className={`relative inline-flex shrink-0 items-center
                                    h-6 w-11 rounded-full transition-colors
                                    ${formData.student_acceptance
                                ? "bg-emerald-600"
                                : "bg-slate-200 dark:bg-white/[0.12]"
                            }`}
                    >
                        <span
                            className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm
                                        transform transition-transform duration-200 ease-out
                                        ${formData.student_acceptance
                                    ? "translate-x-[22px]"
                                    : "translate-x-[2px]"
                                }`}
                        />
                    </span>
                </button>

                {/* Notes */}
                <Field label="Additional notes">
                    <div className="relative">
                        <MessageSquare className="absolute left-3.5 top-2.5
                                                 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <textarea
                            rows={3}
                            placeholder="e.g. Fast service, expensive, great for skills practice…"
                            value={formData.notes}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    notes: e.target.value,
                                })
                            }
                            className="w-full rounded-xl border-0 outline-none resize-none
                                       bg-slate-50 dark:bg-[#0d1117]
                                       pl-10 pr-3.5 py-2.5 text-sm
                                       text-slate-900 dark:text-white
                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                       focus:ring-2 focus:ring-rose-500/40"
                            style={{ touchAction: "manipulation" }}
                        />
                    </div>
                </Field>
            </form>
        </CenteredModal>
    );
};

/* ------------------------------------------------------------------ */
/*  Field                                                             */
/* ------------------------------------------------------------------ */

function Field({
    label,
    required,
    hint,
    children,
}: {
    label: string;
    required?: boolean;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="flex items-center gap-1
                              text-[10px] font-bold uppercase tracking-wider
                              text-slate-500 dark:text-slate-400">
                {label}
                {required && (
                    <span className="text-rose-500 dark:text-rose-400 normal-case tracking-normal">
                        *
                    </span>
                )}
            </label>
            {children}
            {hint && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                    {hint}
                </p>
            )}
        </div>
    );
}