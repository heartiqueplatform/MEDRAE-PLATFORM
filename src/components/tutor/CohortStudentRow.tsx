// components/tutor/CohortStudentRow.tsx
import { useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { tap } from "@/lib/tutor/tap";

export interface CohortStudent {
    student_id: string;
    name: string | null;
    username: string | null;
    avatar_url: string | null;
}

interface CohortStudentRowProps {
    student: CohortStudent;
    onOpen: (student: CohortStudent) => void;
    onRemove: (student: CohortStudent) => void;
}

export function CohortStudentRow({
    student,
    onOpen,
    onRemove,
}: CohortStudentRowProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirming, setConfirming] = useState(false);

    const initials = (student.name || student.username || "?")
        .split(" ")
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const close = () => {
        setMenuOpen(false);
        setConfirming(false);
    };

    return (
        <div className="bg-white dark:bg-[#161b22] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 p-3">
                <button
                    onClick={() => {
                        tap();
                        onOpen(student);
                    }}
                    className="flex-1 min-w-0 flex items-center gap-3 text-left active:opacity-70"
                    style={{ touchAction: "manipulation" }}
                >
                    <Avatar className="h-9 w-9 shrink-0">
                        {student.avatar_url ? (
                            <img
                                src={student.avatar_url}
                                alt={student.name || ""}
                                className="h-full w-full object-cover"
                                loading="lazy"
                            />
                        ) : (
                            <AvatarFallback className="bg-slate-200 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 text-xs font-bold">
                                {initials}
                            </AvatarFallback>
                        )}
                    </Avatar>
                    <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {student.name || student.username || "Unnamed"}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            @{student.username || "unknown"}
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => {
                        tap();
                        setMenuOpen((v) => !v);
                    }}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 active:bg-slate-100 dark:active:bg-white/5"
                    style={{ touchAction: "manipulation" }}
                    aria-label="Student actions"
                >
                    <MoreHorizontal className="h-4 w-4" strokeWidth={2.5} />
                </button>
            </div>

            {menuOpen && !confirming && (
                <div className="border-t border-slate-100 dark:border-white/[0.04]">
                    <button
                        onClick={() => {
                            tap();
                            setConfirming(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-rose-600 dark:text-rose-400 active:bg-rose-500/5"
                        style={{ touchAction: "manipulation" }}
                    >
                        <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                            Remove from cohort
                        </span>
                    </button>
                </div>
            )}

            {confirming && (
                <div className="border-t border-slate-100 dark:border-white/[0.04] p-3 flex items-center gap-2">
                    <p className="flex-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Remove {student.name || "this student"}?
                    </p>
                    <button
                        onClick={close}
                        className="h-8 px-3 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 active:bg-slate-100 dark:active:bg-white/5"
                        style={{ touchAction: "manipulation" }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            tap();
                            onRemove(student);
                            close();
                        }}
                        className="h-8 px-3 rounded-lg text-[11px] font-bold bg-rose-600 text-white active:scale-[0.97]"
                        style={{ touchAction: "manipulation" }}
                    >
                        Remove
                    </button>
                </div>
            )}
        </div>
    );
}