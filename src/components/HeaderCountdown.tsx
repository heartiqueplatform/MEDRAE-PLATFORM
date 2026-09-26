// src/components/HeaderCountdown.tsx
"use client";

import { useEffect, useMemo, useState, memo } from "react";
import { Calendar } from "lucide-react";

interface CountdownPlan {
    id: string;
    exam_name: string;
    exam_date: string;
    is_active?: boolean;
    user_id?: string;
}

// ── Same universal exams as CountdownCards (kept local so this component
//    is fully self-contained and never pulls in a heavy page module). ──
const UNIVERSAL_EXAMS: CountdownPlan[] = [
    {
        id: "universal_1",
        exam_name: "KRCHN-Basic",
        exam_date: "2026-11-12",
        is_active: true,
    },
    {
        id: "universal_2",
        exam_name: "KRCHN-Basic",
        exam_date: "2027-05-20",
        is_active: true,
    },
];

const CUSTOM_EXAMS_CACHE_KEY = "custom_exams_cache_v4";
const HIDDEN_EXAMS_KEY = "hidden_exams_v4";

// ── Sync-safe reads. Both components share the SAME keys → they never drift. ──
const readCustomExams = (): CountdownPlan[] => {
    try {
        const raw = localStorage.getItem(CUSTOM_EXAMS_CACHE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed?.plans) ? parsed.plans : [];
    } catch {
        return [];
    }
};

const readHiddenExams = (): string[] => {
    try {
        const raw = localStorage.getItem(HIDDEN_EXAMS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

const computeTimeLeft = (examDate: string): TimeLeft | null => {
    const now = new Date();
    const startOfDay = new Date(examDate + "T00:00:00");
    const endOfDay = new Date(examDate + "T23:59:59");

    if (now < startOfDay) {
        const diff = startOfDay.getTime() - now.getTime();
        return {
            days: Math.floor(diff / 86400000),
            hours: Math.floor((diff / 3600000) % 24),
            minutes: Math.floor((diff / 60000) % 60),
            seconds: Math.floor((diff / 1000) % 60),
        };
    }
    if (now >= startOfDay && now <= endOfDay) {
        const diff = endOfDay.getTime() - now.getTime();
        return {
            days: 0,
            hours: Math.floor(diff / 3600000),
            minutes: Math.floor((diff / 60000) % 60),
            seconds: Math.floor((diff / 1000) % 60),
        };
    }
    return null; // past
};

const pickNextExam = (exams: CountdownPlan[]): CountdownPlan | null => {
    const now = new Date();
    const upcoming = exams
        .filter((e) => {
            const end = new Date(e.exam_date + "T23:59:59");
            return now <= end;
        })
        .sort(
            (a, b) =>
                new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
        );
    return upcoming[0] ?? null;
};

// ── One unit: "30D" — digit + letter, no background, no box ──
const Unit = memo(
    ({
        value,
        letter,
        isDark,
    }: {
        value: number;
        letter: string;
        isDark: boolean;
    }) => (
        <span
            className={`font-mono font-bold tabular-nums text-[11px] sm:text-[13px] tracking-tight ${isDark ? "text-white" : "text-slate-900"
                }`}
        >
            {String(value).padStart(2, "0")}
            <span
                className={`font-sans font-black ml-[1px] ${isDark ? "text-blue-400" : "text-blue-600"
                    }`}
            >
                {letter}
            </span>
        </span>
    )
);
Unit.displayName = "Unit";

const Sep = ({ isDark }: { isDark: boolean }) => (
    <span
        className={`text-[10px] font-bold ${isDark ? "text-slate-600" : "text-slate-400"
            }`}
    >
        :
    </span>
);

export const HeaderCountdown = memo(function HeaderCountdown({
    isDark,
}: {
    isDark: boolean;
}) {
    const [exams, setExams] = useState<CountdownPlan[]>(() => {
        if (typeof window === "undefined") return UNIVERSAL_EXAMS;
        const hidden = readHiddenExams();
        return [...UNIVERSAL_EXAMS, ...readCustomExams()].filter(
            (e) => !hidden.includes(e.id)
        );
    });
    const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

    // Sync when CountdownCards writes to cache / hides an exam.
    useEffect(() => {
        const reload = () => {
            const hidden = readHiddenExams();
            setExams(
                [...UNIVERSAL_EXAMS, ...readCustomExams()].filter(
                    (e) => !hidden.includes(e.id)
                )
            );
        };
        window.addEventListener("storage", reload);
        window.addEventListener("focus", reload);
        window.addEventListener("exam-cache-updated", reload as EventListener);
        return () => {
            window.removeEventListener("storage", reload);
            window.removeEventListener("focus", reload);
            window.removeEventListener(
                "exam-cache-updated",
                reload as EventListener
            );
        };
    }, []);

    const nextExam = useMemo(() => pickNextExam(exams), [exams]);

    // Ticker — ticks every second, cheap.
    useEffect(() => {
        if (!nextExam) {
            setTimeLeft(null);
            return;
        }
        const tick = () => setTimeLeft(computeTimeLeft(nextExam.exam_date));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [nextExam?.id, nextExam?.exam_date]);

    // Nothing to show → render nothing (header stays clean).
    if (!nextExam || !timeLeft) return null;

    return (
        <div
            className="flex items-center gap-1.5 sm:gap-2 select-none"
            title={`${nextExam.exam_name} — ${nextExam.exam_date}`}
            aria-label="Time until next exam"
        >
            <Calendar
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${isDark ? "text-blue-400" : "text-blue-600"
                    }`}
            />

            {/* Label — hidden on very small screens to save space */}
            <span
                className={`hidden xs:inline text-[8px] sm:text-[9px] font-bold uppercase tracking-widest mr-1 ${isDark ? "text-blue-400" : "text-blue-600"
                    }`}
            >
                Next
            </span>

            <div className="flex items-center gap-1 sm:gap-1.5">
                <Unit value={timeLeft.days} letter="D" isDark={isDark} />
                <Sep isDark={isDark} />
                <Unit value={timeLeft.hours} letter="H" isDark={isDark} />
                <Sep isDark={isDark} />
                <Unit value={timeLeft.minutes} letter="M" isDark={isDark} />
                <Sep isDark={isDark} />
                <Unit value={timeLeft.seconds} letter="S" isDark={isDark} />
            </div>
        </div>
    );
});