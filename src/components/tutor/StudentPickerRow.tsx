// components/tutor/StudentPickerRow.tsx
import { Check } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { tap } from "@/lib/tutor/tap";

export interface PickableStudent {
    user_id: string;
    name: string | null;
    username: string | null;
    institution: string | null;
    course: string | null;
    block: string | null;
    avatar_url: string | null;
}

interface StudentPickerRowProps {
    student: PickableStudent;
    selected: boolean;
    disabled?: boolean; // already in this class
    onToggle: (s: PickableStudent) => void;
}

export function StudentPickerRow({
    student,
    selected,
    disabled,
    onToggle,
}: StudentPickerRowProps) {
    const initials = (student.name || student.username || "?")
        .split(" ")
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return (
        <button
            onClick={() => {
                if (disabled) return;
                tap();
                onToggle(student);
            }}
            disabled={disabled}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left active:scale-[0.99] transition-transform ${disabled
                ? "bg-slate-50 dark:bg-white/[0.02] border-slate-200/40 dark:border-white/[0.03] opacity-50"
                : selected
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-white dark:bg-[#161b22] border-slate-200/60 dark:border-white/[0.06]"
                }`}
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

            <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {student.name || student.username || "Unnamed"}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {[
                        student.course,
                        student.block ? `Block ${student.block}` : null,
                    ]
                        .filter(Boolean)
                        .join(" · ") || student.institution || "—"}
                </div>
            </div>

            <div
                className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${selected
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-300 dark:border-white/20"
                    }`}
            >
                {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </div>
        </button>
    );
}