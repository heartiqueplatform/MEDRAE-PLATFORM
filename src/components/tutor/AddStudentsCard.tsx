// components/tutor/AddStudentsCard.tsx
import { useState } from "react";
import { ChevronRight, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { StudentPickerSheet } from "./StudentPickerSheet";
import type { PickableStudent } from "./StudentPickerRow";
import type { ClassRowData } from "./ClassRow";
import { tap, tapSuccess, tapError } from "@/lib/tutor/tap";
import { cacheInvalidate } from "@/lib/tutor/cache";
import { CenteredModal } from "@/components/ui/CenteredModal";

interface AddStudentsCardProps {
    tutorId: string;
    institution: string | null;
    classes: ClassRowData[];
    /** map of class_id -> Set(student_id) already in that class */
    membershipByClass: Map<string, Set<string>>;
    onInstitutionChanged?: (slug: string) => void;
    onAdded: () => void;
}

export function AddStudentsCard({
    tutorId,
    institution,
    classes,
    membershipByClass,
    onInstitutionChanged,   // ← was missing from destructure
    onAdded,
}: AddStudentsCardProps) {
    const [pickClassOpen, setPickClassOpen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [activeClass, setActiveClass] = useState<ClassRowData | null>(null);
    const [selected, setSelected] = useState<PickableStudent[]>([]);
    const [saving, setSaving] = useState(false);

    const startForClass = (cls: ClassRowData) => {
        tap();
        setActiveClass(cls);
        setSelected([]);
        setPickClassOpen(false);
        setPickerOpen(true);
    };

    const handleConfirm = async () => {
        if (!activeClass || selected.length === 0) {
            setPickerOpen(false);
            return;
        }
        setPickerOpen(false);
        setSaving(true);
        try {
            const inserts = selected.map((s) => ({
                tutor_id: tutorId,
                student_id: s.user_id,
                block: activeClass.block,
                year: activeClass.year,
                semester: activeClass.semester,
            }));

            const { error } = await supabase.from("tutor_students").insert(inserts);
            if (error) throw error;

            // welcome announcement — best-effort, don't block on failure
            supabase
                .from("cohort_messages")
                .insert({
                    tutor_id: tutorId,
                    block: activeClass.block,
                    year: activeClass.year,
                    semester: activeClass.semester,
                    message: `👋 Welcome to ${activeClass.class_name || `Block ${activeClass.block}`
                        }! ${selected.length} new student${selected.length > 1 ? "s" : ""
                        } joined.`,
                })
                .then(({ error: e }) => {
                    if (e) console.warn("welcome message failed", e);
                });

            cacheInvalidate("class:");
            tapSuccess();
            toast.success(
                `${selected.length} student${selected.length > 1 ? "s" : ""} added`
            );
            setSelected([]);
            setActiveClass(null);
            onAdded();
        } catch (e: any) {
            tapError();
            toast.error(e?.message || "Failed to add students");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <section className="space-y-2">
                <h2 className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Add Students
                </h2>

                <button
                    onClick={() => {
                        if (classes.length === 0) {
                            toast.error("Create a class first");
                            return;
                        }
                        tap();
                        setPickClassOpen(true);
                    }}
                    disabled={saving}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#161b22] active:scale-[0.99] transition-transform text-left disabled:opacity-60"
                    style={{ touchAction: "manipulation" }}
                >
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        {saving ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <UserPlus className="h-5 w-5" strokeWidth={2.5} />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            Add students to a class
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            Pick a class, then select students
                        </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" strokeWidth={2.5} />
                </button>
            </section>

            {/* Class picker — CenteredModal */}
            <CenteredModal
                open={pickClassOpen}
                onClose={() => setPickClassOpen(false)}
                title="Choose a class"
                subtitle="Students you add will join this class"
            >
                <div className="p-3 space-y-2">
                    {classes.length === 0 ? (
                        <div className="text-center py-6 text-sm text-slate-500 dark:text-slate-400">
                            No classes yet
                        </div>
                    ) : (
                        classes.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => startForClass(c)}
                                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#0d1117] active:scale-[0.99] transition-transform text-left"
                                style={{ touchAction: "manipulation" }}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                        {c.class_name || `Block ${c.block}`}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Block {c.block} · Y{c.year} S{c.semester} ·{" "}
                                        {c.student_count ?? 0} students
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-400" strokeWidth={2.5} />
                            </button>
                        ))
                    )}
                </div>
            </CenteredModal>

            {/* Student picker */}
            <StudentPickerSheet
                open={pickerOpen}
                institution={institution}
                alreadyInClass={
                    activeClass
                        ? membershipByClass.get(activeClass.id) ?? new Set()
                        : new Set()
                }
                selected={selected}
                onSelectedChange={setSelected}
                onInstitutionChanged={onInstitutionChanged}
                onClose={() => {
                    setPickerOpen(false);
                    if (selected.length > 0) handleConfirm();
                    else setActiveClass(null);
                }}
            />
        </>
    );
}