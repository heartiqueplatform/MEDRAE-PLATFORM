// components/tutor/CreateClassSheet.tsx
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { tap, tapSuccess, tapError } from "@/lib/tutor/tap";
import { CenteredModal } from "@/components/ui/CenteredModal";
import { SelectField } from "@/components/ui/SelectField";
import type { ClassRowData } from "./ClassRow";

interface CreateClassSheetProps {
    open: boolean;
    tutorId: string;
    editing: ClassRowData | null;
    onClose: () => void;
    onSaved: () => void;
}

const inputCls =
    "w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0d1117] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30";

const labelCls =
    "text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400";

const SEMESTER_OPTIONS = [
    { value: "1", label: "Semester 1" },
    { value: "2", label: "Semester 2" },
];

const YEAR_OPTIONS = [
    { value: "1", label: "Year 1" },
    { value: "2", label: "Year 2" },
    { value: "3", label: "Year 3" },
    { value: "4", label: "Year 4" },
];

export function CreateClassSheet({
    open,
    tutorId,
    editing,
    onClose,
    onSaved,
}: CreateClassSheetProps) {
    const [block, setBlock] = useState("");
    const [year, setYear] = useState(1);
    const [semester, setSemester] = useState(1);
    const [className, setClassName] = useState("");
    const [description, setDescription] = useState("");
    const [maxStudents, setMaxStudents] = useState(50);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (editing) {
            setBlock(editing.block);
            setYear(editing.year);
            setSemester(editing.semester);
            setClassName(editing.class_name || "");
            setMaxStudents(50);
            setDescription("");
        } else {
            setBlock("");
            setYear(1);
            setSemester(1);
            setClassName("");
            setDescription("");
            setMaxStudents(50);
        }
    }, [open, editing]);

    const handleSubmit = async () => {
        if (!block.trim()) {
            toast.error("Block is required");
            tapError();
            return;
        }
        setLoading(true);
        try {
            const payload = {
                block: block.trim().toUpperCase(),
                year,
                semester,
                class_name:
                    className.trim() ||
                    `Class ${block.trim().toUpperCase()} · Y${year} S${semester}`,
                max_students: maxStudents,
            };

            if (editing) {
                const { error } = await supabase
                    .from("tutor_classes")
                    .update({ ...payload, updated_at: new Date().toISOString() })
                    .eq("id", editing.id)
                    .eq("tutor_id", tutorId);
                if (error) throw error;
                toast.success("Class updated");
            } else {
                const { error } = await supabase.from("tutor_classes").insert({
                    tutor_id: tutorId,
                    ...payload,
                    description: description.trim() || undefined,
                    is_active: true,
                });
                if (error) throw error;
                toast.success("Class created");
            }
            tapSuccess();
            onSaved();
            onClose();
        } catch (e: any) {
            tapError();
            toast.error(e?.message || "Failed to save class");
        } finally {
            setLoading(false);
        }
    };

    const footer = (
        <div className="flex gap-2">
            <button
                onClick={() => {
                    tap();
                    onClose();
                }}
                disabled={loading}
                className="flex-1 h-10 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 active:bg-slate-100 dark:active:bg-white/5 disabled:opacity-50"
                style={{ touchAction: "manipulation" }}
            >
                Cancel
            </button>
            <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-[2] h-10 rounded-xl bg-emerald-600 text-white text-sm font-bold active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ touchAction: "manipulation" }}
            >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save" : "Create class"}
            </button>
        </div>
    );

    return (
        <CenteredModal
            open={open}
            onClose={onClose}
            title={editing ? "Edit class" : "New class"}
            subtitle={
                editing ? "Update class details" : "Set up a class for your students"
            }
            locked={loading}
            footer={footer}
        >
            <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className={labelCls}>Block *</label>
                        <input
                            className={inputCls}
                            placeholder="e.g. A1"
                            value={block}
                            onChange={(e) => setBlock(e.target.value)}
                            style={{ touchAction: "manipulation" }}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className={labelCls}>Semester</label>
                        <SelectField
                            value={String(semester)}
                            onValueChange={(v) => setSemester(Number(v))}
                            options={SEMESTER_OPTIONS}
                            ariaLabel="Semester"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className={labelCls}>Year</label>
                    <SelectField
                        value={String(year)}
                        onValueChange={(v) => setYear(Number(v))}
                        options={YEAR_OPTIONS}
                        ariaLabel="Year"
                    />
                </div>

                <div className="space-y-1">
                    <label className={labelCls}>Class name (optional)</label>
                    <input
                        className={inputCls}
                        placeholder="e.g. NCK Prep A"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        style={{ touchAction: "manipulation" }}
                    />
                </div>

                {!editing && (
                    <div className="space-y-1">
                        <label className={labelCls}>Description (optional)</label>
                        <textarea
                            className={`${inputCls} h-20 py-2 resize-none`}
                            placeholder="What this class covers…"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={{ touchAction: "manipulation" }}
                        />
                    </div>
                )}

                <div className="space-y-1">
                    <label className={labelCls}>Max students</label>
                    <input
                        type="number"
                        min={1}
                        max={200}
                        className={inputCls}
                        value={maxStudents}
                        onChange={(e) => setMaxStudents(Number(e.target.value))}
                        style={{ touchAction: "manipulation" }}
                    />
                </div>
            </div>
        </CenteredModal>
    );
}