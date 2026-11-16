// components/tutor/CohortStudentList.tsx
import { useMemo } from "react";
import { GraduationCap } from "lucide-react";
import { CohortStudentRow, type CohortStudent } from "./CohortStudentRow";
import { cohortColor, cohortKey } from "@/lib/tutor/colors";

export interface LinkedStudent {
    id: string;
    student_id: string;
    block: string;
    year: number;
    semester: number;
    name: string | null;
    username: string | null;
    avatar_url: string | null;
}

interface CohortStudentListProps {
    linked: LinkedStudent[];
    loading: boolean;
    onOpenStudent: (student: CohortStudent) => void;
    onRemoveStudent: (student: CohortStudent) => void;
}

interface Group {
    key: string;
    block: string;
    year: number;
    semester: number;
    students: CohortStudent[];
}

export function CohortStudentList({
    linked,
    loading,
    onOpenStudent,
    onRemoveStudent,
}: CohortStudentListProps) {
    const groups = useMemo<Group[]>(() => {
        const map = new Map<string, Group>();
        for (const s of linked) {
            const key = cohortKey(s.block, s.year, s.semester);
            let g = map.get(key);
            if (!g) {
                g = { key, block: s.block, year: s.year, semester: s.semester, students: [] };
                map.set(key, g);
            }
            g.students.push({
                student_id: s.student_id,
                name: s.name,
                username: s.username,
                avatar_url: s.avatar_url,
            });
        }
        // stable ordering: year desc, semester desc, block asc
        return [...map.values()].sort(
            (a, b) =>
                b.year - a.year ||
                b.semester - a.semester ||
                a.block.localeCompare(b.block)
        );
    }, [linked]);

    return (
        <section className="space-y-2">
            <div className="px-1 flex items-center gap-1.5">
                <GraduationCap
                    className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400"
                    strokeWidth={2.5}
                />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Cohort Students
                </h2>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-14 rounded-2xl p-3 bg-white dark:bg-[#161b22] flex items-center gap-3 animate-pulse"
                        >
                            <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3 w-28 rounded bg-slate-200 dark:bg-white/[0.06]" />
                                <div className="h-2.5 w-20 rounded bg-slate-200 dark:bg-white/[0.06]" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : groups.length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center">
                    <GraduationCap
                        className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2"
                        strokeWidth={1.5}
                    />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        No students yet
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Add students to a class to see them here
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {groups.map((g) => {
                        const color = cohortColor(g.block, g.year, g.semester);
                        return (
                            <div key={g.key} className="space-y-2">
                                <div className="sticky top-0 z-10 -mx-1 px-1 py-1 bg-slate-50 dark:bg-[#0d1117]">
                                    <div className="flex items-center gap-2">
                                        <span className={`h-2 w-2 rounded-full ${color.dot}`} />
                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                            Block {g.block} · Y{g.year} S{g.semester}
                                        </span>
                                        <span
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color.chip}`}
                                        >
                                            {g.students.length}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {g.students.map((s) => (
                                        <CohortStudentRow
                                            key={s.student_id}
                                            student={s}
                                            onOpen={onOpenStudent}
                                            onRemove={onRemoveStudent}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}