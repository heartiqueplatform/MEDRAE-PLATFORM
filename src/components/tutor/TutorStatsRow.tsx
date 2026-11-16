// components/tutor/TutorStatsRow.tsx
import { Flame, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { tap } from "@/lib/tutor/tap";

interface StatCardProps {
    icon: React.ReactNode;
    value: number | string;
    label: string;
    hint?: string;
    onClick?: () => void;
}

function StatCard({ icon, value, label, hint, onClick }: StatCardProps) {
    return (
        <button
            onClick={() => {
                tap();
                onClick?.();
            }}
            className="flex-1 text-left bg-white dark:bg-[#161b22] rounded-2xl p-3 active:scale-[0.98] transition-transform"
            style={{ touchAction: "manipulation" }}
        >
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {label}
                </span>
                {icon}
            </div>
            <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white leading-none">
                {value}
            </div>
            {hint && (
                <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {hint}
                </div>
            )}
        </button>
    );
}

interface TutorStatsRowProps {
    streak: number;
    bestStreak: number;
    studentCount: number;
}

export function TutorStatsRow({
    streak,
    bestStreak,
    studentCount,
}: TutorStatsRowProps) {
    const navigate = useNavigate();

    return (
        <div className="flex gap-2">
            <StatCard
                icon={<Flame className="h-4 w-4 text-amber-500" strokeWidth={2.5} />}
                value={`${streak} ${streak === 1 ? "day" : "days"}`}
                label="Streak"
                hint={`Best: ${bestStreak} ${bestStreak === 1 ? "day" : "days"}`}
            />
            <StatCard
                icon={
                    <Users
                        className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                        strokeWidth={2.5}
                    />
                }
                value={studentCount}
                label="Students"
                hint="Across your cohorts"
                onClick={() => navigate("/dashboard/tutor/students")}
            />
        </div>
    );
}