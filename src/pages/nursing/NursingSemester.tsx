import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    BookOpenCheck,
    CalendarDays,
    ChevronRight,
    Layers,
    Sparkles,
} from "lucide-react";
import { getSemesters } from "@/lib/nursingQueries";
import { supabase } from "@/lib/supabaseClient";
import { TermsButton } from "@/components/ui/TermsButton";
// =============================================
// PSYCHOLOGICAL NUMBER FORMATTING
// =============================================
function formatNumberWithImpact(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

function SemesterCardSkeleton() {
    return (
        <div className="group relative overflow-hidden md:rounded-2xl md:border-0 bg-white/70 p-4 md:p-5 text-left md:shadow-sm backdrop-blur dark:bg-muted/30 border-b border-slate-100 dark:border-slate-800 md:border-b-0">
            <div className="absolute right-0 top-0 h-20 md:h-24 w-20 md:w-24 rounded-bl-full bg-slate-100 dark:bg-slate-800" />
            <div className="relative flex items-start justify-between gap-3 md:gap-4">
                <div>
                    <div className="mb-3 md:mb-4 h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-6 md:h-7 w-36 md:w-40 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-1.5 md:mb-2" />
                    <div className="h-3.5 md:h-4 w-20 md:w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-1.5 md:mb-2" />
                    <div className="space-y-1.5 md:space-y-2">
                        <div className="h-3.5 md:h-4 w-44 md:w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        <div className="h-3.5 md:h-4 w-36 md:w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                </div>
                <div className="mt-1 h-8 w-8 md:h-9 md:w-9 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
            <div className="relative mt-4 md:mt-5 flex items-center gap-1.5 md:gap-2">
                <div className="h-3.5 w-3.5 md:h-4 md:w-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-3.5 md:h-4 w-28 md:w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
        </div>
    );
}

function StatsSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-2 md:gap-3 md:rounded-2xl md:border md:border-slate-200 bg-white/70 p-2 md:p-3 md:shadow-sm backdrop-blur dark:border-slate-800 dark:bg-white/5">
            {[1, 2].map((i) => (
                <div key={i} className="rounded-lg md:rounded-xl bg-slate-50 p-1.5 md:p-2 text-center dark:bg-white/5">
                    <div className="mx-auto mb-0.5 md:mb-1 h-4 w-4 md:h-5 md:w-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-3.5 md:h-4 w-14 md:w-16 mx-auto bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
            ))}
        </div>
    );
}

export default function NursingSemester() {
    const { yearId } = useParams();
    const [semesters, setSemesters] = useState<any[]>([]);
    const [yearName, setYearName] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (yearId) {
            supabase
                .from("academic_years")
                .select("year_name")
                .eq("id", yearId)
                .single()
                .then(({ data }) => { if (data) setYearName(data.year_name); });

            getSemesters(yearId)
                .then(data => { setSemesters(data); setLoading(false); })
                .catch(() => setLoading(false));
        }
    }, [yearId]);

    const totalQuestions = semesters.reduce((sum, s) => sum + (s.total_questions || 0), 0);

    return (
        <div className="min-h-screen bg-transparent text-slate-950 dark:text-white pb-20 md:pb-6">
            <section className="mx-auto flex w-full md:max-w-full md:px-4 lg:px-6 flex-col gap-4 md:gap-6 px-0 md:px-4 py-4 md:py-6 lg:px-8">

                {/* Header Card - full width on mobile */}
                <div className="relative overflow-hidden md:rounded-2xl md:border-0 bg-white/70 p-4 md:p-6 md:shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-muted/30 sm:p-8 border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                    <div className="absolute right-0 top-0 h-24 md:h-32 w-24 md:w-32 rounded-bl-full bg-emerald-100/80 dark:bg-emerald-400/10" />
                    <div className="absolute bottom-0 left-0 h-20 md:h-24 w-20 md:w-24 rounded-tr-full bg-cyan-100/80 dark:bg-cyan-400/10" />

                    <div className="relative">
                        <div className="mb-3 md:mb-4 flex flex-col gap-2 md:gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <button
                                onClick={() => navigate("/nursing")}
                                className="inline-flex w-fit items-center gap-1.5 md:gap-2 rounded-full border border-slate-200 bg-white/70 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:border-emerald-300 hover:bg-white hover:text-emerald-700 dark:border-slate-800 dark:bg-muted/30 dark:text-slate-200 dark:hover:border-emerald-500/60 dark:hover:bg-slate-900 dark:hover:text-emerald-300"
                            >
                                <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                Back
                            </button>

                            <div className="inline-flex items-center gap-1 md:gap-2 rounded-full bg-emerald-100 px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
                                <Layers className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                {yearName || "Loading..."}
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 md:gap-5 md:flex-row md:items-end md:justify-between">
                            <div>
                                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">
                                    Choose semester
                                </h1>
                                <p className="mt-2 md:mt-3 max-w-2xl text-xs md:text-sm lg:text-base leading-6 text-slate-600 dark:text-slate-300">
                                    Continue into the semester content, view your units, and keep your nursing studies organized.
                                </p>
                            </div>

                            {loading ? (
                                <StatsSkeleton />
                            ) : (
                                <div className="grid grid-cols-2 gap-2 md:gap-3 md:rounded-2xl md:border md:border-slate-200 bg-white/70 p-2 md:p-3 md:shadow-sm backdrop-blur dark:border-slate-800 dark:bg-white/5">
                                    <div className="rounded-lg md:rounded-xl bg-slate-50 p-1.5 md:p-2 text-center dark:bg-white/5">
                                        <CalendarDays className="mx-auto mb-0.5 md:mb-1 h-4 w-4 md:h-5 md:w-5 text-emerald-600 dark:text-emerald-300" />
                                        <p className="text-[10px] md:text-xs font-semibold text-slate-600 dark:text-slate-300">
                                            {formatNumberWithImpact(semesters.length)} Semesters
                                        </p>
                                    </div>
                                    <div className="rounded-lg md:rounded-xl bg-slate-50 p-1.5 md:p-2 text-center dark:bg-white/5">
                                        <BookOpenCheck className="mx-auto mb-0.5 md:mb-1 h-4 w-4 md:h-5 md:w-5 text-cyan-600 dark:text-cyan-300" />
                                        <p className="text-[10px] md:text-xs font-semibold text-slate-600 dark:text-slate-300">
                                            {formatNumberWithImpact(totalQuestions)} Qs
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Semester Cards - full width on mobile */}
                <div className="grid gap-0 md:gap-4 sm:grid-cols-2 px-3 md:px-0">
                    {loading ? (
                        <>
                            <SemesterCardSkeleton />
                            <SemesterCardSkeleton />
                            <SemesterCardSkeleton />
                            <SemesterCardSkeleton />
                        </>
                    ) : (
                        semesters.map((sem, index) => (
                            <button
                                key={sem.id}
                                onClick={() => navigate(`/nursing/${yearId}/${sem.id}`)}
                                className="group relative overflow-hidden md:rounded-2xl md:border-0 bg-white/70 p-4 md:p-5 text-left md:shadow-sm backdrop-blur transition duration-200 md:hover:-translate-y-1 md:hover:border-2 md:hover:border-emerald-300 md:hover:bg-white md:hover:shadow-xl border-b border-slate-100 dark:border-slate-800 md:border-b-0 dark:bg-muted/30 dark:hover:border-emerald-500/60 dark:hover:bg-slate-900"
                            >
                                <div className="absolute right-0 top-0 h-20 md:h-24 w-20 md:w-24 rounded-bl-full bg-emerald-50/80 transition group-hover:bg-emerald-100 dark:bg-emerald-400/10 dark:group-hover:bg-emerald-400/20" />

                                <div className="relative flex items-start justify-between gap-3 md:gap-4">
                                    <div>
                                        <div className="mb-3 md:mb-4 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-600/20">
                                            <span className="text-base md:text-lg font-black">{index + 1}</span>
                                        </div>

                                        <h2 className="text-base md:text-lg font-black text-slate-950 dark:text-white">
                                            {sem.semester_name}
                                        </h2>

                                        <p className="mt-0.5 md:mt-1 text-[10px] md:text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                            {formatNumberWithImpact(sem.total_questions || 0)} questions
                                        </p>

                                        <p className="mt-1.5 md:mt-2 text-xs md:text-sm leading-6 text-slate-500 dark:text-slate-400">
                                            Open semester units, learning notes, clinical topics, and revision materials.
                                        </p>
                                    </div>

                                    <div className="mt-1 rounded-full bg-slate-100 p-1.5 md:p-2 text-slate-500 transition group-hover:bg-emerald-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-300">
                                        <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                                    </div>
                                </div>

                                <div className="relative mt-4 md:mt-5 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                    <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                    Continue learning
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {!loading && semesters.length === 0 && (
                    <div className="mx-3 md:mx-0 md:rounded-2xl md:border-0 bg-white/70 p-6 md:p-8 text-center md:shadow-sm backdrop-blur dark:bg-muted/30">
                        <CalendarDays className="mx-auto mb-2 md:mb-3 h-7 w-7 md:h-8 md:w-8 text-slate-400" />
                        <p className="font-semibold text-sm md:text-base">No semesters available</p>
                        <p className="mt-0.5 md:mt-1 text-xs md:text-sm text-slate-500">Please check back later.</p>
                    </div>
                )}
            </section>

            <TermsButton />
        </div>
    );
}