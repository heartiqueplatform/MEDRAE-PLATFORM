// src/pages/live-classes/ClassDetails.tsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { liveClassService, registrationService } from "@/services/liveClassService";
import { toast } from "sonner";
import {
    Calendar,
    Clock,
    Users,
    Video,
    Award,
    MapPin,
    Link as LinkIcon,
    BookOpen,
    CheckCircle,
    XCircle,
    AlertCircle,
    ChevronLeft,
    Copy,
    ExternalLink,
    FileText,
    Star,
    Timer,
    Lock,
    UserCheck,
    CalendarDays,
} from "lucide-react";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (type === "success") vibrate([20, 30, 20]);
    else if (type === "warning") vibrate(60);
    else vibrate(15);
};

const formatDate = (dateString: string) => {
    if (!dateString) return "TBD";
    try {
        return new Date(dateString).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    } catch {
        return dateString;
    }
};

const formatTime = (time: string) => {
    if (!time) return "";
    try {
        return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    } catch {
        return time;
    }
};

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function ClassDetailsSkeleton() {
    return (
        <div className="w-full max-w-[880px] mx-auto px-4 py-4 space-y-3">
            <div className="rounded-2xl bg-white dark:bg-[#161b22] h-44 animate-pulse" />
            <div className="rounded-2xl bg-white dark:bg-[#161b22] h-32 animate-pulse" />
            <div className="rounded-2xl bg-white dark:bg-[#161b22] h-40 animate-pulse" />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export const ClassDetails = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [classData, setClassData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isRegistered, setIsRegistered] = useState(false);
    const [registrationId, setRegistrationId] = useState<string | null>(null);
    const [registrationStatus, setRegistrationStatus] = useState<string>("");
    const [timeRemaining, setTimeRemaining] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    });
    const [canJoin, setCanJoin] = useState(false);

    useEffect(() => {
        if (id) loadClassData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (!classData) return;

        if (user) {
            const registration = classData.registrations?.find(
                (reg: any) =>
                    reg.user_id === user.id && reg.attendance_status !== "cancelled"
            );
            setIsRegistered(!!registration);
            setRegistrationId(registration?.id || null);
            setRegistrationStatus(registration?.attendance_status || "");
        }

        const updateTimer = () => {
            const now = new Date();
            const classDateTime = new Date(
                `${classData.class_date}T${classData.start_time}`
            );
            const diff = classDateTime.getTime() - now.getTime();

            if (diff > 0) {
                setTimeRemaining({
                    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((diff % (1000 * 60)) / 1000),
                });
            } else {
                setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            }

            const classStart = new Date(
                `${classData.class_date}T${classData.start_time}`
            );
            const classEnd = new Date(`${classData.class_date}T${classData.end_time}`);
            const fifteenMinBefore = new Date(classStart.getTime() - 15 * 60000);
            setCanJoin(now >= fifteenMinBefore && now <= classEnd);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [classData, user]);

    const loadClassData = async () => {
        try {
            setLoading(true);
            const data = await liveClassService.getClassById(id!);
            setClassData(data);
        } catch (error) {
            console.error("Error loading class:", error);
            toast.error("Failed to load class details");
            navigate("/live-classes");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!user) {
            toast.error("Please log in first");
            navigate("/login");
            return;
        }
        tap("success");
        try {
            await registrationService.registerForClass(id!);
            toast.success("Registered for class");
            await loadClassData();
        } catch {
            /* handled */
        }
    };

    const handleCancelRegistration = async () => {
        if (!registrationId) return;
        tap("warning");
        try {
            await registrationService.cancelRegistration(registrationId);
            toast.success("Registration cancelled");
            await loadClassData();
        } catch {
            /* handled */
        }
    };

    const handleJoinClass = () => {
        if (classData?.meeting_link) {
            tap("success");
            window.open(classData.meeting_link, "_blank");
        } else {
            toast.error("No meeting link available");
        }
    };

    const handleCopyLink = () => {
        if (classData?.meeting_link) {
            navigator.clipboard.writeText(classData.meeting_link);
            toast.success("Link copied");
        }
    };

    const handleBack = useCallback(() => {
        tap();
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/live-classes", { replace: true });
        }
    }, [navigate]);

    /* ── Loading ── */
    if (loading) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
                <header className="shrink-0 h-14 bg-white dark:bg-[#0d1117] border-b border-slate-200/70 dark:border-white/[0.06] flex items-center px-2">
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                </header>
                <main className="flex-1 overflow-y-auto no-scrollbar">
                    <ClassDetailsSkeleton />
                </main>
            </div>
        );
    }

    /* ── Not found ── */
    if (!classData) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white">
                <header className="shrink-0 h-14 bg-white dark:bg-[#0d1117] border-b border-slate-200/70 dark:border-white/[0.06] flex items-center px-2">
                    <button
                        onClick={handleBack}
                        aria-label="Back"
                        className="h-10 w-10 rounded-full flex items-center justify-center active:bg-slate-100 dark:active:bg-white/5"
                        style={{ touchAction: "manipulation" }}
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <h1 className="text-base font-bold ml-1">Class</h1>
                </header>
                <main className="flex-1 overflow-y-auto no-scrollbar">
                    <div className="max-w-[880px] mx-auto px-4 py-10 text-center">
                        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-rose-500" />
                        <p className="font-semibold text-sm">Class not found</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            The class you're looking for doesn't exist.
                        </p>
                        <button
                            onClick={() => {
                                tap();
                                navigate("/live-classes");
                            }}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-xl
                                       bg-blue-600 text-white px-4 py-2 text-xs font-bold
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            Browse classes
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const isUpcoming = classData.status === "upcoming";
    const isLive = classData.status === "live";
    const isCompleted = classData.status === "completed";
    const isFull = classData.registration_count >= classData.max_students;
    const canRegister = isUpcoming && !isFull && !isRegistered;

    /* Primary CTA for the bottom action bar */
    const primaryAction = (() => {
        if (isRegistered && (canJoin || isLive)) {
            return {
                label: isLive ? "Join class now" : "Join (early)",
                icon: Video,
                onClick: handleJoinClass,
                className: "bg-rose-600 text-white",
            };
        }
        if (isRegistered && isUpcoming) {
            return {
                label: "Cancel registration",
                icon: XCircle,
                onClick: handleCancelRegistration,
                className: "bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-300",
            };
        }
        if (canRegister) {
            return {
                label: "Register for class",
                icon: UserCheck,
                onClick: handleRegister,
                className: "bg-blue-600 text-white",
            };
        }
        if (isFull && isUpcoming) {
            return {
                label: "Class is full",
                icon: AlertCircle,
                onClick: () => { },
                className: "bg-slate-200 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 cursor-not-allowed",
                disabled: true,
            };
        }
        if (isCompleted) {
            return {
                label: "Class has ended",
                icon: CheckCircle,
                onClick: () => { },
                className: "bg-slate-200 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 cursor-not-allowed",
                disabled: true,
            };
        }
        return null;
    })();

    const hasBottomBar = !!primaryAction;

    return (
        <div
            className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white"
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            {/* ── HEADER ── */}
            <header className="shrink-0 bg-white dark:bg-[#0d1117] border-b border-slate-200/70 dark:border-white/[0.06] z-30">
                <div className="flex items-center gap-2 px-2 h-14">
                    <button
                        onClick={handleBack}
                        aria-label="Back"
                        className="h-10 w-10 rounded-full flex items-center justify-center
                                   active:bg-slate-100 dark:active:bg-white/5 transition-colors shrink-0"
                        style={{ touchAction: "manipulation" }}
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>

                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate">
                            {classData.title}
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            Hosted by {classData.host_name || "Tutor"}
                        </p>
                    </div>

                    {isLive ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 shrink-0
                                         bg-emerald-100 text-emerald-700
                                         dark:bg-emerald-400/10 dark:text-emerald-300 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Live</span>
                        </span>
                    ) : isUpcoming ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 shrink-0
                                         bg-blue-100 text-blue-700
                                         dark:bg-blue-400/10 dark:text-blue-300">
                            <Clock className="h-3 w-3" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Upcoming</span>
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 shrink-0
                                         bg-slate-100 text-slate-600
                                         dark:bg-white/[0.06] dark:text-slate-300">
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                {isCompleted ? "Ended" : classData.status}
                            </span>
                        </span>
                    )}
                </div>
            </header>

            {/* ── SCROLLABLE BODY ── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <div
                    className="w-full max-w-[880px] mx-auto"
                    style={{
                        paddingBottom: hasBottomBar
                            ? "calc(80px + env(safe-area-inset-bottom, 0px))"
                            : "16px",
                    }}
                >
                    {/* Cover image */}
                    {classData.cover_image_url && (
                        <div className="w-full h-48 sm:h-64 overflow-hidden bg-slate-100 dark:bg-[#161b22]">
                            <img
                                src={classData.cover_image_url}
                                alt={classData.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    {/* Hero: date/time + countdown */}
                    <section className="px-4 pt-4 pb-3">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                    {isLive ? "Live now" : isUpcoming ? "Scheduled" : "Completed"}
                                </p>
                            </div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {formatDate(classData.class_date)}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {formatTime(classData.start_time)} – {formatTime(classData.end_time)}
                            </p>

                            {/* Countdown — only when upcoming */}
                            {isUpcoming && (
                                <div className="mt-3 grid grid-cols-4 gap-1.5">
                                    {[
                                        { label: "Days", value: timeRemaining.days },
                                        { label: "Hours", value: timeRemaining.hours },
                                        { label: "Mins", value: timeRemaining.minutes },
                                        { label: "Secs", value: timeRemaining.seconds },
                                    ].map((unit) => (
                                        <div
                                            key={unit.label}
                                            className="rounded-lg bg-blue-50 dark:bg-blue-400/10 py-2 text-center"
                                        >
                                            <p className="text-base font-black tabular-nums text-blue-700 dark:text-blue-300 leading-none">
                                                {String(unit.value).padStart(2, "0")}
                                            </p>
                                            <p className="text-[9px] uppercase tracking-wider text-blue-600/70 dark:text-blue-400/70 mt-1">
                                                {unit.label}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Info grid */}
                    <section className="px-4 pb-3">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-start gap-2">
                                    <Users className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Capacity
                                        </p>
                                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                            {classData.registration_count} / {classData.max_students}
                                        </p>
                                    </div>
                                </div>

                                {classData.topic_category && (
                                    <div className="flex items-start gap-2">
                                        <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                Category
                                            </p>
                                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                                {classData.topic_category}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {classData.is_cpd_eligible && (
                                    <div className="flex items-start gap-2 col-span-2">
                                        <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                                CPD points
                                            </p>
                                            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                                {classData.cpd_points} points
                                                {classData.cpd_accreditation_number && (
                                                    <span className="text-[10px] block text-slate-500 dark:text-slate-400 font-normal">
                                                        {classData.cpd_accreditation_number}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* About */}
                    {classData.description && (
                        <section className="px-4 pb-3">
                            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                        About this class
                                    </h2>
                                </div>
                                <p className="text-xs leading-6 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                                    {classData.description}
                                </p>
                            </div>
                        </section>
                    )}

                    {/* Prerequisites */}
                    {classData.prerequisites && (
                        <section className="px-4 pb-3">
                            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <BookOpen className="h-4 w-4 text-slate-400" />
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Prerequisites
                                    </h2>
                                </div>
                                <p className="text-xs leading-6 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                                    {classData.prerequisites}
                                </p>
                            </div>
                        </section>
                    )}

                    {/* Learning objectives */}
                    {classData.learning_objectives &&
                        classData.learning_objectives.length > 0 && (
                            <section className="px-4 pb-3">
                                <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Star className="h-4 w-4 text-amber-500" />
                                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                            What you'll learn
                                        </h2>
                                    </div>
                                    <ul className="space-y-1.5">
                                        {classData.learning_objectives.map(
                                            (obj: string, index: number) => (
                                                <li
                                                    key={index}
                                                    className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
                                                >
                                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                                                    <span>{obj}</span>
                                                </li>
                                            )
                                        )}
                                    </ul>
                                </div>
                            </section>
                        )}

                    {/* Resources */}
                    {classData.resources && classData.resources.length > 0 && (
                        <section className="px-4 pb-3">
                            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Resources
                                    </h2>
                                </div>
                                <div className="space-y-1.5">
                                    {classData.resources.map((resource: any) => (
                                        <a
                                            key={resource.id}
                                            href={resource.resource_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 p-2.5 rounded-xl
                                                       bg-slate-50 dark:bg-[#0d1117]
                                                       active:scale-[0.98] transition-transform"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                            <span className="flex-1 text-xs text-slate-700 dark:text-slate-300 truncate">
                                                {resource.title}
                                            </span>
                                            <ExternalLink className="h-3 w-3 text-slate-400 shrink-0" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Meeting link */}
                    {classData.meeting_link && (isRegistered || canJoin || isLive) && (
                        <section className="px-4 pb-3">
                            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <LinkIcon className="h-4 w-4 text-slate-400" />
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Meeting link
                                    </h2>
                                    {classData.meeting_platform && (
                                        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider
                                                         text-slate-500 dark:text-slate-400">
                                            {classData.meeting_platform.replace("_", " ")}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 p-2 rounded-xl
                                                bg-slate-50 dark:bg-[#0d1117]">
                                    <span className="flex-1 text-[11px] text-slate-600 dark:text-slate-400 truncate">
                                        {classData.meeting_link}
                                    </span>
                                    <button
                                        onClick={handleCopyLink}
                                        aria-label="Copy link"
                                        className="h-7 w-7 rounded-md flex items-center justify-center
                                                   text-slate-500 active:bg-slate-200 dark:active:bg-white/10"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                {classData.meeting_password && (
                                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                        <Lock className="h-3 w-3" />
                                        <span>Password:</span>
                                        <code className="rounded bg-slate-100 dark:bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px]">
                                            {classData.meeting_password}
                                        </code>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Status hints */}
                    {isUpcoming && !canJoin && (
                        <section className="px-4 pb-3">
                            <div className="rounded-xl bg-amber-50 dark:bg-amber-400/10 p-3 flex items-start gap-2">
                                <Lock className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300 mt-0.5 shrink-0" />
                                <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 leading-snug">
                                    {isRegistered
                                        ? `Class starts in ${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m`
                                        : "Join link appears 15 minutes before class starts"}
                                </p>
                            </div>
                        </section>
                    )}

                    {isCompleted && isRegistered && registrationStatus === "attended" && (
                        <section className="px-4 pb-3">
                            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-400/10 p-3 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                    You attended this class
                                </p>
                            </div>
                        </section>
                    )}

                    {isCompleted && isRegistered && registrationStatus === "missed" && (
                        <section className="px-4 pb-3">
                            <div className="rounded-xl bg-rose-50 dark:bg-rose-400/10 p-3 flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                                    You missed this class
                                </p>
                            </div>
                        </section>
                    )}
                </div>
            </main>

            {/* ── BOTTOM ACTION BAR ── */}
            {hasBottomBar && primaryAction && (
                <div
                    className="shrink-0 bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur
                               border-t border-slate-200/70 dark:border-white/[0.06]
                               px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
                >
                    <button
                        onClick={primaryAction.onClick}
                        disabled={(primaryAction as any).disabled}
                        className={`w-full max-w-[880px] mx-auto h-12 rounded-xl
                                    text-sm font-bold
                                    active:scale-[0.98] transition-transform
                                    flex items-center justify-center gap-2
                                    disabled:cursor-not-allowed ${primaryAction.className}`}
                        style={{ touchAction: "manipulation" }}
                    >
                        <primaryAction.icon className="h-4 w-4" />
                        {primaryAction.label}
                    </button>
                </div>
            )}
        </div>
    );
};