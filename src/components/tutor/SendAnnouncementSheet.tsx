// components/tutor/SendAnnouncementSheet.tsx
import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { tap, tapSuccess, tapError } from "@/lib/tutor/tap";
import { CenteredModal } from "@/components/ui/CenteredModal";
import { cohortColor } from "@/lib/tutor/colors";
import type { ClassRowData } from "./ClassRow";

interface SendAnnouncementSheetProps {
    open: boolean;
    tutorId: string;
    /** Preselected class (ClassRow → Message). If null, tutor picks from `classes`. */
    cls: ClassRowData | null;
    /** Used only when cls is null — lets the tutor pick a cohort in-sheet. */
    classes: ClassRowData[];
    onClose: () => void;
    onSent: () => void;
}

export function SendAnnouncementSheet({
    open,
    tutorId,
    cls,
    classes,
    onClose,
    onSent,
}: SendAnnouncementSheetProps) {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [pickedClassId, setPickedClassId] = useState<string>("");

    // Effective target — preselected class wins, else whatever the tutor picked
    const activeClass: ClassRowData | null = useMemo(() => {
        if (cls) return cls;
        return classes.find((c) => c.id === pickedClassId) ?? null;
    }, [cls, classes, pickedClassId]);

    // Reset on open; default the picker to the first class for one-tap send
    useEffect(() => {
        if (!open) return;
        setMessage("");
        if (!cls && classes.length > 0) {
            setPickedClassId(classes[0].id);
        } else {
            setPickedClassId("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, cls?.id]);

    const handleSend = async () => {
        if (!activeClass) {
            toast.error("Choose a cohort first");
            tapError();
            return;
        }
        if (!message.trim()) {
            toast.error("Write a message first");
            tapError();
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.from("cohort_messages").insert({
                tutor_id: tutorId,
                block: activeClass.block,
                year: activeClass.year,
                semester: activeClass.semester,
                message: message.trim(),
            });
            if (error) throw error;
            tapSuccess();
            toast.success("Announcement sent");
            onSent();
            onClose();
        } catch (e: any) {
            tapError();
            toast.error(e?.message || "Failed to send");
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
                onClick={handleSend}
                disabled={loading || !message.trim() || !activeClass}
                className="flex-[2] h-10 rounded-xl bg-violet-600 text-white text-sm font-bold active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ touchAction: "manipulation" }}
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Send className="h-4 w-4" strokeWidth={2.5} />
                )}
                Send
            </button>
        </div>
    );

    const subtitle = cls
        ? `To: ${cls.class_name || `Block ${cls.block}`}`
        : classes.length === 0
            ? "Create a class first to send announcements"
            : "Pick a cohort, write a message";

    return (
        // 🔑 No `!!cls` guard — `open` is the single source of truth
        <CenteredModal
            open={open}
            onClose={onClose}
            title="Send announcement"
            subtitle={subtitle}
            locked={loading}
            footer={footer}
        >
            <div className="p-4 space-y-3">
                {/* Cohort picker — only in compose mode */}
                {!cls && classes.length > 0 && (
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Cohort
                        </p>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                            {classes.map((c) => {
                                const color = cohortColor(c.block, c.year, c.semester);
                                const selected = c.id === pickedClassId;
                                return (
                                    <button
                                        key={c.id}
                                        onClick={() => {
                                            tap();
                                            setPickedClassId(c.id);
                                        }}
                                        className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-left active:scale-[0.99] transition-transform ${selected
                                            ? "bg-violet-500/10 ring-1 ring-violet-500/30"
                                            : "bg-slate-50 dark:bg-[#0d1117]"
                                            }`}
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <span
                                            className={`h-2 w-2 rounded-full shrink-0 ${color.dot}`}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                {c.class_name || `Block ${c.block}`}
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                                Block {c.block} · Y{c.year} S{c.semester} ·{" "}
                                                {c.student_count ?? 0} students
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {classes.length === 0 && !cls && (
                    <div className="rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] px-3 py-2">
                        You need at least one class to send an announcement.
                    </div>
                )}

                {/* Info banner */}
                {activeClass && (
                    <div className="rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[11px] px-3 py-2">
                        This message goes to every student in{" "}
                        <span className="font-semibold">
                            {activeClass.class_name || `Block ${activeClass.block}`}
                        </span>
                        .
                    </div>
                )}

                <textarea
                    className="w-full h-28 p-3 rounded-xl bg-slate-50 dark:bg-[#0d1117] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    placeholder="Write your announcement…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{ touchAction: "manipulation" }}
                    autoFocus={!!cls}
                />
            </div>
        </CenteredModal>
    );
}