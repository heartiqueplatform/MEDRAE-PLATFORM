import React, { useState, useEffect } from "react";
import { Save, MapPin, Calendar } from "lucide-react";
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

interface AddCenterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData?: any;
}

const EMPTY_FORM = {
    name: "",
    county: "",
    town: "",
    venue_type: "School/College",
    map_link: "",
    notes: "",
};

export const AddCenterModal = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
}: AddCenterModalProps) => {
    const [formData, setFormData] = useState(EMPTY_FORM);

    useEffect(() => {
        if (initialData) {
            setFormData({ ...EMPTY_FORM, ...initialData });
        } else {
            setFormData(EMPTY_FORM);
        }
    }, [initialData, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        tap();
        onSubmit(formData);
    };

    const isValid =
        formData.name.trim().length > 0 && formData.county.trim().length > 0;

    return (
        <CenteredModal
            open={isOpen}
            onClose={onClose}
            title={initialData ? "Edit center" : "Add exam center"}
            subtitle={
                initialData
                    ? "Update venue details"
                    : "Help students find this venue"
            }
            maxWidthClass="max-w-md"
            maxHeight="90dvh"
            footer={
                <div className="px-4 py-3">
                    <button
                        type="submit"
                        form="add-center-form"
                        disabled={!isValid}
                        className={`w-full h-11 rounded-xl
                                    text-sm font-bold
                                    flex items-center justify-center gap-2
                                    transition-transform
                                    ${isValid
                                ? "bg-blue-600 text-white active:scale-[0.97]"
                                : "bg-slate-200 dark:bg-white/[0.08] text-slate-400 dark:text-slate-500 cursor-not-allowed"
                            }`}
                        style={{ touchAction: "manipulation" }}
                    >
                        <Save className="h-4 w-4" />
                        {initialData ? "Save changes" : "Add center"}
                    </button>
                </div>
            }
        >
            <form
                id="add-center-form"
                onSubmit={handleSubmit}
                className="px-4 py-4 space-y-3"
            >
                {/* Name */}
                <Field label="Center name" required>
                    <input
                        required
                        placeholder="e.g. KMTC Nairobi"
                        value={formData.name}
                        onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full h-11 rounded-xl border-0 outline-none
                                   bg-slate-50 dark:bg-[#0d1117]
                                   px-3.5 text-sm
                                   text-slate-900 dark:text-white
                                   placeholder:text-slate-400 dark:placeholder:text-slate-500
                                   focus:ring-2 focus:ring-blue-500/40"
                        style={{ touchAction: "manipulation" }}
                    />
                </Field>

                {/* County + Town */}
                <div className="grid grid-cols-2 gap-2">
                    <Field label="County" required>
                        <input
                            required
                            placeholder="e.g. Mombasa"
                            value={formData.county}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    county: e.target.value,
                                })
                            }
                            className="w-full h-11 rounded-xl border-0 outline-none
                                       bg-slate-50 dark:bg-[#0d1117]
                                       px-3.5 text-sm
                                       text-slate-900 dark:text-white
                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                       focus:ring-2 focus:ring-blue-500/40"
                            style={{ touchAction: "manipulation" }}
                        />
                    </Field>

                    <Field label="Town">
                        <input
                            placeholder="e.g. Nyali"
                            value={formData.town}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    town: e.target.value,
                                })
                            }
                            className="w-full h-11 rounded-xl border-0 outline-none
                                       bg-slate-50 dark:bg-[#0d1117]
                                       px-3.5 text-sm
                                       text-slate-900 dark:text-white
                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                       focus:ring-2 focus:ring-blue-500/40"
                            style={{ touchAction: "manipulation" }}
                        />
                    </Field>
                </div>

                {/* Venue type — custom Select */}
                <Field label="Venue type">
                    <Select
                        value={formData.venue_type}
                        onValueChange={(v) => {
                            tap();
                            setFormData({ ...formData, venue_type: v });
                        }}
                    >
                        <SelectTrigger
                            className="h-11 rounded-xl border-0
                                       bg-slate-50 dark:bg-[#0d1117]
                                       text-sm font-semibold
                                       text-slate-900 dark:text-white
                                       px-3
                                       focus:ring-2 focus:ring-blue-500/40"
                        >
                            <SelectValue placeholder="Choose venue type" />
                        </SelectTrigger>
                        <SelectContent
                            className="rounded-xl
                                       bg-white dark:bg-[#161b22]
                                       border-slate-200/70 dark:border-white/[0.06]"
                        >
                            <SelectItem
                                value="School/College"
                                className="text-[13px] font-semibold"
                            >
                                School / College
                            </SelectItem>
                            <SelectItem
                                value="Hospital Hall"
                                className="text-[13px] font-semibold"
                            >
                                Hospital hall
                            </SelectItem>
                            <SelectItem
                                value="Social Hall"
                                className="text-[13px] font-semibold"
                            >
                                Social hall
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </Field>

                {/* Map link */}
                <Field
                    label="Google Maps link"
                    hint="Optional — helps students find the venue"
                >
                    <input
                        type="url"
                        placeholder="https://maps.google.com/…"
                        value={formData.map_link}
                        onChange={(e) =>
                            setFormData({ ...formData, map_link: e.target.value })
                        }
                        className="w-full h-11 rounded-xl border-0 outline-none
                                   bg-slate-50 dark:bg-[#0d1117]
                                   px-3.5 text-sm
                                   text-slate-900 dark:text-white
                                   placeholder:text-slate-400 dark:placeholder:text-slate-500
                                   focus:ring-2 focus:ring-blue-500/40"
                        style={{ touchAction: "manipulation" }}
                    />
                </Field>

                {/* Notes */}
                <Field label="Notes" hint="Optional — additional information">
                    <textarea
                        rows={2}
                        placeholder="e.g. Enter via Gate B, Room 204"
                        value={formData.notes}
                        onChange={(e) =>
                            setFormData({ ...formData, notes: e.target.value })
                        }
                        className="w-full rounded-xl border-0 outline-none resize-none
                                   bg-slate-50 dark:bg-[#0d1117]
                                   px-3.5 py-2.5 text-sm
                                   text-slate-900 dark:text-white
                                   placeholder:text-slate-400 dark:placeholder:text-slate-500
                                   focus:ring-2 focus:ring-blue-500/40"
                        style={{ touchAction: "manipulation" }}
                    />
                </Field>
            </form>
        </CenteredModal>
    );
};

/* ------------------------------------------------------------------ */
/*  Field wrapper                                                     */
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