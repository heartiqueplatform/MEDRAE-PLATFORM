import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    BookOpen,
    Building2,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    Crown,
    FlaskConical,
    GraduationCap,
    HeartPulse,
    Lock,
    MapPin,
    Search,
    Sparkles,
    Stethoscope,
    Unlock,
    X,
} from "lucide-react";
import { getModules } from "@/lib/nursingQueries";
import { supabase } from "@/lib/supabaseClient";
import SuggestionBox from "@/components/curriculum/SuggestionBox";
import { playSound } from "@/lib/soundManager"; // Import sound manager
import { TermsButton } from "@/components/ui/TermsButton";
const vibrate = (pattern: number | number[] = 35) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

// Tap feedback with sound + vibration
const tapFeedback = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (type === "success") {
        vibrate([30, 40, 30]);
    } else if (type === "warning") {
        vibrate(100);
    } else {
        vibrate(35);
    }
};


function formatNumberWithImpact(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

const moduleStyles: Record<string, { label: string; badge: string; iconBg: string; icon: React.ElementType }> = {
    theory: { label: "Theory", badge: "bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20", iconBg: "bg-sky-600", icon: BookOpen },
    practicum: { label: "Practicum", badge: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20", iconBg: "bg-emerald-600", icon: FlaskConical },
    clinical: { label: "Clinical", badge: "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20", iconBg: "bg-rose-600", icon: Stethoscope },
    visit: { label: "Visit", badge: "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20", iconBg: "bg-amber-600", icon: MapPin },
};

const fallbackStyle = { label: "Module", badge: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20", iconBg: "bg-slate-700", icon: ClipboardCheck };

function ModuleCardSkeleton() {
    return (
        <div className="group relative overflow-hidden md:rounded-2xl md:border-0 bg-white/70 p-4 md:p-5 text-left md:shadow-sm backdrop-blur dark:bg-muted/30 border-b border-slate-100 dark:border-slate-800 md:border-b-0">
            <div className="absolute right-0 top-0 h-20 md:h-24 w-20 md:w-24 rounded-bl-full bg-slate-100 dark:bg-slate-800" />
            <div className="relative flex items-start justify-between gap-3 md:gap-4">
                <div className="flex min-w-0 gap-3 md:gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-xl md:rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="min-w-0">
                        <div className="mb-1.5 md:mb-2 flex flex-wrap items-center gap-1.5 md:gap-2">
                            <div className="h-4 md:h-5 w-14 md:w-16 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                            <div className="h-4 md:h-5 w-14 md:w-16 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                        </div>
                        <div className="h-6 md:h-7 w-36 md:w-40 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-1.5 md:mb-2" />
                        <div className="h-3.5 md:h-4 w-20 md:w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-1.5 md:mb-2" />
                        <div className="space-y-1.5 md:space-y-2">
                            <div className="h-3.5 md:h-4 w-44 md:w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                            <div className="h-3.5 md:h-4 w-36 md:w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        </div>
                    </div>
                </div>
                <div className="mt-1 shrink-0 h-8 w-8 md:h-9 md:w-9 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
            <div className="relative mt-4 md:mt-5 flex items-center gap-1.5 md:gap-2">
                <div className="h-3.5 w-3.5 md:h-4 md:w-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-3.5 md:h-4 w-20 md:w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
        </div>
    );
}

function ModuleStatsSkeleton() {
    return (
        <div className="grid grid-cols-3 gap-2 md:gap-3 md:rounded-2xl md:border md:border-slate-200 bg-white/70 p-2 md:p-3 md:shadow-sm backdrop-blur dark:border-slate-800 dark:bg-white/5">
            {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg md:rounded-xl bg-slate-50 p-1.5 md:p-2 text-center dark:bg-white/5">
                    <div className="mx-auto mb-0.5 md:mb-1 h-4 w-4 md:h-5 md:w-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-3.5 md:h-4 w-14 md:w-16 mx-auto bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
            ))}
        </div>
    );
}

export default function NursingModule() {
    const { yearId, semId } = useParams();
    const [modules, setModules] = useState<any[]>([]);
    const [yearName, setYearName] = useState<string>("");
    const [semName, setSemName] = useState<string>("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [isPremium, setIsPremium] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (data.session?.user) {
                supabase.from("subscriptions").select("plan_type").eq("user_id", data.session.user.id).single()
                    .then(({ data: sub }) => { setIsPremium(sub?.plan_type === "premium"); });
            }
        });
        if (yearId) {
            supabase.from("academic_years").select("year_name").eq("id", yearId).single()
                .then(({ data }) => { if (data) setYearName(data.year_name); });
        }
        if (semId) {
            supabase.from("academic_semesters").select("semester_name").eq("id", semId).single()
                .then(({ data }) => { if (data) setSemName(data.semester_name); });
            getModules(semId).then(data => { setModules(data); setLoading(false); }).catch(() => setLoading(false));
        }
    }, [yearId, semId]);

    const filteredModules = useMemo(() => {
        if (!search.trim()) return modules;
        const q = search.toLowerCase();
        return modules.filter(mod => mod.title.toLowerCase().includes(q) || (mod.module_code && mod.module_code.toLowerCase().includes(q)) || (mod.module_type && mod.module_type.toLowerCase().includes(q)));
    }, [modules, search]);

    const counts = useMemo(() => {
        const c: Record<string, number> = { theory: 0, clinical: 0, practicum: 0, visit: 0 };
        modules.forEach((m) => { if (c[m.module_type] !== undefined) c[m.module_type]++; });
        return c;
    }, [modules]);

    const totalQuestions = modules.reduce((sum, m) => sum + (m.total_questions || 0), 0);
    const showSkeletons = loading;
    const headerDescription = isPremium ? "You have full access to all modules. Enjoy unlimited learning!" : "First 4 modules are free. Unlock premium for full access to all modules.";

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
                                onClick={() => {
                                    tapFeedback("light");
                                    navigate(`/nursing/${yearId}`);
                                }}
                                className="inline-flex w-fit items-center gap-1.5 md:gap-2 rounded-full border border-slate-200 bg-white/70 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:border-emerald-300 hover:bg-white hover:text-emerald-700 dark:border-slate-800 dark:bg-muted/30 dark:text-slate-200 dark:hover:border-emerald-500/60 dark:hover:bg-slate-900 dark:hover:text-emerald-300"
                            >
                                <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                Back
                            </button>

                            <div className="flex items-center gap-1.5 md:gap-2">
                                {isPremium && (
                                    <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-bold text-white shadow-md shadow-amber-200 dark:shadow-amber-900/30">
                                        <Crown className="h-3 w-3 md:h-3.5 md:w-3.5" /> PREMIUM
                                    </div>
                                )}
                                <div className="inline-flex items-center gap-1 md:gap-2 rounded-full bg-emerald-100 px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
                                    <GraduationCap className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                    {yearName || "Year"} · {semName || "Semester"}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 md:gap-5 md:flex-row md:items-end md:justify-between">
                            <div>
                                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">Choose module</h1>
                                <p className="mt-2 md:mt-3 max-w-2xl text-xs md:text-sm lg:text-base leading-6 text-slate-600 dark:text-slate-300">{headerDescription}</p>
                            </div>

                            {showSkeletons ? (
                                <ModuleStatsSkeleton />
                            ) : (
                                <div className="grid grid-cols-3 gap-2 md:gap-3 md:rounded-2xl md:border md:border-slate-200 bg-white/70 p-2 md:p-3 md:shadow-sm backdrop-blur dark:border-slate-800 dark:bg-white/5">
                                    <div className="rounded-lg md:rounded-xl bg-slate-50 p-1.5 md:p-2 text-center dark:bg-white/5">
                                        <BookOpen className="mx-auto mb-0.5 md:mb-1 h-4 w-4 md:h-5 md:w-5 text-sky-600 dark:text-sky-300" />
                                        <p className="text-[10px] md:text-xs font-semibold text-slate-600 dark:text-slate-300">{formatNumberWithImpact(counts.theory)} Theory</p>
                                    </div>
                                    <div className="rounded-lg md:rounded-xl bg-slate-50 p-1.5 md:p-2 text-center dark:bg-white/5">
                                        <Stethoscope className="mx-auto mb-0.5 md:mb-1 h-4 w-4 md:h-5 md:w-5 text-rose-600 dark:text-rose-300" />
                                        <p className="text-[10px] md:text-xs font-semibold text-slate-600 dark:text-slate-300">{formatNumberWithImpact(counts.clinical)} Clinical</p>
                                    </div>
                                    <div className="rounded-lg md:rounded-xl bg-slate-50 p-1.5 md:p-2 text-center dark:bg-white/5">
                                        <FlaskConical className="mx-auto mb-0.5 md:mb-1 h-4 w-4 md:h-5 md:w-5 text-emerald-600 dark:text-emerald-300" />
                                        <p className="text-[10px] md:text-xs font-semibold text-slate-600 dark:text-slate-300">{formatNumberWithImpact(totalQuestions)} Qs</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Premium Banner */}
                        {!isPremium && !showSkeletons && (
                            <div
                                onClick={() => {
                                    tapFeedback("warning");
                                    navigate("/subscription");
                                }}
                                className="mt-4 md:mt-5 flex items-center justify-between gap-2 md:gap-3 rounded-lg md:rounded-xl bg-gradient-to-r from-amber-50 to-amber-100 p-3 md:p-4 border border-amber-200 cursor-pointer hover:shadow-md transition-all dark:from-amber-400/10 dark:to-amber-400/5 dark:border-amber-400/20"
                            >
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg md:rounded-xl bg-amber-500 text-white shadow-lg">
                                        <Crown className="h-4 w-4 md:h-5 md:w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs md:text-sm font-bold text-amber-800 dark:text-amber-200">Unlock All 80 Modules</p>
                                        <p className="text-[10px] md:text-xs text-amber-600 dark:text-amber-400">199 KSh for 2 months — less than 4 KSh per day</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-amber-500 shrink-0" />
                            </div>
                        )}

                        {isPremium && !showSkeletons && (
                            <div className="mt-4 md:mt-5 flex items-center gap-2 md:gap-3 rounded-lg md:rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 p-3 md:p-4 border border-emerald-200 dark:from-emerald-400/10 dark:to-green-400/5 dark:border-emerald-400/20">
                                <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg md:rounded-xl bg-emerald-500 text-white shadow-lg">
                                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />
                                </div>
                                <div>
                                    <p className="text-xs md:text-sm font-bold text-emerald-800 dark:text-emerald-200">Full Access Unlocked</p>
                                    <p className="text-[10px] md:text-xs text-emerald-600 dark:text-emerald-400">All 80 modules · 15.4k+ questions · AI predictions · Unlimited practice</p>
                                </div>
                            </div>
                        )}

                        {/* Search Bar - phone optimized */}
                        <div className="relative mt-4 md:mt-5">
                            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder={`Search ${formatNumberWithImpact(modules.length)} modules by name, code, or type...`}
                                value={search}
                                onChange={(e) => {
                                    tapFeedback("light");
                                    setSearch(e.target.value);
                                }}
                                className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-white/80 py-2.5 md:py-3 pl-10 md:pl-12 pr-10 text-xs md:text-sm text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20"
                                autoComplete="off"
                            />
                            {search && (
                                <button
                                    onClick={() => {
                                        tapFeedback("light");
                                        setSearch("");
                                    }}
                                    className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                </button>
                            )}
                        </div>
                        {search && !showSkeletons && (
                            <p className="mt-1.5 md:mt-2 text-[10px] md:text-xs text-slate-500">{formatNumberWithImpact(filteredModules.length)} of {formatNumberWithImpact(modules.length)} modules found</p>
                        )}
                    </div>
                </div>


                {/* Module List - full width on mobile */}
                <div className="grid gap-0 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 px-3 md:px-0">
                    {showSkeletons ? (
                        <><ModuleCardSkeleton /><ModuleCardSkeleton /><ModuleCardSkeleton /><ModuleCardSkeleton /></>
                    ) : (
                        filteredModules.map((mod, index) => {
                            const style = moduleStyles[mod.module_type] || fallbackStyle;
                            const Icon = style.icon;
                            const wasLocked = mod.is_locked;
                            const isLocked = mod.is_locked && !isPremium;
                            const isUnlockedNow = wasLocked && isPremium;

                            return (
                                <button
                                    key={mod.id}
                                    onClick={() => {
                                        if (isLocked) {
                                            tapFeedback("warning");
                                            navigate("/subscription");
                                        } else {
                                            tapFeedback("success");
                                            navigate(`/nursing/${yearId}/${semId}/${mod.id}`);
                                        }
                                    }}
                                    className={`group relative overflow-hidden md:rounded-2xl md:border-0 p-4 md:p-5 text-left md:shadow-sm backdrop-blur transition duration-200 border-b border-slate-100 dark:border-slate-800 md:border-b-0 ${isLocked
                                        ? "bg-slate-50/60 opacity-80 hover:opacity-95 dark:bg-muted/20"
                                        : isUnlockedNow
                                            ? "bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 md:hover:-translate-y-1 md:hover:shadow-xl dark:from-emerald-400/10 dark:to-green-400/5 dark:border-emerald-500/30"
                                            : "bg-white/70 md:hover:-translate-y-1 md:hover:border-2 md:hover:border-emerald-300 md:hover:bg-white md:hover:shadow-xl dark:bg-muted/30 dark:hover:border-emerald-500/60 dark:hover:bg-slate-900"
                                        } focus:outline-none focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-500/20`}
                                >
                                    <div className={`absolute right-0 top-0 h-20 md:h-24 w-20 md:w-24 rounded-bl-full transition ${isLocked ? "bg-amber-50 dark:bg-amber-400/5" : isUnlockedNow ? "bg-emerald-100 dark:bg-emerald-400/20" : "bg-slate-50/90 group-hover:bg-emerald-50 dark:bg-slate-800/70 dark:group-hover:bg-emerald-400/10"}`} />

                                    <div className="relative flex items-start justify-between gap-3 md:gap-4">
                                        <div className="flex min-w-0 gap-3 md:gap-4">
                                            <div className={`flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl md:rounded-2xl text-white shadow-lg ${isLocked ? "bg-amber-400" : isUnlockedNow ? "bg-gradient-to-br from-emerald-500 to-green-600" : style.iconBg}`}>
                                                {isLocked ? <Lock className="h-4 w-4 md:h-5 md:w-5" /> : isUnlockedNow ? <Unlock className="h-4 w-4 md:h-5 md:w-5" /> : <Icon className="h-4 w-4 md:h-5 md:w-5" />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="mb-1.5 md:mb-2 flex flex-wrap items-center gap-1.5 md:gap-2">
                                                    <span className="rounded-full bg-slate-100 px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">{mod.module_code || `Module ${index + 1}`}</span>
                                                    {isLocked ? (
                                                        <span className="rounded-full bg-amber-100 px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-bold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20">🔒 Premium</span>
                                                    ) : isUnlockedNow ? (
                                                        <span className="rounded-full bg-emerald-100 px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">UNLOCKED</span>
                                                    ) : (
                                                        <span className={`rounded-full px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-bold ring-1 ${style.badge}`}>{style.label}</span>
                                                    )}
                                                </div>
                                                <h2 className="line-clamp-2 text-base md:text-lg font-black text-slate-950 dark:text-white">{mod.title}</h2>
                                                {isLocked ? (
                                                    <p className="mt-0.5 md:mt-1 text-[10px] md:text-xs font-bold text-amber-600 dark:text-amber-400">🔒 {formatNumberWithImpact(mod.total_questions || 0)} questions waiting</p>
                                                ) : isUnlockedNow ? (
                                                    <p className="mt-0.5 md:mt-1 text-[10px] md:text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatNumberWithImpact(mod.total_questions || 0)} questions now available!</p>
                                                ) : (
                                                    <p className="mt-0.5 md:mt-1 text-[10px] md:text-xs font-medium text-emerald-600 dark:text-emerald-400">{formatNumberWithImpact(mod.total_questions || 0)} questions available</p>
                                                )}
                                                <p className="mt-0.5 md:mt-1 line-clamp-2 text-xs md:text-sm leading-6 text-slate-500 dark:text-slate-400">
                                                    {isLocked ? "Tap to unlock this module and access all topics and questions." : isUnlockedNow ? "This was locked before. Now it's yours! Dive into all topics and questions." : "Open learning content, notes, skills guidance, and revision resources."}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`mt-1 shrink-0 rounded-full p-1.5 md:p-2 transition ${isLocked ? "bg-amber-100 text-amber-600 dark:bg-amber-400/20 dark:text-amber-300" : isUnlockedNow ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-300" : "bg-slate-100 text-slate-500 group-hover:bg-emerald-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-300"}`}>
                                            {isLocked ? <Lock className="h-4 w-4 md:h-5 md:w-5" /> : isUnlockedNow ? <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" /> : <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />}
                                        </div>
                                    </div>
                                    <div className={`relative mt-4 md:mt-5 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-semibold ${isLocked ? "text-amber-700 dark:text-amber-300" : isUnlockedNow ? "text-emerald-700 dark:text-emerald-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                                        {isLocked ? <><Crown className="h-3.5 w-3.5 md:h-4 md:w-4" /> Unlock Premium — 199 KSh</> : isUnlockedNow ? <><Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" /> Start learning — just unlocked!</> : <><Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" /> Start module</>}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Suggestion Box */}
                <div className="px-3 md:px-0">
                    <SuggestionBox />
                </div>
                {/* Empty states */}
                {!showSkeletons && filteredModules.length === 0 && !search && (
                    <div className="mx-3 md:mx-0 md:rounded-2xl md:border-0 bg-white/70 p-6 md:p-8 text-center md:shadow-sm backdrop-blur dark:bg-muted/30">
                        <HeartPulse className="mx-auto mb-2 md:mb-3 h-7 w-7 md:h-8 md:w-8 text-slate-400" />
                        <p className="font-semibold text-sm md:text-base">No modules available</p>
                        <p className="mt-0.5 md:mt-1 text-xs md:text-sm text-slate-500">Please check back later.</p>
                    </div>
                )}
                {!showSkeletons && filteredModules.length === 0 && search && (
                    <div className="mx-3 md:mx-0 md:rounded-2xl md:border-0 bg-white/70 p-6 md:p-8 text-center md:shadow-sm backdrop-blur dark:bg-muted/30">
                        <Search className="mx-auto mb-2 md:mb-3 h-7 w-7 md:h-8 md:w-8 text-slate-400" />
                        <p className="font-semibold text-sm md:text-base">No modules found</p>
                        <p className="mt-0.5 md:mt-1 text-xs md:text-sm text-slate-500">Try a different search term.</p>
                        <button
                            onClick={() => {
                                tapFeedback("light");
                                setSearch("");
                            }}
                            className="mt-2 md:mt-3 text-xs md:text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                            Clear search
                        </button>
                    </div>
                )}
            </section>
            <TermsButton />
        </div>
    );
}