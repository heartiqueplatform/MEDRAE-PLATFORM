// components/tutor/TutorHeader.tsx
import { Flame } from "lucide-react";

interface TutorHeaderProps {
    name: string;
    classCount: number;
    studentCount: number;
    streak: number;
}

function greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

export function TutorHeader({
    name,
    classCount,
    studentCount,
    streak,
}: TutorHeaderProps) {
    return (
        <header className="shrink-0 bg-transparent backdrop-blur-xl border-b border-slate-200/70 dark:border-white/[0.06] z-30">
            <div className="flex items-center px-4 h-14">
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate text-slate-900 dark:text-white">
                        {greeting()}, {name || "Tutor"}
                    </h1>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        <span className="truncate">
                            {classCount} {classCount === 1 ? "class" : "classes"} ·{" "}
                            {studentCount} {studentCount === 1 ? "student" : "students"}
                        </span>
                        {streak > 0 && (
                            <span className="inline-flex items-center gap-0.5 shrink-0 text-amber-600 dark:text-amber-400 font-semibold">
                                <Flame className="h-3 w-3" strokeWidth={2.5} />
                                {streak}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}