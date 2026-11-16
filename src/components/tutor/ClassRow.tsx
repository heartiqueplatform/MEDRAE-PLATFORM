// components/tutor/ClassRow.tsx
import { useState } from "react";
import { MoreHorizontal, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { cohortColor } from "@/lib/tutor/colors";
import { tap } from "@/lib/tutor/tap";

export interface ClassRowData {
    id: string;
    block: string;
    year: number;
    semester: number;
    class_name?: string | null;
    student_count?: number;
}

interface ClassRowProps {
    cls: ClassRowData;
    onMessage: (cls: ClassRowData) => void;
    onEdit: (cls: ClassRowData) => void;
    onDelete: (cls: ClassRowData) => void;
    onOpen?: (cls: ClassRowData) => void;
}

export function ClassRow({ cls, onMessage, onEdit, onDelete, onOpen }: ClassRowProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const color = cohortColor(cls.block, cls.year, cls.semester);
    const count = cls.student_count ?? 0;

    const close = () => {
        setMenuOpen(false);
        setConfirmDelete(false);
    };

    return (
        <div className="bg-white dark:bg-[#161b22] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 p-3">
                <button
                    onClick={() => {
                        tap();
                        onOpen?.(cls);
                    }}
                    className="flex-1 min-w-0 flex items-center gap-3 text-left active:opacity-70"
                    style={{ touchAction: "manipulation" }}
                >
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${color.dot}`} />
                    <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {cls.class_name || `Block ${cls.block}`}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            Block {cls.block} · Y{cls.year} S{cls.semester}
                        </div>
                    </div>
                </button>

                <span
                    className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${color.chip}`}
                >
                    {count}
                </span>

                <button
                    onClick={() => {
                        tap();
                        setMenuOpen((v) => !v);
                    }}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 active:bg-slate-100 dark:active:bg-white/5"
                    style={{ touchAction: "manipulation" }}
                    aria-label="Class actions"
                >
                    <MoreHorizontal className="h-4 w-4" strokeWidth={2.5} />
                </button>
            </div>

            {menuOpen && !confirmDelete && (
                <div className="grid grid-cols-3 border-t border-slate-100 dark:border-white/[0.04]">
                    <MenuBtn
                        icon={<MessageCircle className="h-4 w-4" strokeWidth={2.5} />}
                        label="Message"
                        onClick={() => {
                            close();
                            onMessage(cls);
                        }}
                    />
                    <MenuBtn
                        icon={<Pencil className="h-4 w-4" strokeWidth={2.5} />}
                        label="Edit"
                        onClick={() => {
                            close();
                            onEdit(cls);
                        }}
                    />
                    <MenuBtn
                        icon={<Trash2 className="h-4 w-4" strokeWidth={2.5} />}
                        label="Delete"
                        danger
                        onClick={() => {
                            tap();
                            setConfirmDelete(true);
                        }}
                    />
                </div>
            )}

            {confirmDelete && (
                <div className="border-t border-slate-100 dark:border-white/[0.04] p-3 flex items-center gap-2">
                    <p className="flex-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Delete this class and remove its students?
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
                            onDelete(cls);
                            close();
                        }}
                        className="h-8 px-3 rounded-lg text-[11px] font-bold bg-rose-600 text-white active:scale-[0.97]"
                        style={{ touchAction: "manipulation" }}
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}

function MenuBtn({
    icon,
    label,
    onClick,
    danger,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    danger?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-1 py-2.5 active:bg-slate-50 dark:active:bg-white/[0.03] ${danger ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-300"
                }`}
            style={{ touchAction: "manipulation" }}
        >
            {icon}
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </button>
    );
}