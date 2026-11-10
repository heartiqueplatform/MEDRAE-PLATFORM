// src/pages/live-classes/MyClasses.tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { registrationService } from "@/services/liveClassService";
import { toast } from "sonner";
import {
    Calendar,
    Clock,
    Users,
    Video,
    Award,
    CheckCircle,
    XCircle,
    AlertCircle,
    ChevronLeft,
    Plus,
    LayoutGrid,
    Search,
} from "lucide-react";
import { playSound } from "@/lib/soundManager";
import TutorsList from "@/components/student/TutorsList";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" = "light") => {
    playSound("ui-tap");
    vibrate(type === "success" ? [20, 30, 20] : 15);
};

const formatDate = (dateString: string) => {
    if (!dateString) return "TBD";
    try {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    } catch {
        return dateString;
    }
};

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function MyClassesSkeleton() {
    return (
        <div className="w-full max-w-[880px] mx-auto px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 h-16 animate-pulse"
                    />
                ))}
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#161b22] h-32 animate-pulse" />
            <div className="rounded-2xl bg-white dark:bg-[#161b22] h-40 animate-pulse" />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export const MyClasses = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [registrations, setRegistrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [activeTab, setActiveTab] = useState<"classes" | "tutors">("classes");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (!user) {
            navigate("/login");
            return;
        }
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await registrationService.getUserRegistrations();
            setRegistrations(data || []);
        } catch (error) {
            console.error("Error:", error);
            toast.error("Failed to load your classes");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string, classStatus: string) => {
        if (classStatus === "cancelled") {
            return (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                 text-[10px] font-bold
                                 bg-rose-100 text-rose-700
                                 dark:bg-rose-400/10 dark:text-rose-300">
                    Cancelled
                </span>
            );
        }
        if (status === "attended") {
            return (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                 text-[10px] font-bold
                                 bg-emerald-100 text-emerald-700
                                 dark:bg-emerald-400/10 dark:text-emerald-300">
                    <CheckCircle className="h-2.5 w-2.5" />
                    Completed
                </span>
            );
        }
        if (status === "missed") {
            return (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                 text-[10px] font-bold
                                 bg-rose-100 text-rose-700
                                 dark:bg-rose-400/10 dark:text-rose-300">
                    <XCircle className="h-2.5 w-2.5" />
                    Missed
                </span>
            );
        }
        if (classStatus === "live") {
            return (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                 text-[10px] font-bold
                                 bg-emerald-100 text-emerald-700
                                 dark:bg-emerald-400/10 dark:text-emerald-300
                                 animate-pulse">
                    <AlertCircle className="h-2.5 w-2.5" />
                    Live now
                </span>
            );
        }
        if (classStatus === "upcoming") {
            return (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                 text-[10px] font-bold
                                 bg-blue-100 text-blue-700
                                 dark:bg-blue-400/10 dark:text-blue-300">
                    <Clock className="h-2.5 w-2.5" />
                    Upcoming
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                             text-[10px] font-bold
                             bg-slate-100 text-slate-600
                             dark:bg-white/[0.06] dark:text-slate-300">
                {status?.toUpperCase() || "Registered"}
            </span>
        );
    };

    const getAttendanceStatus = (registration: any) => {
        if (registration.attendance_status === "attended") {
            return { text: "Attended", color: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle };
        }
        if (registration.attendance_status === "missed") {
            return { text: "Missed", color: "text-rose-600 dark:text-rose-400", icon: XCircle };
        }
        if (registration.class?.status === "completed") {
            return { text: "No show", color: "text-rose-500 dark:text-rose-400", icon: XCircle };
        }
        if (
            registration.class?.status === "live" ||
            registration.class?.status === "upcoming"
        ) {
            return { text: "Pending", color: "text-amber-600 dark:text-amber-400", icon: Clock };
        }
        return { text: "Registered", color: "text-blue-600 dark:text-blue-400", icon: CheckCircle };
    };
    const filteredRegistrations = registrations.filter((reg: any) => {
        // Filter by tab
        if (filter === "upcoming") {
            if (reg.class?.status !== "upcoming" && reg.class?.status !== "live") return false;
        } else if (filter === "past") {
            if (
                reg.class?.status !== "completed" &&
                reg.class?.status !== "cancelled"
            ) {
                return false;
            }
        }
        // Filter by search
        const q = searchQuery.trim().toLowerCase();
        if (q) {
            const hay = [
                reg.class?.title,
                reg.class?.description,
                reg.class?.host_name,
                reg.class?.topic_category,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });

    const upcomingCount = registrations.filter(
        (r: any) => r.class?.status === "upcoming" || r.class?.status === "live"
    ).length;
    const pastCount = registrations.filter(
        (r: any) =>
            r.class?.status === "completed" || r.class?.status === "cancelled"
    ).length;
    const attendedCount = registrations.filter(
        (r: any) => r.attendance_status === "attended"
    ).length;

    const handleBack = useCallback(() => {
        tap();
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/live-classes", { replace: true });
        }
    }, [navigate]);

    if (loading) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white">
                <header className="shrink-0 h-14 bg-white dark:bg-[#0d1117] border-b border-slate-200/70 dark:border-white/[0.06] flex items-center px-2">
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                    <div className="ml-2 space-y-1.5">
                        <div className="h-4 w-24 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                        <div className="h-3 w-32 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto no-scrollbar">
                    <MyClassesSkeleton />
                </main>
            </div>
        );
    }

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
                            My Sessions
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            {registrations.length} registered · {attendedCount} attended
                        </p>
                    </div>


                </div>
            </header>

            {/* ── SCROLLABLE BODY ── */}
            {/* ── SCROLLABLE BODY ── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <div className="w-full max-w-[880px] mx-auto pb-24">
                    {/* ── TABS ── */}
                    <div className="sticky top-0 z-20 bg-slate-50 dark:bg-[#0d1117] px-4 pt-3 pb-3">
                        <div className="flex gap-1.5 rounded-full bg-white dark:bg-[#161b22] p-1">
                            <button
                                onClick={() => {
                                    tap();
                                    setActiveTab("classes");
                                }}
                                className={`flex-1 h-9 rounded-full text-[12px] font-bold
                                            active:scale-[0.97] transition-all
                                            flex items-center justify-center gap-1.5
                                            ${activeTab === "classes"
                                        ? "bg-blue-600 text-white"
                                        : "text-slate-600 dark:text-slate-300"
                                    }`}
                                style={{ touchAction: "manipulation" }}
                            >
                                <Calendar className="h-3.5 w-3.5" />
                                My Classes
                            </button>
                            <button
                                onClick={() => {
                                    tap();
                                    setActiveTab("tutors");
                                }}
                                className={`flex-1 h-9 rounded-full text-[12px] font-bold
                                            active:scale-[0.97] transition-all
                                            flex items-center justify-center gap-1.5
                                            ${activeTab === "tutors"
                                        ? "bg-blue-600 text-white"
                                        : "text-slate-600 dark:text-slate-300"
                                    }`}
                                style={{ touchAction: "manipulation" }}
                            >
                                <Users className="h-3.5 w-3.5" />
                                Find a Tutor
                            </button>
                        </div>
                    </div>

                    {/* ── TAB: MY CLASSES ── */}
                    {activeTab === "classes" && (
                        <>
                            {/* Search */}
                            <section className="px-4 pb-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search your classes…"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full rounded-xl border-0
                                                   bg-white dark:bg-[#161b22]
                                                   h-10 pl-9 pr-9 text-sm
                                                   text-slate-900 dark:text-white
                                                   placeholder:text-slate-400 dark:placeholder:text-slate-500
                                                   focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                        autoComplete="off"
                                        style={{ touchAction: "manipulation" }}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => {
                                                tap();
                                                setSearchQuery("");
                                            }}
                                            aria-label="Clear search"
                                            className="absolute right-1.5 top-1/2 -translate-y-1/2
                                                       rounded-full h-7 w-7 flex items-center justify-center
                                                       text-slate-400 active:bg-slate-200 dark:active:bg-white/10"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            <XCircle className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </section>

                            {/* Stats */}
                            <section className="px-4 pb-3">
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                        <LayoutGrid className="mx-auto mb-1 h-4 w-4 text-slate-600 dark:text-slate-400" />
                                        <p className="text-[11px] font-bold tabular-nums text-slate-900 dark:text-white">
                                            {registrations.length}
                                        </p>
                                        <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Total
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                        <Clock className="mx-auto mb-1 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <p className="text-[11px] font-bold tabular-nums text-blue-600 dark:text-blue-400">
                                            {upcomingCount}
                                        </p>
                                        <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Upcoming
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                        <CheckCircle className="mx-auto mb-1 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        <p className="text-[11px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                            {attendedCount}
                                        </p>
                                        <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Attended
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                        <Calendar className="mx-auto mb-1 h-4 w-4 text-slate-400" />
                                        <p className="text-[11px] font-bold tabular-nums text-slate-600 dark:text-slate-300">
                                            {pastCount}
                                        </p>
                                        <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Past
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Filters */}
                            <section className="px-4 pb-4">
                                <div className="flex gap-1.5">
                                    {["all", "upcoming", "past"].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => {
                                                tap();
                                                setFilter(status);
                                            }}
                                            className={`flex-1 h-8 rounded-full text-[11px] font-bold
                                                        active:scale-[0.97] transition-transform
                                                        ${filter === status
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-slate-300"
                                                }`}
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Registration cards */}
                            <section className="px-4">
                                {filteredRegistrations.length === 0 ? (
                                    <div className="rounded-2xl bg-white dark:bg-[#161b22] p-8 text-center">
                                        <Calendar className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                                        <p className="font-semibold text-sm">
                                            {searchQuery
                                                ? "No matching classes"
                                                : "No classes found"}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            {searchQuery
                                                ? `Nothing matches "${searchQuery}"`
                                                : filter === "all"
                                                    ? "You haven't registered for any classes yet."
                                                    : `No ${filter} classes.`}
                                        </p>
                                        {searchQuery ? (
                                            <button
                                                onClick={() => {
                                                    tap();
                                                    setSearchQuery("");
                                                }}
                                                className="mt-4 inline-flex items-center gap-1.5
                                                           rounded-xl bg-slate-100 dark:bg-white/[0.06]
                                                           text-slate-700 dark:text-slate-200
                                                           px-4 py-2 text-xs font-bold
                                                           active:scale-[0.97] transition-transform"
                                                style={{ touchAction: "manipulation" }}
                                            >
                                                Clear search
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    tap("success");
                                                    navigate("/live-classes");
                                                }}
                                                className="mt-4 inline-flex items-center gap-1.5
                                                           rounded-xl bg-blue-600 text-white
                                                           px-4 py-2 text-xs font-bold
                                                           active:scale-[0.97] transition-transform"
                                                style={{ touchAction: "manipulation" }}
                                            >
                                                Browse classes
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid gap-2.5 sm:grid-cols-2">
                                        {filteredRegistrations.map((reg: any) => {
                                            const cls = reg.class;
                                            const attendance = getAttendanceStatus(reg);
                                            const AttendanceIcon = attendance.icon;
                                            const isUpcoming =
                                                cls?.status === "upcoming" || cls?.status === "live";
                                            const isLive = cls?.status === "live";

                                            return (
                                                <div
                                                    key={reg.id}
                                                    className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden"
                                                >
                                                    {cls?.cover_image_url && (
                                                        <div className="h-40 w-full overflow-hidden">
                                                            <img
                                                                src={cls.cover_image_url}
                                                                alt={cls.title}
                                                                className="w-full h-full object-cover"
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                    )}

                                                    <div className="p-4">
                                                        <div className="flex items-start justify-between gap-2 mb-2">
                                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex-1 leading-snug line-clamp-2">
                                                                {cls?.title || "Class"}
                                                            </h3>
                                                            {getStatusBadge(
                                                                reg.attendance_status,
                                                                cls?.status
                                                            )}
                                                        </div>

                                                        {cls?.description && (
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                                                                {cls.description}
                                                            </p>
                                                        )}

                                                        <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar className="w-3 h-3 flex-shrink-0" />
                                                                <span>{formatDate(cls?.class_date)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="w-3 h-3 flex-shrink-0" />
                                                                <span>
                                                                    {cls?.start_time?.slice(0, 5)} –{" "}
                                                                    {cls?.end_time?.slice(0, 5)}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Users className="w-3 h-3 flex-shrink-0" />
                                                                <span>
                                                                    Host: {cls?.host_name || "Unknown"}
                                                                </span>
                                                            </div>
                                                            {cls?.is_cpd_eligible && (
                                                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                                                    <Award className="w-3 h-3 flex-shrink-0" />
                                                                    <span>{cls.cpd_points} CPD</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.04]">
                                                            <div
                                                                className={`flex items-center gap-1.5 ${attendance.color}`}
                                                            >
                                                                <AttendanceIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                                                <span className="text-[11px] font-semibold">
                                                                    {attendance.text}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="mt-3">
                                                            {isLive && cls?.meeting_link ? (
                                                                <button
                                                                    onClick={() => {
                                                                        tap("success");
                                                                        window.open(
                                                                            cls.meeting_link,
                                                                            "_blank"
                                                                        );
                                                                    }}
                                                                    className="w-full h-9 rounded-lg bg-rose-600 text-white
                                                                               text-xs font-bold
                                                                               active:scale-[0.97] transition-transform
                                                                               flex items-center justify-center gap-1.5"
                                                                    style={{ touchAction: "manipulation" }}
                                                                >
                                                                    <Video className="h-3.5 w-3.5" />
                                                                    Join now
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => {
                                                                        tap();
                                                                        navigate(
                                                                            `/live-classes/${cls?.id}`
                                                                        );
                                                                    }}
                                                                    className="w-full h-9 rounded-lg bg-slate-100 dark:bg-white/[0.06]
                                                                               text-slate-700 dark:text-slate-200
                                                                               text-xs font-bold
                                                                               active:scale-[0.97] transition-transform
                                                                               flex items-center justify-center gap-1.5"
                                                                    style={{ touchAction: "manipulation" }}
                                                                >
                                                                    <Calendar className="h-3.5 w-3.5" />
                                                                    {isUpcoming ? "View details" : "View summary"}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        </>
                    )}

                    {/* ── TAB: FIND A TUTOR ── */}
                    {activeTab === "tutors" && (
                        <section className="px-4 pt-1">
                            <TutorsList />
                        </section>
                    )}
                </div>

                {/* FAB — create a new class (only on classes tab) */}
                {activeTab === "classes" && (
                    <button
                        onClick={() => {
                            tap("success");
                            navigate("/live-classes/create");
                        }}
                        aria-label="Create class"
                        className="fixed bottom-6 right-4 z-40
                                   h-14 w-14 rounded-full
                                   bg-blue-600 text-white
                                   flex items-center justify-center
                                   shadow-lg shadow-blue-600/30
                                   active:scale-95 transition-transform"
                        style={{
                            touchAction: "manipulation",
                            marginBottom: "env(safe-area-inset-bottom, 0px)",
                        }}
                    >
                        <Plus className="h-6 w-6" strokeWidth={2.5} />
                    </button>
                )}
            </main>
        </div>
    );
};