// components/tutor/ClassList.tsx
import { Plus, School } from "lucide-react";
import { ClassRow, type ClassRowData } from "./ClassRow";
import { tap } from "@/lib/tutor/tap";

interface ClassListProps {
    classes: ClassRowData[];
    loading: boolean;
    onNew: () => void;
    onMessage: (cls: ClassRowData) => void;
    onEdit: (cls: ClassRowData) => void;
    onDelete: (cls: ClassRowData) => void;
    onOpen?: (cls: ClassRowData) => void;
}

export function ClassList({
    classes,
    loading,
    onNew,
    onMessage,
    onEdit,
    onDelete,
    onOpen,
}: ClassListProps) {
    return (
        <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    My Classes
                </h2>
                <button
                    onClick={() => {
                        tap();
                        onNew();
                    }}
                    className="h-7 px-2.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 active:scale-[0.97]"
                    style={{ touchAction: "manipulation" }}
                >
                    <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                    New
                </button>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[0, 1].map((i) => (
                        <div
                            key={i}
                            className="h-14 rounded-2xl p-3 bg-white dark:bg-[#161b22] flex items-center gap-3 animate-pulse"
                        >
                            <div className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3 w-32 rounded bg-slate-200 dark:bg-white/[0.06]" />
                                <div className="h-2.5 w-24 rounded bg-slate-200 dark:bg-white/[0.06]" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : classes.length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center">
                    <School
                        className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2"
                        strokeWidth={1.5}
                    />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        No classes yet
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Create a class to start adding students
                    </p>
                    <button
                        onClick={() => {
                            tap();
                            onNew();
                        }}
                        className="mt-3 h-9 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold active:scale-[0.97]"
                        style={{ touchAction: "manipulation" }}
                    >
                        Create Class
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {classes.map((c) => (
                        <ClassRow
                            key={c.id}
                            cls={c}
                            onMessage={onMessage}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onOpen={onOpen}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}